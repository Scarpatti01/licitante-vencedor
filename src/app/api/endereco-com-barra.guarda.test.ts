import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Endereço nosso escrito no código termina em barra, e nunca leva `www.`.
 *
 * ## O DEFEITO QUE MOTIVOU ESTA GUARDA
 *
 * O comentário de `api/hotmart/webhook/route.ts` nasceu no PR #140 dizendo o
 * endereço a cadastrar na Hotmart assim:
 *
 *     <nosso domínio>/api/hotmart/webhook
 *
 * Sem barra, e escrito aqui sem o domínio de propósito: esta guarda varre este
 * arquivo também, e um exemplo literal do defeito faria ela reprovar a si mesma.
 * Exemplo do erro não vira exceção da regra.
 *
 * Sem barra. O dono cadastrou exatamente isso, disparou os sete eventos de
 * teste em 08/09 às 23:09, e os sete voltaram `308 - Em retentativa`. Nenhum
 * chegou na rota. Uma venda real nesse estado entregaria o livro pela Hotmart e
 * nunca abriria a Jornada aqui.
 *
 * A causa é o `trailingSlash: true` do `next.config.ts`, que existe por um
 * motivo bom e que não vai mudar: as 338 URLs de 2016–2025 com backlink
 * terminam em barra, e sem ele cada uma faria dois saltos. O preço é que TODO
 * endereço sem barra responde 308 antes de chegar em qualquer código nosso.
 *
 * ## POR QUE ISSO FALHA CALADO
 *
 * Navegador segue 308 sozinho, e `curl -L` também. Quem confere no navegador vê
 * a rota funcionando. Quem integra um serviço de fora descobre outra coisa:
 * Hotmart, Stripe e a maioria dos entregadores de webhook tratam qualquer
 * resposta fora de 2xx como falha e reentregam, sem seguir o `Location`.
 *
 * Então o defeito não aparece em teste nenhum de unidade, não aparece na build,
 * não aparece no log da Vercel — porque a requisição nunca chega ao servidor de
 * aplicação — e só aparece no painel do serviço de fora, que é o único lugar
 * onde ninguém está olhando quando publica.
 *
 * ## POR QUE ESTA GUARDA NÃO CONFERE O ENDEREÇO DA HOTMART
 *
 * Conferir a linha 12 daquele arquivo fecharia o caso e deixaria a classe
 * aberta, que é o erro recorrente deste repositório. O próximo webhook
 * documentado sem barra nasce com o mesmo defeito e passa por esta guarda.
 *
 * Ela varre `src/` inteiro atrás de endereço do NOSSO domínio e cobra dois
 * fatos de cada um, os dois provados contra a produção em 08/09:
 *
 *     POST  /api/hotmart/webhook   → 308, para a versão com barra
 *     POST  /api/hotmart/webhook/  → 503, que é a rota respondendo
 *     POST  no mesmo com `www.`    → 308, para o domínio sem `www`
 *
 * ## AS SAÍDAS
 *
 * Caminho vazio (`https://licitantevencedor.com.br`, a base canônica) não tem o
 * que normalizar. Arquivo com extensão (`/sitemap.xml`) não recebe barra do
 * Next. Fora isso, barra no fim, e a query entra depois dela.
 *
 * A regra inteira é consequência do `trailingSlash`, então a guarda LÊ o
 * `next.config.ts` em vez de assumir: se um dia ele sair, ela cobra o contrário
 * sozinha, em vez de exigir barra num site que passou a rejeitar barra.
 */

const RAIZ = join(__dirname, "..", "..", "..");
const NOSSO_DOMINIO = /https:\/\/(www\.)?licitantevencedor\.com\.br([^\s"'`)\\]*)/g;

const configuracao = readFileSync(join(RAIZ, "next.config.ts"), "utf8");
const COM_BARRA = /trailingSlash:\s*true/.test(configuracao);

function arquivosDeCodigo(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeCodigo(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

type Achado = { arquivo: string; url: string; www: boolean; caminho: string };

const achados: Achado[] = arquivosDeCodigo(join(RAIZ, "src")).flatMap((arquivo) => {
  const texto = readFileSync(arquivo, "utf8");
  return [...texto.matchAll(NOSSO_DOMINIO)].map((achado) => ({
    arquivo: arquivo.slice(RAIZ.length + 1),
    url: achado[0],
    www: Boolean(achado[1]),
    caminho: achado[2].split("?")[0].split("#")[0],
  }));
});

/** `/sitemap.xml` é arquivo; `/precos/` é rota. O Next só normaliza a segunda. */
function ehArquivo(caminho: string): boolean {
  return caminho.split("/").pop()!.includes(".");
}

describe("endereço do nosso domínio escrito no código", () => {
  it("a varredura acha endereços, senão ela não está guardando nada", () => {
    expect(
      achados.length,
      "nenhum endereço nosso encontrado em `src/`. Ou o domínio mudou, ou o padrão " +
        "de busca quebrou. Nos dois casos esta guarda parou de proteger e passaria " +
        "verde para sempre.",
    ).toBeGreaterThan(0);
  });

  it(`termina em barra, porque \`trailingSlash: ${COM_BARRA}\` decide o resto`, () => {
    for (const { arquivo, url, caminho } of achados) {
      if (caminho === "" || ehArquivo(caminho)) continue;
      expect(
        caminho.endsWith("/"),
        `${arquivo} escreve ${url}, e o \`trailingSlash: true\` do next.config.ts faz ` +
          `esse endereço responder 308 em vez de chegar na rota. Navegador segue o ` +
          `redirecionamento e esconde o problema; quem entrega webhook não segue, e ` +
          `reentrega para sempre. Acrescente a barra no fim.`,
      ).toBe(COM_BARRA);
    }
  });

  it("nunca leva `www.`, que redireciona para o domínio sem ele", () => {
    for (const { arquivo, url, www } of achados) {
      expect(
        www,
        `${arquivo} escreve ${url}. O \`www\` redireciona 308 para o domínio sem ele, ` +
          `com o mesmo efeito de um endereço sem barra: quem entrega webhook desiste.`,
      ).toBe(false);
    }
  });
});
