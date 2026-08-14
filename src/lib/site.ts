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

/**
 * As imagens de compartilhamento de uma página que declara `openGraph` próprio.
 *
 * Existe por causa de um defeito que só apareceu conferindo o HTML de VÁRIAS
 * páginas, e não só o da home: **o `opengraph-image.tsx` da raiz não alcança
 * quem define `openGraph` próprio.** O Next mescla metadata campo a campo, de
 * forma rasa — uma página que declara `openGraph: { title, description, url }`
 * substitui o objeto inteiro do layout e leva as imagens junto.
 *
 * O resultado era traiçoeiro: a home compartilhava com cartão, e treze páginas
 * de conteúdo — o blog, os guias, a `/alerta-de-licitacao/`, que é a página de
 * conversão — continuavam saindo como link pelado. Cada uma "funcionava", e o
 * objetivo da mudança ficava por cumprir justamente onde ela mais valia.
 *
 * `/lei-14133/` e `/jurisprudencia/` NÃO usam esta constante: elas têm
 * `opengraph-image.tsx` próprio, e o cartão do próprio segmento sobrevive à
 * sobrescrita. Apontá-las para cá trocaria o cartão específico pelo genérico.
 *
 * A barra final não é enfeite: o site roda com `trailingSlash: true`, e
 * `/opengraph-image` sem barra responde 308. Um redirecionamento a mais é uma
 * chance a mais de um rastreador desistir antes de buscar a imagem.
 */
export const IMAGENS_DE_COMPARTILHAMENTO = [
  {
    url: `${SITE.url}/opengraph-image/`,
    width: 1200,
    height: 630,
    alt: `${SITE.name} — ${SITE.tagline}`,
  },
];
