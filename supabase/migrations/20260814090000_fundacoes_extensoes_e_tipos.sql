-- Fundações: extensões, vocabulário do domínio e utilitários compartilhados.
--
-- Esta migração não cria tabela nenhuma, de propósito. Ela existe para que as
-- migrações seguintes possam ser lidas como o modelo de dados em si, sem
-- repetir vocabulário nem redefinir a mesma trigger em nove arquivos.
--
-- Os enums abaixo são cópia literal das uniões declaradas em
-- `src/lib/dominio/tipos.ts` e `src/lib/pncp/tipos.ts`. A duplicação é
-- consciente e não tem alternativa: o TypeScript não chega ao Postgres, e um
-- valor aceito pelo tipo e recusado pelo banco (ou o contrário) só apareceria
-- em produção, na hora de gravar. Ao mexer em uma união lá, mexa no enum aqui
-- na mesma mudança.

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------

-- `vector` fica em `extensions` porque extensão em `public` polui o schema que
-- o PostgREST expõe e o próprio advisor do Supabase reclama. Em troca, todo uso
-- do tipo é qualificado (`extensions.vector`) — ver README se o projeto já
-- tiver a extensão instalada em outro schema.
create extension if not exists vector with schema extensions;

-- Não instalamos `pgcrypto`: `gen_random_uuid()` é nativo do Postgres desde a
-- 13 e o Supabase roda versões acima disso. Uma extensão a menos para manter.

-- ---------------------------------------------------------------------------
-- Vocabulário do domínio
-- ---------------------------------------------------------------------------

-- Enum em vez de `text` + CHECK porque o erro chega no INSERT com o nome do
-- tipo e a lista de valores aceitos, o que encurta a depuração. O preço é que
-- renomear valor é caro; acrescentar não é (`alter type ... add value`).

create type public.papel_na_empresa as enum (
  'dono',           -- responde pelo contrato e pela cobrança; não pode ser removido pelos demais
  'administrador',  -- gerencia perfil, documentos e membros
  'operador'        -- opera oportunidades; não vê nem mexe em assinatura
);

create type public.porte_da_empresa as enum ('mei', 'me', 'epp', 'media', 'grande');

create type public.esfera_do_orgao as enum (
  'federal',
  'estadual',
  'municipal',
  'distrital',
  -- A fonte devolve `esferaId` nulo com frequência. `desconhecida` é valor de
  -- primeira classe, e não `null`, pela mesma razão de `procedencia.ts`: a
  -- ausência tem de ser legível, não silenciosa.
  'desconhecida'
);

-- Espelha TIPOS_DE_DOCUMENTO. É esta lista fechada que permite casar exigência
-- do edital com documento da empresa sem comparar texto livre.
create type public.tipo_de_documento as enum (
  'certidao_federal',
  'certidao_estadual',
  'certidao_municipal',
  'fgts',
  'trabalhista_cndt',
  'falencia_concordata',
  'contrato_social',
  'balanco_patrimonial',
  'sicaf',
  'atestado_capacidade_tecnica',
  'registro_profissional_crea_cau',
  'certificacao_iso',
  'alvara_licenca',
  'declaracao_me_epp',
  'garantia_proposta',
  'amostra',
  'visita_tecnica',
  'outro'
);

-- Quanto do edital foi efetivamente lido. `lista` = só os metadados da coleta.
create type public.profundidade_da_analise as enum (
  'lista',
  'documento_parcial',
  'documento_completo'
);

-- Espelha SituacaoDaOportunidade.
create type public.situacao_da_oportunidade as enum (
  'nova',
  'vista',
  'salva',
  'descartada',
  'em_preparacao',
  'participada',
  'vencida',
  'perdida'
);

-- Espelham `FaixaDoScore` (`src/lib/dominio/score.ts`) e `NivelDaRecomendacao`
-- (`src/lib/dominio/recomendacao.ts`).
--
-- `indeterminada` e `informacao_insuficiente` não são detalhe de completude: são
-- o estado que o produto inteiro existe para representar. Um enum com apenas
-- alta/media/baixa obrigaria a gravar uma faixa inventada no caso em que não há
-- base para pontuar — exatamente o que o motor de score se recusa a fazer. Banco
-- que não sabe dizer "não sei" força a aplicação a mentir.
create type public.faixa_de_aderencia as enum (
  'excelente',
  'boa',
  'moderada',
  'baixa',
  'indeterminada'
);

-- O tipo se chama `nivel_de_recomendacao`, e não `recomendacao`, para não
-- colidir com o nome da coluna que o usa: `recomendacao public.recomendacao`
-- compila e fica ilegível em toda mensagem de erro do Postgres.
create type public.nivel_de_recomendacao as enum (
  'recomendada_forte',
  'recomendada',
  'avaliar',
  'provavelmente_nao',
  'nao_recomendada',
  'informacao_insuficiente'
);

create type public.status_da_extracao as enum (
  'pendente',    -- conhecemos a URL, ainda não baixamos
  'baixado',     -- arquivo no Storage, texto não extraído
  'extraido',    -- texto disponível para trechos e embeddings
  'falhou',      -- tentamos e não deu; `erro_da_extracao` diz o quê
  'ignorado'     -- formato que não vale a pena processar (vídeo, planilha de anexo)
);

create type public.status_da_assinatura as enum (
  'teste',
  'ativa',
  'inadimplente',
  'cancelada',   -- cancelada pelo cliente, ainda vigente até o fim do período
  'encerrada'    -- sem acesso
);

create type public.status_do_trabalho as enum (
  'pendente',
  'reservado',
  'concluido',
  'falhou',
  'cancelado'
);

create type public.tipo_de_trabalho as enum (
  'coletar_editais',
  'baixar_documento',
  'extrair_texto',
  'gerar_embeddings',
  'analisar_edital',
  'triar_empresa',
  'enviar_resumo_diario'
);

create type public.finalidade_da_ia as enum (
  'extracao',
  'analise_de_edital',
  'embedding',
  'triagem',
  'redacao'
);

create type public.recurso_limitado as enum (
  'editais_recomendados',
  'analises_profundas',
  'usuarios',
  'tokens_de_ia'
);

create type public.tipo_de_evento as enum (
  'entrou',
  'saiu',
  'leu',
  'criou',
  'atualizou',
  'removeu',
  'exportou',
  'recomendou',
  'ocultou'
);

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

-- Nomes de coluna de tempo: `criado_em` / `atualizado_em`, no masculino, em
-- todas as tabelas — concordando com "registro", não com o nome da tabela.
-- Alternar `criada_em`/`criado_em` conforme o gênero do substantivo deixaria
-- cada consulta dependendo de lembrar qual tabela é qual.
create or replace function public.marcar_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

comment on function public.marcar_atualizacao() is
  'Trigger BEFORE UPDATE: mantém atualizado_em sem depender de a aplicação lembrar.';

-- Procedência dentro de jsonb.
--
-- `AnaliseDoEdital` guarda `Campo<T>` — valor mais origem — e a regra do
-- produto é que nada circula sem procedência (ver `src/lib/dominio/procedencia.ts`).
-- Sem esta checagem, um bug de serialização gravaria `{"valor": "..."}` puro, e
-- a interface mostraria inferência com cara de fato. O CHECK é a única camada
-- que pega isso independentemente de qual worker escreveu.
--
-- O `coalesce` importa: `p->>'origem'` em jsonb sem a chave devolve NULL, e
-- CHECK com resultado NULL PASSA. Sem ele a restrição não restringiria nada.
create or replace function public.eh_campo_com_procedencia(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p ->> 'origem', '') in ('edital', 'perfil', 'inferencia', 'desconhecido');
$$;

-- CHECK não aceita subconsulta, mas aceita função que contenha uma. O truque é
-- seguro exatamente aqui porque estas funções só leem o próprio argumento: não
-- há outra linha, outra tabela nem concorrência para tornar o resultado
-- instável. Não use o mesmo atalho para regra que consulte outra tabela.
create or replace function public.eh_lista_de_campos(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'array'
     and not exists (
       select 1
         from jsonb_array_elements(p) as elemento
        where not public.eh_campo_com_procedencia(elemento)
     );
$$;

-- Espelha `ExigenciaDoEdital`. `tipo` não é conferido contra o enum aqui porque
-- `enum_range` não é imutável e não pode entrar em CHECK; a conversão para
-- `public.tipo_de_documento` acontece na aplicação, onde o erro é tratável.
create or replace function public.eh_lista_de_exigencias(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'array'
     and not exists (
       select 1
         from jsonb_array_elements(p) as exigencia
        where coalesce(exigencia ->> 'tipo', '') = ''
           or coalesce(exigencia ->> 'fase', '') not in ('habilitacao', 'proposta', 'execucao')
           or not public.eh_campo_com_procedencia(exigencia -> 'descricao')
           or not public.eh_campo_com_procedencia(exigencia -> 'obrigatoria')
     );
$$;

revoke execute on function public.eh_campo_com_procedencia(jsonb) from public;
revoke execute on function public.eh_lista_de_campos(jsonb) from public;
revoke execute on function public.eh_lista_de_exigencias(jsonb) from public;
grant execute on function public.eh_campo_com_procedencia(jsonb) to authenticated, service_role;
grant execute on function public.eh_lista_de_campos(jsonb) to authenticated, service_role;
grant execute on function public.eh_lista_de_exigencias(jsonb) to authenticated, service_role;
