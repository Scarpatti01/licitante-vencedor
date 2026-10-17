import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/*
 * Gera public/materiais/folha-de-habilitacao.pdf a partir de
 * materiais/folha-de-habilitacao.html.
 *
 *   node materiais/gerar-folha.mjs
 *
 * Como em livro/gerar-pdf.mjs, o Chromium vem do Playwright, e
 * CHROMIUM_EXECUTAVEL existe só para a máquina onde ele mora fora do lugar
 * padrão. Playwright não é dependência da aplicação: é ferramenta de quem gera
 * o material.
 */
const aqui = dirname(fileURLToPath(import.meta.url));
const saida = join(aqui, '..', 'public', 'materiais', 'folha-de-habilitacao.pdf');

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTAVEL || undefined });
const pagina = await navegador.newPage();
await pagina.goto(pathToFileURL(join(aqui, 'folha-de-habilitacao.html')).href, { waitUntil: 'networkidle' });
await pagina.emulateMedia({ media: 'print' });
await pagina.evaluate(() => document.fonts.ready);

mkdirSync(dirname(saida), { recursive: true });
await pagina.pdf({ path: saida, format: 'A4', printBackground: true, preferCSSPageSize: true });
await navegador.close();
console.log(`gerado: ${saida}`);
