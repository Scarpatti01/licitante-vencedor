import { describe, expect, it } from "vitest";
import { z } from "zod";
import { gerarComRetentativa, instrucaoCorretiva, type PedidoEstruturado } from "./provedor";
import { criarProvedorFalso } from "./provedor-falso";

/**
 * O que estes testes protegem é dinheiro e confiança, nesta ordem:
 *
 *   - insistir onde não adianta gasta token e atrasa a página;
 *   - não insistir onde adianta perde análise por um 429 que passaria sozinho;
 *   - insistir para sempre num formato que o modelo não acerta é sortear com o
 *     cartão do cliente.
 */

const schema = z.object({ valor: z.string() });

function pedido(): PedidoEstruturado<{ valor: string }> {
  return { prompt: "extraia algo", schema, modelo: "modelo-barato" };
}

const semEspera = { esperaBaseMs: 0, esperar: async () => {} };

describe("gerarComRetentativa", () => {
  it("devolve o valor validado quando a primeira tentativa funciona", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: { valor: "ok" } });
    const r = await gerarComRetentativa(provedor, pedido(), semEspera);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor).toEqual({ valor: "ok" });
    expect(provedor.chamadas).toBe(1);
  });

  it("insiste em falha transitória e aceita o sucesso que vier depois", async () => {
    const provedor = criarProvedorFalso([
      { tipo: "falha", falha: "limite" },
      { tipo: "falha", falha: "rede" },
      { tipo: "resposta", dados: { valor: "ok" } },
    ]);

    const r = await gerarComRetentativa(provedor, pedido(), semEspera);

    expect(r.ok).toBe(true);
    expect(r.tentativas).toBe(3);
  });

  it("espera mais a cada tentativa — 429 não passa insistindo de imediato", async () => {
    const esperas: number[] = [];
    const provedor = criarProvedorFalso({ tipo: "falha", falha: "limite" });

    await gerarComRetentativa(provedor, pedido(), {
      tentativas: 4,
      esperaBaseMs: 100,
      esperar: async (ms) => {
        esperas.push(ms);
      },
    });

    expect(esperas).toEqual([100, 200, 400]);
  });

  it("não insiste quando falta credencial: não vai aparecer entre uma chamada e outra", async () => {
    const provedor = criarProvedorFalso({ tipo: "falha", falha: "sem_credencial" });
    const r = await gerarComRetentativa(provedor, pedido(), semEspera);

    expect(r.ok).toBe(false);
    expect(provedor.chamadas).toBe(1);
  });

  it("não insiste em recusa do modelo — a segunda recusa custa igual à primeira", async () => {
    const provedor = criarProvedorFalso({ tipo: "falha", falha: "recusa" });
    await gerarComRetentativa(provedor, pedido(), semEspera);

    expect(provedor.chamadas).toBe(1);
  });

  it("resposta fora do schema rende UMA retentativa, com instrução corretiva", async () => {
    const provedor = criarProvedorFalso([
      { tipo: "resposta", dados: { valor: 42 } },
      { tipo: "resposta", dados: { valor: "agora vai" } },
    ]);

    const r = await gerarComRetentativa(provedor, pedido(), semEspera);

    expect(r.ok).toBe(true);
    expect(provedor.chamadas).toBe(2);
    expect(provedor.pedidos[0].prompt).not.toContain("rejeitada pelo validador");
    expect(provedor.pedidos[1].prompt).toContain("rejeitada pelo validador");
    // A correção diz QUAL campo quebrou; sem isso o modelo repete o erro.
    expect(provedor.pedidos[1].prompt).toContain("valor");
  });

  it("desiste depois da correção e declara o motivo, em vez de sortear", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: { valor: 42 } });
    const r = await gerarComRetentativa(provedor, pedido(), { ...semEspera, tentativas: 5 });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.falha).toBe("resposta_invalida");
      expect(r.motivo).toContain("valor");
    }
    expect(provedor.chamadas).toBe(2);
  });

  it("soma o custo das tentativas — resposta inválida também é cobrada", async () => {
    const provedor = criarProvedorFalso([
      { tipo: "falha", falha: "rede", uso: { entrada: 10, saida: 0 } },
      { tipo: "resposta", dados: { valor: "ok" }, uso: { entrada: 10, saida: 5 } },
    ]);

    const r = await gerarComRetentativa(provedor, pedido(), semEspera);

    expect(r.uso).toEqual({ entrada: 20, saida: 5, total: 25 });
  });

  it("a instrução corretiva reafirma que lacuna é melhor que invenção", () => {
    expect(instrucaoCorretiva("- valor: esperado string")).toContain("inventar valor");
  });
});
