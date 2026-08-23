import "server-only";

/**
 * Plano e assinatura — leitura, e nada além disso.
 *
 * O modelo comercial do produto (implantação, mensalidade, taxa de êxito) é
 * configurável POR PLANO no banco. Ele não é constante de interface, e não pode
 * virar uma: preço escrito numa tela vira preço divergente do contrato assim
 * que a primeira negociação sai do padrão, e a tela passa a mentir para o
 * cliente sobre quanto ele paga.
 *
 * Por isso esta função devolve `null` com motivo, em vez de devolver números
 * plausíveis. A tabela `planos` existe e está semeada com Empresa e
 * Consultoria, mas NENHUMA assinatura foi emitida ainda — não há processadora
 * ligada. Enquanto for assim, a resposta honesta é "não há plano ativo
 * registrado", e é isso que a tela mostra.
 *
 * ## Para quem for ligar a leitura de verdade
 *
 * A assinatura NÃO pende mais da empresa: ela pertence ao TITULAR, porque o
 * preço é por conta e limita quantas empresas cabem nela (R$ 800 para uma,
 * R$ 1.500 para até cinco). A consulta certa parte de `assinaturas.titular_id`,
 * e "esta empresa está paga?" é a view `cobertura_da_empresa`.
 *
 * O parâmetro `empresaId` continua aqui de propósito — a tela é da empresa
 * aberta e a resposta muda com ela —, mas ele é o ponto de partida da pergunta,
 * não a chave da linha. Filtrar `assinaturas` por empresa é o modelo antigo, e
 * ele não existe mais no banco.
 *
 * A tela já sabe renderizar todos os campos opcionais como ausentes, então
 * nenhum componente precisa mudar quando a fonte entrar.
 */

export type StatusDaAssinatura =
  | "teste"
  | "ativa"
  | "inadimplente"
  | "cancelada"
  | "encerrada";

export type Assinatura = {
  plano: string;
  status: StatusDaAssinatura;
  /** Em reais. `null` quando o plano não cobra aquele componente. */
  implantacao: number | null;
  mensalidade: number | null;
  /** Percentual sobre o contrato ganho, quando o plano tiver taxa de êxito. */
  taxaDeExitoPercentual: number | null;
  renovaEm: string | null;
  limites: { recurso: string; incluido: number | null }[];
};

export type LeituraDaAssinatura =
  | { encontrada: true; assinatura: Assinatura }
  | { encontrada: false; motivo: string };

export async function assinaturaDaEmpresa(empresaId: string): Promise<LeituraDaAssinatura> {
  // A empresa é parâmetro obrigatório pela mesma razão de toda leitura da porta
  // de dados: nenhuma função devolve dado sem que o chamador diga de quem ele é.
  // A regra vale desde antes de haver o que ler — vale sobretudo agora, para que
  // a implementação que entrar aqui já nasça com o filtro no lugar certo.
  if (empresaId.trim() === "") {
    throw new Error("assinaturaDaEmpresa exige a empresa dona do dado.");
  }

  return {
    encontrada: false,
    motivo:
      "Nenhum plano ativo está registrado para esta empresa. Os valores de implantação, mensalidade e taxa de êxito são definidos por plano no cadastro comercial — e esta tela mostra o que estiver registrado lá, nunca um valor fixo escrito na interface.",
  };
}
