-- A jornada: o workbook virando produto dentro do app.
--
-- ## Por que o progresso é da PESSOA e não da empresa
--
-- Todo o resto deste banco é multiempresa: `empresas` é a raiz do tenant e
-- toda policy passa por `membros_da_empresa`. A jornada não. Ela é um caminho
-- de aprendizado que uma pessoa percorre, e duas pessoas do mesmo CNPJ estão em
-- pontos diferentes dele. Amarrar o progresso à empresa faria o sócio zerar a
-- barra do funcionário ao concluir uma etapa, o que é absurdo.
--
-- Há uma consequência de privacidade que é deliberada e vale escrever: **o dono
-- da empresa NÃO lê as respostas do funcionário.** Os exercícios pedem coisas
-- como "o maior contrato que de fato cabe no meu caixa hoje" e "a semana em que
-- eu travei, e o motivo real". Responder com honestidade só acontece se a
-- pessoa souber que ninguém mais vê. Uma policy que desse leitura ao titular da
-- empresa transformaria o exercício em teatro, e o produto perderia justamente
-- o que ele tem de útil.
--
-- ## Por que o conteúdo das etapas NÃO está aqui
--
-- As doze semanas, os campos de cada exercício e os textos vivem em
-- `src/lib/jornada/conteudo.ts`, versionados com o app. Motivo: conteúdo de
-- livro é revisado em pull request, com diff legível, e não editado numa tabela
-- por engano às onze da noite. O banco guarda o que é do usuário (progresso e
-- resposta) e nada do que é nosso.
--
-- A ligação entre os dois é `etapa` text, o código estável da semana
-- ("semana-01"), com uma trava de formato aqui e uma guarda em teste do lado do
-- app conferindo que todo código gravado existe no conteúdo.
--
-- ## As duas portas de acesso
--
-- Assinante entra porque assina; quem não assina entra porque comprou avulso.
-- A assinatura é do usuário (`assinaturas.titular_id` aponta para auth.users),
-- então as duas portas são pessoais e a checagem cabe numa função só.

-- ---------------------------------------------------------------------------
-- Acesso comprado à parte
-- ---------------------------------------------------------------------------

create type origem_do_acesso_a_jornada as enum ('compra', 'cortesia');

create table if not exists acessos_a_jornada (
  usuario_id uuid primary key references auth.users (id) on delete cascade,

  origem origem_do_acesso_a_jornada not null,

  -- O identificador do pagamento no provedor. Fica nulo em cortesia, e é o que
  -- permite conciliar um reembolso com o acesso que ele deve encerrar.
  referencia_externa text,

  -- Compra avulsa é vitalícia por decisão de produto: o livro não expira. A
  -- coluna existe mesmo assim, para revogar acesso obtido por fraude ou
  -- estorno, e é ela que a função de acesso consulta.
  revogado_em timestamptz,
  motivo_da_revogacao text,

  criado_em timestamptz not null default now(),

  constraint compra_tem_referencia
    check (origem <> 'compra' or referencia_externa is not null),
  constraint revogacao_tem_motivo
    check (revogado_em is null or motivo_da_revogacao is not null)
);

comment on table acessos_a_jornada is
  'Quem comprou a jornada avulsa, ou ganhou cortesia. Assinante NÃO tem linha aqui: o acesso dele é derivado da assinatura viva, para não existirem duas verdades sobre o mesmo direito.';

-- ---------------------------------------------------------------------------
-- A função que responde "esta pessoa pode entrar?"
-- ---------------------------------------------------------------------------

create or replace function public.tem_acesso_a_jornada(p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.acessos_a_jornada a
     where a.usuario_id = p_usuario
       and a.revogado_em is null
  ) or exists (
    -- Teste conta como acesso. Quem está nos 14 dias precisa ver o produto
    -- inteiro, senão o teste avalia meio produto e converte pior.
    select 1 from public.assinaturas s
     where s.titular_id = p_usuario
       and s.status in ('teste', 'ativa')
       and s.encerrada_em is null
  );
$$;

comment on function public.tem_acesso_a_jornada(uuid) is
  'As duas portas: compra avulsa não revogada, ou assinatura viva. Usada nas policies e na tela.';

-- A função fecha a própria porta.
--
-- Ela é `security definer` e recebe um uuid de fora: sem o revoke, ela fica
-- exposta em /rest/v1/rpc/ para quem não tem conta, e vira um oráculo que
-- responde "este usuário comprou a jornada?" para qualquer id que alguém
-- chute. O Postgres concede EXECUTE ao pseudo-papel PUBLIC em toda função
-- nova, e o Supabase concede nominalmente a `anon`, então o revoke precisa
-- nomear os dois.
revoke execute on function public.tem_acesso_a_jornada(uuid) from public, anon;
grant execute on function public.tem_acesso_a_jornada(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Progresso
-- ---------------------------------------------------------------------------

create table if not exists progresso_na_jornada (
  usuario_id uuid not null references auth.users (id) on delete cascade,

  -- Código da semana no conteúdo versionado. O formato é travado aqui porque
  -- uma linha com etapa inventada vira progresso fantasma que ninguém consegue
  -- explicar depois.
  etapa text not null check (etapa ~ '^semana-(0[1-9]|1[0-2])$'),

  concluida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  primary key (usuario_id, etapa)
);

comment on table progresso_na_jornada is
  'Uma linha por pessoa e semana. Linha existente com concluida_em nulo significa "começou e não terminou", que é diferente de nunca ter aberto.';

-- ---------------------------------------------------------------------------
-- Respostas dos exercícios
-- ---------------------------------------------------------------------------

create table if not exists respostas_da_jornada (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  etapa text not null check (etapa ~ '^semana-(0[1-9]|1[0-2])$'),

  -- O código do campo dentro da etapa, também definido no conteúdo.
  campo text not null check (length(btrim(campo)) between 1 and 60),

  -- O teto existe para o banco não virar depósito de texto colado. É generoso
  -- de propósito: o exercício da semana 11 pede um relato, não uma palavra.
  resposta text not null check (length(resposta) <= 4000),

  atualizado_em timestamptz not null default now(),

  primary key (usuario_id, etapa, campo)
);

comment on table respostas_da_jornada is
  'O que a pessoa escreveu. É dado pessoal dela, só ela lê, e some com a conta (LGPD, art. 18, VI). Nenhum papel da empresa alcança esta tabela.';

-- ---------------------------------------------------------------------------
-- RLS: tudo é do próprio usuário, e de mais ninguém
-- ---------------------------------------------------------------------------

alter table acessos_a_jornada    enable row level security;
alter table progresso_na_jornada enable row level security;
alter table respostas_da_jornada enable row level security;

-- O acesso é concedido pelo webhook de pagamento, que roda com a chave de
-- serviço. O usuário só lê o próprio, e nunca escreve: se pudesse inserir aqui,
-- ele se daria acesso de graça.
create policy "usuario le o proprio acesso" on acessos_a_jornada
  for select to authenticated using (usuario_id = (select auth.uid()));

create policy "usuario le o proprio progresso" on progresso_na_jornada
  for select to authenticated using (usuario_id = (select auth.uid()));

create policy "usuario grava o proprio progresso" on progresso_na_jornada
  for insert to authenticated
  with check (usuario_id = (select auth.uid())
              and public.tem_acesso_a_jornada((select auth.uid())));

create policy "usuario atualiza o proprio progresso" on progresso_na_jornada
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "usuario le as proprias respostas" on respostas_da_jornada
  for select to authenticated using (usuario_id = (select auth.uid()));

create policy "usuario grava as proprias respostas" on respostas_da_jornada
  for insert to authenticated
  with check (usuario_id = (select auth.uid())
              and public.tem_acesso_a_jornada((select auth.uid())));

create policy "usuario atualiza as proprias respostas" on respostas_da_jornada
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- Apagar a própria resposta é o direito de eliminação da LGPD exercido na tela,
-- sem abrir chamado. Progresso também: quem quer recomeçar a jornada deve
-- poder, e impedir isso não protege ninguém.
create policy "usuario apaga as proprias respostas" on respostas_da_jornada
  for delete to authenticated using (usuario_id = (select auth.uid()));

create policy "usuario apaga o proprio progresso" on progresso_na_jornada
  for delete to authenticated using (usuario_id = (select auth.uid()));

create index if not exists respostas_da_jornada_por_usuario
  on respostas_da_jornada (usuario_id, etapa);
