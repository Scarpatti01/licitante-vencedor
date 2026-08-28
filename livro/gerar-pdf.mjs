import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const saida = process.argv[2] ?? 'workbook-do-licitante.pdf';

/*
 * Onde está o Chromium.
 *
 * Sem variável, deixa o Playwright achar o navegador que ele mesmo instalou,
 * que é o caso do runner do GitHub depois de `npx playwright install chromium`.
 * A variável existe para a máquina onde o navegador mora fora do lugar padrão.
 *
 * O caminho estava fixo aqui, apontando para o contêiner de desenvolvimento, e
 * por isso a primeira publicação do livro falhou em 72 segundos com
 * "executable doesn't exist". Caminho de máquina não pertence ao código.
 */
const executablePath = process.env.CHROMIUM_EXECUTAVEL || undefined;

const navegador = await chromium.launch({ executablePath });
const pagina = await navegador.newPage();
await pagina.goto(pathToFileURL('completo.html').href, { waitUntil: 'networkidle' });
await pagina.addStyleTag({ content: readFileSync('impressao.css', 'utf8') });
await pagina.emulateMedia({ media: 'print' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.waitForTimeout(800);

/*
 * A fonte do fólio vai embutida no próprio rodapé, e o motivo não é estético.
 *
 * O Chromium renderiza `footerTemplate` num contexto isolado, que não enxerga
 * o CSS nem as `@font-face` da página. O rodapé pedia `Georgia, serif`, e como
 * Georgia não existe em Linux o número da página caía no serif genérico da
 * máquina: DejaVu Serif aqui, e o que estivesse instalado em outra. O livro
 * saía com o fólio numa tipografia decidida pelo computador que o gerou.
 *
 * Reaproveita a mesma Playfair já embutida na fonte versionada, em vez de uma
 * segunda cópia: se um dia a face mudar lá, o fólio muda junto.
 */
const fonteDoLivro = readFileSync('completo.html', 'utf8');
const faceLatina = fonteDoLivro
  .match(/@font-face\s*\{[^}]*\}/g)
  ?.find(
    (bloco) =>
      bloco.includes("'Playfair Display'") &&
      /font-weight:\s*400/.test(bloco) &&
      /font-style:\s*normal/.test(bloco) &&
      bloco.includes('U+0000-00FF'),
  );
if (!faceLatina) {
  throw new Error(
    'nao achei a Playfair latina 400 em completo.html: sem ela o folio sai ' +
      'na fonte que a maquina escolher, e o livro deixa de ser o mesmo em ' +
      'toda maquina que o gera',
  );
}
// Sem `unicode-range`: no rodapé só entram algarismos, e a regra de faixa
// existe para escolher entre subconjuntos que aqui não existem.
const faceDoRodape = faceLatina.replace(/unicode-range:[^;}]*;?/, '');

// O fólio é dourado e centrado, como o rodapé da referência. A capa e as
// aberturas de parte perdem o fólio depois, na costura em PDF.
const rodape = `
  <style>${faceDoRodape}</style>
  <div style="width:100%;padding:0 20mm;font-family:'Playfair Display',serif;font-size:8pt;color:#B8934E;
              display:flex;align-items:center;justify-content:center;gap:8pt">
    <span style="display:inline-block;width:10mm;height:1px;background:#E7DAC1"></span>
    <span class="pageNumber"></span>
    <span style="display:inline-block;width:10mm;height:1px;background:#E7DAC1"></span>
  </div>`;

await pagina.pdf({
  path: saida,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: rodape,
  margin: { top: '22mm', bottom: '20mm', left: '20mm', right: '20mm' },
});

await navegador.close();
console.log('gerado:', saida);
