/**
 * A oferta da jornada, num lugar só.
 *
 * Preço, garantia e link de checkout mudam sem que o produto mude, e quando
 * eles estão espalhados por três telas alguém corrige duas e esquece a
 * terceira. O cliente lê um preço na página e paga outro no checkout, que é a
 * forma mais barata de perder alguém que já tinha decidido comprar.
 *
 * Os campos com `EDITAVEL` no comentário são decisões comerciais do dono, não
 * fatos apurados. Estão aqui em vez de escondidos no meio do JSX justamente
 * para ele trocar sem pedir nada a ninguém.
 */

export const OFERTA = {
  nome: "Jornada de 12 Semanas",
  nomeCompleto: "Workbook do Licitante: Jornada de 12 Semanas",

  preco: 47,
  precoEscrito: "R$ 47",
  formaDeCobranca: "pagamento único" as const,

  /**
   * EDITÁVEL. A URL do checkout externo (Hotmart ou outra). Vazia enquanto a
   * venda não está no ar: com ela vazia o botão vira aviso honesto de "em
   * breve" em vez de um link quebrado, e a guarda cobra que os dois estados
   * continuem coerentes.
   */
  CHECKOUT: "",

  /** Garantia incondicional. O mínimo legal de arrependimento é 7 dias. */
  diasDeGarantia: 7,

  /**
   * EDITÁVEL. A ancoragem de valor da oferta.
   *
   * Estes números NÃO são preços praticados nem apuração de nada: são o valor
   * percebido que a página usa para ancorar. Ficam aqui, nomeados e separados
   * do texto, porque ancoragem é decisão comercial e precisa ser trocável em
   * dez segundos. Se você não quiser ancorar, zere `mostrarAncoragem`.
   */
  mostrarAncoragem: true,
  ancoragem: [
    { item: "O Workbook do Licitante completo, 126 páginas", valor: 97 },
    { item: "As 12 semanas guiadas dentro do sistema", valor: 197 },
    { item: "As 7 folhas de trabalho para preencher e reusar", valor: 67 },
    { item: "Exportação das suas respostas em PDF", valor: 47 },
    { item: "Glossário de 89 termos do edital", valor: 37 },
  ],

  /** EDITÁVEL. Vídeo de vendas. Vazio esconde o bloco inteiro em vez de
   *  deixar um retângulo cinza no topo da página. */
  VIDEO_EMBED: "",

  /** EDITÁVEL. Depoimentos em vídeo, quando existirem. Nada é inventado: com a
   *  lista vazia, a seção não aparece. */
  DEPOIMENTOS: [] as { nome: string; embed: string }[],
} as const;

export function checkoutAberto(): boolean {
  return OFERTA.CHECKOUT.trim().length > 0;
}

export function valorAncorado(): number {
  return OFERTA.ancoragem.reduce((soma, item) => soma + item.valor, 0);
}

export function economiaEmReais(): number {
  return valorAncorado() - OFERTA.preco;
}
