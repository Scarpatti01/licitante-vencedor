/**
 * Lê de verdade os editais mais aderentes de cada empresa, e regrava a
 * oportunidade com o resultado.
 *
 *   node scripts/ler-recomendados.ts --simular      (não lê nem grava, só mostra quem entraria)
 *   node scripts/ler-recomendados.ts                 (lê e grava de verdade)
 *
 * Roda DEPOIS de `triar-editais.ts`, no mesmo passo do workflow: precisa que
 * `oportunidades` já tenha a triagem do dia (score "de ficha", sem leitura)
 * para saber quem é candidato.
 *
 * Quem entra na leitura e por quê — o corte de score, o limite por empresa —
 * é decisão pura de `pipeline/candidatosParaLeitura.ts`, testada sem banco. Este
 * arquivo só orquestra: busca os candidatos, lê, grava.
 *
 * ## O que muda na oportunidade já gravada
 *
 * `triar-editais.ts` já gravou a oportunidade com `analiseNaoRealizada` (score
 * "de ficha", honesto, mas sem documentação/complexidade). Este script troca
 * a análise pela leitura real SÓ para os pares empresa×edital afetados, e
 * regrava por cima — mesma chave (`empresa_id, edital_id`), sem versão nova:
 * o algoritmo de score não mudou, só o dado de entrada melhorou.
 *
 * Não re-triagem tudo de novo: só os pares que hoje tinham score ≥ 70 SEM
 * leitura entram na lista de candidatos, e só esses são regravados. Reprocessar
 * as dezenas de milhares de oportunidades já corretas seria custo de banco sem
 * propósito.
 */

import type { AnaliseDoEdital } from "../src/lib/dominio/tipos.ts";
import { triar } from "../src/lib/pipeline/triagem.ts";
import { decisaoParaLinha, oportunidadeParaLinha } from "../src/lib/triagem/mapeamento.ts";
import { abrirRepositorio } from "../src/lib/triagem/repositorio.ts";
import { abrirRepositorioDeAnalises } from "../src/lib/ia/analises.ts";
import { abrirRepositorioDeIA } from "../src/lib/ia/repositorio.ts";
import { lerEAnalisar } from "../src/lib/ia/lerEdital.ts";
import { falhaSistemicaDeLeitura, resumoDaLeitura } from "../src/lib/ia/falhaSistemica.ts";
import type { ExecucaoDeIA } from "../src/lib/ia/custo.ts";
import {
  candidatosParaLeitura,
  CORTE_DE_LEITURA,
  LEITURAS_POR_EMPRESA_POR_DIA,
} from "../src/lib/pipeline/candidatosParaLeitura.ts";

/** Mesmo código de saída de `triar-editais.ts`: "falta configurar", não "quebrou". */
const SEM_CONFIGURACAO = 78;

function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}

async function main() {
  const simular = temFlag("simular");

  const repositorio = abrirRepositorio();
  const repositorioDeAnalises = abrirRepositorioDeAnalises();
  if (!repositorio || !repositorioDeAnalises) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a ler.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const agora = new Date();
  const [perfis, editaisAbertos] = await Promise.all([
    repositorio.perfis(),
    repositorio.editaisAbertos(agora),
  ]);

  console.log(
    `${perfis.length} empresa(s) com perfil completo · ${editaisAbertos.length} edital(is) com proposta aberta`,
  );

  if (perfis.length === 0 || editaisAbertos.length === 0) {
    console.log("nada a cruzar — encerrando sem ler.");
    return;
  }

  const candidatos = candidatosParaLeitura(editaisAbertos, perfis, agora);
  console.log(
    `${candidatos.size} edital(is) único(s) com score ≥ ${CORTE_DE_LEITURA} em ao menos uma empresa ` +
      `(limite de ${LEITURAS_POR_EMPRESA_POR_DIA}/empresa/dia)`,
  );

  if (simular) {
    console.log("[SIMULAÇÃO] nada foi lido nem gravado.");
    return;
  }

  const temChave = Boolean(process.env.GEMINI_API_KEY?.trim());
  if (!temChave) {
    console.log("sem GEMINI_API_KEY: nenhum edital novo será lido hoje.");
    return;
  }

  const repositorioDeIA = abrirRepositorioDeIA();
  const gravacoesPendentes: Promise<unknown>[] = [];

  let jaEmCache = 0;
  let lidosAgora = 0;
  let semDocumento = 0;
  let recusadosPeloModelo = 0;
  let comErro = 0;

  /** As análises reais obtidas nesta execução, por uuid do edital. */
  const analisesLidas = new Map<string, AnaliseDoEdital>();

  console.log("\nlendo os documentos e analisando...");

  for (const [i, candidato] of [...candidatos.values()].entries()) {
    const { uuid, edital } = candidato;

    // Cache primeiro: outra execução de hoje (ou de um dia anterior, para um
    // edital com prazo longo) já pode ter lido este mesmo edital — a leitura
    // é por edital, compartilhada entre toda empresa que casa com ele.
    const existente = await repositorioDeAnalises
      .analiseVigente(uuid, edital.id)
      .catch((e) => {
        console.error(`  analises_de_edital: não leu o cache de ${edital.id} — ${e instanceof Error ? e.message : e}`);
        return null;
      });

    if (existente?.analisadoEm) {
      jaEmCache++;
      analisesLidas.set(uuid, existente);
      console.log(
        `  [${String(i + 1).padStart(3)}/${candidatos.size}] já em cache · ${edital.local.municipio}/${edital.local.uf}`,
      );
      continue;
    }

    /*
     * Soma o custo de TODAS as execuções desta leitura (pode escalar de
     * modelo e tentar mais de uma vez) para gravar em
     * `analises_de_edital.custo_em_centavos` — a mesma soma que
     * `execucoes_de_ia` guarda linha a linha, só que por edital.
     */
    let custoAcumuladoEmCentavosUsd: number | null = repositorioDeIA ? 0 : null;
    const gravarExecucao = repositorioDeIA
      ? (execucao: ExecucaoDeIA) => {
          if (execucao.custo.usd !== null && custoAcumuladoEmCentavosUsd !== null) {
            custoAcumuladoEmCentavosUsd += Math.round(execucao.custo.usd * 100);
          }
          gravacoesPendentes.push(
            repositorioDeIA
              .gravarExecucao(execucao, { empresaId: null, editalId: uuid })
              .catch((e) => console.error(`  execucoes_de_ia: não gravou — ${e instanceof Error ? e.message : e}`)),
          );
        }
      : undefined;

    const { analise, documentos, motivo } = await lerEAnalisar(edital, gravarExecucao);

    console.log(
      `  [${String(i + 1).padStart(3)}/${candidatos.size}] ${documentos} doc · ` +
        `${analise?.analisadoEm ? "lido" : "sem leitura"} · ${edital.local.municipio}/${edital.local.uf}`,
    );

    if (analise?.analisadoEm) {
      lidosAgora++;
      analisesLidas.set(uuid, analise);
      gravacoesPendentes.push(
        repositorioDeAnalises
          .gravarAnalise(analise, uuid, custoAcumuladoEmCentavosUsd)
          .catch((e) => console.error(`  analises_de_edital: não gravou ${edital.id} — ${e instanceof Error ? e.message : e}`)),
      );
    } else if (motivo === "sem_documento") {
      semDocumento++;
    } else if (motivo === "recusado_pelo_modelo") {
      recusadosPeloModelo++;
    } else {
      comErro++;
    }
  }

  await Promise.allSettled(gravacoesPendentes);

  const contagem = { lidos: lidosAgora, semDocumento, recusadosPeloModelo, comErro };
  console.log(`\nleitura: ${resumoDaLeitura({ ...contagem, jaEmCache })}`);

  /*
   * A mesma guarda de `publicar-posts.ts`, e pela mesma razão: N editais
   * independentes não falham todos por acaso. `jaEmCache` não prova nada sobre
   * o pipeline de HOJE — só que um dia anterior funcionou —, então a conta que
   * importa é só entre as leituras FRESCAS desta execução, e só entre as que
   * chegaram a tentar. O critério mora em `falhaSistemica.ts`, com os testes
   * que dizem por que edital sem documento não entra na conta.
   */
  const falha = falhaSistemicaDeLeitura(contagem);
  if (falha) throw new Error(falha);

  if (analisesLidas.size === 0) {
    console.log("nenhuma análise nova nem em cache — nada para regravar.");
    return;
  }

  // Regrava só os pares empresa×edital afetados, com a análise real.
  const linhasDeOportunidade: ReturnType<typeof oportunidadeParaLinha>[] = [];
  const porDecidir: { empresaId: string; editalUuid: string; decisao: ReturnType<typeof triar>["decisoes"][number] }[] = [];

  for (const candidato of candidatos.values()) {
    const analise = analisesLidas.get(candidato.uuid);
    if (!analise) continue; // não foi lido nem estava em cache — segue com o score "de ficha" já gravado

    for (const perfil of candidato.empresas) {
      const { decisoes } = triar([{ edital: candidato.edital, analise }], perfil, agora);
      const decisao = decisoes[0];

      if (decisao.entregue) {
        linhasDeOportunidade.push(
          oportunidadeParaLinha({
            empresaId: perfil.empresaId,
            editalId: candidato.uuid,
            edital: candidato.edital,
            avaliacao: decisao.avaliacao,
            avaliadoEm: decisao.decididoEm,
          }),
        );
      }

      porDecidir.push({ empresaId: perfil.empresaId, editalUuid: candidato.uuid, decisao });
    }
  }

  const mapaDeOportunidades = await repositorio.gravarOportunidades(linhasDeOportunidade);

  const linhasDeDecisao = porDecidir.map(({ empresaId, editalUuid, decisao }) =>
    decisaoParaLinha({
      empresaId,
      editalId: editalUuid,
      decisao,
      oportunidadeId: mapaDeOportunidades.get(`${empresaId}:${editalUuid}`) ?? null,
    }),
  );
  const decisoesGravadas = await repositorio.gravarDecisoes(linhasDeDecisao);

  console.log(
    `banco: ${mapaDeOportunidades.size} oportunidade(s) regravada(s) com leitura real · ` +
      `${decisoesGravadas} decisão(ões) atualizada(s)`,
  );
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
