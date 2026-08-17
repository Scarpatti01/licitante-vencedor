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
 */
export function modelosGemini(): CatalogoDeModelos {
  return {
    economico: process.env.GEMINI_MODELO_ECONOMICO?.trim() || "gemini-2.5-flash",
    premium: process.env.GEMINI_MODELO_PREMIUM?.trim() || "gemini-2.5-pro",
  };
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
      return { falha: "limite", motivo: "Cota ou limite de requisições excedido (HTTP 429)." };
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
            responseJsonSchema: jsonSchemaParaModelo(pedido.schema),
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
