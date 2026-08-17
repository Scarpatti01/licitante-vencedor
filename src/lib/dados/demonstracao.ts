import { EDITAIS_DE_EXEMPLO, PERFIL_COMPLETO, PERFIL_DOCUMENTACAO_RUIM, PERFIL_INCOMPLETO } from "../dominio/exemplos";
import { analiseNaoRealizada, avaliarOportunidade } from "../dominio/recomendacao";
import type { PerfilDaEmpresa, SituacaoDaOportunidade } from "../dominio/tipos";
import type {
  FiltroDeOportunidades,
  IdentidadeDaEmpresa,
  PainelDoDia,
  RepositorioDoProduto,
  ResumoDaOportunidade,
} from "./porta";
import { diasAteEncerrar } from "../pncp/normaliza";

/**
 * Implementação de demonstração da porta de dados.
 *
 * Serve a dois propósitos legítimos e a nenhum ilegítimo: permite construir e
 * revisar as telas antes de existir banco, e dá um ambiente estável para teste
 * de interface. O que ela NÃO é: um modo de produção disfarçado. Toda
 * oportunidade daqui carrega `id` começando em `EXEMPLO-`, e a tela é obrigada
 * a exibir o aviso de dados de demonstração quando o repositório em uso for
 * este — ver `ehDemonstracao`.
 *
 * As três empresas cobrem os perfis que o produto precisa atender desde o
 * primeiro dia: quem já opera com tudo em ordem, quem acabou de entrar e não
 * preencheu nada, e quem tem documentação vencida.
 */

const PERFIS: Record<string, PerfilDaEmpresa> = {
  [PERFIL_COMPLETO.empresaId]: PERFIL_COMPLETO,
  [PERFIL_INCOMPLETO.empresaId]: PERFIL_INCOMPLETO,
  [PERFIL_DOCUMENTACAO_RUIM.empresaId]: PERFIL_DOCUMENTACAO_RUIM,
};

export const EMPRESA_DE_DEMONSTRACAO = PERFIL_COMPLETO.empresaId;

/**
 * Este id é de empresa sintética?
 *
 * O prefixo `EXEMPLO-` é a marca que este arquivo declara acima e que a faixa
 * de aviso mostra ao usuário. A implementação sobre Postgres precisa dela para
 * desviar o visitante sem conta: `EXEMPLO-EMPRESA-1` não é um uuid, e consultar
 * o banco por ele devolveria nada — apagando o produto justamente para quem
 * ainda está decidindo se cria conta.
 */
export function ehEmpresaDeDemonstracao(empresaId: string): boolean {
  return empresaId.startsWith("EXEMPLO-");
}

/**
 * A tela precisa avisar que os editais não são reais?
 *
 * Pergunta à implementação em vez de testar a classe. `RepositorioSupabase`
 * grava o perfil de verdade e ainda serve oportunidades de exemplo; um
 * `instanceof` responderia "não é demonstração" e apagaria a faixa enquanto
 * editais `EXEMPLO-` continuassem na tela.
 */
export function ehDemonstracao(repositorio: RepositorioDoProduto): boolean {
  return repositorio.oportunidadesSimuladas;
}

export class RepositorioDeDemonstracao implements RepositorioDoProduto {
  readonly oportunidadesSimuladas = true;

  /** Nunca. O `Map` abaixo morre com a instância, e a instância com a requisição. */
  cadastroPersiste(): boolean {
    return false;
  }

  private situacoes = new Map<string, SituacaoDaOportunidade>();
  private perfis = new Map(Object.entries(PERFIS));

  async identidade(empresaId: string): Promise<IdentidadeDaEmpresa | null> {
    const perfil = this.perfis.get(empresaId);
    if (!perfil) return null;
    return {
      cnpj: perfil.cnpj,
      razaoSocial: perfil.razaoSocial,
      nomeFantasia: perfil.nomeFantasia,
    };
  }

  async perfil(empresaId: string): Promise<PerfilDaEmpresa | null> {
    return this.perfis.get(empresaId) ?? null;
  }

  async salvarPerfil(perfil: PerfilDaEmpresa): Promise<void> {
    this.perfis.set(perfil.empresaId, perfil);
  }

  private avaliarTodas(empresaId: string, agora: Date): ResumoDaOportunidade[] {
    const perfil = this.perfis.get(empresaId);
    if (!perfil) return [];

    return EDITAIS_DE_EXEMPLO.map((edital) => {
      const analise = analiseNaoRealizada(
        edital.id,
        "Nesta demonstração o documento do edital não é baixado nem lido.",
      );
      return {
        id: edital.id,
        edital,
        avaliacao: avaliarOportunidade(edital, analise, perfil, agora),
        situacao: this.situacoes.get(`${empresaId}:${edital.id}`) ?? "nova",
        vistaEm: null,
      };
    });
  }

  async painelDoDia(empresaId: string, agora: Date = new Date()): Promise<PainelDoDia> {
    const todas = this.avaliarTodas(empresaId, agora).filter((o) => o.situacao !== "descartada");
    const recomendadas = todas.filter(
      (o) =>
        o.avaliacao.recomendacao.nivel === "recomendada" ||
        o.avaliacao.recomendacao.nivel === "recomendada_forte",
    );

    return {
      novas: todas.filter((o) => o.situacao === "nova").length,
      recomendadas: recomendadas.length,
      excelentes: todas.filter((o) => o.avaliacao.score.faixa === "excelente").length,
      urgentes: todas.filter((o) => o.avaliacao.recomendacao.urgente).length,
      documentosPendentes: recomendadas.reduce(
        (soma, o) => soma + o.avaliacao.checklist.totais.ausentes + o.avaliacao.checklist.totais.verificar,
        0,
      ),
      coletadoEm: EDITAIS_DE_EXEMPLO[0]?.coletadoEm ?? null,
      coletaCompleta: true,
    };
  }

  async listarOportunidades(
    empresaId: string,
    filtro: FiltroDeOportunidades = {},
  ): Promise<ResumoDaOportunidade[]> {
    const agora = new Date();
    let lista = this.avaliarTodas(empresaId, agora);

    lista = filtro.situacoes?.length
      ? lista.filter((o) => filtro.situacoes!.includes(o.situacao))
      : lista.filter((o) => o.situacao !== "descartada");

    if (filtro.apenasUrgentes) lista = lista.filter((o) => o.avaliacao.recomendacao.urgente);

    if (filtro.encerrandoEmDias !== undefined) {
      lista = lista.filter((o) => {
        const dias = diasAteEncerrar(o.edital, agora);
        return dias !== null && dias >= 0 && dias <= filtro.encerrandoEmDias!;
      });
    }

    if (filtro.scoreMinimo !== undefined) {
      // Oportunidade sem score não entra em filtro por score — não é "abaixo do
      // mínimo", é "sem base para comparar". Tratar as duas como a mesma coisa
      // esconderia justamente o que precisa de atenção humana.
      lista = lista.filter((o) => o.avaliacao.score.valor !== null && o.avaliacao.score.valor >= filtro.scoreMinimo!);
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
    return this.avaliarTodas(empresaId, new Date()).find((o) => o.id === id) ?? null;
  }

  async registrarAcao(
    empresaId: string,
    oportunidadeId: string,
    situacao: SituacaoDaOportunidade,
  ): Promise<void> {
    this.situacoes.set(`${empresaId}:${oportunidadeId}`, situacao);
  }

  async explicarTriagem(empresaId: string, editalId: string) {
    const oportunidade = await this.oportunidade(empresaId, editalId);
    if (!oportunidade) {
      return {
        encontrado: false,
        explicacao:
          "Este edital não está entre os coletados para a sua empresa. Verifique se o estado dele está na cobertura da coleta.",
        avaliacao: null,
      };
    }

    const { recomendacao, score } = oportunidade.avaliacao;
    const partes = [
      score.valor === null
        ? `Sem score: ${score.motivo}`
        : `Score ${score.valor}/100 (${score.faixa}).`,
      `Recomendação: ${recomendacao.resumo}`,
    ];
    if (recomendacao.justificativa.impedimentos.length) {
      partes.push(`Impedimentos: ${recomendacao.justificativa.impedimentos.join(" ")}`);
    }
    if (recomendacao.justificativa.naoDeterminados.length) {
      partes.push(`Sem base para avaliar: ${recomendacao.justificativa.naoDeterminados.join(" ")}`);
    }

    return { encontrado: true, explicacao: partes.join(" "), avaliacao: oportunidade.avaliacao };
  }
}
