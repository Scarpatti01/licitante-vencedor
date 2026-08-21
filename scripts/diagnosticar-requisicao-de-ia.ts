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

      // O degrau do schema merece uma segunda rodada: saber que "é o schema"
      // não diz se o problema é o CAMPO (`responseJsonSchema` não suportado)
      // ou o CONTEÚDO (algo dentro do nosso schema). São correções
      // diferentes, e a diferença não aparece na mensagem do fornecedor.
      if (nome.includes("responseJsonSchema")) await bissecarSchema(cliente, modelo);

      // Para no primeiro erro: os degraus seguintes contêm este, então
      // continuar só repetiria a mesma falha com ruído a mais.
      return;
    }
  }
}

/**
 * "É o schema" é resposta incompleta. Qual parte dele?
 *
 * Rodado em 21/08, o degrau 5 falhou com `INVALID_ARGUMENT` e a mensagem não
 * disse mais nada. O schema real tem três suspeitos que a inspeção local
 * revelou — `$schema` (chave de topo do draft-2020-12), `anyOf` (a união dos
 * quatro tipos de `Campo`) e `additionalProperties` — e cada um tem uma
 * correção diferente. Testar um schema mínimo primeiro separa "o campo não
 * serve" de "o nosso schema não serve", que é a bifurcação mais cara de errar.
 */
async function bissecarSchema(cliente: GoogleGenAI, modelo: string): Promise<void> {
  const real = jsonSchemaParaModelo(respostaDeAnaliseDeEdital);

  // Sem a chave de topo do dialeto. Fornecedor que valida o schema contra uma
  // lista própria de chaves permitidas costuma recusar `$schema` justamente
  // por não conhecê-la.
  const semDialeto = { ...real };
  delete (semDialeto as Record<string, unknown>).$schema;

  const variantes: { nome: string; config: Record<string, unknown> }[] = [
    {
      nome: "5a. schema MÍNIMO via responseJsonSchema",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { resumo: { type: "string" } },
          required: ["resumo"],
        },
      },
    },
    {
      nome: "5b. schema real SEM a chave $schema",
      config: { responseMimeType: "application/json", responseJsonSchema: semDialeto },
    },
    {
      nome: "5c. schema real pelo campo responseSchema (não JsonSchema)",
      config: { responseMimeType: "application/json", responseSchema: semDialeto },
    },

    /*
     * Os construtos, um a um.
     *
     * Provado que o CAMPO serve (5a passou) e que nem `$schema` nem a troca de
     * campo explicam (5b e 5c falharam), sobra o conteúdo. A inspeção local
     * apontou quatro candidatos, e cada um tem uma correção diferente — de
     * "traduzir o dialeto na saída de `jsonSchemaParaModelo`" a "mudar o
     * contrato do domínio". Testar isolado é a diferença entre corrigir e
     * tentar.
     */
    {
      // O suspeito nº 1: é assim que `zod` escreve `.nullable()`, e são 32
      // ocorrências no schema real — quase todo campo de `Campo`.
      nome: "5d. anulável como anyOf [string, null]",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { valor: { anyOf: [{ type: "string" }, { type: "null" }] } },
          required: ["valor"],
        },
      },
    },
    {
      // O mesmo campo anulável, escrito no dialeto que o fornecedor costuma
      // preferir. Se este passar e o 5d falhar, a correção é uma tradução na
      // saída de `jsonSchemaParaModelo` — sem tocar no domínio.
      nome: "5e. anulável como nullable: true",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { valor: { type: "string", nullable: true } },
          required: ["valor"],
        },
      },
    },
    {
      nome: "5f. enum (como em `confianca`)",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { confianca: { type: "string", enum: ["alta", "media", "baixa"] } },
          required: ["confianca"],
        },
      },
    },
    {
      // O schema real tem profundidade 11. Alguns fornecedores limitam o
      // aninhamento, e o sintoma é o mesmo INVALID_ARGUMENT genérico.
      nome: "5g. aninhamento profundo (11 níveis)",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: aninhado(11),
      },
    },

    /*
     * Os dois que faltavam — e que estavam no schema desde sempre.
     *
     * A primeira rodada de construtos (5d–5g) passou em TODOS, o que só podia
     * significar uma coisa: o suspeito não estava entre os que eu tinha
     * listado. Foi preciso voltar e ler o schema inteiro, chave por chave, em
     * vez de conferir os candidatos que a memória sugeria — `additionalProperties`
     * e `maxItems` estavam lá o tempo todo, em todo nível de objeto e nos dois
     * arrays.
     */
    {
      nome: "5h. additionalProperties: false",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { valor: { type: "string" } },
          required: ["valor"],
          additionalProperties: false,
        },
      },
    },
    {
      nome: "5i. array com maxItems",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { itens: { type: "array", maxItems: 60, items: { type: "string" } } },
          required: ["itens"],
        },
      },
    },
    {
      // O candidato a CORREÇÃO, não só a diagnóstico: se o schema real passa
      // depois de removidas estas chaves, a conserto é uma tradução na saída
      // de `jsonSchemaParaModelo` — sem tocar no domínio nem no contrato de
      // `Campo`.
      nome: "5j. schema REAL sem additionalProperties e sem maxItems",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: semChaves(semDialeto, ["additionalProperties", "maxItems", "minItems"]),
      },
    },
  ];

  console.log("           --- bisseção do schema ---");
  for (const { nome, config } of variantes) {
    try {
      await cliente.models.generateContent({
        model: modelo,
        contents: "Resuma em uma frase: Pregão Eletrônico 1/2026, material de limpeza.",
        config,
      });
      console.log(`           OK       ${nome}`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      console.log(`           FALHOU   ${nome}`);
      console.log(`                    ${m.slice(0, 220).replace(/\s+/g, " ")}`);
    }
  }
}

/** Remove as chaves indicadas em TODOS os níveis, sem alterar o original. */
function semChaves(schema: unknown, chaves: string[]): unknown {
  if (Array.isArray(schema)) return schema.map((i) => semChaves(i, chaves));
  if (schema === null || typeof schema !== "object") return schema;

  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (chaves.includes(k)) continue;
    saida[k] = semChaves(v, chaves);
  }
  return saida;
}

/** Um objeto com `niveis` de aninhamento, para medir o teto de profundidade. */
function aninhado(niveis: number): Record<string, unknown> {
  let atual: Record<string, unknown> = { type: "string" };
  for (let i = 0; i < niveis; i++) {
    atual = { type: "object", properties: { n: atual }, required: ["n"] };
  }
  return atual;
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
