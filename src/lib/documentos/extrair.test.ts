import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { extrair, MAX_BYTES } from "./extrair";

/**
 * Um PDF mínimo, montado à mão.
 *
 * Sem fixture binária no repositório de propósito: um PDF de verdade seria
 * dezenas de KB versionados que ninguém consegue revisar num diff. Este é
 * legível, cabe na tela e exercita o caminho real do `pdfjs`.
 */
function pdfComTexto(texto: string, repeticoes = 1): Uint8Array {
  const conteudo = Array.from({ length: repeticoes }, (_, i) =>
    `BT /F1 12 Tf 40 ${700 - i * 14} Td (${texto}) Tj ET`,
  ).join("\n");

  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });

  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

  return strToU8(pdf);
}

/** Texto longo o bastante para passar do mínimo de caracteres por página. */
const LONGO = "EDITAL DE PREGAO ELETRONICO NUMERO 001 2026 OBJETO AQUISICAO DE MATERIAL";

describe("extrair — PDF", () => {
  it("extrai o texto de um PDF textual", async () => {
    const r = await extrair(pdfComTexto(LONGO, 3), "edital.pdf");

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.texto).toContain("PREGAO ELETRONICO");
      expect(r.paginas).toBe(1);
      expect(r.origem).toBe("edital.pdf");
    }
  });

  /*
   * O caso que define o custo de OCR. A condição aqui é a MESMA usada na
   * medição que produziu "1,2% precisa de OCR" — se as duas divergirem, o custo
   * previsto e o real divergem sem ninguém perceber.
   */
  it("recusa PDF sem camada de texto, pedindo OCR", async () => {
    const r = await extrair(pdfComTexto("x"), "digitalizado.pdf");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("precisa-de-ocr");
  });

  it("PDF corrompido é ilegível, não estoura", async () => {
    const r = await extrair(strToU8("%PDF-1.4\nisto não é um pdf"), "quebrado.pdf");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("ilegivel");
  });
});

describe("extrair — compactados", () => {
  /*
   * Os 18%. Medido: quase um em cada cinco editais não publica nenhum PDF
   * direto — vem tudo em zip. Sem este caminho, esses editais ficariam
   * invisíveis para a análise, e invisíveis em silêncio.
   */
  it("abre zip e extrai o PDF de dentro", async () => {
    const zip = zipSync({ "anexos/edital.pdf": pdfComTexto(LONGO, 3) });
    const r = await extrair(zip, "documentos.zip");

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.texto).toContain("PREGAO ELETRONICO");
      // A origem diz de onde o texto saiu — sem isso, "o edital diz X" perde a
      // rastreabilidade que o resto do pipeline exige.
      expect(r.texto).toContain("documentos.zip!anexos/edital.pdf");
    }
  });

  it("junta vários PDFs do mesmo zip", async () => {
    const zip = zipSync({
      "edital.pdf": pdfComTexto(LONGO, 3),
      "termo-de-referencia.pdf": pdfComTexto("TERMO DE REFERENCIA ESPECIFICACOES TECNICAS DO OBJETO", 3),
    });
    const r = await extrair(zip, "tudo.zip");

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.texto).toContain("PREGAO");
      expect(r.texto).toContain("TERMO DE REFERENCIA");
      expect(r.paginas).toBe(2);
    }
  });

  it("um arquivo legível basta, mesmo com lixo junto", async () => {
    const zip = zipSync({
      "edital.pdf": pdfComTexto(LONGO, 3),
      "planilha.xlsx": strToU8("não é nada disso"),
      "foto.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    });

    expect((await extrair(zip, "misto.zip")).ok).toBe(true);
  });

  it("zip sem nada legível devolve o motivo mais informativo", async () => {
    // "precisa de OCR" e "formato não suportado" levam a ações opostas: uma
    // pede contratar OCR, a outra pede outro caminho. Achatar as duas num
    // genérico apagaria a informação que decide.
    const zip = zipSync({ "digitalizado.pdf": pdfComTexto("x") });
    const r = await extrair(zip, "so-imagem.zip");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("precisa-de-ocr");
  });

  it("zip vazio é ilegível, com detalhe", async () => {
    const r = await extrair(zipSync({}), "vazio.zip");

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivo).toBe("ilegivel");
      expect(r.detalhe).toBe("zip vazio");
    }
  });

  it("para de descer em zip aninhado demais", async () => {
    // Sem teto, zip dentro de zip vira porta para zip bomb.
    const fundo = zipSync({ "e.pdf": pdfComTexto(LONGO, 3) });
    const meio = zipSync({ "n1.zip": fundo });
    const topo = zipSync({ "n2.zip": meio });

    const r = await extrair(topo, "bomba.zip");
    expect(r.ok).toBe(false);
  });
});

describe("extrair — recusas declaradas", () => {
  it("formato desconhecido é recusa nomeada, nunca silêncio", async () => {
    // `.rar` são 2,1% dos arquivos. Ganhar isso exigiria biblioteca de licença
    // ruim; o que não se pode é fingir que o documento não existe.
    const rar = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
    const r = await extrair(rar, "anexos.rar");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("formato-nao-suportado");
  });

  it("arquivo grande demais é recusado antes de qualquer parse", async () => {
    const r = await extrair(new Uint8Array(MAX_BYTES + 1), "enorme.pdf");

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("grande-demais");
  });

  it("decide pelo conteúdo, não pela extensão", async () => {
    // A medição encontrou `.pdf` que era zip. Extensão mente; assinatura não.
    const zipComNomeDePdf = zipSync({ "real.pdf": pdfComTexto(LONGO, 3) });
    const r = await extrair(zipComNomeDePdf, "disfarcado.pdf");

    expect(r.ok).toBe(true);
  });
});
