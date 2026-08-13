/**
 * Comparação de texto de edital.
 *
 * Objeto de licitação é escrito por centenas de órgãos diferentes, sem padrão:
 * "AQUISIÇÃO DE MATERIAL DE LIMPEZA", "Contratação de empresa especializada na
 * prestação de serviços de limpeza predial", "REGISTRO DE PREÇOS P/ LIMPEZA".
 * Comparar isso com `includes` cru erra por acento, por caixa e por plural.
 *
 * O que está aqui é deliberadamente simples e determinístico. Casamento
 * semântico de verdade é trabalho do índice vetorial (`pgvector`), que roda com
 * embedding e não com regra de string — mas ele custa e falha, e o produto
 * precisa funcionar sem ele. Estas funções são o piso confiável.
 */

/** Sem acento, minúsculo, pontuação virando espaço. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Radical grosseiro, para "limpeza"/"limpezas" e "serviço"/"serviços" casarem.
 *
 * Não é stemmer de verdade e não pretende ser: corta plural simples e alguns
 * sufixos comuns em português. Um stemmer completo (RSLP) erraria menos em
 * texto corrido, mas aqui o custo do falso negativo é alto e o do falso
 * positivo é baixo — mostrar um edital a mais é irritante, esconder um que a
 * empresa ganharia é perder o cliente.
 */
export function radical(palavra: string): string {
  let p = palavra;
  if (p.length > 4 && p.endsWith("s")) p = p.slice(0, -1);
  if (p.length > 5 && (p.endsWith("ao") || p.endsWith("oes"))) p = p.slice(0, -2);
  return p;
}

const IRRELEVANTES = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "para", "por", "com", "sem", "a", "o", "as", "os",
  "ao", "aos", "na", "no", "nas", "nos", "um", "uma", "que", "the", "of",
  // Ruído de edital: aparece em quase todo objeto e não distingue nada.
  "aquisicao", "contratacao", "prestacao", "servico", "servicos", "empresa",
  "especializada", "registro", "precos", "eventual", "futura", "fornecimento",
]);

/** Palavras significativas de um texto, já normalizadas e sem ruído de edital. */
export function termosSignificativos(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((p) => p.length > 2 && !IRRELEVANTES.has(p))
    .map(radical);
}

/**
 * Quais dos termos procurados aparecem no texto.
 *
 * Devolve os termos ENCONTRADOS, e não um booleano ou uma contagem, porque a
 * interface precisa dizer ao usuário *qual* palavra dele casou com o edital.
 * "Compatível" sem dizer por quê é exatamente o tipo de caixa-preta que este
 * produto não pode ser.
 */
export function termosEncontrados(texto: string, procurados: string[]): string[] {
  if (procurados.length === 0) return [];
  const alvo = ` ${termosSignificativos(texto).join(" ")} `;
  const achados: string[] = [];

  for (const procurado of procurados) {
    const termos = termosSignificativos(procurado);
    if (termos.length === 0) continue;
    // Expressão de várias palavras ("material de limpeza") só conta quando
    // TODAS as suas palavras significativas aparecem. Casar por uma palavra
    // solta transformaria "material hospitalar" em acerto de "material".
    const casou = termos.every((t) => alvo.includes(` ${t} `));
    if (casou) achados.push(procurado);
  }
  return achados;
}

/**
 * Que fração dos termos de `referencia` aparece em `texto` (0..1).
 *
 * Existe porque `termosEncontrados` responde à pergunta errada quando os dois
 * lados são descrições livres. Um atestado diz "limpeza predial em unidades
 * administrativas"; o edital diz "serviços de limpeza predial". Exigir que
 * TODAS as palavras do atestado apareçam no edital reprova um atestado que
 * cobre o objeto inteiro só porque ele é mais específico — foi exatamente o que
 * o teste do score pegou.
 *
 * A direção certa é esta: quanto do que o EDITAL pede está descrito no
 * atestado. `referencia` é o edital, `texto` é o atestado.
 */
export function coberturaDeTermos(texto: string, referencia: string): number {
  const termosDaReferencia = [...new Set(termosSignificativos(referencia))];
  if (termosDaReferencia.length === 0) return 0;
  const alvo = ` ${termosSignificativos(texto).join(" ")} `;
  const cobertos = termosDaReferencia.filter((t) => alvo.includes(` ${t} `)).length;
  return cobertos / termosDaReferencia.length;
}
