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

# Pendência aberta: a leitura dos posts (21/08)

**Pedido do dono, para a próxima sessão: rodar a leitura dos posts.**

Antes de rodar, confira — porque provavelmente já rodou sozinha. O script
`publicar-posts.ts` é passo das duas coletas, e a coleta roda 06:10 e 08:10
UTC. Se a madrugada passou entre aquela sessão e esta, o trabalho está feito e
a pergunta vira "funcionou?".

Como conferir, na ordem:

```sh
ls dados/posts/            # existe leva com a data de hoje?
```

Se existe, conte quantos daqueles posts têm leitura de verdade — campo
`analise` preenchido no JSON da leva. Esse é o número que importa.

**NÃO confie em `execucoes_de_ia` para responder isso.** Conferido em 21/08: os
25 posts falharam e a tabela ficou VAZIA. O script empilha as gravações em
segundo plano (`gravacoesPendentes`) e o guarda de recusa em bloco interrompe
antes de esperá-las — ou seja, no dia em que tudo falha, o livro de execuções
perde justamente a evidência de que falhou. Consertar isso é trabalho legítimo,
e não foi feito.

A fonte confiável é o log: a saída do passo "Publicar a leva de posts do dia"
na execução da coleta, ou o resumo de `publicar-posts.yml`, que carrega a saída
inteira de propósito. É lá que aparece `[n/25] ... com leitura` linha a linha.

Se não houver leva de hoje, ou se houver mas sem leitura, dispare
`publicar-posts.yml` à mão (com **simular** desmarcado).

**O que torna isso traiçoeiro, e por que não basta olhar se o job ficou verde:**
o passo dentro da coleta é `continue-on-error: true`, e o script publica os
posts SEM leitura quando a chave do Gemini não serve, declarando isso na
página. Ou seja: falha e sucesso degradado são ambos verdes. A única prova é
contar quantos posts saíram com leitura.

Estado em 21/08, e o que o log já provou: a coleta das 08h54 rodou os posts, e
os **25 falharam com o mesmo erro** — `models/gemini-2.5-pro is no longer
available` (HTTP 404). É exatamente o modelo aposentado que a #58 corrigiu, e
os dois scripts pegam o id no mesmo `modelosGemini()`, então a correção alcança
os posts sem ninguém tocar em `publicar-posts.ts`. A causa está identificada,
não suposta.

O que continua em aberto são as paredes seguintes, que os posts nunca
alcançaram por terem morrido no 404: o dialeto de schema (#63, mesmo caminho,
não exercido para posts) e o limite de tokens de saída, que derrubou 2 de 21 na
execução boa das oportunidades e que **nenhuma das duas correções resolve**.
Espere um ou dois posts sem leitura — isso não impede a leva, porque o guarda
só recusa quando NENHUM é lido.

Apague esta seção quando uma leva sair com a maioria dos posts lidos.

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
