-- O arranque de um tenant.
--
-- Descoberto ligando a autenticação: **não havia como criar a primeira
-- empresa**. `empresas` não tem policy de INSERT, e a de `membros_da_empresa`
-- exige `usuario_tem_papel(empresa_id, ['dono','administrador'])` — ou seja,
-- para inserir o primeiro membro é preciso já ser administrador da empresa em
-- que ele seria inserido. O ovo e a galinha, e as policies estão CERTAS: sem
-- elas, um `insert` em `membros_da_empresa` seria "adicione-se à empresa que
-- você quiser".
--
-- A saída é esta função, e ela é `security definer` justamente porque precisa
-- fazer o que o chamador não pode. Em troca, ela não aceita quase nada de quem
-- chama: o dono é `auth.uid()`, nunca um parâmetro.

create or replace function public.criar_empresa_com_dono(
  p_cnpj text,
  p_razao_social text,
  p_nome_fantasia text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_cnpj text;
  v_empresa uuid;
begin
  -- `security definer` roda com os privilégios do dono da função, então esta
  -- checagem é a porta inteira. Sem ela, a função seria um `insert` irrestrito
  -- em `empresas` alcançável por qualquer um que chegasse à API.
  if v_usuario is null then
    raise exception 'sem sessão' using errcode = '28000';
  end if;

  -- Só dígitos: a interface manda com máscara e o check da coluna recusaria.
  -- Normalizar aqui, e não só no cliente, porque a função é alcançável sem
  -- passar pela tela.
  v_cnpj := regexp_replace(coalesce(p_cnpj, ''), '[^0-9]', '', 'g');

  if length(v_cnpj) <> 14 then
    raise exception 'cnpj inválido' using errcode = '22000';
  end if;

  if length(btrim(coalesce(p_razao_social, ''))) = 0 then
    raise exception 'razão social obrigatória' using errcode = '22000';
  end if;

  /*
   * O INSERT falha quando o CNPJ já existe, e essa falha é uma PROTEÇÃO, não um
   * inconveniente a contornar.
   *
   * A tentação óbvia aqui é "se a empresa já existe, vincule o usuário a ela" —
   * e isso seria uma tomada de conta: CNPJ é público, sai em qualquer nota
   * fiscal e no próprio edital. Qualquer pessoa que soubesse o CNPJ de um
   * cliente entraria no cadastro dele, com os documentos, os atestados e o
   * histórico de participação junto.
   *
   * Entrar numa empresa que já existe é convite, feito por quem já é dono ou
   * administrador dela, pela policy "administracao convida membro". Não é
   * autoatendimento.
   */
  insert into public.empresas (cnpj, razao_social, nome_fantasia, criado_por)
  values (
    v_cnpj,
    btrim(p_razao_social),
    nullif(btrim(coalesce(p_nome_fantasia, '')), ''),
    v_usuario
  )
  returning id into v_empresa;

  -- Mesma transação que o insert acima: ou nascem os dois, ou nenhum. Uma
  -- empresa sem dono seria um registro que ninguém consegue ler nem editar —
  -- invisível para a própria pessoa que acabou de criá-lo, porque toda policy
  -- de leitura passa por `membros_da_empresa`.
  insert into public.membros_da_empresa (empresa_id, usuario_id, papel, aceito_em)
  values (v_empresa, v_usuario, 'dono', now());

  return v_empresa;
end;
$$;

comment on function public.criar_empresa_com_dono(text, text, text) is
  'Cria empresa e vincula quem chamou como dono, na mesma transação. Único caminho para o primeiro membro; entrar em empresa existente é por convite.';

-- `public` inclui `anon`, que herda dele. A função exige sessão, mas deixá-la
-- alcançável sem sessão só daria a um robô uma porta para bater.
revoke execute on function public.criar_empresa_com_dono(text, text, text) from public, anon;
grant execute on function public.criar_empresa_com_dono(text, text, text) to authenticated;
