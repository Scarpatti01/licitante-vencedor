// Envia ao IndexNow (Bing, Yandex, Seznam, Naver...) as URLs NOVAS do sitemap.
// Guarda a lista da última execução em .indexnow-state.json e só envia o que não
// estava lá. Na primeira execução (sem esse arquivo), envia tudo.
//
// Uso:
//   node scripts/indexnow.mjs                   -> envia só URLs novas
//   node scripts/indexnow.mjs --all             -> envia todas as URLs
//   node scripts/indexnow.mjs --url <URL> ...   -> envia URLs específicas (ex.: post editado)

import { readFile, writeFile } from "node:fs/promises";

const HOST = "licitantevencedor.com.br";
const KEY = "f73a90c2f33cea54fac193fda455e62e";
const SITEMAP = `https://${HOST}/sitemap.xml`;
const STATE_FILE = ".indexnow-state.json";

const args = process.argv.slice(2);
const sendAll = args.includes("--all");
const manual = args.filter((a, i) => args[i - 1] === "--url");

async function readSitemap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao ler ${url}: ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
  // Sitemap index: lê os sitemaps filhos
  if (xml.includes("<sitemapindex")) return (await Promise.all(locs.map(readSitemap))).flat();
  return locs;
}

async function submit(urls) {
  for (let i = 0; i < urls.length; i += 10000) { // limite do protocolo por requisição
    const batch = urls.slice(i, i + 10000);
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: batch,
      }),
    });
    console.log(`IndexNow: ${batch.length} URLs enviadas -> HTTP ${res.status}`);
    if (res.status >= 400) throw new Error(await res.text());
  }
}

if (manual.length) {
  await submit(manual);
  process.exit(0);
}

const current = [...new Set(await readSitemap(SITEMAP))];

let previous = null;
try {
  previous = new Set(JSON.parse(await readFile(STATE_FILE, "utf8")));
} catch {
  console.log("IndexNow: sem histórico anterior, enviando todas as URLs.");
}

const toSend = sendAll || !previous ? current : current.filter((u) => !previous.has(u));

if (toSend.length === 0) {
  console.log("IndexNow: nenhuma URL nova desde o último deploy.");
} else {
  await submit(toSend);
}

await writeFile(STATE_FILE, JSON.stringify(current));
