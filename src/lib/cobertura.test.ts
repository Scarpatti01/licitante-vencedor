import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COBERTURA, UFS_COBERTAS, ULTIMA_COLETA } from "./cobertura";

/**
 * Guarda contra a obsolescência silenciosa que motivou `cobertura.ts`.
 *
 * O defeito de 21/08 não foi um número errado — foi um número CERTO que
 * envelheceu sem avisar. A coleta passou de seis estados para o país inteiro, e
 * três páginas continuaram publicando a cobertura antiga com toda a
 * naturalidade. Nenhum teste quebrou, porque nenhum teste sabia que aquelas
 * frases eram afirmações sobre o presente.
 *
 * Estes testes leem o TEXTO PUBLICADO, e não só a constante. Testar a constante
 * contra ela mesma passaria com as três páginas ainda mentindo — foi exatamente
 * essa a situação real.
 */

const APP = join(import.meta.dirname, "..", "app");

/** Todo `page.tsx` sob `src/app/`, recursivamente. */
function paginas(dir: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...paginas(caminho));
    else if (entrada.name === "page.tsx") achados.push(caminho);
  }
  return achados;
}

const TEXTO_DAS_PAGINAS = paginas(APP).map((caminho) => ({
  caminho: caminho.slice(APP.length + 1),
  texto: readFileSync(caminho, "utf8"),
}));

describe("a cobertura publicada corresponde à cobertura real", () => {
  it("cobre as 27 unidades da federação, sem repetição", () => {
    expect(UFS_COBERTAS).toHaveLength(27);
    expect(new Set(UFS_COBERTAS).size).toBe(27);
  });

  it("nenhuma página afirma no presente que a cobertura é de seis estados", () => {
    // A frase é permitida como HISTÓRIA ("começou por seis estados"), que é
    // verdade e vale contar. O que não pode é ela aparecer descrevendo o que o
    // produto faz HOJE. Distinguimos pelo verbo: "começou por" é passado
    // declarado; "limitada a" e "cobrimos" são presente.
    //
    // A lista nasceu curta e deixou passar dois casos na primeira tentativa:
    // "Preferimos seis estados coletados..." e "Abrangência atual: Piloto em
    // PE, PB, ...". Os dois só apareceram ao ler o HTML RENDERIZADO das páginas,
    // não o código. Por isso "abrangência parcial" e "piloto em" estão aqui:
    // nenhuma das duas cita o número seis, e ambas afirmavam o presente errado.
    const presenteProibido = [
      /cobertura limitada a seis estados/i,
      /cobrimos seis estados/i,
      /apenas seis estados/i,
      /somente seis estados/i,
      /preferimos seis\s+estados/i,
      /abrangência é deliberadamente parcial/i,
      /abrangência atual["\s,:]+.{0,20}piloto/i,
    ];

    for (const { caminho, texto } of TEXTO_DAS_PAGINAS) {
      for (const proibido of presenteProibido) {
        expect(
          proibido.test(texto),
          `${caminho} afirma no presente uma cobertura de seis estados, que deixou de ser verdade em 21/08. ` +
            `Contar que a operação COMEÇOU por seis estados continua permitido — o que não pode é descrever o presente assim.`,
        ).toBe(false);
      }
    }
  });

  it("nenhuma página publica os números da coleta antiga", () => {
    // Os três números do piloto de seis estados. Se algum reaparecer, é sinal
    // de que uma página voltou a fixar número na mão em vez de usar `COBERTURA`.
    const numerosAposentados = ["3.312", "639 municípios"];

    for (const { caminho, texto } of TEXTO_DAS_PAGINAS) {
      for (const numero of numerosAposentados) {
        expect(
          texto.includes(numero),
          `${caminho} publica "${numero}", que é da coleta de seis estados. ` +
            `Use \`COBERTURA\` de \`@/lib/cobertura\` — é o único lugar onde esses números devem existir.`,
        ).toBe(false);
      }
    }
  });

  it("a fotografia da última coleta é coerente consigo mesma", () => {
    // Município sem edital não entra na conta, então nunca pode haver mais
    // municípios que editais. Um número maior que o outro denuncia troca de
    // campo na hora de atualizar — o erro mais provável neste arquivo.
    expect(ULTIMA_COLETA.municipios).toBeLessThan(ULTIMA_COLETA.editais);
    expect(ULTIMA_COLETA.ufs).toBe(UFS_COBERTAS.length);
  });

  it("a data da última coleta não é do futuro", () => {
    // Data no futuro é erro de digitação, e um que passaria despercebido: a
    // página renderiza normalmente e afirma ter coletado algo que não aconteceu.
    expect(new Date(`${ULTIMA_COLETA.data}T12:00:00Z`).getTime()).toBeLessThanOrEqual(
      Date.now(),
    );
  });

  it("formata os números em pt-BR, como o resto do site", () => {
    expect(COBERTURA.editais).toBe("26.773");
    expect(COBERTURA.municipios).toBe("3.995");
    expect(COBERTURA.dataPorExtenso).toBe("21 de agosto de 2026");
  });
});
