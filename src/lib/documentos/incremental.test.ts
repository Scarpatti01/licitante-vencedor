import { describe, expect, it } from "vitest";
import {
  assinarDocumentos,
  decidir,
  type DocumentoAnunciado,
  type EntradaDaDecisao,
} from "./incremental";

const AGORA = new Date("2026-08-15T12:00:00.000Z");

function doc(extra: Partial<DocumentoAnunciado> = {}): DocumentoAnunciado {
  return {
    sequencial: 1,
    titulo: "EDITAL.pdf",
    publicadoEm: "2026-08-01T10:00:00",
    ativo: true,
    ...extra,
  };
}

function entrada(extra: Partial<EntradaDaDecisao> = {}): EntradaDaDecisao {
  return {
    documentos: [doc()],
    registro: null,
    interessaAAlguem: true,
    encerramentoProposta: "2026-08-30T09:00:00.000Z",
    agora: AGORA,
    ...extra,
  };
}

describe("assinarDocumentos", () => {
  it("não muda com a ordem devolvida pela API", () => {
    /*
     * O ponto que vale os 93%: a ordem da lista não é garantida pelo PNCP. Se a
     * assinatura mudasse com ela, toda varredura pareceria alteração e o
     * download incremental devolveria exatamente o desperdício que existe para
     * cortar.
     */
    const a = [doc({ sequencial: 1 }), doc({ sequencial: 2, titulo: "ANEXO.pdf" })];
    const b = [doc({ sequencial: 2, titulo: "ANEXO.pdf" }), doc({ sequencial: 1 })];

    expect(assinarDocumentos(a)).toBe(assinarDocumentos(b));
  });

  it("muda quando entra documento novo", () => {
    const antes = [doc()];
    const depois = [doc(), doc({ sequencial: 2, titulo: "RETIFICACAO.pdf" })];

    expect(assinarDocumentos(antes)).not.toBe(assinarDocumentos(depois));
  });

  /*
   * O caso que mais importa e o menos óbvio: retificação costuma vir como o
   * MESMO título e sequencial, republicado. Sem a data na assinatura, o
   * conteúdo novo passaria batido — e prazo alterado é justamente o que não
   * pode passar batido.
   */
  it("muda quando o mesmo documento é republicado", () => {
    const antes = [doc({ publicadoEm: "2026-08-01T10:00:00" })];
    const depois = [doc({ publicadoEm: "2026-08-14T16:30:00" })];

    expect(assinarDocumentos(antes)).not.toBe(assinarDocumentos(depois));
  });

  it("ignora documento inativo", () => {
    // Inativo não será baixado; deixá-lo influenciar provocaria redownload dos
    // outros sem nenhum ganho.
    const so = [doc()];
    const comInativo = [doc(), doc({ sequencial: 9, titulo: "ANTIGO.pdf", ativo: false })];

    expect(assinarDocumentos(so)).toBe(assinarDocumentos(comInativo));
  });
});

describe("decidir", () => {
  it("baixa o que nunca foi baixado", () => {
    expect(decidir(entrada())).toEqual({ baixar: true, motivo: "nunca-baixado" });
  });

  it("não baixa de novo quando nada mudou", () => {
    const documentos = [doc()];
    const registro = { assinatura: assinarDocumentos(documentos), baixadoEm: "2026-08-14T07:00:00Z" };

    expect(decidir(entrada({ documentos, registro }))).toEqual({
      baixar: false,
      motivo: "ja-temos",
    });
  });

  it("baixa de novo quando a lista muda", () => {
    const registro = { assinatura: assinarDocumentos([doc()]), baixadoEm: "2026-08-14T07:00:00Z" };
    const documentos = [doc(), doc({ sequencial: 2, titulo: "RETIFICACAO.pdf" })];

    expect(decidir(entrada({ documentos, registro }))).toEqual({
      baixar: true,
      motivo: "documentos-mudaram",
    });
  });

  it("não baixa edital que ninguém veria", () => {
    // Quem decide isto é a triagem. Baixar 4 MB de um edital fora do perfil de
    // toda a carteira é gasto pelo gasto.
    expect(decidir(entrada({ interessaAAlguem: false }))).toEqual({
      baixar: false,
      motivo: "fora-da-triagem",
    });
  });

  it("não baixa edital sem documento publicado", () => {
    expect(decidir(entrada({ documentos: [] }))).toEqual({
      baixar: false,
      motivo: "sem-documento",
    });
    expect(decidir(entrada({ documentos: [doc({ ativo: false })] }))).toEqual({
      baixar: false,
      motivo: "sem-documento",
    });
  });

  describe("certame encerrado", () => {
    it("não baixa depois do encerramento", () => {
      expect(
        decidir(entrada({ encerramentoProposta: "2026-08-14T09:00:00.000Z" })),
      ).toEqual({ baixar: false, motivo: "encerrado" });
    });

    /*
     * A comparação é com o INSTANTE, não com o dia: um pregão que fecha às 9h
     * já não aceita proposta às 10h, e baixar para analisar o que não dá mais
     * para disputar é gasto puro.
     */
    it("respeita a hora, não só a data", () => {
      const mesmoDiaAntes = decidir(entrada({ encerramentoProposta: "2026-08-15T18:00:00.000Z" }));
      const mesmoDiaDepois = decidir(entrada({ encerramentoProposta: "2026-08-15T09:00:00.000Z" }));

      expect(mesmoDiaAntes.baixar).toBe(true);
      expect(mesmoDiaDepois).toEqual({ baixar: false, motivo: "encerrado" });
    });

    it("encerramento vence a triagem — é a porta mais barata", () => {
      // Nem precisa perguntar se interessa: não interessa a ninguém disputar o
      // que já fechou.
      expect(
        decidir(entrada({ encerramentoProposta: "2026-01-01T00:00:00.000Z", interessaAAlguem: true })),
      ).toEqual({ baixar: false, motivo: "encerrado" });
    });

    it.each([null, "", "ontem", "2026-13-45"])(
      "data ilegível (%s) não encerra nada — na dúvida, segue",
      (valor) => {
        // Descartar por campo malformado esconderia oportunidade real, que é o
        // erro caro. O barato é baixar um edital a mais.
        expect(decidir(entrada({ encerramentoProposta: valor })).baixar).toBe(true);
      },
    );
  });

  /**
   * A economia inteira, num teste só.
   *
   * Medido em 709 editais reais: janela mediana de 14,7 dias, ou seja o mesmo
   * edital reaparece em ~15 varreduras. Este teste simula isso e exige que
   * apenas a primeira baixe.
   */
  it("quinze varreduras do mesmo edital resultam em UM download", () => {
    const documentos = [doc(), doc({ sequencial: 2, titulo: "TERMO.pdf" })];
    let registro = null as EntradaDaDecisao["registro"];
    let downloads = 0;

    for (let dia = 0; dia < 15; dia++) {
      const agora = new Date(AGORA.getTime() + dia * 86_400_000);
      const d = decidir(entrada({ documentos, registro, agora, encerramentoProposta: null }));
      if (d.baixar) {
        downloads++;
        registro = { assinatura: assinarDocumentos(documentos), baixadoEm: agora.toISOString() };
      }
    }

    expect(downloads).toBe(1);
  });
});
