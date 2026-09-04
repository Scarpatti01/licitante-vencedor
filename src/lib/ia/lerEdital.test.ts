import { describe, expect, it, vi } from "vitest";
import { edital } from "../fontes/fixtures";

/**
 * A leitura precisa dizer DE QUEM foi a falha, e não só que falhou.
 *
 * O DEFEITO QUE MOTIVOU ESTE ARQUIVO
 *
 * Em 03/09 a leva do dia saiu com cinco páginas de edital e zero leitura, e a
 * execução ficou verde. O log dizia a verdade cinco vezes:
 *
 *     sem documento (lista-indisponivel) · São Sebastião
 *     sem documento (lista-indisponivel) · Icapuí
 *     ... mais três, dez segundos um do outro
 *     com leitura: 0 de 5 · 5 sem documento legível · 0 recusado(s) pelo modelo
 *
 * `lista-indisponivel` é o PNCP não respondendo ao pedido da lista de
 * documentos. Não é fato sobre o edital, é a nossa infraestrutura ou a fonte.
 * `extrairTextoDoEdital` imprimia o motivo real e devolvia `sem_documento`
 * para todos, e `falhaSistemicaDeLeitura` não conta `sem_documento` como
 * tentativa. Zero tentativas, nenhuma falha sistêmica, leva gravada.
 *
 * POR QUE O TESTE VIVE AQUI, E NÃO SÓ EM `falhaSistemica.test.ts`
 *
 * A guarda de falha sistêmica já sabia acusar; o que faltava era alguém
 * entregar a ela o motivo certo. Um teste que só alimentasse a guarda com
 * `fonteIndisponivel: 5` passaria para sempre mesmo se NADA no sistema
 * produzisse esse motivo — a guarda vazia que este repositório já pagou para
 * aprender três vezes. Por isso a asserção aqui é sobre a tradução, com o
 * `processarEdital` de verdade rodando e só a fonte trocada.
 *
 * `processar.test.ts` já provava que a camada de baixo separa os dois casos.
 * O que ninguém provava é que a separação sobrevivia à camada de cima.
 */

const EDITAL = edital();

/** Um anexo qualquer, para o caminho em que a lista responde. */
const ANEXO = {
  url: "https://pncp.gov.br/pncp-api/v1/orgaos/11097292000149/compras/2026/1/arquivos/1",
  titulo: "Edital.pdf",
  sequencial: 1,
  publicadoEm: "2026-08-01T09:00:00-03:00",
  ativo: true,
};

describe("extrairTextoDoEdital diz de quem foi a falha", () => {
  it("a fonte muda vira `fonte_indisponivel`, e não `sem_documento`", async () => {
    vi.doMock("../documentos/pncp.ts", () => ({
      listarDocumentos: async () => {
        throw new Error("PNCP respondeu 503");
      },
      baixarDocumento: async () => {
        throw new Error("não deveria baixar");
      },
    }));
    vi.resetModules();
    const { extrairTextoDoEdital: extrair } = await import("./lerEdital.ts");

    const r = await extrair(EDITAL);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(
      r.motivo,
      "a lista indisponível voltou a ser tratada como edital sem anexo, e a " +
        "guarda de falha sistêmica deixa de contar a tentativa",
    ).toBe("fonte_indisponivel");
  });

  it("o edital sem anexo continua sendo `sem_documento`", async () => {
    // O outro lado da distinção. Sem este caso, mandar tudo para
    // `fonte_indisponivel` passaria no teste acima e produziria alarme falso
    // todo dia, que foi o estrago de 24/08.
    vi.doMock("../documentos/pncp.ts", () => ({
      listarDocumentos: async () => [],
      baixarDocumento: async () => {
        throw new Error("não deveria baixar");
      },
    }));
    vi.resetModules();
    const { extrairTextoDoEdital: extrair } = await import("./lerEdital.ts");

    const r = await extrair(EDITAL);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe("sem_documento");
  });

  it("o anexo ilegível também é `sem_documento`: é fato sobre o edital", async () => {
    vi.doMock("../documentos/pncp.ts", () => ({
      listarDocumentos: async () => [ANEXO],
      baixarDocumento: async () => ({
        nome: "Edital.pdf",
        tipo: "application/pdf",
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      }),
    }));
    vi.resetModules();
    const { extrairTextoDoEdital: extrair } = await import("./lerEdital.ts");

    const r = await extrair(EDITAL);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe("sem_documento");
  });
});
