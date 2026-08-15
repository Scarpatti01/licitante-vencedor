/**
 * A ligação: pega um edital coletado e devolve o texto dos documentos dele.
 *
 * Até aqui existiam duas peças soltas — `incremental.ts` decide se vale baixar,
 * `extrair.ts` transforma bytes em texto — e nada que as chamasse. Este arquivo
 * é o que faltava para a extração deixar de ser biblioteca e virar
 * comportamento.
 *
 * ## Tudo entra por porta, nada é buscado aqui dentro
 *
 * `listar`, `baixar` e `registro` chegam como parâmetro. Não é cerimônia: é o
 * que permite testar a orquestração inteira — inclusive os caminhos de erro, que
 * são a maioria — sem rede e sem banco. A implementação real do PNCP mora em
 * `pncp.ts`, ao lado, e é fina de propósito.
 *
 * ## A ordem é a ordem do custo
 *
 * Listar é uma requisição pequena; baixar são ~4 MB por edital. Por isso a
 * decisão de `incremental.ts` roda entre as duas: ela precisa da lista para
 * comparar a assinatura, e evita o download quando nada mudou. Medido: ~93,2%
 * das varreduras caem nesse caso.
 */

import { decidir, assinarDocumentos, type Decisao, type DocumentoAnunciado, type RegistroDeDocumentos } from "./incremental.ts";
import { extrair, type Extracao } from "./extrair.ts";

/** O mínimo do edital que este módulo precisa saber. */
export type EditalParaProcessar = {
  id: string;
  /** `idNaFonte` do PNCP, no formato `cnpj-x-sequencial/ano`. */
  idNaFonte: string;
  encerramentoProposta: string | null;
};

export type Portas = {
  /** Os documentos que a fonte anuncia para este edital. */
  listar(edital: EditalParaProcessar): Promise<DocumentoAnunciado[]>;
  /** Baixa um documento. O `sequencial` identifica qual, dentro do edital. */
  baixar(edital: EditalParaProcessar, documento: DocumentoAnunciado): Promise<Uint8Array>;
  /** O que já processamos antes, ou `null`. */
  registro(edital: EditalParaProcessar): Promise<RegistroDeDocumentos | null>;
  /** Guarda o resultado. Opcional: o modo de simulação não grava nada. */
  gravar?(edital: EditalParaProcessar, resultado: ResultadoDoEdital): Promise<void>;
  /** O edital interessa a alguma empresa? Quem responde é a triagem. */
  interessaAAlguem(edital: EditalParaProcessar): Promise<boolean>;
};

export type DocumentoProcessado = {
  sequencial: number;
  titulo: string;
  extracao: Extracao;
};

export type ResultadoDoEdital =
  | {
      editalId: string;
      processado: false;
      /** O mesmo vocabulário de `incremental.ts`, mais as falhas desta camada. */
      motivo: Extract<Decisao, { baixar: false }>["motivo"] | "lista-indisponivel";
      detalhe?: string;
    }
  | {
      editalId: string;
      processado: true;
      documentos: DocumentoProcessado[];
      /** Assinatura da lista processada — é o que a próxima rodada compara. */
      assinatura: string;
      paginas: number;
      caracteres: number;
      /** Quantos documentos não renderam texto, por motivo. */
      recusas: Record<string, number>;
    };

/**
 * Processa um edital.
 *
 * Nunca lança: falha vira valor de retorno, como no resto do projeto. Um edital
 * cujo download quebrou não pode derrubar a fila dos outros — é a mesma lição
 * que a coleta por UF já aprendeu quando o PNCP saiu do ar no meio do piloto.
 */
export async function processarEdital(
  edital: EditalParaProcessar,
  portas: Portas,
  agora = new Date(),
): Promise<ResultadoDoEdital> {
  let documentos: DocumentoAnunciado[];
  try {
    documentos = await portas.listar(edital);
  } catch (e) {
    /*
     * Lista indisponível é diferente de "sem documento", e o vocabulário
     * precisa separar os dois: o primeiro é para tentar de novo amanhã, o
     * segundo é um fato sobre o edital. Achatá-los faria a fila desistir de um
     * edital que só teve azar de rede.
     */
    return {
      editalId: edital.id,
      processado: false,
      motivo: "lista-indisponivel",
      detalhe: e instanceof Error ? e.message.slice(0, 120) : undefined,
    };
  }

  const decisao = decidir({
    documentos,
    registro: await portas.registro(edital),
    interessaAAlguem: await portas.interessaAAlguem(edital),
    encerramentoProposta: edital.encerramentoProposta,
    agora,
  });

  if (!decisao.baixar) {
    return { editalId: edital.id, processado: false, motivo: decisao.motivo };
  }

  const ativos = documentos.filter((d) => d.ativo);
  const processados: DocumentoProcessado[] = [];
  const recusas: Record<string, number> = {};

  for (const anunciado of ativos) {
    let extracao: Extracao;
    try {
      const bytes = await portas.baixar(edital, anunciado);
      extracao = await extrair(bytes, anunciado.titulo);
    } catch (e) {
      extracao = {
        ok: false,
        motivo: "ilegivel",
        origem: anunciado.titulo,
        detalhe: e instanceof Error ? e.message.slice(0, 120) : undefined,
      };
    }

    if (!extracao.ok) recusas[extracao.motivo] = (recusas[extracao.motivo] ?? 0) + 1;
    processados.push({ sequencial: anunciado.sequencial, titulo: anunciado.titulo, extracao });
  }

  const boas = processados.filter((p) => p.extracao.ok);

  const resultado: ResultadoDoEdital = {
    editalId: edital.id,
    processado: true,
    documentos: processados,
    /*
     * A assinatura gravada é a da lista que ACABAMOS de processar. Gravar a
     * lista pedida antes do download faria uma rodada que falhou no meio
     * parecer completa na próxima — e o edital ficaria com metade dos anexos
     * para sempre, sem nada indicando isso.
     */
    assinatura: assinarDocumentos(ativos),
    paginas: boas.reduce((s, p) => s + (p.extracao.ok ? p.extracao.paginas : 0), 0),
    caracteres: boas.reduce((s, p) => s + (p.extracao.ok ? p.extracao.texto.length : 0), 0),
    recusas,
  };

  await portas.gravar?.(edital, resultado);
  return resultado;
}

export type Resumo = {
  editais: number;
  processados: number;
  /** Por que os demais não foram processados — o diagnóstico da economia. */
  pulados: Record<string, number>;
  paginas: number;
  caracteres: number;
  recusas: Record<string, number>;
};

/**
 * Processa uma fila de editais, em sequência.
 *
 * Sequencial de propósito, pelo mesmo motivo do cliente do PNCP: paralelizar
 * contra um serviço público que já responde 429 no limite atual é o caminho
 * mais curto para o bloqueio. A economia aqui não vem de concorrência, vem de
 * não baixar o que já temos.
 */
export async function processarFila(
  editais: readonly EditalParaProcessar[],
  portas: Portas,
  aoProgredir?: (feito: number, total: number, ultimo: ResultadoDoEdital) => void,
  agora = new Date(),
): Promise<Resumo> {
  const resumo: Resumo = {
    editais: editais.length,
    processados: 0,
    pulados: {},
    paginas: 0,
    caracteres: 0,
    recusas: {},
  };

  for (const [i, edital] of editais.entries()) {
    const r = await processarEdital(edital, portas, agora);

    if (r.processado) {
      resumo.processados++;
      resumo.paginas += r.paginas;
      resumo.caracteres += r.caracteres;
      for (const [motivo, n] of Object.entries(r.recusas)) {
        resumo.recusas[motivo] = (resumo.recusas[motivo] ?? 0) + n;
      }
    } else {
      resumo.pulados[r.motivo] = (resumo.pulados[r.motivo] ?? 0) + 1;
    }

    aoProgredir?.(i + 1, editais.length, r);
  }

  return resumo;
}
