import type { PostDeEdital } from "./tipos";

/** Só demonstra leitura com documento e evidência, nunca um resumo de metadados. */
export function selecionarDemonstracao(posts: readonly PostDeEdital[]): PostDeEdital | null {
  return [...posts]
    .filter((post) =>
      post.analise?.profundidade === "documento_completo" &&
      post.analise.analisadoEm !== null &&
      (post.documentosLidos ?? 0) > 0 &&
      post.analise.resumoExecutivo.origem === "edital" &&
      post.analise.resumoExecutivo.evidencia.trim().length > 0,
    )
    .sort((a, b) => b.postadoEm.localeCompare(a.postadoEm) || a.slug.localeCompare(b.slug))[0] ?? null;
}
