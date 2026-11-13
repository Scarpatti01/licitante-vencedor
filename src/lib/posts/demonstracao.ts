import type { PostDeEdital } from "./tipos";

/** Exemplo editorial estável, conferido no documento oficial em 13/11/2026. */
export const DEMONSTRACAO = {
  editalId: "30793166000173-1-000006/2026",
  documento: "https://transparencia.brasilandiadotocantins.to.gov.br/downloads/1/b6b2676067260211a69740d14ad67bfa19ce01a7d2d254a7c66e89ab603908d6_1786638128.pdf",
  conferidoEm: "13/11/2026",
  destaques: [
    { titulo: "Garantias", texto: "1% na proposta e 5% no contrato.", pagina: 9 },
    { titulo: "Vistoria", texto: "Facultativa, sem obrigação de visitar o local.", pagina: 32 },
    { titulo: "Amostras", texto: "Materiais apresentados à fiscalização durante a execução da obra.", pagina: 33 },
  ],
} as const;

/**
 * A home não troca de exemplo a cada coleta. Os cinco campos principais devem
 * ter resposta e evidência no edital, inclusive quando a resposta for "não".
 * A profundidade original da leitura continua visível, sem promover um recorte
 * de documento a leitura integral por ter sido escolhido para a demonstração.
 */
export function selecionarDemonstracao(posts: readonly PostDeEdital[]): PostDeEdital | null {
  const post = posts.find((p) => p.editalId === DEMONSTRACAO.editalId);
  const analise = post?.analise;
  if (!post || !analise || analise.profundidade === "lista" ||
      !analise.analisadoEm || (post.documentosLidos ?? 0) < 1) return null;

  const campos = [analise.resumoExecutivo, analise.criterioDeJulgamento,
    analise.garantiaExigida, analise.visitaTecnicaExigida, analise.amostraExigida];
  if (campos.some((campo) => campo.origem !== "edital" || !campo.evidencia.trim())) return null;
  if (!analise.exigencias.some((e) => e.fase === "habilitacao" && e.descricao.origem === "edital") ||
      !analise.riscos.some((r) => r.origem === "edital")) return null;
  return post;
}
