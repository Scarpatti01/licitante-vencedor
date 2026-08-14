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

  -- O identificador do lead nas duas ações públicas: confirmar e descadastrar.
  --
  -- Opaco e gerado na aplicação (`gerarToken`, em `src/lib/leads.ts`), não aqui.
  -- Não é `gen_random_uuid()` reaproveitado do `id` por um motivo que vale a
  -- coluna extra: este valor viaja em URL, em log de servidor, em histórico de
  -- navegador e no `Referer` de qualquer link clicado a partir da página de
  -- confirmação. Ele é público na prática. A chave primária, que aparece em
  -- relatório e em consulta de suporte, não deve ser a mesma coisa que abre o
  -- descadastro de alguém.
  --
  -- `not null` sem `default`: um lead sem token é um lead que nunca conseguirá
  -- confirmar nem sair da lista. Melhor o insert falhar alto.
  token text not null check (token ~ '^[A-Za-z0-9_-]{22,64}$'),

  -- Quando o dono do e-mail clicou no link de confirmação. NULL = pendente, e
  -- pendente não recebe nada além da própria confirmação.
  --
  -- É também o registro de consentimento: se um dia alguém alegar que nunca
  -- pediu para receber, esta data e a `origem` são a resposta. Por isso a
  -- aplicação só grava quando ainda está NULL — reconfirmar não pode reescrever
  -- a data do consentimento original.
  confirmado_em timestamptz,

  -- Quando pediu para sair. Preenchido em vez de `delete` de propósito: apagar
  -- a linha faria o mesmo endereço poder ser recadastrado por terceiro sem
  -- deixar rastro, e sumiria com a prova de que o pedido de saída foi atendido.
  descadastrado_em timestamptz,

  -- O mesmo e-mail cadastrando de novo não é erro: é alguém que esqueceu que já
  -- tinha se cadastrado, ou que leu outro artigo. A rota usa
  -- `resolution=ignore-duplicates`, que precisa desta restrição para funcionar —
  -- sem ela o segundo envio criaria linha duplicada em vez de ser absorvido.
  -- O custo é conhecido e aceito: guardamos a PRIMEIRA origem, que é a que de
  -- fato converteu.
  constraint lead_unico_por_email unique (email),

  -- Colisão de token é praticamente impossível com 256 bits de aleatoriedade, e
  -- é justamente por isso que a restrição é barata: ela nunca vai disparar por
  -- acaso. Vai disparar se alguém escrever token à mão ou repetir um valor numa
  -- carga — e nesse caso duas pessoas passariam a compartilhar o mesmo link de
  -- descadastro, que é exatamente o erro que não pode passar silencioso.
  --
  -- É esta restrição que cria o índice por token. Um `create index` adicional
  -- sobre a mesma coluna seria um segundo B-tree idêntico: custo de escrita em
  -- todo insert, zero ganho de leitura. As buscas por token — `token=eq.…` nas
  -- páginas `/confirmar/` e `/descadastrar/` — usam o índice desta unicidade.
  constraint lead_token_unico unique (token)
);

comment on table public.leads is
  'Interessados capturados no site público, antes de existir empresa. `origem` é o que permite saber qual conteúdo converte. Double opt-in: só `confirmado_em not null` e `descadastrado_em is null` pode receber envio.';

comment on column public.leads.token is
  'Identificador opaco usado nos links públicos de confirmação e descadastro. Gerado na aplicação; nunca derivado do e-mail.';
comment on column public.leads.confirmado_em is
  'Quando o dono do endereço confirmou. NULL = pendente. É o registro do consentimento e não é sobrescrito por reconfirmação.';
comment on column public.leads.descadastrado_em is
  'Quando pediu para sair. A linha permanece de propósito — apagar sumiria com a prova de que o pedido foi atendido.';

-- A consulta real do dia a dia é "quantos leads por origem no período".
create index leads_por_origem on public.leads (origem, recebido_em desc);
create index leads_por_data on public.leads (recebido_em desc);

-- A lista de envio: confirmados que não pediram para sair.
--
-- Índice parcial porque a consulta é sempre com estes dois filtros, e porque
-- pendente e descadastrado são exatamente as linhas que ela nunca quer ver —
-- mantê-las fora do índice o deixa menor que a tabela e faz o filtro certo ser o
-- caminho barato. O errado (varrer tudo e mandar para quem não confirmou) fica
-- sendo também o caminho caro, que é a única forma de proteção que não depende
-- de alguém lembrar da regra.
create index leads_confirmados on public.leads (confirmado_em desc)
  where confirmado_em is not null and descadastrado_em is null;

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
