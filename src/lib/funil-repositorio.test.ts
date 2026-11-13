import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { listar } = vi.hoisted(() => ({ listar: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { admin: { listUsers: listar } } }) }));
import { consultarFunil } from "./funil-repositorio";

describe("leitura do funil administrativo", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://banco.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "credencial-sintetica-de-teste");
    listar.mockReset();
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("sem configuração não afirma que a base está vazia", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await consultarFunil(30)).toBeNull();
    expect(listar).not.toHaveBeenCalled();
  });
  it("falha de consulta não vira zero conversões", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    await expect(consultarFunil(30)).rejects.toThrow("HTTP 503");
  });
  it("a base vazia dispensa leitura de contas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
    expect((await consultarFunil(30))?.cadastros).toBe(0);
    expect(listar).not.toHaveBeenCalled();
  });
  it("só devolve totais e não grava eventos ou altera permissões", async () => {
    listar.mockResolvedValue({ error: null, data: { users: [{ id: "u1", email: "pessoa@example.com", created_at: "2026-11-01T12:02:00Z", email_confirmed_at: "2026-11-01T12:03:00Z" }] } });
    const dados: Record<string, unknown[]> = {
      leads: [{ email: "pessoa@example.com", recebido_em: "2026-11-01T12:00:00Z", confirmado_em: "2026-11-01T12:01:00Z" }],
      empresas: [{ id: "e1", criado_por: "u1", criado_em: "2026-11-02T12:00:00Z" }],
      assinaturas: [{ titular_id: "u1", status: "teste", referencia_externa: null }],
      perfis_da_empresa: [{ empresa_id: "e1", palavras_chave: ["limpeza"] }], recortes_da_empresa: [],
      acoes_na_oportunidade: [{ empresa_id: "e1", feita_por: "u1" }],
    };
    const fetcher = vi.fn(async (input: string) => Response.json(dados[new URL(input).pathname.split("/").pop()!]));
    vi.stubGlobal("fetch", fetcher);
    const resumo = await consultarFunil(30);
    expect(resumo?.interacoes).toBe(1);
    expect(resumo?.assinaturas_ativas).toBe(0);
    expect(JSON.stringify(resumo)).not.toContain("pessoa@example.com");
    expect(JSON.stringify(resumo)).not.toContain("u1");
    expect(fetcher.mock.calls.every(([url]) => !url.includes("/rpc/"))).toBe(true);
  });
  it("recusa uma leitura incompleta em vez de publicar uma taxa parcial", async () => {
    const lote = Array.from({ length: 200 }, () => ({ email: "pessoa@example.com", recebido_em: "2026-11-01T12:00:00Z", confirmado_em: null }));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(lote)));
    await expect(consultarFunil(30)).rejects.toThrow("Limite de leitura");
  });
});
