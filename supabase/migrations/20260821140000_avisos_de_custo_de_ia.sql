-- Guarda "já avisamos o dono sobre o custo de IA deste mês?", para o script de
-- verificação não mandar o mesmo aviso todo dia enquanto o mês seguir acima do
-- teto. Mesma razão de `envios_de_alerta` existir para o e-mail de lead: um
-- produto de alerta que repete a mesma notícia todo dia ensina quem lê a
-- ignorá-lo, e é exatamente aí que o aviso real se perde no meio.
--
-- Não é tela de cliente nem de operação — é bookkeeping do próprio mecanismo de
-- alerta. Só `service_role` toca esta tabela; não há política de leitura para
-- `authenticated` de propósito.

create table public.avisos_de_custo_de_ia (
  -- Primeiro dia do mês em que o aviso se refere, ex.: 2026-08-01. Chave
  -- primária dupla função: identifica o período E impede, pela própria
  -- restrição de unicidade, que duas execuções concorrentes do script gravem
  -- o aviso duas vezes no mesmo mês.
  mes date primary key,

  -- O que o script viu quando avisou — não recalculável depois, porque
  -- `execucoes_de_ia` segue recebendo linhas novas e o veredito de hoje não
  -- pode mudar retroativamente por causa de uma execução de amanhã.
  execucoes integer not null check (execucoes >= 0),
  execucoes_sem_preco integer not null check (execucoes_sem_preco >= 0),
  total_em_centavos_brl integer not null check (total_em_centavos_brl >= 0),

  avisado_em timestamptz not null default now()
);

comment on table public.avisos_de_custo_de_ia is
  'Um aviso por mês, quando o custo de IA passa do teto — impede reenviar o mesmo aviso a cada execução do script.';

alter table public.avisos_de_custo_de_ia enable row level security;

revoke all on table public.avisos_de_custo_de_ia from anon;
revoke all on table public.avisos_de_custo_de_ia from authenticated;
