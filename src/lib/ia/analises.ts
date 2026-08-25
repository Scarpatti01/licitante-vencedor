import type { AnaliseDoEdital, ExigenciaDoEdital } from "../dominio/tipos.ts";
import type { Campo } from "../dominio/procedencia.ts";
import { PROMPT_DE_ANALISE_EM_USO } from "./prompts/index.ts";

/**
 * `AnaliseDoEdital` ↔ a linha de `analises_de_edital`.
 *
 * A tabela existe desde 14/08 e, até `ler-recomendados.ts`, nada nunca
 * escreveu nela — `publicar-posts.ts` chama `analisarEdital` e usa o
 * resultado só para o texto do post, em memória, nunca persistido (ver o
 * comentário que isso deixou em `scripts/triar-editais.ts`).
 *
 * Serialização direta: `Campo<T>` já É o formato que
 * `eh_campo_com_procedencia` (banco) confere — mesma escolha de
 * `triagem/mapeamento.ts` para `criterios`/`checklist`. Nenhuma tradução de
 * nome de campo além de camelCase → snake_case nas colunas de fora.
 */

export type LinhaDeAnalise = {
  edital_id: string;
  analisado_em: string | null;
  versao_do_prompt: string;
  modelo: string | null;
  profundidade: AnaliseDoEdital["profundidade"];
  resumo_executivo: Campo<string>;
  criterio_de_julgamento: Campo<string>;
  garantia_exigida: Campo<boolean>;
  visita_tecnica_exigida: Campo<boolean>;
  amostra_exigida: Campo<boolean>;
  exigencias: ExigenciaDoEdital[];
  riscos: Campo<string>[];
  custo_em_centavos: number | null;
};

/**
 * `editalUuid` é o `id` de `editais` (referenciado por `analises_de_edital.edital_id`)
 * — NUNCA `analise.editalId`, que é o id canônico da fonte (`PE-2026-...`). É a
 * mesma distinção que `triar-editais.ts` já respeita ao gravar `oportunidades`
 * com `editalId: editalUuid`, não com `edital.id`.
 */
export function analiseParaLinha(
  analise: AnaliseDoEdital,
  editalUuid: string,
  custoEmCentavos: number | null,
): LinhaDeAnalise {
  return {
    edital_id: editalUuid,
    analisado_em: analise.analisadoEm,
    // `versaoDoPrompt` vem `null` de `analiseNaoRealizada` — nunca deveríamos
    // gravar essa forma (quem chama já checou `analisadoEm`), mas o ponteiro
    // vivo é a queda segura em vez de gravar `null` numa coluna `not null`.
    versao_do_prompt: analise.versaoDoPrompt ?? PROMPT_DE_ANALISE_EM_USO.referencia,
    modelo: analise.modelo,
    profundidade: analise.profundidade,
    resumo_executivo: analise.resumoExecutivo,
    criterio_de_julgamento: analise.criterioDeJulgamento,
    garantia_exigida: analise.garantiaExigida,
    visita_tecnica_exigida: analise.visitaTecnicaExigida,
    amostra_exigida: analise.amostraExigida,
    exigencias: analise.exigencias,
    riscos: analise.riscos,
    custo_em_centavos: custoEmCentavos,
  };
}

/**
 * `editalIdCanonico` não mora na linha (a tabela referencia `editais` por
 * uuid, não pelo id da fonte) — quem chama já o tem, porque toda leitura desta
 * tabela parte de um edital já carregado (`editaisAbertos()`), e é mais barato
 * repassar o que já está em mãos do que fazer o join só para preencher um
 * campo informativo.
 */
export function linhaParaAnalise(linha: LinhaDeAnalise, editalIdCanonico: string): AnaliseDoEdital {
  return {
    editalId: editalIdCanonico,
    analisadoEm: linha.analisado_em,
    versaoDoPrompt: linha.versao_do_prompt,
    modelo: linha.modelo,
    resumoExecutivo: linha.resumo_executivo,
    exigencias: linha.exigencias,
    criterioDeJulgamento: linha.criterio_de_julgamento,
    garantiaExigida: linha.garantia_exigida,
    visitaTecnicaExigida: linha.visita_tecnica_exigida,
    amostraExigida: linha.amostra_exigida,
    riscos: linha.riscos,
    profundidade: linha.profundidade,
  };
}

export type RepositorioDeAnalises = {
  /**
   * A análise vigente deste edital, se alguém já leu — `publicar-posts.ts` de
   * um dia anterior, ou `ler-recomendados.ts` para outra empresa hoje. É o
   * cache que evita pagar duas vezes pela mesma leitura: análise é UMA por
   * edital, compartilhada entre todo mundo que casa com ele (ver o comentário
   * em `ia/custo.ts`).
   */
  analiseVigente(editalUuid: string, editalIdCanonico: string): Promise<AnaliseDoEdital | null>;
  /**
   * Os editais que JÁ têm análise vigente, por uuid.
   *
   * Serve à SELEÇÃO, não à leitura: `analiseVigente` continua sendo a fonte da
   * verdade na hora de decidir se paga por um edital. Esta lista existe para
   * que o edital já lido não ocupe a vaga do edital novo — ver o comentário de
   * `candidatosParaLeitura`, e o dia 25/08, em que quatro dos cinco editais de
   * maior score já estavam lidos e ficariam no topo até setembro.
   */
  editaisJaAnalisados(): Promise<Set<string>>;
  /**
   * Grava a análise como vigente. Não lança em falha de rede — quem chama
   * decide se tenta de novo ou segue sem a leitura, mesmo princípio de
   * `lerEAnalisar`: um edital que não grava não pode custar os outros do lote.
   */
  gravarAnalise(analise: AnaliseDoEdital, editalUuid: string, custoEmCentavos: number | null): Promise<void>;
};

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

export function abrirRepositorioDeAnalises(): RepositorioDeAnalises | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  return {
    async analiseVigente(editalUuid, editalIdCanonico) {
      const consulta = new URLSearchParams({
        select: "*",
        edital_id: `eq.${editalUuid}`,
        vigente: "eq.true",
        limit: "1",
      });
      const resposta = await fetch(`${url}/rest/v1/analises_de_edital?${consulta}`, {
        headers: cabecalhos,
      });
      if (!resposta.ok) {
        throw new Error(`analises_de_edital: supabase respondeu ${resposta.status} ${await resposta.text()}`);
      }
      const linhas = (await resposta.json()) as LinhaDeAnalise[];
      const linha = linhas[0];
      return linha ? linhaParaAnalise(linha, editalIdCanonico) : null;
    },

    async editaisJaAnalisados() {
      const uuids = new Set<string>();

      // Página a página: a tabela cresce com o tempo, e um `limit` fixo
      // silenciosamente cortaria a lista — fazendo voltar exatamente o defeito
      // que este método existe para impedir, e sem barulho nenhum.
      for (let inicio = 0; ; inicio += 1000) {
        const consulta = new URLSearchParams({
          select: "edital_id",
          vigente: "eq.true",
          analisado_em: "not.is.null",
          limit: "1000",
          offset: String(inicio),
        });
        const resposta = await fetch(`${url}/rest/v1/analises_de_edital?${consulta}`, {
          headers: cabecalhos,
        });
        if (!resposta.ok) {
          throw new Error(`analises_de_edital: supabase respondeu ${resposta.status} ${await resposta.text()}`);
        }
        const linhas = (await resposta.json()) as { edital_id: string }[];
        for (const linha of linhas) uuids.add(linha.edital_id);
        if (linhas.length < 1000) break;
      }

      return uuids;
    },

    async gravarAnalise(analise, editalUuid, custoEmCentavos) {
      const linha = analiseParaLinha(analise, editalUuid, custoEmCentavos);
      // `on_conflict` no par que `analise_unica_por_versao` já protege: uma
      // segunda leitura do MESMO edital na MESMA versão de prompt atualiza em
      // vez de colidir — cobre duas execuções concorrentes gravando o mesmo
      // edital no mesmo dia sem depender de nenhuma saber da outra.
      //
      // Não cobre troca de `versao_do_prompt` com uma linha vigente antiga
      // ainda de pé: as duas colidiriam em `analise_vigente_unica` (só uma
      // vigente por edital), e isto aqui não tenta resolver isso — rotação de
      // prompt é operação deliberada, não algo que um script diário precise
      // saber fazer sozinho.
      const resposta = await fetch(
        `${url}/rest/v1/analises_de_edital?on_conflict=edital_id,versao_do_prompt`,
        {
          method: "POST",
          headers: { ...cabecalhos, prefer: "resolution=merge-duplicates" },
          body: JSON.stringify(linha),
        },
      );
      if (!resposta.ok) {
        throw new Error(`analises_de_edital: supabase respondeu ${resposta.status} ${await resposta.text()}`);
      }
    },
  };
}
