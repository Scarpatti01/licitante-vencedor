-- O dado público: editais, seus anexos, a análise e os trechos vetorizados.
--
-- Nenhuma tabela deste arquivo tem `empresa_id`, e isso é o coração da
-- economia do produto (ver o cabeçalho de `src/lib/dominio/tipos.ts`): o edital
-- é analisado UMA vez e a análise serve todos os assinantes. Se `analises_de_edital`
-- fosse por tenant, o custo de IA seria multiplicado pelo número de clientes e
-- o flywheel de dados deixaria de existir.
--
-- Nada aqui fala PNCP. `fonte` + `id_na_fonte` é o que permite ligar ComprasNet,
-- BLL, portais estaduais e o que vier sem tocar em nenhuma outra tabela.

create table public.editais (
  -- Chave própria, em uuid, porque é ela que as FKs de oportunidades, análises,
  -- trechos e execuções apontam — e chave estrangeira em texto de terceiro
  -- amarra o schema inteiro ao formato de um portal.
  id uuid primary key default gen_random_uuid(),

  -- As três identidades de `src/lib/fontes/tipos.ts`, cada uma com seu papel:
  --   `id_canonico`  — o `Edital.id`: chave do projeto, a que vai para URL e
  --                    para mapa em memória. Única, e é por ela que a coleta
  --                    faz upsert.
  --   `fonte`        — quem publicou. Procedência.
  --   `id_na_fonte`  — como AQUELA fonte chama o registro. Serve para voltar
  --                    nela.
  -- Hífen é aceito em `fonte` porque os nomes curtos já em uso têm (`portal-pe`).
  id_canonico text not null unique check (length(btrim(id_canonico)) > 0),
  fonte text not null check (fonte ~ '^[a-z0-9_-]+$'),
  id_na_fonte text not null check (length(btrim(id_na_fonte)) > 0),

  -- SHA-256 do conteúdo canônico (`hashDeConteudo`). É o que permite responder
  -- "este edital mudou desde ontem?" sem comparar dezessete campos a cada
  -- coleta — e é por isso que ele é gravado, e não recalculado na leitura: o
  -- valor de ontem tem de existir para haver comparação.
  hash_de_conteudo text check (hash_de_conteudo ~ '^[0-9a-f]{64}$'),

  objeto text not null,

  orgao_cnpj text check (orgao_cnpj ~ '^[0-9]{14}$'),
  orgao_nome text not null default '',
  orgao_esfera public.esfera_do_orgao not null default 'desconhecida',

  -- `ehUtilizavel` já barra o registro sem UF, município, IBGE ou prazo antes
  -- de chegar aqui; o NOT NULL é a segunda barreira, para o dia em que outro
  -- coletor esquecer de chamar aquela função.
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  municipio text not null,
  -- Derivado de `municipio`, mas guardado: quem gera o slug é `slugDeMunicipio`,
  -- em TypeScript, e ele decide a URL pública. Uma coluna gerada com uma
  -- reimplementação em SQL divergiria em algum acento e quebraria endereços já
  -- indexados sem ninguém notar.
  municipio_slug text not null check (municipio_slug ~ '^[a-z0-9-]+$'),
  codigo_ibge text not null check (codigo_ibge ~ '^[0-9]{7}$'),

  modalidade text not null default 'Não informada',
  modo_disputa text,
  instrumento text,
  amparo_legal text,
  registro_de_precos boolean not null default false,

  -- Em reais. `null` quando o órgão não informou — inclusive quando informou
  -- zero, caso em que o que veio fica em `valor_estimado_bruto`. Ver a nota
  -- longa em `src/lib/pncp/tipos.ts`.
  valor_estimado numeric(18, 2) check (valor_estimado > 0),
  valor_estimado_bruto numeric(18, 2),
  -- Não é derivável de uma linha só: `marcarValoresSuspeitos` decide pelo
  -- percentil do lote. Um CHECK ou uma coluna gerada aqui teria de fixar um
  -- teto em reais, exatamente o que aquele arquivo explica por que não fazer.
  valor_suspeito boolean not null default false,

  -- timestamptz: as datas chegam sem fuso e são horário de Brasília;
  -- `comFusoDeBrasilia` anexa o offset antes de gravar. Guardar como `timestamp`
  -- sem fuso repetiria em produção o bug de três horas descrito em `normaliza.ts`.
  abertura_proposta timestamptz,
  encerramento_proposta timestamptz,
  publicado_em timestamptz,
  situacao text,
  link text not null,

  coletado_em timestamptz not null default now(),
  -- O payload como a fonte devolveu. Ocupa espaço e vale a pena: quando a
  -- normalização mudar (e ela vai — o `objetoCompra` de hoje é o que temos),
  -- dá para reprocessar o acervo inteiro sem rebater na API de ninguém.
  carga_bruta jsonb,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- A segunda chave de deduplicação. `id_canonico` já é único; esta impede que
  -- o MESMO registro da MESMA fonte entre duas vezes com ids canônicos
  -- diferentes, que é o que aconteceria se a regra de canonicalização mudasse
  -- no meio de uma coleta.
  constraint edital_unico_na_fonte unique (fonte, id_na_fonte)
);

comment on table public.editais is
  'Dado público, compartilhado por todos os tenants. Espelha o tipo Edital; fonte + id_na_fonte mantém o modelo desacoplado do PNCP.';

create trigger editais_marcar_atualizacao
  before update on public.editais
  for each row execute function public.marcar_atualizacao();

-- As três consultas que existem de verdade nas telas públicas e na triagem:
-- por região com prazo aberto, por município, e "o que entrou desde ontem".
create index editais_por_uf_e_prazo on public.editais (uf, encerramento_proposta desc);
create index editais_por_municipio on public.editais (codigo_ibge, encerramento_proposta desc);
create index editais_por_prazo on public.editais (encerramento_proposta);
create index editais_por_coleta on public.editais (fonte, coletado_em desc);

-- Busca por texto do objeto. A configuração 'portuguese' vai explícita porque
-- só a forma de dois argumentos de `to_tsvector` é imutável — sem ela o índice
-- nem chega a ser criado.
create index editais_objeto_busca on public.editais using gin (to_tsvector('portuguese', objeto));

-- O que separa "lista de licitações" de produto: o prazo foi prorrogado, o
-- objeto foi retificado, a situação virou "Suspensa". Quem já decidiu disputar
-- precisa saber no dia, e o alerta só dispara quando houve mudança de verdade.
-- `mudou()` e `diferencas()` produzem exatamente estas colunas; sem a tabela,
-- a comparação aconteceria e o resultado se perderia no fim da coleta.
create table public.mudancas_no_edital (
  id bigint generated always as identity primary key,
  edital_id uuid not null references public.editais (id) on delete cascade,
  detectado_em timestamptz not null default now(),
  hash_anterior text not null check (hash_anterior ~ '^[0-9a-f]{64}$'),
  hash_novo text not null check (hash_novo ~ '^[0-9a-f]{64}$'),
  -- `[{campo, de, para}]`, como `diferencas()` devolve. É o corpo do alerta.
  diferencas jsonb not null check (jsonb_typeof(diferencas) = 'array'),
  -- Mudança sem diferença é hash calculado sobre campo que não deveria entrar
  -- nele (`coletadoEm`, `valorSuspeito`) — o sintoma de um bug caro, porque
  -- geraria alerta diário idêntico que o cliente aprende a ignorar.
  constraint mudanca_tem_diferenca check (
    hash_anterior <> hash_novo and jsonb_array_length(diferencas) > 0
  )
);

-- "O que mudou nos editais que me interessam, desde ontem" — sempre por
-- edital e sempre recente primeiro.
create index mudancas_por_edital on public.mudancas_no_edital (edital_id, detectado_em desc);
create index mudancas_por_data on public.mudancas_no_edital (detectado_em desc);

create table public.documentos_do_edital (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais (id) on delete cascade,
  url text not null,
  nome text,
  tipo text,
  status public.status_da_extracao not null default 'pendente',
  hash_sha256 text check (hash_sha256 ~ '^[0-9a-f]{64}$'),
  tamanho_em_bytes bigint check (tamanho_em_bytes >= 0),
  paginas integer check (paginas > 0),
  caminho_no_storage text unique,
  erro_da_extracao text,
  baixado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Reingestão reencontra os mesmos anexos; sem isto, baixaríamos e pagaríamos
  -- extração de novo a cada varredura.
  constraint anexo_unico_por_edital unique (edital_id, url),
  -- Falha sem motivo registrado é falha que ninguém consegue depurar depois.
  constraint falha_tem_motivo check (status <> 'falhou' or erro_da_extracao is not null)
);

create trigger documentos_do_edital_marcar_atualizacao
  before update on public.documentos_do_edital
  for each row execute function public.marcar_atualizacao();

-- A fila de download pergunta "o que ainda não baixei"; índice parcial porque
-- a resposta interessa por pouco tempo e a tabela cresce para sempre.
create index documentos_do_edital_pendentes
  on public.documentos_do_edital (criado_em)
  where status in ('pendente', 'baixado');

create table public.analises_de_edital (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais (id) on delete cascade,

  -- `null` quando existe só o registro da coleta, sem leitura do documento —
  -- e nesse caso todos os campos abaixo são `desconhecido`. O produto continua
  -- funcionando e diz que a leitura profunda não aconteceu.
  analisado_em timestamptz,
  versao_do_prompt text not null,
  modelo text,
  profundidade public.profundidade_da_analise not null default 'lista',

  -- jsonb e não colunas: cada campo é um `Campo<T>` com origem, evidência e
  -- confiança. Espalhar isso em colunas daria quatro colunas por campo e ainda
  -- assim não caberia `riscos`, que é lista de campos.
  resumo_executivo jsonb not null,
  criterio_de_julgamento jsonb not null,
  garantia_exigida jsonb not null,
  visita_tecnica_exigida jsonb not null,
  amostra_exigida jsonb not null,
  exigencias jsonb not null default '[]'::jsonb,
  riscos jsonb not null default '[]'::jsonb,

  -- Soma das execuções que produziram esta análise. É cópia do que está em
  -- `execucoes_de_ia`, e existe porque aquela tabela tem retenção curta (cresce
  -- rápido) enquanto a pergunta "quanto custou analisar este edital" continua
  -- valendo para sempre.
  custo_em_centavos integer check (custo_em_centavos >= 0),

  -- Uma análise por edital é a que o produto usa; as outras são histórico de
  -- reprocessamento. Marcar em vez de deduzir por `max(versao_do_prompt)`
  -- porque versão de prompt não é ordenável e um rollback tornaria a mais nova
  -- justamente a que não vale.
  vigente boolean not null default true,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint analise_unica_por_versao unique (edital_id, versao_do_prompt),
  -- Sem procedência, a interface não tem como distinguir fato de inferência —
  -- e essa distinção é o que o produto vende.
  constraint campos_com_procedencia check (
    public.eh_campo_com_procedencia(resumo_executivo)
    and public.eh_campo_com_procedencia(criterio_de_julgamento)
    and public.eh_campo_com_procedencia(garantia_exigida)
    and public.eh_campo_com_procedencia(visita_tecnica_exigida)
    and public.eh_campo_com_procedencia(amostra_exigida)
  ),
  constraint riscos_sao_campos check (public.eh_lista_de_campos(riscos)),
  constraint exigencias_bem_formadas check (public.eh_lista_de_exigencias(exigencias)),
  -- Análise que diz ter lido o documento sem hora de leitura é registro de
  -- coleta se passando por leitura.
  constraint profundidade_coerente check (profundidade = 'lista' or analisado_em is not null)
);

comment on table public.analises_de_edital is
  'O que conseguimos ler do edital. Uma por edital + versão de prompt; a marcada como vigente é a que o produto mostra.';

create trigger analises_de_edital_marcar_atualizacao
  before update on public.analises_de_edital
  for each row execute function public.marcar_atualizacao();

create unique index analise_vigente_unica
  on public.analises_de_edital (edital_id)
  where vigente;

create table public.trechos_de_edital (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais (id) on delete cascade,
  -- CASCADE também aqui: trecho sem o documento de origem não tem como ser
  -- citado como evidência, e evidência é requisito de `Campo`.
  documento_id uuid references public.documentos_do_edital (id) on delete cascade,
  ordem integer not null check (ordem >= 0),
  pagina integer check (pagina > 0),
  texto text not null check (length(btrim(texto)) > 0),
  tokens integer check (tokens > 0),

  -- Guardado junto do vetor porque embedding de modelos diferentes não é
  -- comparável: misturar dois modelos no mesmo índice devolve vizinhos
  -- aleatórios com aparência de resultado.
  modelo_do_embedding text not null,
  -- 768 dimensões: é o que os modelos de embedding em uso (Gemini
  -- text-embedding, entre outros) entregam nessa configuração. Trocar de
  -- dimensão exige nova coluna e novo índice, não um ALTER.
  embedding extensions.vector(768),

  criado_em timestamptz not null default now()
);

comment on table public.trechos_de_edital is
  'Fatias do texto do edital com embedding, para busca semântica e para citar evidência em Campo.';

create unique index trecho_unico_por_documento
  on public.trechos_de_edital (documento_id, ordem)
  where documento_id is not null;

create index trechos_por_edital on public.trechos_de_edital (edital_id, ordem);

-- HNSW e não IVFFlat, por dois motivos concretos deste projeto:
--   1. IVFFlat precisa de dados representativos no momento em que o índice é
--      criado (ele treina as listas). Aqui o índice nasce vazio e o acervo
--      cresce todo dia — as listas ficariam calibradas para um corpus que não
--      existe mais em um mês, e a única correção é REINDEX periódico.
--   2. A recall do HNSW é melhor para o mesmo tempo de consulta, e a busca
--      alimenta análise que vira recomendação de gastar dinheiro.
-- O preço é build mais lento e mais memória. Aceitável: escrita é de worker em
-- lote, leitura é do cliente esperando na tela.
-- Cosseno porque os embeddings vêm normalizados; se um modelo futuro não vier,
-- este índice precisa de outro opclass, não de outro parâmetro.
create index trechos_por_similaridade
  on public.trechos_de_edital
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- Público não é sinônimo de aberto: o dado é o mesmo para todos os tenants, mas
-- continua atrás de autenticação, e escrita é só do coletor (`service_role`,
-- que não passa por RLS).
alter table public.editais enable row level security;
alter table public.mudancas_no_edital enable row level security;
alter table public.documentos_do_edital enable row level security;
alter table public.analises_de_edital enable row level security;
alter table public.trechos_de_edital enable row level security;

revoke all on table public.editais from anon;
revoke all on table public.mudancas_no_edital from anon;
revoke insert, update, delete on table public.mudancas_no_edital from authenticated;
grant select on table public.mudancas_no_edital to authenticated;
revoke all on table public.documentos_do_edital from anon;
revoke all on table public.analises_de_edital from anon;
revoke all on table public.trechos_de_edital from anon;
revoke insert, update, delete on table public.editais from authenticated;
revoke insert, update, delete on table public.documentos_do_edital from authenticated;
revoke insert, update, delete on table public.analises_de_edital from authenticated;
revoke insert, update, delete on table public.trechos_de_edital from authenticated;
grant select on table public.editais to authenticated;
grant select on table public.documentos_do_edital to authenticated;
grant select on table public.analises_de_edital to authenticated;
grant select on table public.trechos_de_edital to authenticated;

create policy "autenticados leem editais"
  on public.editais for select to authenticated using (true);
create policy "autenticados leem mudancas do edital"
  on public.mudancas_no_edital for select to authenticated using (true);
create policy "autenticados leem anexos do edital"
  on public.documentos_do_edital for select to authenticated using (true);
create policy "autenticados leem analises"
  on public.analises_de_edital for select to authenticated using (true);
-- Trechos são insumo de busca, não conteúdo de tela; ficam legíveis para não
-- obrigar o servidor a usar service_role numa consulta de leitura, mas nenhuma
-- policy de escrita existe para nenhum papel.
create policy "autenticados leem trechos"
  on public.trechos_de_edital for select to authenticated using (true);
