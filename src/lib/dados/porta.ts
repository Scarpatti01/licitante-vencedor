import type { Edital } from "../pncp/tipos";
import type { Avaliacao } from "../dominio/recomendacao";
import type { PerfilDaEmpresa, SituacaoDaOportunidade } from "../dominio/tipos";

/**
 * A porta de dados do produto.
 *
 * Tudo que as telas consomem passa por aqui, e por dois motivos.
 *
 * O primeiro é segurança: `empresaId` é parâmetro obrigatório em toda leitura.
 * Não existe função nesta porta capaz de devolver dado sem que o chamador diga
 * de quem é o dado — o isolamento entre clientes deixa de depender de alguém
 * lembrar de filtrar. A implementação sobre Postgres soma a isso a RLS do
 * banco, que é a rede embaixo da rede.
 *
 * O segundo é poder construir e demonstrar o produto antes de existir banco
 * provisionado. `demonstracao.ts` implementa esta mesma porta com dados
 * sintéticos; trocar por Supabase não muda uma linha de tela.
 */

export type FiltroDeOportunidades = {
  /** `nova`, `salva`, `descartada`… Vazio devolve tudo que não foi descartado. */
  situacoes?: SituacaoDaOportunidade[];
  /** Só o que encerra em até N dias. */
  encerrandoEmDias?: number;
  /** Score mínimo. Oportunidade sem score nunca entra num filtro por score. */
  scoreMinimo?: number;
  /** Só as marcadas como urgentes. */
  apenasUrgentes?: boolean;
  limite?: number;
};

/** O que a lista mostra. Deliberadamente menor que a página de detalhe. */
export type ResumoDaOportunidade = {
  id: string;
  edital: Edital;
  avaliacao: Avaliacao;
  situacao: SituacaoDaOportunidade;
  vistaEm: string | null;
};

export type PainelDoDia = {
  /** Coletadas desde a última visita do usuário. */
  novas: number;
  recomendadas: number;
  excelentes: number;
  urgentes: number;
  /** Documentos obrigatórios pendentes somados nas oportunidades recomendadas. */
  documentosPendentes: number;
  /** Instante da última coleta que alimentou este painel. */
  coletadoEm: string | null;
  /**
   * `false` quando a última coleta veio incompleta. A tela precisa disso para
   * não anunciar "17 oportunidades hoje" como se fosse o total do dia quando
   * metade dos estados falhou na origem.
   */
  coletaCompleta: boolean;
};

/**
 * Quem a empresa é, sem os critérios de busca.
 *
 * Existe separada de `PerfilDaEmpresa` porque os dois nascem em momentos
 * diferentes: a identidade é criada em `/cadastrar-empresa/`, o perfil só no
 * onboarding. Entre um e outro, `perfil()` devolve `null` com toda razão — e
 * sem esta função a tela de onboarding pediria de novo o CNPJ e a razão social
 * que a pessoa acabou de digitar, com os campos em branco.
 */
export type IdentidadeDaEmpresa = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
};

export interface RepositorioDoProduto {
  /**
   * As oportunidades desta implementação são sintéticas?
   *
   * Property e não `instanceof`: a implementação sobre Postgres persiste o
   * perfil de verdade e ainda serve oportunidades de exemplo, porque a triagem
   * não existe. Um `instanceof RepositorioDeDemonstracao` responderia `false`
   * para ela e apagaria a faixa de aviso enquanto editais `EXEMPLO-` continuam
   * na tela — trocar metade da fonte não autoriza esconder a outra metade.
   */
  readonly oportunidadesSimuladas: boolean;

  /**
   * O cadastro DESTA empresa é gravado de verdade?
   *
   * Por empresa, e não pela implementação inteira, porque as duas coisas
   * convivem na mesma instância: o visitante sem conta usa a empresa sintética
   * e o cadastro dele morre com a requisição; o cliente logado grava em
   * Postgres. A faixa de aviso precisa dizer qual dos dois é o caso, e uma
   * resposta única para a implementação diria a coisa errada para metade.
   */
  cadastroPersiste(empresaId: string): boolean;

  identidade(empresaId: string): Promise<IdentidadeDaEmpresa | null>;

  perfil(empresaId: string): Promise<PerfilDaEmpresa | null>;
  salvarPerfil(perfil: PerfilDaEmpresa): Promise<void>;

  painelDoDia(empresaId: string, agora?: Date): Promise<PainelDoDia>;

  listarOportunidades(
    empresaId: string,
    filtro?: FiltroDeOportunidades,
  ): Promise<ResumoDaOportunidade[]>;

  oportunidade(empresaId: string, id: string): Promise<ResumoDaOportunidade | null>;

  registrarAcao(
    empresaId: string,
    oportunidadeId: string,
    situacao: SituacaoDaOportunidade,
  ): Promise<void>;

  /**
   * Por que este edital não apareceu para esta empresa?
   *
   * A pergunta que todo cliente faz no primeiro mês e que quase nenhum produto
   * do gênero consegue responder. Ela está na porta desde o começo para que a
   * resposta seja obrigação de qualquer implementação, e não um relatório que
   * alguém promete construir depois.
   */
  explicarTriagem(
    empresaId: string,
    editalId: string,
  ): Promise<{ encontrado: boolean; explicacao: string; avaliacao: Avaliacao | null }>;
}
