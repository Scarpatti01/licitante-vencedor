-- As preferências de envio saem do cookie e passam a morar no banco.
--
-- ## Por que precisavam sair
--
-- A tela de configurações já oferecia horário, score mínimo, quantidade por
-- envio e o liga/desliga do e-mail — e tudo isso ficava num cookie do
-- navegador, com o próprio arquivo declarando que era provisório até existir
-- repositório de produto.
--
-- Enquanto ninguém enviava nada, era inofensivo. Deixa de ser no momento em que
-- um processo de madrugada passa a mandar e-mail para o cliente: cookie mora no
-- navegador de quem configurou, e um job não tem navegador. A tela continuaria
-- aceitando cliques e o envio continuaria ignorando todos eles.
--
-- ## O campo que não é conveniência
--
-- `canal_email` é o descadastro. Um e-mail comercial recorrente sem forma de
-- desligar não é só desagradável — é o que faz alguém marcar como spam em vez
-- de procurar o rodapé, e a partir daí o domínio inteiro entrega pior, para
-- todos os clientes. Ele precisa ser lido pelo remetente, e por isso precisa
-- estar aqui.

create table if not exists public.preferencias_de_envio (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,

  -- `HH:MM` no fuso de Brasília, que é o fuso das sessões públicas. Texto, e
  -- não `time`, para casar com o que a tela já usa e evitar conversão dupla.
  horario text not null default '07:00'
    check (horario ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),

  apenas_dias_uteis boolean not null default true,

  -- O liga/desliga. Ver acima: isto é o descadastro, não uma preferência.
  canal_email boolean not null default true,
  -- Destino alternativo. `null` significa "manda para quem é dono da conta".
  email text not null default '' check (email = '' or position('@' in email) > 1),

  -- Fora do escopo por ora, mas declarados porque a tela já os mostra e um
  -- campo que existe na interface e não no banco é a origem deste defeito.
  canal_whatsapp boolean not null default false,
  whatsapp text not null default '',

  -- O corte de aderência abaixo do qual não vale interromper o cliente.
  score_minimo smallint not null default 70 check (score_minimo between 0 and 100),
  -- Quantos cabem num e-mail que é RESUMO. O resto fica no painel.
  maximo_por_envio smallint not null default 8 check (maximo_por_envio between 1 and 50),

  avisar_prazo_de_salvas boolean not null default true,
  -- Falso por padrão, e o padrão é a promessa: dia sem edital novo é dia sem
  -- e-mail. Quem quiser o oposto liga aqui, de propósito.
  enviar_quando_vazio boolean not null default false,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.preferencias_de_envio is
  'Como cada empresa quer receber o resumo diário. Sai do cookie porque quem envia é um job, e job não tem navegador.';

comment on column public.preferencias_de_envio.canal_email is
  'O descadastro do cliente. Sem isto no banco, o remetente não teria como respeitar um "não quero mais".';

create trigger preferencias_de_envio_marcar_atualizacao
  before update on public.preferencias_de_envio
  for each row execute function public.marcar_atualizacao();

alter table public.preferencias_de_envio enable row level security;

-- Mesma forma das demais tabelas por empresa: membro lê, administração escreve.
create policy "membros leem as preferencias"
  on public.preferencias_de_envio for select to authenticated
  using (public.usuario_pertence_a(empresa_id));

create policy "membros criam as preferencias"
  on public.preferencias_de_envio for insert to authenticated
  with check (public.usuario_pertence_a(empresa_id));

create policy "membros editam as preferencias"
  on public.preferencias_de_envio for update to authenticated
  using (public.usuario_pertence_a(empresa_id))
  with check (public.usuario_pertence_a(empresa_id));

revoke all on table public.preferencias_de_envio from anon;
