import "server-only";

import { ApiError, GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { descreverErroDeValidacao, jsonSchemaParaModelo } from "./schemas.ts";
import {
  SEM_USO,
  type ModoDeFalha,
  type PedidoEstruturado,
  type ProvedorDeIA,
  type ResultadoDaGeracao,
  type UsoDeTokens,
} from "./provedor.ts";
import type { CatalogoDeModelos } from "./custo.ts";

/**
 * O único arquivo do projeto que fala Gemini.
 *
 * Tudo o que é específico do fornecedor mora aqui: nome de modelo, formato da
 * chamada, formato do erro, nome dos campos de uso de token. O resto da camada
 * conversa por `ProvedorDeIA`. Trocar de fornecedor deve ser escrever um irmão
 * deste arquivo, e nada mais — se algum dia for preciso mexer em
 * `analisar-edital.ts` para trocar de modelo, a fronteira vazou e é bug.
 *
 * `import "server-only"` no topo: a chave é segredo de servidor. A barreira é do
 * bundler, não da disciplina — um `import` distraído a partir de um componente
 * de cliente vira erro de build em vez de chave no HTML.
 */

/**
 * Os modelos, por papel.
 *
 * IDs de modelo envelhecem rápido e são a coisa mais fácil de errar sem
 * perceber: um ID inexistente falha só em produção, na primeira análise real.
 * Por isso são sobrescrevíveis por variável de ambiente — dá para migrar de
 * `flash` para o que vier depois sem publicar código novo — e lidos a cada
 * chamada, como em `leads.ts`.
 *
 * O econômico é o padrão para praticamente todo edital; ver a política em
 * `custo.ts`.
 *
 * ## O aviso acima não era hipotético
 *
 * Em 21/08 a primeira leitura real de oportunidade de cliente falhou nos 21
 * editais, todos com o mesmo erro: `gemini-2.5-pro is no longer available to
 * new users`. Este comentário previu a categoria do defeito e mesmo assim ele
 * aconteceu — porque prever não conserta; o que conserta é ter como
 * DESCOBRIR o id certo. É o que `scripts/listar-modelos-de-ia.ts` passou a
 * fazer.
 *
 * A lição que ficou, e que o script agora incorpora: **estar listado não é
 * estar disponível.** `gemini-2.5-pro` continua aparecendo na listagem da API
 * e devolve 404 na chamada, para esta chave. A única prova é chamar.
 *
 * ## Por que estes dois, e por que fixados
 *
 * Conferidos contra a listagem real da nossa chave em 21/08. `gemini-3.7-flash`
 * é o flash estável mais novo (1M de contexto de entrada, o mesmo do pro).
 * O premium é a assimetria da vez: não existe pro estável — só
 * `gemini-3.1-pro-preview` (que o próprio erro do fornecedor indicou) e o
 * apelido móvel `gemini-pro-latest`.
 *
 * Fixados em vez de apelido (`gemini-flash-latest`) de propósito:
 * `analises_de_edital.modelo` existe para dizer o que REALMENTE rodou, e um
 * apelido gravaria "latest" — duas análises com o mesmo registro poderiam ter
 * sido modelos diferentes, e a coluna perderia a função. É a mesma disciplina
 * de `versaoDoPrompt` em `prompts/tipos.ts`: prompt em produção não se edita,
 * se versiona.
 *
 * O preço disso é saber que isto vai quebrar de novo quando o fornecedor
 * aposentar estes ids — e é um preço aceito, porque a quebra é RUIDOSA (falha
 * em bloco, nada gravado, motivo no log) enquanto a alternativa silenciosa
 * seria a análise mudar de modelo sem ninguém notar.
 */
export function modelosGemini(): CatalogoDeModelos {
  return {
    economico: process.env.GEMINI_MODELO_ECONOMICO?.trim() || "gemini-3.7-flash",
    premium: process.env.GEMINI_MODELO_PREMIUM?.trim() || "gemini-3.1-pro-preview",
  };
}

/**
 * As chaves de JSON Schema que o Gemini não digere — removidas da CÓPIA que vai
 * para ele, nunca do schema que valida a resposta aqui.
 *
 * ## Como esta lista foi descoberta, e por que não é um chute
 *
 * Em 21/08 a leitura falhou 21 vezes com `INVALID_ARGUMENT` — sem dizer qual
 * argumento. `scripts/diagnosticar-requisicao-de-ia.ts` bissecou até o fim, e o
 * resultado foi mais sutil do que "o Gemini não aceita X":
 *
 *   OK       additionalProperties: false, isolado
 *   OK       array com maxItems, isolado
 *   FALHOU   o schema real (que tem os dois, em todo nível)
 *   OK       o schema real sem eles
 *
 * Isolados, inofensivos; no schema inteiro, fatais. É limite de complexidade
 * agregada, não incompatibilidade de construto — e por isso testar os
 * construtos um a um, que foi a primeira tentativa, aprovou todos e não
 * explicou nada.
 *
 * `$schema` entra na lista pela mesma disciplina: a configuração que passou no
 * teste removia as quatro. Removê-la também não custa nada, e manter só três
 * seria afirmar que a quarta é inofensiva sem ter medido isso.
 *
 * ## O que NÃO se perde removendo
 *
 * `maxItems` vem de `.max(LIMITE_DE_EXIGENCIAS)` e `.max(LIMITE_DE_RISCOS)` em
 * `schemas.ts`, e continua valendo — o `zod` recusa a resposta longa demais no
 * nosso lado, que é onde a garantia importa. O schema enviado é uma INSTRUÇÃO
 * ao modelo; o schema que decide o que vira dado é o outro, e ele não muda.
 *
 * Mesma coisa com `additionalProperties: false`: campo extra que o modelo
 * invente é descartado por `z.object` na validação, e nada além do que
 * `evidencia.ts` confere contra o texto vira `Campo`.
 */
const CHAVES_QUE_O_GEMINI_RECUSA = ["$schema", "additionalProperties", "maxItems", "minItems"];

/**
 * O mesmo schema, no dialeto do fornecedor.
 *
 * Mora aqui, e não em `schemas.ts`, pela fronteira que o cabeçalho deste
 * arquivo declara: `jsonSchemaParaModelo` produz JSON Schema padrão, que é
 * neutro; conhecer as manias do Gemini é trabalho deste arquivo e de mais
 * nenhum. Trocar de fornecedor é escrever outro irmão daqui — não é mexer no
 * schema do domínio.
 */
export function noDialetoDoGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map((item) => noDialetoDoGemini(item));
  if (schema === null || typeof schema !== "object") return schema;

  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(schema as Record<string, unknown>)) {
    if (CHAVES_QUE_O_GEMINI_RECUSA.includes(chave)) continue;
    saida[chave] = noDialetoDoGemini(valor);
  }
  return saida;
}

/** A chave, lida na hora do uso — configurar o ambiente não deve exigir build. */
export function chaveDoGemini(): string | null {
  const chave = process.env.GEMINI_API_KEY?.trim();
  return chave && chave.length > 0 ? chave : null;
}

/**
 * A parte do SDK de que dependemos, reduzida ao mínimo.
 *
 * Serve para o teste substituir a chamada sem tocar em rede e sem simular a
 * classe inteira do fornecedor — e para deixar explícito o quanto deste SDK
 * este projeto realmente usa.
 */
export type ChamadaDeGeracao = (parametros: {
  model: string;
  contents: string;
  config: Record<string, unknown>;
}) => Promise<GenerateContentResponse>;

export type OpcoesDoProvedorGemini = {
  /** Substitui a leitura de `GEMINI_API_KEY`. Use em script, não em rota. */
  apiKey?: string;
  /** Substitui a chamada ao SDK. Existe para teste. */
  chamada?: ChamadaDeGeracao;
};

function usoDaResposta(resposta: GenerateContentResponse): UsoDeTokens {
  const u = resposta.usageMetadata;
  const entrada = u?.promptTokenCount ?? 0;
  // `thoughtsTokenCount` é cobrado como saída nos modelos com raciocínio. Deixar
  // de somar produziria um custo estimado sistematicamente menor que a fatura —
  // o tipo de erro que só aparece quando a fatura chega.
  const saida = (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0);
  return {
    entrada,
    saida,
    total: u?.totalTokenCount ?? entrada + saida,
  };
}

/**
 * Traduz o erro do fornecedor para a categoria que muda a nossa decisão.
 *
 * O objetivo não é reportar bonito: é responder "vale retentar?". 429 e 5xx
 * passam sozinhos; 401/403 é chave errada e vai continuar errada; 400 é pedido
 * nosso malformado e insistir só esconde o bug.
 */
export function classificarErro(erro: unknown): { falha: ModoDeFalha; motivo: string } {
  if (erro instanceof Error && erro.name === "AbortError") {
    return { falha: "cancelado", motivo: "A geração foi cancelada antes de terminar." };
  }

  if (erro instanceof ApiError) {
    const status = erro.status;
    if (status === 401 || status === 403) {
      return {
        falha: "sem_credencial",
        motivo: `O fornecedor recusou a credencial (HTTP ${status}). Confira GEMINI_API_KEY.`,
      };
    }
    if (status === 429) {
      // A mensagem do Google vai junto, e não deveria ter sido descartada.
      //
      // Todo outro ramo desta função preserva `erro.message`; só o 429 resumia
      // tudo a "cota excedida". O problema apareceu em 24/08, quando a leitura
      // parou o dia inteiro por 429 e as 55 ocorrências guardadas no banco não
      // sabiam dizer QUAL cota: por minuto ou por dia, do modelo ou do projeto.
      // É justamente essa distinção que separa "espere um pouco" de "o tier
      // gratuito acabou, ligue o faturamento" — e sem ela a investigação vira
      // adivinhação.
      return {
        falha: "limite",
        motivo: `Cota ou limite de requisições excedido (HTTP 429): ${erro.message}`,
      };
    }
    if (status >= 500) {
      return { falha: "rede", motivo: `O fornecedor respondeu HTTP ${status}.` };
    }
    return {
      falha: "desconhecida",
      motivo: `O fornecedor recusou a requisição (HTTP ${status}): ${erro.message}`,
    };
  }

  if (erro instanceof Error) {
    // Falha de rede do `fetch` não tem tipo próprio; sobra a mensagem.
    return { falha: "rede", motivo: `Falha de rede ao chamar o modelo: ${erro.message}` };
  }

  return { falha: "desconhecida", motivo: "Falha não identificada ao chamar o modelo." };
}

/**
 * Extrai o JSON da resposta.
 *
 * Mesmo com saída estruturada, um modelo às vezes devolve o JSON dentro de uma
 * cerca de markdown. Retirar a cerca é conserto de forma, não de conteúdo — não
 * "arruma" a resposta, só desembrulha. Qualquer coisa além disso seria adivinhar
 * o que o modelo quis dizer, e aí a validação deixaria de valer alguma coisa.
 */
export function desembrulharJson(texto: string): string {
  const t = texto.trim();
  if (!t.startsWith("```")) return t;
  return t
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

const RECUSAS = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "RECITATION", "SPII"]);

export function criarProvedorGemini(opcoes: OpcoesDoProvedorGemini = {}): ProvedorDeIA {
  const chamadaInjetada = opcoes.chamada;

  function chamada(): ChamadaDeGeracao {
    if (chamadaInjetada) return chamadaInjetada;
    const apiKey = opcoes.apiKey ?? chaveDoGemini();
    // Cliente criado por chamada, e não no módulo: se fosse no módulo, importar
    // este arquivo sem chave configurada quebraria o build de qualquer página
    // que tocasse a camada — exatamente o que a regra "sem chave o sistema não
    // finge" existe para evitar.
    const ai = new GoogleGenAI({ apiKey: apiKey ?? undefined });
    return (parametros) => ai.models.generateContent(parametros);
  }

  return {
    nome: "gemini",

    configurado() {
      return Boolean(chamadaInjetada ?? opcoes.apiKey ?? chaveDoGemini());
    },

    async gerarEstruturado<T>(pedido: PedidoEstruturado<T>): Promise<ResultadoDaGeracao<T>> {
      const comeco = Date.now();
      const falhar = (
        falha: ModoDeFalha,
        motivo: string,
        uso: UsoDeTokens = SEM_USO,
      ): ResultadoDaGeracao<T> => ({
        ok: false,
        falha,
        motivo,
        modelo: pedido.modelo,
        uso,
        duracaoMs: Date.now() - comeco,
        tentativas: 1,
      });

      if (!this.configurado()) {
        return falhar(
          "sem_credencial",
          "GEMINI_API_KEY não está configurada neste ambiente.",
        );
      }

      let resposta: GenerateContentResponse;
      try {
        resposta = await chamada()({
          model: pedido.modelo,
          contents: pedido.prompt,
          config: {
            // Extração não é tarefa criativa. Temperatura acima de zero aqui
            // significa, na prática, variar a exigência lida entre execuções do
            // mesmo edital — e um produto que muda de resposta sem o edital
            // mudar não é auditável.
            temperature: pedido.temperatura ?? 0,
            maxOutputTokens: pedido.maxTokensDeSaida ?? 8_192,
            responseMimeType: "application/json",
            responseJsonSchema: noDialetoDoGemini(jsonSchemaParaModelo(pedido.schema)),
            ...(pedido.instrucaoDeSistema
              ? { systemInstruction: pedido.instrucaoDeSistema }
              : {}),
            ...(pedido.sinal ? { abortSignal: pedido.sinal } : {}),
          },
        });
      } catch (erro) {
        const { falha, motivo } = classificarErro(erro);
        return falhar(falha, motivo);
      }

      const uso = usoDaResposta(resposta);
      const motivoDeParada = resposta.candidates?.[0]?.finishReason;

      if (motivoDeParada && RECUSAS.has(String(motivoDeParada))) {
        return falhar(
          "recusa",
          `O modelo interrompeu a resposta (${motivoDeParada}). Não há o que retentar.`,
          uso,
        );
      }

      if (String(motivoDeParada) === "MAX_TOKENS") {
        // JSON cortado no meio é sempre inválido. Nomear a causa certa evita a
        // retentativa corretiva inútil — o problema é tamanho, não formato.
        return falhar(
          "resposta_invalida",
          "A resposta foi cortada por atingir o limite de tokens de saída. Reduza o trecho enviado ou aumente o limite.",
          uso,
        );
      }

      const texto = resposta.text;
      if (!texto || texto.trim().length === 0) {
        return falhar("resposta_invalida", "O modelo devolveu resposta vazia.", uso);
      }

      let cru: unknown;
      try {
        cru = JSON.parse(desembrulharJson(texto));
      } catch {
        return falhar(
          "resposta_invalida",
          "A resposta do modelo não é JSON válido.",
          uso,
        );
      }

      const validado = pedido.schema.safeParse(cru);
      if (!validado.success) {
        return falhar(
          "resposta_invalida",
          `A resposta não satisfaz o schema${pedido.nomeDoSchema ? ` ${pedido.nomeDoSchema}` : ""}:\n${descreverErroDeValidacao(validado.error)}`,
          uso,
        );
      }

      return {
        ok: true,
        valor: validado.data,
        modelo: resposta.modelVersion ?? pedido.modelo,
        uso,
        duracaoMs: Date.now() - comeco,
        tentativas: 1,
      };
    },
  };
}
