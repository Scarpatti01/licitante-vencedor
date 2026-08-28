/*
 * Service worker do Licitante Vencedor.
 *
 * O QUE ELE GUARDA, E O QUE ELE NUNCA GUARDA
 *
 * Guarda só arquivo estático com hash no nome (`/_next/static/...`) e um punhado
 * de imagens e ícones nossos. Esses arquivos são imutáveis por construção: a URL
 * muda quando o conteúdo muda, então cache velho é impossível, e nenhum deles
 * carrega dado de ninguém.
 *
 * NUNCA guarda HTML, resposta de API, nem nada que dependa de quem está logado.
 * A razão é concreta: um celular é emprestado, um computador de escritório é
 * compartilhado, e uma página da jornada guardada em cache continuaria lá depois
 * de a pessoa sair da conta. As respostas que ela escreveu sobre a empresa dela
 * apareceriam para a próxima pessoa que abrisse o app, offline, sem sessão
 * nenhuma. Cache que atravessa o logout é vazamento de dado, não desempenho.
 *
 * Por isso a regra aqui é de lista fechada: só entra no cache o que casa com um
 * padrão declarado abaixo. Rota nova nasce fora do cache, e não dentro dele.
 *
 * O que a pessoa ganha offline: o app abre, mostra a marca e explica que está
 * sem conexão, em vez da tela de erro do navegador. O conteúdo da jornada
 * continua exigindo rede, e isso é proposital.
 */

const VERSAO = "lv-v1";
const ESTATICOS = `${VERSAO}-estaticos`;
const CASCA = `${VERSAO}-casca`;

// A página que aparece quando a navegação falha por falta de rede.
const PAGINA_OFFLINE = "/sem-conexao/";

/** Só isto pode ser guardado. Qualquer outra coisa passa direto para a rede. */
function podeGuardar(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icone-") ||
    url.pathname === "/logo.webp" ||
    url.pathname === "/favicon.ico" ||
    /\.(woff2?|png|jpe?g|webp|svg|css|js)$/.test(url.pathname)
  );
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CASCA)
      .then((cache) => cache.addAll([PAGINA_OFFLINE]))
      // Se a página offline não puder ser buscada agora, o worker ainda instala:
      // ficar sem service worker é pior que ficar sem a tela de aviso.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== "GET") return;

  const url = new URL(requisicao.url);

  // Navegação: sempre da rede. Se a rede falhar, mostra a tela de aviso.
  // Nunca guarda a resposta, porque toda página logada é navegação.
  if (requisicao.mode === "navigate") {
    evento.respondWith(
      fetch(requisicao).catch(async () => {
        const guardada = await caches.match(PAGINA_OFFLINE);
        return (
          guardada ||
          new Response("Sem conexão.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  if (!podeGuardar(url)) return;

  // Estático com hash no nome: serve do cache e só busca o que ainda não tem.
  evento.respondWith(
    caches.match(requisicao).then((guardada) => {
      if (guardada) return guardada;
      return fetch(requisicao).then((resposta) => {
        // `basic` exclui resposta opaca de terceiro, que não dá para inspecionar.
        if (resposta.ok && resposta.type === "basic") {
          const copia = resposta.clone();
          caches.open(ESTATICOS).then((cache) => cache.put(requisicao, copia));
        }
        return resposta;
      });
    }),
  );
});

// A página pede o descarte quando o usuário sai da conta: mesmo guardando só
// arquivo estático, sair da conta é o momento certo de não deixar rastro.
self.addEventListener("message", (evento) => {
  if (evento.data === "limpar-cache") {
    evento.waitUntil(caches.keys().then((nomes) => Promise.all(nomes.map((n) => caches.delete(n)))));
  }
});
