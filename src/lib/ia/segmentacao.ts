import { normalizar } from "../dominio/texto.ts";

/**
 * Segmentação: escolher QUE PARTE do edital vai para o modelo.
 *
 * O problema é concreto e caro. Um edital de pregão eletrônico da Lei 14.133
 * passa com folga de 100 páginas — preâmbulo, objeto, termo de referência,
 * planilhas, minuta de contrato, anexos de declaração. Mandar isso inteiro tem
 * três defeitos ao mesmo tempo:
 *
 *   1. **Custo**: entrada é cobrada por token, e 90% do documento é minuta de
 *      contrato e formulário em branco que não muda nenhuma decisão.
 *   2. **Qualidade**: enterrar as quatro linhas que importam ("garantia de 5%
 *      do valor") no meio de 300 mil caracteres piora a extração em vez de
 *      melhorar. Contexto longo dilui atenção.
 *   3. **Limite**: acima de certo tamanho a chamada simplesmente não cabe.
 *
 * O critério, então, e por que ele é este:
 *
 *   - O documento é cortado em blocos nas quebras que o próprio edital usa —
 *     item numerado ("7.1.2"), CLÁUSULA, ANEXO, SEÇÃO. Cortar por número fixo
 *     de caracteres partiria uma exigência no meio, que é o pior corte possível.
 *   - Cada bloco é pontuado pelo vocabulário das seções que decidem participação:
 *     habilitação, qualificação técnica, qualificação econômico-financeira,
 *     garantia, prazos, penalidades, amostra/visita e critério de julgamento.
 *     Não é semântica: é contagem de termos normalizados, determinística e
 *     auditável — dá para explicar a um cliente por que um trecho entrou.
 *   - O primeiro bloco entra SEMPRE. É onde ficam objeto e preâmbulo, que dão
 *     ao modelo o assunto do documento; sem isso ele lê exigências soltas.
 *   - Os demais entram por pontuação, até o orçamento de caracteres acabar, e
 *     são remontados na ORDEM ORIGINAL, com marca explícita de omissão. O
 *     modelo precisa saber que existe buraco: um texto costurado sem marca
 *     parece contínuo, e aí ele preenche a lacuna sozinho.
 *
 * O que este arquivo NÃO faz: extrair texto de PDF. Isso é da camada de fontes.
 * Aqui a entrada já é texto.
 */

export type SecaoRelevante =
  | "habilitacao"
  | "qualificacao_tecnica"
  | "qualificacao_economica"
  | "garantia"
  | "prazos"
  | "penalidades"
  | "amostra_visita"
  | "julgamento";

/**
 * Vocabulário por seção, já sem acento e em minúsculas (a comparação é feita
 * contra `normalizar`, que remove acento e pontuação).
 *
 * Os termos são os que aparecem no texto legal e na praxe dos editais. Vale
 * mais errar incluindo um bloco a mais do que perder a cláusula de garantia:
 * bloco extra custa alguns centavos, exigência perdida custa o cliente.
 */
export const TERMOS_POR_SECAO: Record<SecaoRelevante, string[]> = {
  habilitacao: [
    "habilitacao",
    "documentos de habilitacao",
    "regularidade fiscal",
    "regularidade trabalhista",
    "certidao negativa",
    "fgts",
    "cndt",
    "inss",
    "sicaf",
    "contrato social",
    "cnpj",
    "inabilitacao",
  ],
  qualificacao_tecnica: [
    "qualificacao tecnica",
    "atestado de capacidade",
    "capacidade tecnica",
    "acervo tecnico",
    "crea",
    "cau",
    "responsavel tecnico",
    "registro profissional",
    "certificacao iso",
  ],
  qualificacao_economica: [
    "qualificacao economico",
    "qualificacao economica",
    "balanco patrimonial",
    "indice de liquidez",
    "liquidez corrente",
    "patrimonio liquido",
    "falencia",
    "recuperacao judicial",
    "capital social minimo",
  ],
  garantia: [
    "garantia de proposta",
    "garantia contratual",
    "garantia de execucao",
    "seguro garantia",
    "caucao",
    "fianca bancaria",
    "prestacao de garantia",
  ],
  prazos: [
    "prazo de entrega",
    "prazo de execucao",
    "prazo de vigencia",
    "cronograma",
    "sessao publica",
    "abertura das propostas",
    "impugnacao",
    "esclarecimento",
    "recurso",
    "validade da proposta",
  ],
  penalidades: [
    "penalidade",
    "sancao",
    "multa",
    "advertencia",
    "impedimento de licitar",
    "declaracao de inidoneidade",
    "rescisao",
    "inexecucao",
  ],
  amostra_visita: [
    "amostra",
    "prova de conceito",
    "visita tecnica",
    "vistoria",
    "prototipo",
    "laudo",
  ],
  julgamento: [
    "criterio de julgamento",
    "menor preco",
    "maior desconto",
    "melhor tecnica",
    "tecnica e preco",
    "maior retorno economico",
    "modo de disputa",
    "lance",
  ],
};

export const MARCA_DE_OMISSAO = "\n\n[... trecho do edital omitido por não tratar dos itens acima ...]\n\n";

/** Menor bloco que vale fechar. Abaixo disso, um título viraria bloco sozinho. */
const MINIMO_DO_BLOCO = 400;
/** Teto duro: bloco maior que isso é cortado à força, ou um anexo vira um bloco só. */
const MAXIMO_DO_BLOCO = 4_000;

/**
 * Orçamento padrão de caracteres do trecho enviado.
 *
 * ~60 mil caracteres é da ordem de 15 mil tokens de entrada em português — o
 * suficiente para as seções que decidem, e longe do limite de qualquer modelo
 * atual. O ponto não é caber: é não pagar por página em branco.
 */
export const ORCAMENTO_PADRAO = 60_000;

/**
 * Uma linha começa uma seção nova?
 *
 * Reconhece o que os editais usam de fato: item numerado ("7.", "7.1.2"),
 * cláusula, anexo, seção, capítulo, e linha inteiramente em caixa alta — que em
 * edital é quase sempre título.
 */
export function ehTitulo(linha: string): boolean {
  const l = linha.trim();
  if (l.length === 0 || l.length > 120) return false;
  if (/^\d+(\.\d+)*[.)\s-]/.test(l)) return true;
  if (/^(clausula|cláusula|anexo|secao|seção|capitulo|capítulo|titulo|título|item)\b/i.test(l)) {
    return true;
  }
  const letras = l.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letras.length >= 8 && letras === letras.toUpperCase()) return true;
  return false;
}

export type BlocoDoEdital = {
  indice: number;
  texto: string;
  pontos: number;
  secoes: SecaoRelevante[];
};

/** Corta o documento nas quebras que ele mesmo usa. Ver o cabeçalho do arquivo. */
export function dividirEmBlocos(texto: string): string[] {
  const linhas = texto.split(/\r?\n/);
  const blocos: string[] = [];
  let atual: string[] = [];
  let tamanho = 0;

  const fechar = () => {
    if (atual.length === 0) return;
    const conteudo = atual.join("\n").trim();
    if (conteudo.length > 0) blocos.push(conteudo);
    atual = [];
    tamanho = 0;
  };

  for (const linha of linhas) {
    if (tamanho >= MINIMO_DO_BLOCO && ehTitulo(linha)) fechar();
    atual.push(linha);
    tamanho += linha.length + 1;
    // Anexo sem título interno viraria um bloco de 50 mil caracteres e levaria o
    // orçamento inteiro sozinho. O corte à força evita isso.
    if (tamanho >= MAXIMO_DO_BLOCO) fechar();
  }
  fechar();

  return blocos;
}

/**
 * Comprimento a partir do qual um termo pode casar com prefixo de palavra.
 *
 * A busca precisa aceitar flexão — "penalidade" tem de achar "penalidades",
 * "recurso" tem de achar "recursos" — e por isso casa no INÍCIO da palavra sem
 * exigir o fim. Só que os editais também trazem siglas de três e quatro letras
 * (CAU, CREA, FGTS, CNDT), e aí a mesma tolerância vira armadilha: "cau" casa
 * dentro de "caução", e a cláusula de garantia passa a pontuar como
 * qualificação técnica. Termo curto, portanto, casa como palavra inteira.
 *
 * Foi exatamente esse o erro que o teste de pontuação pegou.
 */
const TAMANHO_QUE_ACEITA_FLEXAO = 5;

function contemTermo(alvoComBordas: string, termo: string): boolean {
  const inicioDePalavra = ` ${termo}`;
  if (termo.length < TAMANHO_QUE_ACEITA_FLEXAO) {
    return alvoComBordas.includes(`${inicioDePalavra} `);
  }
  return alvoComBordas.includes(inicioDePalavra);
}

/** Pontuação de um bloco: quantos termos de cada seção relevante ele contém. */
export function pontuarBloco(texto: string): { pontos: number; secoes: SecaoRelevante[] } {
  const alvo = ` ${normalizar(texto)} `;
  const secoes: SecaoRelevante[] = [];
  let pontos = 0;

  for (const [secao, termos] of Object.entries(TERMOS_POR_SECAO) as [
    SecaoRelevante,
    string[],
  ][]) {
    let acertos = 0;
    for (const termo of termos) {
      if (contemTermo(alvo, termo)) acertos += 1;
    }
    if (acertos > 0) {
      secoes.push(secao);
      // Peso decrescente: o segundo termo da mesma seção confirma, mas não
      // dobra a relevância. Sem isso, uma lista de certidões repetidas venceria
      // a cláusula de garantia, que aparece uma vez e decide a participação.
      pontos += 1 + Math.log2(acertos);
    }
  }

  return { pontos, secoes };
}

export type Segmentacao = {
  /** O texto que vai para o prompt, já remontado em ordem e com marcas de omissão. */
  texto: string;
  caracteresOriginais: number;
  caracteresSelecionados: number;
  blocosTotais: number;
  blocosSelecionados: number;
  /** Seções relevantes efetivamente presentes no que foi selecionado. */
  secoesEncontradas: SecaoRelevante[];
  /** `true` quando algum trecho ficou de fora — de boilerplate a cláusula. */
  omitiu: boolean;
  /**
   * `true` quando um bloco RELEVANTE ficou de fora por falta de orçamento.
   *
   * Diferente de `omitiu`: descartar minuta de contrato é o objetivo do
   * exercício; descartar uma cláusula pontuada é sinal de edital grande demais,
   * e é este sinal que faz a política em `custo.ts` escalar de modelo.
   */
  descartouRelevante: boolean;
};

export function segmentarEdital(
  texto: string,
  { orcamento = ORCAMENTO_PADRAO }: { orcamento?: number } = {},
): Segmentacao {
  const limpo = texto.replace(/[ \t]+\n/g, "\n").trim();

  if (limpo.length === 0) {
    return {
      texto: "",
      caracteresOriginais: 0,
      caracteresSelecionados: 0,
      blocosTotais: 0,
      blocosSelecionados: 0,
      secoesEncontradas: [],
      omitiu: false,
      descartouRelevante: false,
    };
  }

  const brutos = dividirEmBlocos(limpo);
  const blocos: BlocoDoEdital[] = brutos.map((t, indice) => ({
    indice,
    texto: t,
    ...pontuarBloco(t),
  }));

  // Documento pequeno vai inteiro: segmentar aqui só acrescentaria risco de
  // perder uma linha por um critério que não precisava ser aplicado.
  if (limpo.length <= orcamento) {
    const secoes = new Set<SecaoRelevante>();
    for (const b of blocos) for (const s of b.secoes) secoes.add(s);
    return {
      texto: limpo,
      caracteresOriginais: limpo.length,
      caracteresSelecionados: limpo.length,
      blocosTotais: blocos.length,
      blocosSelecionados: blocos.length,
      secoesEncontradas: [...secoes],
      omitiu: false,
      descartouRelevante: false,
    };
  }

  const escolhidos = new Set<number>();
  let usado = 0;

  // O preâmbulo entra sempre: é onde estão objeto e órgão, sem os quais o
  // modelo lê cláusulas sem saber do que é a licitação.
  if (blocos.length > 0) {
    escolhidos.add(0);
    usado += blocos[0].texto.length;
  }

  const candidatos = blocos
    .filter((b) => b.indice !== 0 && b.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.indice - b.indice);

  let descartouRelevante = false;
  for (const bloco of candidatos) {
    if (usado + bloco.texto.length <= orcamento) {
      escolhidos.add(bloco.indice);
      usado += bloco.texto.length;
    } else {
      descartouRelevante = true;
    }
  }

  const ordenados = blocos.filter((b) => escolhidos.has(b.indice));
  const partes: string[] = [];
  let anterior = -1;
  for (const bloco of ordenados) {
    if (anterior >= 0 && bloco.indice !== anterior + 1) partes.push(MARCA_DE_OMISSAO);
    else if (anterior >= 0) partes.push("\n\n");
    partes.push(bloco.texto);
    anterior = bloco.indice;
  }
  if (anterior >= 0 && anterior !== blocos.length - 1) partes.push(MARCA_DE_OMISSAO);

  const secoes = new Set<SecaoRelevante>();
  for (const b of ordenados) for (const s of b.secoes) secoes.add(s);

  const composto = partes.join("");
  return {
    texto: composto,
    caracteresOriginais: limpo.length,
    caracteresSelecionados: usado,
    blocosTotais: blocos.length,
    blocosSelecionados: ordenados.length,
    secoesEncontradas: [...secoes],
    omitiu: ordenados.length < blocos.length,
    descartouRelevante,
  };
}
