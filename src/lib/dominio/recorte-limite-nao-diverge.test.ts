import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { LIMITE_DE_RECORTES } from "./recorte.ts";

/**
 * O limite de três está escrito duas vezes, e as duas precisam concordar.
 *
 * `dominio/recorte.ts#conferirConjunto` é quem dá a mensagem que a tela mostra.
 * A trigger `recorte_respeita_o_limite`, na migração, é o que sobra quando
 * alguém chama a API direto ou quando um caminho novo esquece de validar. Ter
 * as duas é decisão consciente: regra de negócio que só mora na tela é regra
 * que a próxima tela não tem.
 *
 * O preço de ter duas é que elas divergem, e a divergência aqui é silenciosa do
 * pior jeito: se o TypeScript subir para 5 e a trigger ficar em 3, a tela
 * aceita o quarto recorte, o cliente configura, salva, e o banco recusa com uma
 * mensagem que fala de trigger. Ele conclui que o produto está quebrado, e está
 * certo.
 *
 * Este teste lê o SQL de verdade e cobra que os dois números sejam o mesmo.
 */

const MIGRACOES = join("supabase", "migrations");

const arquivoDaTrigger = readdirSync(MIGRACOES)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => [f, readFileSync(join(MIGRACOES, f), "utf8")] as const)
  .find(([, sql]) => sql.includes("function recorte_respeita_o_limite"));

describe("o limite de recortes não diverge entre o código e o banco", () => {
  it("a trigger existe numa migração", () => {
    // Sem isto, o teste abaixo passaria vacuamente no dia em que alguém
    // renomeasse a função e a trava sumisse sem ninguém notar.
    expect(
      arquivoDaTrigger,
      "nenhuma migração declara `function recorte_respeita_o_limite`",
    ).toBeDefined();
  });

  it("a trigger usa o mesmo número que LIMITE_DE_RECORTES", () => {
    const [nome, sql] = arquivoDaTrigger!;

    const declarado = sql.match(/limite\s+constant\s+int\s*:=\s*(\d+)\s*;/u);
    expect(
      declarado,
      `${nome}: não achei \`limite constant int := N;\` na trigger. ` +
        "Se o jeito de declarar mudou, este teste precisa mudar junto, senão ele vira decoração.",
    ).not.toBeNull();

    expect(
      Number(declarado![1]),
      `${nome}: a trigger recusa a partir de ${declarado![1]} recortes, mas ` +
        `LIMITE_DE_RECORTES é ${LIMITE_DE_RECORTES}. A tela aceitaria o que o banco recusa.`,
    ).toBe(LIMITE_DE_RECORTES);
  });
});
