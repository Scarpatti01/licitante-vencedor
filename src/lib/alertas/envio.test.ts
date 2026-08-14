import { describe, expect, it } from "vitest";
import { edital } from "../fontes/fixtures";
import { planejarEnvio } from "./envio";

/**
 * A decisão de quem recebe e-mail hoje, ponta a ponta — do texto que o visitante
 * digitou no formulário até a mensagem pronta.
 *
 * É o caminho que o script de envio percorre. Ele mora aqui, e não lá, para
 * existir este arquivo.
 */

const agora = new Date("2026-08-14T09:00:00-03:00");

function emRecife(id: string, dias: number) {
  const encerra = new Date(agora);
  encerra.setDate(encerra.getDate() + dias);
  return edital({
    id,
    local: { uf: "PE", municipio: "Recife", municipioSlug: "recife", codigoIbge: "2611606" },
    encerramentoProposta: encerra.toISOString(),
  });
}

const lead = { email: "cliente@exemplo.com.br", cidade: "Recife/PE", token: "t".repeat(30) };

describe("planejarEnvio", () => {
  it("monta o e-mail quando há edital novo na região", () => {
    const plano = planejarEnvio(lead, [emRecife("a", 3), emRecife("b", 7)], new Set(), agora);

    expect(plano.tipo).toBe("enviar");
    if (plano.tipo !== "enviar") return;
    expect(plano.conteudo.assunto).toBe("2 editais abertos em Recife/PE");
    expect(plano.editaisIds).toEqual(["a", "b"]);
  });

  it("os ids gravados são exatamente os que entraram no e-mail", () => {
    /*
     * Registrar um edital que não entrou na mensagem produz silêncio permanente
     * sobre ele: consta como enviado, então nunca mais é escolhido, e o lead
     * nunca soube que existia.
     */
    const editais = Array.from({ length: 9 }, (_, i) => emRecife(`e-${i}`, i + 1));
    const plano = planejarEnvio(lead, editais, new Set(), agora);

    if (plano.tipo !== "enviar") throw new Error("esperava enviar");
    expect(plano.editaisIds).toHaveLength(5);
    // Cada id gravado aparece como bloco na mensagem: 5 ids, 5 blocos.
    expect(plano.conteudo.listas).toHaveLength(plano.editaisIds.length);
  });

  it("não envia quando tudo já foi enviado antes", () => {
    const plano = planejarEnvio(lead, [emRecife("a", 3)], new Set(["a"]), agora);
    expect(plano.tipo).toBe("sem-novidade");
  });

  it("não envia quando não há edital na região", () => {
    const olinda = edital({
      id: "o-1",
      local: { uf: "PE", municipio: "Olinda", municipioSlug: "olinda", codigoIbge: "2609600" },
    });
    expect(planejarEnvio(lead, [olinda], new Set(), agora).tipo).toBe("sem-novidade");
  });

  it("separa cidade ilegível de ausência de editais", () => {
    // São coisas diferentes para quem opera: uma é o produto funcionando, a
    // outra é um cadastro que nunca vai receber nada até alguém olhar.
    const plano = planejarEnvio(
      { ...lead, cidade: "região metropolitana de Recife" },
      [emRecife("a", 3)],
      new Set(),
      agora,
    );

    expect(plano).toEqual({ tipo: "regiao-ilegivel", textoDaCidade: "região metropolitana de Recife" });
  });

  it("lead sem cidade nunca vira envio", () => {
    // Sem região o alerta seria "todos os editais do Brasil", que não é o
    // produto que ninguém pediu.
    expect(planejarEnvio({ ...lead, cidade: null }, [emRecife("a", 3)], new Set(), agora).tipo).toBe(
      "regiao-ilegivel",
    );
  });

  it("leva o token de descadastro do lead para o rodapé", () => {
    const plano = planejarEnvio(lead, [emRecife("a", 3)], new Set(), agora);
    if (plano.tipo !== "enviar") throw new Error("esperava enviar");

    expect(plano.conteudo.rodape.descadastro).toContain(lead.token);
    expect(plano.conteudo.rodape.cadastradoComo).toBe(lead.email);
  });
});
