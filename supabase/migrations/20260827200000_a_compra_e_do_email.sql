-- A compra passa a ser do e-mail, e não do usuário.
--
-- ## O problema que isto resolve
--
-- `acessos_a_jornada` nasceu com `usuario_id` como chave, o que supunha que
-- quem compra já tem conta aqui. Com o checkout numa plataforma externa, essa
-- suposição quebra no caso mais comum: a pessoa paga na Hotmart com um e-mail,
-- nunca criou conta no site, e o webhook chega antes de o usuário existir.
--
-- Com a chave em `usuario_id`, esse webhook teria três saídas, todas ruins:
-- criar conta às cegas, falhar, ou descartar a compra em silêncio. A terceira é
-- a que acontece na prática, e ela some com dinheiro que já foi recebido.
--
-- Agora a compra é registrada pelo e-mail assim que o pagamento entra, exista
-- ou não uma conta. Quando alguém entra com aquele e-mail, o acesso já está lá
-- esperando. **Nenhum caminho perde uma compra.**
--
-- ## Por que dá para trocar a tabela em vez de migrar dados
--
-- Ela tem zero linhas: a venda avulsa nunca abriu. Conferido antes de escrever.
--
-- ## O e-mail é comparado normalizado
--
-- Plataforma de pagamento devolve o e-mail como o comprador digitou, com
-- maiúscula e espaço. `auth.users.email` é minúsculo. Comparar cru faria
-- "Joao@Empresa.com.br" não encontrar a conta "joao@empresa.com.br", e o
-- cliente ficaria sem o que pagou por causa de um shift.

drop table if exists acessos_a_jornada;

create table if not exists compras_da_jornada (
  id uuid primary key default gen_random_uuid(),

  -- Sempre em minúsculas e sem espaço nas pontas. A trava está aqui, e não na
  -- confiança de quem insere, porque quem insere é um webhook de terceiro.
  email text not null
    check (email = lower(btrim(email)) and email like '%_@_%.__%'),

  origem origem_do_acesso_a_jornada not null,

  -- O identificador da transação no provedor. É o que torna o webhook
  -- idempotente: plataforma de pagamento reenvia o mesmo evento, e sem isto a
  -- segunda entrega criaria uma compra duplicada.
  referencia_externa text,

  -- Preenchidos quando um usuário com este e-mail aparece. Servem para o dono
  -- saber quem já reivindicou e quem pagou e nunca entrou, que é a lista de
  -- quem precisa de um empurrão.
  usuario_id uuid references auth.users (id) on delete set null,
  reivindicado_em timestamptz,

  revogado_em timestamptz,
  motivo_da_revogacao text,

  criado_em timestamptz not null default now(),

  constraint compra_tem_referencia
    check (origem <> 'compra' or referencia_externa is not null),
  constraint revogacao_tem_motivo
    check (revogado_em is null or motivo_da_revogacao is not null),
  constraint reivindicacao_tem_usuario
    check ((reivindicado_em is null) = (usuario_id is null))
);

comment on table compras_da_jornada is
  'Compra avulsa e cortesia da jornada, registradas pelo e-mail do comprador. O vínculo com a conta acontece depois, quando alguém entra com aquele e-mail: assim o webhook nunca perde uma compra por a conta ainda não existir.';

-- Idempotência do webhook: a mesma transação nunca vira duas compras.
create unique index if not exists compras_da_jornada_por_referencia
  on compras_da_jornada (referencia_externa)
  where referencia_externa is not null;

create index if not exists compras_da_jornada_por_email
  on compras_da_jornada (email);

-- ---------------------------------------------------------------------------
-- Quem tem acesso
-- ---------------------------------------------------------------------------

create or replace function public.tem_acesso_a_jornada(p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    -- Compra pelo e-mail da conta. Não depende de `usuario_id` estar
    -- preenchido: o acesso vale desde o primeiro instante em que a pessoa
    -- entra, e a reivindicação é só o registro disso.
    select 1
      from public.compras_da_jornada c
      join auth.users u on lower(btrim(u.email)) = c.email
     where u.id = p_usuario
       and c.revogado_em is null
  ) or exists (
    -- Teste conta como acesso: quem está nos 14 dias precisa ver o produto
    -- inteiro, senão avalia meio produto e converte pior.
    select 1 from public.assinaturas s
     where s.titular_id = p_usuario
       and s.status in ('teste', 'ativa')
       and s.encerrada_em is null
  );
$$;

comment on function public.tem_acesso_a_jornada(uuid) is
  'As duas portas: compra registrada para o e-mail da conta, ou assinatura viva.';

revoke execute on function public.tem_acesso_a_jornada(uuid) from public, anon;
grant execute on function public.tem_acesso_a_jornada(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reivindicar: marcar quem já entrou
-- ---------------------------------------------------------------------------

create or replace function public.reivindicar_compra_da_jornada()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_quantas integer;
begin
  select lower(btrim(email)) into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return 0;
  end if;

  update public.compras_da_jornada
     set usuario_id = auth.uid(),
         reivindicado_em = now()
   where email = v_email
     and usuario_id is null
     and revogado_em is null;

  get diagnostics v_quantas = row_count;
  return v_quantas;
end;
$$;

comment on function public.reivindicar_compra_da_jornada() is
  'Liga a compra à conta de quem está entrando. Não concede acesso: o acesso já vem do e-mail. Serve para o dono distinguir quem pagou e entrou de quem pagou e sumiu.';

revoke execute on function public.reivindicar_compra_da_jornada() from public, anon;
grant execute on function public.reivindicar_compra_da_jornada() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table compras_da_jornada enable row level security;

-- Quem entra lê a própria compra e nada mais. Escrita é só pela chave de
-- serviço: se o usuário pudesse inserir, ele se daria acesso de graça.
create policy "usuario le a propria compra" on compras_da_jornada
  for select to authenticated
  using (
    exists (
      select 1 from auth.users u
       where u.id = (select auth.uid())
         and lower(btrim(u.email)) = compras_da_jornada.email
    )
  );
