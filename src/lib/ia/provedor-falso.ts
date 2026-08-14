import {
  SEM_USO,
  type ModoDeFalha,
  type PedidoEstruturado,
  type ProvedorDeIA,
  type ResultadoDaGeracao,
  type UsoDeTokens,
} from "./provedor";
import { descreverErroDeValidacao } from "./schemas";

/**
 * Provedor de mentira, para teste — e para qualquer consumidor desta camada
 * poder testar o SEU código sem gastar token nem depender de rede.
 *
 * Ele mora no código de produção, e não dentro de um `.test.ts`, de propósito:
 * é a prova viva de que a porta `ProvedorDeIA` é implementável por quem não é o
 * Gemini. Se um dia este arquivo ficar difícil de escrever, a porta vazou
 * detalhe de fornecedor e é hora de consertar a porta.
 *
 * O ponto importante: ele valida a resposta programada contra o MESMO schema do
 * pedido, exatamente como o adaptador real faz. Assim, um teste que programa
 * uma resposta torta exercita o caminho de validação de verdade, em vez de um
 * atalho que só existe no teste.
 */

export type Roteiro =
  | { tipo: "resposta"; dados: unknown; uso?: Partial<UsoDeTokens> }
  | { tipo: "falha"; falha: ModoDeFalha; motivo?: string; uso?: Partial<UsoDeTokens> };

export type ProvedorFalso = ProvedorDeIA & {
  /** Todos os pedidos recebidos, em ordem. Serve para inspecionar o prompt. */
  readonly pedidos: PedidoEstruturado<unknown>[];
  readonly chamadas: number;
};

function completarUso(parcial?: Partial<UsoDeTokens>): UsoDeTokens {
  if (!parcial) return SEM_USO;
  const entrada = parcial.entrada ?? 0;
  const saida = parcial.saida ?? 0;
  return { entrada, saida, total: parcial.total ?? entrada + saida };
}

export function criarProvedorFalso(
  roteiro: Roteiro | Roteiro[],
  { configurado = true, nome = "falso" }: { configurado?: boolean; nome?: string } = {},
): ProvedorFalso {
  const roteiros = Array.isArray(roteiro) ? roteiro : [roteiro];
  const pedidos: PedidoEstruturado<unknown>[] = [];

  const provedor: ProvedorFalso = {
    nome,
    pedidos,
    get chamadas() {
      return pedidos.length;
    },
    configurado: () => configurado,

    async gerarEstruturado<T>(pedido: PedidoEstruturado<T>): Promise<ResultadoDaGeracao<T>> {
      pedidos.push(pedido as PedidoEstruturado<unknown>);
      // Passado o fim do roteiro, o último passo se repete: é o que permite
      // testar "insiste e continua falhando" sem escrever a mesma linha seis
      // vezes.
      const passo = roteiros[Math.min(pedidos.length - 1, roteiros.length - 1)];
      const uso = completarUso(passo?.uso);
      const base = { modelo: pedido.modelo, uso, duracaoMs: 1, tentativas: 1 } as const;

      if (!passo || passo.tipo === "falha") {
        return {
          ok: false,
          falha: passo?.falha ?? "desconhecida",
          motivo: passo?.motivo ?? "Falha programada no provedor falso.",
          ...base,
        };
      }

      const validado = pedido.schema.safeParse(passo.dados);
      if (!validado.success) {
        return {
          ok: false,
          falha: "resposta_invalida",
          motivo: `A resposta não satisfaz o schema:\n${descreverErroDeValidacao(validado.error)}`,
          ...base,
        };
      }

      return { ok: true, valor: validado.data, ...base };
    },
  };

  return provedor;
}
