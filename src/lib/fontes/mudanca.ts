/**
 * Saber que um edital MUDOU, e não só que ele existe.
 *
 * É o que separa "lista de licitações" de produto: o prazo foi prorrogado, o
 * objeto foi retificado, a situação virou "Suspensa". Quem já decidiu disputar
 * precisa saber disso no dia em que acontece — e o alerta só pode disparar
 * quando houve mudança de verdade, senão vira e-mail diário idêntico que o
 * cliente aprende a ignorar.
 *
 * O hash é de CONTEÚDO, e a lista de campos é explícita e ordenada no código —
 * não `Object.keys`, cuja ordem depende de como o objeto foi construído. Dois
 * processos, duas versões do código, duas fontes: mesmo conteúdo, mesmo hash.
 *
 * Três campos ficam DE FORA, e cada exclusão tem motivo:
 *
 *   `coletadoEm`    — muda todo dia por definição. Incluí-lo faria todo edital
 *                     "mudar" em toda coleta, que é o mesmo que não ter hash.
 *   `valorSuspeito` — é decidido em lote (`marcarValoresSuspeitos`), contra a
 *                     distribuição do dia. O edital mudaria de hash porque os
 *                     VIZINHOS dele mudaram.
 *   `fonte`/`idNaFonte`/`link` — são procedência, não conteúdo. O mesmo certame
 *                     vindo de outro portal não é uma alteração do certame.
 *
 * `valorEstimadoBruto` entra no lugar de `valorEstimado` porque é o que a fonte
 * publicou: um órgão que troca `0` por `null` não mudou nada de fato, mas um
 * que troca `0` por `250000` mudou, e só o bruto distingue os dois casos.
 */

import { createHash } from "node:crypto";
import type { Edital } from "./tipos.ts";

/**
 * Os campos que definem o conteúdo, na ordem em que entram no hash.
 *
 * Acrescentar campo aqui invalida todos os hashes gravados — o que significa um
 * dia de "tudo mudou". É aceitável e é o comportamento correto (o sistema passou
 * a olhar para algo que não olhava), mas tem de ser decisão consciente.
 */
function conteudoCanonico(e: Edital): string {
  const campos: [string, unknown][] = [
    ["objeto", e.objeto.trim()],
    ["orgao.cnpj", e.orgao.cnpj],
    ["orgao.nome", e.orgao.nome.trim()],
    ["orgao.esfera", e.orgao.esfera],
    ["local.uf", e.local.uf],
    ["local.municipio", e.local.municipio],
    ["local.codigoIbge", e.local.codigoIbge],
    ["modalidade", e.modalidade],
    ["modoDisputa", e.modoDisputa],
    ["instrumento", e.instrumento],
    ["amparoLegal", e.amparoLegal],
    ["registroDePrecos", e.registroDePrecos],
    ["valorEstimadoBruto", e.valorEstimadoBruto],
    ["aberturaProposta", e.aberturaProposta],
    ["encerramentoProposta", e.encerramentoProposta],
    ["publicadoEm", e.publicadoEm],
    ["situacao", e.situacao],
  ];
  // JSON por campo (e não concatenação crua) para `null`, `"null"` e `""` não
  // colidirem — três estados diferentes que o dado público realmente produz.
  return campos.map(([nome, valor]) => `${nome}=${JSON.stringify(valor ?? null)}`).join("\n");
}

/** Hash estável do conteúdo de um edital. Mesmo conteúdo, mesmo hash, sempre. */
export function hashDeConteudo(e: Edital): string {
  return createHash("sha256").update(conteudoCanonico(e), "utf8").digest("hex");
}

/**
 * `true` quando o mesmo edital mudou de conteúdo entre duas coletas.
 *
 * Exige o mesmo `id` porque a pergunta só faz sentido para o mesmo certame —
 * comparar editais diferentes sempre devolveria `true` e esconderia o erro de
 * pareamento de quem chamou.
 */
export function mudou(anterior: Edital, atual: Edital): boolean {
  if (anterior.id !== atual.id) {
    throw new Error(
      `mudou() compara o MESMO edital em dois momentos; recebeu ${anterior.id} e ${atual.id}`,
    );
  }
  return hashDeConteudo(anterior) !== hashDeConteudo(atual);
}

/** Os campos que mudaram, com valor de antes e de depois. Vai para o alerta. */
export function diferencas(anterior: Edital, atual: Edital): { campo: string; de: string; para: string }[] {
  const de = conteudoCanonico(anterior).split("\n");
  const para = conteudoCanonico(atual).split("\n");
  const mudancas: { campo: string; de: string; para: string }[] = [];
  for (let i = 0; i < de.length; i++) {
    if (de[i] === para[i]) continue;
    const campo = de[i].slice(0, de[i].indexOf("="));
    mudancas.push({ campo, de: de[i].slice(campo.length + 1), para: para[i].slice(campo.length + 1) });
  }
  return mudancas;
}
