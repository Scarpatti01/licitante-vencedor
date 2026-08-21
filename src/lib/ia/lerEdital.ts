import type { Edital } from "../fontes/tipos.ts";
import type { AnaliseDoEdital } from "../dominio/tipos.ts";
import type { ExecucaoDeIA } from "./custo.ts";

/**
 * Lê os documentos de um edital e devolve a análise.
 *
 * Extraído de `scripts/publicar-posts.ts` (o primeiro e, até `ler-recomendados.ts`,
 * único chamador de `analisarEdital` em produção) para os dois scripts
 * reusarem a MESMA sequência — listar → baixar → extrair → analisar — e o
 * mesmo vocabulário de recusa, em vez de cada um reimplementar as mesmas
 * decisões (teto de 40 MB, piso de caracteres por página, "lista indisponível"
 * vs. "sem documento") e arriscar divergir.
 *
 * Devolve `null` — e não uma análise vazia — quando não deu para ler. Quem
 * chama decide o que fazer com a ausência; inventar um resumo de placeholder
 * aqui seria o pior defeito que este produto pode ter.
 *
 * Falha aqui nunca deve derrubar um lote: um edital cujo documento não abre
 * não pode custar os outros, pelo mesmo princípio que isola UF na coleta.
 */
export async function lerEAnalisar(
  edital: Edital,
  /**
   * Grava a execução em `execucoes_de_ia`, quando há repositório aberto.
   *
   * Fica de fora do `registrar` de `analisarEdital` (que é síncrono, pensado
   * para log em memória) e vira, para quem chama, um disparo assíncrono que
   * precisa ser esperado antes do processo sair, para não morrer com uma
   * escrita ainda em voo.
   */
  gravarExecucao?: (execucao: ExecucaoDeIA) => void,
): Promise<{ analise: AnaliseDoEdital | null; documentos: number }> {
  try {
    const { listarDocumentos, baixarDocumento } = await import("../documentos/pncp.ts");
    const { processarEdital } = await import("../documentos/processar.ts");
    const { textoParaAnalise } = await import("../documentos/texto.ts");
    const { analisarEdital } = await import("./analisar-edital.ts");

    /*
     * O registro devolve `null` e a triagem devolve `true` porque este
     * caminho é o de leitura sob demanda, não o incremental: o edital foi
     * escolhido para ser lido AGORA, mesmo que já tenha sido baixado antes
     * por outro motivo.
     */
    const resultado = await processarEdital(
      {
        id: edital.id,
        idNaFonte: edital.idNaFonte,
        encerramentoProposta: edital.encerramentoProposta,
      },
      {
        listar: listarDocumentos,
        baixar: baixarDocumento,
        registro: async () => null,
        interessaAAlguem: async () => true,
      },
    );

    if (!resultado.processado) {
      console.log(`  sem documento (${resultado.motivo}) · ${edital.local.municipio}`);
      return { analise: null, documentos: 0 };
    }

    const texto = textoParaAnalise(resultado.documentos);
    if (!texto) return { analise: null, documentos: 0 };

    /*
     * `registrar` não é telemetria opcional aqui — é a única forma de saber
     * por que uma leitura falhou.
     *
     * `analisarEdital` NÃO lança quando o provedor recusa: ela devolve uma
     * análise sem `analisadoEm` e entrega o motivo real (`sem_credencial`,
     * quota, modelo inexistente, resposta fora do schema) por este callback.
     * Sem passá-lo, o motivo é calculado e jogado fora.
     */
    const analise = await analisarEdital(edital, {
      textoDoDocumento: texto,
      registrar: (execucao) => {
        gravarExecucao?.(execucao);

        if (execucao.resultado !== "falha") return;
        console.error(
          `  análise recusada em ${edital.id}: ${execucao.falha}` +
            `${execucao.modelo ? ` (modelo ${execucao.modelo}` +
              `${execucao.tentativas > 1 ? `, ${execucao.tentativas} tentativas` : ""})` : ""}` +
            ` — ${execucao.motivo ?? "sem motivo declarado"}`,
        );
      },
    });
    return { analise, documentos: resultado.documentos.filter((d) => d.extracao.ok).length };
  } catch (e) {
    console.error(`  leitura falhou em ${edital.id}: ${(e as Error).message}`);
    return { analise: null, documentos: 0 };
  }
}
