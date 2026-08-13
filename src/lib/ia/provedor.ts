import type { ZodType } from "zod";

/**
 * A porta da camada de IA.
 *
 * Existe por uma razão econômica, não arquitetural: o preço e a qualidade dos
 * modelos mudam a cada poucos meses, e este produto gasta dinheiro por edital
 * lido. Trocar de modelo — ou de fornecedor inteiro — tem de ser uma linha de
 * configuração, não uma refatoração. Por isso NADA fora de `gemini.ts` conhece
 * o dialeto de um fornecedor específico: aqui só existe "mande este prompt,
 * devolva algo que satisfaça este schema, e me diga quanto custou".
 *
 * A segunda regra deste arquivo: **o provedor nunca lança exceção**. Falha de
 * IA é evento normal — a rede cai, a quota estoura, o modelo devolve JSON
 * torto. Uma exceção subindo daqui derrubaria a página de um cliente por causa
 * de um erro que o produto sabe tratar. Falha é valor de retorno, do mesmo
 * jeito que `ResultadoCaptura` em `leads.ts`.
 */

/** Tokens consumidos numa execução. Base do registro de custo em `custo.ts`. */
export type UsoDeTokens = {
  entrada: number;
  saida: number;
  total: number;
};

export const SEM_USO: UsoDeTokens = { entrada: 0, saida: 0, total: 0 };

/**
 * Por que falhou — em categorias que mudam a DECISÃO, não em categorias que
 * mudam a mensagem. Cada uma destas leva a um tratamento diferente:
 *
 *   `sem_credencial`    — não adianta insistir. O sistema segue sem IA.
 *   `rede` / `limite`   — transitório: vale retentar com espera crescente.
 *   `resposta_invalida` — o modelo respondeu fora do schema: vale UMA retentativa
 *                         com instrução corretiva, e só.
 *   `recusa`            — o modelo se recusou (segurança, conteúdo). Insistir é
 *                         gastar dinheiro para tomar a mesma recusa.
 *   `cancelado`         — quem pediu desistiu. Retentar seria desobedecer.
 *   `desconhecida`      — não classificamos. Trata-se como não transitório, que
 *                         é o lado seguro: erra para menos gasto.
 */
export type ModoDeFalha =
  | "sem_credencial"
  | "rede"
  | "limite"
  | "recusa"
  | "resposta_invalida"
  | "cancelado"
  | "desconhecida";

/** Falhas que valem retentativa cega, com espera crescente. */
export function ehTransitoria(falha: ModoDeFalha): boolean {
  return falha === "rede" || falha === "limite";
}

export type PedidoEstruturado<T> = {
  /** O texto do prompt já montado. Quem monta é `prompts/`, nunca este módulo. */
  prompt: string;
  /**
   * O contrato da resposta. É `zod` e não JSON Schema cru de propósito: o mesmo
   * objeto que descreve o formato para o modelo é o que valida a resposta
   * depois. Duas descrições do mesmo formato divergem com o tempo; uma só, não.
   */
  schema: ZodType<T>;
  /** Identificador do modelo no fornecedor. Quem escolhe é `custo.ts`. */
  modelo: string;
  instrucaoDeSistema?: string;
  /**
   * Padrão zero em quem implementa: extração de edital não é tarefa criativa.
   * Temperatura alta aqui inventa exigência, que é o pior erro deste produto.
   */
  temperatura?: number;
  maxTokensDeSaida?: number;
  sinal?: AbortSignal;
  /** Nome curto do schema, só para a mensagem de erro dizer o que não bateu. */
  nomeDoSchema?: string;
};

export type GeracaoBemSucedida<T> = {
  ok: true;
  valor: T;
  modelo: string;
  uso: UsoDeTokens;
  duracaoMs: number;
  /** Quantas chamadas ao fornecedor foram necessárias. Entra no custo. */
  tentativas: number;
};

export type GeracaoFalha = {
  ok: false;
  falha: ModoDeFalha;
  /** Texto legível, que acaba virando o `motivo` de um campo desconhecido. */
  motivo: string;
  modelo: string;
  /** Tokens gastos mesmo na falha — uma resposta inválida também é cobrada. */
  uso: UsoDeTokens;
  duracaoMs: number;
  tentativas: number;
};

export type ResultadoDaGeracao<T> = GeracaoBemSucedida<T> | GeracaoFalha;

export interface ProvedorDeIA {
  /** Aparece no registro de execução. Ex.: `"gemini"`. */
  readonly nome: string;
  /**
   * `false` quando falta credencial. Perguntar é obrigatório antes de chamar:
   * é isto que permite ao produto dizer "a leitura profunda não aconteceu" em
   * vez de estourar uma exceção na renderização de uma página.
   *
   * Lido a cada chamada, e não em constante de módulo — mesmo motivo de
   * `capturaConfigurada` em `leads.ts`: configurar a variável de ambiente deve
   * passar a valer sem exigir novo build.
   */
  configurado(): boolean;
  gerarEstruturado<T>(pedido: PedidoEstruturado<T>): Promise<ResultadoDaGeracao<T>>;
}

export const dormir = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export type OpcoesDeRetentativa = {
  /** Tentativas para falha transitória (rede/limite). */
  tentativas?: number;
  /** Base da espera exponencial. Zero nos testes, para não esperar de verdade. */
  esperaBaseMs?: number;
  /** Injetável para o teste não dormir. */
  esperar?: (ms: number) => Promise<void>;
  /** Observabilidade: avisa que entrou em espera, para o CLI não parecer travado. */
  aoEsperar?: (motivo: ModoDeFalha, ms: number, tentativa: number) => void;
};

/**
 * Instrução corretiva usada na única retentativa por resposta inválida.
 *
 * O texto repete o erro do validador porque é a informação que o modelo não
 * tem: ele não viu o schema falhar. Repetir "responda em JSON" sem dizer QUAL
 * campo quebrou costuma render o mesmo erro de novo, e aí pagamos duas vezes
 * pela mesma resposta ruim.
 */
export function instrucaoCorretiva(erroDeValidacao: string): string {
  return [
    "",
    "---",
    "ATENÇÃO: a sua resposta anterior foi rejeitada pelo validador.",
    "Erros encontrados:",
    erroDeValidacao,
    "",
    "Responda de novo, apenas com o JSON, corrigindo exatamente esses pontos.",
    "Não acrescente campos, não use markdown, não escreva texto fora do JSON.",
    "Se você não encontrou base no texto para um campo, é para marcá-lo como não",
    "encontrado — inventar valor para satisfazer o formato é pior do que a lacuna.",
  ].join("\n");
}

function somarUso(a: UsoDeTokens, b: UsoDeTokens): UsoDeTokens {
  return {
    entrada: a.entrada + b.entrada,
    saida: a.saida + b.saida,
    total: a.total + b.total,
  };
}

/**
 * Executa um pedido com a política de insistência da casa.
 *
 * Duas insistências diferentes, de propósito:
 *
 *   - **Transitória** (rede, quota): retenta até `tentativas` vezes com espera
 *     crescente. O erro não é nosso e passa sozinho.
 *   - **Resposta inválida**: retenta UMA vez, e com instrução corretiva. Se o
 *     modelo errou o formato duas vezes, insistir é sortear — e sortear com
 *     dinheiro do cliente. Desiste declarando o motivo, que vira o texto que o
 *     usuário lê no campo desconhecido.
 *
 * Repare que esta função é agnóstica de fornecedor: ela só conhece a porta.
 * É ela que garante que trocar o Gemini por outro modelo não traz de volta a
 * discussão sobre retentativa.
 */
export async function gerarComRetentativa<T>(
  provedor: ProvedorDeIA,
  pedido: PedidoEstruturado<T>,
  opcoes: OpcoesDeRetentativa = {},
): Promise<ResultadoDaGeracao<T>> {
  const { tentativas = 3, esperaBaseMs = 1000, esperar = dormir, aoEsperar } = opcoes;

  let uso = SEM_USO;
  let duracaoMs = 0;
  let chamadas = 0;
  let jaCorrigiu = false;
  let ultima: GeracaoFalha | null = null;

  for (let i = 0; i < tentativas; i++) {
    const promptAtual: string =
      jaCorrigiu && ultima ? `${pedido.prompt}${instrucaoCorretiva(ultima.motivo)}` : pedido.prompt;

    const resultado: ResultadoDaGeracao<T> = await provedor.gerarEstruturado<T>({
      ...pedido,
      prompt: promptAtual,
    });
    chamadas += 1;
    uso = somarUso(uso, resultado.uso);
    duracaoMs += resultado.duracaoMs;

    if (resultado.ok) {
      return { ...resultado, uso, duracaoMs, tentativas: chamadas };
    }

    ultima = resultado;

    if (resultado.falha === "resposta_invalida") {
      // Uma correção, e só uma. Na segunda o modelo já demonstrou que não vai
      // acertar este formato hoje.
      if (jaCorrigiu) break;
      jaCorrigiu = true;
      continue;
    }

    if (!ehTransitoria(resultado.falha)) break;

    const ultimaTentativa = i === tentativas - 1;
    if (ultimaTentativa) break;

    const espera = esperaBaseMs * 2 ** i;
    aoEsperar?.(resultado.falha, espera, i + 1);
    await esperar(espera);
  }

  return {
    ok: false,
    falha: ultima?.falha ?? "desconhecida",
    motivo: ultima?.motivo ?? "O provedor de IA não devolveu resultado nem erro.",
    modelo: pedido.modelo,
    uso,
    duracaoMs,
    tentativas: chamadas,
  };
}

/**
 * Provedor que nunca gera nada, para quando não há credencial.
 *
 * Existe para o resto do sistema não precisar de um caminho `if (provedor)`
 * espalhado: o objeto está sempre lá, e `configurado()` responde a verdade.
 */
export const PROVEDOR_INDISPONIVEL: ProvedorDeIA = {
  nome: "indisponivel",
  configurado: () => false,
  gerarEstruturado: async <T>(pedido: PedidoEstruturado<T>): Promise<ResultadoDaGeracao<T>> => ({
    ok: false,
    falha: "sem_credencial",
    motivo: "Nenhum provedor de IA está configurado neste ambiente.",
    modelo: pedido.modelo,
    uso: SEM_USO,
    duracaoMs: 0,
    tentativas: 0,
  }),
};
