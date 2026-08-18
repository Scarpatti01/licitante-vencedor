import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PerfilDaEmpresa, SituacaoDaOportunidade, TipoDeDocumento } from "../dominio/tipos";
import type { Avaliacao } from "../dominio/recomendacao";
import { diasAteEncerrar } from "../pncp/normaliza";
import { explicarDecisao, type MotivoDeDescarte } from "../pipeline/triagem";
import { avaliacaoDaLinha, type LinhaDeOportunidade } from "../triagem/mapeamento";
import { editalDaLinha, type LinhaDoEdital } from "../triagem/repositorio";
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
 * ## Painel e oportunidades, desde 18/08, também de verdade
 *
 * A triagem por perfil (`scripts/triar-editais.ts`, `src/lib/triagem/`) grava
 * `oportunidades` e `decisoes_de_triagem` no Postgres; os cinco métodos abaixo
 * — que até então delegavam inteiro para a demonstração — passam a ler de lá
 * para qualquer empresa que não seja a de demonstração. `oportunidadesSimuladas`
 * virou método por empresa exatamente por causa disto: o visitante sem conta
 * continua vendo editais `EXEMPLO-`, o cliente com CNPJ real vê o que a
 * triagem de fato produziu para ele — inclusive quando é uma lista vazia,
 * porque a triagem não achou nada (o caso real de hoje: a única empresa
 * cadastrada atende só o RJ, e a coleta ainda não chega lá).
 *
 * `avaliacaoDaLinha` (`../triagem/mapeamento.ts`) e `editalDaLinha`
 * (`../triagem/repositorio.ts`) fazem o trabalho de reconstrução — são os
 * mesmos usados pelo script de triagem e pelos testes de ida e volta que
 * provam que a leitura não inventa nem perde campo.
 *
 * ## O que ainda não está aqui
 *
 * `painelDoDia.coletaCompleta` é sempre `true`: não existe hoje, em Postgres,
 * o equivalente ao `classificacao.json` que `scripts/ingerir-pncp.ts` grava no
 * repositório (completa/parcial/degradada). É uma simplificação sabida, não
 * uma checagem que roda e sempre dá certo — ver o comentário no método.
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

/** Formato da linha de `oportunidades` juntando o que `avaliacaoDaLinha` lê com o que a lista/painel também precisam. */
type LinhaDaOportunidade = LinhaDeOportunidade & {
  situacao: SituacaoDaOportunidade;
  editais: LinhaDoEdital;
};

const SELECAO_DA_OPORTUNIDADE =
  "score, faixa, cobertura, criterios, checklist, recomendacao, justificativa, " +
  "proxima_acao, situacao, encerra_em, editais!inner(*)";

/** Mesmo teto de página de `triagem/repositorio.ts`, pelo mesmo motivo: o PostgREST corta em 1000 sem avisar. */
const POR_PAGINA = 1000;

function resumoDaLinha(linha: LinhaDaOportunidade, agora: Date): ResumoDaOportunidade {
  const edital = editalDaLinha(linha.editais);
  return {
    id: edital.id,
    edital,
    avaliacao: avaliacaoDaLinha(linha, agora),
    situacao: linha.situacao,
    // Nunca preenchido — nem aqui, nem na demonstração. Rastrear "visto em"
    // exigiria uma escrita a cada leitura da lista, e nada no produto lê este
    // campo ainda.
    vistaEm: null,
  };
}

export class RepositorioSupabase implements RepositorioDoProduto {
  /** Sintéticas só para a empresa de demonstração. Ver o cabeçalho. */
  oportunidadesSimuladas(empresaId: string): boolean {
    return ehEmpresaDeDemonstracao(empresaId);
  }

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

  // ---- Painel e oportunidades, lidos do que a triagem gravou ---------------
  //
  // A empresa de demonstração continua desviada para `this.demonstracao` em
  // todo método, pela mesma razão de `perfil`/`identidade`: `EXEMPLO-EMPRESA-1`
  // não é um uuid, e consultar o Postgres por ele devolveria vazio — apagando o
  // produto para quem ainda está decidindo se cria conta.

  /**
   * Todas as oportunidades da empresa, já viradas `ResumoDaOportunidade`.
   *
   * Compartilhado por `painelDoDia` e `listarOportunidades`: os dois precisam
   * da lista inteira reconstruída para contar e para filtrar por `urgente`, que
   * não é coluna (ver `avaliacaoDaLinha`) — filtrar isso em SQL exigiria
   * recalcular a mesma fórmula em dois lugares, e um dos dois acabaria
   * divergindo do domínio.
   */
  private async oportunidadesDaEmpresa(
    empresaId: string,
    agora: Date,
    situacoes?: SituacaoDaOportunidade[],
  ): Promise<ResumoDaOportunidade[]> {
    const linhas: LinhaDaOportunidade[] = [];

    for (let inicio = 0; ; inicio += POR_PAGINA) {
      let consulta = this.supabase
        .from("oportunidades")
        .select(SELECAO_DA_OPORTUNIDADE)
        .eq("empresa_id", empresaId)
        .range(inicio, inicio + POR_PAGINA - 1);

      // Vazio devolve tudo que não foi descartado — mesma regra de
      // `FiltroDeOportunidades.situacoes`, documentada em `porta.ts`.
      consulta = situacoes?.length ? consulta.in("situacao", situacoes) : consulta.neq("situacao", "descartada");

      const { data, error } = await consulta;
      if (error) throw new Error(`oportunidades: supabase respondeu com erro — ${error.message}`);

      const pagina = (data as unknown as LinhaDaOportunidade[] | null) ?? [];
      linhas.push(...pagina);
      if (pagina.length < POR_PAGINA) break;
    }

    return linhas.map((linha) => resumoDaLinha(linha, agora));
  }

  async painelDoDia(empresaId: string, agora: Date = new Date()): Promise<PainelDoDia> {
    if (ehEmpresaDeDemonstracao(empresaId)) return this.demonstracao.painelDoDia(empresaId, agora);

    const oportunidades = await this.oportunidadesDaEmpresa(empresaId, agora);
    const recomendadas = oportunidades.filter(
      (o) =>
        o.avaliacao.recomendacao.nivel === "recomendada" ||
        o.avaliacao.recomendacao.nivel === "recomendada_forte",
    );

    const { data: ultimaColeta } = await this.supabase
      .from("editais")
      .select("coletado_em")
      .order("coletado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      novas: oportunidades.filter((o) => o.situacao === "nova").length,
      recomendadas: recomendadas.length,
      excelentes: oportunidades.filter((o) => o.avaliacao.score.faixa === "excelente").length,
      urgentes: oportunidades.filter((o) => o.avaliacao.recomendacao.urgente).length,
      documentosPendentes: recomendadas.reduce(
        (soma, o) => soma + o.avaliacao.checklist.totais.ausentes + o.avaliacao.checklist.totais.verificar,
        0,
      ),
      coletadoEm: (ultimaColeta as { coletado_em: string } | null)?.coletado_em ?? null,
      /*
       * Sempre `true`. `scripts/ingerir-pncp.ts` classifica cada coleta como
       * completa, parcial ou degradada e grava o veredito em
       * `dados/parciais/classificacao.json` — um arquivo no repositório, não
       * uma linha no banco. Esta implementação não tem, hoje, como perguntar ao
       * Postgres "a última coleta veio inteira?". Afirmar sempre `true` é uma
       * simplificação sabida e documentada, não uma checagem que roda e
       * silenciosamente acerta: o dia em que isso importar de verdade (cliente
       * vendo "17 oportunidades hoje" com metade dos estados fora), o sinal
       * precisa ser persistido em algum lugar que esta consulta alcance.
       */
      coletaCompleta: true,
    };
  }

  async listarOportunidades(
    empresaId: string,
    filtro: FiltroDeOportunidades = {},
  ): Promise<ResumoDaOportunidade[]> {
    if (ehEmpresaDeDemonstracao(empresaId)) return this.demonstracao.listarOportunidades(empresaId, filtro);

    const agora = new Date();
    let lista = await this.oportunidadesDaEmpresa(empresaId, agora, filtro.situacoes);

    if (filtro.apenasUrgentes) lista = lista.filter((o) => o.avaliacao.recomendacao.urgente);

    if (filtro.encerrandoEmDias !== undefined) {
      lista = lista.filter((o) => {
        const dias = diasAteEncerrar(o.edital, agora);
        return dias !== null && dias >= 0 && dias <= filtro.encerrandoEmDias!;
      });
    }

    if (filtro.scoreMinimo !== undefined) {
      // Oportunidade sem score não entra em filtro por score — não é "abaixo
      // do mínimo", é "sem base para comparar".
      lista = lista.filter(
        (o) => o.avaliacao.score.valor !== null && o.avaliacao.score.valor >= filtro.scoreMinimo!,
      );
    }

    lista.sort((a, b) => {
      if (a.avaliacao.recomendacao.urgente !== b.avaliacao.recomendacao.urgente) {
        return a.avaliacao.recomendacao.urgente ? -1 : 1;
      }
      return (b.avaliacao.score.valor ?? -1) - (a.avaliacao.score.valor ?? -1);
    });

    return filtro.limite ? lista.slice(0, filtro.limite) : lista;
  }

  async oportunidade(empresaId: string, id: string): Promise<ResumoDaOportunidade | null> {
    if (ehEmpresaDeDemonstracao(empresaId)) return this.demonstracao.oportunidade(empresaId, id);

    /*
     * `id`, aqui e em toda a porta, é o id canônico do edital (o que vai para a
     * URL — ver o comentário de `[id]/page.tsx`), não o uuid interno de
     * `oportunidades`. O filtro precisa do `!inner` em `SELECAO_DA_OPORTUNIDADE`
     * para o `.eq` na tabela embutida virar de fato uma condição de busca, e
     * não só uma seleção de colunas.
     */
    const { data, error } = await this.supabase
      .from("oportunidades")
      .select(SELECAO_DA_OPORTUNIDADE)
      .eq("empresa_id", empresaId)
      .eq("editais.id_canonico", id)
      .maybeSingle();

    if (error || !data) return null;

    return resumoDaLinha(data as unknown as LinhaDaOportunidade, new Date());
  }

  async registrarAcao(
    empresaId: string,
    oportunidadeId: string,
    situacao: SituacaoDaOportunidade,
  ): Promise<void> {
    if (ehEmpresaDeDemonstracao(empresaId)) {
      return this.demonstracao.registrarAcao(empresaId, oportunidadeId, situacao);
    }

    // Resolve o id canônico do edital para o uuid interno de `oportunidades`:
    // `acoes_na_oportunidade` referencia a chave composta `(id, empresa_id)`
    // dessa tabela, e não conhece a chave da fonte.
    const { data: oportunidade, error: erroDaBusca } = await this.supabase
      .from("oportunidades")
      .select("id, editais!inner(id_canonico)")
      .eq("empresa_id", empresaId)
      .eq("editais.id_canonico", oportunidadeId)
      .maybeSingle();

    if (erroDaBusca || !oportunidade) {
      throw new Error(`oportunidade não encontrada para registrar a ação: ${oportunidadeId}`);
    }

    // `feita_por` fica em branco quando não há sessão (não deveria acontecer
    // nesta rota, mas a policy aceita `null` de propósito — ver a migração) em
    // vez de travar o registro da ação por não saber quem clicou.
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    const { error } = await this.supabase.from("acoes_na_oportunidade").insert({
      oportunidade_id: (oportunidade as { id: string }).id,
      empresa_id: empresaId,
      situacao,
      feita_por: user?.id ?? null,
    });

    if (error) {
      throw new Error(`falha ao registrar a ação na oportunidade: ${error.message}`);
    }
  }

  async explicarTriagem(
    empresaId: string,
    editalId: string,
  ): Promise<{ encontrado: boolean; explicacao: string; avaliacao: Avaliacao | null }> {
    if (ehEmpresaDeDemonstracao(empresaId)) return this.demonstracao.explicarTriagem(empresaId, editalId);

    const agora = new Date();

    // As duas tabelas respondem perguntas diferentes (ver o header de
    // `mapeamento.ts`): `oportunidades` tem a avaliação inteira, mas só existe
    // para quem foi entregue; `decisoes_de_triagem` tem o motivo do descarte,
    // e existe para todo mundo. Buscar as duas em paralelo é mais barato do que
    // decidir qual pedir primeiro.
    const [{ data: linhaDaOportunidade }, { data: linhaDaDecisao }] = await Promise.all([
      this.supabase
        .from("oportunidades")
        .select(SELECAO_DA_OPORTUNIDADE)
        .eq("empresa_id", empresaId)
        .eq("editais.id_canonico", editalId)
        .maybeSingle(),
      this.supabase
        .from("decisoes_de_triagem")
        .select("recomendado, motivo, regra_de_exclusao, avaliado_em, editais!inner(id_canonico)")
        .eq("empresa_id", empresaId)
        .eq("editais.id_canonico", editalId)
        .order("avaliado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const avaliacao = linhaDaOportunidade
      ? avaliacaoDaLinha(linhaDaOportunidade as unknown as LinhaDaOportunidade, agora)
      : null;

    const decisao = linhaDaDecisao
      ? (() => {
          const d = linhaDaDecisao as unknown as {
            recomendado: boolean;
            motivo: string | null;
            regra_de_exclusao: string | null;
            avaliado_em: string;
          };
          return {
            entregue: d.recomendado,
            decididoEm: d.avaliado_em,
            explicacao: d.motivo ?? "",
            motivoDoDescarte: d.regra_de_exclusao as MotivoDeDescarte | null,
          };
        })()
      : // Sem linha em `decisoes_de_triagem` mas com `oportunidades`: as duas
        // deveriam nascer juntas (ver `scripts/triar-editais.ts`) — isto só
        // acontece se uma gravação anterior ficou pela metade. A oportunidade
        // continua respondendo pela avaliação; a frase de "entregue" é montada
        // a partir dela em vez de a pergunta virar "não há registro" para um
        // edital que claramente está na lista do cliente.
        avaliacao
          ? {
              entregue: true,
              decididoEm: agora.toISOString(),
              explicacao: avaliacao.recomendacao.resumo,
              motivoDoDescarte: null,
            }
          : null;

    if (!decisao) {
      return {
        encontrado: false,
        explicacao:
          "Este edital não está entre os coletados para a sua empresa, ou ainda não passou pela triagem. Verifique se o estado dele está na cobertura da coleta.",
        avaliacao: null,
      };
    }

    return { encontrado: true, explicacao: explicarDecisao(decisao, editalId), avaliacao };
  }
}
