import type { NextConfig } from "next";
import { redirecionamentosAtivos } from "./src/lib/legacy";

const nextConfig: NextConfig = {
  /**
   * O acervo de 2016–2025 era WordPress: todas as 338 URLs com backlink terminam
   * em barra. Sem isto, cada uma faria 308 (normalização) + 301 (destino) — dois
   * saltos em cima de todo link que estamos tentando resgatar.
   */
  trailingSlash: true,
  async redirects() {
    return redirecionamentosAtivos();
  },

  /**
   * Fora de produção, nada é indexável.
   *
   * O `robots.ts` já proíbe rastrear as cópias de preview, mas robots.txt pede
   * para não RASTREAR: um endereço descoberto por link de fora pode entrar no
   * índice mesmo sem ser rastreado, e aí a página aparece na busca sem título
   * nem descrição. `X-Robots-Tag: noindex` é o que proíbe INDEXAR, e vale para
   * todo endereço, inclusive imagem e PDF, que o robots.txt não alcança bem.
   *
   * A ausência da variável conta como produção de propósito: mandar `noindex`
   * por engano no domínio real tira o site do Google, que é incomparavelmente
   * pior que o conteúdo duplicado que estamos consertando.
   */
  async headers() {
    const producao = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
    if (producao) return [];
    return [
      {
        source: "/:caminho*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
