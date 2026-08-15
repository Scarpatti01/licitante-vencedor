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

/**
 * O canal de contato, e por que ele é uma constante e não texto solto.
 *
 * ## Ele estava faltando, e a interface já prometia que existia
 *
 * Quando o cadastro de leads recusa um e-mail, a mensagem manda "fale com a
 * gente pelo contato" e aponta para `/sobre/` — que não tinha canal nenhum. A
 * pessoa clicava e não achava para onde escrever. Promessa quebrada na tela é
 * pior que ausência declarada.
 *
 * ## E a LGPD exige um
 *
 * O art. 18 dá ao titular o direito de pedir acesso, correção e eliminação dos
 * dados dele, e o art. 9º manda informar como exercer isso. Direito sem endereço
 * para exercê-lo não é direito. Por isso o mesmo endereço serve de contato geral
 * e de canal do titular: um só, monitorado, em vez de dois em que um é esquecido.
 *
 * ⚠️ **Precisa ser uma caixa REAL e monitorada.** O domínio é nosso e já está em
 * uso no Resend, então `contato@` está sob nosso controle — mas se a caixa não
 * existir, pedido de titular volta com erro e o descumprimento é nosso. Trocar
 * aqui muda em todo lugar: rodapé, privacidade, termos e o formulário.
 */
export const CONTATO = {
  email: "contato@licitantevencedor.com.br",
  /**
   * O controlador, no vocabulário do art. 5º, VI da LGPD.
   *
   * Enquanto a operação é de pessoa física, o controlador é o titular do
   * domínio. Quando houver CNPJ, é aqui que ele entra — e as páginas legais
   * acompanham, porque leem deste objeto em vez de repetir o nome em cada
   * parágrafo.
   */
  controlador: "Leandro Scarpatti",
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
