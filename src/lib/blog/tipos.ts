/**
 * O modelo de um artigo do blog.
 *
 * O blog não é diário de bordo nem vitrine: ele é o canal de aquisição orgânica
 * do produto. Cada artigo existe para ser encontrado por uma busca com intenção
 * comercial e terminar com o leitor entendendo que existe uma forma melhor de
 * fazer aquilo — que é o que o produto vende.
 *
 * Daí três campos que um blog comum não tem e este exige:
 *
 * `intencao`     — o que a pessoa que buscou está tentando resolver. É o que
 *                  decide qual captura entra no texto e onde.
 * `guiaRelacionado` — o hub a que o artigo pertence. Artigo solto não ranqueia;
 *                  a malha interna é metade do trabalho.
 * `verificadoEm` — norma muda. Um texto sobre licitação sem data é um texto em
 *                  que não se deve confiar, e o leitor deste assunto sabe disso.
 */

export type IntencaoDeBusca =
  /** "como faço X" — quem está executando agora. Converte bem. */
  | "operacional"
  /** "o que é X" — quem está aprendendo. Converte pouco, alimenta a malha. */
  | "informacional"
  /** "melhor X", "quanto custa X" — quem está escolhendo fornecedor. Converte muito. */
  | "comercial";

export type BlocoDeConteudo =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "passos"; itens: string[] }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] }
  | { tipo: "destaque"; texto: string }
  /**
   * A captura, posicionada pelo autor dentro do texto.
   *
   * É um bloco de conteúdo, e não um rodapé fixo, de propósito: a captura que
   * converte é a que aparece no instante em que o leitor acabou de entender que
   * tem um problema. Depois do parágrafo que descreve a dor, não no fim da
   * página que ele nunca alcança.
   */
  | { tipo: "captura"; chamada: string };

export type Artigo = {
  slug: string;
  titulo: string;
  /** Até ~155 caracteres. É o que aparece no resultado de busca. */
  descricao: string;
  /** A primeira coisa que o leitor lê. Responde a busca dele em duas frases. */
  resumo: string;
  intencao: IntencaoDeBusca;
  /** O termo que este artigo persegue. Um por artigo — dois é nenhum. */
  termoPrincipal: string;
  /** `href` do hub a que ele pertence, de `src/lib/guias.ts`. */
  guiaRelacionado: string;
  publicadoEm: string;
  verificadoEm: string;
  corpo: BlocoDeConteudo[];
  /** Perguntas que viram `FAQPage` no JSON-LD e capturam busca de cauda longa. */
  faq: { pergunta: string; resposta: string }[];
  /**
   * Fontes oficiais consultadas, com o que cada uma sustenta.
   *
   * Obrigatório e não decorativo: é o que separa este blog do conteúdo
   * reciclado que domina o assunto, e é o que permite conferir o texto quando a
   * norma mudar. Artigo sem fonte não é publicável — ver `validarArtigo`.
   */
  fontes: { titulo: string; url: string; sustenta: string }[];
  publicado: boolean;
};

/**
 * As regras que tornam um artigo publicável.
 *
 * Existe como função, e não como recomendação em documento, porque
 * recomendação em documento não impede ninguém de publicar. Isto roda em teste.
 */
export function validarArtigo(artigo: Artigo): string[] {
  const problemas: string[] = [];

  if (!/^[a-z0-9-]+$/.test(artigo.slug)) {
    problemas.push(`slug "${artigo.slug}" tem caractere fora de [a-z0-9-]`);
  }
  if (artigo.descricao.length > 160) {
    problemas.push(`descrição com ${artigo.descricao.length} caracteres — o Google corta em ~155`);
  }
  if (artigo.descricao.length < 70) {
    problemas.push(`descrição com ${artigo.descricao.length} caracteres — curta demais para o resultado de busca`);
  }

  const palavras = contarPalavras(artigo);
  if (palavras < 600) {
    problemas.push(`${palavras} palavras — abaixo disso o texto não cobre o assunto e não ranqueia`);
  }

  if (artigo.fontes.length === 0) {
    problemas.push("nenhuma fonte oficial citada");
  }
  for (const fonte of artigo.fontes) {
    if (!/^https:\/\//.test(fonte.url)) {
      problemas.push(`fonte "${fonte.titulo}" não é uma URL https`);
    }
  }

  if (artigo.faq.length === 0) {
    problemas.push("sem FAQ — é ele que captura a busca de cauda longa e vira rich result");
  }

  // A captura é o motivo de o blog existir. Um artigo sem ela é tráfego que
  // entra e sai sem deixar nada.
  if (!artigo.corpo.some((b) => b.tipo === "captura")) {
    problemas.push("sem bloco de captura no corpo");
  }

  // O posicionamento do produto vale para o blog inteiro, e aqui ninguém revisa
  // linha a linha antes de publicar.
  const texto = textoDoArtigo(artigo).toLowerCase();
  const proibidas = [
    "chance de vitória",
    "garantimos",
    "garantia de vitória",
    "você vai ganhar",
    "parecer jurídico personalizado",
  ];
  for (const frase of proibidas) {
    if (texto.includes(frase)) problemas.push(`contém a frase proibida "${frase}"`);
  }

  return problemas;
}

export function textoDoArtigo(artigo: Artigo): string {
  const partes: string[] = [artigo.titulo, artigo.resumo];
  for (const bloco of artigo.corpo) {
    switch (bloco.tipo) {
      case "paragrafo":
      case "subtitulo":
      case "destaque":
        partes.push(bloco.texto);
        break;
      case "lista":
      case "passos":
        partes.push(bloco.itens.join(" "));
        break;
      case "tabela":
        partes.push(bloco.cabecalho.join(" "), bloco.linhas.map((l) => l.join(" ")).join(" "));
        break;
      case "captura":
        partes.push(bloco.chamada);
        break;
    }
  }
  for (const item of artigo.faq) partes.push(item.pergunta, item.resposta);
  return partes.join("\n");
}

export function contarPalavras(artigo: Artigo): number {
  return textoDoArtigo(artigo).split(/\s+/).filter(Boolean).length;
}
