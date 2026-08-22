/**
 * Catálogo dos hubs de conteúdo — fonte única da verdade.
 *
 * Três coisas dependiam de listas separadas e podiam sair de sincronia: o
 * índice em /blog/, o sitemap e o filtro que libera os redirecionamentos do
 * acervo. Todas passam a derivar daqui. Publicar um hub é virar uma flag.
 */

export type Guia = {
  href: string;
  titulo: string;
  resumo: string;
  publicado: boolean;
};

/*
 * Já existiu aqui um campo `urlsResgatadas` com a contagem de endereços do
 * acervo por hub, escrito à mão. Ele saiu porque era a mesma armadilha que este
 * arquivo veio resolver: um número mantido em paralelo ao `redirects.json`,
 * livre para discordar dele — e discordava, subnotificando os endereços que
 * apontam para /sobre/ e /blog/. Quem precisa da contagem deriva do mapa em
 * `./legacy`, que é o dado real.
 */

export const GUIAS: readonly Guia[] = [
  {
    href: "/lei-14133/",
    titulo: "Lei 14.133/2021: o guia do fornecedor",
    resumo:
      "A nova lei de licitações do começo ao fim, na ordem em que ela afeta quem vende: modalidades, critérios de julgamento e o que mudou em relação à 8.666.",
    publicado: true,
  },
  {
    href: "/jurisprudencia/",
    titulo: "Jurisprudência em licitações",
    resumo:
      "Quem decide o quê entre TCU, tribunais estaduais e Judiciário, a diferença entre súmula e acórdão, e como usar uma decisão para impugnar edital ou sustentar recurso.",
    publicado: true,
  },
  {
    href: "/contratos/",
    titulo: "Contrato administrativo",
    resumo:
      "O que acontece depois que a licitação acaba: prazo e prorrogação, aditivos, reajuste e reequilíbrio, garantia, pagamento, extinção e sanções.",
    publicado: true,
  },
  {
    href: "/vender-para-o-governo/",
    titulo: "Como vender para o governo",
    resumo:
      "O caminho completo de quem nunca participou: cadastro, escolha do que disputar, formação de preço e a primeira disputa.",
    publicado: true,
  },
  {
    href: "/sumulas-tcu/",
    titulo: "Súmulas do TCU",
    resumo:
      "As súmulas que mais aparecem em edital, reconstruídas da fonte oficial e traduzidas para o efeito prático sobre a sua proposta.",
    publicado: true,
  },
  {
    href: "/legislacao/",
    titulo: "Legislação de licitações",
    resumo:
      "As normas que valem hoje, o que continua vigente da 8.666 e as regras específicas que aparecem nos editais.",
    publicado: true,
  },
  {
    href: "/habilitacao/",
    titulo: "Habilitação",
    resumo:
      "A documentação exigida em cada fase, o que mais desclassifica fornecedor e como manter a empresa sempre apta a disputar.",
    publicado: true,
  },
  {
    href: "/portais-de-licitacao/",
    titulo: "Portais de licitação",
    resumo:
      "PNCP, Compras.gov.br e os portais estaduais e privados: onde cada certame é publicado e onde a disputa acontece de fato.",
    publicado: true,
  },
];

/** Páginas estruturais que também recebem endereços do acervo. */
export const PAGINAS_FIXAS: readonly string[] = ["/sobre/", "/blog/"];

/**
 * Páginas institucionais, para o sitemap derivar daqui em vez de trazer a lista
 * cravada — era o último lugar do projeto com nomes de rota escritos à mão em
 * paralelo ao que existe. Publicar uma página institucional passa a ser
 * acrescentar uma linha aqui.
 *
 * `prioridade` reflete o papel: /blog/ é porta de entrada de conteúdo, as
 * demais existem para dar confiança e contexto, não para captar busca.
 */
export const PAGINAS_INSTITUCIONAIS: readonly { href: string; prioridade: number }[] = [
  { href: "/blog/", prioridade: 0.7 },
  { href: "/sobre/", prioridade: 0.5 },
  { href: "/metodologia/", prioridade: 0.5 },
  { href: "/aviso-legal/", prioridade: 0.3 },
];

/**
 * Páginas de produto. Prioridade alta no sitemap porque é aqui que a intenção
 * de busca é comercial — quem procura "alerta de licitação" quer contratar, não
 * estudar.
 */
export const PAGINAS_PRODUTO: readonly { href: string; prioridade: number }[] = [
  { href: "/alerta-de-licitacao/", prioridade: 0.9 },
  /*
   * Preços com a mesma prioridade do alerta: desde 22/08 é para cá que o botão
   * principal da home aponta, e página que recebe o CTA principal e fica com
   * prioridade de rodapé passa ao rastreador um sinal que contradiz o site.
   */
  { href: "/precos/", prioridade: 0.9 },
  { href: "/como-funciona/", prioridade: 0.7 },
];

export const GUIAS_PUBLICADOS = GUIAS.filter((g) => g.publicado);
export const GUIAS_EM_RECONSTRUCAO = GUIAS.filter((g) => !g.publicado);
