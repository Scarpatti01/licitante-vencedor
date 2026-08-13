-- Comercial: catálogo de planos, contrato de cada empresa e consumo do período.
--
-- Regra que organiza o arquivo inteiro: preço é DADO, nunca schema. Não há um
-- único CHECK, DEFAULT ou enum aqui que saiba quanto custa qualquer coisa —
-- mudar de R$ 497 para R$ 597 tem de ser um UPDATE, não uma migração, senão o
-- time comercial fica esperando deploy para testar preço.

create table public.planos (
  id uuid primary key default gen_random_uuid(),
  -- Identificador estável para o código referenciar ('essencial', 'pro').
  -- O nome comercial muda com o marketing; o código, não.
  codigo text not null unique check (codigo ~ '^[a-z0-9_]+$'),
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  -- Ordem de exibição na página de preços. Uma coluna boba que, sem ela, vira
  -- ordenação por nome e o plano mais caro aparece primeiro por acaso.
  ordem smallint not null default 0,

  -- Centavos e inteiro, não `numeric`: nenhum arredondamento intermediário,
  -- nenhuma dúvida sobre casas decimais na hora de conciliar com o gateway.
  setup_em_centavos integer not null default 0 check (setup_em_centavos >= 0),
  mensalidade_em_centavos integer not null default 0 check (mensalidade_em_centavos >= 0),
  -- Percentual sobre contrato ganho. A faixa 0..100 é aritmética, não política
  -- de preço: fora dela o número não é percentual.
  percentual_de_success_fee numeric(5, 2) not null default 0
    check (percentual_de_success_fee between 0 and 100),
  moeda text not null default 'BRL' check (moeda ~ '^[A-Z]{3}$'),

  -- `null` = ilimitado, em todos os limites. Zero seria "nenhum", que é coisa
  -- diferente e existe (plano de espera, por exemplo).
  limite_de_editais_recomendados integer check (limite_de_editais_recomendados >= 0),
  limite_de_analises_profundas integer check (limite_de_analises_profundas >= 0),
  limite_de_usuarios integer check (limite_de_usuarios >= 0),
  limite_de_tokens_de_ia bigint check (limite_de_tokens_de_ia >= 0),
  -- Para limite que ainda não virou coluna. Vale enquanto for experimento; o
  -- que sobreviver vira coluna com CHECK na migração seguinte.
  limites_extras jsonb not null default '{}'::jsonb
    check (jsonb_typeof(limites_extras) = 'object'),

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.planos is
  'Catálogo comercial. Valores são linhas editáveis: nenhum preço aparece em constraint, default ou código.';

create trigger planos_marcar_atualizacao
  before update on public.planos
  for each row execute function public.marcar_atualizacao();

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- RESTRICT: apagar um plano que tem assinatura viva deixaria contratos sem
  -- referência de preço. Plano fora de venda é `ativo = false`, não DELETE.
  plano_id uuid not null references public.planos (id) on delete restrict,
  status public.status_da_assinatura not null default 'teste',

  -- Valores efetivamente combinados, quando diferem do plano. `null` = herda do
  -- plano. Existe porque desconto de fechamento é regra em B2B, e sem isto o
  -- cliente que negociou 20% passaria a pagar cheio no dia em que o plano
  -- mudasse de preço.
  setup_em_centavos integer check (setup_em_centavos >= 0),
  mensalidade_em_centavos integer check (mensalidade_em_centavos >= 0),
  percentual_de_success_fee numeric(5, 2) check (percentual_de_success_fee between 0 and 100),

  iniciada_em timestamptz not null default now(),
  teste_termina_em timestamptz,
  renova_em timestamptz,
  cancelada_em timestamptz,
  encerrada_em timestamptz,

  -- ID no gateway (Stripe, Asaas). UNIQUE porque webhook chega repetido e
  -- processar duas vezes cria duas assinaturas para o mesmo pagamento.
  referencia_externa text unique,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint cancelamento_registrado check (status <> 'cancelada' or cancelada_em is not null),
  constraint encerramento_registrado check (status <> 'encerrada' or encerrada_em is not null)
);

comment on table public.assinaturas is
  'Contrato vigente de cada empresa. Histórico fica: assinatura encerrada não é apagada.';

create trigger assinaturas_marcar_atualizacao
  before update on public.assinaturas
  for each row execute function public.marcar_atualizacao();

-- Uma assinatura viva por empresa. Sem isto, dois checkouts simultâneos cobram
-- duas vezes — e o índice parcial resolve no banco o que a aplicação resolveria
-- com um SELECT antes do INSERT, que é justamente a corrida.
create unique index assinatura_viva_unica
  on public.assinaturas (empresa_id)
  where status in ('teste', 'ativa', 'inadimplente');

create index assinaturas_por_renovacao
  on public.assinaturas (renova_em)
  where status in ('teste', 'ativa');

create table public.limites_de_uso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  recurso public.recurso_limitado not null,
  -- Primeiro dia do mês de competência. `date` e não intervalo porque o ciclo é
  -- mensal e o cliente cobra explicação em mês do calendário, não em janela
  -- móvel a partir da data de assinatura.
  competencia date not null,

  quantidade_usada bigint not null default 0 check (quantidade_usada >= 0),
  -- Cópia do limite vigente quando o período começou. É duplicação consciente:
  -- sem ela, mudar o plano no dia 20 reescreveria o teto do mês inteiro e o
  -- cliente veria "você excedeu" para consumo que estava dentro na hora.
  limite_no_periodo bigint check (limite_no_periodo >= 0),

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Um contador por recurso por mês. É esta chave que permite o
  -- `insert ... on conflict do update set quantidade_usada = ... + 1` que o
  -- worker usa sem transação explícita.
  constraint uso_unico_no_periodo unique (empresa_id, recurso, competencia),
  constraint competencia_no_primeiro_dia check (extract(day from competencia) = 1)
);

comment on table public.limites_de_uso is
  'Consumo por empresa, recurso e mês. Contador incremental — a fonte de verdade do que aconteceu continua nas tabelas de fato.';

create trigger limites_de_uso_marcar_atualizacao
  before update on public.limites_de_uso
  for each row execute function public.marcar_atualizacao();

create index limites_de_uso_por_competencia
  on public.limites_de_uso (competencia desc, empresa_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.planos enable row level security;
alter table public.assinaturas enable row level security;
alter table public.limites_de_uso enable row level security;

revoke all on table public.planos from anon;
revoke all on table public.assinaturas from anon;
revoke all on table public.limites_de_uso from anon;
revoke insert, update, delete on table public.planos from authenticated;
revoke insert, update, delete on table public.assinaturas from authenticated;
revoke insert, update, delete on table public.limites_de_uso from authenticated;
grant select on table public.planos to authenticated;
grant select on table public.assinaturas to authenticated;
grant select on table public.limites_de_uso to authenticated;

-- Plano inativo continua legível: é o plano que assinaturas antigas apontam, e
-- esconder faria a tela de cobrança mostrar contrato sem nome.
create policy "autenticados leem o catalogo"
  on public.planos for select to authenticated using (true);

-- Cobrança é assunto de quem responde por ela. Operador não vê valor.
create policy "administracao le a assinatura"
  on public.assinaturas for select to authenticated
  using (public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[]));

-- Consumo, ao contrário, todo mundo vê: é o que explica "por que parei de
-- receber edital hoje".
create policy "membros leem o consumo"
  on public.limites_de_uso for select to authenticated
  using (public.usuario_pertence_a(empresa_id));

-- Escrita nas três tabelas é exclusiva de `service_role`: preço, status de
-- contrato e contador de uso são consequências de webhook e de worker, nunca
-- de clique do cliente.
