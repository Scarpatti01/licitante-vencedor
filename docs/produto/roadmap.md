# Roadmap e estado real

Este documento tem uma regra: ele descreve o que **existe**, não o que está
planejado parecer que existe. Um item só sai de "em construção" quando funciona,
está integrado, tem tratamento de erro, tem estado vazio e de carregamento, foi
testado e não quebrou nada que já funcionava.

Estado em 2026-08-14.

## Fase 1 — Fundação

| Item | Estado |
| --- | --- |
| Coleta do PNCP, diária, isolada por UF | **No ar** |
| Revisão automática da coleta (6 verificações) | **No ar** |
| Cobertura parcial declarada com honestidade | **No ar** |
| Guarda contra coleta degradada sobrescrever a boa | **No ar** |
| Arquitetura desacoplada da fonte (`FonteDeEditais`) | **No ar** |
| Detecção de mudança em edital já coletado | **No ar** |
| Esquema multi-tenant com RLS, índices e pgvector | **Aplicado** — 20 tabelas no Postgres de produção, advisor limpo |
| Autenticação e vínculo usuário↔empresa | **Não existe** |
| Perfil da empresa (modelo + telas) | **No ar** com repositório de demonstração |

## Fase 2 — Inteligência

| Item | Estado |
| --- | --- |
| Score de aderência explicável | **No ar**, determinístico e testado |
| Checklist de documentação com 4 estados | **No ar** |
| Recomendação + próxima ação | **No ar** |
| Camada de IA trocável, com prompts versionados e custo | **No ar**, inerte sem `GEMINI_API_KEY` |
| Segmentação de edital longo antes do modelo | **No ar** |
| Download e extração de PDF (Docling/OCR) | **Não existe** — ver "decisões em aberto" |
| Busca semântica (pgvector) | **Esquema pronto**, sem embeddings gerados |

## Fase 3 — Produto

| Item | Estado |
| --- | --- |
| Painel do dia | **No ar** |
| Lista de oportunidades com filtros | **No ar** |
| Página do edital com score explicado e checklist | **No ar** |
| Onboarding guiado | **No ar** |
| Registro de "por que este edital não apareceu" | **No ar** (`src/lib/pipeline/triagem.ts`) |
| Histórico de participação e resultado | **Esquema pronto**, sem tela |

## Aquisição — o blog

O blog é o canal de entrada orgânico. Ele não é vitrine nem diário: cada texto
existe para ser encontrado por uma busca com intenção comercial e terminar com o
leitor entendendo que há uma forma melhor de fazer aquilo.

| Item | Estado |
| --- | --- |
| 9 guias de referência (hubs) | **No ar** |
| Sistema de artigos, com validação de publicação | **No ar** |
| 3 artigos verificados no texto oficial | **No ar** |
| Captura dentro do texto, contextual por assunto | **No ar** |
| Registro de qual conteúdo converte (`origem`) | **No ar** |
| Destino do lead (Supabase ou webhook) | **No ar**, em produção com `LEADS_DESTINO=supabase` |
| Double opt-in: confirmação e descadastro por link | **No ar**, verificado ponta a ponta em produção |
| Limite de taxa na rota de captura | **No ar** (por instância — ver o arquivo) |
| Artigos relacionados nos hubs | **No ar** |
| Envio do primeiro e-mail ao lead capturado | **No ar** — confirmação e boas-vindas, via Resend |
| Páginas regionais por município, do dado próprio | **Não existe** — ver abaixo |

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
2. **Uma tela para ver os leads.** Hoje a resposta a "quantos cadastros esta
   semana" é uma consulta SQL feita à mão. Não precisa ser bonita; precisa
   existir antes de o volume tornar a consulta um hábito caro.
3. **Mais artigos, sempre atrás de um hub.** O gargalo não é volume, é intenção:
   três textos que respondem a dúvida de quem está executando valem mais que
   trinta sobre conceito.
4. **Páginas regionais por município**, a partir de `dados/agregados.json` — é
   para isso que a coleta versiona o agregado. Fica para depois de propósito: a
   última coleta cobriu 2 UFs, e publicar centenas de páginas rasas com dado
   parcial custaria a confiança que os guias construíram.

## Fase 4 — Comunicação

| Item | Estado |
| --- | --- |
| Seleção do que merece alerta | **No ar**, testado |
| Formato da mensagem (e-mail e WhatsApp) | **No ar** |
| Alerta diário do lead: região, seleção e texto | **No ar**, testado |
| Não repetir edital já enviado (`envios_de_alerta`) | **No ar** — tabela aplicada |
| Agendamento diário do alerta | **No ar** — dias úteis, 07:10 de Brasília |
| Envio de e-mail | **Escrito, inerte** — falta `RESEND_API_KEY` no repositório |
| Envio de WhatsApp | **Não existe** — exige conta e aprovação de template |

## Fase 5 — Monetização

| Item | Estado |
| --- | --- |
| Planos, limites e assinatura no modelo de dados | **Aplicado** — tabelas no ar, sem catálogo cadastrado |
| Cobrança recorrente, trial, cupom, upgrade | **Não existe** |
| Success fee | **Modelado**, sem apuração |

## Fase 6 — Inteligência avançada

Nada implementado, e é o certo: histórico de participação, padrão de órgão,
benchmark e previsão de competitividade dependem de dado que só existe depois de
clientes reais usando o produto. Construir agora seria inventar o insumo.

## Decisões em aberto — do dono, não do time técnico

1. **Provisionar Postgres.** Tem custo mensal recorrente. Sem ele, o produto roda
   com o repositório de demonstração e nada persiste.
2. **Destino dos leads e do e-mail transacional.** O formulário público continua
   respondendo 503 declarado enquanto não houver destino — ver `src/lib/leads.ts`.
3. **Extração de PDF.** Docling é Python; a decisão é entre subir um worker
   separado, contratar serviço de extração, ou operar por mais tempo só com os
   metadados da publicação (que é o que acontece hoje, declarado na interface).
4. **Retenção e exclusão de documentos** após cancelamento, e o que fazer com o
   histórico de triagem quando a empresa pede exclusão pela LGPD.
5. **Chave de IA e teto de custo mensal** antes de ligar a análise profunda.

## O que eu não construiria em seguida, e por quê

**Mais fontes de dados.** A arquitetura já aceita, mas cobertura maior sem
extração de documento só aumenta o volume de editais rasos. Primeiro a
profundidade, depois a largura.

**Dashboard com gráficos.** O painel responde "o que eu faço hoje". Gráfico de
série histórica é o tipo de coisa que enche tela e não muda decisão nenhuma
enquanto não houver histórico do próprio cliente.
