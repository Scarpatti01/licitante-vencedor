<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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
