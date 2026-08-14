import { describe, expect, it } from "vitest";
import { edital } from "../fontes/fixtures";
import { selecionarParaLead } from "./lead";
import { interpretarRegiao } from "./regiao";

/**
 * As garantias do alerta diário do lead. Duas delas, se quebrarem, quebram em
 * silêncio — o e-mail continua saindo, só que errado:
 *
 *   repetir edital já enviado (a lista morre de tédio, sem ninguém cancelar);
 *   alertar sobre certame encerrado (o e-mail mais irritante possível).
 */

const agora = new Date("2026-08-14T09:00:00-03:00");
const recife = interpretarRegiao("Recife/PE")!;

/** Edital em Recife encerrando em N dias a partir de `agora`. */
function emRecife(id: string, diasParaEncerrar: number, over = {}) {
  const encerra = new Date(agora);
  encerra.setDate(encerra.getDate() + diasParaEncerrar);
  return edital({
    id,
    local: { uf: "PE", municipio: "Recife", municipioSlug: "recife", codigoIbge: "2611606" },
    encerramentoProposta: encerra.toISOString(),
    ...over,
  });
}

const nenhum = new Set<string>();

describe("selecionarParaLead", () => {
  it("fica só com os editais da região pedida", () => {
    const olinda = edital({
      id: "olinda-1",
      local: { uf: "PE", municipio: "Olinda", municipioSlug: "olinda", codigoIbge: "2609600" },
    });

    const selecao = selecionarParaLead([emRecife("recife-1", 10), olinda], recife, nenhum, undefined, agora);

    expect(selecao.itens.map((i) => i.edital.id)).toEqual(["recife-1"]);
  });

  it("respeita a UF: mesmo nome em outro estado não entra", () => {
    const santaLuziaMg = interpretarRegiao("Santa Luzia/MG")!;
    const noPara = edital({
      id: "pa-1",
      local: { uf: "PA", municipio: "Santa Luzia do Pará", municipioSlug: "santa-luzia", codigoIbge: "1506559" },
    });

    expect(selecionarParaLead([noPara], santaLuziaMg, nenhum, undefined, agora).vazio).toBe(true);
  });

  it("nunca repete edital já enviado", () => {
    /*
     * A garantia central do alerta diário. Um edital publicado hoje continua
     * aberto amanhã: sem esta exclusão, o e-mail de terça é o de segunda de
     * novo, e o de quarta idêntico ao de terça.
     */
    const editais = [emRecife("ja-foi", 10), emRecife("novo", 12)];
    const selecao = selecionarParaLead(editais, recife, new Set(["ja-foi"]), undefined, agora);

    expect(selecao.itens.map((i) => i.edital.id)).toEqual(["novo"]);
  });

  it("não alerta sobre certame encerrado", () => {
    const selecao = selecionarParaLead([emRecife("passou", -1)], recife, nenhum, undefined, agora);
    expect(selecao.vazio).toBe(true);
  });

  it("mantém o que encerra hoje", () => {
    // Encerra hoje ainda é acionável para quem tem a documentação pronta.
    // Cortar seria decidir pela pessoa.
    const selecao = selecionarParaLead([emRecife("hoje", 0)], recife, nenhum, undefined, agora);
    expect(selecao.itens).toHaveLength(1);
    expect(selecao.itens[0].diasParaEncerrar).toBe(0);
  });

  it("ordena por prazo mais curto primeiro", () => {
    // Quem decide o que a pessoa ainda consegue fazer é o relógio, não o valor:
    // o edital grande de 30 dias volta amanhã, o pequeno de 2 dias não volta.
    const editais = [emRecife("longe", 20), emRecife("perto", 2), emRecife("medio", 8)];
    const selecao = selecionarParaLead(editais, recife, nenhum, undefined, agora);

    expect(selecao.itens.map((i) => i.edital.id)).toEqual(["perto", "medio", "longe"]);
  });

  it("desempata prazo igual pelo maior valor, ignorando valor suspeito", () => {
    const editais = [
      emRecife("pequeno", 5, { valorEstimado: 10_000 }),
      emRecife("absurdo", 5, { valorEstimado: 77_840_000_000, valorSuspeito: true }),
      emRecife("grande", 5, { valorEstimado: 900_000 }),
    ];

    const selecao = selecionarParaLead(editais, recife, nenhum, undefined, agora);

    // O de R$ 77,84 bi é erro de digitação do órgão (caso real do piloto). Ele
    // aparece no e-mail, mas não pode encabeçar a lista de ninguém.
    expect(selecao.itens.map((i) => i.edital.id)).toEqual(["grande", "pequeno", "absurdo"]);
  });

  it("põe por último o edital sem data de encerramento", () => {
    const editais = [
      emRecife("sem-data", 5, { encerramentoProposta: null }),
      emRecife("com-data", 9),
    ];

    const selecao = selecionarParaLead(editais, recife, nenhum, undefined, agora);

    expect(selecao.itens.map((i) => i.edital.id)).toEqual(["com-data", "sem-data"]);
    expect(selecao.itens[1].diasParaEncerrar).toBeNull();
  });

  it("corta no teto e conta os excedentes", () => {
    const editais = Array.from({ length: 9 }, (_, i) => emRecife(`e-${i}`, i + 1));
    const selecao = selecionarParaLead(editais, recife, nenhum, { maximoPorEnvio: 5, minimoDeDias: 0 }, agora);

    expect(selecao.itens).toHaveLength(5);
    // O rodapé do e-mail diz quantos ficaram de fora. Sem isso, quem viu 5 de 9
    // conclui que a região dele é fraca — quando o que viu foi uma lista cortada.
    expect(selecao.excedentes).toBe(4);
  });

  it("vazio é resultado de primeira classe, não erro", () => {
    // As boas-vindas prometem: dia sem edital novo é dia sem e-mail.
    const selecao = selecionarParaLead([], recife, nenhum, undefined, agora);
    expect(selecao).toMatchObject({ itens: [], excedentes: 0, vazio: true });
  });
});
