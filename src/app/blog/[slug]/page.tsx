import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE, AUTHOR, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { ARTIGOS_PUBLICADOS, artigoPorSlug, artigosRelacionados } from "@/lib/blog";
import { GUIAS } from "@/lib/guias";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { Corpo, ancora } from "@/components/blog/Corpo";
import { CardAssinatura } from "@/components/CardAssinatura";

/**
 * A página de um artigo.
 *
 * Estática por padrão: o conteúdo não muda entre requisições e este é o lado do
 * site que precisa ser rápido para o rastreador e para o celular em rede ruim.
 * Nada aqui toca dado de empresa — o produto vive em `(app)`, que é dinâmico
 * justamente por isso.
 */

export function generateStaticParams() {
  return ARTIGOS_PUBLICADOS.map((artigo) => ({ slug: artigo.slug }));
}

// `params` é assíncrono nesta versão do Next. Ler direto, sem await, devolve
// uma Promise e quebra em tempo de execução.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artigo = artigoPorSlug(slug);
  if (!artigo) return {};

  const url = `${SITE.url}/blog/${artigo.slug}/`;

  /*
   * A busca recebe o título curto; o `<h1>` e o cartão recebem o longo.
   *
   * Divergência DELIBERADA, ao contrário da que `resultado-de-busca.guarda.test.ts`
   * pune nas páginas estáticas. Lá dois títulos significavam que ninguém escolheu
   * um dos dois; aqui os dois foram escritos de propósito, para vitrines com
   * réguas diferentes, e `tipos.ts` explica por quê.
   */
  return {
    title: artigo.tituloDaBusca ?? artigo.titulo,
    description: artigo.descricao,
    alternates: { canonical: `/blog/${artigo.slug}/` },
    openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO,
      title: artigo.titulo,
      description: artigo.descricao,
      url,
      type: "article",
      publishedTime: artigo.publicadoEm,
      modifiedTime: artigo.verificadoEm,
      authors: [AUTHOR.name],
    },
  };
}

export default async function PaginaDoArtigo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artigo = artigoPorSlug(slug);
  if (!artigo) notFound();

  const url = `${SITE.url}/blog/${artigo.slug}/`;
  const guia = GUIAS.find((g) => g.href === artigo.guiaRelacionado) ?? null;
  const relacionados = artigosRelacionados(artigo);
  const subtitulos = artigo.corpo.filter((b) => b.tipo === "subtitulo");

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: artigo.titulo,
        description: artigo.descricao,
        inLanguage: SITE.locale,
        datePublished: artigo.publicadoEm,
        dateModified: artigo.verificadoEm,
        author: { "@type": "Person", name: AUTHOR.name, jobTitle: AUTHOR.jobTitle },
        publisher: { "@id": `${SITE.url}/#organization` },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        // `citation` existe porque as fontes oficiais são o que sustenta o
        // texto. Declará-las é o mesmo movimento de `/metodologia/`: o que pode
        // ser conferido, deve ser conferível.
        citation: artigo.fontes.map((f) => ({
          "@type": "CreativeWork",
          name: f.titulo,
          url: f.url,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: artigo.faq.map((item) => ({
          "@type": "Question",
          name: item.pergunta,
          acceptedAnswer: { "@type": "Answer", text: item.resposta },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
          { "@type": "ListItem", position: 2, name: "Guias", item: `${SITE.url}/blog/` },
          { "@type": "ListItem", position: 3, name: artigo.titulo, item: url },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual={artigo.titulo} />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          {artigo.titulo}
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">{artigo.resumo}</p>

        {/*
          A data de verificação fica no topo, e não escondida no rodapé, porque
          quem lê sobre licitação sabe que norma muda e procura por ela antes de
          confiar no texto. Esconder a data não torna o artigo mais atual;
          torna-o menos confiável.
        */}
        <p className="mt-6 border-y py-3 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · publicado em{" "}
          {new Date(`${artigo.publicadoEm}T12:00:00-03:00`).toLocaleDateString("pt-BR")} · conteúdo
          conferido nas fontes oficiais em{" "}
          {new Date(`${artigo.verificadoEm}T12:00:00-03:00`).toLocaleDateString("pt-BR")}
        </p>

        {subtitulos.length > 2 ? (
          <nav aria-label="Neste artigo" className="mt-8 rounded-lg border bg-[var(--surface)] p-5">
            <p className="text-sm font-semibold">Neste artigo</p>
            <ul className="mt-3 space-y-2">
              {subtitulos.map((bloco) => (
                <li key={bloco.texto}>
                  <a
                    href={`#${ancora(bloco.texto)}`}
                    className="text-sm underline underline-offset-4"
                  >
                    {bloco.texto}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <Corpo blocos={artigo.corpo} origem={`blog/${artigo.slug}`} />

        {artigo.faq.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-2xl font-semibold tracking-tight">Perguntas frequentes</h2>
            <div className="mt-6 space-y-6">
              {artigo.faq.map((item) => (
                <div key={item.pergunta} className="border-t pt-6">
                  <h3 className="font-semibold">{item.pergunta}</h3>
                  <p className="mt-2 leading-relaxed text-[var(--muted)]">{item.resposta}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-16">
          <h2 className="text-lg font-semibold tracking-tight">Fontes consultadas</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {artigo.fontes.map((fonte) => (
              <li key={fonte.url} className="leading-relaxed">
                <a
                  href={fonte.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {fonte.titulo}
                </a>
                <span className="text-[var(--muted)]"> — {fonte.sustenta}</span>
              </li>
            ))}
          </ul>
        </section>

        {/*
          O fim do post é do produto PAGO, e não de uma segunda captura
          gratuita.
          
          Antes havia duas capturas do alerta grátis no mesmo post, uma no meio
          e outra aqui. Isso desperdiçava o único lugar da página onde o leitor
          já leu tudo e continua interessado: quem chega ao fim de um texto de
          mil palavras sobre licitação tem a intenção mais alta da página, e
          oferecer a ele de novo a mesma coisa gratuita é pedir menos do que ele
          está disposto a dar.
          
          Agora a escalada é natural. A captura gratuita fica no meio, onde a
          dor aparece; o cartão pago fica no fim, para quem quer mais. Um de
          cada, e cada um dizendo a verdade do seu lado.
        */}
        <CardAssinatura />

        <section className="mt-16 border-t pt-8">
          <h2 className="text-lg font-semibold tracking-tight">Continue</h2>
          <ul className="mt-4 space-y-4">
            {guia ? (
              <li>
                <a href={guia.href} className="font-medium underline underline-offset-4">
                  {guia.titulo}
                </a>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{guia.resumo}</p>
              </li>
            ) : null}
            {relacionados.map((outro) => (
              <li key={outro.slug}>
                <a
                  href={`/blog/${outro.slug}/`}
                  className="font-medium underline underline-offset-4"
                >
                  {outro.titulo}
                </a>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{outro.descricao}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 text-sm leading-relaxed text-[var(--muted)]">
          Conteúdo informativo e operacional sobre licitações. Não é parecer jurídico e não
          substitui a leitura do edital, que prevalece em qualquer divergência. Veja o{" "}
          <a className="underline underline-offset-4" href="/aviso-legal/">
            aviso legal
          </a>{" "}
          e a{" "}
          <a className="underline underline-offset-4" href="/metodologia/">
            metodologia
          </a>
          .
        </p>
      </main>

      <RodapeSite />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  );
}
