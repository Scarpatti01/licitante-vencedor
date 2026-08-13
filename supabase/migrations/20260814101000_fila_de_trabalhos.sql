-- Fila de trabalho em Postgres. Sem Redis, sem SQS, de propósito.
--
-- O volume deste produto é de milhares de itens por dia, não milhões por
-- segundo. Nessa faixa, `FOR UPDATE SKIP LOCKED` entrega exatamente o que uma
-- fila dedicada entregaria, e entrega junto três coisas que a fila dedicada
-- não tem: enfileirar na mesma transação que gravou o edital (ou nenhum dos
-- dois acontece), inspecionar a fila com SELECT, e uma peça a menos para
-- provisionar, monitorar e pagar. Quando o volume justificar outra coisa, o
-- contrato a preservar é o desta função.

create table public.fila_de_trabalhos (
  -- `bigint identity` e não uuid: a fila é a tabela de maior taxa de escrita do
  -- sistema, e uuid aleatório espalha o índice em páginas quentes diferentes a
  -- cada inserção. Aqui o id não vaza para lugar nenhum, então não há motivo
  -- para pagar por ele ser imprevisível.
  id bigint generated always as identity primary key,
  tipo public.tipo_de_trabalho not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status public.status_do_trabalho not null default 'pendente',
  -- Menor roda antes. Escala aberta para caber urgência futura sem migração —
  -- edital que encerra amanhã tem de furar a fila de reprocessamento.
  prioridade smallint not null default 100,

  tentativas integer not null default 0 check (tentativas >= 0),
  maximo_de_tentativas integer not null default 5 check (maximo_de_tentativas > 0),

  -- Agendamento e backoff moram na mesma coluna: adiar por dependência e adiar
  -- por falha são a mesma operação do ponto de vista de quem consome.
  disponivel_em timestamptz not null default now(),
  -- Até quando a reserva vale. Worker que morre no meio não trava o trabalho
  -- para sempre: passado este instante, `reservar_trabalhos` o pega de novo.
  travado_ate timestamptz,
  travado_por text,

  -- Quando preenchida, impede enfileirar o mesmo trabalho duas vezes enquanto
  -- ele ainda não terminou (ver o índice parcial abaixo).
  chave_de_idempotencia text,
  -- Trabalho ligado a um cliente. CASCADE: cliente removido não deixa fila
  -- processando o que não tem mais para quem entregar.
  empresa_id uuid references public.empresas (id) on delete cascade,

  ultimo_erro text,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.fila_de_trabalhos is
  'Fila de trabalhos assíncronos. Consumida por reservar_trabalhos(); nenhum worker deve fazer UPDATE de status à mão.';

create trigger fila_de_trabalhos_marcar_atualizacao
  before update on public.fila_de_trabalhos
  for each row execute function public.marcar_atualizacao();

-- O índice que a reserva usa. Parcial porque a fila acumula concluídos para
-- sempre e o que interessa a ela é sempre a fatia pendente — sem o predicado,
-- o índice cresceria indefinidamente para responder a mesma consulta.
create index fila_pendente
  on public.fila_de_trabalhos (prioridade, disponivel_em, id)
  where status = 'pendente';

-- A varredura de reservas expiradas. Igualmente pequena por construção.
create index fila_reservada
  on public.fila_de_trabalhos (travado_ate)
  where status = 'reservado';

create index fila_por_tipo_e_status on public.fila_de_trabalhos (tipo, status);

-- Idempotência só enquanto o trabalho está vivo: terminado, o mesmo trabalho
-- pode ser reenfileirado amanhã com a mesma chave (coletar o mesmo dia de novo,
-- por exemplo), e travar isso para sempre transformaria a chave em impedimento.
create unique index fila_idempotencia
  on public.fila_de_trabalhos (tipo, chave_de_idempotencia)
  where chave_de_idempotencia is not null and status in ('pendente', 'reservado');

-- ---------------------------------------------------------------------------
-- Contrato de consumo
-- ---------------------------------------------------------------------------

-- Estas funções NÃO são `security definer`. Não precisam ser: quem as chama é
-- `service_role`, que já ignora RLS. Definer aqui só criaria uma porta de
-- escalonamento de privilégio sem ganho nenhum.

create or replace function public.reservar_trabalhos(
  p_trabalhador text,
  p_tipos public.tipo_de_trabalho[] default null,
  p_quantidade integer default 1,
  p_duracao interval default interval '5 minutes'
)
returns setof public.fila_de_trabalhos
language plpgsql
volatile
set search_path = ''
as $$
begin
  -- `SKIP LOCKED` é o que torna a função segura com N workers: cada um pula as
  -- linhas que outro já travou em vez de esperar por elas. Sem isso, dois
  -- workers em paralelo ficam em fila indiana e o paralelismo é decorativo.
  --
  -- A reserva expirada entra no mesmo SELECT, e não numa rotina de limpeza
  -- separada, porque uma rotina separada é mais uma coisa para agendar e para
  -- alguém esquecer de agendar. Assim, a fila se recupera sozinha na próxima
  -- chamada de quem quer trabalho.
  --
  -- `tentativas` é incrementado na reserva, e não na conclusão: worker que
  -- morre sem responder tem de contar como tentativa, senão um trabalho que
  -- derruba o processo é reservado para sempre.
  return query
  with candidatos as (
    select f.id
      from public.fila_de_trabalhos f
     where f.tentativas < f.maximo_de_tentativas
       and (p_tipos is null or f.tipo = any (p_tipos))
       and (
         (f.status = 'pendente' and f.disponivel_em <= now())
         or (f.status = 'reservado' and f.travado_ate < now())
       )
     order by f.prioridade, f.disponivel_em, f.id
     limit greatest(coalesce(p_quantidade, 1), 0)
     for update skip locked
  )
  update public.fila_de_trabalhos f
     set status = 'reservado',
         tentativas = f.tentativas + 1,
         travado_ate = now() + coalesce(p_duracao, interval '5 minutes'),
         travado_por = p_trabalhador
    from candidatos c
   where f.id = c.id
  returning f.*;
end;
$$;

comment on function public.reservar_trabalhos(text, public.tipo_de_trabalho[], integer, interval) is
  'Reserva até p_quantidade trabalhos disponíveis para p_trabalhador. Seguro com múltiplos workers (SKIP LOCKED) e idempotente: chamar de novo devolve outros trabalhos, nunca os mesmos ainda travados.';

create or replace function public.concluir_trabalho(p_id bigint)
returns void
language sql
volatile
set search_path = ''
as $$
  update public.fila_de_trabalhos
     set status = 'concluido',
         concluido_em = now(),
         travado_ate = null,
         travado_por = null,
         ultimo_erro = null
   where id = p_id;
$$;

-- Falha com backoff exponencial. O teto de 10 dobras existe porque, sem ele,
-- a décima quinta tentativa cairia daqui a meses e o trabalho estaria
-- tecnicamente pendente e praticamente perdido — pior que falhar aberto.
create or replace function public.falhar_trabalho(
  p_id bigint,
  p_erro text,
  p_espera interval default null
)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_tentativas integer;
  v_maximo integer;
begin
  select tentativas, maximo_de_tentativas
    into v_tentativas, v_maximo
    from public.fila_de_trabalhos
   where id = p_id
   for update;

  if not found then
    return;
  end if;

  if v_tentativas >= v_maximo then
    update public.fila_de_trabalhos
       set status = 'falhou',
           ultimo_erro = p_erro,
           travado_ate = null,
           travado_por = null
     where id = p_id;
  else
    update public.fila_de_trabalhos
       set status = 'pendente',
           ultimo_erro = p_erro,
           travado_ate = null,
           travado_por = null,
           disponivel_em = now() + coalesce(
             p_espera,
             make_interval(secs => 30 * power(2, least(v_tentativas, 10)))
           )
     where id = p_id;
  end if;
end;
$$;

-- Enfileirar respeitando a idempotência sem obrigar cada chamador a saber do
-- índice parcial. Devolve `null` quando o trabalho já estava na fila — o que,
-- para quem chama, é sucesso: o trabalho vai acontecer.
create or replace function public.enfileirar_trabalho(
  p_tipo public.tipo_de_trabalho,
  p_payload jsonb default '{}'::jsonb,
  p_chave_de_idempotencia text default null,
  p_empresa_id uuid default null,
  p_prioridade smallint default 100::smallint,
  p_disponivel_em timestamptz default now()
)
returns bigint
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into public.fila_de_trabalhos
    (tipo, payload, chave_de_idempotencia, empresa_id, prioridade, disponivel_em)
  values
    (p_tipo, coalesce(p_payload, '{}'::jsonb), p_chave_de_idempotencia, p_empresa_id,
     coalesce(p_prioridade, 100::smallint), coalesce(p_disponivel_em, now()))
  returning id into v_id;
  return v_id;
exception
  -- Tratado aqui, e não com ON CONFLICT, porque a inferência de conflito sobre
  -- índice parcial exige repetir o predicado do índice em cada chamada — e um
  -- predicado repetido é um predicado que vai divergir do índice.
  when unique_violation then
    return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- A fila não tem policy nenhuma, e é assim que tem de ser: nenhum usuário final
-- lê ou escreve aqui. `service_role` ignora RLS e é o único que a toca.
alter table public.fila_de_trabalhos enable row level security;

revoke all on table public.fila_de_trabalhos from anon, authenticated;
grant select, insert, update, delete on table public.fila_de_trabalhos to service_role;

revoke execute on function public.reservar_trabalhos(text, public.tipo_de_trabalho[], integer, interval) from public;
revoke execute on function public.concluir_trabalho(bigint) from public;
revoke execute on function public.falhar_trabalho(bigint, text, interval) from public;
revoke execute on function public.enfileirar_trabalho(public.tipo_de_trabalho, jsonb, text, uuid, smallint, timestamptz) from public;
grant execute on function public.reservar_trabalhos(text, public.tipo_de_trabalho[], integer, interval) to service_role;
grant execute on function public.concluir_trabalho(bigint) to service_role;
grant execute on function public.falhar_trabalho(bigint, text, interval) to service_role;
grant execute on function public.enfileirar_trabalho(public.tipo_de_trabalho, jsonb, text, uuid, smallint, timestamptz) to service_role;
