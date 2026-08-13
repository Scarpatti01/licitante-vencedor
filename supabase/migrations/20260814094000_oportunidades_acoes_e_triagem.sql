-- O cruzamento edital × empresa, o que o cliente faz com ele, e o registro de
-- por que cada edital apareceu ou não apareceu.
--
-- `oportunidades` não guarda cópia do edital nem da análise: guarda referências
-- e o resultado do cruzamento. É o que permite reprocessar a análise de um
-- edital e ver todas as oportunidades derivadas melhorarem sem migração.

create table public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- CASCADE: edital removido do acervo (retificação que o anula, coleta
  -- indevida) não deixa oportunidade órfã apontando para o nada.
  edital_id uuid not null references public.editais (id) on delete cascade,
  -- SET NULL: análise substituída não pode levar a oportunidade junto. A
  -- oportunidade sobrevive com o score que tinha até a nova triagem rodar.
  analise_id uuid references public.analises_de_edital (id) on delete set null,

  -- NULO É VALOR LEGÍTIMO, e a coluna é assim de propósito. Quando menos da
  -- metade do peso dos critérios pôde ser avaliada, `calcularScore` devolve
  -- `null` e a lista do que falta, em vez de um número indefensável. Uma coluna
  -- `not null` aqui obrigaria a gravar zero — e zero não é "não sei", é "péssima
  -- aderência", que é uma afirmação sobre a empresa que o dado não sustenta.
  score smallint check (score between 0 and 100),
  -- Faixa é derivável do score, e mesmo assim está gravada. O motivo é que o
  -- corte ("excelente a partir de 85") é regra de produto e vai mudar: uma
  -- coluna gerada reescreveria retroativamente a faixa de oportunidades já
  -- mostradas ao cliente, e o histórico passaria a discordar do e-mail que ele
  -- recebeu. Gravada, a faixa é o que foi dito na época, com `versao_do_score`.
  faixa public.faixa_de_aderencia not null,
  recomendacao public.nivel_de_recomendacao not null,
  -- Os dois lados do "não sei" andam juntos ou não andam. Sem esta constraint o
  -- banco aceitaria uma oportunidade sem score marcada como "excelente", ou um
  -- score 92 marcado como indeterminado — e a tela mostraria a incoerência ao
  -- cliente antes de qualquer teste pegar.
  constraint faixa_indeterminada_sem_score check (
    (score is null) = (faixa = 'indeterminada')
  ),
  -- `cobertura` é a fração do peso dos critérios que teve base para ser
  -- avaliada. Fica gravada porque é ela que justifica um score baixo por falta
  -- de dado ter significado diferente de um score baixo por má aderência.
  cobertura numeric(4, 3) not null check (cobertura between 0 and 1),
  -- `Recomendacao.resumo`: a frase de uma linha que vai para a lista e para o
  -- e-mail. Score sem explicação é número mágico, e o produto vende justamente
  -- a explicação.
  justificativa text not null check (length(btrim(justificativa)) > 0),
  -- A `ProximaAcao` inteira (`{tipo, titulo, porque, itens}`), e não só o
  -- título: ela sai de uma árvore de decisão sobre score, checklist e prazo, e
  -- não dos critérios. Reconstruí-la na leitura significaria reimplementar essa
  -- árvore em SQL e vê-la divergir da de TypeScript na primeira mudança de regra.
  proxima_acao jsonb check (
    proxima_acao is null
    or (jsonb_typeof(proxima_acao) = 'object' and coalesce(proxima_acao ->> 'tipo', '') <> '')
  ),
  -- `Recomendacao.urgente` não tem coluna, de propósito: depende de quantos dias
  -- faltam para a sessão, então seria verdadeiro hoje e mentira amanhã sem
  -- ninguém tocar na linha. Sai de `encerra_em` na leitura, que é a única forma
  -- de estar sempre certo.

  -- Critérios que compuseram o score (peso, ponto, evidência) e o checklist
  -- montado por `montarChecklist`. jsonb porque o formato dos dois é do domínio
  -- e vai evoluir mais rápido que o schema.
  criterios jsonb not null default '[]'::jsonb check (jsonb_typeof(criterios) = 'array'),
  checklist jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist) = 'object'),
  -- Fração de 0 a 1, ou `null` quando não há base para calcular — nunca 0, que
  -- seria afirmar "você não tem nenhum documento" (ver `prontidaoDocumental`).
  prontidao_documental numeric(4, 3) check (prontidao_documental between 0 and 1),

  -- Situação corrente. É a última linha de `acoes_na_oportunidade`, e portanto
  -- derivável — mas derivar exigiria um lateral join por linha em toda listagem,
  -- e a listagem filtra por situação. Mantida por trigger, nunca pela aplicação,
  -- para não haver caminho de código capaz de deixar as duas em desacordo.
  situacao public.situacao_da_oportunidade not null default 'nova',

  -- Cópia de `editais.encerramento_proposta`. Existe porque a tela principal
  -- ordena por prazo dentro de uma empresa, e índice não atravessa tabela:
  -- sem a cópia, toda listagem viraria join + sort do acervo inteiro.
  -- Preenchida e mantida por trigger nos dois lados; a aplicação não escreve.
  encerra_em timestamptz,

  versao_do_score text not null,
  avaliado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Duas oportunidades da mesma empresa para o mesmo edital é bug, sempre: ou o
  -- cliente veria o mesmo edital duas vezes na lista, ou uma das duas guarda
  -- score velho.
  constraint oportunidade_unica_por_empresa unique (empresa_id, edital_id),
  -- Redundante com a PK, e é de propósito: habilita a FK composta de
  -- `acoes_na_oportunidade`, que é o que impede uma ação de apontar para
  -- oportunidade de outro tenant.
  constraint oportunidade_identificada_por_empresa unique (id, empresa_id)
);

comment on table public.oportunidades is
  'Edital × empresa: o que o cliente vê e sobre o que ele age. Uma linha por par, com score, checklist e recomendação.';

create trigger oportunidades_marcar_atualizacao
  before update on public.oportunidades
  for each row execute function public.marcar_atualizacao();

-- As duas ordenações da tela: "melhores primeiro" e "fechando primeiro".
-- Descartadas ficam de fora dos índices porque saem da lista padrão e, com o
-- tempo, seriam a maior parte das linhas.
-- `nulls last` é obrigatório aqui: em `desc`, o Postgres coloca NULL primeiro
-- por padrão, e como score nulo significa "não foi possível avaliar", a lista
-- de "melhores primeiro" abriria com as oportunidades sem pontuação. Elas
-- pertencem à lista, mas não ao topo dela.
create index oportunidades_por_score
  on public.oportunidades (empresa_id, score desc nulls last, encerra_em)
  where situacao <> 'descartada';
create index oportunidades_por_prazo
  on public.oportunidades (empresa_id, encerra_em)
  where situacao <> 'descartada';
create index oportunidades_por_situacao on public.oportunidades (empresa_id, situacao);
-- "Quais empresas receberam este edital" — pergunta de suporte e de auditoria.
create index oportunidades_por_edital on public.oportunidades (edital_id);

-- O prazo entra por trigger, nunca por INSERT da aplicação: é o único jeito de
-- garantir que a cópia não diverge da origem.
create or replace function public.preencher_prazo_da_oportunidade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select e.encerramento_proposta into new.encerra_em
    from public.editais e
   where e.id = new.edital_id;
  return new;
end;
$$;

create trigger oportunidades_preencher_prazo
  before insert or update of edital_id on public.oportunidades
  for each row execute function public.preencher_prazo_da_oportunidade();

-- Retificação de edital que adia a sessão é rotina, e a lista do cliente tem de
-- refletir o prazo novo no mesmo instante.
create or replace function public.sincronizar_prazo_das_oportunidades()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.oportunidades o
     set encerra_em = new.encerramento_proposta
   where o.edital_id = new.id;
  return null;
end;
$$;

create trigger editais_sincronizar_prazo
  after update of encerramento_proposta on public.editais
  for each row
  when (new.encerramento_proposta is distinct from old.encerramento_proposta)
  execute function public.sincronizar_prazo_das_oportunidades();

create table public.acoes_na_oportunidade (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null,
  -- Repetido aqui para a policy comparar sem JOIN. A FK composta abaixo é o que
  -- garante que essa repetição não pode divergir: gravar uma ação com o
  -- `empresa_id` de outro tenant não encontra a chave e o INSERT falha.
  empresa_id uuid not null,
  situacao public.situacao_da_oportunidade not null,
  observacao text,
  -- SET NULL: a pessoa pode ser apagada (LGPD); o fato de a empresa ter
  -- participado do certame não pode.
  feita_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),

  constraint acao_pertence_a_oportunidade
    foreign key (oportunidade_id, empresa_id)
    references public.oportunidades (id, empresa_id) on delete cascade
);

comment on table public.acoes_na_oportunidade is
  'Histórico do que o cliente fez. Append-only: sem policy de UPDATE nem de DELETE, para nenhum papel.';

create index acoes_por_oportunidade
  on public.acoes_na_oportunidade (oportunidade_id, criado_em desc);
-- Alimenta o aprendizado: "o que a empresa participou e ganhou" é o sinal mais
-- valioso que temos para calibrar score.
create index acoes_por_empresa_e_situacao
  on public.acoes_na_oportunidade (empresa_id, situacao, criado_em desc);

create or replace function public.aplicar_acao_na_oportunidade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.oportunidades o
     set situacao = new.situacao
   where o.id = new.oportunidade_id;
  return null;
end;
$$;

create trigger acoes_atualizam_situacao
  after insert on public.acoes_na_oportunidade
  for each row execute function public.aplicar_acao_na_oportunidade();

-- ---------------------------------------------------------------------------
-- Triagem
-- ---------------------------------------------------------------------------

create table public.decisoes_de_triagem (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  edital_id uuid not null references public.editais (id) on delete cascade,
  -- SET NULL: a decisão positiva continua registrada mesmo se a oportunidade
  -- for removida, senão a resposta a "por que sumiu?" sumiria junto.
  oportunidade_id uuid references public.oportunidades (id) on delete set null,

  recomendado boolean not null,
  score smallint check (score between 0 and 100),
  -- Identificador estável da regra que barrou (`uf_fora_do_perfil`,
  -- `ticket_abaixo_do_minimo`, `palavra_excluida`, `prazo_curto_demais`...).
  -- Texto e não enum porque as regras nascem e morrem com o motor de score, e
  -- cada nova regra não pode exigir migração de banco.
  regra_de_exclusao text,
  -- A frase que o cliente lê no suporte. Precisa citar o número que decidiu.
  motivo text,
  criterios jsonb not null default '[]'::jsonb check (jsonb_typeof(criterios) = 'array'),

  versao_do_score text not null,
  avaliado_em timestamptz not null default now(),

  -- É esta restrição que dá sentido à tabela: se não recomendou, tem de dizer
  -- qual regra barrou. Sem ela, a tabela viraria log e a pergunta "por que este
  -- edital não apareceu para esta empresa?" continuaria sem resposta.
  constraint exclusao_tem_regra check (recomendado or regra_de_exclusao is not null),
  -- Não existe `recomendado_tem_score`, e a ausência é a regra.
  --
  -- Oportunidade sem base para pontuar É entregue, com o rótulo de
  -- indeterminada e a lista do que falta — ver `classificar` em
  -- `src/lib/pipeline/triagem.ts`. Escondê-la daria ao cliente a impressão de
  -- que não há licitação para ele, que é falso e é o pior erro possível num
  -- produto de triagem. Uma constraint exigindo score em toda linha entregue
  -- proibiria no banco exatamente o comportamento que o produto promete.
  -- Reavaliar com a mesma versão do motor tem de ser idempotente: o worker roda
  -- de novo depois de uma falha e não pode duplicar o histórico.
  constraint triagem_unica_por_versao unique (empresa_id, edital_id, versao_do_score)
);

comment on table public.decisoes_de_triagem is
  'Por que um edital foi ou não recomendado a uma empresa. Responde à pergunta de suporte e é a prova de que a triagem não é caixa-preta.';

create index triagem_por_empresa on public.decisoes_de_triagem (empresa_id, avaliado_em desc);
create index triagem_por_edital on public.decisoes_de_triagem (edital_id, empresa_id);
-- "Quais regras mais excluem" — o relatório que diz se o perfil de um cliente
-- está estrangulando os resultados dele.
create index triagem_por_regra
  on public.decisoes_de_triagem (empresa_id, regra_de_exclusao)
  where not recomendado;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.oportunidades enable row level security;
alter table public.acoes_na_oportunidade enable row level security;
alter table public.decisoes_de_triagem enable row level security;

revoke all on table public.oportunidades from anon;
revoke all on table public.acoes_na_oportunidade from anon;
revoke all on table public.decisoes_de_triagem from anon;
-- Oportunidade é produzida pelo motor de triagem, não digitada: o cliente lê e
-- age (a ação é uma linha em `acoes_na_oportunidade`). Sem policy de INSERT,
-- UPDATE ou DELETE para `authenticated`, e sem privilégio para elas.
revoke insert, update, delete on table public.oportunidades from authenticated;
grant select on table public.oportunidades to authenticated;
grant select, insert on table public.acoes_na_oportunidade to authenticated;
revoke update, delete on table public.acoes_na_oportunidade from authenticated;
revoke insert, update, delete on table public.decisoes_de_triagem from authenticated;
grant select on table public.decisoes_de_triagem to authenticated;

create policy "membros leem suas oportunidades"
  on public.oportunidades for select to authenticated
  using (public.usuario_pertence_a(empresa_id));

create policy "membros leem o historico"
  on public.acoes_na_oportunidade for select to authenticated
  using (public.usuario_pertence_a(empresa_id));

create policy "membros registram acao"
  on public.acoes_na_oportunidade for insert to authenticated
  with check (
    public.usuario_pertence_a(empresa_id)
    -- Ação em nome de outra pessoa transformaria o histórico em ficção.
    and (feita_por is null or feita_por = (select auth.uid()))
  );

-- Transparência é do produto, não favor: o cliente pode ver por que um edital
-- não chegou até ele. Leitura para todos os membros, escrita só do motor.
create policy "membros leem suas decisoes de triagem"
  on public.decisoes_de_triagem for select to authenticated
  using (public.usuario_pertence_a(empresa_id));
