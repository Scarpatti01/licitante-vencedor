import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

/**
 * O carimbo que identifica o exemplar.
 *
 * Não é proteção técnica, e não adianta fingir que é: quem comprou pode abrir o
 * arquivo e repassar o arquivo, e nenhum recurso impede isso sem estragar a
 * experiência de quem pagou direito. O que o carimbo faz é outra coisa, e é
 * suficiente: torna o vazamento rastreável e nomeado. Um PDF que traz o nome e
 * o e-mail do comprador em todas as 126 páginas não circula em grupo de
 * WhatsApp com a mesma leveza de um arquivo anônimo.
 */

export type Comprador = {
  /** Como a pessoa se chama. Vazio quando a conta não tem nome ainda. */
  nome: string;
  /** O e-mail que comprou. É ele que identifica o exemplar. */
  email: string;
};

const AVISO = "Exemplar pessoal e intransferível. Reprodução proibida.";

/** A linha única que vai no rodapé de cada página. */
export function linhaDoCarimbo({ nome, email }: Comprador): string {
  const dono = nome.trim() ? `${nome.trim()} · ${email}` : email;
  return `${dono}. ${AVISO}`;
}

/**
 * Reduz o corpo até a linha caber na largura disponível.
 *
 * Devolve o corpo mínimo quando nem ele basta; quem chama resolve o resto
 * encurtando o texto. Ver `carimboQueCabe`.
 */
export function corpoQueCabe(
  largura: (texto: string, corpo: number) => number,
  texto: string,
  disponivel: number,
  corpoIdeal = 6.5,
  corpoMinimo = 4.5,
): number {
  let corpo = corpoIdeal;
  while (corpo > corpoMinimo && largura(texto, corpo) > disponivel) {
    corpo -= 0.25;
  }
  return corpo;
}

/**
 * A linha do carimbo e o corpo em que ela cabe na largura dada.
 *
 * A ordem de sacrifício é deliberada. Primeiro encolhe a letra, até um piso
 * abaixo do qual ninguém mais lê. Se ainda não couber, encurta o NOME, e nunca
 * o e-mail nem o aviso: um e-mail cortado ao meio não identifica ninguém, que é
 * justamente a razão de o carimbo existir, e um aviso pela metade não avisa
 * nada. O nome é o único pedaço que pode perder letras sem perder a função.
 *
 * Isto não é hipótese: uma razão social longa somada a um e-mail de
 * departamento passa de 200 caracteres, e no piso de 4,5 pontos ainda estoura a
 * caixa. Quem descobriu foi a guarda, não a tela.
 */
export function carimboQueCabe(
  largura: (texto: string, corpo: number) => number,
  comprador: Comprador,
  disponivel: number,
  corpoMinimo = 4.5,
): { texto: string; corpo: number } {
  let nome = comprador.nome.trim();
  let texto = linhaDoCarimbo({ ...comprador, nome });
  const corpo = corpoQueCabe(largura, texto, disponivel, 6.5, corpoMinimo);
  if (largura(texto, corpo) <= disponivel) return { texto, corpo };

  while (nome.length > 0 && largura(texto, corpo) > disponivel) {
    nome = nome.slice(0, -4).trimEnd();
    texto = linhaDoCarimbo({ ...comprador, nome: nome ? `${nome}…` : "" });
  }
  return { texto, corpo };
}

/**
 * Distância do carimbo até a borda de baixo da página, em pontos.
 *
 * O pdf-lib conta o eixo Y de baixo para cima, ao contrário de quase toda
 * ferramenta de leitura de PDF, que conta de cima. Escrever aqui o número que
 * se lê num extrator põe o carimbo no TOPO da página, e foi exatamente o que
 * aconteceu na primeira versão: o "rodapé" saiu a 36 pontos do topo.
 *
 * Medido no PDF de verdade, contando de baixo: o fólio ocupa de 14 a 24, e o
 * texto do livro não desce abaixo de 62. Os 40 daqui ficam entre os dois.
 */
const ALTURA_DO_CARIMBO = 40;

/**
 * Carimba todas as páginas do PDF, na faixa livre acima do número da página.
 */
export async function carimbarPdf(mestre: Uint8Array, comprador: Comprador): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(mestre);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const tinta = rgb(0.45, 0.44, 0.42);

  for (const pagina of pdf.getPages()) {
    const { width } = pagina.getSize();
    const margem = 56;
    const disponivel = width - margem * 2;
    const { texto: linha, corpo } = carimboQueCabe(
      (t, c) => fonte.widthOfTextAtSize(t, c),
      comprador,
      disponivel,
    );
    const largura = fonte.widthOfTextAtSize(linha, corpo);
    pagina.drawText(linha, {
      x: (width - largura) / 2,
      y: ALTURA_DO_CARIMBO,
      size: corpo,
      font: fonte,
      color: tinta,
    });
  }

  // Os metadados também levam o nome: alguns leitores mostram isso na aba, e é
  // mais um lugar onde a origem do arquivo aparece sem atrapalhar a leitura.
  pdf.setTitle("Workbook do Licitante");
  pdf.setAuthor("Leandro Scarpatti");
  pdf.setSubject(linhaDoCarimbo(comprador));
  pdf.setProducer("Licitante Vencedor");

  return pdf.save();
}

const COLOFAO = "texto/exemplar.xhtml";

function paginaDoExemplar(comprador: Comprador): string {
  const dono = comprador.nome.trim()
    ? `${escapar(comprador.nome.trim())} &#183; ${escapar(comprador.email)}`
    : escapar(comprador.email);
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR" lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Este exemplar</title>
  <link rel="stylesheet" type="text/css" href="../estilo/livro.css" />
</head>
<body>
<div class="pagina">
  <section class="folha-uso">
    <div class="etiqueta">Este exemplar</div>
    <h2>De quem &#233; este livro</h2>
    <p>${dono}</p>
    <p>${escapar(AVISO)}</p>
  </section>
</div>
</body>
</html>
`;
}

function escapar(bruto: string): string {
  return bruto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Carimba o EPUB.
 *
 * Aqui não existe "rodapé de cada página": num texto que reflui, a página é
 * decidida pelo leitor no momento da leitura, e não há onde fixar o carimbo.
 * O equivalente honesto é uma folha de abertura com o nome e o e-mail de quem
 * comprou, mais o mesmo aviso nos metadados, que é onde a estante do leitor
 * mostra a procedência do arquivo.
 */
export function carimbarEpub(mestre: Uint8Array, comprador: Comprador): Uint8Array {
  const dentro = unzipSync(mestre);

  const opfNome = Object.keys(dentro).find((n) => n.endsWith(".opf"));
  if (!opfNome) throw new Error("EPUB sem arquivo .opf: não é um pacote válido");

  dentro[`OEBPS/${COLOFAO}`] = strToU8(paginaDoExemplar(comprador));

  let opf = strFromU8(dentro[opfNome]);
  if (!opf.includes(COLOFAO)) {
    opf = opf.replace(
      "</manifest>",
      `  <item id="exemplar" href="${COLOFAO}" media-type="application/xhtml+xml" />\n  </manifest>`,
    );
    // Logo depois da abertura: quem abre o livro vê de quem ele é antes de ler.
    opf = opf.replace(/(<itemref idref="c0"\s*\/>)/, '$1\n    <itemref idref="exemplar" />');
  }
  opf = opf.replace(
    /<dc:rights>[^<]*<\/dc:rights>/,
    `<dc:rights>${escapar(linhaDoCarimbo(comprador))}</dc:rights>`,
  );
  dentro[opfNome] = strToU8(opf);

  // `mimetype` tem de continuar sendo o primeiro item e sem compressão, senão
  // parte dos leitores recusa o arquivo antes de olhar o conteúdo.
  const ordenado: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  ordenado["mimetype"] = [dentro["mimetype"], { level: 0 }];
  for (const nome of Object.keys(dentro)) {
    if (nome === "mimetype") continue;
    ordenado[nome] = [dentro[nome], { level: 6 }];
  }
  return zipSync(ordenado as never);
}
