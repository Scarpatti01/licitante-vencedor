-- O que já foi enviado a cada empresa, para não mandar o mesmo edital duas vezes.
--
-- Espelha `envios_de_alerta`, que faz o mesmo para os leads do alerta gratuito,
-- e existe separada em vez de ganhar uma coluna lá por uma razão de fronteira:
-- lead e empresa são sujeitos diferentes, com consentimentos diferentes e ciclos
-- de vida diferentes. Uma tabela com `lead_id` e `empresa_id` nuláveis teria uma
-- delas sempre vazia e nenhuma regra do banco impedindo as duas preenchidas.
--
-- A unicidade é o mecanismo, não uma proteção acessória: a checagem de
-- duplicidade acontece ANTES do envio, então duas execuções simultâneas leriam
-- o mesmo estado e ambas decidiriam mandar. A restrição abaixo é o que impede o
-- segundo registro — e é por isso que o workflow também serializa por
-- `concurrency`, para que a colisão nem chegue aqui.

create table if not exists public.envios_do_resumo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  edital_id uuid not null references public.editais(id) on delete cascade,
  enviado_em timestamptz not null default now(),
  -- O id que o provedor devolveu. Serve para investigar entrega quando alguém
  -- diz que não recebeu — sem ele, a única resposta possível é "consta como
  -- enviado", que não ajuda ninguém.
  id_no_provedor text,

  constraint um_envio_por_empresa_e_edital unique (empresa_id, edital_id)
);

comment on table public.envios_do_resumo is
  'Um registro por edital enviado a uma empresa. A unicidade é o que impede o mesmo edital sair duas vezes.';

create index if not exists envios_do_resumo_por_empresa
  on public.envios_do_resumo (empresa_id, enviado_em desc);

alter table public.envios_do_resumo enable row level security;

-- Leitura para os membros — é o histórico do que a empresa recebeu, e ela tem
-- direito de conferir. Escrita é só do remetente, que usa a chave de serviço:
-- nenhuma política de INSERT aqui, de propósito.
create policy "membros leem os proprios envios"
  on public.envios_do_resumo for select to authenticated
  using (public.usuario_pertence_a(empresa_id));

revoke all on table public.envios_do_resumo from anon;
