/**
 * Constantes de marca e identidade do site.
 * Fonte única da verdade — nada de string de marca solta pelos componentes.
 */

export const SITE = {
  name: "Licitante Vencedor",
  url: "https://licitantevencedor.com.br",
  locale: "pt-BR",
  tagline: "Os editais que sua empresa pode ganhar, já lidos.",
  description:
    "Triagem diária dos editais do PNCP para empresas que vendem ao governo: o que pedem, o que falta na sua habilitação, o prazo e o risco.",
  foundingYear: "2016",
} as const;

export const AUTHOR = {
  name: "Leandro Scarpatti",
  slug: "leandro-scarpatti",
  jobTitle: "Fundador e analista de licitações",
  photo: "/authors/leandro-scarpatti.jpg",
  bio: "Acompanha diariamente as publicações do Portal Nacional de Contratações Públicas e transforma edital bruto em decisão de negócio para empresas fornecedoras.",
  // TODO: preencher com LinkedIn e demais perfis antes da Etapa 4 (camada de entidade).
  sameAs: [] as string[],
} as const;

export const KNOWS_ABOUT = [
  "Licitações públicas",
  "Lei 14.133/2021",
  "Pregão eletrônico",
  "Portal Nacional de Contratações Públicas",
  "SICAF",
  "Habilitação em licitações",
  "Dispensa de licitação",
  "Contratos administrativos",
] as const;
