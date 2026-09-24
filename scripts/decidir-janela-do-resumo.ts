/**
 * Decide se o resumo diário sai agora, espera, ou fica para outro disparo.
 *
 *   node scripts/decidir-janela-do-resumo.ts
 *
 * Imprime a decisão e, dentro do GitHub Actions, escreve em `GITHUB_OUTPUT`:
 *
 *   acao=enviar | esperar | pular
 *   segundos=<n>     só quando acao=esperar
 *   motivo=<texto>   só quando acao=pular
 *
 * A regra mora em `src/lib/resumo/janela.ts`, onde é testada. Este arquivo só
 * a traduz para o workflow, que é quem dorme: um `sleep` de shell é a espera
 * mais simples de ler no log do Actions, e a regra fica fora do YAML, onde
 * nenhum teste alcança.
 */

import { appendFileSync } from "node:fs";
import { decidirJanelaDoResumo } from "../src/lib/resumo/janela.ts";

const decisao = decidirJanelaDoResumo(new Date());
console.log(JSON.stringify(decisao));

const saida = process.env.GITHUB_OUTPUT;
if (saida) {
  const linhas = [`acao=${decisao.acao}`];
  if (decisao.acao === "esperar") linhas.push(`segundos=${Math.ceil(decisao.ms / 1000)}`);
  // Uma linha só: `GITHUB_OUTPUT` com quebra dentro do valor precisa de
  // delimitador, e o motivo nunca tem quebra.
  if (decisao.acao === "pular") linhas.push(`motivo=${decisao.motivo}`);
  appendFileSync(saida, linhas.join("\n") + "\n");
}
