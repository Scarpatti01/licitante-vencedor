/**
 * Qual parâmetro da NOSSA requisição o modelo está rejeitando?
 *
 *   node scripts/diagnosticar-requisicao-de-ia.ts
 *
 * Existe por causa da segunda falha da leitura, em 21/08. A primeira foi o id
 * do modelo (404, `gemini-2.5-pro is no longer available`); trocado o id, a
 * segunda veio assim, nos 21 editais:
 *
 *   HTTP 400: {"error":{"code":400,"message":"Request contains an invalid
 *   argument.","status":"INVALID_ARGUMENT"}}
 *
 * O modelo existe e responde — ele recusa o FORMATO do que mandamos. E a
 * mensagem não diz qual argumento, o que torna o chute especialmente
 * convidativo: são cinco candidatos (`temperature`, `maxOutputTokens`,
 * `responseMimeType`, `responseJsonSchema`, `systemInstruction`), e trocar um
 * de cada vez em produção custaria uma rodada de 10 minutos por tentativa.
 *
 * ## Por que este script e não o `listar-modelos-de-ia.ts`
 *
 * Aquele passou a CHAMAR o modelo, e foi o que permitiu dizer "chamada: OK"
 * para os dois ids novos. Mas ele manda um "ping" — texto puro, sem schema.
 * Foi um teste verdadeiro e insuficiente: aprovou dois modelos que, minutos
 * depois, recusaram a requisição real 21 vezes.
 *
 * A lição, que é a mesma do falso OK da listagem, um degrau acima: **um teste
 * que não exerce o caminho de produção aprova coisas que a produção reprova.**
 * Este script manda o schema REAL (`respostaDeAnaliseDeEdital`), pelo MESMO
 * SDK, com a MESMA config de `gemini.ts` — e vai acrescentando um parâmetro
 * por vez até algo quebrar. O primeiro degrau que falhar é o culpado.
 */

import { GoogleGenAI } from "@google/genai";
import { jsonSchemaParaModelo, respostaDeAnaliseDeEdital } from "../src/lib/ia/schemas.ts";

/** Mesmo código de saída dos outros scripts: "falta configurar", não "quebrou". */
const SEM_CONFIGURACAO = 78;

/**
 * Os degraus, do mais simples ao que a produção realmente manda.
 *
 * A ordem importa: cada um acrescenta ao anterior, então o primeiro que falha
 * isola o parâmetro. Os valores são os de `gemini.ts`, não valores de teste —
 * um diagnóstico com `maxOutputTokens: 16` responderia sobre outra requisição
 * que não a nossa.
 */
function degraus(): { nome: string; config: Record<string, unknown> }[] {
  const base = { temperature: 0 };
  const comTeto = { ...base, maxOutputTokens: 8_192 };
  const comJson = { ...comTeto, responseMimeType: "application/json" };
  const comSchema = { ...comJson, responseJsonSchema: jsonSchemaParaModelo(respostaDeAnaliseDeEdital) };

  return [
    { nome: "1. texto puro, sem config", config: {} },
    { nome: "2. + temperature: 0", config: base },
    { nome: "3. + maxOutputTokens: 8192", config: comTeto },
    { nome: "4. + responseMimeType: json", config: comJson },
    { nome: "5. + responseJsonSchema (o schema real)", config: comSchema },
    {
      nome: "6. + systemInstruction (= o que a produção manda)",
      config: { ...comSchema, systemInstruction: "Você extrai dados de editais." },
    },
  ];
}

async function testar(cliente: GoogleGenAI, modelo: string): Promise<void> {
  console.log(`\n=== ${modelo} ===`);

  for (const { nome, config } of degraus()) {
    try {
      await cliente.models.generateContent({
        model: modelo,
        // Um pedido mínimo mas COERENTE com o schema: pedir JSON estruturado
        // sobre um texto vazio confundiria "o modelo recusou o formato" com "o
        // modelo não tinha o que responder".
        contents:
          "Extraia o que puder deste edital: Pregão Eletrônico 1/2026, aquisição de material de limpeza. " +
          "Exige certidão negativa federal e FGTS. Sem garantia, sem visita técnica.",
        config,
      });
      console.log(`  OK       ${nome}`);
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      console.log(`  FALHOU   ${nome}`);
      console.log(`           ${mensagem.slice(0, 300).replace(/\s+/g, " ")}`);
      // Para no primeiro erro: os degraus seguintes contêm este, então
      // continuar só repetiria a mesma falha com ruído a mais.
      return;
    }
  }
}

async function main() {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) {
    console.log("sem GEMINI_API_KEY configurada — nada a diagnosticar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const cliente = new GoogleGenAI({ apiKey: chave });

  const modelos = {
    economico: process.env.GEMINI_MODELO_ECONOMICO?.trim() || "gemini-3.7-flash",
    premium: process.env.GEMINI_MODELO_PREMIUM?.trim() || "gemini-3.1-pro-preview",
  };

  console.log("Sobe um parâmetro por vez até quebrar. O primeiro FALHOU é o culpado.");
  console.log(`SDK: @google/genai · econômico: ${modelos.economico} · premium: ${modelos.premium}`);

  // Os DOIS, sempre: a leitura de hoje mandou tudo para o premium (os 21
  // editais foram classificados como grandes), então o econômico continua sem
  // ter sido exercitado de verdade contra o schema. Descobrir que só um dos
  // dois aceita a requisição é, por si só, uma resposta útil.
  for (const modelo of Object.values(modelos)) {
    await testar(cliente, modelo);
  }
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
