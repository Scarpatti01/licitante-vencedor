import { afterEach, describe, expect, it, vi } from "vitest";
import { baixarDocumento, listarDocumentos, partesDoId } from "./pncp";
import type { EditalParaProcessar } from "./processar";

const EDITAL: EditalParaProcessar = {
  id: "x",
  idNaFonte: "30391653000100-1-000014/2026",
  encerramentoProposta: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("partesDoId", () => {
  it("quebra o identificador do PNCP em CNPJ, ano e sequencial", () => {
    expect(partesDoId("30391653000100-1-000014/2026")).toEqual({
      cnpj: "30391653000100",
      ano: "2026",
      sequencial: 14,
    });
  });

  /*
   * O detalhe que custou uma sondagem: a API responde 404 para `/000014` e 200
   * para `/14`. Se os zeros à esquerda voltarem, todo download passa a falhar —
   * e falharia como "documento não encontrado", que manda investigar o lugar
   * errado.
   */
  it("derruba os zeros à esquerda do sequencial", () => {
    expect(partesDoId("30391653000100-1-000014/2026")?.sequencial).toBe(14);
    expect(partesDoId("30391653000100-1-001371/2026")?.sequencial).toBe(1371);
  });

  it.each([
    ["", "vazio"],
    ["sem-barra", "sem ano"],
    ["30391653000100/2026", "sem as partes do meio"],
    ["123-1-14/2026", "CNPJ curto"],
    ["30391653000100-1-14/26", "ano curto"],
    ["30391653000100-1-abc/2026", "sequencial não numérico"],
  ])("recusa %s (%s)", (id) => {
    expect(partesDoId(id)).toBeNull();
  });
});

describe("listarDocumentos", () => {
  it("normaliza as linhas da API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              sequencialDocumento: 1,
              titulo: "EDITAL",
              dataPublicacaoPncp: "2026-07-03T18:23:44",
              statusAtivo: true,
            },
          ]),
        ),
      ),
    );

    expect(await listarDocumentos(EDITAL)).toEqual([
      { sequencial: 1, titulo: "EDITAL", publicadoEm: "2026-07-03T18:23:44", ativo: true },
    ]);
  });

  it("descarta linha sem sequencial — não é endereçável para download", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ titulo: "sem sequencial" }, { sequencialDocumento: 2 }]))),
    );

    const docs = await listarDocumentos(EDITAL);
    expect(docs).toHaveLength(1);
    expect(docs[0].sequencial).toBe(2);
  });

  it("campo ausente não desativa documento", async () => {
    // Tratar ausência como inativo esconderia anexo — só `false` explícito
    // desativa.
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ sequencialDocumento: 1 }]))));

    const docs = await listarDocumentos(EDITAL);
    expect(docs[0].ativo).toBe(true);
    expect(docs[0].titulo).toBe("documento-1");
  });

  it("propaga o status quando o PNCP recusa", async () => {
    // Quem trata é `processarEdital`, que separa falha de rede de ausência de
    // documento; aqui só não se pode engolir.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("fora", { status: 503 })));

    await expect(listarDocumentos(EDITAL)).rejects.toThrow(/503/);
  });

  it("identificador malformado falha com nome, antes de qualquer requisição", async () => {
    const buscar = vi.fn(async () => new Response("[]"));
    vi.stubGlobal("fetch", buscar);

    await expect(listarDocumentos({ ...EDITAL, idNaFonte: "lixo" })).rejects.toThrow(/formato esperado/);
    expect(buscar).not.toHaveBeenCalled();
  });
});

describe("baixarDocumento", () => {
  it("monta o endereço com o sequencial do documento", async () => {
    let pedida = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        pedida = String(url);
        return new Response(new Uint8Array([1, 2, 3]));
      }),
    );

    const bytes = await baixarDocumento(EDITAL, {
      sequencial: 7,
      titulo: "ANEXO",
      publicadoEm: null,
      ativo: true,
    });

    expect(pedida).toBe(
      "https://pncp.gov.br/api/pncp/v1/orgaos/30391653000100/compras/2026/14/arquivos/7",
    );
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
  });
});
