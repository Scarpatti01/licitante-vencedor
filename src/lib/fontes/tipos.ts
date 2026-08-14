/**
 * A porta de entrada de dados do produto.
 *
 * O PNCP é a primeira fonte, não a única: cada estado e cada tribunal ainda
 * mantém portal próprio, e um certame de interesse pode aparecer só lá. Se o
 * resto do sistema falar "PNCP", acrescentar a segunda fonte vira reescrita.
 * Por isso o contrato está aqui e o PNCP é uma implementação dele
 * (`src/lib/fontes/pncp.ts`) — quem consome coleta fala com `FonteDeEditais`.
 *
 * O que uma fonte precisa DECLARAR sobre si mesma está no tipo de propósito:
 * que UFs cobre e se aceita filtro por data mudam o plano de coleta, e
 * descobrir isso na marra (pedir e ver o que volta) custa requisição contra
 * serviço público instável.
 */

/**
 * Um edital, no vocabulário do projeto — estável mesmo que a fonte mexa no dela.
 *
 * Note a separação entre as três identidades:
 *
 *   `idNaFonte` — como AQUELA fonte chama o registro. Serve para voltar nela.
 *   `fonte`     — quem publicou o que estamos lendo. Serve para procedência.
 *   `id`        — a chave canônica do projeto, e a única usada como chave em
 *                 mapa, banco ou URL.
 *
 * Duas fontes podem publicar o MESMO certame com `idNaFonte` diferente. Quem
 * resolve isso é `deduplicacao.ts`, não este tipo.
 */
export type Edital = {
  /** Chave canônica do projeto. Para o PNCP é o `numeroControlePNCP`. */
  id: string;
  /** Nome curto da fonte que produziu este registro (`fonte.nome`). */
  fonte: string;
  /** Identificador do registro DENTRO da fonte, como ela o publica. */
  idNaFonte: string;
  objeto: string;
  orgao: {
    cnpj: string;
    nome: string;
    esfera: "federal" | "estadual" | "municipal" | "distrital" | "desconhecida";
  };
  local: {
    uf: string;
    municipio: string;
    municipioSlug: string;
    codigoIbge: string;
  };
  modalidade: string;
  modoDisputa: string | null;
  instrumento: string | null;
  amparoLegal: string | null;
  registroDePrecos: boolean;
  /**
   * Em reais. `null` quando o órgão não informou.
   *
   * O PNCP usa `0` para "não informado" e também aceita valores reais baixos —
   * há editais legítimos de R$ 0,01. Distinguir os dois é impossível pelo
   * endpoint de lista, então `0` vira `null` e fica registrado em
   * `valorEstimadoBruto` o que veio, para nada se perder.
   */
  valorEstimado: number | null;
  valorEstimadoBruto: number | null;
  /**
   * `true` quando o valor é implausível a ponto de contaminar qualquer soma.
   *
   * A fonte tem erro de digitação. No piloto de 2026-08-12 havia um pregão de
   * mobiliário declarado a R$ 77,84 bilhões — sozinho, 88% do total de seis
   * estados. Uma página que anuncia "R$ 81 bi licitados em Fortaleza" perde a
   * credibilidade exatamente onde ela deveria ser provada.
   *
   * O edital continua na listagem, porque existe de verdade e alguém pode
   * querer disputá-lo. O que ele não faz é entrar em agregado.
   *
   * É decidido EM LOTE (`marcarValoresSuspeitos`) e por isso NÃO entra no hash
   * de conteúdo: o mesmo edital mudaria de hash só porque o lote do dia mudou.
   */
  valorSuspeito: boolean;
  /** ISO 8601 com offset de Brasília, convertido de propósito. */
  aberturaProposta: string | null;
  encerramentoProposta: string | null;
  publicadoEm: string | null;
  situacao: string | null;
  /** Página pública do edital na fonte. Padrão verificado, não deduzido. */
  link: string;
  coletadoEm: string;
};

/** O que se pede a uma fonte. Nem toda fonte honra tudo — ver `FonteDeEditais`. */
export type ParametrosDeColeta = {
  /** Sigla da UF. Sem ela, a fonte devolve o que tiver de abrangência nacional. */
  uf?: string;
  /**
   * Limite superior da data de encerramento das propostas, `yyyyMMdd`.
   * Só é respeitado por fonte com `filtraPorData`.
   */
  dataFinal?: string;
  /** Teto de páginas. Existe para o modo de teste não varrer tudo. */
  maxPaginas?: number;
  /** Progresso, para o CLI mostrar o que está acontecendo. */
  aoProgredir?: (info: { pagina: number; totalPaginas: number; acumulado: number }) => void;
  /** Avisa que entrou em espera por limite ou erro, para o CLI não parecer travado. */
  aoEsperar?: (motivo: string, ms: number) => void;
};

/**
 * O contrato de uma fonte de editais.
 *
 * `coletar` devolve `AsyncIterable` e não array por dois motivos que já doeram:
 * uma UF grande passa de dez mil registros (a memória não pode crescer com o
 * tamanho da UF), e o consumidor precisa poder PARAR no meio — quebrar o
 * `for await` encerra o gerador, e é assim que o orçamento de tempo por UF
 * funciona sem a fonte saber que ele existe.
 */
export type FonteDeEditais = {
  /** Nome curto e estável. Vai para `Edital.fonte` e para a chave de dedup. */
  nome: string;
  /** Como a fonte se chama para um leitor humano. Vai para o relatório. */
  rotulo: string;
  /** `"todas"` quando é nacional; lista de siglas quando é regional. */
  ufsCobertas: "todas" | string[];
  /** `true` se `dataFinal` é honrado. Quando `false`, o filtro é nosso, depois. */
  filtraPorData: boolean;
  /**
   * Desempate na deduplicação entre fontes: o maior vence.
   *
   * O PNCP é o registro nacional obrigatório (Lei 14.133/2021, art. 174), então
   * ele é a versão preferida quando o mesmo certame aparece em dois portais.
   */
  precedencia: number;
  /** Se vale a pena pedir esta UF a esta fonte. Evita requisição inútil. */
  cobre(uf: string): boolean;
  coletar(parametros: ParametrosDeColeta): AsyncIterable<Edital>;
};
