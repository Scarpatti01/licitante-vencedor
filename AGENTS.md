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

```sql
-- a leitura de post é a que NÃO tem oportunidade associada
select date(criado_em), modelo, sucesso, count(*)
from execucoes_de_ia group by 1,2,3 order by 1 desc;
```

Se não houver leva de hoje, ou se houver mas sem leitura, dispare
`publicar-posts.yml` à mão (com **simular** desmarcado) e leia o resumo da
execução — ele carrega a saída inteira de propósito.

**O que torna isso traiçoeiro, e por que não basta olhar se o job ficou verde:**
o passo dentro da coleta é `continue-on-error: true`, e o script publica os
posts SEM leitura quando a chave do Gemini não serve, declarando isso na
página. Ou seja: falha e sucesso degradado são ambos verdes. A única prova é
contar quantos posts saíram com leitura.

Estado em 21/08, para comparar: levas pararam em 16/08, e as de 15 e 16/08 têm
**0 de 25** posts com leitura. As causas conhecidas — modelo aposentado (#58) e
dialeto de schema recusado (#63) — foram corrigidas no mesmo dia, e a leitura
de oportunidades voltou a funcionar com elas. **Que isso conserte os posts é
expectativa, não fato conferido.** Se a primeira leva depois da correção sair
com leitura, apague esta seção.
