/**
 * Transforma o arquivo publicado pelo órgão em texto — ou diz por que não deu.
 *
 * ## A ordem dos estágios saiu da medição, não do gosto
 *
 * Em 50 editais reais (81 PDFs, 3.452 páginas), medido em 2026-08-15:
 *
 *   86,2% dos arquivos são PDF, e o `pdfjs` extrai texto de **98,8%** deles
 *   11,7% são zip/docx/xlsx  →  **18% dos editais não têm NENHUM PDF direto**
 *    2,1% são .rar
 *    1,2% dos PDFs são digitalizados e precisariam de OCR
 *
 * Daí a prioridade que contraria o plano original: **descompactar vale 18% de
 * cobertura; OCR vale 1,2%**. Um edital cujos anexos vieram zipados é um edital
 * invisível para a análise, e invisível em silêncio — o modo de falha que este
 * projeto recusa. Por isso o zip entra agora e o OCR entra como recusa
 * declarada.
 *
 * Detalhes e a metodologia em `docs/produto/documentos-e-cadencia.md`.
 *
 * ## Por que `pdfjs` e não PyMuPDF
 *
 * PyMuPDF é AGPL-3.0. Num SaaS, isso obriga a abrir o código da aplicação
 * inteira ou comprar licença da Artifex, que não tem preço público. É a
 * biblioteca mais recomendada em tutorial e a única que criaria passivo
 * jurídico sobre o produto. `pdfjs-dist` é Apache-2.0 e roda no runtime que já
 * existe aqui — sem segundo deploy.
 */

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { unzipSync } from "fflate";

export type Extracao =
  | {
      ok: true;
      texto: string;
      paginas: number;
      /** Caminho até o arquivo, para o zip poder dizer de onde o texto saiu. */
      origem: string;
    }
  | {
      ok: false;
      motivo:
        /** PDF sem camada de texto: é imagem, precisa de OCR que ainda não temos. */
        | "precisa-de-ocr"
        /** `.rar` e afins — declarado, não silencioso. */
        | "formato-nao-suportado"
        /** Nem o `pdfjs` nem o `fflate` conseguiram abrir. */
        | "ilegivel"
        /** Acima do teto; ver `MAX_BYTES`. */
        | "grande-demais";
      origem: string;
      detalhe?: string;
    };

/**
 * Teto por arquivo.
 *
 * O maior edital da amostra tinha 305 páginas e a média de arquivo ficou muito
 * abaixo disto. 40 MB deixa folga larga e ainda impede que um anexo de vídeo ou
 * um mapa em alta resolução trave a fila.
 */
export const MAX_BYTES = 40 * 1024 * 1024;

/**
 * Abaixo disto por página, não há texto aproveitável — a página é imagem.
 *
 * O número é o mesmo usado na medição que produziu o 1,2%, de propósito: o que
 * o relatório chamou de "precisa de OCR" e o que o código recusa em produção
 * têm de ser a MESMA condição, ou o custo previsto e o custo real divergem sem
 * ninguém perceber.
 */
export const CHARS_POR_PAGINA_MINIMO = 100;

/** Quantos níveis de zip dentro de zip seguir. */
const PROFUNDIDADE_MAXIMA = 2;

function assinatura(dados: Uint8Array): "pdf" | "zip" | "outro" {
  if (dados.length < 4) return "outro";
  const quatro = String.fromCharCode(dados[0], dados[1], dados[2], dados[3]);
  if (quatro === "%PDF") return "pdf";
  // `PK\x03\x04` — zip, e também docx/xlsx, que são zip com outro nome.
  if (dados[0] === 0x50 && dados[1] === 0x4b) return "zip";
  return "outro";
}

/**
 * Extrai o texto de um PDF.
 *
 * `destroy()` mora na loading task e não no documento (pdfjs 6). Guardá-la é o
 * que libera memória entre arquivos — sem isso, uma fila de centenas de PDFs
 * fica toda residente.
 */
async function doPdf(dados: Uint8Array, origem: string): Promise<Extracao> {
  // `verbosity: 0` cala os avisos de fonte, que são ruído em edital escaneado
  // com fonte embutida torta e não afetam o texto extraído.
  const tarefa = getDocument({ data: dados, verbosity: 0 });

  let doc;
  try {
    doc = await tarefa.promise;
  } catch (e) {
    return {
      ok: false,
      motivo: "ilegivel",
      origem,
      detalhe: e instanceof Error ? e.message.slice(0, 120) : undefined,
    };
  }

  try {
    const paginas = doc.numPages;
    const partes: string[] = [];

    for (let i = 1; i <= paginas; i++) {
      const pagina = await doc.getPage(i);
      const conteudo = await pagina.getTextContent();
      partes.push(
        conteudo.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      );
    }

    const texto = partes.filter(Boolean).join("\n\n");

    /*
     * O veredito de OCR é sobre a MÉDIA por página, não sobre o total: um
     * edital de 80 páginas com capa digitalizada e miolo textual tem texto de
     * sobra, e recusá-lo por causa da capa perderia o documento inteiro.
     */
    if (texto.length / Math.max(1, paginas) < CHARS_POR_PAGINA_MINIMO) {
      return { ok: false, motivo: "precisa-de-ocr", origem };
    }

    return { ok: true, texto, paginas, origem };
  } finally {
    await tarefa.destroy();
  }
}

/**
 * Abre um zip e extrai o que houver dentro.
 *
 * Recupera os 18% de editais que publicam tudo compactado. `fflate` é MIT e
 * síncrono — o descompactar é rápido perto do download, e um caminho síncrono
 * é um a menos para errar.
 */
function doZip(dados: Uint8Array, origem: string, profundidade: number): Promise<Extracao[]> {
  let entradas: Record<string, Uint8Array>;
  try {
    entradas = unzipSync(dados);
  } catch (e) {
    return Promise.resolve([
      {
        ok: false,
        motivo: "ilegivel",
        origem,
        detalhe: e instanceof Error ? e.message.slice(0, 120) : undefined,
      },
    ]);
  }

  const dentro = Object.entries(entradas)
    // Diretório vem com tamanho zero; `__MACOSX` é lixo de quem zipou no Mac.
    .filter(([nome, bytes]) => bytes.length > 0 && !nome.startsWith("__MACOSX/"))
    .map(([nome, bytes]) => extrair(bytes, `${origem}!${nome}`, profundidade + 1));

  return Promise.all(dentro);
}

/**
 * O ponto de entrada: decide pelo conteúdo, não pela extensão.
 *
 * Extensão mente — a medição encontrou arquivo `.pdf` que era zip e `.zip` que
 * era PDF renomeado. A assinatura de bytes não mente.
 */
export async function extrair(
  dados: Uint8Array,
  origem: string,
  profundidade = 0,
): Promise<Extracao> {
  if (dados.length > MAX_BYTES) {
    return { ok: false, motivo: "grande-demais", origem };
  }

  switch (assinatura(dados)) {
    case "pdf":
      return doPdf(dados, origem);

    case "zip": {
      if (profundidade >= PROFUNDIDADE_MAXIMA) {
        // Zip dentro de zip dentro de zip é quase sempre engano de quem
        // publicou — e sem teto vira porta para zip bomb.
        return { ok: false, motivo: "formato-nao-suportado", origem, detalhe: "zip aninhado demais" };
      }
      return juntar(await doZip(dados, origem, profundidade), origem);
    }

    default:
      // `.rar`, `.doc` antigo e o que mais aparecer. Declarado, nunca ignorado:
      // quem lê o relatório precisa saber que existe documento que não lemos.
      return { ok: false, motivo: "formato-nao-suportado", origem };
  }
}

/**
 * Junta o que veio de dentro de um zip num resultado só.
 *
 * Basta UM arquivo legível para o edital ser analisável — o resto do zip
 * costuma ser planilha de preço e anexo de imagem. Nada legível devolve o
 * motivo mais informativo dos que apareceram, e não um genérico: "precisa de
 * OCR" e "formato não suportado" levam a ações diferentes.
 */
function juntar(partes: Extracao[], origem: string): Extracao {
  const boas = partes.filter((p): p is Extract<Extracao, { ok: true }> => p.ok);

  if (boas.length > 0) {
    return {
      ok: true,
      texto: boas.map((b) => `— ${b.origem} —\n${b.texto}`).join("\n\n"),
      paginas: boas.reduce((s, b) => s + b.paginas, 0),
      origem,
    };
  }

  if (partes.some((p) => !p.ok && p.motivo === "precisa-de-ocr")) {
    return { ok: false, motivo: "precisa-de-ocr", origem };
  }

  return {
    ok: false,
    motivo: partes.length === 0 ? "ilegivel" : "formato-nao-suportado",
    origem,
    detalhe: partes.length === 0 ? "zip vazio" : undefined,
  };
}
