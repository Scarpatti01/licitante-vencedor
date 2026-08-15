/**
 * O endereço de um post.
 *
 * ## O que entra, e por quê
 *
 * `pregao-eletronico-merenda-escolar-rede-municipal-90012-2026`
 *
 * Três partes: a modalidade, o começo do objeto e o identificador da fonte.
 *
 * **A modalidade na frente** porque é a primeira coisa que o fornecedor filtra:
 * pregão eletrônico ele disputa de qualquer lugar do país, presencial não.
 *
 * **O objeto no meio** porque é o que a pessoa digita no buscador — "merenda
 * escolar", "material de expediente", "coleta de lixo". É a parte que faz a URL
 * ser encontrada.
 *
 * **O identificador no fim** porque é o que garante unicidade. Dois municípios
 * publicam "aquisição de gêneros alimentícios" no mesmo dia com frequência; sem
 * um sufixo estável, o segundo sobrescreveria o primeiro.
 *
 * ## Por que o corte é por palavra inteira
 *
 * Cortar em N caracteres partiria "aliment" no meio, e uma URL com palavra
 * quebrada parece defeito para quem a lê — e ela é lida: aparece no resultado de
 * busca, no link compartilhado no WhatsApp e na barra do navegador.
 */

const SEPARADOR = "-";

/** Sem acento, minúsculo, só letras, números e hífen. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, SEPARADOR)
    .replace(/^-+|-+$/g, "");
}

/**
 * Palavras que só ocupam espaço na URL.
 *
 * Preposições e o vocabulário burocrático que abre quase todo objeto de edital
 * ("contratação de empresa especializada para o fornecimento de…"). Tirá-las faz
 * a parte útil do objeto caber no limite — sem elas, metade das URLs começaria
 * igual e a palavra que interessa ficaria de fora do corte.
 */
const VAZIAS = new Set([
  "a", "as", "o", "os", "de", "do", "da", "dos", "das", "e", "em", "no", "na",
  "nos", "nas", "para", "por", "com", "ao", "aos", "que", "ou", "um", "uma",
  "contratacao", "aquisicao", "fornecimento", "prestacao", "servicos", "servico",
  "empresa", "especializada", "eventual", "futura", "futuras", "visando",
  "destinado", "destinada", "destinados", "destinadas", "atender", "objeto",
  "registro", "precos", "preco",
]);

/** Teto de palavras do objeto no slug. */
const PALAVRAS_DO_OBJETO = 6;

/**
 * O identificador estável, extraído do id da fonte.
 *
 * O `numeroControlePNCP` tem a forma `CNPJ-1-NNNNNN/AAAA`. O que identifica o
 * certame para um humano é o número e o ano — o CNPJ do órgão já está implícito
 * no município da URL, e repeti-lo daria um slug de 14 dígitos que ninguém lê.
 */
export function sufixoDoIdentificador(idNaFonte: string): string {
  const partes = idNaFonte.split(/[-/]/).filter(Boolean);
  const ultimos = partes.slice(-2);

  // O sequencial vem com zeros à esquerda (`000082`); tirá-los deixa a URL
  // legível sem perder a identificação, já que o ano acompanha.
  const numero = ultimos[0]?.replace(/^0+/, "") || ultimos[0] || "";
  const ano = ultimos[1] ?? "";

  return normalizar([numero, ano].filter(Boolean).join(SEPARADOR)) || normalizar(idNaFonte);
}

/**
 * Tira o carimbo que o sistema publicador põe na frente do objeto.
 *
 * Medido na coleta real: **40 de 220** objetos (18%) começam com algo como
 * `"[Portal de Compras Públicas] - AQUISIÇÃO DE VEÍCULOS…"`. O colchete não é
 * descrição do que está sendo comprado — é o nome da plataforma que publicou,
 * injetado por ela.
 *
 * Na URL ele é puro ruído: empurra as palavras que a pessoa busca para fora do
 * corte, e faz um em cada cinco endereços começar igual. No título, ele rouba a
 * primeira linha do resultado de busca.
 *
 * O objeto **completo e literal** continua exibido no corpo da página. Isto aqui
 * não apaga informação; escolhe o que vai para o endereço e para o título.
 */
export function semCarimboDoPortal(objeto: string): string {
  return objeto.replace(/^\s*\[[^\]]{3,60}\]\s*[-–—:]?\s*/, "").trim() || objeto.trim();
}

export function slugDoPost(entrada: {
  modalidade: string;
  objeto: string;
  idNaFonte: string;
}): string {
  const modalidade = normalizar(entrada.modalidade);

  const palavras = normalizar(semCarimboDoPortal(entrada.objeto))
    .split(SEPARADOR)
    // Números soltos no meio do objeto ("lote 3", "2026") não ajudam a
    // encontrar a página e competem com as palavras que ajudam.
    .filter((p) => p.length > 2 && !VAZIAS.has(p) && !/^\d+$/.test(p))
    .slice(0, PALAVRAS_DO_OBJETO);

  const partes = [modalidade, palavras.join(SEPARADOR), sufixoDoIdentificador(entrada.idNaFonte)];
  return partes.filter(Boolean).join(SEPARADOR);
}
