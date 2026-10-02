import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { edital } from "../fontes/fixtures";
import { agregarPorMunicipio, type MunicipioAgregado } from "../pncp/agregarPorMunicipio";
import { municipiosCarregados, semUfsAusentes } from "../pncp/carregarUfAusente";
import { selecionarParaLead } from "../alertas/lead";
import { interpretarRegiao } from "../alertas/regiao";
import { conteudoDeAlertaDiario } from "../alertas/mensagem-do-lead";
import { comLocalDeExecucao } from "./local-de-execucao";

/**
 * As pontas que agrupam e filtram por `local`, depois de 02/10/2026.
 *
 * O resumo, a nota e o painel passaram a usar o lugar da execução em 01/10.
 * Faltavam o alerta dos leads e as páginas de município, que continuavam
 * contando a limpeza da NAV Brasil em Alta Floresta/MT como edital do Rio.
 */

const RIO = { uf: "RJ", municipio: "Rio de Janeiro", municipioSlug: "rio-de-janeiro", codigoIbge: "3304557" };
const NAV = edital({
  id: "nav-alta-floresta",
  objeto: "Limpeza na Dependência da NAV Brasil – DNAT (Alta Floresta/MT).",
  orgao: { cnpj: "42736102000110", nome: "NAV BRASIL", esfera: "federal" },
  local: RIO,
});
const DO_RIO = edital({ id: "rio", objeto: "Limpeza do prédio sede", local: RIO });

describe("a troca de local", () => {
  it("leva o edital para o município da execução, com o slug da página dele", () => {
    expect(comLocalDeExecucao(NAV).local).toEqual({
      uf: "MT",
      municipio: "Alta Floresta",
      municipioSlug: "alta-floresta",
      codigoIbge: "5100250",
    });
  });

  it("sem lugar no objeto, devolve o mesmo edital", () => {
    expect(comLocalDeExecucao(DO_RIO)).toBe(DO_RIO);
  });
});

describe("páginas de município", () => {
  it("o edital conta na cidade onde o serviço acontece", () => {
    const porChave = new Map(agregarPorMunicipio([NAV, DO_RIO]).map((m) => [`${m.uf}/${m.slug}`, m]));
    expect(porChave.get("MT/alta-floresta")?.editais).toBe(1);
    expect(porChave.get("RJ/rio-de-janeiro")?.editais).toBe(1);
    // O comprador continua sendo a NAV: é ela que aparece na página de Alta Floresta.
    expect(porChave.get("MT/alta-floresta")?.compradores["42736102000110"]?.nome).toBe("NAV BRASIL");
  });

  it("nenhum edital some nem duplica na troca", () => {
    const total = agregarPorMunicipio([NAV, DO_RIO]).reduce((s, m) => s + m.editais, 0);
    expect(total).toBe(2);
  });

  /**
   * O risco que a troca criou. São Paulo é medida pela coleta de SP; com a
   * troca, também recebe editais de órgãos de outras UFs. No dia em que SP
   * falhar, esses dois ou três apareceriam como "medição de hoje" e
   * impediriam a medição anterior, que tem centenas, de ser carregada.
   */
  it("UF não coletada não vira página com fragmento", () => {
    const anterior = {
      coletadoEm: "2026-09-29T08:00:00Z",
      municipios: [
        { uf: "MT", municipio: "Alta Floresta", slug: "alta-floresta", ibge: "5100250", editais: 40, valor: 0, orgaos: 9, modalidades: {}, compradores: {} },
      ] as MunicipioAgregado[],
    };
    const deHoje = semUfsAusentes(agregarPorMunicipio([NAV, DO_RIO]), ["MT"]);
    expect(deHoje.map((m) => m.uf)).toEqual(["RJ"]);

    const carregados = municipiosCarregados({
      municipiosDeHoje: deHoje,
      anterior,
      ufsAusentes: ["MT"],
      agora: new Date("2026-09-30T08:00:00Z"),
    });
    expect(carregados).toHaveLength(1);
    expect(carregados[0].editais).toBe(40);
  });

  it("sem UF ausente, a medição de hoje passa inteira", () => {
    const deHoje = agregarPorMunicipio([NAV, DO_RIO]);
    expect(semUfsAusentes(deHoje, [])).toBe(deHoje);
  });
});

describe("alerta dos leads", () => {
  const agora = new Date("2026-08-14T12:00:00-03:00");
  const comPrazo = (e: typeof NAV) => ({ ...e, encerramentoProposta: "2026-08-30T13:00:00Z" });

  it("quem pediu Alta Floresta recebe o serviço de lá, comprado no Rio", () => {
    const altaFloresta = interpretarRegiao("Alta Floresta/MT")!;
    const selecao = selecionarParaLead([comPrazo(NAV)], altaFloresta, new Set(), undefined, agora);
    expect(selecao.vazio).toBe(false);
  });

  it("quem pediu o Rio deixa de receber o serviço de Mato Grosso", () => {
    const rio = interpretarRegiao("Rio de Janeiro/RJ")!;
    const selecao = selecionarParaLead([comPrazo(NAV)], rio, new Set(), undefined, agora);
    expect(selecao.vazio).toBe(true);
  });

  it("o e-mail mostra onde é, e de onde é o órgão", () => {
    const altaFloresta = interpretarRegiao("Alta Floresta/MT")!;
    const selecao = selecionarParaLead([comPrazo(NAV)], altaFloresta, new Set(), undefined, agora);
    const conteudo = conteudoDeAlertaDiario({
      email: "lead@exemplo.com.br",
      tokenDeDescadastro: "t".repeat(30),
      regiao: "Alta Floresta/MT",
      selecao,
    });
    expect(JSON.stringify(conteudo)).toContain("Alta Floresta/MT (órgão: Rio de Janeiro/RJ)");
  });
});

/**
 * Cada ponta que agrupa, filtra ou mostra `local` passa pela regra.
 *
 * Os scripts de publicação não têm teste próprio que os execute: sem esta
 * guarda, alguém escreve uma ponta nova a partir de `edital.local` e o
 * defeito volta numa só página, sem quebrar nada.
 */
describe("guarda: as pontas usam o local da execução", () => {
  const semComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const PONTAS: [string, RegExp][] = [
    ["src/lib/pncp/agregarPorMunicipio.ts", /comLocalDeExecucao\(/],
    ["scripts/publicar-abertos.ts", /comLocalDeExecucao\(/],
    ["scripts/publicar-posts.ts", /comLocalDeExecucao\b/],
    ["scripts/juntar-coleta.ts", /semUfsAusentes\(/],
    ["src/lib/alertas/lead.ts", /comLocalDeExecucao\(/],
    ["src/lib/alertas/mensagem.ts", /localDeExecucao\(/],
    ["src/lib/alertas/mensagem-do-lead.ts", /localDeExecucao\(/],
    ["src/lib/resumo/plano.ts", /localDeExecucao\(/],
    ["src/lib/dominio/score.ts", /localDeExecucao\(/],
    ["src/lib/dominio/recorte.ts", /localDeExecucao\(/],
    ["src/components/oportunidades/estilo.ts", /localDeExecucao\(/],
  ];
  it.each(PONTAS)("%s", (arquivo, padrao) => {
    expect(semComentarios(readFileSync(join(arquivo), "utf8"))).toMatch(padrao);
  });
});
