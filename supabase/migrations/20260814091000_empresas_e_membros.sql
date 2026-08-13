-- Multi-tenant: a empresa cliente, quem pertence a ela, e as funções que todo
-- o resto do banco usa para decidir quem enxerga o quê.
--
-- Duas decisões estruturais ficam aqui e valem para o schema inteiro:
--
-- 1. O vínculo usuário↔empresa é N:N desde o primeiro dia. Um contador ou uma
--    holding com três CNPJs vai aparecer, e migrar de 1:N para N:N depois que
--    existirem dados é das migrações mais caras que há. Custa uma tabela agora.
--
-- 2. Toda tabela de cliente carrega `empresa_id` e a policy compara esse
--    `empresa_id` direto, sem JOIN. A alternativa (subir a cadeia até a
--    empresa) faz cada leitura pagar um plano maior e, pior, faz o isolamento
--    depender de um JOIN escrito certo em vinte lugares.

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  -- Só dígitos. Máscara é assunto da interface; no banco, CNPJ formatado gera
  -- dois cadastros da mesma empresa e nenhuma UNIQUE segura isso.
  cnpj text not null unique check (cnpj ~ '^[0-9]{14}$'),
  razao_social text not null check (length(btrim(razao_social)) > 0),
  nome_fantasia text,
  -- Empresa desativada some da operação mas continua respondendo por seu
  -- histórico — exclusão de tenant é decisão comercial, não flag de tela.
  ativa boolean not null default true,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.empresas is
  'Raiz do tenant. Identidade da empresa (CNPJ, razão social) mora aqui; critérios de busca moram em perfis_da_empresa.';

create trigger empresas_marcar_atualizacao
  before update on public.empresas
  for each row execute function public.marcar_atualizacao();

create table public.membros_da_empresa (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- CASCADE: apagar a conta no `auth` apaga o vínculo. O histórico do que a
  -- pessoa fez não vai embora junto — `eventos_de_auditoria` e
  -- `acoes_na_oportunidade` guardam o autor com ON DELETE SET NULL, que é o que
  -- a LGPD pede (o fato permanece, a identificação não).
  usuario_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_na_empresa not null default 'operador',
  convidado_em timestamptz not null default now(),
  aceito_em timestamptz,
  -- Remoção é lógica: quem saiu da empresa não pode voltar a ver os dados, mas
  -- as ações que ele registrou continuam fazendo sentido com um autor conhecido.
  removido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (empresa_id, usuario_id)
);

comment on table public.membros_da_empresa is
  'Vínculo N:N entre auth.users e empresas. É a tabela que todas as policies consultam.';

create trigger membros_da_empresa_marcar_atualizacao
  before update on public.membros_da_empresa
  for each row execute function public.marcar_atualizacao();

-- Listar "minhas empresas" é a consulta do seletor de tenant e o predicado de
-- várias policies. O índice por usuário é o que a torna barata.
create index membros_da_empresa_por_usuario
  on public.membros_da_empresa (usuario_id)
  where removido_em is null;

-- ---------------------------------------------------------------------------
-- Funções de autorização
-- ---------------------------------------------------------------------------

-- Por que SECURITY DEFINER: a policy de `membros_da_empresa` precisa consultar
-- `membros_da_empresa`. Sem definer isso é recursão infinita de RLS e o
-- Postgres aborta a consulta. Rodando como dona da tabela, a função não passa
-- por RLS e a recursão não existe.
--
-- Consequência que não pode ser esquecida: NENHUMA destas tabelas pode receber
-- `force row level security`, porque forçar RLS vale também para a dona e
-- ressuscita a recursão.
--
-- `set search_path = ''` é obrigatório em definer: sem isso, quem controlar o
-- search_path da sessão escolhe qual `membros_da_empresa` a função lê.
--
-- `stable` permite ao planejador chamar uma vez por consulta em vez de uma vez
-- por linha — em lista de oportunidades isso é a diferença entre milissegundos
-- e segundos.

create or replace function public.empresas_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.empresa_id
    from public.membros_da_empresa m
   where m.usuario_id = (select auth.uid())
     and m.removido_em is null;
$$;

comment on function public.empresas_do_usuario() is
  'IDs das empresas do usuário autenticado. Plural, e não empresa_do_usuario(), porque o vínculo é N:N — uma função singular teria de escolher uma empresa arbitrária e o erro só apareceria no primeiro cliente com dois CNPJs.';

create or replace function public.usuario_pertence_a(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.membros_da_empresa m
     where m.empresa_id = p_empresa
       and m.usuario_id = (select auth.uid())
       and m.removido_em is null
  );
$$;

-- Papel é separado de pertencimento porque quase toda policy de escrita precisa
-- das duas perguntas, e responder as duas com uma função só levaria a policies
-- que dizem `papel is not null` — que é pertencimento disfarçado e envelhece mal.
create or replace function public.usuario_tem_papel(
  p_empresa uuid,
  p_papeis public.papel_na_empresa[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.membros_da_empresa m
     where m.empresa_id = p_empresa
       and m.usuario_id = (select auth.uid())
       and m.removido_em is null
       and m.papel = any (p_papeis)
  );
$$;

revoke execute on function public.empresas_do_usuario() from public;
revoke execute on function public.usuario_pertence_a(uuid) from public;
revoke execute on function public.usuario_tem_papel(uuid, public.papel_na_empresa[]) from public;
grant execute on function public.empresas_do_usuario() to authenticated, service_role;
grant execute on function public.usuario_pertence_a(uuid) to authenticated, service_role;
grant execute on function public.usuario_tem_papel(uuid, public.papel_na_empresa[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.empresas enable row level security;
alter table public.membros_da_empresa enable row level security;

-- `anon` não tem o que fazer em dado de cliente. O revoke é redundante com a
-- RLS por desenho, e é justamente por isso que vale a pena: duas camadas
-- independentes para o mesmo erro.
revoke all on table public.empresas from anon;
revoke all on table public.membros_da_empresa from anon;
-- O `revoke` é necessário mesmo com a RLS negando: o Supabase concede ALL nas
-- tabelas novas de `public` por default privileges, e ficar só com a policy
-- deixaria uma única camada entre um erro de policy e a criação de tenant por
-- qualquer usuário logado.
revoke insert, delete on table public.empresas from authenticated;
grant select, update on table public.empresas to authenticated;
grant select, insert, update, delete on table public.membros_da_empresa to authenticated;

-- INSERT e DELETE de `empresas` ficam sem policy de propósito: criar tenant
-- envolve cobrança e onboarding, e apagar tenant é irreversível. As duas
-- operações passam pelo servidor com `service_role`, que não é sujeito a RLS.
create policy "membros leem sua empresa"
  on public.empresas for select to authenticated
  using (public.usuario_pertence_a(id));

create policy "administracao edita a empresa"
  on public.empresas for update to authenticated
  using (public.usuario_tem_papel(id, array['dono', 'administrador']::public.papel_na_empresa[]))
  with check (public.usuario_tem_papel(id, array['dono', 'administrador']::public.papel_na_empresa[]));

create policy "membros veem a equipe"
  on public.membros_da_empresa for select to authenticated
  using (public.usuario_pertence_a(empresa_id));

create policy "administracao convida membro"
  on public.membros_da_empresa for insert to authenticated
  with check (
    public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[])
    -- Só o dono cria outro dono. Sem isto, um administrador se promove.
    and (papel <> 'dono' or public.usuario_tem_papel(empresa_id, array['dono']::public.papel_na_empresa[]))
  );

create policy "administracao altera membro"
  on public.membros_da_empresa for update to authenticated
  using (public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[]))
  with check (
    public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[])
    and (papel <> 'dono' or public.usuario_tem_papel(empresa_id, array['dono']::public.papel_na_empresa[]))
  );

-- DELETE existe para desfazer convite errado. Remover quem já opera deve ser
-- `removido_em`, não DELETE — daí a restrição a vínculo ainda não aceito.
create policy "administracao cancela convite"
  on public.membros_da_empresa for delete to authenticated
  using (
    aceito_em is null
    and public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[])
  );
