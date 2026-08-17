// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { manterExclusivos } from "./LinhaDeDocumento";

/**
 * Data e "sem prazo" nunca ficam preenchidos ao mesmo tempo.
 *
 * São duas afirmações incompatíveis sobre o mesmo documento — "vale até tal dia"
 * e "não tem prazo" —, e a combinação já era recusada em dois lugares: pelo
 * `check (not (sem_validade and valido_ate is not null))` do Postgres e por
 * `leitura.ts`.
 *
 * O que faltava era a tela não deixar acontecer. Marcar os dois era possível, e
 * o usuário só descobria depois de enviar o cadastro inteiro: "Não salvamos: um
 * campo precisa de correção", com o campo em questão perdido no meio de uma
 * lista de dezoito documentos.
 *
 * Estes testes cobram a exclusão na borda onde ela é barata. As outras duas
 * camadas continuam, e não são redundância: uma Server Action é um endpoint POST
 * alcançável sem passar por tela nenhuma.
 */

function par(valorInicial = "", marcadoInicial = false) {
  document.body.innerHTML = `
    <li>
      <input type="date" name="validade:fgts" />
      <input type="checkbox" name="semValidade:fgts" />
    </li>`;
  const data = document.querySelector<HTMLInputElement>('input[type="date"]')!;
  const semPrazo = document.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  data.value = valorInicial;
  semPrazo.checked = marcadoInicial;
  return { data, semPrazo };
}

describe("escolher um anula o outro", () => {
  it("informar a data desmarca `sem prazo`", () => {
    const { data, semPrazo } = par("", true);

    data.value = "2026-12-31";
    manterExclusivos("data", data, semPrazo);

    expect(semPrazo.checked).toBe(false);
    expect(data.value).toBe("2026-12-31");
  });

  it("marcar `sem prazo` apaga a data", () => {
    const { data, semPrazo } = par("2026-12-31", false);

    semPrazo.checked = true;
    manterExclusivos("semPrazo", data, semPrazo);

    expect(data.value).toBe("");
    expect(semPrazo.checked).toBe(true);
  });

  /**
   * A armadilha do desenho, e o motivo de `origem` existir.
   *
   * Sem ela, limpar um campo dispararia o handler do outro, que limparia o
   * primeiro de volta: o usuário marca "sem prazo", a data é apagada, o apagar
   * conta como mexer na data, e "sem prazo" desmarca sozinho. Fica tudo vazio e
   * ninguém entende por quê.
   *
   * Quem o usuário mexeu vence; o outro cede. Encadear as duas chamadas na
   * ordem que o navegador produziria precisa terminar com a escolha de pé.
   */
  it("a escolha do usuário sobrevive ao efeito que ela mesma provoca", () => {
    const { data, semPrazo } = par("2026-12-31", false);

    // O usuário marca "sem prazo".
    semPrazo.checked = true;
    manterExclusivos("semPrazo", data, semPrazo);
    // A limpeza da data reentrando pelo outro caminho, no pior caso.
    manterExclusivos("data", data, semPrazo);

    expect(semPrazo.checked, "`sem prazo` desmarcou sozinho").toBe(true);
    expect(data.value).toBe("");
  });

  /**
   * `type="date"` só reporta valor quando dia, mês e ano estão completos —
   * digitação parcial chega aqui como `""`. Desmarcar "sem prazo" nesse momento
   * seria desfazer uma escolha por causa de uma tecla.
   */
  it("data incompleta não desmarca nada", () => {
    const { data, semPrazo } = par("", true);

    manterExclusivos("data", data, semPrazo);

    expect(semPrazo.checked).toBe(true);
  });

  it("desmarcar `sem prazo` não mexe na data", () => {
    // Só a marcação apaga. Desmarcar é o usuário dizendo "tem prazo sim", e a
    // data que ele já tinha digitado antes precisa continuar lá.
    const { data, semPrazo } = par("2026-12-31", true);

    semPrazo.checked = false;
    manterExclusivos("semPrazo", data, semPrazo);

    expect(data.value).toBe("2026-12-31");
  });

  it("o par nunca termina com os dois preenchidos", () => {
    // A invariante, varrida sobre as quatro combinações de partida e as duas
    // origens — é ela que o banco e `leitura.ts` cobram do outro lado.
    for (const valor of ["", "2026-12-31"]) {
      for (const marcado of [false, true]) {
        for (const origem of ["data", "semPrazo"] as const) {
          const { data, semPrazo } = par(valor, marcado);
          manterExclusivos(origem, data, semPrazo);
          expect(
            data.value !== "" && semPrazo.checked,
            `partindo de valor=${JSON.stringify(valor)} marcado=${marcado} origem=${origem}`,
          ).toBe(false);
        }
      }
    }
  });
});
