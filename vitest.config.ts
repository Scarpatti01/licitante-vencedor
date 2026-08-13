import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    /*
     * `server-only` resolve pela condição de exportação "react-server" quando o
     * Next monta o grafo do servidor. O Vite não liga essa condição, então o
     * import cairia na entrada padrão do pacote — que existe justamente para
     * lançar erro. O caminho literal para o build vazio evita isso, e nos deixa
     * testar o que está atrás do `import "server-only"` sem afrouxar a barreira.
     */
    alias: {
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    // Node por padrão: quase tudo aqui é lógica pura (score, checklist,
    // normalização) e subir um DOM para isso só custaria tempo.
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
  },
});
