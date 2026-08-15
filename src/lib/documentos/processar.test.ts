import { describe, expect, it, vi } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { assinarDocumentos, type DocumentoAnunciado } from "./incremental";
import {
  processarEdital,
  processarFila,
  type EditalParaProcessar,
  type Portas,
  type ResultadoDoEdital,
} from "./processar";

const AGORA = new Date("2026-08-15T12:00:00.000Z");

const EDITAL: EditalParaProcessar = {
  id: "pncp:30391653000100-1-000014/2026",
  idNaFonte: "30391653000100-1-000014/2026",
  encerramentoProposta: "2026-08-30T09:00:00.000Z",
};

function anunciado(extra: Partial<DocumentoAnunciado> = {}): DocumentoAnunciado {
  return { sequencial: 1, titulo: "EDITAL.pdf", publicadoEm: "2026-08-01T10:00:00", ativo: true, ...extra };
}

/** PDF mínimo com texto suficiente — mesma construção de `extrair.test.ts`. */
function pdf(texto = "EDITAL DE PREGAO ELETRONICO OBJETO AQUISICAO DE MATERIAL DE EXPEDIENTE"): Uint8Array {
  const conteudo = Array.from({ length: 3 }, (_, i) => `BT /F1 12 Tf 40 ${700 - i * 14} Td (${texto}) Tj ET`).join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let s = "%PDF-1.4\n";
  const offs: number[] = [];
  objetos.forEach((o, i) => { offs.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = s.length;
  s += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offs) s += `${String(o).padStart(10, "0")} 00000 n \n`;
  s += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return strToU8(s);
}

function portas(extra: Partial<Portas> = {}): Portas {
  return {
    listar: async () => [anunciado()],
    baixar: async () => pdf(),
    registro: async () => null,
    interessaAAlguem: async () => true,
    ...extra,
  };
}

describe("processarEdital", () => {
  it("lista, decide, baixa e extrai", async () => {
    const r = await processarEdital(EDITAL, portas(), AGORA);

    expect(r.processado).toBe(true);
    if (r.processado) {
      expect(r.documentos).toHaveLength(1);
      expect(r.documentos[0].extracao.ok).toBe(true);
      expect(r.paginas).toBe(1);
      expect(r.caracteres).toBeGreaterThan(0);
    }
  });

  /**
   * A economia inteira, do lado da orquestração.
   *
   * Medido: ~93,2% das varreduras caem neste caso. O teste exige que `baixar`
   * NÃO seja chamado — é a diferença entre economizar e apenas dizer que
   * economiza.
   */
  it("não baixa nada quando a assinatura não mudou", async () => {
    const documentos = [anunciado()];
    const baixar = vi.fn(async () => pdf());

    const r = await processarEdital(
      EDITAL,
      portas({
        listar: async () => documentos,
        baixar,
        registro: async () => ({
          assinatura: assinarDocumentos(documentos),
          baixadoEm: "2026-08-14T07:00:00Z",
        }),
      }),
      AGORA,
    );

    expect(r).toMatchObject({ processado: false, motivo: "ja-temos" });
    expect(baixar).not.toHaveBeenCalled();
  });

  it("baixa de novo quando um anexo é republicado", async () => {
    const baixar = vi.fn(async () => pdf());
    const antes = [anunciado({ publicadoEm: "2026-08-01T10:00:00" })];

    const r = await processarEdital(
      EDITAL,
      portas({
        listar: async () => [anunciado({ publicadoEm: "2026-08-14T16:00:00" })],
        baixar,
        registro: async () => ({ assinatura: assinarDocumentos(antes), baixadoEm: "2026-08-02T07:00:00Z" }),
      }),
      AGORA,
    );

    expect(r).toMatchObject({ processado: true });
    expect(baixar).toHaveBeenCalledTimes(1);
  });

  it("não baixa edital fora da triagem", async () => {
    const baixar = vi.fn(async () => pdf());
    const r = await processarEdital(EDITAL, portas({ interessaAAlguem: async () => false, baixar }), AGORA);

    expect(r).toMatchObject({ processado: false, motivo: "fora-da-triagem" });
    expect(baixar).not.toHaveBeenCalled();
  });

  it("não baixa edital encerrado", async () => {
    const baixar = vi.fn(async () => pdf());
    const r = await processarEdital(
      { ...EDITAL, encerramentoProposta: "2026-08-14T09:00:00.000Z" },
      portas({ baixar }),
      AGORA,
    );

    expect(r).toMatchObject({ processado: false, motivo: "encerrado" });
    expect(baixar).not.toHaveBeenCalled();
  });

  /*
   * "Lista indisponível" e "sem documento" levam a ações opostas: a primeira é
   * para tentar de novo amanhã, a segunda é um fato sobre o edital. Achatá-las
   * faria a fila desistir de um edital que só teve azar de rede.
   */
  it("separa falha de rede de ausência de documento", async () => {
    const rede = await processarEdital(
      EDITAL,
      portas({ listar: async () => { throw new Error("PNCP respondeu 503"); } }),
      AGORA,
    );
    expect(rede).toMatchObject({ processado: false, motivo: "lista-indisponivel" });
    if (!rede.processado) expect(rede.detalhe).toContain("503");

    const vazio = await processarEdital(EDITAL, portas({ listar: async () => [] }), AGORA);
    expect(vazio).toMatchObject({ processado: false, motivo: "sem-documento" });
  });

  it("um anexo que falha não derruba os outros", async () => {
    // Mesma lição que a coleta por UF aprendeu quando o PNCP caiu no piloto.
    const r = await processarEdital(
      EDITAL,
      portas({
        listar: async () => [anunciado({ sequencial: 1 }), anunciado({ sequencial: 2, titulo: "ANEXO.pdf" })],
        baixar: async (_e, d) => {
          if (d.sequencial === 2) throw new Error("conexão caiu");
          return pdf();
        },
      }),
      AGORA,
    );

    expect(r.processado).toBe(true);
    if (r.processado) {
      expect(r.documentos).toHaveLength(2);
      expect(r.documentos[0].extracao.ok).toBe(true);
      expect(r.documentos[1].extracao.ok).toBe(false);
      expect(r.recusas.ilegivel).toBe(1);
    }
  });

  it("conta as recusas por motivo, em vez de só somar falhas", async () => {
    const r = await processarEdital(
      EDITAL,
      portas({
        listar: async () => [anunciado({ sequencial: 1 }), anunciado({ sequencial: 2, titulo: "anexos.rar" })],
        baixar: async (_e, d) =>
          d.sequencial === 2 ? new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]) : pdf(),
      }),
      AGORA,
    );

    // Saber que foi `.rar` e não digitalizado é o que separa "contratar OCR" de
    // "não vale a pena" — um número só apagaria a decisão.
    if (r.processado) expect(r.recusas).toEqual({ "formato-nao-suportado": 1 });
  });

  it("abre zip vindo da fonte, recuperando os 18%", async () => {
    const r = await processarEdital(
      EDITAL,
      portas({
        listar: async () => [anunciado({ titulo: "documentos.zip" })],
        baixar: async () => zipSync({ "edital.pdf": pdf() }),
      }),
      AGORA,
    );

    expect(r.processado).toBe(true);
    if (r.processado) expect(r.documentos[0].extracao.ok).toBe(true);
  });

  /*
   * Gravar a assinatura da lista PEDIDA, e não da processada, faria uma rodada
   * interrompida no meio parecer completa na seguinte — e o edital ficaria com
   * metade dos anexos para sempre, sem nada indicando isso.
   */
  it("grava a assinatura do que foi de fato processado", async () => {
    // Tipado com a assinatura real da porta: sem os parâmetros declarados, o
    // TypeScript infere tupla vazia e `calls[0][1]` deixa de existir.
    const gravar = vi.fn(async (_e: EditalParaProcessar, _r: ResultadoDoEdital) => {});
    const documentos = [anunciado(), anunciado({ sequencial: 2, titulo: "ANEXO.pdf" })];

    await processarEdital(EDITAL, portas({ listar: async () => documentos, gravar }), AGORA);

    expect(gravar).toHaveBeenCalledTimes(1);
    const resultado = gravar.mock.calls[0][1];
    expect(resultado.processado && resultado.assinatura).toBe(assinarDocumentos(documentos));
  });

  it("não grava nada quando não processou", async () => {
    const gravar = vi.fn(async (_e: EditalParaProcessar, _r: ResultadoDoEdital) => {});
    await processarEdital(EDITAL, portas({ interessaAAlguem: async () => false, gravar }), AGORA);
    expect(gravar).not.toHaveBeenCalled();
  });
});

describe("processarFila", () => {
  it("resume o que passou e o que foi pulado, com o motivo", async () => {
    const editais: EditalParaProcessar[] = [
      { ...EDITAL, id: "a" },
      { ...EDITAL, id: "b" },
      { ...EDITAL, id: "c", encerramentoProposta: "2026-01-01T00:00:00.000Z" },
    ];

    const resumo = await processarFila(
      editais,
      portas({ interessaAAlguem: async (e) => e.id !== "b" }),
      undefined,
      AGORA,
    );

    expect(resumo.editais).toBe(3);
    expect(resumo.processados).toBe(1);
    // O diagnóstico da economia: sem o motivo, "pulei 2" não diz se foi
    // acerto ou defeito.
    expect(resumo.pulados).toEqual({ "fora-da-triagem": 1, encerrado: 1 });
    expect(resumo.paginas).toBe(1);
  });

  it("um edital que quebra não interrompe a fila", async () => {
    let chamadas = 0;
    const resumo = await processarFila(
      [{ ...EDITAL, id: "a" }, { ...EDITAL, id: "b" }, { ...EDITAL, id: "c" }],
      portas({
        listar: async () => {
          chamadas++;
          if (chamadas === 2) throw new Error("timeout");
          return [anunciado()];
        },
      }),
      undefined,
      AGORA,
    );

    expect(resumo.processados).toBe(2);
    expect(resumo.pulados["lista-indisponivel"]).toBe(1);
  });
});
