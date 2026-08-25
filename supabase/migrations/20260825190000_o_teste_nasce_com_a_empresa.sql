-- O teste de catorze dias passa a EXISTIR, e não só a ser prometido.
--
-- ## O buraco
--
-- Em 25/08 o alerta gratuito diário acabou, substituído por um teste de catorze
-- dias. Ao ligar as pontas, dois furos apareceram:
--
-- 1. Nada no produto criava assinatura. `assinaturas` tinha zero linhas, e o
--    único código que escrevia lá era o webhook da Stripe — que ainda não grava.
--    O convite dizia "comece os 14 dias" e não havia catorze dias para começar.
-- 2. O resumo diário não olhava assinatura para decidir se enviava. Encerrar o
--    teste no banco não cortava e-mail nenhum. Ver `assinatura/vivas.ts`.
--
-- Esta migração resolve o primeiro. O segundo é código, e já está fechado.
--
-- ## Por que dentro de `criar_empresa_com_dono`
--
-- Porque a assinatura precisa nascer na MESMA transação da empresa. Fora dela,
-- um erro entre as duas escritas deixa tenant sem assinatura — e tenant sem
-- assinatura, com o portão do resumo agora fechado, é uma conta que não recebe
-- nada e não tem como saber por quê.
--
-- ## Uma vez por pessoa, e não uma por empresa
--
-- A condição é `not exists (... where titular_id = v_usuario)`, sem filtrar
-- status. Filtrar por status vivo pareceria mais natural e daria a quem teve o
-- teste encerrado um teste novo a cada empresa cadastrada — teste infinito, que
-- é o alerta gratuito de volta com passos a mais.

-- ---------------------------------------------------------------------------
-- Dívida do PR #104: a função e o índice foram aplicados à mão e nunca viraram
-- arquivo. Sem isto, quem reconstrói o banco pelos arquivos não tem o corte.
-- ---------------------------------------------------------------------------

create or replace function public.encerrar_testes_vencidos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  encerradas int;
begin
  update assinaturas
     set status = 'encerrada',
         encerrada_em = now()
   where status = 'teste'
     and teste_termina_em is not null
     and teste_termina_em <= now();

  get diagnostics encerradas = row_count;
  return encerradas;
end;
$$;

comment on function public.encerrar_testes_vencidos() is
  'Encerra testes cujo prazo passou. `encerrada`, e não `cancelada`: teste que acabou não foi cancelado por ninguém.';

-- A forma exata que `funcoes-nao-nascem-publicas.test.ts` reconhece.
--
-- `revoke all ... from public, anon, authenticated` faz a mesma coisa no
-- Postgres, e foi o que escrevi primeiro: a guarda reprovou mesmo com o efeito
-- correto, e reprovou bem. Ela não pode interpretar SQL, então ela exige uma
-- forma — e forma única é o que permite conferir trinta migrações de uma vez.
revoke execute on function public.encerrar_testes_vencidos()
  from public, anon, authenticated;

create index if not exists assinatura_teste_a_vencer
  on public.assinaturas (teste_termina_em)
  where status = 'teste' and teste_termina_em is not null;

-- ---------------------------------------------------------------------------
-- O nascimento
-- ---------------------------------------------------------------------------

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
  v_limite integer;
  v_atual integer;
  v_plano uuid;
begin
  if v_usuario is null then
    raise exception 'sem sessão' using errcode = '28000';
  end if;

  v_cnpj := regexp_replace(coalesce(p_cnpj, ''), '[^0-9]', '', 'g');

  if length(v_cnpj) <> 14 then
    raise exception 'cnpj inválido' using errcode = '22000';
  end if;

  if length(btrim(coalesce(p_razao_social, ''))) = 0 then
    raise exception 'razão social obrigatória' using errcode = '22000';
  end if;

  -- O limite do plano, antes de gravar qualquer coisa. NULL é sem limite.
  v_limite := public.limite_de_empresas_do_usuario(v_usuario);

  if v_limite is not null then
    select count(*) into v_atual
      from public.membros_da_empresa m
     where m.usuario_id = v_usuario
       and m.papel = 'dono'
       and m.removido_em is null;

    if v_atual >= v_limite then
      -- A mensagem carrega os dois números porque a tela precisa dizer ao
      -- cliente onde ele está, e não só que não pode.
      raise exception
        'o plano atual permite % empresa(s), e você já tem %', v_limite, v_atual
        using errcode = '53400';
    end if;
  end if;

  insert into public.empresas (cnpj, razao_social, nome_fantasia, criado_por)
  values (
    v_cnpj,
    btrim(p_razao_social),
    nullif(btrim(coalesce(p_nome_fantasia, '')), ''),
    v_usuario
  )
  returning id into v_empresa;

  insert into public.membros_da_empresa (empresa_id, usuario_id, papel, aceito_em)
  values (v_empresa, v_usuario, 'dono', now());

  -- O teste, uma única vez por pessoa. Ver o cabeçalho.
  if not exists (
    select 1 from public.assinaturas a where a.titular_id = v_usuario
  ) then
    select p.id into v_plano
      from public.planos p
     where p.codigo = 'leve'
     limit 1;

    -- Sem o plano do teste, o cadastro PARA. A alternativa — criar a empresa e
    -- seguir sem assinatura — produz uma conta que não recebe nada e não tem
    -- como descobrir o motivo, porque não há erro em lugar nenhum. Falta do
    -- plano `leve` é erro de implantação, e erro de implantação tem de doer em
    -- quem implanta, não em quem se cadastrou.
    if v_plano is null then
      raise exception 'plano do teste (leve) não encontrado' using errcode = 'P0002';
    end if;

    insert into public.assinaturas (titular_id, plano_id, status, iniciada_em, teste_termina_em)
    values (v_usuario, v_plano, 'teste', now(), now() + interval '14 days');
  end if;

  return v_empresa;
end;
$$;

comment on function public.criar_empresa_com_dono(text, text, text) is
  'Cria empresa, vincula o dono e abre o teste de 14 dias. Uma transação só: tenant sem assinatura não recebe resumo e não sabe por quê.';

-- ---------------------------------------------------------------------------
-- Quem já estava aqui
-- ---------------------------------------------------------------------------
--
-- O portão do resumo passa a valer para todo mundo, inclusive para quem
-- cadastrou empresa antes de existir teste. Sem este preenchimento, essas
-- contas parariam de receber e-mail na próxima madrugada, sem aviso e sem
-- terem feito nada.
--
-- Catorze dias a partir de agora, e não da data do cadastro: contar do passado
-- entregaria um teste já vencido a quem nunca teve a chance de usá-lo.

insert into public.assinaturas (titular_id, plano_id, status, iniciada_em, teste_termina_em)
-- O `::status_da_assinatura` não é enfeite: em `insert ... select` o Postgres
-- NÃO infere o enum a partir da coluna como faz em `insert ... values`, e a
-- migração morre com "column status is of type status_da_assinatura but
-- expression is of type text".
select distinct m.usuario_id, p.id, 'teste'::public.status_da_assinatura, now(), now() + interval '14 days'
  from public.membros_da_empresa m
  cross join public.planos p
 where m.papel = 'dono'
   and m.removido_em is null
   and p.codigo = 'leve'
   and not exists (
     select 1 from public.assinaturas a where a.titular_id = m.usuario_id
   );
