-- O veredito de cada rodada de coleta, persistido — não só no arquivo.
--
-- `scripts/ingerir-pncp.ts` (e `juntar-coleta.ts`, na coleta paralela) já
-- classificam cada rodada como completa, parcial-aceitável ou degradada
-- (`src/lib/fontes/degradacao.ts:classificarColeta`) e gravam o veredito em
-- `dados/parciais/classificacao.json` — um arquivo no repositório, lido pelo
-- workflow para decidir se commita o agregado. O que faltava era a mesma
-- informação alcançável por quem lê o Postgres: `RepositorioSupabase.painelDoDia`
-- não tem, hoje, como responder "a última coleta veio inteira?", e devolve
-- `coletaCompleta: true` sempre — uma simplificação sabida, não uma checagem.
--
-- Esta tabela existe só para isso. Não substitui `classificacao.json`: aquele
-- arquivo é o que o workflow lê para decidir COMMITAR ou não o agregado —
-- decisão de série temporal do blog, que continua sendo assunto do git. Esta
-- tabela é o que o PRODUTO lê para decidir se avisa o cliente que a lista de
-- hoje pode estar incompleta — decisão de tela, que precisa de banco.
--
-- Por isso os dois convivem em vez de um substituir o outro: fontes de
-- verdade diferentes, para leitores diferentes, e cada um já resolvia o seu
-- problema antes desta tabela existir.

create table public.execucoes_de_coleta (
  id uuid primary key default gen_random_uuid(),

  -- Hoje só "pncp", mas a coluna já existe: ver a pergunta aberta em
  -- `supabase/README.md` sobre `editais.fonte` virar cadastro.
  fonte text not null check (length(btrim(fonte)) > 0),

  -- Mesmo domínio de `ClasseDeColeta` (`src/lib/fontes/degradacao.ts`). Texto
  -- e não enum: o motivo é o mesmo de `decisoes_de_triagem.regra_de_exclusao`
  -- — este valor nasce e morre com a lógica de `classificarColeta`, que já
  -- mudou de regra mais de uma vez na primeira semana do projeto.
  classe text not null check (classe in ('completa', 'parcial-aceitavel', 'degradada')),

  -- Um por regra disparada, em português — o mesmo texto que já vai para
  -- `classificacao.json` e para o resumo do workflow. Histórico de por que
  -- cada rodada foi classificada como foi, não só o rótulo final.
  motivos text[] not null default '{}',

  -- O resumo do agregado que esta rodada produziu (`ResumoDeAgregado`).
  -- Guardado, e não recalculável a partir de `editais`, pelo mesmo motivo de
  -- `oportunidades.faixa`: é o retrato do que a rodada viu naquele instante,
  -- e `editais` continua sendo atualizado por rodadas seguintes.
  editais integer not null check (editais >= 0),
  municipios integer not null check (municipios >= 0),
  ufs text[] not null default '{}',

  -- O instante da coleta (`coletadoEm` do snapshot) — não o instante em que
  -- esta linha foi gravada. Para uma coleta paralela, é o do shard mais
  -- antigo (ver `juntar-coleta.ts`), a mesma regra que `agregados.json` usa.
  coletado_em timestamptz not null,

  criado_em timestamptz not null default now()
);

comment on table public.execucoes_de_coleta is
  'O veredito completa/parcial-aceitável/degradada de cada rodada de coleta, para o produto responder "a lista de hoje pode estar incompleta?" sem depender de arquivo no repositório.';

-- A única consulta real: "qual foi a classificação da rodada mais recente?".
create index execucoes_de_coleta_por_data on public.execucoes_de_coleta (coletado_em desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- Mesmo padrão de `editais`: dado público (sem `empresa_id`), mas atrás de
-- autenticação — e escrita só do coletor (`service_role`, que não passa por
-- RLS). Ver `supabase/README.md`, seção "Como usar".
alter table public.execucoes_de_coleta enable row level security;

revoke all on table public.execucoes_de_coleta from anon;
revoke insert, update, delete on table public.execucoes_de_coleta from authenticated;
grant select on table public.execucoes_de_coleta to authenticated;

create policy "autenticados leem execucoes de coleta"
  on public.execucoes_de_coleta for select to authenticated using (true);
