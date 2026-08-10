/**
 * Paleta da marca — fonte única da verdade.
 *
 * Estes valores são espelhados em `globals.css` como custom properties. A
 * duplicação existe porque o cartão de compartilhamento é gerado no servidor
 * pelo `next/og`, que renderiza fora do CSS do site e não enxerga variável
 * CSS nenhuma. Mudou aqui, mude lá — e vice-versa.
 *
 * MARINHO E LATÃO. O azul-marinho é a cor institucional de contrato e
 * tribunal, que é o terreno de quem lê edital; o latão carrega o "vencedor"
 * do nome e é o que torna o conjunto elegante em vez de corporativo-frio. A
 * escolha também foge do verde-esmeralda genérico que o site herdou do
 * template inicial, e que qualquer SaaS usa.
 */
export const BRAND = {
  /** Tinta principal: marinho profundo. Lê como quase-preto, mais quente. */
  ink: "#0C1B33",
  /** Marinho de superfície, para o degradê do cartão. */
  inkDeep: "#14315E",
  /**
   * Latão escuro. Escolhido no limite de acessibilidade: 4,85:1 sobre branco,
   * então passa em AA para texto normal. Um latão mais claro seria mais
   * bonito e reprovaria — por isso este.
   */
  brass: "#8C6D28",
  /**
   * Latão claro, para uso SOMENTE sobre marinho (9,9:1 sobre `ink`). Sobre
   * branco ele reprova em contraste; não use como texto em fundo claro.
   */
  brassBright: "#D9B65F",
  paper: "#FFFFFF",
  paperMuted: "#F5F7FA",
} as const;

/** Dimensão padrão de cartão social. 1200×630 é o que Open Graph e X esperam. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
