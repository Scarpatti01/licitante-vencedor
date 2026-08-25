import { describe, expect, it } from "vitest";

import { DIAS_APOS_ENCERRAMENTO, decisaoExpirou, limiteDeRetencao } from "./decisoes.ts";

const AGORA = new Date("2026-08-25T12:00:00Z");
const diasAtras = (n: number) =>
  new Date(AGORA.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const diasAFrente = (n: number) =>
  new Date(AGORA.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

describe("decisaoExpirou", () => {
  it("não expira enquanto o edital está aberto", () => {
    expect(decisaoExpirou({ encerramentoProposta: diasAFrente(5) }, AGORA)).toBe(false);
  });

  it("não expira no dia seguinte ao encerramento", () => {
    // É justamente quando o cliente abre o e-mail da semana e pergunta por que
    // não foi avisado.
    expect(decisaoExpirou({ encerramentoProposta: diasAtras(1) }, AGORA)).toBe(false);
  });

  it("não expira um dia antes do prazo", () => {
    expect(
      decisaoExpirou({ encerramentoProposta: diasAtras(DIAS_APOS_ENCERRAMENTO - 1) }, AGORA),
    ).toBe(false);
  });

  it("expira exatamente no prazo", () => {
    expect(
      decisaoExpirou({ encerramentoProposta: diasAtras(DIAS_APOS_ENCERRAMENTO) }, AGORA),
    ).toBe(true);
  });

  it("expira depois do prazo", () => {
    expect(decisaoExpirou({ encerramentoProposta: diasAtras(200) }, AGORA)).toBe(true);
  });

  it("NUNCA expira edital sem prazo publicado", () => {
    // Apagar "porque provavelmente já passou" é destruir dado por suposição.
    expect(decisaoExpirou({ encerramentoProposta: null }, AGORA)).toBe(false);
  });

  it("NUNCA expira quando a data é ilegível", () => {
    // Uma data que o `Date` não entende vira NaN, e `NaN + 30 dias` continua
    // NaN. Sem a guarda explícita a comparação daria `false` por acidente, e
    // acidente que acerta hoje erra amanhã.
    expect(decisaoExpirou({ encerramentoProposta: "trinta de agosto" }, AGORA)).toBe(false);
  });
});

describe("limiteDeRetencao", () => {
  it("devolve a data de corte que o SQL usa", () => {
    expect(limiteDeRetencao(AGORA).toISOString()).toBe(
      new Date("2026-07-26T12:00:00Z").toISOString(),
    );
  });

  it("concorda com decisaoExpirou em toda a vizinhança do corte", () => {
    /*
     * Esta é a guarda que importa: a mesma régua está escrita duas vezes, uma
     * para o Node e outra para o `where` do Postgres. Duas escritas da mesma
     * regra divergem — é só questão de quando. Aqui elas são conferidas dia a
     * dia em volta do corte, que é onde a divergência apareceria primeiro.
     */
    const corte = limiteDeRetencao(AGORA).getTime();

    for (let dia = DIAS_APOS_ENCERRAMENTO - 5; dia <= DIAS_APOS_ENCERRAMENTO + 5; dia++) {
      const encerramento = diasAtras(dia);
      const peloSql = new Date(encerramento).getTime() <= corte;
      const pelaFuncao = decisaoExpirou({ encerramentoProposta: encerramento }, AGORA);

      expect(pelaFuncao, `divergem em ${dia} dias após o encerramento`).toBe(peloSql);
    }
  });
});
