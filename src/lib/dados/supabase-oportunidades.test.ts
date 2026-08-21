import { describe, expect, it } from "vitest";
import { EMPRESA_DE_DEMONSTRACAO } from "./demonstracao";
import { RepositorioSupabase } from "./supabase";
import { PERFIL_COMPLETO } from "../dominio/exemplos";
import { analiseNaoRealizada, avaliarOportunidade } from "../dominio/recomendacao";
import { oportunidadeParaLinha } from "../triagem/mapeamento";
import { paraLinha as editalParaLinha } from "../editais/gravar";
import { edital as editalFixture } from "../fontes/fixtures";
import type { Edital } from "../fontes/tipos";
import type { SituacaoDaOportunidade } from "../dominio/tipos";

/**
 * Os cinco métodos que, até 18/08, delegavam inteiro para a demonstração.
 *
 * As linhas de teste não são digitadas à mão: saem de `oportunidadeParaLinha` e
 * `editais/gravar.ts:paraLinha` alimentados com uma `Avaliacao` real — os
 * mesmos mapeadores que a implementação usa para GRAVAR. Um teste com JSON
 * inventado passaria mesmo se a leitura e a escrita divergissem sobre o nome
 * de uma coluna; este não passa, porque os dois lados usam a mesma fonte.
 */

const EMPRESA_REAL = "e0728737-d84e-4980-b575-60f24e2ea7f8";
const AGORA = new Date("2026-08-18T09:00:00-03:00");

const EDITAL_URGENTE = editalFixture({
  id: "PE-2026-000001",
  objeto: "Contratação de empresa para limpeza predial e conservação",
  encerramentoProposta: "2026-08-20T14:00:00-03:00",
});
const EDITAL_CALMO = editalFixture({
  id: "PE-2026-000002",
  objeto: "Contratação de empresa para limpeza predial e conservação",
  encerramentoProposta: "2026-09-30T14:00:00-03:00",
});

function linhaDoEdital(edital: Edital, uuid: string) {
  return { ...editalParaLinha(edital), id: uuid };
}

function linhaDaOportunidade(
  edital: Edital,
  uuid: string,
  situacao: SituacaoDaOportunidade = "nova",
) {
  const avaliacao = avaliarOportunidade(
    edital,
    analiseNaoRealizada(edital.id, "não lido"),
    PERFIL_COMPLETO,
    AGORA,
  );
  const linha = oportunidadeParaLinha({
    empresaId: EMPRESA_REAL,
    editalId: uuid,
    edital,
    avaliacao,
    avaliadoEm: AGORA.toISOString(),
  });
  return { ...linha, situacao, editais: linhaDoEdital(edital, uuid) };
}

type Registro = Record<string, unknown>;

/**
 * Um cliente Supabase de mentira que entende os encadeamentos que
 * `supabase.ts` de fato usa: `select().eq().neq()/in().range()` (lista),
 * `select().eq().eq().maybeSingle()` (um registro), e `insert()`.
 *
 * Não filtra de verdade — devolve o que a tabela tem, e registra os filtros
 * pedidos em `chamadas` para os testes que precisam conferir QUE filtro foi
 * pedido (ex.: `registrarAcao` resolvendo o id certo).
 */
function clienteFalso(tabelas: Record<string, Registro[]>, opcoes: { usuarioId?: string } = {}) {
  const chamadas: { tabela: string; filtros: Registro }[] = [];
  const inseridos: { tabela: string; linha: Registro }[] = [];

  function construir(tabela: string) {
    const filtros: Registro = {};
    const linhas = () => tabelas[tabela] ?? [];

    const builder = {
      select: () => builder,
      eq: (coluna: string, valor: unknown) => {
        filtros[coluna] = valor;
        return builder;
      },
      neq: (coluna: string, valor: unknown) => {
        filtros[`${coluna}!=`] = valor;
        return builder;
      },
      in: (coluna: string, valores: unknown[]) => {
        filtros[`${coluna}$in`] = valores;
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      insert: async (linha: Registro) => {
        inseridos.push({ tabela, linha });
        return { data: null, error: null };
      },
      maybeSingle: async () => {
        chamadas.push({ tabela, filtros });
        return { data: linhas()[0] ?? null, error: null };
      },
      then(resolve: (v: { data: Registro[]; error: null }) => void) {
        chamadas.push({ tabela, filtros });
        resolve({ data: linhas(), error: null });
        return Promise.resolve();
      },
    };
    return builder;
  }

  const cliente = {
    from: (tabela: string) => construir(tabela),
    auth: {
      getUser: async () => ({ data: { user: opcoes.usuarioId ? { id: opcoes.usuarioId } : null } }),
    },
  };

  return { cliente: cliente as never, chamadas, inseridos };
}

describe("oportunidadesSimuladas", () => {
  it("é falso para empresa real, verdadeiro para a de demonstração", () => {
    const { cliente } = clienteFalso({});
    const repo = new RepositorioSupabase(cliente);
    expect(repo.oportunidadesSimuladas(EMPRESA_REAL)).toBe(false);
    expect(repo.oportunidadesSimuladas(EMPRESA_DE_DEMONSTRACAO)).toBe(true);
  });
});

describe("painelDoDia", () => {
  it("conta novas, recomendadas, excelentes, urgentes e documentos pendentes", async () => {
    const { cliente } = clienteFalso({
      oportunidades: [linhaDaOportunidade(EDITAL_URGENTE, "u1", "nova")],
      execucoes_de_coleta: [{ classe: "completa", coletado_em: "2026-08-18T06:00:00.000Z" }],
    });

    const painel = await new RepositorioSupabase(cliente).painelDoDia(EMPRESA_REAL, AGORA);

    // EDITAL_URGENTE casa com as palavras-chave de PERFIL_COMPLETO e encerra em
    // 2 dias a partir de AGORA: score 90 (excelente), recomendada_forte,
    // urgente, checklist sem pendência — medido diretamente com
    // `avaliarOportunidade` antes de escrever este teste.
    expect(painel.novas).toBe(1);
    expect(painel.recomendadas).toBe(1);
    expect(painel.excelentes).toBe(1);
    expect(painel.urgentes).toBe(1);
    expect(painel.documentosPendentes).toBe(0);
    expect(painel.coletadoEm).toBe("2026-08-18T06:00:00.000Z");
    expect(painel.coletaCompleta).toBe(true);
  });

  it("coletaCompleta é falso quando a última execução veio degradada", async () => {
    const { cliente } = clienteFalso({
      oportunidades: [],
      execucoes_de_coleta: [{ classe: "degradada", coletado_em: "2026-08-18T06:00:00.000Z" }],
    });
    const painel = await new RepositorioSupabase(cliente).painelDoDia(EMPRESA_REAL, AGORA);
    expect(painel.coletaCompleta).toBe(false);
  });

  it("coletaCompleta é verdadeiro para parcial-aceitavel — mesma regra que o workflow usa para commitar", async () => {
    const { cliente } = clienteFalso({
      oportunidades: [],
      execucoes_de_coleta: [{ classe: "parcial-aceitavel", coletado_em: "2026-08-18T06:00:00.000Z" }],
    });
    const painel = await new RepositorioSupabase(cliente).painelDoDia(EMPRESA_REAL, AGORA);
    expect(painel.coletaCompleta).toBe(true);
  });

  it("sem nenhuma execução registrada, trata como completa e coletadoEm como null", async () => {
    const { cliente } = clienteFalso({ oportunidades: [], execucoes_de_coleta: [] });
    const painel = await new RepositorioSupabase(cliente).painelDoDia(EMPRESA_REAL, AGORA);
    expect(painel.coletaCompleta).toBe(true);
    expect(painel.coletadoEm).toBeNull();
  });

  it("delega para a demonstração quando a empresa é a de exemplo", async () => {
    const { cliente, chamadas } = clienteFalso({});
    await new RepositorioSupabase(cliente).painelDoDia(EMPRESA_DE_DEMONSTRACAO, AGORA);
    expect(chamadas).toHaveLength(0);
  });
});

describe("listarOportunidades", () => {
  it("aplica scoreMinimo, ordena urgente primeiro e corta pelo limite", async () => {
    const { cliente } = clienteFalso({
      oportunidades: [
        linhaDaOportunidade(EDITAL_CALMO, "u2"),
        linhaDaOportunidade(EDITAL_URGENTE, "u1"),
      ],
    });

    const lista = await new RepositorioSupabase(cliente).listarOportunidades(
      EMPRESA_REAL,
      { limite: 1 },
      AGORA,
    );

    expect(lista).toHaveLength(1);
    // O edital que encerra antes (EDITAL_URGENTE) deve vir primeiro quando os
    // dois têm recomendação boa — é o desempate por urgência do domínio.
    expect(lista[0].edital.id).toBe(EDITAL_URGENTE.id);
  });

  it("scoreMinimo nunca inclui oportunidade sem score", async () => {
    const semBase = linhaDaOportunidade(EDITAL_CALMO, "u3");
    // Força um score nulo mantendo o resto da linha coerente com o `check`
    // `(score is null) = (faixa = 'indeterminada')`.
    const linha = { ...semBase, score: null, faixa: "indeterminada" as const };
    const { cliente } = clienteFalso({ oportunidades: [linha] });

    const lista = await new RepositorioSupabase(cliente).listarOportunidades(
      EMPRESA_REAL,
      { scoreMinimo: 0 },
      AGORA,
    );
    expect(lista).toHaveLength(0);
  });

  it("delega para a demonstração quando a empresa é a de exemplo", async () => {
    const { cliente, chamadas } = clienteFalso({});
    await new RepositorioSupabase(cliente).listarOportunidades(EMPRESA_DE_DEMONSTRACAO);
    expect(chamadas).toHaveLength(0);
  });
});

describe("oportunidade", () => {
  it("encontra pelo id canônico do edital e reconstrói a avaliação", async () => {
    const { cliente } = clienteFalso({ oportunidades: [linhaDaOportunidade(EDITAL_URGENTE, "u1")] });
    const encontrada = await new RepositorioSupabase(cliente).oportunidade(EMPRESA_REAL, EDITAL_URGENTE.id);

    expect(encontrada).not.toBeNull();
    expect(encontrada?.id).toBe(EDITAL_URGENTE.id);
    expect(encontrada?.avaliacao.recomendacao.proximaAcao).toBeTruthy();
  });

  it("devolve null quando não há linha", async () => {
    const { cliente } = clienteFalso({ oportunidades: [] });
    expect(await new RepositorioSupabase(cliente).oportunidade(EMPRESA_REAL, "PE-2026-999999")).toBeNull();
  });
});

describe("registrarAcao", () => {
  it("resolve o id canônico do edital para o uuid de oportunidades antes de gravar", async () => {
    const { cliente, inseridos } = clienteFalso({
      oportunidades: [{ id: "oport-uuid-1", editais: { id_canonico: EDITAL_URGENTE.id } }],
    });

    await new RepositorioSupabase(cliente).registrarAcao(EMPRESA_REAL, EDITAL_URGENTE.id, "salva");

    expect(inseridos).toHaveLength(1);
    expect(inseridos[0].tabela).toBe("acoes_na_oportunidade");
    expect(inseridos[0].linha).toMatchObject({
      oportunidade_id: "oport-uuid-1",
      empresa_id: EMPRESA_REAL,
      situacao: "salva",
    });
  });

  it("grava quem agiu quando há sessão", async () => {
    const { cliente, inseridos } = clienteFalso(
      { oportunidades: [{ id: "oport-uuid-1", editais: { id_canonico: EDITAL_URGENTE.id } }] },
      { usuarioId: "usuario-1" },
    );

    await new RepositorioSupabase(cliente).registrarAcao(EMPRESA_REAL, EDITAL_URGENTE.id, "descartada");
    expect(inseridos[0].linha.feita_por).toBe("usuario-1");
  });

  it("lança quando a oportunidade não existe, em vez de gravar ação órfã", async () => {
    const { cliente } = clienteFalso({ oportunidades: [] });
    await expect(
      new RepositorioSupabase(cliente).registrarAcao(EMPRESA_REAL, "PE-2026-999999", "salva"),
    ).rejects.toThrow();
  });
});

describe("explicarTriagem", () => {
  it("edital entregue: explicação vem de decisoes_de_triagem, avaliação de oportunidades", async () => {
    const linhaOp = linhaDaOportunidade(EDITAL_URGENTE, "u1");
    const { cliente } = clienteFalso({
      oportunidades: [linhaOp],
      decisoes_de_triagem: [
        {
          recomendado: true,
          motivo: linhaOp.justificativa,
          regra_de_exclusao: null,
          avaliado_em: AGORA.toISOString(),
          editais: { id_canonico: EDITAL_URGENTE.id },
        },
      ],
    });

    const resposta = await new RepositorioSupabase(cliente).explicarTriagem(EMPRESA_REAL, EDITAL_URGENTE.id);
    expect(resposta.encontrado).toBe(true);
    expect(resposta.avaliacao).not.toBeNull();
    expect(resposta.explicacao).toMatch(/entregue/);
  });

  it("edital descartado: sem oportunidade, avaliação é null e a explicação cita o motivo", async () => {
    const { cliente } = clienteFalso({
      oportunidades: [],
      decisoes_de_triagem: [
        {
          recomendado: false,
          motivo: "A execução é fora do estado atendido.",
          regra_de_exclusao: "impedimento",
          avaliado_em: AGORA.toISOString(),
          editais: { id_canonico: EDITAL_CALMO.id },
        },
      ],
    });

    const resposta = await new RepositorioSupabase(cliente).explicarTriagem(EMPRESA_REAL, EDITAL_CALMO.id);
    expect(resposta.encontrado).toBe(true);
    expect(resposta.avaliacao).toBeNull();
    expect(resposta.explicacao).toContain("impedimento");
  });

  it("nem oportunidade nem decisão: não encontrado", async () => {
    const { cliente } = clienteFalso({ oportunidades: [], decisoes_de_triagem: [] });
    const resposta = await new RepositorioSupabase(cliente).explicarTriagem(EMPRESA_REAL, "PE-2026-999999");
    expect(resposta.encontrado).toBe(false);
    expect(resposta.avaliacao).toBeNull();
  });

  it("oportunidade sem decisão correspondente (gravação parcial): ainda responde 'entregue'", async () => {
    // Defesa contra o caso em que `decisoes_de_triagem` ficou para trás de uma
    // gravação incompleta — a pergunta não pode virar "não há registro" para um
    // edital que está, comprovadamente, na lista do cliente.
    const { cliente } = clienteFalso({
      oportunidades: [linhaDaOportunidade(EDITAL_URGENTE, "u1")],
      decisoes_de_triagem: [],
    });

    const resposta = await new RepositorioSupabase(cliente).explicarTriagem(EMPRESA_REAL, EDITAL_URGENTE.id);
    expect(resposta.encontrado).toBe(true);
    expect(resposta.avaliacao).not.toBeNull();
  });

  it("delega para a demonstração quando a empresa é a de exemplo", async () => {
    const { cliente, chamadas } = clienteFalso({});
    await new RepositorioSupabase(cliente).explicarTriagem(EMPRESA_DE_DEMONSTRACAO, "EXEMPLO-COMPATIVEL");
    expect(chamadas).toHaveLength(0);
  });
});
