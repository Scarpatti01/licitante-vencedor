import { describe, expect, it } from "vitest";
import { datarAlteracoes } from "./alteracao";
import { comAlteradoEm } from "../pncp/alteradoEm";
import type { MunicipioAgregado } from "../pncp/agregarPorMunicipio";

const ONTEM = "2026-11-21T13:44:27.387Z";
const HOJE = "2026-11-22T13:38:05.629Z";

function municipio(extra: Partial<MunicipioAgregado> = {}): MunicipioAgregado {
  return {
    uf: "PE",
    municipio: "Recife",
    slug: "recife",
    ibge: "2611606",
    editais: 34,
    valor: 235847326,
    orgaos: 12,
    modalidades: { "Pregão - Eletrônico": 11, "Dispensa": 3 },
    compradores: { "1": { nome: "Prefeitura", editais: 20 }, "2": { nome: "Estado", editais: 14 } },
    ...extra,
  };
}

describe("a data de alteração de um município", () => {
  /*
   * O caso que motivou o arquivo: a coleta de hoje mediu de novo e achou os
   * mesmos números. A página não mudou, e o sitemap não pode dizer que mudou.
   */
  it("mantém a data anterior quando os números são os mesmos", () => {
    const anterior = { coletadoEm: ONTEM, municipios: [municipio({ alteradoEm: "2026-11-02T12:00:00.000Z" })] };
    const [m] = comAlteradoEm([municipio()], anterior, HOJE);
    expect(m.alteradoEm).toBe("2026-11-02T12:00:00.000Z");
  });

  it("passa a ser a data da coleta quando um número muda", () => {
    const anterior = { coletadoEm: ONTEM, municipios: [municipio({ alteradoEm: "2026-11-02T12:00:00.000Z" })] };
    const [m] = comAlteradoEm([municipio({ editais: 35 })], anterior, HOJE);
    expect(m.alteradoEm).toBe(HOJE);
  });

  it("conta mudança nos compradores, e não só nos totais", () => {
    const anterior = { coletadoEm: ONTEM, municipios: [municipio({ alteradoEm: ONTEM })] };
    const outro = { "1": { nome: "Prefeitura", editais: 19 }, "2": { nome: "Estado", editais: 15 } };
    const [m] = comAlteradoEm([municipio({ compradores: outro })], anterior, HOJE);
    expect(m.alteradoEm).toBe(HOJE);
  });

  /*
   * As chaves de `modalidades` e `compradores` saem na ordem em que os editais
   * chegaram. A mesma página com os mesmos números, montada em outra ordem,
   * não pode parecer mudada.
   */
  it("não confunde ordem das chaves com mudança", () => {
    const anterior = { coletadoEm: ONTEM, municipios: [municipio({ alteradoEm: ONTEM })] };
    const reordenado = municipio({ modalidades: { "Dispensa": 3, "Pregão - Eletrônico": 11 } });
    const [m] = comAlteradoEm([reordenado], anterior, HOJE);
    expect(m.alteradoEm).toBe(ONTEM);
  });

  it("um município novo nasce com a data da coleta", () => {
    const [m] = comAlteradoEm([municipio()], { coletadoEm: ONTEM, municipios: [] }, HOJE);
    expect(m.alteradoEm).toBe(HOJE);
  });

  it("sem agregado anterior, tudo nasce com a data da coleta", () => {
    const [m] = comAlteradoEm([municipio()], null, HOJE);
    expect(m.alteradoEm).toBe(HOJE);
  });

  /*
   * A primeira coleta depois desta mudança compara com um agregado sem
   * `alteradoEm`. O que não mudou fica com a data da medição anterior, e não
   * com a de hoje: senão o primeiro dia repetiria o defeito para todo mundo.
   */
  it("na primeira vez, o que não mudou fica com a data da medição anterior", () => {
    const anterior = { coletadoEm: ONTEM, municipios: [municipio()] };
    const [m] = comAlteradoEm([municipio()], anterior, HOJE);
    expect(m.alteradoEm).toBe(ONTEM);
  });

  /*
   * Município de UF não coletada é carregado com a medição antiga
   * (`carregarUfAusente.ts`). Ninguém o mediu de novo, então ele não mudou.
   */
  it("município carregado de UF ausente mantém a data anterior", () => {
    const antigo = municipio({ medidoEm: "2026-11-10T12:00:00.000Z", alteradoEm: "2026-11-08T12:00:00.000Z" });
    const [m] = comAlteradoEm([antigo], { coletadoEm: ONTEM, municipios: [antigo] }, HOJE);
    expect(m.alteradoEm).toBe("2026-11-08T12:00:00.000Z");
  });

  it("casa município pela UF e pelo slug, e não confunde homônimos de UF diferente", () => {
    const anterior = {
      coletadoEm: ONTEM,
      municipios: [municipio({ uf: "PB", alteradoEm: "2026-11-02T12:00:00.000Z" })],
    };
    const [m] = comAlteradoEm([municipio({ uf: "PE" })], anterior, HOJE);
    expect(m.alteradoEm).toBe(HOJE);
  });
});

describe("a data de alteração das contagens de abertos", () => {
  type Contagem = {
    uf: string;
    slug: string;
    abertos: number;
    novos: number;
    encerramEm24h: number;
    alteradoEm?: string;
  };
  const conteudo = (m: Contagem) => [m.abertos, m.novos, m.encerramEm24h];

  it("só muda quando um dos três números muda", () => {
    const anteriores: Contagem[] = [
      { uf: "AC", slug: "acrelandia", abertos: 1, novos: 0, encerramEm24h: 1, alteradoEm: ONTEM },
    ];
    const igual = datarAlteracoes({
      atuais: [{ uf: "AC", slug: "acrelandia", abertos: 1, novos: 0, encerramEm24h: 1 } as Contagem],
      anteriores,
      conteudo,
      desde: () => ONTEM,
      mudouEm: () => HOJE,
    });
    const mudou = datarAlteracoes({
      atuais: [{ uf: "AC", slug: "acrelandia", abertos: 2, novos: 1, encerramEm24h: 1 } as Contagem],
      anteriores,
      conteudo,
      desde: () => ONTEM,
      mudouEm: () => HOJE,
    });
    expect(igual[0].alteradoEm).toBe(ONTEM);
    expect(mudou[0].alteradoEm).toBe(HOJE);
  });
});
