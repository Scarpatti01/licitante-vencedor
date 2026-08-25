import type { ZodType } from "zod";
import { noDialetoDoGemini } from "./gemini.ts";
import { jsonSchemaParaModelo } from "./schemas.ts";
import { SEM_USO, type ModoDeFalha, type UsoDeTokens } from "./provedor.ts";

/**
 * Leitura de edital em LOTE, pela Batch API do Gemini.
 *
 * ## Os dois problemas que isto resolve
 *
 * **Cota.** Em 23/08 a leitura funcionou das 07:13 às 09:22 e depois devolveu
 * 429 pelo resto do dia. Em 24/08 nenhuma chamada passou: 100% de recusa, em
 * ~650ms cada, que é o tempo de um "não" instantâneo. A retentativa com espera
 * exponencial de 1 a 2 segundos que existe em `provedor.ts` não ajuda nisso —
 * ela foi feita para 429 momentâneo, e cota diária esgotada não volta em dois
 * segundos. A Batch API tem cota própria e muito maior.
 *
 * **Custo.** O lote custa metade: US$ 1 e US$ 6 por milhão contra US$ 2 e
 * US$ 12. Com a média medida de 26.591 tokens de entrada e 10.975 de saída por
 * edital, isso leva o custo de ~R$ 1,00 para ~R$ 0,50 por leitura. No teto de
 * 25 leituras por empresa por dia, é a diferença entre R$ 550 e R$ 275 por mês.
 *
 * E o lote não custa nada em experiência: a leitura roda de madrugada, e o
 * resumo do cliente sai às 7h. Ninguém está esperando na tela.
 *
 * ## A armadilha desta API, e por que ela é o centro deste arquivo
 *
 * As respostas voltam num array, e **o vínculo com o pedido é a POSIÇÃO**, não
 * uma chave. A documentação é explícita: "a posição no array de respostas
 * corresponde à posição da requisição original".
 *
 * Num produto que lê editais, desalinhar posição é o pior defeito concebível:
 * o edital A receberia as exigências de habilitação do edital B, a tela
 * mostraria tudo com aparência normal, e o cliente montaria proposta com a
 * garantia errada. Não haveria erro em log nenhum.
 *
 * Por isso `lerRespostasDoLote` RECUSA O LOTE INTEIRO quando a contagem não
 * bate. Perder uma noite de leitura custa um dia de atraso; entregar análise
 * trocada custa o cliente.
 */

/** Um pedido dentro do lote, com a chave que o chamador usa para reencontrá-lo. */
export type ItemDoLote<T> = {
  /** Do chamador. Costuma ser o `id` do edital. */
  chave: string;
  prompt: string;
  schema: ZodType<T>;
  instrucaoDeSistema?: string;
  temperatura?: number;
  maxTokensDeSaida?: number;
};

/**
 * O corpo do POST para `models/{modelo}:batchGenerateContent`.
 *
 * A configuração espelha `criarProvedorGemini` de propósito: temperatura zero,
 * resposta em JSON e o mesmo schema. Lote e chamada avulsa precisam produzir a
 * MESMA análise para o mesmo edital, senão a leitura passa a depender de por
 * qual caminho ela entrou.
 */
export function montarCorpoDoLote<T>(
  itens: readonly ItemDoLote<T>[],
  nomeVisivel: string,
): Record<string, unknown> {
  return {
    batch: {
      display_name: nomeVisivel,
      input_config: {
        requests: {
          requests: itens.map((item) => ({
            request: {
              contents: [{ parts: [{ text: item.prompt }] }],
              generation_config: {
                temperature: item.temperatura ?? 0,
                // 16k e não os 8.192 da chamada avulsa: a saída média medida é
                // de 10.975 tokens, e nove leituras já foram perdidas por
                // corte no limite. Token gerado e descartado é o único gasto
                // que não compra nada.
                max_output_tokens: item.maxTokensDeSaida ?? 16_384,
                response_mime_type: "application/json",
                response_json_schema: noDialetoDoGemini(jsonSchemaParaModelo(item.schema)),
              },
              ...(item.instrucaoDeSistema
                ? { system_instruction: { parts: [{ text: item.instrucaoDeSistema }] } }
                : {}),
            },
            // Mandamos a chave mesmo sabendo que a API devolve por posição. Se
            // um dia ela passar a devolver `metadata`, a conferência abaixo
            // deixa de depender só de contagem — e enquanto não passar, não
            // custa nada.
            metadata: { key: item.chave },
          })),
        },
      },
    },
  };
}

export type EstadoDoLote =
  | "pendente"
  | "rodando"
  | "concluido"
  | "falhou"
  | "cancelado"
  | "expirado"
  | "desconhecido";

/**
 * Traduz o estado do fornecedor para o vocabulário do projeto.
 *
 * ## Os dois dialetos, e as três horas que custaram
 *
 * O primeiro ensaio real, em 24/08, criou o lote com sucesso e depois consultou
 * 176 vezes seguidas recebendo `desconhecido`, até desistir por prazo. O lote
 * quase certamente já tinha terminado; nós é que não entendíamos a resposta.
 *
 * A causa: esta função só conhecia `JOB_STATE_*`, que é o dialeto da **Vertex
 * AI**. A Batch API da **Gemini Developer API** — a que usamos — responde
 * `BATCH_STATE_*`. Dois produtos do mesmo fornecedor, dois prefixos.
 *
 * Agora o prefixo é descartado e a decisão é pelo sufixo, que é igual nos dois.
 * Um terceiro dialeto amanhã continua caindo em `desconhecido`, e é para isso
 * que existe o `bruto` no retorno: quem chama TEM de conseguir imprimir a
 * palavra que o fornecedor disse. Traduzir para "desconhecido" e jogar o
 * original fora foi o que transformou um erro de uma linha em três horas de
 * log inútil.
 */
export function estadoDoLote(bruto: unknown): EstadoDoLote {
  if (typeof bruto !== "string") return "desconhecido";

  const sufixo = bruto.replace(/^(JOB|BATCH)_STATE_/, "");

  switch (sufixo) {
    case "PENDING":
    case "QUEUED":
      return "pendente";
    case "RUNNING":
      return "rodando";
    case "SUCCEEDED":
      return "concluido";
    case "FAILED":
      return "falhou";
    case "CANCELLED":
    case "CANCELED":
      return "cancelado";
    case "EXPIRED":
      return "expirado";
    default:
      return "desconhecido";
  }
}


/**
 * Vale parar de esperar?
 *
 * `desconhecido` NÃO é terminal: estado que não reconhecemos é provavelmente um
 * estado novo da API, e desistir dele transformaria uma novidade do fornecedor
 * em leitura perdida. Continuar consultando é o comportamento seguro, porque
 * quem chama tem o próprio limite de tempo.
 */
export function ehTerminal(estado: EstadoDoLote): boolean {
  return estado === "concluido" || estado === "falhou" ||
    estado === "cancelado" || estado === "expirado";
}

export type RespostaDoItem<T> =
  | { ok: true; chave: string; valor: T; uso: UsoDeTokens }
  | { ok: false; chave: string; falha: ModoDeFalha; motivo: string; uso: UsoDeTokens };

export type LeituraDoLote<T> =
  | { ok: true; itens: RespostaDoItem<T>[] }
  /** O lote inteiro é descartado. Ver o comentário do topo sobre posição. */
  | { ok: false; motivo: string };

function usoDe(bruto: unknown): UsoDeTokens {
  const m = (bruto ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const entrada = n(m.promptTokenCount);
  const saida = n(m.candidatesTokenCount);
  // `total` vem do fornecedor quando existe. Somar entrada e saída como reserva
  // é melhor que zerar: custo subestimado é o erro que ninguém percebe.
  return { entrada, saida, total: n(m.totalTokenCount) || entrada + saida };
}

function textoDe(resposta: unknown): string | null {
  const r = (resposta ?? {}) as Record<string, unknown>;
  const candidatos = r.candidates;
  if (!Array.isArray(candidatos) || candidatos.length === 0) return null;
  const partes = ((candidatos[0] as Record<string, unknown>)?.content as Record<string, unknown>)
    ?.parts;
  if (!Array.isArray(partes)) return null;
  const texto = partes
    .map((p) => (p as Record<string, unknown>)?.text)
    .filter((t): t is string => typeof t === "string")
    .join("");
  return texto.length > 0 ? texto : null;
}

/**
 * Lê o resultado do lote, validando cada item contra o schema do pedido.
 *
 * `chavesEnviadas` precisa estar NA MESMA ORDEM do envio. É esse contrato que a
 * conferência de contagem protege.
 */
/**
 * Acha o array de respostas onde quer que o fornecedor o tenha posto.
 *
 * A primeira versão procurava em `dest.inlinedResponses` e desistia. O segundo
 * ensaio real, em 25/08, mostrou por que isso é frágil: o lote CONCLUIU, as
 * respostas vieram, e nós as descartamos por estarem em outro galho da
 * estrutura. Um caminho literal é uma aposta na documentação estar completa.
 *
 * A busca é por NOME de chave (`inlinedResponses`), em profundidade limitada.
 * Isso aceita as três formas que o fornecedor já usou em produtos diferentes
 * (`dest.…`, `response.dest.…`, `response.inlinedResponses.inlinedResponses`)
 * e as que ele inventar amanhã no mesmo espírito.
 *
 * O que NÃO afrouxa: achar o array não valida nada. A conferência de contagem
 * por posição continua sendo a guarda, e ela é aplicada logo depois.
 */
function acharRespostas(valor: unknown, profundidade = 0): unknown[] | null {
  if (profundidade > 6 || valor === null || typeof valor !== "object") return null;

  for (const [chave, filho] of Object.entries(valor as Record<string, unknown>)) {
    if (chave === "inlinedResponses" && Array.isArray(filho)) return filho;
    const achado = acharRespostas(filho, profundidade + 1);
    if (achado) return achado;
  }

  return null;
}

/**
 * O esboço da estrutura que chegou, só com nomes de chave.
 *
 * Existe pela mesma razão que o `bruto` do estado: quando o nosso vocabulário
 * não encontra o que espera, o log tem de mostrar o que o fornecedor mandou.
 * Sem isto, "sem `dest.inlinedResponses`" manda procurar às cegas, e cada
 * tentativa custa um lote.
 *
 * Só as CHAVES, nunca os valores: o corpo carrega a análise dos editais, e log
 * não é lugar para despejar isso.
 */
export function esbocoDaEstrutura(valor: unknown, profundidade = 0): string {
  if (valor === null) return "null";
  if (Array.isArray(valor)) return `[${valor.length}]`;
  if (typeof valor !== "object") return typeof valor;
  if (profundidade > 3) return "{…}";

  const partes = Object.entries(valor as Record<string, unknown>).map(
    ([chave, filho]) => `${chave}: ${esbocoDaEstrutura(filho, profundidade + 1)}`,
  );
  return `{ ${partes.join(", ")} }`;
}

export function lerRespostasDoLote<T>(
  corpo: unknown,
  chavesEnviadas: readonly string[],
  schema: ZodType<T>,
): LeituraDoLote<T> {
  const brutas = acharRespostas(corpo);

  if (!brutas) {
    return {
      ok: false,
      motivo:
        `não achei o array \`inlinedResponses\` em lugar nenhum da resposta do lote. ` +
        `A estrutura que chegou foi: ${esbocoDaEstrutura(corpo)}`,
    };
  }

  // A guarda. Ver o comentário do topo: com o vínculo feito por posição,
  // contagem diferente significa que NENHUM par pedido/resposta é confiável.
  if (brutas.length !== chavesEnviadas.length) {
    return {
      ok: false,
      motivo:
        `o lote devolveu ${brutas.length} respostas para ${chavesEnviadas.length} pedidos. ` +
        `Como a API liga resposta a pedido pela POSIÇÃO no array, contagem diferente ` +
        `significa que qualquer par pode estar trocado. Descartando o lote inteiro: ` +
        `um dia sem leitura custa menos que uma análise atribuída ao edital errado.`,
    };
  }

  const itens: RespostaDoItem<T>[] = brutas.map((bruta, i) => {
    const chave = chavesEnviadas[i];
    const item = (bruta ?? {}) as Record<string, unknown>;

    // Se a API um dia devolver a chave, conferimos. Enquanto não devolver, o
    // `undefined` simplesmente não dispara nada.
    const chaveDevolvida = ((item.metadata ?? {}) as Record<string, unknown>).key;
    if (typeof chaveDevolvida === "string" && chaveDevolvida !== chave) {
      return {
        ok: false, chave, falha: "resposta_invalida" as ModoDeFalha, uso: SEM_USO,
        motivo: `a API devolveu a chave "${chaveDevolvida}" na posição de "${chave}"`,
      };
    }

    const erro = item.error as Record<string, unknown> | undefined;
    if (erro) {
      const codigo = typeof erro.code === "number" ? erro.code : 0;
      return {
        ok: false, chave, uso: SEM_USO,
        falha: (codigo === 429 ? "limite" : "desconhecida") as ModoDeFalha,
        motivo: `o fornecedor recusou este item (HTTP ${codigo}): ${String(erro.message ?? "")}`,
      };
    }

    const resposta = item.response;
    const uso = usoDe((resposta as Record<string, unknown>)?.usageMetadata);
    const texto = textoDe(resposta);
    if (texto === null) {
      return {
        ok: false, chave, uso, falha: "resposta_invalida" as ModoDeFalha,
        motivo: "o item voltou sem texto de resposta",
      };
    }

    let cru: unknown;
    try {
      cru = JSON.parse(texto);
    } catch {
      return {
        ok: false, chave, uso, falha: "resposta_invalida" as ModoDeFalha,
        motivo: "a resposta do item não é JSON válido",
      };
    }

    const validado = schema.safeParse(cru);
    if (!validado.success) {
      return {
        ok: false, chave, uso, falha: "resposta_invalida" as ModoDeFalha,
        motivo: `a resposta não bate com o schema: ${validado.error.issues[0]?.message ?? "?"}`,
      };
    }

    return { ok: true, chave, valor: validado.data, uso };
  });

  return { ok: true, itens };
}
