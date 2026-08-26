import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARTIGOS, ARTIGOS_PUBLICADOS, artigoPorSlug, artigosDoGuia, artigosRelacionados } from "./index";
import { validarArtigo, contarPalavras, textoDoArtigo } from "./tipos";
import { GUIAS_PUBLICADOS } from "../guias";
import sitemap from "../../app/sitemap";
import { conferirTitulo } from "../seo/resultado-de-busca.ts";

/**
 * As regras do canal de aquisição, presas em teste.
 *
 * O blog existe para capturar lead no orgânico. Isso é fácil de dizer num
 * documento e fácil de perder no dia a dia: alguém publica um artigo sem
 * captura, outro alguém reescreve um guia e derruba o formulário, e seis meses
 * depois o tráfego cresceu sem que um cadastro entrasse. Estas asserções
 * existem para que essa regressão quebre o build em vez de aparecer no relatório
 * do trimestre.
 */

describe("catálogo de artigos", () => {
  it("todo artigo publicado passa nas regras de publicação", () => {
    for (const artigo of ARTIGOS_PUBLICADOS) {
      const problemas = validarArtigo(artigo);
      expect(problemas, `${artigo.slug}: ${problemas.join(" · ")}`).toEqual([]);
    }
  });

  it("não há slug repetido", () => {
    const slugs = ARTIGOS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("todo artigo aponta para um guia que existe e está publicado", () => {
    const publicados = new Set(GUIAS_PUBLICADOS.map((g) => g.href));
    for (const artigo of ARTIGOS_PUBLICADOS) {
      expect(publicados, `${artigo.slug} aponta para ${artigo.guiaRelacionado}`).toContain(
        artigo.guiaRelacionado,
      );
    }
  });

  it("todo artigo linka para dentro do site pelo menos uma vez", () => {
    // Artigo sem link interno é folha solta: não distribui autoridade para o
    // hub e não leva o leitor a lugar nenhum.
    for (const artigo of ARTIGOS_PUBLICADOS) {
      expect(textoDoArtigo(artigo), artigo.slug).toMatch(/\]\(\//);
    }
  });

  it("artigo tem corpo de verdade, não esqueleto de SEO", () => {
    for (const artigo of ARTIGOS_PUBLICADOS) {
      expect(contarPalavras(artigo), artigo.slug).toBeGreaterThan(600);
    }
  });

  it("busca por slug só devolve o que está publicado", () => {
    for (const artigo of ARTIGOS_PUBLICADOS) {
      expect(artigoPorSlug(artigo.slug)?.slug).toBe(artigo.slug);
    }
    expect(artigoPorSlug("slug-que-nao-existe")).toBeNull();
  });

  it("relacionados nunca incluem o próprio artigo", () => {
    for (const artigo of ARTIGOS_PUBLICADOS) {
      expect(artigosRelacionados(artigo).map((a) => a.slug)).not.toContain(artigo.slug);
    }
  });

  it("artigosDoGuia devolve só o que pertence àquele hub", () => {
    for (const guia of GUIAS_PUBLICADOS) {
      for (const artigo of artigosDoGuia(guia.href)) {
        expect(artigo.guiaRelacionado).toBe(guia.href);
      }
    }
  });
});

describe("sitemap", () => {
  it("inclui todo artigo publicado, com barra final", () => {
    const urls = sitemap().map((entrada) => entrada.url);
    for (const artigo of ARTIGOS_PUBLICADOS) {
      expect(urls).toContain(`https://licitantevencedor.com.br/blog/${artigo.slug}/`);
    }
  });

  it("não expõe nenhuma rota do produto", () => {
    // As páginas de `(app)` mostram dado de uma empresa. Sitemap é convite
    // explícito ao rastreador — o contrário do que essas rotas precisam.
    const urls = sitemap().map((e) => e.url);
    for (const rota of ["/painel", "/oportunidades", "/perfil", "/onboarding", "/configuracoes"]) {
      expect(urls.some((u) => u.includes(rota))).toBe(false);
    }
  });
});

describe("captura no conteúdo", () => {
  /*
   * Este teste lê o código-fonte das páginas em vez de renderizá-las, e é
   * deliberado: o que precisa ser garantido é que o componente de captura
   * ESTEJA na página. Renderizar exigiria montar o ambiente de servidor do Next
   * para provar algo que uma leitura de arquivo prova melhor e mais rápido.
   */
  const guiasComPagina = GUIAS_PUBLICADOS.filter((g) => g.href !== "/blog/");

  it("todo guia publicado tem captura no corpo", () => {
    for (const guia of guiasComPagina) {
      const caminho = `src/app${guia.href}page.tsx`;
      const fonte = readFileSync(caminho, "utf8");
      expect(fonte, `${guia.href} está sem captura`).toContain("CapturaAlerta");
    }
  });

  it("toda captura declara a origem, para se saber qual conteúdo converte", () => {
    for (const guia of guiasComPagina) {
      const fonte = readFileSync(`src/app${guia.href}page.tsx`, "utf8");
      expect(fonte, `${guia.href} usa captura sem origem`).toMatch(/origem=[{"]/);
    }
  });

  it("o índice do blog captura, e o artigo oferece os DOIS caminhos", () => {
    expect(readFileSync("src/app/blog/page.tsx", "utf8")).toContain("CapturaAlerta");

    // No artigo a captura gratuita não é montada pela página: ela é um bloco do
    // corpo, posicionado pelo autor onde a dor aparece, e `validarArtigo` já
    // exige que exista. O que a PÁGINA precisa garantir é o outro caminho, que
    // é o convite ao plano pago no fim.
    //
    // Antes havia duas capturas gratuitas no mesmo artigo, uma no meio e outra
    // no fim. Isso desperdiçava o único lugar da página onde o leitor já leu
    // tudo e continua interessado, oferecendo a ele de novo a mesma coisa de
    // graça. Agora a escalada é grátis no meio, pago no fim.
    const artigo = readFileSync("src/app/blog/[slug]/page.tsx", "utf8");
    expect(artigo, "a página do artigo está sem o convite ao plano pago").toContain(
      "CardAssinatura",
    );
  });

  it("todo artigo publicado tem uma captura gratuita no corpo", () => {
    // O par do caso acima: a página garante o pago, o artigo garante o grátis.
    // Sem os dois testes, remover um dos lados passa despercebido.
    for (const artigo of ARTIGOS_PUBLICADOS) {
      expect(
        artigo.corpo.some((bloco) => bloco.tipo === "captura"),
        `${artigo.slug} está sem captura gratuita no corpo`,
      ).toBe(true);
    }
  });
});

describe("posicionamento — vale para todo o conteúdo publicado", () => {
  const proibidas = [
    /chance de vit[óo]ria/i,
    /garantimos/i,
    /garantia de vit[óo]ria/i,
    /voc[êe] vai ganhar/i,
    /n[ãa]o perca mais nenhuma licita[çc][ãa]o/i,
  ];

  it("nenhum artigo promete resultado", () => {
    for (const artigo of ARTIGOS_PUBLICADOS) {
      const texto = textoDoArtigo(artigo);
      for (const proibida of proibidas) {
        expect(texto, `${artigo.slug} contém ${proibida}`).not.toMatch(proibida);
      }
    }
  });

  it("nenhum guia promete resultado", () => {
    for (const guia of GUIAS_PUBLICADOS.filter((g) => g.href !== "/blog/")) {
      const fonte = readFileSync(`src/app${guia.href}page.tsx`, "utf8");
      for (const proibida of proibidas) {
        expect(fonte, `${guia.href} contém ${proibida}`).not.toMatch(proibida);
      }
    }
  });
});

describe("o título que cada artigo leva para a busca", () => {
  /**
   * A guarda que `resultado-de-busca.guarda.test.ts` dizia existir, e não existia.
   *
   * O comentário dela recorta as rotas estáticas e manda o leitor para cá:
   * "as dinâmicas têm cada uma o próprio teste com a própria régua
   * (`blog/tipos.ts` para artigo)". A régua estava escrita no tipo; o teste que
   * a cobrava, não. Foi por isso que cinco dos seis artigos publicados chegaram
   * à busca com 78 a 100 caracteres sem nada reclamar.
   *
   * Guarda que aponta para uma guarda inexistente é pior do que guarda nenhuma:
   * ela convence quem lê de que o caso está coberto.
   */
  it("cabe no corte, medido como o Google vê — com a marca do layout", () => {
    for (const artigo of ARTIGOS_PUBLICADOS) {
      const daBusca = artigo.tituloDaBusca ?? artigo.titulo;
      const falhas = conferirTitulo(daBusca);

      expect(
        falhas,
        `/blog/${artigo.slug}/ · "${daBusca}"\n` +
          falhas.map((f) => `  · ${f.explicacao}`).join("\n") +
          "\n\nSe o título longo é bom onde ele é lido, não o encurte: escreva um " +
          "`tituloDaBusca` curto ao lado dele.",
      ).toEqual([]);
    }
  });

  it("o título curto mantém o termo que o artigo persegue", () => {
    /*
     * Encurtar cortando o termo trocaria um problema por outro pior: o título
     * caberia na tela e deixaria de responder à busca que trouxe a pessoa.
     */
    for (const artigo of ARTIGOS_PUBLICADOS) {
      if (!artigo.tituloDaBusca) continue;

      const semAcento = (t: string) =>
        t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

      // O termo inteiro nem sempre cabe em 49; a primeira metade dele, sim, e é
      // ela que o Google casa com a busca.
      const termo = semAcento(artigo.termoPrincipal).split(" ");
      const inicio = termo.slice(0, Math.max(2, Math.ceil(termo.length / 2))).join(" ");

      expect(
        semAcento(artigo.tituloDaBusca),
        `/blog/${artigo.slug}/ persegue "${artigo.termoPrincipal}", e o título curto ` +
          `"${artigo.tituloDaBusca}" não começa por ele. Cortar o termo é pior do que ` +
          "estourar o tamanho: o título passa a caber na tela e a não responder à busca.",
      ).toContain(inicio);
    }
  });

  it("o título curto é mesmo mais curto que o longo", () => {
    // Um `tituloDaBusca` igual ou maior que o `titulo` é campo preenchido por
    // engano: não resolve nada e cria duas frases para manter no lugar de uma.
    for (const artigo of ARTIGOS_PUBLICADOS) {
      if (!artigo.tituloDaBusca) continue;
      expect(
        artigo.tituloDaBusca.length,
        `/blog/${artigo.slug}/ tem \`tituloDaBusca\` que não encurta nada.`,
      ).toBeLessThan(artigo.titulo.length);
    }
  });
});
