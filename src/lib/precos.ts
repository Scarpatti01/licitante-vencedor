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
 * dois — leitura diária dos editais de maior aderência, painel e resumo por
 * e-mail. O que muda é quantas empresas cabem na conta.
 *
 * Nasceu de uma constatação: contadores e consultorias gerenciam vários
 * clientes, e são o melhor canal de venda para licitações. Cobrar deles o mesmo
 * que de uma PME com um CNPJ seria deixar dinheiro na mesa; cobrar por empresa
 * avulsa afastaria justamente quem traz cinco de uma vez.
 */

export type Plano = {
  /** Estável, e o que o checkout vai referenciar. Nunca mude sem migrar. */
  codigo: string;
  nome: string;
  /** Para quem é, em uma linha — o leitor precisa se reconhecer. */
  paraQuem: string;
  /** Em centavos, como o banco guarda: `planos.mensalidade_em_centavos`. */
  mensalidadeEmCentavos: number;
  empresas: number;
};

export const PLANOS: readonly Plano[] = [
  {
    codigo: "empresa",
    nome: "Empresa",
    paraQuem: "Para quem disputa licitações com um CNPJ.",
    mensalidadeEmCentavos: 80_000,
    empresas: 1,
  },
  {
    codigo: "consultoria",
    nome: "Consultoria",
    paraQuem: "Para contadores e consultorias que acompanham vários clientes.",
    mensalidadeEmCentavos: 150_000,
    empresas: 5,
  },
] as const;

/**
 * O que os dois planos entregam, igual.
 *
 * Lista única de propósito: se um dia um recurso for exclusivo de um plano,
 * ele sai daqui e vira campo do plano. Enquanto forem iguais, duplicar a lista
 * abriria espaço para elas divergirem sem ninguém decidir que deviam.
 */
export const O_QUE_INCLUI = [
  "Coleta diária do PNCP nas 27 unidades da federação",
  "Triagem por perfil: cidade, atividade, porte e faixa de valor",
  "Leitura do documento nos editais de maior aderência, todo dia",
  "Exigências de habilitação, garantia, visita técnica e riscos extraídos do edital",
  "Resumo diário por e-mail, nos dias úteis",
  "Painel com o histórico e o que falta na sua habilitação",
] as const;

/**
 * O que o plano NÃO faz — e por que fica na mesma altura do que ele faz.
 *
 * Página de preço que só lista virtude obriga o leitor a descobrir os limites
 * depois de pagar, e é aí que nasce pedido de reembolso. Este projeto declara
 * limitação em toda superfície; a página que cobra dinheiro não seria a
 * exceção.
 */
export const O_QUE_NAO_FAZ = [
  "Não garante habilitação nem que você vai ganhar",
  "Não emite opinião jurídica",
  "Não substitui ler o edital inteiro antes de disputar — inclusive os anexos",
  "Não participa da sessão por você",
] as const;

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
