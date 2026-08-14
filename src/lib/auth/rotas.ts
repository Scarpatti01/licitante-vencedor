/**
 * As duas decisões de roteamento da autenticação, num lugar que teste alcança.
 *
 * Elas nasceram dentro de `acoes.ts` e de `proxy.ts`, e saíram de lá pelo mesmo
 * motivo: as duas são regras de segurança, e regra de segurança que não pode ser
 * testada porque mora num módulo `"use server"` ou num proxy é regra que ninguém
 * confere. O arquivo é puro de propósito — sem `next/*`, sem `server-only` —
 * para poder ser importado por um `.test.ts`.
 */

/** Rotas do produto. Sem sessão, ninguém entra. */
export const ROTAS_DO_PRODUTO = [
  "/painel",
  "/oportunidades",
  "/perfil",
  "/configuracoes",
  "/onboarding",
];

/** Telas de autenticação. Quem já entrou não tem o que fazer nelas. */
export const ROTAS_DE_ENTRADA = ["/entrar", "/criar-conta"];

/**
 * O caminho está sob algum dos prefixos?
 *
 * Compara o segmento inteiro, e não o texto: `startsWith("/perfil")` sozinho
 * casaria com `/perfilamento-de-editais`, uma rota pública que não existe hoje
 * e que passaria a exigir login no dia em que existisse — sem ninguém entender
 * por quê.
 */
export function sobPrefixo(caminho: string, prefixos: readonly string[]): boolean {
  const limpo = caminho.replace(/\/+$/, "") || "/";
  return prefixos.some((p) => limpo === p || limpo.startsWith(`${p}/`));
}

/**
 * Para onde mandar o usuário depois de entrar.
 *
 * Só caminho interno passa. Sem esta checagem, `?proximo=https://outro.site`
 * transformaria a tela de login num redirecionador aberto — o truque clássico
 * de phishing, porque o link que a vítima recebe começa no domínio verdadeiro.
 *
 * Os casos recusados não são hipotéticos, são as formas que de fato aparecem:
 *
 *   `//exemplo.com`     — URL absoluta que não parece uma; o navegador completa
 *                          o protocolo sozinho.
 *   `https://…`         — a forma óbvia.
 *   `/\exemplo.com`     — barra invertida, que vários navegadores normalizam
 *                          para barra antes de resolver.
 *   texto com `\n`      — quebra de linha usada para injetar cabeçalho quando o
 *                          valor chega perto de um `Location:`.
 */
export const DESTINO_PADRAO = "/painel/";

export function destinoSeguro(valor: unknown): string {
  if (typeof valor !== "string") return DESTINO_PADRAO;

  const limpo = valor.trim();
  if (!limpo.startsWith("/")) return DESTINO_PADRAO;
  if (limpo.startsWith("//")) return DESTINO_PADRAO;
  if (limpo.startsWith("/\\")) return DESTINO_PADRAO;
  if (/[\r\n\t]/.test(limpo)) return DESTINO_PADRAO;

  return limpo;
}
