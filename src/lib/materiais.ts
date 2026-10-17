/**
 * Os materiais gratuitos que o site entrega em troca do e-mail.
 *
 * ## Por que existem
 *
 * Até 17/10/2026 a única troca oferecida no meio do texto era o teste de 14
 * dias: compromisso alto para quem chegou procurando um prazo. Em 30 dias de
 * Search Console (18/09 a 16/10) foram 81 cliques e nenhum lead novo. O
 * material é o degrau do meio: uma coisa útil agora, ligada ao assunto que a
 * pessoa estava lendo.
 *
 * ## Como chega
 *
 * Pelo mesmo double opt-in do resto da lista: o formulário grava o lead, o
 * e-mail de confirmação diz que o material vem depois do clique, e a página de
 * confirmação entrega o link. O slug viaja no link de confirmação (`m=`), e não
 * só na `origem` gravada, porque o destino absorve o segundo cadastro do mesmo
 * e-mail mantendo a linha antiga: quem já estava na lista e pede o modelo ainda
 * precisa recebê-lo.
 *
 * O arquivo fica em `public/materiais/`, e os geradores em `materiais/`, onde o
 * texto pode ser revisado em diff.
 *
 * ## A regra de consentimento (LGPD)
 *
 * O formulário do material diz: "usamos seu e-mail apenas para enviar o
 * material que você pediu". Lead cuja origem contém `#material-` consentiu com
 * ISSO e nada mais: não entra em alerta, campanha nem convite. O envio de
 * alertas já o exclui (`alertas/repositorio.ts`). Atenção ao caso que a origem
 * não resolve: quem pede o material com um e-mail que já estava na lista mantém
 * a origem antiga, e o consentimento anterior. Qualquer envio novo para "todos
 * os confirmados" precisa olhar isto antes.
 */

export type Material = {
  /** Vai na origem do lead e no link de confirmação. Nunca muda depois de publicado. */
  slug: string;
  /** Como o material é chamado no e-mail e na tela: "o modelo de impugnação de edital". */
  nome: string;
  /** O nome curto, com artigo, para o botão e o assunto. */
  nomeCurto: string;
  arquivo: string;
  formato: string;
  /** Uma frase sobre o que a pessoa recebe. */
  descricao: string;
  /** Onde o material é oferecido, para "pedir de novo" quando o link expira. */
  pagina: string;
};

export const MATERIAIS = {
  "modelo-de-impugnacao": {
    slug: "modelo-de-impugnacao",
    nome: "o modelo de impugnação de edital",
    nomeCurto: "o modelo de impugnação",
    arquivo: "/materiais/modelo-de-impugnacao-de-edital.docx",
    formato: "documento editável (.docx), abre no Word e no Google Docs",
    pagina: "/blog/prazo-para-impugnar-edital-de-licitacao/",
    descricao:
      "A estrutura do pedido, com a tempestividade do art. 164 já escrita e campos para a cláusula, o fundamento e o pedido do seu caso.",
  },
  "folha-de-habilitacao": {
    slug: "folha-de-habilitacao",
    nome: "a folha de habilitação do Workbook do Licitante",
    nomeCurto: "a folha de habilitação",
    arquivo: "/materiais/folha-de-habilitacao.pdf",
    formato: "PDF de uma página, para imprimir ou preencher",
    pagina: "/blog/documentos-para-participar-de-licitacao/",
    descricao:
      "Os documentos de habilitação numa folha só, com a coluna de vencimento que evita mandar certidão já vencida na data da proposta, o caso que a diligência do art. 64 não conserta.",
  },
} as const satisfies Record<string, Material>;

export type SlugDeMaterial = keyof typeof MATERIAIS;

/**
 * O material de um slug vindo de fora (formulário, link), ou `null`.
 *
 * `Object.hasOwn`, e não `slug in MATERIAIS`: o slug chega de uma URL pública,
 * e `"toString" in MATERIAIS` é verdadeiro.
 */
export function materialPorSlug(slug: unknown): Material | null {
  if (typeof slug !== "string" || !Object.hasOwn(MATERIAIS, slug)) return null;
  return MATERIAIS[slug as SlugDeMaterial];
}
