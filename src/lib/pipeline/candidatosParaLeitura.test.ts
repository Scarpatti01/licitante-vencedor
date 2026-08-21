import { describe, expect, it } from "vitest";
import { edital as editalFixture } from "../fontes/fixtures.ts";
import { PERFIL_COMPLETO } from "../dominio/exemplos.ts";
import type { PerfilDaEmpresa } from "../dominio/tipos.ts";
import type { EditalAbertoParaLeitura } from "./candidatosParaLeitura.ts";
import { candidatosParaLeitura, CORTE_DE_LEITURA, LEITURAS_POR_EMPRESA_POR_DIA } from "./candidatosParaLeitura.ts";

const AGORA = new Date("2026-08-21T09:00:00-03:00");

// PERFIL_COMPLETO casa bem com "limpeza predial e conservação" (palavrasChave),
// atende PE/AL/PB e tem ticket 50k–2M — o mesmo objeto usado nos fixtures de
// score.ts e supabase-oportunidades.test.ts.
function editalCompativel(id: string, over: Partial<Parameters<typeof editalFixture>[0]> = {}): EditalAbertoParaLeitura {
  return {
    uuid: `uuid-${id}`,
    edital: editalFixture({
      id,
      objeto: "Contratação de empresa para limpeza predial e conservação",
      local: { uf: "PE", municipio: "Recife", municipioSlug: "recife", codigoIbge: "2611606" },
      valorEstimado: 400_000,
      encerramentoProposta: "2026-09-20T14:00:00-03:00",
      ...over,
    }),
  };
}

function editalIncompativel(id: string): EditalAbertoParaLeitura {
  return {
    uuid: `uuid-${id}`,
    edital: editalFixture({
      id,
      objeto: "Aquisição de equipamentos de informática",
      local: { uf: "SP", municipio: "São Paulo", municipioSlug: "sao-paulo", codigoIbge: "3550308" },
      encerramentoProposta: "2026-09-20T14:00:00-03:00",
    }),
  };
}

function perfil(empresaId: string, over: Partial<PerfilDaEmpresa> = {}): PerfilDaEmpresa {
  return { ...PERFIL_COMPLETO, empresaId, ...over };
}

describe("candidatosParaLeitura", () => {
  it("só entra quem tem score ≥ 70 sem leitura", () => {
    const editais = [editalCompativel("bom"), editalIncompativel("ruim")];
    const candidatos = candidatosParaLeitura(editais, [perfil("e1")], AGORA);

    expect(candidatos.has("uuid-bom")).toBe(true);
    expect(candidatos.has("uuid-ruim")).toBe(false);
  });

  it("duas empresas com o mesmo edital no topo compartilham a mesma leitura", () => {
    const editais = [editalCompativel("compartilhado")];
    const candidatos = candidatosParaLeitura(editais, [perfil("e1"), perfil("e2")], AGORA);

    expect(candidatos.size).toBe(1);
    const candidato = candidatos.get("uuid-compartilhado")!;
    expect(candidato.empresas.map((p) => p.empresaId).sort()).toEqual(["e1", "e2"]);
  });

  it("edital fora do perfil de uma empresa não entra por causa dela", () => {
    // Fora da região de "e2": UF diferente das que a empresa atende.
    const foraDaRegiao = editalCompativel("regional", {
      local: { uf: "RJ", municipio: "Rio de Janeiro", municipioSlug: "rio-de-janeiro", codigoIbge: "3304557" },
    });
    const candidatos = candidatosParaLeitura(
      [foraDaRegiao],
      [perfil("pe", { ufsAtendidas: ["RJ"] }), perfil("outra", { ufsAtendidas: ["PE"] })],
      AGORA,
    );

    const candidato = candidatos.get("uuid-regional")!;
    expect(candidato.empresas.map((p) => p.empresaId)).toEqual(["pe"]);
  });

  it(`corta em ${LEITURAS_POR_EMPRESA_POR_DIA} por empresa, priorizando o maior score`, () => {
    // Dois grupos com scores diferentes: o objeto que casa com as 3
    // palavras-chave pontua mais que o que casa só com 1 (`score.ts:146`,
    // retorno decrescente). Com LEITURAS_POR_EMPRESA_POR_DIA=25, os 3 editais
    // de score mais baixo devem ficar de fora.
    const altoScore = Array.from({ length: LEITURAS_POR_EMPRESA_POR_DIA }, (_, i) =>
      editalCompativel(`alto-${i}`, { objeto: "limpeza predial conservação material de limpeza" }),
    );
    const baixoScore = Array.from({ length: 3 }, (_, i) => editalCompativel(`baixo-${i}`, { objeto: "limpeza" }));

    const candidatos = candidatosParaLeitura([...altoScore, ...baixoScore], [perfil("e1")], AGORA);

    expect(candidatos.size).toBe(LEITURAS_POR_EMPRESA_POR_DIA);
    for (const e of altoScore) expect(candidatos.has(`uuid-${e.edital.id}`)).toBe(true);
    for (const e of baixoScore) expect(candidatos.has(`uuid-${e.edital.id}`)).toBe(false);
  });

  it("edital sem base para pontuar não entra (score nulo não é ≥ corte)", () => {
    // Perfil sem palavras-chave: `criterioObjeto` fica indeterminado, e outros
    // critérios também — cobertura pode cair abaixo do mínimo e o score sai
    // `null`. `(d.score ?? 0) >= CORTE_DE_LEITURA` nunca deveria admitir isso.
    const semPerfil = perfil("vazio", { palavrasChave: [], ufsAtendidas: [], ticketMinimo: null, ticketMaximo: null });
    const candidatos = candidatosParaLeitura([editalCompativel("x")], [semPerfil], AGORA);

    expect(candidatos.size).toBe(0);
  });

  it("o corte é exatamente o piso da faixa boa, não um número solto", () => {
    expect(CORTE_DE_LEITURA).toBe(70);
  });
});
