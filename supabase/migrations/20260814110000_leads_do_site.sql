-- Os interessados capturados pelo site público.
--
-- Esta tabela é a ponta do funil de aquisição: o blog e os guias recebem o
-- tráfego orgânico, a captura no meio do texto colhe o e-mail, e é aqui que ele
-- para. Ela nasce separada de `empresas` de propósito — um lead ainda não é
-- cliente, não tem CNPJ, não tem perfil e pode nunca virar nada. Misturar os
-- dois obrigaria a criar empresa fantasma a cada e-mail digitado.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(btrim(email)) between 6 and 254),
  -- Texto livre: o visitante escreve "Recife", "recife/pe" ou "região metro".
  -- Normalizar isso contra o IBGE é trabalho de quando o lead virar cliente;
  -- exigir precisão no formulário derruba conversão em troca de nada.
  cidade text,
  -- De qual página veio, no formato `blog/<slug>#captura-3` ou `guia/<slug>#meio`.
  -- É o que responde "qual conteúdo traz cadastro" — sem isto, a decisão de
  -- onde investir em conteúdo vira palpite.
  origem text not null default 'desconhecida',
  recebido_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),

  -- O mesmo e-mail cadastrando de novo não é erro: é alguém que esqueceu que já
  -- tinha se cadastrado, ou que leu outro artigo. A rota usa
  -- `resolution=ignore-duplicates`, que precisa desta restrição para funcionar —
  -- sem ela o segundo envio criaria linha duplicada em vez de ser absorvido.
  -- O custo é conhecido e aceito: guardamos a PRIMEIRA origem, que é a que de
  -- fato converteu.
  constraint lead_unico_por_email unique (email)
);

comment on table public.leads is
  'Interessados capturados no site público, antes de existir empresa. `origem` é o que permite saber qual conteúdo converte.';

-- A consulta real do dia a dia é "quantos leads por origem no período".
create index leads_por_origem on public.leads (origem, recebido_em desc);
create index leads_por_data on public.leads (recebido_em desc);

alter table public.leads enable row level security;

-- Nenhuma policy, e isso é a configuração correta e completa.
--
-- Com RLS ligada e zero policies, a tabela nega tudo para `anon` e para
-- `authenticated`. O único acesso é por `service_role`, que ignora RLS e é
-- usada apenas pela rota `/api/alerta/`, no servidor. É deliberado: abrir INSERT
-- para `anon` transformaria o endpoint público num formulário de inserção
-- direta no banco, e um robô encheria a tabela em minutos.
--
-- Ler os leads é operação de dono, feita pelo painel do Supabase ou por uma
-- futura tela de administração autenticada — nunca pelo navegador do visitante.

revoke all on table public.leads from anon, authenticated;
