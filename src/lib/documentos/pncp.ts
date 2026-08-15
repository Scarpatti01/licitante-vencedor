/**
 * O PNCP como fonte de DOCUMENTO — a outra metade da fonte de edital.
 *
 * `fontes/pncp.ts` traz a publicação (objeto, valor, prazo); este arquivo traz
 * os arquivos anexos. São endpoints diferentes e falham de formas diferentes,
 * então valem módulos diferentes: um dia ruim para o download de anexo não deve
 * parecer um dia ruim para a coleta.
 *
 * Fino de propósito. Toda a decisão está em `incremental.ts` e `extrair.ts`, que
 * são puros; aqui só mora o que precisa de rede.
 */

import type { DocumentoAnunciado } from "./incremental.ts";
import type { EditalParaProcessar } from "./processar.ts";

const BASE = "https://pncp.gov.br/api/pncp/v1";

/** Pausa entre requisições, pelo mesmo motivo do cliente de coleta. */
export const PAUSA_MS = 400;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Quebra `30391653000100-1-000014/2026` em CNPJ, ano e sequencial.
 *
 * O identificador do PNCP embute os três, e a API de arquivos os pede
 * separados. `Number()` no sequencial derruba os zeros à esquerda: a API
 * responde 404 para `/000014` e 200 para `/14` — descoberto sondando, não lendo
 * documentação.
 */
export function partesDoId(idNaFonte: string): { cnpj: string; ano: string; sequencial: number } | null {
  const [prefixo, ano] = idNaFonte.split("/");
  if (!prefixo || !ano) return null;

  const partes = prefixo.split("-");
  if (partes.length < 3) return null;

  const sequencial = Number(partes[2]);
  if (!/^\d{14}$/.test(partes[0]) || !/^\d{4}$/.test(ano) || !Number.isFinite(sequencial)) return null;

  return { cnpj: partes[0], ano, sequencial };
}

async function pegar(url: string, comoJson: boolean): Promise<Response> {
  const resposta = await fetch(url, {
    headers: {
      accept: comoJson ? "application/json" : "*/*",
      "user-agent": "licitantevencedor.com.br",
    },
    signal: AbortSignal.timeout(90_000),
  });

  if (!resposta.ok) throw new Error(`PNCP respondeu ${resposta.status}`);
  return resposta;
}

/**
 * Os documentos que o PNCP anuncia para um edital.
 *
 * Normaliza na entrada, como o resto do projeto faz com dado de fora: linha sem
 * sequencial não é endereçável para download, então não vira documento
 * anunciado — melhor descartar aqui que falhar no meio da fila.
 */
export async function listarDocumentos(edital: EditalParaProcessar): Promise<DocumentoAnunciado[]> {
  const partes = partesDoId(edital.idNaFonte);
  if (!partes) throw new Error(`identificador fora do formato esperado: ${edital.idNaFonte}`);

  const { cnpj, ano, sequencial } = partes;
  const resposta = await pegar(`${BASE}/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`, true);
  const linhas = (await resposta.json()) as unknown;
  if (!Array.isArray(linhas)) return [];

  return linhas.flatMap((linha) => {
    const l = linha as Record<string, unknown>;
    if (typeof l.sequencialDocumento !== "number") return [];

    return [
      {
        sequencial: l.sequencialDocumento,
        titulo: typeof l.titulo === "string" && l.titulo ? l.titulo : `documento-${l.sequencialDocumento}`,
        publicadoEm: typeof l.dataPublicacaoPncp === "string" ? l.dataPublicacaoPncp : null,
        // Só `false` explícito desativa: campo ausente é documento válido, e
        // tratar ausência como inativo esconderia anexo.
        ativo: l.statusAtivo !== false,
      } satisfies DocumentoAnunciado,
    ];
  });
}

/** Baixa um documento pelo endereço que o próprio PNCP publica. */
export async function baixarDocumento(
  edital: EditalParaProcessar,
  documento: DocumentoAnunciado,
): Promise<Uint8Array> {
  const partes = partesDoId(edital.idNaFonte);
  if (!partes) throw new Error(`identificador fora do formato esperado: ${edital.idNaFonte}`);

  const { cnpj, ano, sequencial } = partes;
  await dormir(PAUSA_MS);

  const resposta = await pegar(
    `${BASE}/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos/${documento.sequencial}`,
    false,
  );

  return new Uint8Array(await resposta.arrayBuffer());
}
