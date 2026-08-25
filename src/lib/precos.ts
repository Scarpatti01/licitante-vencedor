/**
 * Os planos, e o que cada um promete.
 *
 * ## Fonte única, porque o preço aparece em três lugares
 *
 * A página de preços, os dados estruturados que buscadores e motores de IA leem
 * (`schema.org/Offer`), e — quando existir — o checkout. Preço divergente entre
 * a página e o `Offer` é o tipo de erro que ninguém vê e que faz o buscador
 * mostrar um valor errado no resultado da busca.
 *
 * ## O eixo é o número de empresas, e isso foi decisão do dono
 *
 * Não é limite de uso disfarçado de plano: o produto entrega a mesma coisa nos
 * dois — leitura dos editais de maior aderência, painel e resumo por
 * e-mail. O que muda é quantas empresas cabem na conta.
 *
 * Nasceu de uma constatação: contadores e consultorias gerenciam vários
 * clientes, e são o melhor canal de venda para licitações. Cobrar deles o mesmo
 * que de uma PME com um CNPJ seria deixar dinheiro na mesa; cobrar por empresa
 * avulsa afastaria justamente quem traz cinco de uma vez.
 */

import { LIMITE_DE_RECORTES } from "./dominio/recorte.ts";

export type Plano = {
  /** Estável, e o que o checkout vai referenciar. Nunca mude sem migrar. */
  codigo: string;
  nome: string;
  /** Para quem é, em uma linha — o leitor precisa se reconhecer. */
  paraQuem: string;
  /** Em centavos, como o banco guarda: `planos.mensalidade_em_centavos`. */
  mensalidadeEmCentavos: number;
  empresas: number;
  /**
   * Até onde o produto lê o edital neste plano.
   *
   * `"lista"` é o que a COLETA já traz: objeto, órgão, modalidade, valor
   * estimado, prazo, e o score calculado em cima disso — sem custo de IA, e é
   * por isso que o plano leve pode custar R$ 59. `"documento"` é a leitura do
   * arquivo do edital, que extrai exigência de habilitação, garantia, visita
   * técnica e risco. Cada leitura dessas custa dinheiro por edital.
   *
   * O nome casa com `AnaliseDoEdital["profundidade"]` de propósito: é a mesma
   * distinção, e o domínio já sabia representá-la em `analiseNaoRealizada`.
   */
  profundidade: "lista" | "documento";
  /**
   * Quantos recortes de abrangência cabem. `null` quando o plano não usa
   * recorte e sim o perfil inteiro, sem limite geográfico.
   */
  recortes: number | null;
};

/**
 * O formato de um código de plano, igual ao que o banco cobra.
 *
 * `planos_codigo_check` exige `^[a-z0-9_]+$`. O teste daqui exigia
 * `^[a-z-]+$`, com hífen, e as duas regras se CONTRADIZIAM: qualquer código com
 * hífen passava no TypeScript e era recusado pelo Postgres, e qualquer um com
 * sublinhado fazia o contrário. Ninguém tinha notado porque os dois primeiros
 * planos ("empresa", "consultoria") são uma palavra só e passam nas duas.
 *
 * Descoberto em 25/08 tentando gravar `leve-escritorio`. O código é o que o
 * checkout vai referenciar, então um plano que não entra na tabela é um plano
 * que não dá para cobrar.
 */
export const FORMATO_DO_CODIGO = /^[a-z0-9_]+$/u;

export const PLANOS: readonly Plano[] = [
  {
    codigo: "leve",
    nome: "Leve",
    paraQuem: "Para quem só precisa saber que o edital existe, cedo.",
    mensalidadeEmCentavos: 5_900,
    empresas: 1,
    profundidade: "lista",
    recortes: LIMITE_DE_RECORTES,
  },
  {
    codigo: "leve_escritorio",
    nome: "Leve Escritório",
    paraQuem: "Para contadores que acompanham os editais de vários clientes.",
    mensalidadeEmCentavos: 24_900,
    empresas: 5,
    profundidade: "lista",
    recortes: LIMITE_DE_RECORTES,
  },
  {
    codigo: "empresa",
    nome: "Empresa",
    paraQuem: "Para quem disputa licitações com um CNPJ.",
    mensalidadeEmCentavos: 80_000,
    empresas: 1,
    profundidade: "documento",
    recortes: null,
  },
  {
    codigo: "consultoria",
    nome: "Consultoria",
    paraQuem: "Para contadores e consultorias que acompanham vários clientes.",
    mensalidadeEmCentavos: 150_000,
    empresas: 5,
    profundidade: "documento",
    recortes: null,
  },
] as const;

/**
 * O que TODO plano entrega, independente da profundidade.
 *
 * A lista deixou de ser única em 25/08, quando o plano leve nasceu — e o
 * comentário que estava aqui já previa o dia: "se um dia um recurso for
 * exclusivo de um plano, ele sai daqui e vira campo do plano". Saiu.
 *
 * O que ficou nesta lista é o que a COLETA entrega, e a coleta é a mesma para
 * todo mundo. Ela roda uma vez por dia nas 27 UFs, custa o mesmo com um cliente
 * ou com cem, e é por isso que o plano de R$ 59 pode existir sem subsídio.
 */
export const O_QUE_TODO_PLANO_INCLUI = [
  "Coleta diária do PNCP nas 27 unidades da federação",
  "Triagem por perfil: cidade, atividade, porte e faixa de valor",
  "Resumo por e-mail nos dias úteis — e silêncio em dia sem edital novo",
  "Painel com o histórico do que já passou pelo seu perfil",
] as const;

/** O que só quem paga a leitura do documento recebe. */
export const O_QUE_A_LEITURA_ACRESCENTA = [
  "Leitura do documento nos editais que passam no seu perfil — sem número mínimo por dia",
  "Exigências de habilitação, garantia, visita técnica e riscos extraídos do edital",
  "Prontidão documental: o que falta na sua habilitação para cada edital",
  "Abrangência sem limite: o perfil inteiro, não um recorte",
] as const;

/**
 * O que o plano de lista entrega no lugar da leitura.
 *
 * Escrito como entrega e não como consolo: o recorte é um recurso de verdade,
 * e é o que o plano caro NÃO tem. Quem paga R$ 800 recebe tudo do perfil; quem
 * paga R$ 59 escolhe três frentes e afina cada uma separadamente.
 */
export const O_QUE_O_PLANO_DE_LISTA_INCLUI = [
  `Até ${LIMITE_DE_RECORTES} recortes: cidade, estado ou Brasil, cada um com o próprio filtro`,
  "O que a publicação traz: objeto, órgão, modalidade, valor estimado e prazo",
  "Score de aderência ao seu perfil, calculado sobre esses dados",
] as const;

/** A lista completa de um plano, montada a partir da profundidade dele. */
export function oQueIncluiO(plano: Plano): readonly string[] {
  return [
    ...O_QUE_TODO_PLANO_INCLUI,
    ...(plano.profundidade === "documento"
      ? O_QUE_A_LEITURA_ACRESCENTA
      : O_QUE_O_PLANO_DE_LISTA_INCLUI),
  ];
}

/**
 * O que NENHUM plano faz — e por que fica na mesma altura do que ele faz.
 *
 * Página de preço que só lista virtude obriga o leitor a descobrir os limites
 * depois de pagar, e é aí que nasce pedido de reembolso. Este projeto declara
 * limitação em toda superfície; a página que cobra dinheiro não seria a
 * exceção.
 */
export const O_QUE_NENHUM_PLANO_FAZ = [
  "Não garante habilitação nem que você vai ganhar",
  "Não emite opinião jurídica",
  "Não substitui ler o edital inteiro antes de disputar — inclusive os anexos",
  "Não participa da sessão por você",
] as const;

/**
 * O limite que só o plano de lista tem, dito com todas as letras.
 *
 * Esta é a frase mais importante da página inteira. Sem ela, o cliente de R$ 59
 * acha que comprou o de R$ 800, descobre no primeiro edital que perdeu por
 * falta de um documento que ninguém avisou que era exigido, e pede reembolso
 * com razão. Ela não pode ser amenizada nem escondida num rodapé.
 */
export const O_QUE_O_PLANO_DE_LISTA_NAO_FAZ = [
  "Não abre o arquivo do edital: você recebe o que a publicação informa, não o que o documento exige",
  "Não lista exigências de habilitação, garantia nem visita técnica",
  "Não diz o que falta na sua documentação",
] as const;

/** O que este plano não faz, somando o que vale para todos. */
export function oQueNaoFazO(plano: Plano): readonly string[] {
  return [
    ...(plano.profundidade === "lista" ? O_QUE_O_PLANO_DE_LISTA_NAO_FAZ : []),
    ...O_QUE_NENHUM_PLANO_FAZ,
  ];
}

/** Ex.: "R$ 800". Sem centavos: nenhum plano tem, e ".00" só polui. */
export function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/** Ex.: "R$ 300 por empresa" — o número que faz o plano maior fazer sentido. */
export function porEmpresa(plano: Plano): string {
  return `${emReais(Math.round(plano.mensalidadeEmCentavos / plano.empresas))} por empresa`;
}

/**
 * Uma linha da tabela `planos`, como o PostgREST devolve.
 *
 * Este arquivo é a fonte do preço PUBLICADO; a tabela é a fonte do preço
 * COBRADO. Os dois existem de propósito — a página é estática e não abre banco,
 * a cobrança precisa de linha editável sem deploy — e por isso precisam de
 * alguém conferindo que dizem o mesmo.
 */
export type PlanoNoBanco = {
  codigo: string;
  ativo: boolean;
  mensalidade_em_centavos: number;
  limite_de_empresas: number | null;
};

/**
 * O que diverge entre o preço anunciado e o preço cobrável. Lista vazia é
 * "conferem".
 *
 * É função pura e mora aqui, e não no script, porque o script precisa de rede e
 * de credencial de serviço — o que o deixaria fora do alcance do `vitest`. A
 * comparação é justamente a parte que não pode estar errada, então ela é o
 * pedaço que fica testável.
 */
export function divergenciasDePreco(noBanco: readonly PlanoNoBanco[]): string[] {
  const divergencias: string[] = [];
  const porCodigo = new Map(noBanco.map((l) => [l.codigo, l]));

  for (const plano of PLANOS) {
    const linha = porCodigo.get(plano.codigo);
    if (!linha) {
      divergencias.push(
        `"${plano.codigo}" está publicado em /precos/ e não existe na tabela planos — ninguém consegue assinar o que a página oferece.`,
      );
      continue;
    }
    if (!linha.ativo) {
      divergencias.push(`"${plano.codigo}" está publicado em /precos/ mas está inativo no banco.`);
    }
    if (linha.mensalidade_em_centavos !== plano.mensalidadeEmCentavos) {
      divergencias.push(
        `"${plano.codigo}": a página anuncia ${plano.mensalidadeEmCentavos} centavos e o banco cobra ${linha.mensalidade_em_centavos}.`,
      );
    }
    if (linha.limite_de_empresas !== plano.empresas) {
      divergencias.push(
        `"${plano.codigo}": a página promete ${plano.empresas} empresa(s) e o banco permite ${linha.limite_de_empresas ?? "sem limite"}.`,
      );
    }
  }

  // O outro lado, e o mais fácil de esquecer: plano cobrável que a página não
  // anuncia. Ele não quebra tela nenhuma — só permite existir uma cobrança que
  // o cliente não tem onde conferir.
  const publicados = new Set(PLANOS.map((p) => p.codigo));
  for (const linha of noBanco) {
    if (linha.ativo && !publicados.has(linha.codigo)) {
      divergencias.push(
        `"${linha.codigo}" está ativo no banco e não aparece em /precos/ — dá para cobrar por ele sem o cliente ter onde conferir o preço.`,
      );
    }
  }

  return divergencias;
}
