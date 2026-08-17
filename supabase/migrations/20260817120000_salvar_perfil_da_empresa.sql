-- A gravação do Perfil Inteligente da Empresa, em uma transação só.
--
-- ## Por que uma função, e não quatro escritas no cliente
--
-- Um perfil é uma coisa só para quem preenche e quatro tabelas para o banco:
-- identidade em `empresas`, critérios em `perfis_da_empresa`, e as listas em
-- `documentos_da_empresa` e `atestados`. O cliente Supabase não abre transação:
-- quatro chamadas são quatro transações, e uma falha na terceira deixa metade
-- do cadastro gravado e a outra metade não — com a tela anunciando erro sobre um
-- perfil que já mudou. Aqui ou grava tudo, ou não grava nada.
--
-- ## `security invoker`, ao contrário de `criar_empresa_com_dono`
--
-- Aquela precisa fazer o que o chamador não pode (inserir o primeiro membro),
-- e por isso é `security definer` com a checagem de sessão fazendo as vezes de
-- porta. Esta não precisa de nada disso: quem já é membro tem policy para todas
-- as quatro tabelas. Rodando como o invocador, a RLS continua sendo quem decide,
-- e a função não vira um caminho paralelo que ignora as policies.
--
-- ## `arquivo_anexado` não é aceito daqui
--
-- Ele é coluna gerada a partir de `caminho_no_storage`, exatamente para que
-- "declaração não é anexo" seja impossível de violar. A reconciliação abaixo
-- ATUALIZA a linha existente do tipo em vez de apagar e recriar, para não jogar
-- fora o caminho do arquivo de quem já anexou.

-- `["a","b"]` (jsonb) vira `{a,b}` (text[]).
--
-- Sete colunas do perfil são `text[]`, e escrever a subconsulta sete vezes num
-- INSERT é sete oportunidades de trocar `palavras_chave` por `palavras_excluidas`
-- sem que nada reclame — os tipos são idênticos.
create or replace function public.texto_do_json(p jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  -- `array(...)` sobre zero linhas já devolve `{}`; o coalesce cobre `p` nulo,
  -- que é o que chega quando a chave não existe no objeto.
  select coalesce(array(select jsonb_array_elements_text(p)), '{}'::text[]);
$$;

comment on function public.texto_do_json(jsonb) is
  'Converte um array jsonb de strings em text[]. Auxiliar de salvar_perfil_da_empresa.';

create or replace function public.salvar_perfil_da_empresa(
  p_empresa_id uuid,
  p_perfil jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_cnpj text;
  v_razao text;
  v_fantasia text;
  v_cnpj_atual text;
  v_razao_atual text;
  v_fantasia_atual text;
  v_doc jsonb;
  v_tipo public.tipo_de_documento;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'sem sessão' using errcode = '28000';
  end if;

  -- ---- Identidade --------------------------------------------------------
  -- Só dígitos, pela mesma razão de `criar_empresa_com_dono`: a tela manda com
  -- máscara e o check da coluna recusaria.
  v_cnpj := regexp_replace(coalesce(p_perfil->>'cnpj', ''), '[^0-9]', '', 'g');
  v_razao := btrim(coalesce(p_perfil->>'razaoSocial', ''));
  v_fantasia := nullif(btrim(coalesce(p_perfil->>'nomeFantasia', '')), '');

  if length(v_cnpj) <> 14 then
    raise exception 'cnpj inválido' using errcode = '22000';
  end if;
  if length(v_razao) = 0 then
    raise exception 'razão social obrigatória' using errcode = '22000';
  end if;

  -- A RLS de `empresas` já filtra: um não-membro simplesmente não encontra a
  -- linha, e o `not found` abaixo é a resposta certa para ele também.
  select e.cnpj, e.razao_social, e.nome_fantasia
    into v_cnpj_atual, v_razao_atual, v_fantasia_atual
    from public.empresas e
   where e.id = p_empresa_id;

  if not found then
    raise exception 'empresa não encontrada' using errcode = '42501';
  end if;

  /*
   * O UPDATE de `empresas` só acontece quando a identidade mudou de verdade.
   *
   * Editar `empresas` é de dono/administrador, mas preencher o perfil é de
   * qualquer membro — inclusive `operador`, cuja manutenção do cadastro é o
   * insumo da triagem. Rodar o UPDATE sempre faria a policy zerar a linha para
   * o operador e a gravação inteira falhar num campo que ele nem tocou.
   */
  if v_cnpj is distinct from v_cnpj_atual
     or v_razao is distinct from v_razao_atual
     or v_fantasia is distinct from v_fantasia_atual then
    update public.empresas
       set cnpj = v_cnpj,
           razao_social = v_razao,
           nome_fantasia = v_fantasia
     where id = p_empresa_id;

    -- Zero linhas aqui é a policy recusando, não ausência de dado: o SELECT
    -- acima já provou que a empresa existe e é visível para quem chamou.
    if not found then
      raise exception 'alterar CNPJ ou razão social é de dono ou administrador'
        using errcode = '42501';
    end if;
  end if;

  -- ---- Critérios ---------------------------------------------------------
  insert into public.perfis_da_empresa as p (
    empresa_id, porte, faturamento_anual,
    cnaes, palavras_chave, palavras_excluidas,
    ufs_atendidas, municipios_prioritarios,
    ticket_minimo, ticket_maximo, modalidades_aceitas
  )
  values (
    p_empresa_id,
    (p_perfil->>'porte')::public.porte_da_empresa,
    (p_perfil->>'faturamentoAnual')::numeric,
    public.texto_do_json(p_perfil->'cnaes'),
    public.texto_do_json(p_perfil->'palavrasChave'),
    public.texto_do_json(p_perfil->'palavrasExcluidas'),
    public.texto_do_json(p_perfil->'ufsAtendidas'),
    public.texto_do_json(p_perfil->'municipiosPrioritarios'),
    (p_perfil->>'ticketMinimo')::numeric,
    (p_perfil->>'ticketMaximo')::numeric,
    public.texto_do_json(p_perfil->'modalidadesAceitas')
  )
  on conflict (empresa_id) do update
     set porte = excluded.porte,
         faturamento_anual = excluded.faturamento_anual,
         cnaes = excluded.cnaes,
         palavras_chave = excluded.palavras_chave,
         palavras_excluidas = excluded.palavras_excluidas,
         ufs_atendidas = excluded.ufs_atendidas,
         municipios_prioritarios = excluded.municipios_prioritarios,
         ticket_minimo = excluded.ticket_minimo,
         ticket_maximo = excluded.ticket_maximo,
         modalidades_aceitas = excluded.modalidades_aceitas
   where p.empresa_id = p_empresa_id;

  -- ---- Documentos --------------------------------------------------------
  -- Tipo que saiu do formulário sai do cadastro. O formulário manda a lista
  -- inteira a cada envio, então ausência aqui é remoção deliberada.
  delete from public.documentos_da_empresa d
   where d.empresa_id = p_empresa_id
     and d.tipo not in (
       select (x->>'tipo')::public.tipo_de_documento
         from jsonb_array_elements(coalesce(p_perfil->'documentos', '[]'::jsonb)) x
     );

  for v_doc in
    select x from jsonb_array_elements(coalesce(p_perfil->'documentos', '[]'::jsonb)) x
  loop
    v_tipo := (v_doc->>'tipo')::public.tipo_de_documento;

    /*
     * `documentos_da_empresa` não tem unique (empresa_id, tipo), e isso é
     * deliberado lá: duas certidões estaduais de estados diferentes convivem.
     * Este formulário, porém, modela um documento por tipo. Ao encontrar mais
     * de um, fica o que TEM ARQUIVO — jogar fora o anexo para preservar uma
     * linha vazia seria perder a única coisa que o usuário não consegue
     * recriar sozinho.
     */
    select d.id into v_id
      from public.documentos_da_empresa d
     where d.empresa_id = p_empresa_id
       and d.tipo = v_tipo
     order by (d.caminho_no_storage is not null) desc, d.criado_em asc
     limit 1;

    if v_id is null then
      insert into public.documentos_da_empresa (
        empresa_id, tipo, descricao, valido_ate, sem_validade
      )
      values (
        p_empresa_id,
        v_tipo,
        nullif(btrim(coalesce(v_doc->>'descricao', '')), ''),
        (v_doc->>'validoAte')::date,
        coalesce((v_doc->>'semValidade')::boolean, false)
      );
    else
      update public.documentos_da_empresa
         set descricao = nullif(btrim(coalesce(v_doc->>'descricao', '')), ''),
             valido_ate = (v_doc->>'validoAte')::date,
             sem_validade = coalesce((v_doc->>'semValidade')::boolean, false)
       where id = v_id;

      delete from public.documentos_da_empresa d
       where d.empresa_id = p_empresa_id and d.tipo = v_tipo and d.id <> v_id;
    end if;
  end loop;

  -- ---- Atestados ---------------------------------------------------------
  /*
   * Aqui é apagar e reinserir, e não reconciliar como nos documentos.
   *
   * Atestado não tem chave natural — dois contratos de "manutenção predial" no
   * mesmo órgão e no mesmo ano são duas linhas legítimas e indistinguíveis. Sem
   * chave, "atualizar o que já existe" viraria adivinhação.
   *
   * O que se perde ao reinserir é o `documento_id`, o vínculo com o PDF do
   * atestado. Hoje nada o preenche: não existe upload em tela nenhuma, e
   * `caminho_no_storage` nunca é escrito pela aplicação. No dia em que o upload
   * entrar, isto aqui precisa virar reconciliação — e o teste
   * `perfil-persiste.test.ts` cobra exatamente isso.
   */
  delete from public.atestados where empresa_id = p_empresa_id;

  insert into public.atestados (empresa_id, objeto, valor, orgao, ano)
  select
    p_empresa_id,
    btrim(x->>'objeto'),
    (x->>'valor')::numeric,
    nullif(btrim(coalesce(x->>'orgao', '')), ''),
    (x->>'ano')::smallint
  from jsonb_array_elements(coalesce(p_perfil->'atestados', '[]'::jsonb)) x
  where length(btrim(coalesce(x->>'objeto', ''))) > 0;
end;
$$;

comment on function public.salvar_perfil_da_empresa(uuid, jsonb) is
  'Grava identidade, critérios, documentos e atestados numa transação só. security invoker: quem decide o acesso continua sendo a RLS.';

revoke execute on function public.salvar_perfil_da_empresa(uuid, jsonb) from public, anon;
grant execute on function public.salvar_perfil_da_empresa(uuid, jsonb) to authenticated;
