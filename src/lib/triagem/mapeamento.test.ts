import { describe, expect, it } from "vitest";
import { PERFIL_COMPLETO, PERFIL_INCOMPLETO } from "../dominio/exemplos";
import { analiseNaoRealizada, avaliarOportunidade } from "../dominio/recomendacao";
import { VERSAO_DO_SCORE } from "../dominio/score";
import { edital } from "../fontes/fixtures";
import { triar } from "../pipeline/triagem";
import { avaliacaoDaLinha, decisaoParaLinha, oportunidadeParaLinha, prontidaoDocumental } from "./mapeamento";

/**
 * Cada caso aqui corresponde a uma restrição de `oportunidades` ou de
 * `decisoes_de_triagem`. É a mesma lição de `editais/gravar.ts`: um mapeamento
 * que ignora um `check` passa no teste e derruba o lote em produção.
 */

const agora = new Date("2026-08-14T09:00:00-03:00");
const UM_EDITAL = edital({ encerramentoProposta: "2026-08-30T14:00:00-03:00" });

function avaliar(perfil = PERFIL_COMPLETO, e = UM_EDITAL) {
  return avaliarOportunidade(e, analiseNaoRealizada(e.id, "não lido"), perfil, agora);
}

const linhaDe = (perfil = PERFIL_COMPLETO, e = UM_EDITAL) =>
  oportunidadeParaLinha({
    empresaId: "11111111-1111-1111-1111-111111111111",
    editalId: "22222222-2222-2222-2222-222222222222",
    edital: e,
    avaliacao: avaliar(perfil, e),
    avaliadoEm: agora.toISOString(),
  });

describe("oportunidadeParaLinha", () => {
  it("usa o uuid do edital, não o id canônico da fonte", () => {
    // `edital_id` é FK para `editais.id`. Mandar `PE-2026-000001` ali quebra a
    // integridade referencial com uma mensagem que não diz isso.
    const linha = linhaDe();
    expect(linha.edital_id).toBe("22222222-2222-2222-2222-222222222222");
    expect(linha.edital_id).not.toBe(UM_EDITAL.id);
  });

  it("score nulo e faixa indeterminada andam sempre juntos", () => {
    /*
     * `check ((score is null) = (faixa = 'indeterminada'))`. O domínio já honra
     * isso; o teste existe para o dia em que alguém mexer no `faixaDe` e a
     * tabela passar a recusar linhas sem ninguém entender por quê.
     */
    for (const perfil of [PERFIL_COMPLETO, PERFIL_INCOMPLETO]) {
      const linha = linhaDe(perfil);
      expect(linha.score === null).toBe(linha.faixa === "indeterminada");
    }
  });

  it("cobertura cabe em numeric(4,3)", () => {
    // Três casas decimais: `0.8333333333333334` seria arredondado pelo Postgres
    // depois de trafegar, e o valor lido não seria o enviado.
    const { cobertura } = linhaDe();
    expect(cobertura).toBeGreaterThanOrEqual(0);
    expect(cobertura).toBeLessThanOrEqual(1);
    expect(String(cobertura).replace(/^\d+\.?/, "").length).toBeLessThanOrEqual(3);
  });

  it("justificativa nunca é vazia", () => {
    // `not null check (length(btrim(justificativa)) > 0)`.
    expect(linhaDe().justificativa.trim().length).toBeGreaterThan(0);
  });

  it("proxima_acao sempre traz `tipo`", () => {
    // `check (proxima_acao is null or (jsonb_typeof = 'object' and tipo <> ''))`.
    const acao = linhaDe().proxima_acao;
    expect(acao).not.toBeNull();
    expect(acao.tipo).toBeTruthy();
  });

  it("criterios é array e checklist é objeto", () => {
    // Duas colunas jsonb com `jsonb_typeof` cravado no check.
    const linha = linhaDe();
    expect(Array.isArray(linha.criterios)).toBe(true);
    expect(typeof linha.checklist).toBe("object");
    expect(Array.isArray(linha.checklist)).toBe(false);
  });

  it("NÃO manda situacao — reavaliar não pode apagar o que o cliente fez", () => {
    /*
     * O defeito que isto evita é silencioso e caro: uma oportunidade que o
     * cliente salvou voltaria a "nova" na reavaliação do dia seguinte, e o
     * funil dele se desmancharia sozinho toda madrugada.
     */
    expect(linhaDe()).not.toHaveProperty("situacao");
  });

  it("carimba a versão do score", () => {
    // É o que permite responder "por que este edital tinha 78 em março?" sem
    // recalcular com as regras de hoje.
    expect(linhaDe().versao_do_score).toBe(VERSAO_DO_SCORE);
  });

  it("leva o prazo do edital para `encerra_em`", () => {
    expect(linhaDe().encerra_em).toBe("2026-08-30T14:00:00-03:00");
  });
});

describe("prontidaoDocumental", () => {
  it("é nula quando o edital não foi lido em profundidade", () => {
    /*
     * O checklist da coleta não traz exigência nenhuma. Uma prontidão de 100%
     * sobre lista vazia diria "está tudo pronto" justamente quando não se sabe
     * o que é exigido — e a coluna aceita `null` para este caso existir.
     */
    const avaliacao = avaliar();
    expect(avaliacao.checklist.derivadoDoDocumento).toBe(false);
    expect(prontidaoDocumental(avaliacao)).toBeNull();
  });
});

describe("decisaoParaLinha", () => {
  const decisoes = (perfil = PERFIL_COMPLETO) =>
    triar(
      [{ edital: UM_EDITAL, analise: analiseNaoRealizada(UM_EDITAL.id, "não lido") }],
      perfil,
      agora,
    );

  const paraLinha = (perfil = PERFIL_COMPLETO) =>
    decisaoParaLinha({
      empresaId: "11111111-1111-1111-1111-111111111111",
      editalId: "22222222-2222-2222-2222-222222222222",
      decisao: decisoes(perfil).decisoes[0],
    });

  it("descarte SEMPRE traz regra de exclusão", () => {
    /*
     * `check (recomendado or regra_de_exclusao is not null)`. A tabela proíbe
     * descarte sem regra, e com razão: seria um "não apareceu" sem resposta —
     * exatamente o que estas tabelas existem para evitar.
     */
    const linha = paraLinha(PERFIL_INCOMPLETO);
    if (!linha.recomendado) {
      expect(linha.regra_de_exclusao).toBeTruthy();
    }
  });

  it("recomendado não inventa regra de exclusão", () => {
    const linha = paraLinha();
    if (linha.recomendado) expect(linha.regra_de_exclusao).toBeNull();
  });

  it("nasce sem oportunidade vinculada quando não há", () => {
    // Descartado não gera oportunidade, e a coluna é opcional justamente por
    // isso: a decisão existe para TODOS, a oportunidade só para os entregues.
    expect(paraLinha().oportunidade_id).toBeNull();
  });

  it("carimba a mesma versão do score que a oportunidade", () => {
    // `triagem_unica_por_versao` conta com isso para saber o que reprocessar.
    expect(paraLinha().versao_do_score).toBe(VERSAO_DO_SCORE);
    expect(paraLinha().versao_do_score).toBe(linhaDe().versao_do_score);
  });

  it("guarda a explicação legível, não só o código da regra", () => {
    // É o texto que o suporte lê para responder ao cliente.
    expect(paraLinha(PERFIL_INCOMPLETO).motivo.length).toBeGreaterThan(10);
  });
});

describe("avaliacaoDaLinha — o caminho de volta", () => {
  it("ida e volta: score, faixa, criterios e checklist saem iguais ao que entrou", () => {
    const avaliacao = avaliar();
    const linha = linhaDe();
    const reconstruida = avaliacaoDaLinha(linha, agora);

    expect(reconstruida.score.valor).toBe(avaliacao.score.valor);
    expect(reconstruida.score.faixa).toBe(avaliacao.score.faixa);
    expect(reconstruida.score.criterios).toEqual(avaliacao.score.criterios);
    expect(reconstruida.checklist).toEqual(avaliacao.checklist);
    expect(reconstruida.recomendacao.nivel).toBe(avaliacao.recomendacao.nivel);
    expect(reconstruida.recomendacao.proximaAcao).toEqual(avaliacao.recomendacao.proximaAcao);
  });

  it("cobertura ida e volta tolera só o arredondamento de numeric(4,3)", () => {
    const avaliacao = avaliar();
    const reconstruida = avaliacaoDaLinha(linhaDe(), agora);
    expect(reconstruida.score.cobertura).toBeCloseTo(avaliacao.score.cobertura, 3);
  });

  it("cobertura chegando como string (numeric do PostgREST) converte para número", () => {
    const linha = { ...linhaDe(), cobertura: String(linhaDe().cobertura) };
    expect(typeof avaliacaoDaLinha(linha, agora).score.cobertura).toBe("number");
  });

  it("positivos/atencoes/impedimentos/indeterminados vêm de `criterios`, filtrados por status", () => {
    const avaliacao = avaliar();
    const reconstruida = avaliacaoDaLinha(linhaDe(), agora);
    expect(reconstruida.score.positivos).toEqual(avaliacao.score.positivos);
    expect(reconstruida.score.atencoes).toEqual(avaliacao.score.atencoes);
    expect(reconstruida.score.impedimentos).toEqual(avaliacao.score.impedimentos);
    expect(reconstruida.score.indeterminados).toEqual(avaliacao.score.indeterminados);
  });

  it("justificativa reconstrói positivos/atencoes/impedimentos/naoDeterminados como frases", () => {
    const avaliacao = avaliar();
    const reconstruida = avaliacaoDaLinha(linhaDe(), agora);
    expect(reconstruida.recomendacao.justificativa).toEqual(avaliacao.recomendacao.justificativa);
  });

  it("score nulo: motivo é reconstruído a partir dos indeterminados, não perdido", () => {
    // `oportunidadeParaLinha` só grava o resumo fixo do nível em `justificativa`
    // ("Ainda não há informação suficiente..."), não a frase específica de
    // `Score.motivo` que lista os critérios. `avaliacaoDaLinha` reconstrói essa
    // frase a partir de `criterios`, e este teste garante que ela não vira
    // texto vazio nem o resumo genérico.
    const avaliacao = avaliar(PERFIL_INCOMPLETO);
    expect(avaliacao.score.valor).toBeNull();

    const reconstruida = avaliacaoDaLinha(linhaDe(PERFIL_INCOMPLETO), agora);
    expect(reconstruida.score.motivo).not.toBeNull();
    expect(reconstruida.score.motivo).toContain("Faltam informações demais");
  });

  it("score não nulo: motivo reconstruído é null", () => {
    const reconstruida = avaliacaoDaLinha(linhaDe(), agora);
    expect(reconstruida.score.motivo).toBeNull();
  });

  it("urgente é recalculado a partir de encerra_em e agora, não lido de coluna", () => {
    // Objeto escolhido para casar com as palavras-chave de PERFIL_COMPLETO e
    // garantir uma recomendação boa — "urgente" só existe na interseção de
    // "vale a pena" com "acaba logo", e o teste precisa da primeira metade
    // para poder testar a segunda.
    const editalCompativel = edital({
      objeto: "Contratação de empresa para limpeza predial e conservação de próprios municipais",
      encerramentoProposta: "2026-08-30T14:00:00-03:00",
    });
    const linha = linhaDe(PERFIL_COMPLETO, editalCompativel);
    const nivel = avaliar(PERFIL_COMPLETO, editalCompativel).recomendacao.nivel;
    expect(["recomendada", "recomendada_forte"]).toContain(nivel);

    const pertoDoFim = new Date("2026-08-29T09:00:00-03:00");
    const longeDoFim = new Date("2026-08-14T09:00:00-03:00");

    expect(avaliacaoDaLinha(linha, pertoDoFim).recomendacao.urgente).toBe(true);
    expect(avaliacaoDaLinha(linha, longeDoFim).recomendacao.urgente).toBe(false);
  });

  it("proxima_acao nula é um erro de dado, não um valor a esconder", () => {
    const linha = { ...linhaDe(), proxima_acao: null };
    expect(() => avaliacaoDaLinha(linha, agora)).toThrow(/proxima_acao/);
  });
});
