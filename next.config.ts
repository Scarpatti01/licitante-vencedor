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
};

export default nextConfig;
