# Roadmap e estado real

Este documento tem uma regra: ele descreve o que **existe**, não o que está
planejado parecer que existe. Um item só sai de "em construção" quando funciona,
está integrado, tem tratamento de erro, tem estado vazio e de carregamento, foi
testado e não quebrou nada que já funcionava.

Estado em 2026-08-15.

## Fase 1 — Fundação

| Item | Estado |
| --- | --- |
| Coleta do PNCP, diária, isolada por UF | **No ar** |
| Revisão automática da coleta (6 verificações) | **No ar** |
| Cobertura parcial declarada com honestidade | **No ar** |
| Guarda contra coleta degradada sobrescrever a boa | **No ar** |
| Arquitetura desacoplada da fonte (`FonteDeEditais`) | **No ar** |
| Detecção de mudança em edital já coletado | **No ar** |
| Esquema multi-tenant com RLS, índices e pgvector | **Aplicado** — 21 tabelas no Postgres de produção, advisor limpo |
| Autenticação e vínculo usuário↔empresa | **No ar** — Supabase Auth, sessão em `empresaAtual()`, cadastro de empresa por `criar_empresa_com_dono` |
| Editais persistidos no Postgres | **No ar** — upsert por `(fonte, id_na_fonte)` em `editais/gravar.ts`, chamado pela coleta |
| Perfil da empresa (modelo + telas) | **No ar** com repositório de demonstração |

## Fase 2 — Inteligência

| Item | Estado |
| --- | --- |
| Score de aderência explicável | **No ar**, determinístico e testado |
| Checklist de documentação com 4 estados | **No ar** |
| Recomendação + próxima ação | **No ar** |
| Camada de IA trocável, com prompts versionados e custo | **No ar**, inerte sem `GEMINI_API_KEY` |
| Segmentação de edital longo antes do modelo | **No ar** |
| Extração de documento (PDF e zip) | **No ar** — `pdfjs` + `fflate`, medido contra 50 editais reais |
| Download incremental de documento | **No ar** — corta ~93% do redownload (`documentos/incremental.ts`) |
| OCR para digitalizado (1,2% dos PDFs) | **Não existe** — recusa declarada; ver `documentos-e-cadencia.md` |
| Busca semântica (pgvector) | **Esquema pronto**, sem embeddings gerados |

## Fase 3 — Produto

| Item | Estado |
| --- | --- |
| Painel do dia | **No ar** |
| Lista de oportunidades com filtros | **No ar** |
| Página do edital com score explicado e checklist | **No ar** |
| Onboarding guiado | **No ar** |
| Registro de "por que este edital não apareceu" | **No ar** (`src/lib/pipeline/triagem.ts`) |
| Triagem gravando oportunidades e decisões | **No ar** — `scripts/triar-editais.ts` roda a cada coleta, e `RepositorioSupabase` lê o resultado de verdade (ver "O próximo passo" abaixo) |
| ~~Histórico de participação e resultado~~ | **Feito, em 19/08.** `/historico/` — duas seções (em andamento, concluídas), e os botões que alimentam `oportunidades.situacao` na página do edital (`AcoesDoStatus`), sem os quais a tela nunca teria dado para mostrar |

## Aquisição — o blog

O blog é o canal de entrada orgânico. Ele não é vitrine nem diário: cada texto
existe para ser encontrado por uma busca com intenção comercial e terminar com o
leitor entendendo que há uma forma melhor de fazer aquilo.

| Item | Estado |
| --- | --- |
| 9 guias de referência (hubs) | **No ar** |
| Sistema de artigos, com validação de publicação | **No ar** |
| 4 artigos verificados no texto oficial | **No ar** — um por hub: portais, habilitação, Lei 14.133 e vender para o governo |
| Captura dentro do texto, contextual por assunto | **No ar** |
| Registro de qual conteúdo converte (`origem`) | **No ar** |
| Destino do lead (Supabase ou webhook) | **No ar**, em produção com `LEADS_DESTINO=supabase` |
| Double opt-in: confirmação e descadastro por link | **No ar**, verificado ponta a ponta em produção |
| Limite de taxa na rota de captura | **No ar** (por instância — ver o arquivo) |
| Artigos relacionados nos hubs | **No ar** |
| Envio do primeiro e-mail ao lead capturado | **No ar** — confirmação e boas-vindas, via Resend |
| Tela para ler os leads e ver o que converte | **No ar** — `/administracao/leads/`, atrás de `ADMINS_DA_PLATAFORMA` |
| Páginas regionais por município, do dado próprio | **No ar** — `/licitacoes/<uf>/<slug>/`, atrás de um portão de substância |

**A regra que governa o blog**: `validarArtigo` roda em teste e reprova artigo
sem fonte oficial, sem FAQ, curto demais ou **sem captura no corpo**. Há também
um teste que lê o código-fonte dos guias e falha se algum perder o formulário.
Conversão não é item de checklist de alguém: é condição de build.

**O que eu faria em seguida, nesta ordem**

1. **Configurar os segredos e ligar o envio.** O alerta diário está escrito,
   testado e agendado (`.github/workflows/enviar-alertas.yml`), e não manda nada
   até `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
   existirem como segredos do repositório. Rodar antes com
   `npm run alertas:simular` — ele imprime o que sairia sem enviar.
2. ~~**Uma tela para ver os leads.**~~ **Feita** — `/administracao/leads/`
   responde "quantos cadastros esta semana" e "qual conteúdo converte", que eram
   as duas consultas escritas à mão. Ela mostra número só quando tem base: sem
   credencial do banco diz o que falta ligar, com a consulta falhando diz que
   falhou, e vazia diz que ninguém se cadastrou — três telas, porque são três
   coisas diferentes. O que ela ainda não tem, de propósito: filtro por período,
   exportação e gráfico. Nenhum muda uma decisão com o volume de hoje.
3. **Mais artigos, sempre atrás de um hub.** O gargalo não é volume, é intenção:
   três textos que respondem a dúvida de quem está executando valem mais que
   trinta sobre conceito.
4. ~~**Páginas regionais por município.**~~ **Feitas**, com um portão que é a
   parte que importa. Os números que o motivaram: dos 63 municípios no agregado,
   **37 tinham exatamente um edital** e só 3 tinham cinco ou mais. Publicar os 63
   produziria 60 páginas quase vazias e quase idênticas — a versão em miniatura
   das "centenas de páginas rasas" que este item sempre recusou, e o custo cairia
   sobre o domínio inteiro, não só sobre elas.

   Uma praça vira página quando tem **≥5 contratações e ≥2 órgãos compradores**.
   Volume sozinho engana: seis editais da mesma prefeitura descrevem aquela
   prefeitura, não o município. Quando o portão foi escrito o agregado dava
   duas páginas; com a coleta de 15/08 ele dá **96**, sem ninguém decidir de
   novo — que era a propriedade que o justificava.

   As páginas descrevem o **mercado** (quanto se compra, por quais modalidades,
   quantos órgãos), nunca "editais abertos": o agregado é um retrato do instante
   da coleta e edital tem prazo, então uma lista de abertos montada de um arquivo
   de dias atrás mandaria o leitor para certames encerrados. Toda afirmação vem
   datada, e a página diz quando a UF não foi coletada por inteiro.

   **Cobertura, que era o bloqueio real, deixou de ser.** A coleta agendada de
   15/08 trouxe 5 das 6 UFs completas e nenhuma vazia, levando o agregado de 63
   para 576 municípios — e as páginas publicáveis de 2 para **96**, sozinhas,
   porque o portão é uma condição sobre o dado e não uma lista curada.

   **Correção de 21/08, contra dado real do Search Console: página publicada
   não podia mais desaparecer.** `dados/agregados.json` é retrato do instante
   — editais fecham, o número de um município cai de um dia para o outro, e
   com `dynamicParams = false` isso vira 404 permanente para quem já tinha
   encontrado a página. Foi o que aconteceu com Russas/CE e Feira Nova/PE:
   lastro de 15 a 20/08, impressão e clique real no Search Console (Feira
   Nova com 50% de CTR), e em 21/08, com o mesmo dado que sempre teve — só
   que abaixo do portão naquele dia —, 404. `dados/municipios-publicados.json`
   é o registro que corrige isso: todo município que já teve lastro um dia
   fica publicável enquanto tiver pelo menos 1 contratação medida hoje — só
   cresce, nunca remove. Ver `src/lib/pncp/registroDePublicacao.ts`.

## Fase 4 — Comunicação

| Item | Estado |
| --- | --- |
| Seleção do que merece alerta | **No ar**, testado |
| Formato da mensagem (e-mail e WhatsApp) | **No ar** |
| Alerta diário do lead: região, seleção e texto | **No ar**, testado |
| Não repetir edital já enviado (`envios_de_alerta`) | **No ar** — tabela aplicada |
| Agendamento diário do alerta | **No ar** — dias úteis, 07:10 de Brasília |
| Envio de e-mail | **Escrito, inerte** — falta `RESEND_API_KEY`. Sem ele o workflow encerra verde avisando, não falha |
| Envio de WhatsApp | **Não existe** — exige conta e aprovação de template |

## Fase 5 — Monetização

| Item | Estado |
| --- | --- |
| Planos, limites e assinatura no modelo de dados | **Aplicado** — tabelas no ar, sem catálogo cadastrado |
| Cobrança recorrente, trial, cupom, upgrade | **Não existe** |
| Success fee | **Modelado**, sem apuração |

## O próximo passo, e a armadilha dele

~~A segunda metade da triagem~~ **Feita, em 18/08.** O processo que lê editais e
perfis do banco, roda `avaliarOportunidade` e grava pelo mapeamento de
`src/lib/triagem/mapeamento.ts` existe em `scripts/triar-editais.ts`
(`npm run triagem:simular` para ver o que gravaria sem gravar).

O caminho inverso — reconstruir um `PerfilDaEmpresa` a partir de quatro
tabelas (`empresas`, `perfis_da_empresa`, `documentos_da_empresa`, `atestados`)
— está em `src/lib/triagem/repositorio.ts`, com a defesa que este documento
pedia: um teste de ida e volta campo a campo (`repositorio.test.ts`), contra um
perfil com valores DISTINTOS em cada par do mesmo tipo, para que uma troca como
`ticketMaximo` lido como `ticketMinimo` derrube o teste em vez de só pontuar
errado em produção sem ninguém perceber.

~~**Decidir a cadência.**~~ **Feita, em 18/08.** `scripts/triar-editais.ts`
roda como passo de `coletar-pncp.yml` (e de `coletar-pncp-paralelo.yml`, em
paridade), logo depois de os editais do dia estarem no Postgres — sem hora
própria, porque o script lê `editaisAbertos()` direto do banco, e "acabou de
coletar" já é a condição mais fresca possível. Roda mesmo com coleta
degradada (o upsert de `editais/gravar.ts` nunca apaga o que dias bons já
gravaram) e não bloqueia o commit do agregado (`continue-on-error`, mesma
regra da publicação de posts). O disparo manual (`triar-editais.yml`)
continua existindo, para rodar fora do horário do cron quando fizer sentido.

~~**Ligar a leitura.**~~ **Feita, em 18/08.** `RepositorioSupabase`
(`src/lib/dados/supabase.ts`) lê `oportunidades` e `decisoes_de_triagem` de
verdade para qualquer empresa que não seja a de demonstração;
`oportunidadesSimuladas` virou método por empresa. A triagem existe hoje dos
dois lados — gravar e ler.

**O que ainda falta:**

- **Cobertura de UF.** A única empresa cadastrada hoje atende só o RJ, e a
  coleta ainda cobre só as 6 UFs do piloto (Nordeste) — nenhum RJ. Até a
  coleta paralela (27 UFs) ser promovida, a triagem roda certa e não entrega
  nada para ela. Ver "Decisões em aberto" e a validação da coleta de 19/08.

~~`painelDoDia.coletaCompleta` sempre `true`.~~ **Feita, em 18/08.**
`execucoes_de_coleta` (migração `20260818200000`) guarda o veredito
completa/parcial-aceitável/degradada de cada rodada — o mesmo que
`classificacao.json` já registrava no repositório, agora também alcançável
por quem lê o Postgres. `ingerir-pncp.ts` e `juntar-coleta.ts` gravam a
linha logo depois de classificar; `painelDoDia` lê a mais recente e só marca
`coletaCompleta: false` para `degradada` — `completa` e `parcial-aceitavel`
contam como utilizável, a mesma regra que já decide se o workflow commita o
agregado.

## Fase 6 — Inteligência avançada

Nada implementado, e é o certo: histórico de participação, padrão de órgão,
benchmark e previsão de competitividade dependem de dado que só existe depois de
clientes reais usando o produto. Construir agora seria inventar o insumo.

## Decisões em aberto — do dono, não do time técnico

1. ~~Provisionar Postgres~~ — **resolvido em 14/08.** Projeto no ar, esquema
   aplicado, RLS conferida. O que ainda usa o repositório de demonstração é a
   leitura das telas, e isso depende do `RepositorioSupabase`, não de provisionar.
2. ~~Destino dos leads e do e-mail transacional~~ — **resolvido em 14/08.**
   `LEADS_DESTINO=supabase`, verificado ponta a ponta em produção: gravação,
   e-mail de confirmação, clique e idempotência do segundo clique.
3. ~~**Extração de PDF.**~~ **Decidida em 2026-08-15, contra medição** — ver
   [`documentos-e-cadencia.md`](documentos-e-cadencia.md). `pdfjs-dist` para PDF
   e `fflate` para zip, sem worker Python: o Docling carregaria um segundo
   runtime, 58× mais lento, para um caso de borda. PyMuPDF foi descartado por ser
   AGPL — num SaaS, obriga a abrir o código. O que resta em aberto é só contratar
   OCR para os digitalizados; até lá, a recusa é declarada.

   **Correção de 15/08:** o custo estimado subiu de ~US$ 3 para **~US$ 11/mês**.
   A primeira medição era só de PE, onde 1,2% dos PDFs precisam de OCR; repetida
   em CE, a necessidade é de **11,5%** — quase dez vezes maior. Um número só,
   tirado de um estado, subdimensionava o custo por um fator de dez.
4. ~~**Os segredos do GitHub Actions e do Vercel.**~~ **Confirmados em 20/08,
   por evidência de produção, não por abrir os dois painéis.** `RESEND_API_KEY`,
   `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` precisam existir
   nos DOIS lugares — não só no GitHub: `leads-destinos.ts` (a rota
   `/api/alerta`, rodando no Vercel) usa a mesma chave de serviço que os
   scripts agendados usam, e `email/resend.ts` é chamado tanto por
   `enviar-alertas.ts` (GitHub) quanto pela confirmação de cadastro do site
   (Vercel).

   A prova veio do que já aconteceu: 10 alertas reais enviados pelo script
   agendado, 3.964 decisões de triagem e 4.740 editais gravados pela coleta
   (os três só acontecem com `NEXT_PUBLIC_SUPABASE_URL` +
   `SUPABASE_SERVICE_ROLE_KEY` funcionando no GitHub), e — do lado do
   Vercel — o e-mail de confirmação do teste ponta a ponta de 14/08 saiu e
   foi clicado (`leads.confirmado_em` preenchido), e a única empresa
   cadastrada hoje só existe porque o cadastro persistiu de verdade. Os três
   segredos funcionam nos dois lugares.

   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Vercel, diferente dos três acima — é a
   chave pública que a tela de login usa no navegador) também está
   confirmada pela mesma evidência: sem ela, a empresa cadastrada não teria
   conseguido criar conta. **O que falta não é segredo, é navegação:** ainda
   não existe link de "Entrar" no menu público do site — botão levando a
   tela morta é pior que botão nenhum, e por isso ele nunca foi adicionado;
   agora que a chave está confirmada, adicionar o link é só um item de UI.
5. ~~**Retenção e exclusão de documentos.**~~ **Decidido e implementado em
   20/08** — `src/lib/lgpd/`, dois scripts (`lgpd-purgar-documentos-
   cancelados.ts` para a carência de 30 dias, `lgpd-excluir-empresa.ts` para
   o pedido explícito) e dois workflows manuais. Detalhe em
   `posicionamento-e-limites.md`, seção 5.
6. ~~**Teto de custo mensal de IA.**~~ **Decidido em 20/08: R$ 300/mês.**

   A análise profunda é feita uma vez por edital e reaproveitada por todos os
   assinantes (`analises_de_edital` é chaveada só por `edital_id`, sem
   `empresa_id`) — o custo cresce com quantos editais distintos passam na
   triagem de alguém, não com o número de clientes multiplicado. Ao preço
   público do Gemini 2.5 Flash/Pro em 20/08 (US$ 0,30–1,25 por milhão de
   tokens de entrada, US$ 2,50–10,00 de saída), um edital analisado custa em
   média ~US$ 0,01. Mesmo um cliente com perfil muito amplo (milhares de
   editais compatíveis por mês, sem nenhuma sobreposição com outro cliente)
   fica bem abaixo dos R$ 800/mês cogitados de mensalidade — a IA é uma fração
   pequena do custo por cliente, não o que decide a margem.

   **R$ 300/mês é teto operacional dos primeiros meses, não limite de
   margem** — deve subir conforme a base de clientes crescer. E,
   deliberadamente, **não é um interruptor**: ultrapassar o teto gera alerta
   para revisão com dado real (quantos editais, de que porte, quanto por
   execução — o que `ExecucaoDeIA` em `custo.ts` já registra), nunca
   interrompe a análise sozinho. Um corte automático transformaria "o mês
   veio mais caro que o previsto" em "o produto parou de entregar o que o
   cliente paga" — o segundo é bem pior que o primeiro, e é sempre uma pessoa
   que deve decidir entre os dois, olhando o motivo do excesso.

   ~~**O que ainda falta, tecnicamente:**~~ **Feito, em 21/08.**
   `GEMINI_API_KEY` está configurada — a leitura profunda passa a acontecer de
   verdade em `scripts/publicar-posts.ts`, o único caminho de produção que
   chama `analisarEdital` hoje (`scripts/triar-editais.ts` continua deliberada
   e explicitamente sem leitura de IA — ver o header do arquivo). Cada
   execução agora é gravada em `execucoes_de_ia` (`src/lib/ia/repositorio.ts`,
   `mapeamento.ts`).

   O mecanismo de alerta existe: `scripts/verificar-custo-de-ia.ts` soma o mês
   corrente (`src/lib/ia/tetoDeCusto.ts`) e avisa `ADMINS_DA_PLATAFORMA` por
   e-mail quando passa do teto — uma vez por mês
   (`avisos_de_custo_de_ia`), nunca cortando a análise. `workflow_dispatch`
   só, por ora: mesma disciplina de `triar-editais.yml` antes de ser
   promovido — primeiro correto contra um mês real de dado, depois em cron.

   **O que continua em aberto, e é decisão do dono, não técnica:**
   `PRECOS_POR_MODELO` (`custo.ts`) segue vazia. Preencher com o preço
   público do Gemini seria a mesma invenção de certeza que o resto do produto
   recusa fazer com edital — o preço precisa ser conferido contra a fatura
   real do Google Cloud, não contra a lista de preços. Até lá, o script soma
   e mostra o volume real (execuções, tokens, por modelo) em todo log, mas só
   manda e-mail quando o piso conhecido já basta para confirmar o estouro
   sozinho.

   **A leitura real chega às oportunidades de cliente, em 21/08.** Até aqui só
   os posts do blog eram lidos de verdade — a tagline do site ("já lidos") e o
   e-mail de alerta prometiam leitura que nenhuma oportunidade de cliente
   jamais recebia (`analiseLeuTexto` sempre `false`, confirmado contra os
   dados de produção: 1.169 oportunidades entregues para a única empresa
   cadastrada, zero linhas em `execucoes_de_ia` fora do blog). `scripts/
   ler-recomendados.ts`, novo, roda logo depois de `triar-editais.ts` e lê de
   verdade o topo-25 por empresa com score ≥ 70 sem leitura — o mesmo corte
   que já separa "recomendada"/"recomendada forte" e que já é o piso do
   alerta por e-mail, não um número novo. `triar-editais.ts` continua sem
   chamar `analisarEdital`, deliberadamente — quem lê agora é o script
   companheiro, e as oportunidades afetadas são regravadas com a análise
   real por cima do score "de ficha" que já existia.

   A leitura é por EDITAL, compartilhada entre toda empresa cujo topo a
   inclui (`analises_de_edital`, finalmente escrita — a tabela existia desde
   14/08 e nunca tinha recebido uma linha). O limite de 25/empresa/dia é
   deliberadamente por empresa, não um teto global: cada empresa nova soma um
   custo teto prévisível, em vez de competir por uma cota compartilhada.
   Medido contra o perfil de teste, o corte de score já reduz de 1.169 para
   21 editais abertos — dentro do mesmo teto de R$ 300/mês.

   **O que não foi possível confirmar antes de mesclar:** a chave de serviço
   do Supabase não estava disponível para rodar o script contra produção
   antes do merge — a validação real acontece na primeira execução agendada,
   com `continue-on-error` protegendo o resto do workflow caso algo precise
   de ajuste.

## O que eu não construiria em seguida, e por quê

**Mais fontes de dados.** A arquitetura já aceita, mas cobertura maior sem
extração de documento só aumenta o volume de editais rasos. Primeiro a
profundidade, depois a largura.

**Dashboard com gráficos.** O painel responde "o que eu faço hoje". Gráfico de
série histórica é o tipo de coisa que enche tela e não muda decisão nenhuma
enquanto não houver histórico do próprio cliente.
