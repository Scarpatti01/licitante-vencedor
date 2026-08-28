/**
 * A identidade Minimalista Premium, a mesma do Workbook, escopada.
 *
 * ## Por que tokens locais em vez dos tokens do site
 *
 * O site tem a própria paleta (azul institucional sobre branco) e ela continua
 * valendo em todo lugar. A página de venda carrega a identidade do PRODUTO, que
 * é a do livro: creme, carvão, champagne e dourado. Um cliente que folheia o
 * PDF e depois abre a página precisa reconhecer que são a mesma coisa.
 *
 * Os tokens ficam sob `.premium` para não vazar: o cabeçalho e o rodapé do site
 * continuam com a cor do site, o que é proposital. A página de venda é uma
 * sala dentro da casa, não outra casa.
 */
export const CLASSE_RAIZ = "premium";

export const ESTILO_PREMIUM = `
.premium {
  --creme:#F3EFE7; --papel:#FFFFFF;
  --carvao:#22201D; --tinta:#38342E; --tinta-fraca:#7C7469;
  --champagne:#E7DAC1; --champagne-claro:#FAF6EE;
  --dourado:#B8934E; --dourado-claro:#C9A961;
  --cinza:#D9D5CE;

  background:var(--creme);
  color:var(--tinta);
  font-family:var(--fonte-corpo), system-ui, sans-serif;
  font-size:17px;
  line-height:1.7;
  -webkit-font-smoothing:antialiased;
}
.premium h1, .premium h2, .premium h3, .premium .serifa {
  font-family:var(--fonte-display), Georgia, serif;
  font-weight:400;
  line-height:1.12;
  color:var(--carvao);
  text-wrap:balance;
  /* Sem declaração de margem aqui, de propósito.
     O seletor .premium h2 tem duas classes de especificidade e vencia toda
     utilidade mt-* do Tailwind, que tem uma. O resultado era a página inteira
     pedindo espaçamento e recebendo zero: 17 elementos, medidos no navegador.
     A declaração também era redundante: o preflight do Tailwind já zera a
     margem de tudo, com especificidade menor que a das utilidades. */
}
.premium strong { font-weight:700; color:var(--carvao); }
.premium .etiqueta {
  font-family:var(--fonte-corpo), sans-serif; font-size:.68rem; font-weight:700;
  letter-spacing:.24em; text-transform:uppercase; color:var(--dourado);
}
.premium .ornamento { display:flex; align-items:center; justify-content:center; gap:.9rem; }
.premium .ornamento::before, .premium .ornamento::after {
  content:""; height:1px; width:3.2rem; background:var(--dourado-claro); opacity:.75;
}
.premium .ornamento span { color:var(--dourado); font-size:.6rem; line-height:1; }

.premium .destaque { color:var(--dourado); font-style:italic; }

/* O botão: alto o bastante para o polegar, e com o peso de quem quer ser
   apertado. 48px é o mínimo de alvo de toque acessível. */
.premium .cta {
  display:inline-flex; align-items:center; justify-content:center; gap:.6rem;
  min-height:56px; padding:1rem 2.2rem; border-radius:14px;
  background:var(--dourado); color:#fff; font-weight:700; font-size:1.05rem;
  letter-spacing:.01em; text-decoration:none; border:none; cursor:pointer;
  box-shadow:0 10px 24px -12px rgba(184,147,78,.75), 0 2px 4px rgba(34,32,29,.08);
  transition:transform .18s ease, box-shadow .18s ease, background-color .18s ease;
}
.premium .cta:hover { transform:scale(1.025); background:#A8853F;
  box-shadow:0 14px 30px -12px rgba(184,147,78,.85), 0 2px 6px rgba(34,32,29,.10); }
.premium .cta:focus-visible { outline:3px solid var(--carvao); outline-offset:3px; }
.premium .cta[aria-disabled="true"] {
  background:var(--champagne); color:var(--carvao); box-shadow:none; cursor:default;
}
.premium .cta[aria-disabled="true"]:hover { transform:none; background:var(--champagne); }

.premium .cartao {
  background:var(--papel); border:1px solid var(--champagne); border-radius:14px;
}

/* Aparecer ao rolar, em CSS puro.
 *
 * A primeira versão disto escondia o bloco e esperava o JavaScript revelar. Foi
 * testada num navegador onde um script de terceiro falhou, a hidratação não
 * completou, e a página de venda inteira ficou EM BRANCO abaixo da dobra. Numa
 * página que recebe tráfego pago, isso é pagar por clique para entregar nada.
 *
 * Agora o estado base é visível. A animação é acrescentada só onde o navegador
 * tem linha do tempo de rolagem, e some sozinha para quem pediu menos
 * movimento. Sem JavaScript, sem componente de cliente e sem modo de falhar:
 * o pior caso é a página não animar. */
@keyframes surgir { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .premium .surge {
      animation:surgir linear both;
      animation-timeline:view();
      animation-range:entry 8% cover 24%;
    }
  }
}
@media (prefers-reduced-motion: reduce) {
  .premium .cta { transition:none; }
  .premium .cta:hover { transform:none; }
}
`;
