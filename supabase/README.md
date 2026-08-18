# Banco de dados

Schema do Licitante Vencedor como SaaS multi-tenant. Postgres no Supabase, com
RLS negando por padrão em todas as tabelas.

## Estado real, em 17/08/2026

Este parágrafo dizia **"nada aqui foi aplicado em banco nenhum"**. Estava errado
desde 14/08, e o preço de deixar um texto desses envelhecer apareceu no mesmo
dia em que ele foi corrigido: `src/lib/dados/index.ts` carregava o mesmo aviso
(*"ainda não há projeto Postgres provisionado"*), e por causa dele o produto
gravava o cadastro do cliente num `Map` que morria com a requisição. Ver o
cabeçalho de `20260817120000_salvar_perfil_da_empresa.sql`.

O projeto **existe e está em produção**: `Licitante Vencedor`, região
`sa-east-1`, Postgres 17. Todas as migrações desta pasta estão aplicadas, e há
dado real dentro — editais coletados diariamente, um tenant, um usuário.

### O histórico do banco não usa as versões desta pasta

Descoberto ao conferir `supabase_migrations.schema_migrations` contra os nomes
de arquivo. As migrações foram aplicadas pelo painel/API, que carimba o próprio
horário, então **nenhuma** versão do banco bate com o prefixo do arquivo
correspondente:

| Arquivo | Versão no banco |
| --- | --- |
| `20260814090000_fundacoes_extensoes_e_tipos` | `20260814125600` |
| `20260814110000_leads_do_site` | `20260814120313` |
| `20260817120000_salvar_perfil_da_empresa` | `20260817215530` |
| `20260818200000_execucoes_de_coleta` | `20260818195119` |

**Consequência prática: `npm run db:aplicar` (`supabase db push`) hoje é uma
armadilha.** Ele compara versões, concluiria que nenhuma migração desta pasta
foi aplicada, e tentaria rodar todas de novo — falhando no primeiro
`create table` de tabela que já existe, depois de ter possivelmente executado o
que vinha antes.

Antes do primeiro `push`, reconcilie o histórico com a mesma ferramenta que o
item 4 abaixo já indica, uma vez por migração:

```bash
supabase migration repair --status applied <versão-do-arquivo>
```

A ordem de aplicação também divergiu: no banco, `leads_do_site` entrou ANTES de
`fundacoes_extensoes_e_tipos`; nesta pasta ela vem depois. Sem efeito aqui,
porque `leads_do_site` não depende de nada das outras — mas é o motivo de o
`supabase db reset` local continuar sendo o único teste honesto da ordem
declarada.

Há ainda uma migração no banco sem arquivo aqui:
`20260814131615_fechar_execute_das_funcoes_de_trigger_authenticated`. Ela **não
é uma diferença de efeito** — conferido statement por statement. O banco recebeu
o revoke em dois passos (`from public`, depois `from anon, authenticated`) e o
arquivo `20260814120000` desta pasta faz os dois numa linha só. Aplicada do
zero, esta pasta chega ao mesmo estado, e o banco confirma: as quatro funções de
trigger estão com `anon = false` e `authenticated = false`. Ao reparar o
histórico essa versão sobra, e pode ficar.

---

## Como aplicar

```bash
# 1. Instalar a CLI (uma vez)
npm i -g supabase        # ou: brew install supabase/tap/supabase

# 2. Testar localmente ANTES de tocar em qualquer projeto remoto.
#    Sobe Postgres + Storage + Auth em Docker e aplica todas as migrações.
supabase start
supabase db reset        # recria do zero e reaplica a pasta inteira

# 3. Só depois, contra o projeto remoto
supabase link --project-ref <ref-do-projeto>
supabase db push         # equivale a `npm run db:aplicar`
supabase migration list  # equivale a `npm run db:status`
```

`supabase db reset` é o teste real destas migrações: ele aplica tudo em um banco
limpo e falha ruidosamente em qualquer erro de sintaxe ou de ordem. Rode antes de
qualquer `push`.

Para uma migração nova: `npm run db:novo <nome_descritivo>` — nunca edite um
arquivo já aplicado, mesmo que o erro esteja nele. O histórico é o contrato.

### O que exige decisão humana antes do primeiro `push`

1. **Versão do Postgres.** `config.toml` assume `major_version = 17`. Se o
   projeto for criado em outra versão, ajuste antes do primeiro comando — o
   shadow database usa esse número.
2. **Onde mora a extensão `vector`.** As migrações instalam em `extensions` e
   referenciam `extensions.vector(768)`. Em um projeto que já tenha a extensão
   em `public`, o `create extension if not exists` vira no-op e as referências
   quebram. Nesse caso: `alter extension vector set schema extensions;`.
3. **Dimensão do embedding.** Está fixada em 768 (`trechos_de_edital.embedding`).
   Trocar de modelo para um de outra dimensão exige nova coluna e novo índice,
   não um `alter`. Confirme a dimensão do modelo escolhido antes de gerar
   embedding em escala.
4. **A migração de Storage (`20260814103000`).** É a única que escreve fora de
   `public`. Se o papel que aplica não puder criar policy em `storage.objects`,
   só ela falha; nesse caso crie o bucket e as quatro policies pelo painel,
   copiando os predicados do arquivo, e marque a migração como aplicada com
   `supabase migration repair --status applied 20260814103000`.
5. **Preços e limites.** `planos` nasce vazia de propósito — não há preço em
   constraint, default ou seed. O primeiro plano é um `insert` que alguém
   precisa decidir.

---

## O que cada migração faz

| Arquivo | O que cria |
| --- | --- |
| `20260814090000_fundacoes_extensoes_e_tipos.sql` | Extensão `vector`; todos os enums do domínio; `marcar_atualizacao()`; as funções que validam procedência dentro de jsonb. Nenhuma tabela. |
| `20260814091000_empresas_e_membros.sql` | `empresas`, `membros_da_empresa` e as funções de autorização (`empresas_do_usuario`, `usuario_pertence_a`, `usuario_tem_papel`) que todas as policies do banco usam. |
| `20260814092000_perfil_documentos_e_atestados.sql` | `perfis_da_empresa`, `documentos_da_empresa`, `atestados`. |
| `20260814093000_editais_e_analises.sql` | `editais`, `mudancas_no_edital`, `documentos_do_edital`, `analises_de_edital`, `trechos_de_edital` (+ índice HNSW). Dado público, sem `empresa_id`. |
| `20260814094000_oportunidades_acoes_e_triagem.sql` | `oportunidades`, `acoes_na_oportunidade`, `decisoes_de_triagem` e as triggers que mantêm `situacao` e `encerra_em` coerentes. |
| `20260814095000_planos_assinaturas_e_limites.sql` | `planos`, `assinaturas`, `limites_de_uso`. |
| `20260814100000_execucoes_de_ia.sql` | `execucoes_de_ia` — custo variável medido por chamada. |
| `20260814101000_fila_de_trabalhos.sql` | `fila_de_trabalhos` e o contrato de consumo: `reservar_trabalhos`, `concluir_trabalho`, `falhar_trabalho`, `enfileirar_trabalho`. |
| `20260814102000_eventos_de_auditoria.sql` | `eventos_de_auditoria`, append-only. |
| `20260814103000_storage_documentos_da_empresa.sql` | Bucket privado `documentos-da-empresa` e policies de Storage por pasta. |
| `20260814104000_endurecer_privilegios.sql` | Revoga `TRUNCATE` (que **não** passa por RLS), `TRIGGER` e `REFERENCES` de `anon` e `authenticated`, inclusive para tabelas futuras. **Não** cobre funções criadas depois — ver abaixo. |
| `20260814110000_leads_do_site.sql` | `leads_do_site`, a captura de contato das páginas públicas. |
| `20260814120000_fechar_execute_das_funcoes_de_trigger.sql` | Tira de `PUBLIC`, `anon` e `authenticated` o EXECUTE das quatro funções de trigger. |
| `20260814130000_envios_de_alerta.sql` | `envios_de_alerta` — o registro do que já foi avisado, para não avisar duas vezes. |
| `20260814170000_criar_empresa_com_dono.sql` | `criar_empresa_com_dono()`: único caminho para o primeiro membro de um tenant. `security definer`, com a checagem de sessão fazendo as vezes de porta. |
| `20260817120000_salvar_perfil_da_empresa.sql` | `salvar_perfil_da_empresa()`: identidade, critérios, documentos e atestados numa transação só. `security invoker`, para a RLS continuar decidindo. Mais a auxiliar `texto_do_json()`. |
| `20260817230000_fechar_execute_de_texto_do_json.sql` | Tira `texto_do_json()` de `anon`. Ela nasceu exposta pelo mecanismo descrito abaixo. |
| `20260818200000_execucoes_de_coleta.sql` | `execucoes_de_coleta` — o veredito completa/parcial-aceitável/degradada de cada rodada de coleta, para `painelDoDia.coletaCompleta` deixar de ser sempre `true`. |

### A armadilha das funções novas, que já pegou duas vezes

`20260814104000` faz `revoke all on all functions in schema public from anon`.
Isso vale para o que existia naquele instante e **nada** para o futuro: toda
função criada depois nasce outra vez alcançável, por dois caminhos
independentes — o EXECUTE que o Postgres concede ao pseudo-papel `PUBLIC` (do
qual `anon` herda) e o que o Supabase concede nominalmente a `anon` e
`authenticated` por default privileges.

Pegou as quatro funções de trigger em 14/08, e pegou `texto_do_json` em 17/08 —
a função principal do mesmo arquivo trouxe o próprio revoke, a auxiliar não.

Agora existe guarda: `src/lib/funcoes-nao-nascem-publicas.test.ts` falha se
qualquer função criada depois de `20260814104000` não revogar EXECUTE de
`public` e de `anon`. Ela roda em `npm run verificar`, antes de a migração
chegar a banco nenhum.

### O que já foi verificado

As onze migrações foram aplicadas em um Postgres 16 limpo, na ordem, e sobre ele
foram exercitados: as triggers (`encerra_em`, `situacao`, `atualizado_em`), 14
tentativas de gravar dado inválido — todas barradas pela restrição certa —,
isolamento entre dois tenants e entre papéis (operador não vê assinatura nem
auditoria), tentativas de escrita cruzada (todas negadas por privilégio ou por
policy), o ciclo completo da fila (idempotência, reserva com dois workers,
backoff, esgotamento de tentativas, recuperação de reserva expirada) e as
policies de Storage.

Duas coisas **não** foram exercitadas porque a `pgvector` não existia naquele
Postgres: `extensions.vector(768)` e o índice HNSW. São as duas linhas a
observar no primeiro `supabase db reset`.

Em 17/08, `salvar_perfil_da_empresa` foi exercitada contra o **projeto de
produção**, como o usuário real (`request.jwt.claims` + `set local role
authenticated`, portanto com RLS valendo), dentro de transações revertidas por
exceção — o cadastro do dono não podia terminar com dado de teste dentro:

- grava os sete arrays, dois documentos com validade e `arquivo_anexado`
  derivado, um atestado, e normaliza o CNPJ para dígitos;
- gravar duas vezes não duplica, e o tipo de documento que sai do formulário sai
  do banco;
- não-membro recebe `empresa não encontrada`; sem sessão, `sem sessão`.

Depois do revoke de `texto_do_json`, a gravação foi refeita para provar que o
fechamento não atingiu quem precisa chamar. Estado atual: **0 de 17** funções de
`public` alcançáveis por `anon`.

---

## O modelo em uma passada

```
empresas ──< membros_da_empresa >── auth.users
   │
   ├── perfis_da_empresa (1:1)
   ├── documentos_da_empresa ──< atestados
   ├── assinaturas >── planos
   ├── limites_de_uso
   └── oportunidades ──< acoes_na_oportunidade
         │
         └─ decisoes_de_triagem (por que apareceu / por que não)

editais (público, sem tenant)
   ├── documentos_do_edital ──< trechos_de_edital (embedding)
   └── analises_de_edital  ──> referenciada por oportunidades

fila_de_trabalhos · execucoes_de_ia · eventos_de_auditoria  (operação)
```

A linha que divide o schema é `empresa_id`. Quem tem, é do cliente e é privado.
Quem não tem (`editais`, `documentos_do_edital`, `analises_de_edital`,
`trechos_de_edital`, `planos`) é compartilhado — e é isso que faz o custo de IA
por edital ser fixo em vez de multiplicado pelo número de assinantes.

---

## Como usar (padrões que o resto do código deve seguir)

**Ler dados do cliente:** use a chave `anon` com a sessão do usuário. A RLS
resolve o isolamento; não escreva `where empresa_id = ...` achando que é isso que
protege — é a policy, e o `where` é só filtro.

**Escrever edital, análise, oportunidade, triagem, auditoria e fila:** só com
`service_role`, no servidor. Nenhuma dessas tabelas tem policy de escrita para
`authenticated`, e isso é intencional.

**Consumir a fila:**

```sql
-- worker
select * from reservar_trabalhos('worker-1', array['analisar_edital']::tipo_de_trabalho[], 5);
-- ao terminar cada uma
select concluir_trabalho(123);
-- ao falhar (backoff exponencial automático; vira 'falhou' no limite de tentativas)
select falhar_trabalho(123, 'timeout do modelo');
```

`reservar_trabalhos` é segura com N workers em paralelo (`FOR UPDATE SKIP
LOCKED`), recupera sozinha reservas expiradas e conta a tentativa no momento da
reserva — worker que morre no meio não trava o trabalho para sempre.

**Enfileirar:** `select enfileirar_trabalho('coletar_editais', '{"uf":"CE"}'::jsonb, 'pncp:CE:2026-08-14')`.
Devolve `null` quando já havia um trabalho vivo com a mesma chave, o que para
quem chama é sucesso.

**Busca semântica:** `order by embedding <=> $1 limit k`, com o mesmo modelo de
embedding que gerou os vetores (`modelo_do_embedding` está gravado justamente
para tornar essa conferência possível).

---

## Decisões que tomei sozinho

1. **`empresas_do_usuario()` no plural, além de `usuario_pertence_a()`.** O
   modelo é N:N desde o início; uma função singular teria de escolher uma
   empresa arbitrária, e o erro só apareceria no primeiro cliente com dois CNPJs.
2. **Identidade da empresa fora do perfil.** `PerfilDaEmpresa` (TypeScript) traz
   CNPJ e razão social; no banco eles ficam só em `empresas`, e o perfil guarda
   apenas critérios. O tipo continua válido — é montado por JOIN na leitura.
3. **`criado_em` / `atualizado_em`, em português e no masculino**, em vez de
   `created_at`/`updated_at`. O código todo é em português; alternar o gênero por
   tabela faria cada consulta depender de lembrar qual é qual.
4. **Criar e apagar empresa é operação de `service_role`.** Não há policy de
   INSERT em `empresas` para usuário autenticado: onboarding envolve cobrança e
   setup. Consequência prática: o primeiro `dono` de cada empresa é inserido pelo
   servidor, não pelo cliente.
5. **Papéis com recortes concretos.** Operador mantém perfil e documentos e age
   nas oportunidades; não vê assinatura, consumo de IA nem trilha de auditoria, e
   não apaga documento. Só o dono cria outro dono.
6. **`acoes_na_oportunidade` e `eventos_de_auditoria` são append-only.** Nenhuma
   policy de UPDATE ou DELETE, para papel nenhum. Histórico editável não é
   histórico.
7. **HNSW em vez de IVFFlat.** IVFFlat treina as listas no momento da criação do
   índice; aqui o índice nasce vazio e o acervo cresce todo dia, então as listas
   ficariam calibradas para um corpus que não existe mais em um mês. O preço
   (build mais lento, mais memória) cai na escrita, que é de worker em lote.
8. **Duplicações deliberadas, cada uma justificada no próprio arquivo:**
   `oportunidades.encerra_em` (cópia do prazo do edital, mantida por trigger nos
   dois lados, porque índice não atravessa tabela), `oportunidades.situacao`
   (última ação, mantida por trigger), `oportunidades.faixa` (derivável do score,
   mas gravada para o histórico não ser reescrito quando o corte mudar),
   `analises_de_edital.custo_em_centavos` (rollup que sobrevive à retenção de
   `execucoes_de_ia`), `limites_de_uso.limite_no_periodo` (teto vigente quando o
   mês começou), `editais.municipio_slug` (quem decide a URL é o TypeScript) e
   `acoes_na_oportunidade.empresa_id` (com FK composta, então não pode divergir).
9. **Procedência validada no banco.** Os campos `Campo<T>` de
   `analises_de_edital` têm CHECK exigindo `origem` válida, e `exigencias` tem
   CHECK de forma. É a única camada que pega um worker que grave valor sem
   procedência, independentemente de qual worker seja.
10. **`enfileirar_trabalho` trata `unique_violation` em vez de usar `ON
    CONFLICT`.** Inferir conflito sobre índice parcial exige repetir o predicado
    do índice em cada chamada, e predicado repetido diverge.
11. **Nenhuma tabela usa `force row level security`.** As funções de autorização
    são `security definer` e dependem de não passar por RLS na tabela de membros;
    forçar RLS ressuscitaria a recursão que elas existem para evitar.
12. **Revogar `TRUNCATE` de `anon` e `authenticated`** (migração final). O
    Supabase concede ALL nas tabelas novas de `public` para esses papéis, e
    TRUNCATE não passa por RLS — policy nenhuma impediria `truncate
    oportunidades`. Não é alcançável pela API hoje; a revogação é barata e a
    exposição futura não seria.

---

## Perguntas abertas (não inventei resposta)

1. ~~**`faixa_de_aderencia` e `recomendacao` não existem em `src/lib/dominio`.**~~
   **Resolvido na integração.** Os enums foram reescritos para espelhar
   `FaixaDoScore` (`src/lib/dominio/score.ts`) e `NivelDaRecomendacao`
   (`recomendacao.ts`). O contrato provisório `alta|media|baixa` não tinha como
   representar `indeterminada`, que é o estado central do produto: um banco
   incapaz de dizer "não sei" força a aplicação a mentir. Três correções vieram
   junto — `oportunidades.score` passou a aceitar nulo, com
   `faixa_indeterminada_sem_score` amarrando os dois lados; o índice de
   "melhores primeiro" ganhou `nulls last`, senão a lista abriria justamente
   pelas oportunidades sem pontuação; e a constraint `recomendado_tem_score` foi
   removida, porque proibia no banco o caso que o produto entrega de propósito
   (oportunidade sem base para avaliar é entregue, com a lista do que falta).
2. **Corte de faixa por score.** Os cortes (85 / 70 / 50) estão em
   `src/lib/dominio/score.ts` e são ponto de partida declarado, não medição —
   não há histórico de participação para calibrá-los ainda. Por isso a faixa é
   gravada e não gerada: mudar o corte não pode reescrever retroativamente o que
   já foi mostrado ao cliente.
3. **`editais` é legível só para autenticados.** As páginas públicas de SEO hoje
   são geradas no build (script de ingestão, `service_role`), então isso basta. Se
   uma página pública passar a consultar o banco em tempo de requisição, será
   preciso decidir: policy de leitura para `anon` no acervo, ou uma view com o
   subconjunto publicável. Não decidi por conta.
4. **Retenção.** `execucoes_de_ia`, `eventos_de_auditoria` e
   `fila_de_trabalhos` crescem para sempre e não têm política de expurgo. Quanto
   tempo guardar cada uma é decisão jurídica (LGPD) e de custo, não técnica.
5. **Ciclo de cobrança.** `limites_de_uso.competencia` assume mês de calendário
   (CHECK exige dia 1). Se a cobrança for por data de assinatura, a coluna muda
   para um par início/fim — melhor decidir antes do primeiro cliente.
6. **Gateway de pagamento.** `assinaturas.referencia_externa` é texto único e
   serve para Stripe ou Asaas. Se forem os dois, falta uma coluna de origem.
7. **"Pelo menos um dono por empresa"** não é garantido por constraint —
   `check` não enxerga outras linhas e trigger para isso tem armadilha de
   concorrência. Hoje depende da aplicação. Vale trigger `constraint deferrable`?
   É uma decisão de risco (bloqueio de escrita) que não tomei sozinho.
8. **Multi-fonte de verdade em `editais.fonte`.** Está como texto validado por
   regex. Se a lista de portais virar cadastro (com URL base, periodicidade,
   parser), vira tabela `fontes` e `editais.fonte_id`. Não fiz agora porque só
   existe uma fonte e a tabela seria adivinhação.
9. **Modalidades em texto livre.** `perfis_da_empresa.modalidades_aceitas` e
   `editais.modalidade` são texto porque cada portal escreve o seu. Casar os dois
   depende de uma tabela de equivalência que ainda não existe.
