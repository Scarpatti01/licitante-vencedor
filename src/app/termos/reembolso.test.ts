import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A política de reembolso existe por duas razões, e nenhuma delas é jurídica.
 *
 * A primeira é o cliente: descobrir a regra de devolução DEPOIS de pagar é o
 * que transforma um cancelamento comum em reclamação pública.
 *
 * A segunda é operacional, e é a que este teste guarda. Toda processadora de
 * pagamento — Stripe, PayPal, Hotmart — revisa o site antes de liberar a conta,
 * e "política de reembolso e cancelamento" é item obrigatório dessa revisão. Se
 * alguém enxugar esta seção achando que é texto morto, a conta de cobrança para
 * de ser aprovada e ninguém liga uma coisa à outra: o sintoma aparece semanas
 * depois, num e-mail de recusa que não cita o site.
 *
 * Por isso o teste lê o TEXTO PUBLICADO e não uma constante. Uma constante
 * `TEM_POLITICA = true` passaria com a página vazia.
 */

const TERMOS = readFileSync(
  join(import.meta.dirname, "page.tsx"),
  "utf8",
);

describe("a política de reembolso está publicada", () => {
  it("tem uma seção de reembolso com âncora própria", () => {
    // Âncora nomeada porque o revisor da processadora — e o cliente irritado —
    // precisam de um endereço para apontar, não de um trecho no meio da página.
    expect(TERMOS).toContain('id="reembolso"');
    expect(TERMOS).toMatch(/titulo="Reembolso"/);
  });

  it("declara o prazo de arrependimento e o que acontece depois dele", () => {
    // Os dois lados da regra. Publicar só o generoso ("devolvemos tudo") é
    // propaganda; publicar só o restritivo é o que gera disputa no banco.
    expect(TERMOS).toMatch(/7 dias/);
    expect(TERMOS).toMatch(/devolução\s+proporcional/i);
  });

  it("diz como pedir e em quanto tempo respondemos", () => {
    // Política sem canal é política que não se exerce. O prazo de resposta é o
    // que separa "temos política" de "a política funciona".
    expect(TERMOS).toMatch(/CONTATO\.email/);
    expect(TERMOS).toMatch(/5 dias úteis/);
  });

  it("continua ligada ao cancelamento, que é a seção vizinha", () => {
    // As duas se explicam juntas: a de cobrança diz que o serviço vai até o fim
    // do ciclo pago, e a de reembolso diz que essa parte não volta em dinheiro.
    // Se uma sumir, a outra passa a mentir por omissão.
    expect(TERMOS).toContain('id="pagamento"');
  });
});
