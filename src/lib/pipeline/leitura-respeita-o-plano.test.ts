import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * A leitura do edital só roda para quem PAGA por ela.
 *
 * ## Os dois defeitos que esta guarda tranca, achados em 26/08
 *
 * O dono perguntou uma coisa simples: se não há cliente no plano de R$ 800, por
 * que os editais estão sendo lidos toda manhã? A resposta tinha duas partes, e
 * as duas eram defeito.
 *
 * **Um.** `tetoDeLeitura` decidia o volume diário perguntando "há assinante
 * vivo?", e `teste` conta como viva. O teste de catorze dias tinha nascido no
 * dia anterior, aberto para a conta do próprio dono. De um dia para o outro o
 * teto saltou de 5 para 25 leituras por empresa por dia — cinco vezes o gasto
 * de IA, disparado por uma assinatura que nunca vai gerar fatura por si.
 *
 * **Dois, e é o que importa para o produto.** Nada na escolha do que ler olhava
 * o plano. `perfis()` devolvia toda empresa ativa e a decisão era só por score.
 * Então líamos para uma conta no plano Leve — o plano que a página de preços
 * descreve como "não abrimos o arquivo do edital" — e o resumo dela dizia
 * "documento lido", porque `linhaDeLeitura` mostra a leitura sempre que ela
 * existe.
 *
 * O efeito somado: o teste de catorze dias entregava o produto de R$ 800 e
 * cobrava zero. É o mesmo buraco do alerta gratuito, reaberto no dia seguinte a
 * ser fechado, e por isso esta guarda existe: a lição não pegou da primeira vez.
 *
 * ## Por que ela lê o fonte
 *
 * Porque a decisão mora em dois scripts de orquestração que falam com o
 * PostgREST e com o fornecedor de IA. A parte pura já é testada onde ela mora
 * (`assinatura/vivas.test.ts` cobre `assinaturaPaga` e `leituraInclusaNoPlano`);
 * o que falta cobrir é a LIGAÇÃO — que os scripts realmente chamam aquilo.
 *
 * Guarda de fonte não prova comportamento. Prova que ninguém desfez a ligação
 * sem ler o motivo, que é exatamente o modo como este defeito nasceu.
 */

/** Os dois caminhos de leitura. Vale para os dois ou não vale para nenhum. */
const SCRIPTS = ["scripts/ler-recomendados.ts", "scripts/ler-em-lote.ts"];

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

describe("a leitura respeita o plano de cada empresa", () => {
  for (const caminho of SCRIPTS) {
    const codigo = semComentarios(readFileSync(caminho, "utf8"));

    it(`${caminho} filtra os perfis por quem tem leitura no plano`, () => {
      expect(codigo).toMatch(/empresasComLeituraNoPlano\(\)/);
      /*
       * O filtro em si, e não só a busca: pedir a lista ao banco e não usá-la é
       * o jeito mais fácil de "manter" esta guarda sem manter a regra.
       *
       * `[\s\S]{0,80}?` e não `[^)]*` porque o parêntese do parâmetro da
       * seta (`(p) =>`) fica no meio, e a primeira versão desta linha
       * reprovou o código correto por causa disso.
       */
      expect(codigo).toMatch(/\.filter\([\s\S]{0,80}?comLeituraNoPlano\.has\(/);
    });

    it(`${caminho} passa os perfis JÁ filtrados para candidatosParaLeitura`, () => {
      /*
       * A armadilha específica: manter o filtro numa variável nova e continuar
       * passando a lista completa. Compila, roda, lê para todo mundo.
       */
      const chamada = codigo.match(/candidatosParaLeitura\(([^)]*)\)/);
      expect(chamada).not.toBeNull();
      expect(chamada?.[1]).toContain("perfis");
      expect(chamada?.[1]).not.toContain("todosOsPerfis");
    });
  }
});

describe("o volume diário depende de quem paga, não de quem está vivo", () => {
  for (const caminho of SCRIPTS) {
    const codigo = semComentarios(readFileSync(caminho, "utf8"));

    it(`${caminho} conta assinatura PAGA para o teto`, () => {
      expect(codigo).toMatch(/assinantesPagantes\(\)/);
      expect(codigo).not.toMatch(/assinantesVivos\(\)/);
    });

    it(`${caminho} entrega ao teto a contagem de pagantes`, () => {
      // `tetoDeLeitura(vivos)` compila igualzinho e custa cinco vezes mais.
      const chamada = codigo.match(/tetoDeLeitura\(([^)]*)\)/);
      expect(chamada).not.toBeNull();
      expect(chamada?.[1].trim()).toBe("pagantes");
    });
  }
});
