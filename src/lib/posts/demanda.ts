import type { Edital } from "../fontes/tipos.ts";

/**
 * Quanto interesse de busca existe pelo que este edital compra.
 *
 * ## Por que a seleção precisava disto
 *
 * Até 26/08 a leva do dia era escolhida por PRAZO: os que encerram antes, entre
 * os ainda acionáveis. O critério é bom para o leitor que já está na página e
 * péssimo para o leitor que ainda não chegou, porque prazo não é assunto que
 * ninguém procura. O resultado era publicar 25 páginas por dia sem uma única
 * pergunta sobre quem as procuraria.
 *
 * ## O que a pesquisa de 26/08 mostrou, e é desconfortável
 *
 * Fui ver quem ganha as buscas deste mercado. Para consulta de edital por
 * cidade, os primeiros lugares são, sem exceção:
 *
 * 1. o portal do próprio órgão (`betim.mg.gov.br/portal/editais`, e dezenas
 *    iguais);
 * 2. uma página-âncora de concorrente por praça ("Licitações em São Paulo:
 *    editais abertos e como participar", da ConLicitação);
 * 3. guias ("PNCP: o que é e como consultar em 2026", da Effecti; "Lei 14.133
 *    atualizada 2026", de três concorrentes ao mesmo tempo).
 *
 * Nenhuma página de UM edital, de nenhum agregador, aparece. E faz sentido: a
 * pessoa que busca um edital específico já sabe o número dele e vai à fonte
 * oficial, que sempre vai ranquear melhor que a cópia. O cabeçalho de
 * `selecao.ts` já dizia isso e concluía "por isso acrescentamos a nossa
 * leitura". A evidência é que a leitura não basta para vencer a fonte NAQUELA
 * busca — ela basta para servir quem já chegou por outro caminho.
 *
 * Isso não torna o post inútil: ele é a prova pública de que a leitura existe,
 * e é o que a página do município tem para mostrar. Torna a QUANTIDADE inútil.
 *
 * ## O que esta tabela é, e o que ela não é
 *
 * É julgamento editorial escrito em código, não medição. Não temos acesso a
 * dado de busca hoje: o plano do Ahrefs recusa `keywords-explorer` e o Search
 * Console está atrás de uma autorização que só o dono pode dar. Quando esse
 * acesso existir, esta tabela é o primeiro lugar a trocar por número medido, e
 * está desenhada para isso — uma lista de categorias com peso, e nada mais.
 *
 * Os dois eixos do peso, e eles brigam entre si:
 *
 * - **quanto se busca**: "licitação de merenda escolar" é procurado por quem
 *   vende merenda; "aquisição de gêneros alimentícios" é como o órgão escreve.
 *   A ponte entre as duas linguagens é o que o site pode oferecer e o portal do
 *   órgão não oferece.
 * - **quantas PMEs conseguem disputar**: obra de R$ 40 milhões tem cinco
 *   concorrentes possíveis no país. Material de expediente tem milhares. O
 *   produto é para PME, então categoria que muita gente pode disputar vale mais
 *   do que categoria que movimenta mais dinheiro.
 *
 * Onde os dois brigam, o segundo ganha. Obra e engenharia são o que mais se
 * busca neste mercado e estão no fim desta tabela de propósito.
 */

export type Categoria = {
  /** Como o site chama isso, na língua de quem vende. */
  nome: string;
  /**
   * O que procurar no objeto declarado pelo órgão.
   *
   * Sem acento e em minúscula: o objeto do PNCP chega em CAIXA ALTA, em Título
   * e com acentuação inconsistente dentro do mesmo órgão.
   */
  termos: readonly string[];
  /**
   * De 1 a 10. Ver os dois eixos no cabeçalho.
   *
   * O número não vem de medição, e o comentário de cada linha diz o raciocínio
   * para ele poder ser contestado com dado quando houver dado.
   */
  peso: number;
};

export const CATEGORIAS: readonly Categoria[] = [
  {
    nome: "Alimentação escolar",
    // O órgão escreve "gêneros alimentícios"; quem vende procura "merenda
    // escolar". Milhares de pequenos fornecedores por todo o país, e compra
    // recorrente em toda prefeitura que tem escola — ou seja, em todas.
    /*
      * Nada de "alimenta" solto, e o motivo veio da amostra real de 26/08: um
      * credenciamento de HOTEL — "prestação de serviços de hospedagem com
      * alimentação" — encabeçou a leva classificado como merenda escolar.
      * Termo curto casa mais, e casar mais não é casar melhor.
      */
    termos: [
      "merenda",
      "generos aliment",
      "alimentacao escolar",
      "agricultura familiar",
      "hortifruti",
      "panific",
      "cesta basica",
    ],
    peso: 10,
  },
  {
    nome: "Material de expediente e escolar",
    // Teto de entrada baixíssimo: papelaria de bairro disputa. É o edital com
    // que a maioria das PMEs começa, e quem está começando é quem mais procura.
    termos: ["expediente", "material escolar", "papelaria", "suprimento de inform"],
    peso: 9,
  },
  {
    nome: "Medicamentos e insumos de saúde",
    // Volume enorme e recorrente, com distribuidoras pequenas em toda região.
    // "Saúde" apareceu em 15 dos 100 editais da lista nacional de 26/08.
    // "insumo" solto pegava insumo agrícola e de construção; qualificado, não.
    termos: [
      "medicament",
      "insumo hospitalar",
      "insumo odontolog",
      "material hospitalar",
      "odontolog",
      "oxigenio",
      "farmac",
      "fralda",
    ],
    peso: 9,
  },
  {
    nome: "Limpeza e conservação",
    // Serviço continuado, contrato longo, e a dúvida de habilitação mais
    // buscada do mercado depois de obra: quantos funcionários, qual atestado.
    termos: ["limpeza", "conservacao", "higien", "zeladoria", "copa e cozinha"],
    peso: 8,
  },
  {
    nome: "Transporte e locação de veículos",
    // Locadora pequena e transporte escolar entram. Apareceu em 10 dos 100.
    termos: ["transporte", "locacao de veic", "veicul", "combustiv", "onibus", "van"],
    peso: 8,
  },
  {
    nome: "Manutenção predial e reforma",
    // Meio-termo: exige atestado, mas construtora pequena e prestador local
    // disputam. Apareceu em 13 dos 100, o segundo mais comum.
    termos: ["manutencao", "reforma", "reparo", "ar condicionado", "eletric", "hidraulic"],
    peso: 7,
  },
  {
    nome: "Tecnologia e software",
    // Busca alta e concorrência nacional: a empresa de fora ganha do local com a
    // mesma facilidade, então o alerta vale menos para o assinante de praça.
    termos: ["informatica", "software", "licenca de uso", "sistema de gestao", "computador", "notebook"],
    peso: 6,
  },
  {
    nome: "Mobiliário e equipamentos",
    // "equipament" solto engolia "equipamentos de proteção individual" e
    // "equipamentos de informática", que têm categoria própria logo acima.
    termos: ["mobiliario", "movei", "equipamento permanente", "eletrodomest", "climatiz"],
    peso: 6,
  },
  {
    nome: "Uniformes e vestuário",
    termos: ["uniforme", "vestuario", "fardamento", "epi", "calcado"],
    peso: 6,
  },
  {
    nome: "Coleta de resíduos",
    termos: ["coleta de residuo", "residuo solido", "entulho", "varricao"],
    peso: 5,
  },
  {
    nome: "Obras e engenharia",
    /*
     * O que mais se busca, e por isso o último.
     *
     * "Licitação de obras" é a consulta de maior volume do mercado, e é
     * justamente onde o site tem menos a acrescentar: pavimentação de R$ 12
     * milhões tem meia dúzia de concorrentes possíveis na região, todos já
     * sabem do edital pelo sindicato antes de ele sair, e nenhum deles é o
     * cliente de R$ 59 por mês. Publicar por volume de busca aqui encheria a
     * leva de páginas que atraem leitor que não vira assinante.
     */
    termos: ["obras", "obra de", "engenharia", "pavimenta", "construcao", "drenagem", "recapea"],
    peso: 3,
  },
];

/** O peso de quem não casa com nenhuma categoria. */
export const PESO_SEM_CATEGORIA = 4;

/**
 * Tira acento e caixa, para comparar com os termos da tabela.
 *
 * O objeto do PNCP chega como o servidor digitou: `"AQUISIÇÃO DE GÊNEROS
 * ALIMENTÍCIOS"`, `"Aquisicao de generos alimenticios"` e `"aquisição de
 * gêneros"` são o mesmo edital escrito por três prefeituras diferentes.
 */
export function normalizar(texto: string): string {
  // Escrito com escape (`\u0300-\u036f`), e não com os caracteres crus: eles são
  // combinantes, aparecem grudados no colchete em qualquer editor e sobrevivem mal
  // a copiar e colar. Eu mesmo os manguei uma vez editando este arquivo.
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * A categoria deste edital, ou `null`.
 *
 * A PRIMEIRA que casar ganha, e a ordem da tabela é de peso decrescente. Um
 * edital de "reforma da cozinha da escola" casa com alimentação antes de casar
 * com reforma, e é o que se quer: quem procura é o fornecedor de cozinha
 * industrial, não a construtora.
 */
export function categoriaDoObjeto(objeto: string): Categoria | null {
  const limpo = normalizar(objeto);
  for (const categoria of CATEGORIAS) {
    if (categoria.termos.some((termo) => limpo.includes(termo))) return categoria;
  }
  return null;
}

/**
 * O peso de demanda deste edital.
 *
 * Sem categoria não é zero: é `PESO_SEM_CATEGORIA`, no meio da tabela. Zerar
 * faria a tabela virar uma lista de permissão — e uma lista de permissão escrita
 * à mão, sem dado de busca, decidiria que categoria nenhuma que eu não pensei
 * merece existir. O objeto que ninguém classificou pode ser exatamente o nicho
 * que o concorrente não cobre.
 */
export function pesoDaDemanda(edital: Pick<Edital, "objeto">): number {
  return categoriaDoObjeto(edital.objeto)?.peso ?? PESO_SEM_CATEGORIA;
}
