// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { reaplicar } from "./preservarPreenchimento";

/**
 * O que o React 19 apaga a cada envio, e este arquivo devolve.
 *
 * `<form action={funcao}>` reseta o formulário em toda submissão: o React
 * agenda `requestFormReset(formFiber)` em `startHostTransition` ANTES de chamar
 * a ação, e o reset é aplicado no commit da transição. Todo campo não
 * controlado volta ao `defaultValue`.
 *
 * Para uma caixa de comentário está certo. Para o cadastro da empresa é o
 * defeito reportado em 17/08: as quatro etapas do assistente vivem no MESMO
 * formulário, então avançar da etapa 1 para a 2 esvaziava a etapa 1, e o envio
 * seguinte saía sem CNPJ, sem razão social e sem porte — recusado, com razão,
 * por "é obrigatório".
 *
 * O ambiente é `happy-dom` porque isto é manipulação de DOM de verdade: o valor
 * do teste está justamente em exercitar `form.elements`, `checked` e campos
 * repetidos, que é onde uma reimplementação erra.
 */

function montar(html: string): HTMLFormElement {
  document.body.innerHTML = `<form>${html}</form>`;
  return document.querySelector("form") as HTMLFormElement;
}

/** O que o React faria no commit: todo campo de volta ao `defaultValue`. */
function simularResetDoReact(formulario: HTMLFormElement): void {
  formulario.reset();
}

describe("o preenchimento volta depois do reset do React", () => {
  it("texto, área de texto e seleção", () => {
    const form = montar(`
      <input name="cnpj" />
      <input name="razaoSocial" />
      <textarea name="palavrasChave"></textarea>
      <select name="porte"><option value=""></option><option value="me">ME</option></select>
    `);

    const dados = new FormData();
    dados.set("cnpj", "07.462.953/0001-10");
    dados.set("razaoSocial", "Never Conservadora e Dedetizadora LTDA.");
    dados.set("palavrasChave", "dedetizacao, controle de pragas");
    dados.set("porte", "me");

    simularResetDoReact(form);
    expect((form.elements.namedItem("cnpj") as HTMLInputElement).value).toBe("");

    reaplicar(form, dados);

    expect((form.elements.namedItem("cnpj") as HTMLInputElement).value).toBe(
      "07.462.953/0001-10",
    );
    expect((form.elements.namedItem("razaoSocial") as HTMLInputElement).value).toBe(
      "Never Conservadora e Dedetizadora LTDA.",
    );
    expect((form.elements.namedItem("palavrasChave") as HTMLTextAreaElement).value).toBe(
      "dedetizacao, controle de pragas",
    );
    expect((form.elements.namedItem("porte") as HTMLSelectElement).value).toBe("me");
  });

  /**
   * Caixa desmarcada NÃO aparece em `FormData`. Então ausência aqui significa
   * desmarcar, e não "deixar como estava" — tratar as duas como a mesma coisa
   * faria uma UF que o usuário acabou de desmarcar voltar sozinha.
   */
  it("caixas de seleção: marca as que vieram e desmarca as que não vieram", () => {
    const form = montar(`
      <input type="checkbox" name="uf" value="RJ" checked />
      <input type="checkbox" name="uf" value="SP" />
      <input type="checkbox" name="uf" value="MG" checked />
    `);

    const dados = new FormData();
    dados.append("uf", "SP");
    dados.append("uf", "MG");

    simularResetDoReact(form);
    reaplicar(form, dados);

    const caixas = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="uf"]'));
    expect(caixas.map((c) => `${c.value}:${c.checked}`)).toEqual([
      "RJ:false",
      "SP:true",
      "MG:true",
    ]);
  });

  /**
   * O cadastro tem campos repetidos de propósito: `atestadoObjeto` aparece uma
   * vez por linha da lista. Distribuir por posição é o que impede as linhas de
   * trocarem de conteúdo entre si — um atestado de R$ 82 mil migrando para o
   * objeto errado é pior do que o campo em branco.
   */
  it("campos repetidos voltam para a própria linha", () => {
    const form = montar(`
      <input name="atestadoObjeto" /><input name="atestadoValor" />
      <input name="atestadoObjeto" /><input name="atestadoValor" />
      <input name="atestadoObjeto" /><input name="atestadoValor" />
    `);

    const dados = new FormData();
    for (const [objeto, valor] of [
      ["Dedetização de escolas", "82000"],
      ["Limpeza predial", "15000"],
      ["", ""],
    ]) {
      dados.append("atestadoObjeto", objeto);
      dados.append("atestadoValor", valor);
    }

    simularResetDoReact(form);
    reaplicar(form, dados);

    const objetos = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="atestadoObjeto"]'),
    ).map((c) => c.value);
    const valores = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="atestadoValor"]'),
    ).map((c) => c.value);

    expect(objetos).toEqual(["Dedetização de escolas", "Limpeza predial", ""]);
    expect(valores).toEqual(["82000", "15000", ""]);
  });

  /**
   * `intencao` (salvar / avançar / concluir) vem do BOTÃO que enviou, e botão
   * não é campo. Reaplicá-lo não faria sentido, e mexer num `<button>` como se
   * fosse controle de valor é o tipo de coisa que quebra em silêncio.
   */
  it("o botão de envio não é tocado", () => {
    const form = montar(`
      <input name="cnpj" />
      <button type="submit" name="intencao" value="avancar">Avançar</button>
    `);

    const dados = new FormData();
    dados.set("cnpj", "07462953000110");
    dados.set("intencao", "avancar");

    simularResetDoReact(form);
    reaplicar(form, dados);

    const botao = form.querySelector("button") as HTMLButtonElement;
    expect(botao.value).toBe("avancar");
    expect((form.elements.namedItem("cnpj") as HTMLInputElement).value).toBe("07462953000110");
  });

  /**
   * A etapa 4 do assistente tem o par "validade" + "não tem prazo" por tipo de
   * documento. É o caso em que caixa e texto compartilham a mesma seção e o
   * agrupamento por nome precisa acertar os dois.
   */
  it("o formulário inteiro sobrevive, com etapas escondidas junto", () => {
    const form = montar(`
      <div hidden>
        <input name="cnpj" />
        <select name="porte"><option value=""></option><option value="me">ME</option></select>
      </div>
      <div>
        <input type="checkbox" name="documento" value="fgts" />
        <input name="validade:fgts" type="date" />
        <input type="checkbox" name="semValidade:fgts" value="on" />
      </div>
    `);

    const dados = new FormData();
    dados.set("cnpj", "07462953000110");
    dados.set("porte", "me");
    dados.append("documento", "fgts");
    dados.set("validade:fgts", "2026-12-31");
    // `semValidade:fgts` ausente = desmarcado.

    simularResetDoReact(form);
    reaplicar(form, dados);

    expect((form.elements.namedItem("cnpj") as HTMLInputElement).value).toBe("07462953000110");
    expect((form.elements.namedItem("porte") as HTMLSelectElement).value).toBe("me");
    expect(
      (form.querySelector('input[name="documento"]') as HTMLInputElement).checked,
    ).toBe(true);
    expect((form.elements.namedItem("validade:fgts") as HTMLInputElement).value).toBe(
      "2026-12-31",
    );
    expect(
      (form.querySelector('input[name="semValidade:fgts"]') as HTMLInputElement).checked,
    ).toBe(false);
  });
});
