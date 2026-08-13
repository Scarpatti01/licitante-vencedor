-- O lado do cruzamento que o cliente controla: perfil, documentos, atestados.
--
-- `PerfilDaEmpresa` (TypeScript) é maior que `perfis_da_empresa` (banco) de
-- propósito. Lá ele traz `cnpj`, `razaoSocial`, `documentos` e `atestados`
-- juntos, porque é o formato que a tela consome. Aqui, identidade mora em
-- `empresas` e as listas moram nas suas tabelas: guardar CNPJ nos dois lugares
-- criaria duas respostas para "qual é o CNPJ deste cliente", e a errada seria
-- descoberta na hora de emitir nota. O perfil é montado por JOIN na leitura.

create table public.perfis_da_empresa (
  -- PK é a própria FK: um perfil por empresa, garantido pela chave e não por
  -- convenção. Versionar perfil (para reproduzir "por que este edital apareceu
  -- em março") é assunto de `decisoes_de_triagem`, que congela os critérios
  -- usados em cada avaliação — não de guardar N perfis aqui.
  empresa_id uuid primary key references public.empresas (id) on delete cascade,

  porte public.porte_da_empresa not null,
  -- Em reais. `null` = a empresa não quis informar, e isso não é zero.
  faturamento_anual numeric(18, 2) check (faturamento_anual >= 0),

  -- Arrays em vez de tabelas-filhas: são listas curtas, sempre lidas inteiras
  -- junto com o perfil e nunca consultadas isoladamente. Cinco tabelas de
  -- ligação aqui só produziriam JOINs para reconstruir o que o cliente digitou
  -- numa única tela.
  cnaes text[] not null default '{}' check (array_position(cnaes, null::text) is null),
  palavras_chave text[] not null default '{}' check (array_position(palavras_chave, null::text) is null),
  palavras_excluidas text[] not null default '{}' check (array_position(palavras_excluidas, null::text) is null),

  -- Vazio significa "sem restrição declarada", conforme `PerfilDaEmpresa`.
  -- A lista fechada de UFs cabe num CHECK porque é constante desde 1988;
  -- formato de CNAE e código IBGE não cabem (precisariam de subconsulta) e
  -- ficam com o Zod na borda.
  ufs_atendidas text[] not null default '{}'
    check (ufs_atendidas <@ array[
      'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
      'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
    ]::text[]),
  municipios_prioritarios text[] not null default '{}'
    check (array_position(municipios_prioritarios, null::text) is null),

  ticket_minimo numeric(18, 2) check (ticket_minimo >= 0),
  ticket_maximo numeric(18, 2) check (ticket_maximo >= 0),
  -- Faixa invertida não é preferência exótica, é erro de digitação — e produz
  -- um perfil que nunca casa com nada, o pior sintoma possível (silêncio).
  constraint faixa_de_ticket_coerente
    check (ticket_minimo is null or ticket_maximo is null or ticket_maximo >= ticket_minimo),

  -- Vazio = todas, conforme o tipo. Texto livre porque a modalidade vem com o
  -- nome que a fonte usa e cada portal escreve o seu.
  modalidades_aceitas text[] not null default '{}'
    check (array_position(modalidades_aceitas, null::text) is null),

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis_da_empresa is
  'Critérios que o cliente declara. A qualidade dele determina a qualidade da triagem inteira.';

create trigger perfis_da_empresa_marcar_atualizacao
  before update on public.perfis_da_empresa
  for each row execute function public.marcar_atualizacao();

-- A triagem varre perfis procurando quem aceita a UF de um edital recém-coletado.
create index perfis_da_empresa_por_uf on public.perfis_da_empresa using gin (ufs_atendidas);
create index perfis_da_empresa_por_cnae on public.perfis_da_empresa using gin (cnaes);

create table public.documentos_da_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo public.tipo_de_documento not null,
  descricao text,

  -- Deliberadamente SEM unique (empresa_id, tipo): `montarChecklist` já trata o
  -- caso de dois documentos do mesmo tipo (duas certidões estaduais) escolhendo
  -- o de validade mais longa. Uma UNIQUE aqui obrigaria a empresa a apagar a
  -- certidão de um estado para cadastrar a do outro.

  valido_ate date,
  sem_validade boolean not null default false,
  -- "Sem validade" e "válido até tal dia" são afirmações incompatíveis, e a
  -- combinação faria `statusDoDocumento` responder `disponivel` para papel
  -- vencido — o erro exato que o checklist existe para evitar.
  constraint validade_coerente check (not (sem_validade and valido_ate is not null)),

  caminho_no_storage text unique,
  tamanho_em_bytes bigint check (tamanho_em_bytes > 0),
  hash_sha256 text check (hash_sha256 ~ '^[0-9a-f]{64}$'),

  -- Coluna gerada, não booleano solto: em `DocumentoDaEmpresa`, `arquivoAnexado`
  -- é `true` só quando existe arquivo mesmo ("declaração não é anexo"). Deixar
  -- a aplicação manter esse booleano é confiar que nenhum caminho de código vai
  -- esquecer; derivar do caminho no Storage torna a mentira impossível.
  arquivo_anexado boolean generated always as (caminho_no_storage is not null) stored,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger documentos_da_empresa_marcar_atualizacao
  before update on public.documentos_da_empresa
  for each row execute function public.marcar_atualizacao();

-- O checklist lê os documentos de uma empresa agrupando por tipo; e a rotina de
-- avisos procura o que vence nos próximos 30 dias.
create index documentos_da_empresa_por_tipo on public.documentos_da_empresa (empresa_id, tipo);
create index documentos_da_empresa_por_validade
  on public.documentos_da_empresa (valido_ate)
  where valido_ate is not null;

create table public.atestados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  objeto text not null check (length(btrim(objeto)) > 0),
  valor numeric(18, 2) check (valor >= 0),
  orgao text,
  -- Limite alto de propósito: ano fora da faixa é digitação, e recusar 2031
  -- porque estamos em 2026 quebraria o cadastro sozinho com o tempo.
  ano smallint check (ano between 1900 and 2200),
  -- SET NULL: apagar o PDF do atestado não apaga a experiência comprovada, que
  -- continua valendo para casar com exigência de capacidade técnica.
  documento_id uuid references public.documentos_da_empresa (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.atestados is
  'Experiência comprovável. Cruza com exigência de atestado_capacidade_tecnica e limita o ticket que a empresa consegue defender.';

create trigger atestados_marcar_atualizacao
  before update on public.atestados
  for each row execute function public.marcar_atualizacao();

create index atestados_por_empresa on public.atestados (empresa_id, valor desc nulls last);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.perfis_da_empresa enable row level security;
alter table public.documentos_da_empresa enable row level security;
alter table public.atestados enable row level security;

revoke all on table public.perfis_da_empresa from anon;
revoke all on table public.documentos_da_empresa from anon;
revoke all on table public.atestados from anon;
grant select, insert, update, delete on table public.perfis_da_empresa to authenticated;
grant select, insert, update, delete on table public.documentos_da_empresa to authenticated;
grant select, insert, update, delete on table public.atestados to authenticated;

-- Operador mexe em perfil e documentos: é o trabalho dele, e travar isso faria
-- o cliente parar de manter o cadastro — que é o insumo da triagem.
-- Apagar continua sendo de dono/administrador, porque documento apagado por
-- engano só reaparece se a empresa tiver o arquivo original.

create policy "membros leem o perfil"
  on public.perfis_da_empresa for select to authenticated
  using (public.usuario_pertence_a(empresa_id));
create policy "membros criam o perfil"
  on public.perfis_da_empresa for insert to authenticated
  with check (public.usuario_pertence_a(empresa_id));
create policy "membros editam o perfil"
  on public.perfis_da_empresa for update to authenticated
  using (public.usuario_pertence_a(empresa_id))
  with check (public.usuario_pertence_a(empresa_id));
create policy "administracao apaga o perfil"
  on public.perfis_da_empresa for delete to authenticated
  using (public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[]));

create policy "membros leem os documentos"
  on public.documentos_da_empresa for select to authenticated
  using (public.usuario_pertence_a(empresa_id));
create policy "membros cadastram documento"
  on public.documentos_da_empresa for insert to authenticated
  with check (public.usuario_pertence_a(empresa_id));
create policy "membros editam documento"
  on public.documentos_da_empresa for update to authenticated
  using (public.usuario_pertence_a(empresa_id))
  with check (public.usuario_pertence_a(empresa_id));
create policy "administracao apaga documento"
  on public.documentos_da_empresa for delete to authenticated
  using (public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[]));

create policy "membros leem atestados"
  on public.atestados for select to authenticated
  using (public.usuario_pertence_a(empresa_id));
create policy "membros cadastram atestado"
  on public.atestados for insert to authenticated
  with check (public.usuario_pertence_a(empresa_id));
create policy "membros editam atestado"
  on public.atestados for update to authenticated
  using (public.usuario_pertence_a(empresa_id))
  with check (public.usuario_pertence_a(empresa_id));
create policy "administracao apaga atestado"
  on public.atestados for delete to authenticated
  using (public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[]));
