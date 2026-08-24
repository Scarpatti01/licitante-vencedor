import "server-only";

import { ehTerminal, estadoDoLote, type EstadoDoLote } from "./lote.ts";

/**
 * O transporte do lote: criar o job, consultar, esperar.
 *
 * ## Por que aqui é REST, e não o SDK
 *
 * `gemini.ts` é, por regra do projeto, "o único arquivo que fala Gemini", e ele
 * fala pelo SDK `@google/genai`. Este arquivo abre uma segunda porta, e a razão
 * é concreta: o corpo do lote e o formato da resposta (`dest.inlinedResponses`)
 * já estão escritos e testados em `lote.ts` na forma REST, que é a que a
 * documentação descreve e a que a conferência de POSIÇÃO protege. Passar pelo
 * SDK obrigaria a jogar fora esse módulo e a confiar numa tradução que eu não
 * consigo testar sem gastar um lote inteiro.
 *
 * A escolha tem um custo honesto: se o formato REST estiver errado, descobrimos
 * na primeira execução real. Descobrimos ALTO, porém — um 400 na criação do
 * lote, antes de qualquer gravação. Nada de errado chega ao cliente; perde-se
 * uma noite de leitura, e a leitura avulsa continua de pé.
 *
 * ## A chave
 *
 * Vai no cabeçalho `x-goog-api-key`, nunca na URL. URL entra em log de proxy, em
 * mensagem de erro e no histórico do runner; cabeçalho, não. Nenhuma função
 * daqui devolve a chave em mensagem de erro.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Injetável para o teste não tocar a rede. */
export type Buscar = typeof fetch;

export type CriacaoDoLote =
  | { ok: true; nome: string }
  | { ok: false; motivo: string };

function recorte(texto: string, limite = 600): string {
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

export async function criarLote(opcoes: {
  modelo: string;
  corpo: Record<string, unknown>;
  chave: string;
  buscar?: Buscar;
}): Promise<CriacaoDoLote> {
  const buscar = opcoes.buscar ?? fetch;

  let resposta: Response;
  try {
    resposta = await buscar(`${BASE}/models/${opcoes.modelo}:batchGenerateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": opcoes.chave },
      body: JSON.stringify(opcoes.corpo),
    });
  } catch (e) {
    return { ok: false, motivo: `a criação do lote não chegou ao fornecedor: ${(e as Error).message}` };
  }

  const texto = await resposta.text();
  if (!resposta.ok) {
    return { ok: false, motivo: `o fornecedor recusou a criação do lote (HTTP ${resposta.status}): ${recorte(texto)}` };
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: `a criação do lote respondeu algo que não é JSON: ${recorte(texto, 200)}` };
  }

  /*
   * O `name` é a única coisa que liga esta execução ao resultado. Sem ele o
   * lote pode até rodar e cobrar, e nós não temos como buscar a resposta — daí
   * ser erro, e não aviso.
   */
  const nome = (corpo as Record<string, unknown>)?.name;
  if (typeof nome !== "string" || nome.length === 0) {
    return { ok: false, motivo: "o lote foi criado sem `name`, e sem ele não há como buscar o resultado" };
  }

  return { ok: true, nome };
}

export type ConsultaDoLote =
  | { ok: true; estado: EstadoDoLote; corpo: unknown }
  | { ok: false; motivo: string };

export async function consultarLote(opcoes: {
  nome: string;
  chave: string;
  buscar?: Buscar;
}): Promise<ConsultaDoLote> {
  const buscar = opcoes.buscar ?? fetch;

  let resposta: Response;
  try {
    resposta = await buscar(`${BASE}/${opcoes.nome}`, {
      headers: { "x-goog-api-key": opcoes.chave },
    });
  } catch (e) {
    return { ok: false, motivo: `a consulta ao lote não chegou ao fornecedor: ${(e as Error).message}` };
  }

  const texto = await resposta.text();
  if (!resposta.ok) {
    return { ok: false, motivo: `a consulta ao lote falhou (HTTP ${resposta.status}): ${recorte(texto)}` };
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: `a consulta ao lote respondeu algo que não é JSON: ${recorte(texto, 200)}` };
  }

  const raiz = (corpo ?? {}) as Record<string, unknown>;
  const metadados = (raiz.metadata ?? {}) as Record<string, unknown>;
  return { ok: true, estado: estadoDoLote(raiz.state ?? metadados.state), corpo };
}

export type EsperaDoLote =
  | { ok: true; estado: EstadoDoLote; corpo: unknown; consultas: number }
  | { ok: false; motivo: string; consultas: number };

/**
 * Consulta até o lote terminar, desistir da espera, ou o tempo acabar.
 *
 * O limite de tempo é de quem chama, e é por isso que `desconhecido` não é
 * terminal em `lote.ts`: estado novo da API não pode virar leitura perdida.
 *
 * Falha de rede numa consulta NÃO derruba a espera. O lote já está rodando e
 * já vai ser cobrado; desistir por causa de um timeout de rede jogaria fora o
 * que já foi pago. Só o fim do prazo desiste.
 */
export async function esperarLote(opcoes: {
  nome: string;
  chave: string;
  buscar?: Buscar;
  /** Quanto esperar entre consultas. */
  intervaloMs?: number;
  /** Prazo total. Passado ele, desistimos da ESPERA — o lote segue existindo. */
  prazoMs?: number;
  esperar?: (ms: number) => Promise<void>;
  agora?: () => number;
  aoConsultar?: (estado: EstadoDoLote, consultas: number) => void;
}): Promise<EsperaDoLote> {
  const intervaloMs = opcoes.intervaloMs ?? 60_000;
  const prazoMs = opcoes.prazoMs ?? 3 * 60 * 60 * 1000;
  const esperar = opcoes.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const agora = opcoes.agora ?? (() => Date.now());

  const comeco = agora();
  let consultas = 0;
  let ultimoMotivo = "o lote não terminou dentro do prazo";

  while (agora() - comeco < prazoMs) {
    const consulta = await consultarLote({ nome: opcoes.nome, chave: opcoes.chave, buscar: opcoes.buscar });
    consultas += 1;

    if (consulta.ok) {
      opcoes.aoConsultar?.(consulta.estado, consultas);
      if (ehTerminal(consulta.estado)) {
        return { ok: true, estado: consulta.estado, corpo: consulta.corpo, consultas };
      }
    } else {
      // Guardado para virar o motivo final se o prazo acabar antes de qualquer
      // consulta dar certo. Uma falha isolada não interrompe a espera.
      ultimoMotivo = consulta.motivo;
    }

    await esperar(intervaloMs);
  }

  return { ok: false, motivo: ultimoMotivo, consultas };
}
