import { describe, expect, it } from "vitest";

import { lerRecortesDoFormulario, listaDeTermos, valorEmReais } from "./leitura";

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

const CIDADE = {
  "recorte-0-abrangencia": "municipio",
  "recorte-0-nome": "Minha cidade",
  "recorte-0-uf": "CE",
  "recorte-0-municipio-ibge": "2304400",
  "recorte-0-municipio-nome": "Fortaleza",
};

describe("listaDeTermos", () => {
  it("separa por vírgula, e não por espaço", () => {
    // "material de limpeza" é UM termo. Separar por espaço viraria três, e
    // "material" sozinho casa com "material hospitalar".
    expect(listaDeTermos("material de limpeza, pavimentação")).toEqual([
      "material de limpeza",
      "pavimentação",
    ]);
  });

  it("descarta entrada vazia e espaço sobrando", () => {
    expect(listaDeTermos(" asfalto ,, , drenagem ")).toEqual(["asfalto", "drenagem"]);
  });

  it("string vazia vira lista vazia", () => {
    expect(listaDeTermos("")).toEqual([]);
    expect(listaDeTermos("   ")).toEqual([]);
  });
});

describe("valorEmReais", () => {
  it("aceita o formato que gente digita", () => {
    expect(valorEmReais("500.000")).toBe(500000);
    expect(valorEmReais("500000")).toBe(500000);
    expect(valorEmReais("R$ 500.000,00")).toBe(500000);
    expect(valorEmReais("1.234,56")).toBe(1234.56);
  });

  it("vazio é null, e null é 'sem limite'", () => {
    // Zero seria um teto de zero reais, e nenhum edital passaria. A diferença
    // entre "sem limite" e "limite zero" é a diferença entre receber tudo e
    // não receber nada.
    expect(valorEmReais("")).toBeNull();
    expect(valorEmReais("  ")).toBeNull();
    expect(valorEmReais("abc")).toBeNull();
  });
});

describe("lerRecortesDoFormulario", () => {
  it("lê um recorte de município completo", () => {
    const leitura = lerRecortesDoFormulario(formulario(CIDADE));
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;

    expect(leitura.recortes).toHaveLength(1);
    expect(leitura.recortes[0].abrangencia).toEqual({
      tipo: "municipio",
      uf: "CE",
      codigoIbge: "2304400",
      nome: "Fortaleza",
    });
  });

  it("Brasil não exige estado nem município", () => {
    const leitura = lerRecortesDoFormulario(
      formulario({ "recorte-0-abrangencia": "brasil", "recorte-0-nome": "Brasil" }),
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.recortes[0].abrangencia).toEqual({ tipo: "brasil" });
  });

  it("município sem código IBGE não passa", () => {
    const leitura = lerRecortesDoFormulario(
      formulario({ ...CIDADE, "recorte-0-municipio-ibge": "" }),
    );
    expect(leitura.ok).toBe(false);
    if (leitura.ok) return;
    expect(leitura.erros["recorte-0-abrangencia"]).toMatch(/escolha o município/i);
  });

  it("índice com buraco no meio é lido, não é erro", () => {
    /*
     * O cliente apaga o recorte do meio e a tela reenvia 0 e 2. Presumir
     * índices contíguos perderia o terceiro recorte em silêncio, que é o pior
     * jeito: ele salva, some, e ninguém sabe dizer por quê.
     */
    const leitura = lerRecortesDoFormulario(
      formulario({
        ...CIDADE,
        "recorte-2-abrangencia": "brasil",
        "recorte-2-nome": "Brasil",
      }),
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.recortes).toHaveLength(2);
  });

  it("formulário vazio devolve lista vazia, não erro", () => {
    // Empresa que ainda não configurou não está errada, e o cliente precisa
    // poder apagar todos os recortes.
    const leitura = lerRecortesDoFormulario(formulario({}));
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.recortes).toEqual([]);
  });

  it("recusa mais do que o limite, mesmo num POST montado à mão", () => {
    /*
     * Esta é a defesa que não depende da tela. O botão "acrescentar" some no
     * terceiro, mas uma action é um endpoint POST alcançável sem passar pela
     * tela — o limite precisa valer aqui, antes da action e antes do banco.
     */
    const quatro: Record<string, string> = {};
    for (const [i, uf] of ["CE", "PE", "PB", "RN"].entries()) {
      quatro[`recorte-${i}-abrangencia`] = "uf";
      quatro[`recorte-${i}-uf`] = uf;
      quatro[`recorte-${i}-nome`] = `Recorte ${i}`;
    }

    const leitura = lerRecortesDoFormulario(formulario(quatro));
    expect(leitura.ok).toBe(false);
    if (leitura.ok) return;
    expect(leitura.erros.quantidade).toMatch(/são 4 recortes, e o plano permite 3/i);
  });

  it("cobra nome, porque é por ele que o cliente reconhece o alerta", () => {
    const leitura = lerRecortesDoFormulario(formulario({ ...CIDADE, "recorte-0-nome": "" }));
    expect(leitura.ok).toBe(false);
    if (leitura.ok) return;
    expect(leitura.erros["recorte-0-nome"]).toMatch(/nome/i);
  });

  it("recusa faixa de valor invertida", () => {
    const leitura = lerRecortesDoFormulario(
      formulario({
        ...CIDADE,
        "recorte-0-ticket-minimo": "500.000",
        "recorte-0-ticket-maximo": "100.000",
      }),
    );
    expect(leitura.ok).toBe(false);
    if (leitura.ok) return;
    expect(leitura.erros["recorte-0-ticket"]).toMatch(/mínimo/i);
  });

  it("recusa dois recortes cobrindo a mesma coisa", () => {
    const leitura = lerRecortesDoFormulario(
      formulario({
        ...CIDADE,
        "recorte-1-abrangencia": "municipio",
        "recorte-1-nome": "De novo",
        "recorte-1-uf": "CE",
        "recorte-1-municipio-ibge": "2304400",
      }),
    );
    expect(leitura.ok).toBe(false);
    if (leitura.ok) return;
    expect(leitura.erros.abrangencia).toMatch(/dois recortes/i);
  });

  it("a sigla do estado é normalizada para maiúscula", () => {
    const leitura = lerRecortesDoFormulario(
      formulario({ "recorte-0-abrangencia": "uf", "recorte-0-uf": "ce", "recorte-0-nome": "X" }),
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.recortes[0].abrangencia).toEqual({ tipo: "uf", uf: "CE" });
  });

  it("município sem nome cai para o código, em vez de recusar", () => {
    // Sem o nome a página fica feia; recusar deixaria o cliente sem conseguir
    // salvar por causa de um campo que é só rótulo.
    const leitura = lerRecortesDoFormulario(
      formulario({ ...CIDADE, "recorte-0-municipio-nome": "" }),
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    const a = leitura.recortes[0].abrangencia;
    expect(a.tipo === "municipio" && a.nome).toBe("2304400");
  });
});
