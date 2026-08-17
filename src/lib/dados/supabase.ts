import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PerfilDaEmpresa, SituacaoDaOportunidade, TipoDeDocumento } from "../dominio/tipos";
import type { Avaliacao } from "../dominio/recomendacao";
import type {
  FiltroDeOportunidades,
  IdentidadeDaEmpresa,
  PainelDoDia,
  RepositorioDoProduto,
  ResumoDaOportunidade,
} from "./porta";
import { RepositorioDeDemonstracao, ehEmpresaDeDemonstracao } from "./demonstracao";

/**
 * A porta de dados sobre Postgres.
 *
 * ## O defeito que ela existe para consertar
 *
 * Até 17/08 `repositorio()` devolvia SEMPRE o repositório de demonstração — um
 * `Map` dentro de uma instância criada por `cache()` do React, que nasce e morre
 * dentro de uma requisição. O onboarding gravava ali, respondia "Cadastro
 * salvo", e a próxima requisição relia `null`. O sintoma que chegou não foi
 * "não salvou": foi **"preencho, avanço, e a tela seguinte diz que não
 * preenchi"** — porque o React 19 reseta o formulário depois de toda ação
 * (`requestFormReset` é agendado antes mesmo de a ação rodar, em
 * `startHostTransition`), e o reset devolve cada campo ao `defaultValue`
 * daquele instante, que vinha de um perfil eternamente nulo. O segundo envio
 * saía com CNPJ, razão social e porte vazios, e a validação — corretamente —
 * reclamava.
 *
 * Nada disso aparecia em teste, tipo ou build: as três camadas estavam certas.
 * O que faltava era a implementação da porta.
 *
 * ## Metade real, metade ainda sintética — e a tela precisa dizer qual
 *
 * Perfil, identidade e listas são gravados de verdade aqui. Painel e
 * oportunidades continuam vindo da demonstração, porque a triagem que cruza os
 * 3.483 editais coletados com o perfil ainda não existe. Por isso
 * `oportunidadesSimuladas` continua `true`: enquanto um edital `EXEMPLO-`
 * aparecer na tela, a faixa de aviso tem de continuar aparecendo junto. Trocar
 * a metade que persiste NÃO autoriza esconder a metade que não é real.
 *
 * ## Empresa de demonstração continua na demonstração
 *
 * O visitante sem conta cai em `EMPRESA_DE_DEMONSTRACAO`, cujo id (`EXEMPLO-…`)
 * não é sequer um uuid válido. Consultar Postgres por ele devolveria nada e
 * apagaria o produto para quem ainda não criou conta — que é justamente quem
 * está avaliando se cria. Esses ids são desviados para a demonstração inteira.
 */

/** O formato em que o Postgres devolve as linhas que compõem um perfil. */
type LinhaDoPerfil = {
  porte: string;
  faturamento_anual: string | number | null;
  cnaes: string[] | null;
  palavras_chave: string[] | null;
  palavras_excluidas: string[] | null;
  ufs_atendidas: string[] | null;
  municipios_prioritarios: string[] | null;
  ticket_minimo: string | number | null;
  ticket_maximo: string | number | null;
  modalidades_aceitas: string[] | null;
  atualizado_em: string;
};

type LinhaDoDocumento = {
  tipo: string;
  descricao: string | null;
  valido_ate: string | null;
  sem_validade: boolean;
  arquivo_anexado: boolean;
};

type LinhaDoAtestado = {
  objeto: string;
  valor: string | number | null;
  orgao: string | null;
  ano: number | null;
};

type LinhaDaEmpresa = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  perfis_da_empresa: LinhaDoPerfil | LinhaDoPerfil[] | null;
  documentos_da_empresa: LinhaDoDocumento[] | null;
  atestados: LinhaDoAtestado[] | null;
};

/**
 * `numeric` do Postgres chega como STRING no PostgREST, e de propósito: `numeric`
 * guarda mais precisão do que um `double` de JavaScript consegue representar, e
 * a biblioteca prefere entregar o texto exato a entregar um número arredondado
 * em silêncio. Converter é trabalho de quem lê.
 *
 * `null` continua `null`. A regra 2 de `leitura.ts` vale nos dois sentidos: um
 * faturamento não informado não pode virar zero na volta, ou o motor de score
 * passaria a tratar "não quis dizer" como "não fatura".
 */
function numero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** PostgREST devolve objeto para 1:1 e array para 1:N; aceita os dois. */
function primeira<T>(valor: T | T[] | null | undefined): T | null {
  if (valor === null || valor === undefined) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function montarPerfil(empresaId: string, linha: LinhaDaEmpresa): PerfilDaEmpresa | null {
  const p = primeira(linha.perfis_da_empresa);

  // Sem linha em `perfis_da_empresa` não existe perfil, e `null` é a resposta
  // certa: a empresa foi criada (identidade em `empresas`) e o onboarding ainda
  // não foi feito. É o estado que o layout mostra como "Cadastro não iniciado".
  if (!p) return null;

  return {
    empresaId,
    cnpj: linha.cnpj,
    razaoSocial: linha.razao_social,
    nomeFantasia: linha.nome_fantasia,
    porte: p.porte as PerfilDaEmpresa["porte"],
    faturamentoAnual: numero(p.faturamento_anual),
    cnaes: p.cnaes ?? [],
    palavrasChave: p.palavras_chave ?? [],
    palavrasExcluidas: p.palavras_excluidas ?? [],
    ufsAtendidas: p.ufs_atendidas ?? [],
    municipiosPrioritarios: p.municipios_prioritarios ?? [],
    ticketMinimo: numero(p.ticket_minimo),
    ticketMaximo: numero(p.ticket_maximo),
    documentos: (linha.documentos_da_empresa ?? []).map((d) => ({
      tipo: d.tipo as TipoDeDocumento,
      descricao: d.descricao,
      validoAte: d.valido_ate,
      semValidade: d.sem_validade,
      // Coluna GERADA a partir de `caminho_no_storage`. É a garantia de que
      // "declaração não é anexo" não depende de nenhum caminho de código
      // lembrar de manter um booleano coerente.
      arquivoAnexado: d.arquivo_anexado,
    })),
    atestados: (linha.atestados ?? []).map((a) => ({
      objeto: a.objeto,
      valor: numero(a.valor),
      orgao: a.orgao,
      ano: a.ano,
    })),
    modalidadesAceitas: p.modalidades_aceitas ?? [],
    atualizadoEm: p.atualizado_em,
  };
}

const SELECAO_DO_PERFIL =
  "cnpj, razao_social, nome_fantasia, " +
  "perfis_da_empresa(porte, faturamento_anual, cnaes, palavras_chave, palavras_excluidas, " +
  "ufs_atendidas, municipios_prioritarios, ticket_minimo, ticket_maximo, modalidades_aceitas, atualizado_em), " +
  "documentos_da_empresa(tipo, descricao, valido_ate, sem_validade, arquivo_anexado), " +
  "atestados(objeto, valor, orgao, ano)";

export class RepositorioSupabase implements RepositorioDoProduto {
  /**
   * Ainda `true`. Ver o cabeçalho: painel e oportunidades continuam sintéticos,
   * e o aviso na tela precisa continuar de pé enquanto isso for verdade.
   */
  readonly oportunidadesSimuladas = true;

  constructor(
    private readonly supabase: SupabaseClient,
    /** Serve a metade que ainda não tem fonte real, e as empresas `EXEMPLO-`. */
    private readonly demonstracao: RepositorioDoProduto = new RepositorioDeDemonstracao(),
  ) {}

  /** Para o tenant real, sim. Para a empresa `EXEMPLO-`, continua não. */
  cadastroPersiste(empresaId: string): boolean {
    return !ehEmpresaDeDemonstracao(empresaId);
  }

  async identidade(empresaId: string): Promise<IdentidadeDaEmpresa | null> {
    if (ehEmpresaDeDemonstracao(empresaId)) return this.demonstracao.identidade(empresaId);

    const { data, error } = await this.supabase
      .from("empresas")
      .select("cnpj, razao_social, nome_fantasia")
      .eq("id", empresaId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      cnpj: data.cnpj as string,
      razaoSocial: data.razao_social as string,
      nomeFantasia: (data.nome_fantasia as string | null) ?? null,
    };
  }

  async perfil(empresaId: string): Promise<PerfilDaEmpresa | null> {
    if (ehEmpresaDeDemonstracao(empresaId)) return this.demonstracao.perfil(empresaId);

    const { data, error } = await this.supabase
      .from("empresas")
      .select(SELECAO_DO_PERFIL)
      .eq("id", empresaId)
      .maybeSingle();

    /*
     * Erro de leitura devolve `null`, e isso é uma decisão, não descuido: para
     * a tela, "não consegui ler" e "ainda não existe" levam ao mesmo lugar
     * seguro — o cadastro aparece como não iniciado e nada é afirmado sobre a
     * empresa. Lançar aqui derrubaria o layout do produto inteiro, que lê o
     * perfil em toda página.
     *
     * A ESCRITA faz o oposto: lá, engolir a falha faria alguém sair achando que
     * o cadastro está gravado. Ver `salvarPerfil`.
     */
    if (error || !data) return null;

    return montarPerfil(empresaId, data as unknown as LinhaDaEmpresa);
  }

  async salvarPerfil(perfil: PerfilDaEmpresa): Promise<void> {
    if (ehEmpresaDeDemonstracao(perfil.empresaId)) {
      return this.demonstracao.salvarPerfil(perfil);
    }

    /*
     * Uma chamada, uma transação. As quatro tabelas do perfil não podem gravar
     * pela metade — ver o cabeçalho de `salvar_perfil_da_empresa`.
     *
     * `empresa_id` vai como parâmetro e vem de `empresaAtual()`, nunca do
     * formulário; a função no banco roda como `security invoker`, então a RLS
     * confere de novo, do lado de lá.
     */
    const { error } = await this.supabase.rpc("salvar_perfil_da_empresa", {
      p_empresa_id: perfil.empresaId,
      p_perfil: {
        cnpj: perfil.cnpj,
        razaoSocial: perfil.razaoSocial,
        nomeFantasia: perfil.nomeFantasia,
        porte: perfil.porte,
        faturamentoAnual: perfil.faturamentoAnual,
        cnaes: perfil.cnaes,
        palavrasChave: perfil.palavrasChave,
        palavrasExcluidas: perfil.palavrasExcluidas,
        ufsAtendidas: perfil.ufsAtendidas,
        municipiosPrioritarios: perfil.municipiosPrioritarios,
        ticketMinimo: perfil.ticketMinimo,
        ticketMaximo: perfil.ticketMaximo,
        modalidadesAceitas: perfil.modalidadesAceitas,
        documentos: perfil.documentos.map((d) => ({
          tipo: d.tipo,
          descricao: d.descricao,
          validoAte: d.validoAte,
          semValidade: d.semValidade,
          // `arquivoAnexado` NÃO é enviado: é coluna gerada no banco. Mandá-lo
          // daqui seria oferecer ao cliente a chance de afirmar que anexou.
        })),
        atestados: perfil.atestados,
      },
    });

    // Lança de propósito. `acoes.ts` captura, registra e devolve "não
    // conseguimos gravar" para a tela — o único desfecho aceitável de uma
    // gravação que falhou é o usuário saber que ela falhou.
    if (error) {
      throw new Error(`falha ao gravar o perfil da empresa: ${error.message}`);
    }
  }

  // ---- A metade que ainda não tem fonte real -------------------------------
  //
  // Delegar é honesto e explícito: enquanto `oportunidadesSimuladas` for `true`,
  // a faixa de aviso está na tela dizendo que nenhum edital ali é real. O dia em
  // que a triagem existir, estes cinco métodos passam a consultar o Postgres e a
  // propriedade vira `false` — no mesmo commit, ou o aviso vira mentira nos dois
  // sentidos possíveis.

  painelDoDia(empresaId: string, agora?: Date): Promise<PainelDoDia> {
    return this.demonstracao.painelDoDia(empresaId, agora);
  }

  listarOportunidades(
    empresaId: string,
    filtro?: FiltroDeOportunidades,
  ): Promise<ResumoDaOportunidade[]> {
    return this.demonstracao.listarOportunidades(empresaId, filtro);
  }

  oportunidade(empresaId: string, id: string): Promise<ResumoDaOportunidade | null> {
    return this.demonstracao.oportunidade(empresaId, id);
  }

  registrarAcao(
    empresaId: string,
    oportunidadeId: string,
    situacao: SituacaoDaOportunidade,
  ): Promise<void> {
    return this.demonstracao.registrarAcao(empresaId, oportunidadeId, situacao);
  }

  explicarTriagem(
    empresaId: string,
    editalId: string,
  ): Promise<{ encontrado: boolean; explicacao: string; avaliacao: Avaliacao | null }> {
    return this.demonstracao.explicarTriagem(empresaId, editalId);
  }
}
