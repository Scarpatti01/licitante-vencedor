import type { Edital } from "../fontes/tipos.ts";
import type { AnaliseDoEdital } from "../dominio/tipos.ts";
import type { ExecucaoDeIA } from "./custo.ts";

/** Por que não houve análise — ou `"lido"`, quando houve. */
export type MotivoDaLeitura =
  /** Análise real, com `analisadoEm`. */
  | "lido"
  /** Sem anexo publicado, ou PDF sem texto extraível. Fato sobre o EDITAL. */
  | "sem_documento"
  /**
   * A fonte não devolveu a lista de documentos.
   *
   * Separado de `sem_documento` porque não é fato sobre o edital: é a nossa
   * requisição ou o PNCP que falhou, e amanhã o mesmo edital pode responder.
   * Achatar os dois foi o que deixou 03/09 publicar cinco páginas sem leitura
   * com a execução verde: cinco `lista-indisponivel` seguidos viraram cinco
   * "editais sem documento", e a guarda de falha sistêmica não viu tentativa
   * nenhuma para contar. Ver `falhaSistemica.ts`.
   */
  | "fonte_indisponivel"
  /** Texto extraído e mandado ao modelo, que recusou (quota, credencial, schema). */
  | "recusado_pelo_modelo"
  /** Download ou extração lançou. */
  | "erro";

export type ResultadoDaLeitura = {
  analise: AnaliseDoEdital | null;
  documentos: number;
  motivo: MotivoDaLeitura;
};

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
 * Junto com a ausência vem o `motivo`, porque "não leu" não é uma coisa só:
 * um edital sem anexo legível não é a mesma notícia que o provedor de IA
 * recusando a leitura, e a guarda de falha sistêmica de quem chama depende de
 * distinguir os dois (veja `falhaSistemica.ts`).
 *
 * Falha aqui nunca deve derrubar um lote: um edital cujo documento não abre
 * não pode custar os outros, pelo mesmo princípio que isola UF na coleta.
 */
/**
 * Só a primeira metade da leitura: listar, baixar, extrair.
 *
 * Separada porque o lote precisa do texto de dezenas de editais ANTES de mandar
 * qualquer coisa ao modelo, e reimplementar o download em outro arquivo
 * significaria dois lugares decidindo teto de tamanho, piso de caracteres por
 * página e o que é "sem documento" — divergindo no primeiro dia em que um deles
 * mudasse.
 */
export type TextoDoEdital =
  | { ok: true; texto: string; documentos: number }
  | {
      ok: false;
      motivo: Extract<MotivoDaLeitura, "sem_documento" | "fonte_indisponivel" | "erro">;
    };

export async function extrairTextoDoEdital(edital: Edital): Promise<TextoDoEdital> {
  try {
    const { listarDocumentos, baixarDocumento } = await import("../documentos/pncp.ts");
    const { processarEdital } = await import("../documentos/processar.ts");
    const { textoParaAnalise } = await import("../documentos/texto.ts");

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
      /*
       * `processarEdital` já separa "a fonte não respondeu" de "o edital não
       * tem anexo" — o comentário dele diz isso com todas as letras. Quem
       * achatava os dois era esta linha, que imprimia o motivo real no log e
       * devolvia `sem_documento` para todos.
       */
      const motivo = resultado.motivo === "lista-indisponivel" ? "fonte_indisponivel" : "sem_documento";
      console.log(`  sem documento (${resultado.motivo}) · ${edital.local.municipio}`);
      return { ok: false, motivo };
    }

    const texto = textoParaAnalise(resultado.documentos);
    if (!texto) {
      /*
       * Baixou anexo e não sobrou texto: PDF digitalizado, quase sempre. É o
       * edital que não dá para ler, não a leitura que quebrou.
       */
      console.log(`  sem texto extraível · ${edital.local.municipio}`);
      return { ok: false, motivo: "sem_documento" };
    }

    return { ok: true, texto, documentos: resultado.documentos.filter((d) => d.extracao.ok).length };
  } catch (e) {
    console.error(`  leitura falhou em ${edital.id}: ${(e as Error).message}`);
    return { ok: false, motivo: "erro" };
  }
}

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
): Promise<ResultadoDaLeitura> {
  const extraido = await extrairTextoDoEdital(edital);
  if (!extraido.ok) return { analise: null, documentos: 0, motivo: extraido.motivo };

  try {
    const { analisarEdital } = await import("./analisar-edital.ts");

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
      textoDoDocumento: extraido.texto,
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

    return {
      analise,
      documentos: extraido.documentos,
      motivo: analise?.analisadoEm ? "lido" : "recusado_pelo_modelo",
    };
  } catch (e) {
    console.error(`  leitura falhou em ${edital.id}: ${(e as Error).message}`);
    return { analise: null, documentos: 0, motivo: "erro" };
  }
}
