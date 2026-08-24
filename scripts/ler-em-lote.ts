/**
 * Lê os editais recomendados pela **Batch API** do Gemini, e regrava a
 * oportunidade com o resultado.
 *
 *   node scripts/ler-em-lote.ts --simular   (monta os pedidos e não manda nada)
 *   node scripts/ler-em-lote.ts             (manda, espera, grava)
 *
 * Faz o mesmo que `ler-recomendados.ts` — mesmos candidatos, mesmo prompt,
 * mesma conferência de evidência, mesma regravação —, mudando só o transporte:
 * em vez de uma chamada por edital, um lote com todos.
 *
 * ## Por que existe
 *
 * **Cota.** Em 23/08 a leitura funcionou das 07:13 às 09:22 e devolveu 429 pelo
 * resto do dia. Em 24/08 nenhuma chamada passou. A Batch API tem cota própria,
 * separada e muito maior.
 *
 * **Custo.** O lote custa metade: US$ 1 e US$ 6 por milhão contra US$ 2 e
 * US$ 12. Com a média medida de 26.591 tokens de entrada e 10.975 de saída por
 * edital, a leitura cai de ~R$ 1,00 para ~R$ 0,50.
 *
 * E não custa nada em experiência: isto roda de madrugada, o resumo do cliente
 * sai às 7h, ninguém está esperando na tela.
 *
 * ## O que este script DELIBERADAMENTE não faz
 *
 * **Não escala de modelo.** Na leitura avulsa, um edital cuja resposta não
 * sustenta evidência suficiente é relido por um modelo melhor. Aqui não: o lote
 * já partiu. Em vez de gravar uma análise fraca, o script **não grava nada**
 * para esse edital — ele fica sem cache e cai naturalmente no caminho avulso,
 * que sabe escalar. Custa uma leitura repetida em poucos editais; o contrário
 * custaria a qualidade da análise, que é o produto.
 *
 * **Não persiste o lote entre execuções.** Manda, espera e aplica no mesmo
 * processo. A razão é o `fonte`: o texto enviado ao modelo é também o texto
 * contra o qual a evidência é conferida, e guardá-lo entre execuções exigiria
 * uma tabela nova com megabytes por edital. Se o prazo de espera estourar, o
 * lote é abandonado e a noite fica sem leitura em lote — sem nada gravado pela
 * metade, e com a leitura avulsa de pé.
 */

import type { AnaliseDoEdital } from "../src/lib/dominio/tipos.ts";
import { abrirRepositorio } from "../src/lib/triagem/repositorio.ts";
import { regravarComAnalise } from "../src/lib/triagem/regravar.ts";
import { abrirRepositorioDeAnalises } from "../src/lib/ia/analises.ts";
import { abrirRepositorioDeIA } from "../src/lib/ia/repositorio.ts";
import { extrairTextoDoEdital } from "../src/lib/ia/lerEdital.ts";
import {
  montarAnaliseDaResposta,
  prepararAnalise,
  type PedidoDeAnalise,
} from "../src/lib/ia/analisar-edital.ts";
import { respostaDeAnaliseDeEdital } from "../src/lib/ia/schemas.ts";
import { modelosGemini } from "../src/lib/ia/gemini.ts";
import { montarCorpoDoLote, lerRespostasDoLote, type ItemDoLote } from "../src/lib/ia/lote.ts";
import { criarLote, esperarLote } from "../src/lib/ia/loteGemini.ts";
import { evidenciasSuficientes, estimarCusto, precosEmLote } from "../src/lib/ia/custo.ts";
import { falhaSistemicaDeLeitura, resumoDaLeitura } from "../src/lib/ia/falhaSistemica.ts";
import {
  candidatosParaLeitura,
  CORTE_DE_LEITURA,
  LEITURAS_POR_EMPRESA_POR_DIA,
  type Candidato,
} from "../src/lib/pipeline/candidatosParaLeitura.ts";

/** Mesmo código de saída de `triar-editais.ts`: "falta configurar", não "quebrou". */
const SEM_CONFIGURACAO = 78;

/** Quanto tempo esperamos o lote antes de desistir da espera. */
const PRAZO_DE_ESPERA_MS = 3 * 60 * 60 * 1000;
const INTERVALO_ENTRE_CONSULTAS_MS = 60_000;

function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}

/**
 * `--limite=N`, para o ensaio custar centavos.
 *
 * A primeira execução real deste script não mandou nada: todos os candidatos do
 * dia já estavam em cache. Sem um jeito de forçar, a única forma de exercitar o
 * formato do lote contra a API de verdade seria esperar a coleta trazer edital
 * novo — e enquanto isso o script fica no repositório sem ninguém saber se
 * funciona.
 *
 * Com `--limite=2 --ignorar-cache`, o ensaio custa dois editais e responde hoje.
 */
function valorDaFlag(nome: string): string | null {
  const prefixo = `--${nome}=`;
  return process.argv.find((a) => a.startsWith(prefixo))?.slice(prefixo.length) ?? null;
}

/** Um edital pronto para entrar no lote, com o que a resposta vai precisar. */
type Preparado = {
  uuid: string;
  candidato: Candidato;
  pedido: PedidoDeAnalise;
  documentos: number;
};

async function main() {
  const simular = temFlag("simular");
  /*
   * `--ignorar-cache` relê editais que já têm análise vigente, e regrava por
   * cima. Serve ao ensaio, e só a ele: numa execução normal isso é pagar duas
   * vezes pela mesma leitura. Por isso não tem equivalente no workflow sem que
   * alguém digite.
   */
  const ignorarCache = temFlag("ignorar-cache");
  const limite = Number(valorDaFlag("limite") ?? "") || null;

  const repositorio = abrirRepositorio();
  const repositorioDeAnalises = abrirRepositorioDeAnalises();
  if (!repositorio || !repositorioDeAnalises) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a ler.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave && !simular) {
    console.log("sem GEMINI_API_KEY: nenhum edital novo será lido hoje.");
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

  const todos = candidatosParaLeitura(editaisAbertos, perfis, agora);
  const candidatos = limite ? new Map([...todos].slice(0, limite)) : todos;

  if (limite) {
    console.log(`[ENSAIO] limitado a ${candidatos.size} de ${todos.size} candidato(s)`);
  }
  if (ignorarCache) {
    console.log("[ENSAIO] ignorando o cache: editais já lidos serão relidos e regravados");
  }

  console.log(
    `${todos.size} edital(is) único(s) com score ≥ ${CORTE_DE_LEITURA} em ao menos uma empresa ` +
      `(limite de ${LEITURAS_POR_EMPRESA_POR_DIA}/empresa/dia)`,
  );

  const catalogo = modelosGemini();
  const analises = new Map<string, AnaliseDoEdital>();
  const preparados: Preparado[] = [];

  let jaEmCache = 0;
  let semDocumento = 0;
  let comErro = 0;

  console.log("\nbaixando e extraindo os documentos...");

  for (const [i, candidato] of [...candidatos.values()].entries()) {
    const { uuid, edital } = candidato;
    const posicao = `[${String(i + 1).padStart(3)}/${candidatos.size}]`;

    // O mesmo cache da leitura avulsa: a análise é UMA por edital, compartilhada
    // por toda empresa que casa com ele.
    const existente = ignorarCache ? null : await repositorioDeAnalises
      .analiseVigente(uuid, edital.id)
      .catch((e) => {
        console.error(`  analises_de_edital: não leu o cache de ${edital.id} — ${e instanceof Error ? e.message : e}`);
        return null;
      });

    if (existente?.analisadoEm) {
      jaEmCache++;
      analises.set(uuid, existente);
      console.log(`  ${posicao} já em cache · ${edital.local.municipio}/${edital.local.uf}`);
      continue;
    }

    const extraido = await extrairTextoDoEdital(edital);
    if (!extraido.ok) {
      if (extraido.motivo === "sem_documento") semDocumento++;
      else comErro++;
      console.log(`  ${posicao} sem texto · ${edital.local.municipio}/${edital.local.uf}`);
      continue;
    }

    preparados.push({
      uuid,
      candidato,
      documentos: extraido.documentos,
      pedido: prepararAnalise(edital, { textoDoDocumento: extraido.texto, catalogo }),
    });

    console.log(
      `  ${posicao} ${extraido.documentos} doc · pronto para o lote · ${edital.local.municipio}/${edital.local.uf}`,
    );
  }

  if (preparados.length === 0) {
    console.log("\nnenhum edital novo para ler — nada a mandar ao lote.");
  }

  /*
   * Um lote por modelo. `planejarExecucao` escolhe o modelo edital a edital
   * (pelo tamanho e pela integridade da segmentação), e a Batch API é por
   * modelo — então agrupamos, em vez de forçar todo mundo no mesmo.
   */
  const porModelo = new Map<string, Preparado[]>();
  for (const p of preparados) {
    const lista = porModelo.get(p.pedido.plano.modelo) ?? [];
    lista.push(p);
    porModelo.set(p.pedido.plano.modelo, lista);
  }

  for (const [modelo, itens] of porModelo) {
    console.log(`\nlote de ${itens.length} edital(is) para ${modelo}`);
  }

  if (simular) {
    console.log("\n[SIMULAÇÃO] nada foi mandado nem gravado.");
    return;
  }

  const repositorioDeIA = abrirRepositorioDeIA();
  const gravacoesPendentes: Promise<unknown>[] = [];

  let lidos = 0;
  let recusadosPeloModelo = 0;
  let semEvidencia = 0;

  for (const [modelo, itens] of porModelo) {
    const paraOLote: ItemDoLote<unknown>[] = itens.map((p) => ({
      chave: p.uuid,
      prompt: p.pedido.prompt,
      instrucaoDeSistema: p.pedido.instrucaoDeSistema,
      schema: respostaDeAnaliseDeEdital,
    }));

    const criacao = await criarLote({
      modelo,
      chave: chave!,
      corpo: montarCorpoDoLote(paraOLote, `leitura-${agora.toISOString().slice(0, 10)}-${modelo}`),
    });

    if (!criacao.ok) {
      console.error(`  lote de ${modelo}: ${criacao.motivo}`);
      recusadosPeloModelo += itens.length;
      continue;
    }

    console.log(`  lote ${criacao.nome} criado · esperando`);

    const espera = await esperarLote({
      nome: criacao.nome,
      chave: chave!,
      intervaloMs: INTERVALO_ENTRE_CONSULTAS_MS,
      prazoMs: PRAZO_DE_ESPERA_MS,
      aoConsultar: (estado, consultas) => {
        // Uma linha por consulta é log demais numa espera de horas; a cada dez
        // dá para acompanhar sem afogar.
        if (consultas === 1 || consultas % 10 === 0) {
          console.log(`    consulta ${consultas}: ${estado}`);
        }
      },
    });

    if (!espera.ok) {
      console.error(`  lote ${criacao.nome} abandonado após ${espera.consultas} consulta(s): ${espera.motivo}`);
      recusadosPeloModelo += itens.length;
      continue;
    }

    if (espera.estado !== "concluido") {
      console.error(`  lote ${criacao.nome} terminou em "${espera.estado}" — nada a aplicar`);
      recusadosPeloModelo += itens.length;
      continue;
    }

    const leitura = lerRespostasDoLote(
      espera.corpo,
      itens.map((p) => p.uuid),
      respostaDeAnaliseDeEdital,
    );

    if (!leitura.ok) {
      // A guarda de posição. Ver o topo de `lote.ts`: contagem diferente
      // significa que qualquer par pedido/resposta pode estar trocado.
      console.error(`  lote ${criacao.nome} DESCARTADO: ${leitura.motivo}`);
      recusadosPeloModelo += itens.length;
      continue;
    }

    for (const [i, item] of leitura.itens.entries()) {
      const preparado = itens[i];
      const { edital } = preparado.candidato;

      if (repositorioDeIA) {
        gravacoesPendentes.push(
          repositorioDeIA
            .gravarExecucao(
              {
                em: new Date().toISOString(),
                operacao: "analise-de-edital-em-lote",
                referencia: edital.id,
                prompt: preparado.pedido.referenciaDoPrompt,
                provedor: "gemini-lote",
                modelo,
                tentativas: 1,
                uso: item.uso,
                custo: estimarCusto(modelo, item.uso, precosEmLote()),
                duracaoMs: 0,
                resultado: item.ok ? "ok" : "falha",
                falha: item.ok ? null : item.falha,
                motivo: item.ok ? null : item.motivo,
                camposDescartados: 0,
              },
              { empresaId: null, editalId: preparado.uuid },
            )
            .catch((e) => console.error(`  execucoes_de_ia: não gravou — ${e instanceof Error ? e.message : e}`)),
        );
      }

      if (!item.ok) {
        recusadosPeloModelo++;
        console.error(`  análise recusada em ${edital.id}: ${item.falha} — ${item.motivo}`);
        continue;
      }

      const montada = montarAnaliseDaResposta(edital, item.valor, preparado.pedido, { modelo });

      /*
       * Aqui é onde o lote abre mão de gravar em vez de gravar algo fraco.
       * Sem escalonamento possível, análise com pouca evidência sustentada não
       * vira cache: o edital fica sem análise e a leitura avulsa o pega depois,
       * com o modelo melhor. Ver o cabeçalho.
       */
      if (
        !evidenciasSuficientes({
          camposSustentados: montada.sustentados,
          camposDescartados: montada.descartados,
        })
      ) {
        semEvidencia++;
        console.log(
          `  evidência insuficiente em ${edital.id} (${montada.sustentados} sustentados, ` +
            `${montada.descartados} descartados) — deixando para a leitura avulsa escalar`,
        );
        continue;
      }

      lidos++;
      analises.set(preparado.uuid, montada.analise);
      gravacoesPendentes.push(
        repositorioDeAnalises
          .gravarAnalise(montada.analise, preparado.uuid, null)
          .catch((e) => console.error(`  analises_de_edital: não gravou ${edital.id} — ${e instanceof Error ? e.message : e}`)),
      );
    }
  }

  await Promise.allSettled(gravacoesPendentes);

  const contagem = { lidos, semDocumento, recusadosPeloModelo, comErro };
  console.log(`\nleitura em lote: ${resumoDaLeitura({ ...contagem, jaEmCache })}`);
  if (semEvidencia > 0) {
    console.log(`${semEvidencia} edital(is) sem evidência suficiente ficaram para a leitura avulsa`);
  }

  const falha = falhaSistemicaDeLeitura(contagem);
  if (falha) throw new Error(falha);

  if (analises.size === 0) {
    console.log("nenhuma análise nova nem em cache — nada para regravar.");
    return;
  }

  const regravado = await regravarComAnalise({ repositorio, candidatos, analises, agora });
  console.log(
    `banco: ${regravado.oportunidades} oportunidade(s) regravada(s) com leitura real · ` +
      `${regravado.decisoes} decisão(ões) atualizada(s)`,
  );
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
