-- O que já foi enviado para cada lead.
--
-- Esta tabela existe para responder uma pergunta só, todo dia, antes de cada
-- envio: **este endereço já viu este edital?** Sem ela, o alerta diário é um
-- gerador de repetição — um edital publicado hoje continua aberto amanhã e
-- depois de amanhã, então o e-mail de terça seria quase idêntico ao de segunda,
-- e o de quarta idêntico ao de terça. Ninguém cancela por causa disso; a pessoa
-- só para de abrir, o que é pior, porque a lista continua parecendo saudável.
--
-- É a peça que falta para o alerta ser um produto em vez de um disparo.

create table public.envios_de_alerta (
  -- `bigint identity` pelo mesmo motivo da fila: escrita frequente, id que não
  -- sai daqui, e uuid aleatório espalharia o índice em páginas quentes.
  id bigint generated always as identity primary key,

  -- CASCADE: lead apagado (pedido de exclusão sob a LGPD) leva junto o registro
  -- do que foi enviado a ele. É o oposto da auditoria, e de propósito — aqui não
  -- há fato a preservar contra o titular, só uma lista de "não repetir" que
  -- perde o sentido quando não há mais para quem não repetir.
  lead_id uuid not null references public.leads (id) on delete cascade,

  -- O `Edital.id` canônico (para o PNCP, o `numeroControlePNCP`).
  --
  -- Texto solto, SEM referência a `public.editais`, e essa é a decisão que vale
  -- o comentário: o alerta do lead roda direto contra a coleta do dia e não
  -- exige que o edital tenha sido persistido antes. Uma FK aqui acoplaria o
  -- envio ao pipeline de ingestão — e no dia em que a ingestão falhasse, o
  -- alerta pararia junto, por uma dependência que ele não precisa ter.
  edital_id text not null check (length(btrim(edital_id)) > 0),

  enviado_em timestamptz not null default now(),

  -- O id que o provedor de e-mail devolveu. Sem ele, investigar "não recebi"
  -- vira palavra contra palavra; com ele, dá para procurar a entrega no painel
  -- do provedor. NULL quando o envio foi simulado ou o provedor não devolveu.
  id_no_provedor text,

  -- A regra inteira desta tabela em uma linha. Sem esta restrição, uma segunda
  -- execução no mesmo dia (retentativa depois de falha parcial, alguém rodando
  -- o script à mão) reenviaria tudo: a checagem de duplicidade da aplicação lê
  -- o estado ANTES do envio, e duas execuções concorrentes leem o mesmo estado.
  -- Aqui o banco decide, e o perdedor descobre na hora de gravar.
  constraint envio_unico_por_lead_e_edital unique (lead_id, edital_id)
);

comment on table public.envios_de_alerta is
  'O que já foi enviado a cada lead. Consultada antes de cada envio para o alerta diário nunca repetir edital.';

-- O índice que o envio usa: "tudo que este lead já viu". A restrição de
-- unicidade acima já cria um B-tree em (lead_id, edital_id) e ele responde esta
-- consulta pelo prefixo — por isso NÃO há um índice adicional por `lead_id`
-- aqui: seria um segundo B-tree cobrindo o que o primeiro já cobre, cobrado em
-- toda escrita.

-- Esta, sim, o prefixo não responde: "o que saiu hoje", para conferir uma
-- rodada e para medir volume por dia.
create index envios_por_data on public.envios_de_alerta (enviado_em desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- Sem policy, como `leads`: ninguém autenticado tem o que fazer aqui. Quem lê e
-- escreve é o processo de envio, com `service_role`, que ignora RLS.
alter table public.envios_de_alerta enable row level security;

revoke all on table public.envios_de_alerta from anon, authenticated;
grant select, insert, delete on table public.envios_de_alerta to service_role;
