import type { Avaliacao, NivelDaRecomendacao, ProximaAcao } from "../dominio/recomendacao.ts";
import { VERSAO_DO_SCORE, type CriterioAvaliado, type FaixaDoScore } from "../dominio/score.ts";
import type { Checklist } from "../dominio/checklist.ts";
import type { DecisaoDeTriagem } from "../pipeline/triagem.ts";
import type { Edital } from "../fontes/tipos.ts";

/**
 * A avaliação do domínio virando as duas linhas que ela produz no banco.
 *
 * São duas tabelas e não uma, e a diferença entre elas é a razão de existirem:
 *
 *   `oportunidades` é o que o cliente VÊ. Só nasce para o que passou na
 *   triagem, e é sobre ela que ele age — salva, descarta, marca que participou.
 *
 *   `decisoes_de_triagem` é o que responde "por que este edital NÃO apareceu
 *   para mim?". Nasce para todos, inclusive — principalmente — para os
 *   descartados. Sem ela, o suporte responde "não sei", e é aí que a triagem
 *   deixa de ser explicável e vira caixa-preta.
 *
 * Puro de propósito: nada aqui faz rede. É o que permite testar cada `check` de
 * coluna sem banco, e a lição de `editais/gravar.ts` vale igual — um mapeamento
 * que ignora uma restrição não falha no teste, falha no lote em produção.
 */

/**
 * Cobertura e prontidão são `numeric(4,3)`: no máximo três casas decimais.
 *
 * `0.8333333333333334`, que é o que uma divisão em ponto flutuante devolve,
 * seria arredondado pelo Postgres — mas só depois de trafegar, e o valor que
 * volta na leitura não seria o que o código enviou. Arredondar aqui mantém o
 * que está no banco igual ao que o teste afirma.
 */
const tresCasas = (v: number): number => Math.round(v * 1000) / 1000;

/** Fatia de 0..1, presa nas pontas. Protege contra critério novo somando errado. */
const fracao = (v: number): number => tresCasas(Math.min(1, Math.max(0, v)));

/**
 * Quanto da documentação obrigatória está pronta, de 0 a 1.
 *
 * `null` quando o edital ainda não foi lido em profundidade: o checklist da
 * coleta não traz exigência nenhuma, e uma prontidão de 100% sobre lista vazia
 * diria "está tudo pronto" justamente quando não se sabe o que é exigido. A
 * coluna aceita `null`, e é para isto que ela aceita.
 */
export function prontidaoDocumental(avaliacao: Avaliacao): number | null {
  const { totais, derivadoDoDocumento } = avaliacao.checklist;
  if (!derivadoDoDocumento || totais.obrigatorios === 0) return null;
  return fracao(totais.disponiveis / totais.obrigatorios);
}

export function oportunidadeParaLinha(dados: {
  empresaId: string;
  /** O uuid do edital na tabela `editais` — não o `id` canônico da fonte. */
  editalId: string;
  edital: Edital;
  avaliacao: Avaliacao;
  avaliadoEm?: string;
}) {
  const { avaliacao, edital } = dados;
  const { score, checklist, recomendacao } = avaliacao;

  return {
    empresa_id: dados.empresaId,
    edital_id: dados.editalId,
    score: score.valor,
    /*
     * A tabela tem `check ((score is null) = (faixa = 'indeterminada'))`. O
     * domínio já honra isso — `faixaDe` devolve `indeterminada` exatamente
     * quando não há valor —, e é justamente por os dois concordarem que vale
     * mandar os dois: se um dia divergirem, o banco recusa em vez de gravar
     * uma linha que a interface não sabe exibir.
     */
    faixa: score.faixa,
    recomendacao: recomendacao.nivel,
    cobertura: fracao(score.cobertura),
    // `not null check (length(btrim(...)) > 0)`. O resumo do nível nunca é
    // vazio, mas o fallback existe para a coluna nunca ser a primeira a saber.
    justificativa: recomendacao.resumo || "Sem justificativa registrada.",
    proxima_acao: recomendacao.proximaAcao,
    criterios: score.criterios,
    checklist,
    prontidao_documental: prontidaoDocumental(avaliacao),
    // `situacao` não é mandada: o default da coluna é 'nova', e reenviar numa
    // reavaliação apagaria o que o cliente fez — uma oportunidade que ele
    // salvou voltaria a "nova" no dia seguinte.
    encerra_em: edital.encerramentoProposta,
    versao_do_score: VERSAO_DO_SCORE,
    avaliado_em: dados.avaliadoEm ?? new Date().toISOString(),
  };
}

export function decisaoParaLinha(dados: {
  empresaId: string;
  editalId: string;
  decisao: DecisaoDeTriagem;
  /** Preenchido só quando a decisão gerou oportunidade. */
  oportunidadeId?: string | null;
}) {
  const { decisao } = dados;

  return {
    empresa_id: dados.empresaId,
    edital_id: dados.editalId,
    oportunidade_id: dados.oportunidadeId ?? null,
    recomendado: decisao.entregue,
    score: decisao.score,
    /*
     * `check (recomendado or regra_de_exclusao is not null)`: descarte sem
     * regra é proibido pela tabela, e com razão — seria um "não apareceu" sem
     * resposta, que é exatamente o que estas duas tabelas existem para evitar.
     *
     * `motivoDoDescarte` vem preenchido do domínio em todo descarte. O
     * fallback cobre o caso de alguém acrescentar um caminho de descarte novo
     * e esquecer o motivo: melhor gravar "não informada" do que derrubar o
     * lote inteiro.
     */
    regra_de_exclusao: decisao.entregue ? null : (decisao.motivoDoDescarte ?? "regra_nao_informada"),
    motivo: decisao.explicacao,
    criterios: [],
    versao_do_score: VERSAO_DO_SCORE,
    avaliado_em: decisao.decididoEm,
  };
}

/** A linha de `oportunidades` que `avaliacaoDaLinha` sabe reconstruir. */
export type LinhaDeOportunidade = {
  score: number | null;
  faixa: FaixaDoScore;
  /** `numeric(4,3)` — chega como string do PostgREST. */
  cobertura: number | string;
  criterios: CriterioAvaliado[];
  checklist: Checklist;
  recomendacao: NivelDaRecomendacao;
  justificativa: string;
  proxima_acao: ProximaAcao | null;
  /** Cópia de `editais.encerramento_proposta`, mantida por trigger — ver a migração. */
  encerra_em: string | null;
};

/**
 * O caminho de volta: a linha de `oportunidades` virando a `Avaliacao` que a
 * tela consome. O par de `oportunidadeParaLinha`.
 *
 * Duas coisas que a tabela NÃO guarda, e por isso são recalculadas aqui em vez
 * de lidas:
 *
 *   `Recomendacao.urgente` — de propósito, ver o comentário da migração: depende
 *   de quantos dias faltam a partir de AGORA, então uma coluna seria verdadeira
 *   hoje e mentira amanhã sem ninguém tocar na linha. A fórmula abaixo é a
 *   mesma de `avaliarOportunidade` (`../dominio/recomendacao.ts`) — mudou lá,
 *   muda aqui.
 *
 *   `Score.motivo` — só existe quando `score` é `null`, e `oportunidadeParaLinha`
 *   grava `recomendacao.resumo` (uma frase fixa por nível) em `justificativa`,
 *   não a frase específica que lista os critérios indeterminados. Como
 *   `criterios` guarda o status de cada um, a frase é reconstruída aqui pela
 *   mesma fórmula de `calcularScore` (`../dominio/score.ts`) — mudou lá, muda
 *   aqui.
 */
export function avaliacaoDaLinha(linha: LinhaDeOportunidade, agora: Date): Avaliacao {
  const criterios = linha.criterios ?? [];
  const positivos = criterios.filter((c) => c.status === "positivo");
  const atencoes = criterios.filter((c) => c.status === "atencao");
  const impedimentos = criterios.filter((c) => c.status === "impedimento");
  const indeterminados = criterios.filter((c) => c.status === "indeterminado");

  const cobertura = typeof linha.cobertura === "string" ? Number(linha.cobertura) : linha.cobertura;

  const motivo =
    linha.score === null
      ? "Faltam informações demais para pontuar com honestidade: " +
        indeterminados.map((c) => c.nome.toLowerCase()).join(", ") +
        "."
      : null;

  // Mesma fórmula de `diasAteEncerrar` (`../pncp/normaliza.ts`), sem importar
  // um `Edital` só para ter onde pendurar uma data: a coluna já é a data solta.
  const dias = linha.encerra_em ? Math.ceil((new Date(linha.encerra_em).getTime() - agora.getTime()) / 86_400_000) : null;

  if (!linha.proxima_acao) {
    throw new Error(
      "oportunidades.proxima_acao veio nula — toda linha gravada por oportunidadeParaLinha traz uma, " +
        "então isto é um dado gravado por outro caminho ou corrompido, não um caso normal de leitura.",
    );
  }

  return {
    score: {
      valor: linha.score,
      faixa: linha.faixa,
      cobertura,
      criterios,
      positivos,
      atencoes,
      impedimentos,
      indeterminados,
      motivo,
    },
    checklist: linha.checklist,
    recomendacao: {
      nivel: linha.recomendacao,
      resumo: linha.justificativa,
      justificativa: {
        positivos: positivos.map((c) => c.frase),
        atencoes: atencoes.map((c) => c.frase),
        impedimentos: impedimentos.map((c) => c.frase),
        naoDeterminados: indeterminados.map((c) => c.frase),
      },
      proximaAcao: linha.proxima_acao,
      urgente:
        dias !== null &&
        dias >= 0 &&
        dias <= 3 &&
        (linha.recomendacao === "recomendada_forte" || linha.recomendacao === "recomendada"),
    },
  };
}
