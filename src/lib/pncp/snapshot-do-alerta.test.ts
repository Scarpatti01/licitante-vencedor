import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O contrato entre quem COLETA e quem ENVIA o alerta.
 *
 * ## O defeito que motivou este arquivo
 *
 * `enviar-alertas.ts` não recoleta: ele lê o snapshot que a coleta produziu.
 * Quem o produzia era a coleta sequencial, que deixou de rodar diariamente em
 * 21/08 quando a paralela assumiu — e a paralela nunca escreveu esse arquivo.
 *
 * Ficou invisível por dois dias porque o alerta aceita snapshot de até 36
 * horas: na sexta ainda havia o de quinta. Na segunda o envio pararia, sem que
 * nada tivesse "quebrado" naquele dia.
 *
 * ## E o defeito que quase entrou junto com a correção
 *
 * A primeira versão gravava `editais: marcados`. `marcarValoresSuspeitos`
 * devolve a CONTAGEM de marcados e altera os editais no próprio array — então
 * aquilo escreveria um número onde o leitor espera a lista. `JSON.stringify`
 * aceita, o `tsc` não reclama, e o arquivo pareceria normal. O alerta morreria
 * com "sem a lista `editais`".
 *
 * Por isso este teste olha as CHAVES que o leitor exige, e não a intenção de
 * quem escreveu.
 */

const RAIZ = join(import.meta.dirname, "..", "..", "..");

/**
 * Os dois scripts que ESCREVEM o snapshot, nomeados um a um.
 *
 * A primeira versão descobria os produtores procurando "dados/editais.json" nos
 * scripts, e isso pegou também `enviar-alertas.ts` — que LÊ o arquivo. Separar
 * escrita de leitura por texto exigiria adivinhar a forma de cada `writeFile`,
 * e um detector que erra é pior que uma lista curta e explícita.
 *
 * Se um terceiro produtor aparecer, acrescente aqui. A lista é curta de
 * propósito: ela é o contrato, e contrato se lê inteiro.
 */
const PRODUTORES = ["ingerir-pncp.ts", "juntar-coleta.ts"] as const;

/** As duas chaves que `enviar-alertas.ts` confere antes de mandar qualquer coisa. */
const EXIGIDAS = ["editais", "coletadoEm"] as const;

function fonte(nome: string): string {
  return readFileSync(join(RAIZ, "scripts", nome), "utf8");
}

describe("todo produtor de snapshot escreve o que o alerta exige", () => {
  it("a coleta paralela escreve o snapshot, e não só o agregado", () => {
    // O defeito de 21/08: a paralela assumiu a coleta diária e nunca escreveu
    // este arquivo. O alerta sobreviveu dois dias com o snapshot da sequencial
    // (o limite dele é 36h) e pararia na segunda-feira.
    expect(fonte("juntar-coleta.ts")).toMatch(/editais\.json/);
  });

  it.each(EXIGIDAS)("todo produtor grava a chave `%s`", (chave) => {
    for (const nome of PRODUTORES) {
      expect(
        new RegExp(`\\b${chave}\\b`).test(fonte(nome)),
        `${nome} escreve o snapshot do alerta sem \`${chave}\`. ` +
          "`enviar-alertas.ts` confere as duas antes de enviar: `editais` para ter " +
          "o que mandar, `coletadoEm` para recusar dado velho.",
      ).toBe(true);
    }
  });

  it("nenhum produtor grava a CONTAGEM no lugar da lista", () => {
    // O erro exato que quase entrou nesta mesma PR. `marcarValoresSuspeitos`
    // devolve `{ marcados: number }` e altera os editais no próprio array —
    // `editais: marcados` gravaria um número onde o leitor espera a lista.
    // `JSON.stringify` aceita, o `tsc` não reclama, e o arquivo pareceria
    // normal até o alerta morrer com "sem a lista `editais`".
    for (const nome of PRODUTORES) {
      expect(
        /editais:\s*marcados\b/.test(fonte(nome)),
        `${nome} grava \`editais: marcados\` — isso é a contagem, não a lista.`,
      ).toBe(false);
    }
  });
});
