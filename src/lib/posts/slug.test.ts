import { describe, expect, it } from "vitest";
import { semCarimboDoPortal, slugDoPost, sufixoDoIdentificador } from "./slug";

/*
 * Os casos abaixo saíram da coleta real que está no Postgres — objetos e
 * identificadores de editais que existem. Slug é endereço público: uma vez
 * publicado, mudá-lo quebra link e perde o que a página tinha ganhado em busca.
 * Por isso as regras estão presas em teste, e não só descritas.
 */

describe("sufixoDoIdentificador", () => {
  it("extrai número e ano do numeroControlePNCP", () => {
    expect(sufixoDoIdentificador("09444530000101-1-000082/2026")).toBe("82-2026");
  });

  it("tira os zeros à esquerda do sequencial", () => {
    // `000082` vira `82`: a URL fica legível e o ano mantém a identificação.
    expect(sufixoDoIdentificador("07954480000179-1-020875/2026")).toBe("20875-2026");
  });

  it("não devolve vazio para formato inesperado", () => {
    // Slug vazio produziria duas páginas na mesma URL. Melhor feio que colidido.
    expect(sufixoDoIdentificador("formato-estranho")).not.toBe("");
  });
});

describe("slugDoPost", () => {
  it("monta modalidade, objeto e identificador", () => {
    expect(
      slugDoPost({
        modalidade: "Pregão - Eletrônico",
        objeto:
          "Registro de Preço para: Aquisição de merenda escolar destinada a atender a rede municipal",
        idNaFonte: "10404184000109-1-090012/2026",
      }),
    ).toBe("pregao-eletronico-merenda-escolar-rede-municipal-90012-2026");
  });

  /**
   * As palavras vazias fazem diferença real.
   *
   * Quase todo objeto de edital abre com "contratação de empresa especializada
   * para o fornecimento de…". Sem tirá-las, metade das URLs começaria igual e a
   * palavra que a pessoa busca ficaria fora do corte.
   */
  it("descarta o preâmbulo burocrático e mantém o que se busca", () => {
    const slug = slugDoPost({
      modalidade: "Pregão - Eletrônico",
      objeto:
        "CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA O FORNECIMENTO PARCELADO DE MATERIAL DE EXPEDIENTE",
      idNaFonte: "111-1-000005/2026",
    });

    expect(slug).toContain("material-expediente");
    expect(slug).not.toContain("contratacao");
    expect(slug).not.toContain("especializada");
  });

  it("tira acento e caixa", () => {
    const slug = slugDoPost({
      modalidade: "Dispensa",
      objeto: "AQUISIÇÃO DE GÊNEROS ALIMENTÍCIOS PARA MERENDA ESCOLAR 2026",
      idNaFonte: "222-1-000010/2026",
    });
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain("generos-alimenticios");
  });

  it("não corta palavra no meio", () => {
    // URL com palavra quebrada parece defeito, e ela é lida: aparece no
    // resultado de busca e no link compartilhado.
    const slug = slugDoPost({
      modalidade: "Pregão - Eletrônico",
      objeto: "Aquisição de equipamentos de informática e periféricos diversos para as secretarias",
      idNaFonte: "333-1-000011/2026",
    });
    for (const parte of slug.split("-")) {
      expect(parte.length === 0 || parte.length > 1 || /^\d$/.test(parte)).toBe(true);
    }
    expect(slug).not.toContain("informa-");
  });

  /**
   * O caso que obriga o sufixo a existir.
   *
   * Dois municípios publicam "aquisição de gêneros alimentícios" no mesmo dia
   * com frequência. Sem identificador no fim, o segundo post sobrescreveria o
   * primeiro — e a página perdida seria descoberta só quando alguém reclamasse.
   */
  it("dois editais de objeto idêntico não colidem", () => {
    const base = {
      modalidade: "Pregão - Eletrônico",
      objeto: "Aquisição de gêneros alimentícios para a rede municipal de ensino",
    };
    const a = slugDoPost({ ...base, idNaFonte: "111-1-000090/2026" });
    const b = slugDoPost({ ...base, idNaFonte: "222-1-000091/2026" });

    expect(a).not.toBe(b);
  });

  it("objeto só de palavras vazias ainda produz endereço utilizável", () => {
    const slug = slugDoPost({
      modalidade: "Dispensa",
      objeto: "Contratação de empresa para prestação de serviços",
      idNaFonte: "444-1-000012/2026",
    });
    expect(slug).toContain("dispensa");
    expect(slug).toContain("12-2026");
  });
});

describe("semCarimboDoPortal", () => {
  /*
   * Medido: 40 dos 220 candidatos (18%) trazem este prefixo. Ele é o nome da
   * plataforma publicadora, não o objeto — e na URL empurra para fora do corte
   * justamente as palavras que a pessoa busca.
   */
  it("tira o prefixo do portal, mantendo o objeto", () => {
    expect(
      semCarimboDoPortal("[Portal de Compras Públicas] - AQUISIÇÃO DE VEÍCULOS PARA AS UNIDADES DE SAÚDE"),
    ).toBe("AQUISIÇÃO DE VEÍCULOS PARA AS UNIDADES DE SAÚDE");
  });

  it("não mexe em objeto que não tem carimbo", () => {
    const limpo = "Aquisição de gêneros alimentícios para a merenda escolar";
    expect(semCarimboDoPortal(limpo)).toBe(limpo);
  });

  /*
   * Um colchete que É o objeto inteiro não pode virar string vazia — isso
   * produziria um slug só com modalidade e número, e duas páginas quase
   * idênticas na listagem.
   */
  it("nunca devolve vazio", () => {
    expect(semCarimboDoPortal("[tudo entre colchetes]")).not.toBe("");
  });

  it("o slug não carrega o nome da plataforma", () => {
    const slug = slugDoPost({
      modalidade: "Pregão - Eletrônico",
      objeto: "[Portal de Compras Públicas] - AQUISIÇÃO DE VEÍCULOS PARA AS UNIDADES DE SAÚDE",
      idNaFonte: "08889297000108-1-000034/2026",
    });
    expect(slug).not.toContain("portal");
    expect(slug).toContain("veiculos-unidades-saude");
    expect(slug).toBe("pregao-eletronico-veiculos-unidades-saude-34-2026");
  });
});
