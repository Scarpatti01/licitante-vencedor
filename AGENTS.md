<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PR verde, PR mesclada

Decisão do dono, em 17/08: **mescle assim que o CI fechar verde**, sem pedir
autorização e sem esperar nova palavra. Ele testa em produção, e prefere o
defeito aparecendo na tela dele hoje ao trabalho parado esperando a palavra dele
amanhã.

O gatilho é o CI fechando, não o fim da conversa. Abriu a PR, ficou verde,
mesclou — inclusive quando ninguém está lendo. Não deixe PR verde dormindo para
"confirmar depois": é exatamente o que a seção seguinte deste arquivo existe
para impedir.

Isso é permissão para mesclar, não para deixar de julgar. Continua valendo:

  **Verde primeiro.** `verificar` (tipos, lint, testes, build) precisa ter
  passado. Mesclar vermelho não é agilidade, é empurrar o problema para a
  produção dele.

  **O que você mesmo marcou como pendente, continua pendente.** Se a PR depende
  de uma decisão que você levantou — promover a coleta paralela, mudar preço,
  apagar dado —, ela espera. Autorização para mesclar não é autorização para
  decidir no lugar dele.

  **Diga o que entrou.** Depois de mesclar, o que mudou em produção e o que
  observar. Ele está testando lá.

# Antes de limpar a conversa: a conferência

Combinado com o dono em 17/08: quando ele achar que a sessão terminou, ele
avisa, e **você confere e responde se pode limpar ou não**. Não é formalidade —
`/clear` apaga o histórico, e o que você sabia por ter conversado some junto.

Este bloco está escrito aqui, e não só na conversa, porque um acordo sobre
limpar a conversa que vive dentro dela morre na primeira limpeza.

Confira, nesta ordem, e responda com o que encontrou:

  **1. Nada por commitar.** `git status` limpo em todos os clones em uso.

  **2. Nada empurrado e não mesclado.** PR aberta, ou ramo à frente da `main`
  sem PR. Se houver PR verde, mescle antes de responder — é a regra acima.

  **3. Nenhuma PR esperando CI.** Verde depois da limpeza não tem quem mescle.

  **4. Nenhum check-in agendado prestes a disparar.** O relatório cai na
  conversa, e uma conversa recém-limpa recebe um relatório sem o contexto que o
  originou. Se falta pouco, vale esperar ele chegar.

  **5. Nada prometido e não entregue.** Pergunta em aberto, decisão que ele
  pediu para tomar depois, achado que você viu e não relatou.

  **6. — E ESTE É O QUE IMPORTA — nada aprendido que exista só na conversa.**
  Decisão de conduta, regra nova, causa-raiz descoberta, medição feita: tudo
  isso precisa estar em arquivo (`AGENTS.md`, comentário no código, corpo da PR,
  texto do agendamento) ANTES de a conversa sumir. Se estiver só no histórico,
  escreva primeiro e responda depois.

O que sobrevive a `/clear`: código, commits, comentários, este arquivo, os
agendamentos guardados no servidor, o banco e os deploys. O que se perde: o
raciocínio em andamento e o fio da conversa.

Responder "pode limpar" sem ter conferido o item 6 é o modo de falha caro: o
projeto continua funcionando e ninguém percebe que a razão de uma decisão
evaporou — até alguém desfazê-la sem saber que ela existia.

# Antes de fechar qualquer etapa: olhe as PRs abertas

Toda vez que uma evolução do projeto for concluída, liste as pull requests
abertas e decida sobre cada uma. Não é burocracia — é o defeito que já
aconteceu aqui.

Em 14/08 havia duas PRs de 10/08 esquecidas. Uma consertava quatro erros de
eslint que já não existiam: mesclá-la seria conflito para não mudar nada. A
outra dava ao site o cartão de compartilhamento, e enquanto ela dormia **todo
link do site era compartilhado pelado** — inclusive as páginas de conteúdo, que
são o canal de aquisição. Quatro dias de custo silencioso.

O par de perguntas que resolve cada uma:

  **O problema que ela conserta ainda existe?** Conferir na `main` atual, não no
  corpo da PR. Se não existe, fechar com a explicação e o comando que prova.

  **O que mudou embaixo dela desde que foi escrita?** Uma PR de quatro dias
  atrás pode ter perdido o alcance sem perder a razão: a dos cartões cobria três
  rotas quando o site tinha três, e o site tinha quinze quando ela foi
  recuperada.

PR aberta parada não é trabalho guardado. É trabalho apodrecendo — o custo de
mesclá-la sobe todo dia, e o benefício que ela não entrega é cobrado todo dia.

# Pendência aberta: o crédito do Gemini acabou, e voltou (02/10)

**Os posts não saíram de 03/09 a 02/10, e a causa não era código: o crédito
pré-pago do Gemini acabou.** Toda leitura voltava `HTTP 402 … Your prepayment
credits are depleted` (em 04/09 a mesma mensagem vinha como HTTP 429). O script
recusava a leva, corretamente, porque nenhum post era lido. A última leva
publicada com leitura de verdade é a de 26/08, com 24 de 25.

**Estado em 02/10, 17:57 UTC: o dono recarregou, e a leitura voltou.** O
disparo manual de `publicar-posts.yml` (execução 37043860046) leu 4 de 5. O
quinto, Guaimbê/SP, não tinha documento com texto extraível, o que não é falha
nossa.

**Mas aquela leva NÃO foi publicada.** Até 02/10 `publicar-posts.yml` tinha
`permissions: contents: read` e nenhum passo de commit, e o JSON da leva morria
com o runner. Desde então o botão versiona a leva como a coleta faz, e recusa
publicar com coleta rodando ou com a leva do dia já na `main` (o porquê está no
cabeçalho do workflow). A primeira leva publicada depois da recarga deve ser a
de 03/10.

E a leva recusada deixou de passar em silêncio: desde 02/10 ela pinta a coleta
de vermelho no fim (passo "Cobrar a leva de posts recusada"), depois do commit
do agregado. Antes, o aviso caía numa execução que já era vermelha quase todo
dia por UF tolerada, e foi assim que um mês de crédito esgotado passou sem
ninguém ver. Agora UF tolerada não pinta mais a execução: ver
`vermelho-quer-dizer-olhe.test.ts`.

**Antes de mexer em código por causa de post sem leitura, leia a linha
`análise recusada em …` no log.** Se ela falar em `prepayment credits`, o
conserto é recarregar em https://ai.studio/projects, e mais nada. A pendência
anterior desta seção, de 21/08 (modelo aposentado e dialeto de schema), foi
resolvida pela #58 e pela #63: as levas de 23/08 (22 de 25) e de 26/08 (24 de
25) saíram lidas. Quem procurar aquela causa de novo vai perder tempo.

Job verde prova só que a leva não foi recusada inteira: 1 de 5 lido também
sai verde. A prova de leitura é a linha `com leitura: n de 5` no log, e o
arquivo do dia em `dados/posts/`.

Enquanto não houver crédito, quem sente é o blog e o primeiro cliente com
leitura no plano (em 02/10 eram 0 de 1 empresa), porque `ler-recomendados.ts`
usa a mesma chave.

Apague esta seção quando uma leva **versionada**, com arquivo em
`dados/posts/`, sair com a maioria dos posts lidos.

# A voz do texto que o cliente lê

Decisão do dono, 23/08. Vale para **post, guia, página e e-mail** — tudo que
um cliente lê. Não vale para comentário de código, que é conversa entre quem
mantém o repositório.

## Sem travessão

O travessão (`—`) está proibido nesses textos. O motivo é comercial, não
estético: ele virou marca registrada de texto gerado por IA, e o leitor
brasileiro já reconhece. Um texto que parece escrito por máquina perde
autoridade justamente no assunto em que a autoridade é o produto.

Trocar por travessão curto ou por hífen não resolve — o problema é a
construção, não o caractere. Cada caso pede a pontuação que um humano usaria:

| No lugar de | Use |
|---|---|
| Aposto explicativo no meio da frase | vírgulas, ou parênteses |
| Frase que completa a anterior | dois-pontos |
| Ideia que muda de direção | ponto final, e uma frase nova |
| Lista curta dentro do período | vírgulas, ou uma lista de verdade |

Frase longa demais para caber sem travessão é frase que quer virar duas.

`src/lib/voz.test.ts` guarda isto lendo o texto publicado. Ele cobre as áreas
já limpas e cresce conforme as outras forem passando — guarda que reprova o
repositório inteiro no primeiro dia vira `skip` na primeira pressa.

## E, em geral: escreva como gente

Sem "além disso", sem "vale ressaltar", sem "em suma", sem parágrafo que
anuncia o que o próximo parágrafo vai dizer. Frase curta. Voz ativa. O número
antes da adjetivação: "29,4% encerram em menos de oito dias" convence, "prazos
extremamente apertados" não.
