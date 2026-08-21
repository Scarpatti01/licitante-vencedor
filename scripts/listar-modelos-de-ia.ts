/**
 * Pergunta ao fornecedor quais modelos a NOSSA chave realmente tem.
 *
 *   node scripts/listar-modelos-de-ia.ts
 *
 * Existe por causa de uma falha real, em 21/08: a primeira leitura de verdade
 * de oportunidade de cliente falhou nos 21 editais, todos com o mesmo erro —
 *
 *   HTTP 404: This model models/gemini-2.5-pro is no longer available to new
 *   users. Please update your code to use models/gemini-3.1-pro-preview
 *
 * O comentário de `ia/gemini.ts` já previa a categoria do defeito ("IDs de
 * modelo envelhecem rápido e são a coisa mais fácil de errar sem perceber: um
 * ID inexistente falha só em produção, na primeira análise real"). O que
 * faltava era como DESCOBRIR o ID certo sem chutar.
 *
 * Chutar é o que este script existe para evitar. A mensagem de erro sugeriu um
 * substituto para o premium e não disse nada sobre o econômico — e preencher o
 * econômico "por analogia" seria a mesma invenção de certeza que
 * `PRECOS_POR_MODELO` recusa fazer com preço. A fonte da verdade é a API.
 *
 * Não altera nada: lê e imprime. Quem decide o ID novo é uma pessoa, olhando a
 * lista, e a troca é por variável de ambiente
 * (`GEMINI_MODELO_ECONOMICO`/`GEMINI_MODELO_PREMIUM`) ou por commit no
 * catálogo de `ia/gemini.ts`.
 */

/** Mesmo código de saída dos outros scripts: "falta configurar", não "quebrou". */
const SEM_CONFIGURACAO = 78;

type ModeloDaApi = {
  name?: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
};

async function main() {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) {
    console.log("sem GEMINI_API_KEY configurada — nada a listar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  /*
   * REST direto, e não o SDK: `@google/genai` expõe `models.list()`, mas o que
   * se quer aqui é exatamente o que o servidor respondeu, sem uma camada no
   * meio que possa normalizar, filtrar ou traduzir a resposta. Quando o
   * objetivo é descobrir a verdade sobre o fornecedor, quanto menos
   * intermediário, melhor.
   *
   * A chave vai no cabeçalho, não na query string: em query ela vazaria para
   * o log de qualquer proxy no caminho.
   */
  const modelos: ModeloDaApi[] = [];
  let pagina: string | undefined;

  do {
    const consulta = new URLSearchParams({ pageSize: "200" });
    if (pagina) consulta.set("pageToken", pagina);

    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?${consulta}`,
      { headers: { "x-goog-api-key": chave } },
    );

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      throw new Error(`o fornecedor recusou a listagem (HTTP ${resposta.status}): ${corpo.slice(0, 400)}`);
    }

    const dados = (await resposta.json()) as { models?: ModeloDaApi[]; nextPageToken?: string };
    modelos.push(...(dados.models ?? []));
    pagina = dados.nextPageToken;
  } while (pagina);

  // Só os que servem para o que este produto faz. Um modelo de embedding na
  // lista é ruído para quem está procurando com o que analisar um edital.
  const geram = modelos.filter((m) => m.supportedGenerationMethods?.includes("generateContent"));

  console.log(`${modelos.length} modelo(s) visíveis para esta chave · ${geram.length} com generateContent\n`);

  for (const m of geram.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))) {
    // `models/` na frente é como a API nomeia; o catálogo do projeto usa o id
    // sem prefixo. Imprimir os dois evita a troca errada na hora de copiar.
    const id = (m.name ?? "").replace(/^models\//, "");
    const entrada = m.inputTokenLimit ? `entrada ${m.inputTokenLimit.toLocaleString("pt-BR")}` : "entrada ?";
    console.log(`  ${id.padEnd(42)} ${entrada.padEnd(20)} ${m.displayName ?? ""}`);
  }

  const atuais = {
    economico: process.env.GEMINI_MODELO_ECONOMICO?.trim() || "gemini-2.5-flash",
    premium: process.env.GEMINI_MODELO_PREMIUM?.trim() || "gemini-2.5-pro",
  };

  console.log("\nem uso hoje (ver `modelosGemini` em src/lib/ia/gemini.ts):");
  for (const [papel, id] of Object.entries(atuais)) {
    const existe = geram.some((m) => (m.name ?? "").replace(/^models\//, "") === id);
    console.log(`  ${papel.padEnd(10)} ${id.padEnd(42)} ${existe ? "OK" : "NÃO ESTÁ NA LISTA"}`);
  }
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
