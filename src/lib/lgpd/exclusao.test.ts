import { afterEach, describe, expect, it, vi } from "vitest";
import {
  abrirClienteLgpd,
  executarExclusaoLgpd,
  purgarDocumentosDeEmpresasCanceladas,
  type ClienteLgpd,
  type ResumoDeDocumentos,
} from "./exclusao";

const URL_BASE = "https://exemplo.test";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function configurarAmbiente() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_BASE);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "chave-de-servico");
}

describe("abrirClienteLgpd", () => {
  it("devolve null sem as duas variáveis de ambiente", () => {
    expect(abrirClienteLgpd()).toBeNull();
  });

  it("apagarDocumentosEAtestados apaga arquivo, atestado e documento, nessa ordem", async () => {
    configurarAmbiente();
    const chamadas: { url: string; method: string | undefined; body: string | undefined }[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        chamadas.push({ url, method: init?.method, body: init?.body as string | undefined });

        if (url.includes("/rest/v1/documentos_da_empresa") && init?.method === undefined) {
          return new Response(
            JSON.stringify([
              { id: "doc-1", caminho_no_storage: "empresa-1/certidao.pdf" },
              { id: "doc-2", caminho_no_storage: null },
            ]),
            { status: 200 },
          );
        }
        if (url.includes("/storage/v1/object/documentos-da-empresa")) {
          return new Response(JSON.stringify([{ name: "empresa-1/certidao.pdf" }]), { status: 200 });
        }
        if (url.includes("/rest/v1/atestados")) {
          return new Response(JSON.stringify([{ id: "at-1" }]), { status: 200 });
        }
        if (url.includes("/rest/v1/documentos_da_empresa") && init?.method === "DELETE") {
          return new Response(JSON.stringify([{ id: "doc-1" }, { id: "doc-2" }]), { status: 200 });
        }
        throw new Error(`chamada inesperada: ${url}`);
      }),
    );

    const cliente = abrirClienteLgpd()!;
    const resumo = await cliente.apagarDocumentosEAtestados("empresa-1");

    expect(resumo).toEqual({ documentos: 2, arquivos: 1, atestados: 1 });

    // Arquivo antes de atestado, atestado antes de documento — se a ordem
    // inverter, um documento apagado antes do arquivo correspondente deixa
    // o arquivo órfão no bucket sem nenhuma linha apontando pra ele.
    const ordem = chamadas.map((c) => c.url);
    const iArquivo = ordem.findIndex((u) => u.includes("/storage/v1/"));
    const iAtestado = ordem.findIndex((u) => u.includes("/rest/v1/atestados"));
    const iDocumento = ordem.findLastIndex((u) => u.includes("/rest/v1/documentos_da_empresa"));
    expect(iArquivo).toBeLessThan(iAtestado);
    expect(iAtestado).toBeLessThan(iDocumento);

    // Documento sem arquivo (`caminho_no_storage: null`) não entra no pedido
    // de exclusão do Storage — só o caminho real é mandado.
    const pedidoDeStorage = JSON.parse(chamadas.find((c) => c.url.includes("/storage/v1/"))!.body!);
    expect(pedidoDeStorage).toEqual({ prefixes: ["empresa-1/certidao.pdf"] });
  });

  it("não chama o Storage quando nenhum documento tem arquivo anexado", async () => {
    configurarAmbiente();
    const chamadasDeStorage: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("/storage/v1/")) chamadasDeStorage.push(url);
        if (url.includes("/rest/v1/documentos_da_empresa") && init?.method === undefined) {
          return new Response(JSON.stringify([{ id: "doc-1", caminho_no_storage: null }]), { status: 200 });
        }
        return new Response(JSON.stringify([]), { status: 200 });
      }),
    );

    const cliente = abrirClienteLgpd()!;
    await cliente.apagarDocumentosEAtestados("empresa-2");

    expect(chamadasDeStorage).toHaveLength(0);
  });

  it("apagarHistoricoDeTriagem e apagarPerfil filtram por empresa_id", async () => {
    configurarAmbiente();
    const chamadas: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        chamadas.push(url);
        if (url.includes("decisoes_de_triagem")) {
          return new Response(JSON.stringify([{ id: "d1" }, { id: "d2" }, { id: "d3" }]), { status: 200 });
        }
        return new Response(JSON.stringify([{ empresa_id: "empresa-3" }]), { status: 200 });
      }),
    );

    const cliente = abrirClienteLgpd()!;
    const apagadas = await cliente.apagarHistoricoDeTriagem("empresa-3");
    const tinhaPerfil = await cliente.apagarPerfil("empresa-3");

    expect(apagadas).toBe(3);
    expect(tinhaPerfil).toBe(true);
    expect(chamadas.some((u) => u.includes("empresa_id=eq.empresa-3"))).toBe(true);
  });

  it("apagarPerfil devolve false quando não havia perfil", async () => {
    configurarAmbiente();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })));

    const cliente = abrirClienteLgpd()!;
    expect(await cliente.apagarPerfil("empresa-sem-perfil")).toBe(false);
  });

  it("lança com o corpo da resposta quando o supabase recusa", async () => {
    configurarAmbiente();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"message":"permission denied"}', { status: 403 })),
    );

    const cliente = abrirClienteLgpd()!;
    await expect(cliente.apagarHistoricoDeTriagem("empresa-1")).rejects.toThrow(/403.*permission denied/);
  });

  it("empresasComPrazoDeGracaVencido fica só com a assinatura mais recente de cada empresa", async () => {
    configurarAmbiente();
    // Ordenado como o PostgREST devolveria: empresa_id asc, criado_em desc —
    // a empresa-1 tem duas assinaturas no histórico, e só a mais nova conta.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            { empresa_id: "empresa-1", encerrada_em: null, criado_em: "2026-08-01T00:00:00Z" },
            { empresa_id: "empresa-1", encerrada_em: "2026-01-01T00:00:00Z", criado_em: "2025-12-01T00:00:00Z" },
            { empresa_id: "empresa-2", encerrada_em: "2026-01-01T00:00:00Z", criado_em: "2026-01-01T00:00:00Z" },
          ]),
          { status: 200 },
        ),
      ),
    );

    const cliente = abrirClienteLgpd()!;
    const vencidas = await cliente.empresasComPrazoDeGracaVencido(new Date("2026-08-20T00:00:00Z"));

    // empresa-1: a assinatura mais recente não tem `encerrada_em` (renovou) —
    // não deveria ser purgada mesmo tendo uma assinatura antiga já encerrada.
    expect(vencidas).not.toContain("empresa-1");
    // empresa-2: encerrou em janeiro, mais de 30 dias antes de agora.
    expect(vencidas).toContain("empresa-2");
  });
});

describe("executarExclusaoLgpd", () => {
  function clienteFalso(sobrescreve: Partial<ClienteLgpd> = {}): ClienteLgpd {
    const resumo: ResumoDeDocumentos = { documentos: 1, arquivos: 1, atestados: 1 };
    return {
      apagarDocumentosEAtestados: vi.fn().mockResolvedValue(resumo),
      apagarHistoricoDeTriagem: vi.fn().mockResolvedValue(5),
      apagarPerfil: vi.fn().mockResolvedValue(true),
      empresasComPrazoDeGracaVencido: vi.fn().mockResolvedValue([]),
      ...sobrescreve,
    };
  }

  it("apaga documento, histórico de triagem e perfil, e resume tudo numa resposta", async () => {
    const cliente = clienteFalso();
    const resultado = await executarExclusaoLgpd(cliente, "empresa-1");

    expect(resultado).toEqual({
      documentos: 1,
      arquivos: 1,
      atestados: 1,
      decisoesDeTriagem: 5,
      perfilApagado: true,
    });
    expect(cliente.apagarDocumentosEAtestados).toHaveBeenCalledWith("empresa-1");
    expect(cliente.apagarHistoricoDeTriagem).toHaveBeenCalledWith("empresa-1");
    expect(cliente.apagarPerfil).toHaveBeenCalledWith("empresa-1");
  });
});

describe("purgarDocumentosDeEmpresasCanceladas", () => {
  it("apaga documento e atestado só das empresas com prazo vencido, e nunca toca em triagem", async () => {
    const agora = new Date("2026-08-20T00:00:00Z");
    const apagarDocumentosEAtestados = vi
      .fn()
      .mockResolvedValue({ documentos: 2, arquivos: 1, atestados: 0 } satisfies ResumoDeDocumentos);
    const apagarHistoricoDeTriagem = vi.fn();

    const cliente: ClienteLgpd = {
      apagarDocumentosEAtestados,
      apagarHistoricoDeTriagem,
      apagarPerfil: vi.fn(),
      empresasComPrazoDeGracaVencido: vi.fn().mockResolvedValue(["empresa-1", "empresa-2"]),
    };

    const resultado = await purgarDocumentosDeEmpresasCanceladas(cliente, agora);

    expect(resultado).toEqual([
      { empresaId: "empresa-1", resumo: { documentos: 2, arquivos: 1, atestados: 0 } },
      { empresaId: "empresa-2", resumo: { documentos: 2, arquivos: 1, atestados: 0 } },
    ]);
    expect(apagarDocumentosEAtestados).toHaveBeenCalledTimes(2);
    expect(apagarHistoricoDeTriagem).not.toHaveBeenCalled();
  });

  it("não apaga nada quando nenhuma empresa está com o prazo vencido", async () => {
    const apagarDocumentosEAtestados = vi.fn();
    const cliente: ClienteLgpd = {
      apagarDocumentosEAtestados,
      apagarHistoricoDeTriagem: vi.fn(),
      apagarPerfil: vi.fn(),
      empresasComPrazoDeGracaVencido: vi.fn().mockResolvedValue([]),
    };

    const resultado = await purgarDocumentosDeEmpresasCanceladas(cliente, new Date());

    expect(resultado).toEqual([]);
    expect(apagarDocumentosEAtestados).not.toHaveBeenCalled();
  });
});
