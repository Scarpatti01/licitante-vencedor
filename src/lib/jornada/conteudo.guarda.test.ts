import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ETAPAS, TOTAL_DE_ETAPAS } from "./conteudo";

/**
 * O conteúdo da jornada e o banco precisam concordar sobre duas coisas: o
 * formato do código da etapa e o tamanho do código do campo. Se divergirem, a
 * gravação falha em produção com erro de constraint, para um usuário, num
 * exercício que ele acabou de preencher.
 *
 * A guarda NÃO repete a regra aqui. Ela lê a migração e extrai a trava de lá,
 * porque uma cópia da regra num teste é uma cópia que envelhece em silêncio: no
 * dia em que alguém afrouxar o check no banco, um teste que repete o valor
 * antigo continua verde e não protege mais nada.
 */

const MIGRACAO = "supabase/migrations/20260827120000_jornada_de_doze_semanas.sql";

function semComentarios(sql: string) {
  // Um comentário explicando a regra não pode virar a regra. Sem isto, escrever
  // `-- check (etapa ~ '^qualquer-coisa$')` numa explicação passaria a alimentar
  // o extrator, e a guarda mediria o comentário em vez do banco.
  return sql.replace(/^\s*--.*$/gm, "");
}

const sql = semComentarios(readFileSync(MIGRACAO, "utf8"));

describe("o conteúdo da jornada cabe no banco", () => {
  it("a migração declara a trava do código da etapa", () => {
    const achado = sql.match(/etapa text not null check \(etapa ~ '([^']+)'\)/);
    expect(achado, "não achei o check de `etapa` na migração").not.toBeNull();
  });

  it("todo código de etapa satisfaz a trava que o banco impõe", () => {
    const padrao = sql.match(/etapa text not null check \(etapa ~ '([^']+)'\)/)![1];
    const trava = new RegExp(padrao);
    for (const etapa of ETAPAS) {
      expect(trava.test(etapa.codigo), `${etapa.codigo} não passa em ${padrao}`).toBe(true);
    }
  });

  it("todo código de campo cabe no tamanho que o banco aceita", () => {
    const achado = sql.match(/campo text not null check \(length\(btrim\(campo\)\) between (\d+) and (\d+)\)/);
    expect(achado, "não achei o check de `campo` na migração").not.toBeNull();
    const [, min, max] = achado!;
    for (const etapa of ETAPAS) {
      for (const campo of etapa.campos) {
        expect(campo.codigo.trim().length).toBeGreaterThanOrEqual(Number(min));
        expect(campo.codigo.trim().length).toBeLessThanOrEqual(Number(max));
      }
    }
  });
});

describe("a jornada está inteira", () => {
  it("tem doze semanas, sem buraco e sem repetição", () => {
    expect(TOTAL_DE_ETAPAS).toBe(12);
    expect(ETAPAS.map((e) => e.semana)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(new Set(ETAPAS.map((e) => e.codigo)).size).toBe(12);
  });

  it("nenhum código de campo se repete dentro da mesma etapa", () => {
    for (const etapa of ETAPAS) {
      const codigos = etapa.campos.map((c) => c.codigo);
      expect(new Set(codigos).size, `${etapa.codigo} tem campo repetido`).toBe(codigos.length);
    }
  });

  it("toda etapa tem critério de conclusão e pelo menos um campo", () => {
    for (const etapa of ETAPAS) {
      expect(etapa.criterio.trim().length, `${etapa.codigo} sem critério`).toBeGreaterThan(0);
      expect(etapa.campos.length, `${etapa.codigo} sem campo`).toBeGreaterThan(0);
      expect(etapa.texto.length, `${etapa.codigo} sem texto`).toBeGreaterThan(0);
    }
  });

  it("nenhum travessão no texto que o cliente lê", () => {
    // A regra de voz do produto. Ver src/lib/voz.test.ts.
    for (const etapa of ETAPAS) {
      const tudo = [etapa.titulo, etapa.resumo, etapa.criterio, ...etapa.texto,
                    ...etapa.campos.flatMap((c) => [c.rotulo, c.ajuda ?? ""])].join(" ");
      expect(tudo.includes("—"), `${etapa.codigo} tem travessão`).toBe(false);
    }
  });
});
