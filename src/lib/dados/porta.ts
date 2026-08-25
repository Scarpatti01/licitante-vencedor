import type { Edital } from "../pncp/tipos";
import type { Avaliacao } from "../dominio/recomendacao";
import type { PerfilDaEmpresa, SituacaoDaOportunidade } from "../dominio/tipos";
import type { Recorte } from "../dominio/recorte";

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
   * As oportunidades DESTA empresa são sintéticas?
   *
   * Por empresa, e não uma `readonly` da implementação inteira — desde que a
   * triagem por perfil existe (18/08), `RepositorioSupabase` serve as duas
   * coisas ao mesmo tempo, pela mesma razão de `cadastroPersiste`: o visitante
   * sem conta cai na empresa de demonstração e continua vendo editais
   * `EXEMPLO-`; o cliente com CNPJ real vê `oportunidades` de verdade — vazias
   * quando a triagem não encontrou nada para ele, mas reais. Uma resposta única
   * para a implementação inteira diria a coisa errada para um dos dois.
   *
   * Método e não `instanceof`, pela razão de sempre: checar a classe
   * responderia igual para os dois casos que esta função existe para separar.
   */
  oportunidadesSimuladas(empresaId: string): boolean;

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

  /** Os recortes desta empresa, na ordem em que ela os criou. */
  recortes(empresaId: string): Promise<Recorte[]>;
  /**
   * Grava a lista INTEIRA de recortes da empresa, substituindo a anterior.
   *
   * Substituir em vez de criar/editar/apagar um por um é o que permite a trava
   * do limite de três valer sobre o resultado final. Salvar um a um deixaria a
   * empresa passar de três se duas abas do navegador salvassem ao mesmo tempo,
   * e cada chamada estaria certa isoladamente.
   */
  salvarRecortes(empresaId: string, recortes: Recorte[]): Promise<void>;

  painelDoDia(empresaId: string, agora?: Date): Promise<PainelDoDia>;

  listarOportunidades(
    empresaId: string,
    filtro?: FiltroDeOportunidades,
    agora?: Date,
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
