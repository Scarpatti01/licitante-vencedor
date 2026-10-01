import { describe, expect, it } from "vitest";
import ibge from "../../../dados/municipios-ibge.json" with { type: "json" };
import { localDeExecucao, localEmTexto, lugaresNoObjeto } from "./local-de-execucao";
import { calcularScore } from "./score";
import { abrangenciaAceita } from "./recorte";
import { analiseNaoRealizada } from "./recomendacao";
import { EDITAL_COMPATIVEL, PERFIL_COMPLETO } from "./exemplos";
import type { Edital } from "../fontes/tipos";

/**
 * Os casos abaixo são trechos REAIS de objetos publicados no PNCP, tirados da
 * amostra de 30 dias que motivou a regra (01/10/2026). Os de ruído são tão
 * importantes quanto os de acerto: são eles que mostram por que o padrão
 * sozinho não basta e a conferência com o IBGE é obrigatória.
 */

const RIO = { uf: "RJ", municipio: "Rio de Janeiro", codigoIbge: "3304557" };
const local = (objeto: string, unidade = RIO) => localDeExecucao({ objeto, local: unidade });

describe("o lugar escrito no objeto", () => {
  it("o caso que abriu a investigação: NAV Brasil, comprada no Rio, executada em Mato Grosso", () => {
    const l = local(
      "Contratação de empresa especializada na prestação de serviços contínuos de conservação, higiene e limpeza, com dedicação exclusiva de mão de obra e com fornecimento de material, a serem prestados nas áreas internas e externas na Dependência da NAV Brasil – DNAT (Alta Floresta/MT).",
    );
    expect(l).toMatchObject({ uf: "MT", municipio: "Alta Floresta", codigoIbge: "5100250", origem: "objeto" });
  });

  it.each([
    ["serviço continuado localizada no município de Caetité/BA", "Caetité", "BA"],
    ["no polo base de Aripuanã\n/MT", "Aripuanã", "MT"],
    ["a ser realizado em Bento Gonçalves - RS", "Bento Gonçalves", "RS"],
    ["serviços em São Paulo (SP)", "São Paulo", "SP"],
  ])("lê \"%s\"", (objeto, municipio, uf) => {
    expect(local(objeto)).toMatchObject({ municipio, uf, origem: "objeto" });
  });

  it.each([
    "EM CONFORMIDADE COM A PORTARIA GM/MS",
    "REFERE-SE A CONTRATAÇÃO DE EMPRESA",
    "PREGÃO CORREIOS 26000350 SE/BA - Prestação de serviços",
    "treinamento dos membros da Brigada de Incêndio da Dataprev/PB",
    "FUNASA/AC",
    "Ministério da Saúde/ MS",
    "Meias Elásticas Anti Trombo - PE",
    // Itaóca é localidade do Espírito Santo; o MUNICÍPIO Itaoca fica em SP.
    "serviços em Itaóca – ES",
  ])("não confunde ruído com lugar: \"%s\"", (objeto) => {
    expect(local(objeto).origem).toBe("unidade");
  });
});

describe("na dúvida, fica o local da unidade compradora", () => {
  it("dois lugares diferentes: não escolhe um", () => {
    expect(local("unidades de Brasília/DF e de Goiânia/GO").origem).toBe("unidade");
  });

  it("o objeto cita também a cidade de quem compra", () => {
    expect(local("unidades do Rio de Janeiro/RJ e de Alta Floresta/MT").origem).toBe("unidade");
  });

  it("mesmo nome da cidade compradora em outra UF é erro de digitação", () => {
    // 30/09/2026: o Município de Planalto/RS publicou "Município de Planalto/PR".
    const planalto = { uf: "RS", municipio: "Planalto", codigoIbge: "4314704" };
    expect(local("Saúde e Educação do Município de Planalto/PR", planalto).origem).toBe("unidade");
  });

  it("adesão a ata (carona) cita a cidade da ata, e não a do serviço", () => {
    // Coleta de 30/09/2026, Município de Valparaíso de Goiás/GO.
    const valparaiso = { uf: "GO", municipio: "Valparaíso de Goiás", codigoIbge: "5221858" };
    const objeto =
      "EM DECORRÊNCIA PREGÃO ELETRONICO/SRP Nº 024/2025-SCL/SEMAD/PMS, DA PREFEITURA MUNICIPAL DE SANTANA/AP, NA CONDIÇÃO DE “CARONA”";
    expect(local(objeto, valparaiso).origem).toBe("unidade");
    expect(local("ADESÃO À ATA de registro de preços do Município de Caetité/BA").origem).toBe("unidade");
  });

  it("o destino de uma viagem não é o lugar do serviço", () => {
    // Coleta de 30/09/2026, Câmara Municipal mineira comprando passagens.
    expect(local("18 (dezoito) passagens aéreas de ida e volta, com destino à Brasília/DF, destinadas a").origem).toBe(
      "unidade",
    );
  });

  it("objeto sem lugar escrito", () => {
    expect(local("Contratação de limpeza no prédio sede")).toMatchObject({ ...RIO, origem: "unidade" });
  });
});

describe("como o lugar aparece", () => {
  it("com a cidade do órgão quando são diferentes", () => {
    expect(localEmTexto(local("na Dependência da NAV Brasil (Alta Floresta/MT)"), RIO)).toBe(
      "Alta Floresta/MT (órgão: Rio de Janeiro/RJ)",
    );
    expect(localEmTexto(local("limpeza do prédio sede"), RIO)).toBe("Rio de Janeiro/RJ");
  });
});

describe("o lugar decide a nota e o recorte", () => {
  const navBrasil: Edital = {
    ...EDITAL_COMPATIVEL,
    objeto: `${EDITAL_COMPATIVEL.objeto} Serviço na Dependência da NAV Brasil (Alta Floresta/MT).`,
    local: { ...RIO, municipioSlug: "rio-de-janeiro" },
  };

  it("quem atende só o Rio não recebe o serviço de Mato Grosso", () => {
    const perfil = { ...PERFIL_COMPLETO, ufsAtendidas: ["RJ"] };
    const { score } = calcularScore(navBrasil, analiseNaoRealizada(navBrasil.id, "texto não lido"), perfil, new Date("2026-08-14T12:00:00-03:00"));
    const regiao = score.criterios.find((c) => c.chave === "regiao")!;
    expect(regiao.status).toBe("impedimento");
    expect(regiao.frase).toContain("Alta Floresta/MT");
  });

  it("quem atende Mato Grosso passa a recebê-lo, com a evidência citada", () => {
    const perfil = { ...PERFIL_COMPLETO, ufsAtendidas: ["MT"] };
    const { score } = calcularScore(navBrasil, analiseNaoRealizada(navBrasil.id, "texto não lido"), perfil, new Date("2026-08-14T12:00:00-03:00"));
    const regiao = score.criterios.find((c) => c.chave === "regiao")!;
    expect(regiao.status).toBe("positivo");
    expect(JSON.stringify(regiao.procedencia)).toContain("Alta Floresta/MT");
    expect(JSON.stringify(regiao.procedencia)).toContain("Rio de Janeiro/RJ");
  });

  it("o recorte por UF e por município olha o lugar da execução", () => {
    expect(abrangenciaAceita({ tipo: "uf", uf: "MT" }, navBrasil)).toBe(true);
    expect(abrangenciaAceita({ tipo: "uf", uf: "RJ" }, navBrasil)).toBe(false);
    expect(abrangenciaAceita({ tipo: "municipio", uf: "MT", codigoIbge: "5100250", nome: "Alta Floresta" }, navBrasil)).toBe(true);
  });
});

describe("a lista do IBGE", () => {
  it("está completa e bem formada", () => {
    // 5.570 municípios mais Brasília, contada à parte pelo IBGE.
    expect(ibge.municipios.length).toBeGreaterThanOrEqual(5570);
    for (const [codigo, nome, uf] of ibge.municipios as [string, string, string][]) {
      expect(codigo).toMatch(/^\d{7}$/);
      expect(nome.length).toBeGreaterThan(1);
      expect(uf).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("acha nomes compostos, com apóstrofo e com hífen", () => {
    expect(lugaresNoObjeto("em Alta Floresta D'Oeste/RO")[0]?.municipio.nome).toBe("Alta Floresta D'Oeste");
    expect(lugaresNoObjeto("em Embu-Guaçu/SP")[0]?.municipio.nome).toBe("Embu-Guaçu");
  });
});
