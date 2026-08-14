import { describe, expect, it } from "vitest";
import { interpretarRegiao, localCasaComRegiao } from "./regiao";

/**
 * O filtro geográfico é a única promessa do alerta gratuito, e este arquivo
 * guarda os dois jeitos de quebrá-la:
 *
 *   mandar o edital errado — quem recebe certame de outro estado conclui que o
 *   filtro não funciona, e o segundo e-mail já não é lido;
 *
 *   não mandar nada por não entender o texto — que é uma falha mais barata, e é
 *   por isso que a dúvida resolve para `null`.
 */

describe("interpretarRegiao", () => {
  it("lê o nome puro", () => {
    expect(interpretarRegiao("Recife")).toMatchObject({ municipioSlug: "recife", uf: null });
  });

  it("normaliza acento, cedilha e caixa", () => {
    // O PNCP publica "SÃO PAULO", "São Paulo" e "Sao Paulo" para o mesmo lugar.
    for (const escrito of ["São Paulo", "SAO PAULO", "são paulo", "  São Paulo  "]) {
      expect(interpretarRegiao(escrito)?.municipioSlug).toBe("sao-paulo");
    }
  });

  it.each([
    ["Recife/PE", "recife", "PE"],
    ["Recife - PE", "recife", "PE"],
    ["Recife, PE", "recife", "PE"],
    ["recife/pe", "recife", "PE"],
    ["São Bernardo do Campo/SP", "sao-bernardo-do-campo", "SP"],
  ])("separa cidade e UF em %s", (escrito, slug, uf) => {
    expect(interpretarRegiao(escrito)).toMatchObject({ municipioSlug: slug, uf });
  });

  it("não quebra nome hifenizado ao meio", () => {
    // `-` só é separador quando o que vem depois é UF de verdade. Sem essa
    // exigência, "Mogi-Guaçu" viraria "Mogi" e casaria com município nenhum.
    expect(interpretarRegiao("Mogi-Guaçu")).toMatchObject({
      municipioSlug: "mogi-guacu",
      uf: null,
    });
    expect(interpretarRegiao("Mogi-Guaçu - SP")).toMatchObject({
      municipioSlug: "mogi-guacu",
      uf: "SP",
    });
  });

  it("não trata sufixo de duas letras como UF quando não é UF", () => {
    // "Bar do Zé - SP" tem UF; "Cabo Frio - XY" não tem, e XY não pode virar UF
    // só por ter duas letras.
    expect(interpretarRegiao("Cabo Frio - XY")).toMatchObject({
      municipioSlug: "cabo-frio-xy",
      uf: null,
    });
  });

  it.each([
    "região metropolitana de Recife",
    "regiao metropolitana do Recife",
    "Grande São Paulo",
    "todo o estado de Pernambuco",
    "Recife e região",
    "interior de São Paulo",
  ])("recusa pedido amplo: %s", (escrito) => {
    // Casaria com uma cidade por coincidência de texto e entregaria menos do que
    // a pessoa pediu. Melhor `null` e alguém olhar.
    expect(interpretarRegiao(escrito)).toBeNull();
  });

  it.each([null, undefined, "", "   ", "a"])("recusa entrada vazia ou curta demais: %s", (escrito) => {
    expect(interpretarRegiao(escrito)).toBeNull();
  });

  it("recusa frase — não é nome de cidade", () => {
    expect(
      interpretarRegiao("quero receber tudo que aparecer perto de mim por favor obrigado"),
    ).toBeNull();
  });

  it("guarda o texto original sem tocar", () => {
    // Vai para relatório e para suporte: é o que a pessoa de fato digitou.
    expect(interpretarRegiao("  São Paulo/SP ")?.original).toBe("São Paulo/SP");
  });

  describe("rotulo — o que aparece no assunto do e-mail", () => {
    it.each([
      ["recife/pe", "Recife/PE"],
      ["RECIFE - PE", "Recife/PE"],
      ["são paulo/sp", "São Paulo/SP"],
      ["Recife", "Recife"],
    ])("arruma a caixa de %s", (escrito, esperado) => {
      // "2 editais abertos em recife/pe" lê como defeito do sistema, na linha
      // de maior visibilidade do produto.
      expect(interpretarRegiao(escrito)?.rotulo).toBe(esperado);
    });

    it("mantém conectivo minúsculo no meio do nome", () => {
      expect(interpretarRegiao("mogi das cruzes/sp")?.rotulo).toBe("Mogi das Cruzes/SP");
      expect(interpretarRegiao("santa bárbara d'oeste")?.rotulo).toBe("Santa Bárbara d'Oeste");
    });

    it("sobe a letra depois do hífen", () => {
      // Sem tratar o hífen o resultado seria "Mogi-guaçu" — pior que não mexer.
      expect(interpretarRegiao("mogi-guaçu")?.rotulo).toBe("Mogi-Guaçu");
    });

    it("não inventa acento que o visitante não escreveu", () => {
      // Corrigir "sao paulo" para "São Paulo" exigiria um dicionário. O que dá
      // para fazer sem inventar é a caixa.
      expect(interpretarRegiao("sao paulo/sp")?.rotulo).toBe("Sao Paulo/SP");
    });
  });
});

describe("localCasaComRegiao", () => {
  const recifePe = { municipioSlug: "recife", uf: "PE" };

  it("casa por slug quando não há UF pedida", () => {
    expect(localCasaComRegiao(recifePe, interpretarRegiao("Recife")!)).toBe(true);
  });

  it("casa com UF igual", () => {
    expect(localCasaComRegiao(recifePe, interpretarRegiao("Recife/PE")!)).toBe(true);
  });

  it("a UF informada é eliminatória", () => {
    /*
     * O erro mais caro deste produto. "Santa Luzia" é município em oito estados;
     * sem esta linha, quem pediu Santa Luzia/MG receberia o edital de Santa
     * Luzia/PA — um acerto de texto que destrói a confiança no filtro inteiro.
     */
    const santaLuziaPa = { municipioSlug: "santa-luzia", uf: "PA" };
    expect(localCasaComRegiao(santaLuziaPa, interpretarRegiao("Santa Luzia/MG")!)).toBe(false);
    expect(localCasaComRegiao(santaLuziaPa, interpretarRegiao("Santa Luzia")!)).toBe(true);
  });

  it("não casa município diferente", () => {
    expect(localCasaComRegiao(recifePe, interpretarRegiao("Olinda")!)).toBe(false);
  });
});
