import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  AVISAR_A_PARTIR_DE,
  DIAS_DE_TESTE,
  PLANO_DO_TESTE,
  diasRestantes,
  precisaAvisar,
  terminaEm,
  testeVenceu,
} from "./teste.ts";

const AGORA = new Date("2026-08-25T12:00:00Z");
const emDias = (n: number) => new Date(AGORA.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const teste = (testeTerminaEm: string | null) => ({ status: "teste", testeTerminaEm });

describe("terminaEm", () => {
  it("soma os dias do teste", () => {
    expect(terminaEm(AGORA).toISOString()).toBe(emDias(DIAS_DE_TESTE));
  });
});

describe("testeVenceu", () => {
  it("não vence antes da hora", () => {
    expect(testeVenceu(teste(emDias(1)), AGORA)).toBe(false);
  });

  it("vence na hora exata", () => {
    expect(testeVenceu(teste(AGORA.toISOString()), AGORA)).toBe(true);
  });

  it("vence depois", () => {
    expect(testeVenceu(teste(emDias(-1)), AGORA)).toBe(true);
  });

  it("NUNCA vence assinatura paga", () => {
    /*
     * O erro mais caro possível deste arquivo: cortar o acesso de quem está
     * pagando. Assinatura `ativa` não tem período de teste, e passar por aqui
     * não pode encerrá-la de jeito nenhum.
     */
    expect(testeVenceu({ status: "ativa", testeTerminaEm: emDias(-100) }, AGORA)).toBe(false);
    expect(testeVenceu({ status: "inadimplente", testeTerminaEm: emDias(-100) }, AGORA)).toBe(false);
  });

  it("NUNCA vence teste sem data de fim", () => {
    // Encerrar por falta de uma data que a assinatura talvez nunca devesse ter
    // é destruir acesso por ausência de informação.
    expect(testeVenceu(teste(null), AGORA)).toBe(false);
  });

  it("NUNCA vence com data ilegível", () => {
    expect(testeVenceu(teste("catorze de setembro"), AGORA)).toBe(false);
  });
});

describe("diasRestantes", () => {
  it("conta os dias que faltam", () => {
    expect(diasRestantes(teste(emDias(5)), AGORA)).toBe(5);
  });

  it("nunca é negativo: teste vencido é zero", () => {
    // "faltam -3 dias" na tela é defeito visível. Zero é a verdade útil.
    expect(diasRestantes(teste(emDias(-3)), AGORA)).toBe(0);
  });

  it("é null para quem não está em teste", () => {
    expect(diasRestantes({ status: "ativa", testeTerminaEm: emDias(5) }, AGORA)).toBeNull();
    expect(diasRestantes(teste(null), AGORA)).toBeNull();
  });

  it("arredonda para cima: meio dia que falta ainda é um dia", () => {
    const meioDia = new Date(AGORA.getTime() + 12 * 60 * 60 * 1000).toISOString();
    expect(diasRestantes(teste(meioDia), AGORA)).toBe(1);
  });
});

describe("precisaAvisar", () => {
  it("avisa a partir do limite, e não no último dia", () => {
    /*
     * Um dia de aviso é aviso que chega junto com a perda. Três dão tempo de
     * decidir, de falar com quem paga a conta, e de reclamar se o produto não
     * entregou — conversa que a gente quer ter antes, não depois.
     */
    expect(precisaAvisar(teste(emDias(AVISAR_A_PARTIR_DE)), AGORA)).toBe(true);
    expect(precisaAvisar(teste(emDias(AVISAR_A_PARTIR_DE + 1)), AGORA)).toBe(false);
  });

  it("continua avisando depois de vencido", () => {
    // Zero dias restantes ainda precisa de aviso: é o momento em que o cliente
    // mais precisa entender por que parou de receber.
    expect(precisaAvisar(teste(emDias(-1)), AGORA)).toBe(true);
  });

  it("não avisa quem está pagando", () => {
    expect(precisaAvisar({ status: "ativa", testeTerminaEm: emDias(1) }, AGORA)).toBe(false);
  });
});

describe("a migração e o TypeScript dizem a mesma coisa", () => {
  /*
   * A lição do `leve-escritorio`, que custou uma migração recusada: o CHECK do
   * banco exigia `^[a-z0-9_]+$` e o teste de TypeScript exigia `^[a-z-]+$`. Os
   * dois estavam verdes, e eram contraditórios entre si — cada um sozinho no
   * seu lado do muro.
   *
   * Aqui o risco é o mesmo em outra forma: `DIAS_DE_TESTE` e `PLANO_DO_TESTE`
   * moram no TypeScript, mas quem CRIA o teste é `criar_empresa_com_dono`, no
   * Postgres. Mudar 14 para 30 aqui não mudaria nada em produção, e o e-mail
   * passaria a prometer trinta dias que o banco corta aos catorze.
   */
  const migracao = readFileSync(
    new URL("../../../supabase/migrations/20260825190000_o_teste_nasce_com_a_empresa.sql", import.meta.url),
    "utf8",
  );

  /** Só o corpo, sem os comentários `--`, para não casar com a explicação. */
  const sql = migracao
    .split("\n")
    .filter((linha) => !linha.trimStart().startsWith("--"))
    .join("\n");

  it("o prazo do teste é o mesmo dos dois lados", () => {
    const intervalos = [...sql.matchAll(/interval\s+'(\d+)\s+days?'/g)].map((m) => Number(m[1]));

    expect(intervalos.length).toBeGreaterThan(0);
    for (const dias of intervalos) {
      expect(dias).toBe(DIAS_DE_TESTE);
    }
  });

  it("o plano do teste é o mesmo dos dois lados, em TODA menção", () => {
    /*
     * `toContain` foi a primeira versão desta guarda, e ela não mordia: a
     * migração cita o plano duas vezes — na criação e no preenchimento de quem
     * já estava aqui — e bastava UMA continuar dizendo `leve` para o teste
     * passar com a outra apontando para o plano de R$ 800. Provado trocando só
     * a primeira: dezoito verdes.
     */
    const citados = [...sql.matchAll(/codigo\s*=\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);

    expect(citados.length).toBeGreaterThanOrEqual(2);
    for (const codigo of citados) {
      expect(codigo).toBe(PLANO_DO_TESTE);
    }
  });

  it("o teste nasce uma vez por pessoa, e a condição NÃO filtra status", () => {
    /*
     * A armadilha, provada contra o Postgres de produção num bloco revertido:
     * com a regra como está, quem teve o teste encerrado e cadastra uma segunda
     * empresa NÃO ganha teste novo; com o filtro de status vivo, ganharia — e
     * teste que renasce a cada empresa é o plano grátis de volta.
     *
     * A guarda lê o fonte porque a decisão mora no banco. Ela não prova o
     * comportamento; prova que ninguém acrescentou o filtro sem ler isto aqui.
     */
    const condicao = sql.match(
      /if not exists \(\s*select 1 from public\.assinaturas a where a\.titular_id = v_usuario\s*\)/,
    );

    expect(condicao).not.toBeNull();
    expect(condicao?.[0]).not.toMatch(/status/);
  });

  it("sem o plano do teste, o cadastro para em vez de seguir sem assinatura", () => {
    // Empresa criada sem assinatura é conta que não recebe nada e não tem como
    // descobrir o motivo. Erro de implantação tem de doer em quem implanta.
    expect(sql).toMatch(/if v_plano is null then\s*\n\s*raise exception/);
  });
});
