# Arquitetura

Registro das decisões que sustentam o produto, com o motivo de cada uma. Serve
para não refazer discussão encerrada e, principalmente, para que quem discordar
saiba exatamente do que está discordando.

## O formato do sistema

```
fonte (PNCP, e depois outras)
  ↓  src/lib/fontes/          porta FonteDeEditais + adaptador por portal
coleta → normalização → revisão automática
  ↓  src/lib/ia/              extração estruturada do documento (opcional)
análise do edital  ── uma por edital, compartilhada entre todos os clientes
  ↓  src/lib/dominio/         score, checklist, recomendação (determinístico)
avaliação por empresa
  ↓  src/lib/pipeline/        triagem + registro do porquê de cada decisão
oportunidade
  ↓  src/lib/dados/           porta do produto (empresaId obrigatório)
painel · página do edital · alerta
```

## Decisões

### O núcleo de decisão é determinístico, não é IA

A IA extrai e estrutura o que está no documento. Quem decide se a oportunidade é
recomendada é `src/lib/dominio/score.ts`, que é lógica pura: auditável linha a
linha, testável, e igual entre duas execuções.

Isso não é conservadorismo técnico. É o que permite responder "por que este
edital recebeu 87?" com a lista de critérios e pesos, em vez de "o modelo
achou". Num produto que cobra para dizer onde gastar uma semana de trabalho, a
segunda resposta não se sustenta na primeira reunião difícil.

### Análise é por edital; avaliação é por empresa

`AnaliseDoEdital` é a leitura do documento — cara, feita uma vez, compartilhada.
`Oportunidade` é o cruzamento com um perfil — barata, feita para cada cliente.

A separação faz o custo de IA crescer com o número de *editais*, não com o
número de assinantes, e é o que torna o modelo comercial viável. Também é o que
permite reprocessar uma análise e atualizar todas as oportunidades derivadas dela
sem migrar dado.

### Procedência em vez de confiança

Ver `docs/produto/posicionamento-e-limites.md`, seção 3. Em código:
`src/lib/dominio/procedencia.ts`. É a decisão da qual todas as outras herdam.

### Critério indeterminado sai da conta

O score normaliza sobre o peso que **pôde** ser avaliado e publica a cobertura.
Abaixo de 50% de cobertura não há número — há a lista do que falta. A alternativa
(zerar o que falta) converteria ausência de dado em afirmação sobre a empresa.

### Fila em Postgres, não em Redis

O processamento pesado (baixar documento, extrair, chamar modelo) não pode
acontecer dentro de uma requisição HTTP. A fila usa a tabela
`fila_de_trabalhos` com `FOR UPDATE SKIP LOCKED`, que suporta múltiplos workers
concorrentes sem infraestrutura adicional.

Redis entraria como um serviço a mais para operar, monitorar e pagar, resolvendo
um problema que o banco que já existe resolve na escala deste produto. Se a fila
virar gargalo medido — não suposto — a troca fica contida no módulo de fila.

### Busca semântica em pgvector, não em banco vetorial dedicado

Mesma lógica. O dado já está no Postgres; um serviço externo acrescentaria
sincronização, custo e um segundo lugar onde a verdade pode divergir.

### Extração de documento é uma porta, com Docling atrás dela

Docling é a melhor ferramenta para edital em PDF, inclusive digitalizado, e é
Python — este projeto é TypeScript na Vercel. A decisão foi definir a porta
`ExtratorDeDocumento` e manter o adaptador Docling como serviço separado, em vez
de arrastar um runtime Python para dentro do app ou de fingir que um parser de
PDF em JS resolve edital escaneado.

Consequência honesta: enquanto o worker de extração não existir, a profundidade
das análises fica em `"lista"` e o produto declara isso na interface, em vez de
apresentar um checklist incompleto como se fosse completo.

### Isolamento entre clientes em duas camadas independentes

1. `src/lib/dados/porta.ts` — toda leitura exige `empresaId`. Não existe função
   que devolva dado sem que o chamador diga de quem é.
2. RLS no Postgres, negando por padrão.

Uma camada é a rede da outra. A aplicação pode ter um bug de filtro; o banco
continua recusando. O inverso também vale.

### O repositório de demonstração não é atalho, é ferramenta

`src/lib/dados/demonstracao.ts` implementa a mesma porta com dados sintéticos.
Permitiu construir e revisar todas as telas antes de existir Postgres
provisionado — decisão com custo mensal, que é do dono e não de um agente. Trocar
por Supabase não muda uma linha de tela.

Os dados de demonstração se declaram: `fonte: "exemplo"` e `id` prefixado por
`EXEMPLO-`, e o shell exibe aviso enquanto o repositório em uso for esse.

### Preço não mora no código

Planos, limites, setup, mensalidade e percentual de success fee são linhas de
tabela. Nenhum valor comercial aparece em constante de aplicação: mudar preço não
pode exigir deploy, e cliente antigo não pode ser afetado por mudança de tabela.

## O que ainda não existe

Está em `docs/produto/roadmap.md`, com o motivo de cada ausência. A regra que
seguimos: é melhor um produto menor que declara seus limites do que um produto
que aparenta cobertura que não tem — a segunda opção só adia a descoberta para
o momento em que o cliente confere, e ele confere.
