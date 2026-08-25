import type { Metadata } from "next";
import Link from "next/link";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { GUIAS_EM_RECONSTRUCAO, GUIAS_PUBLICADOS } from "@/lib/guias";
import { ARTIGOS_PUBLICADOS } from "@/lib/blog";
import { redirecionamentosAtivos, urlsDoAcervo } from "@/lib/legacy";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { dataDeBrasilia } from "@/lib/dominio/datas";

const TITULO = "Guias e artigos sobre licitações públicas";
const DESCRICAO =
  "Artigos sobre licitação, habilitação, contratos e jurisprudência para quem vende ao poder público, atualizados para a Lei 14.133/2021.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/blog/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO, title: TITULO, description: DESCRICAO, url: `${SITE.url}/blog/`, type: "website" },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${SITE.url}/blog/#collection`,
      name: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      isPartOf: { "@id": `${SITE.url}/#website` },
      publisher: { "@id": `${SITE.url}/#organization` },
      mainEntity: {
        "@type": "ItemList",
        // Artigos primeiro, na mesma ordem em que aparecem na página: a lista
        // estruturada que discorda do que está visível é sinal contraditório.
        itemListElement: [
          ...ARTIGOS_PUBLICADOS.map((artigo) => ({
            name: artigo.titulo,
            url: `${SITE.url}/blog/${artigo.slug}/`,
          })),
          ...GUIAS_PUBLICADOS.map((guia) => ({
            name: guia.titulo,
            url: `${SITE.url}${guia.href}`,
          })),
        ].map((item, i) => ({ "@type": "ListItem", position: i + 1, ...item })),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Guias", item: `${SITE.url}/blog/` },
      ],
    },
  ],
};

export default function Blog() {
  const resgatadas = redirecionamentosAtivos().length;

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Guias" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Guias e artigos sobre licitações públicas
        </h1>

        <p className="mt-6 leading-relaxed text-[var(--muted)]">
          Dois tipos de texto, com propósitos diferentes. Os{" "}
          <strong className="font-medium text-[var(--foreground)]">guias</strong> cobrem um assunto
          inteiro, do começo ao fim, e são revisados quando a norma ou o entendimento muda. Os{" "}
          <strong className="font-medium text-[var(--foreground)]">artigos</strong> respondem a uma
          dúvida específica de quem está executando agora. Nenhum dos dois é notícia.
        </p>

        {/*
          Os artigos vêm antes dos guias porque é neles que a busca de cauda
          longa cai — "documentos para participar de licitação" tem intenção
          imediata, "habilitação" não. Quem chega por um artigo tende a estar no
          meio de um problema, que é exatamente quem o produto atende.
        */}
        {ARTIGOS_PUBLICADOS.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-sm font-semibold tracking-wide text-[var(--muted)] uppercase">
              Artigos
            </h2>
            <div className="mt-6 space-y-8">
              {ARTIGOS_PUBLICADOS.map((artigo) => (
                <article key={artigo.slug} className="border-t pt-8">
                  <h3 className="text-2xl font-semibold tracking-tight">
                    <Link
                      href={`/blog/${artigo.slug}/`}
                      className="underline-offset-4 hover:underline"
                    >
                      {artigo.titulo}
                    </Link>
                  </h3>
                  <p className="mt-3 leading-relaxed text-[var(--muted)]">{artigo.descricao}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Conferido nas fontes oficiais em {dataDeBrasilia(`${artigo.verificadoEm}T12:00:00-03:00`)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-16">
          <CapturaAlerta
            origem="blog/indice"
            chamada={{
              titulo: "Antes de continuar lendo: os editais podem vir até você",
              texto:
                "Todo dia útil, os editais publicados no PNCP que combinam com o que a sua empresa vende — com objeto, órgão, valor, prazo e link para o registro oficial. É de graça e você sai quando quiser.",
            }}
            textoDoBotao="Quero receber os editais do meu ramo"
          />
        </section>

        <h2 className="mt-16 text-sm font-semibold tracking-wide text-[var(--muted)] uppercase">
          Guias
        </h2>

        <section className="mt-6 space-y-8">
          {GUIAS_PUBLICADOS.map((guia) => (
            <article key={guia.href} className="border-t pt-8">
              {/* h3, e não h2: agora existe um h2 "Guias" acima de toda a lista. */}
              <h3 className="text-2xl font-semibold tracking-tight">
                <a href={guia.href} className="underline-offset-4 hover:underline">
                  {guia.titulo}
                </a>
              </h3>
              <p className="mt-3 leading-relaxed text-[var(--muted)]">{guia.resumo}</p>
              <p className="mt-3">
                <a href={guia.href} className="text-sm underline underline-offset-4">
                  Ler o guia
                </a>
              </p>
            </article>
          ))}
        </section>

        {/*
          Quando o último hub sai do forno, esta seção não pode continuar
          anunciando "os próximos:" seguido de lista vazia — foi o que aconteceu
          ao publicar /portais-de-licitacao/. O texto passa a depender de haver
          ou não hub pendente, derivado do catálogo e não escrito à mão.
        */}
        <section className="mt-16 rounded-lg border bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {GUIAS_EM_RECONSTRUCAO.length > 0
              ? "O que ainda está sendo escrito"
              : "O acervo, e o que ele virou"}
          </h2>
          <p className="mt-3 leading-relaxed text-[var(--muted)]">
            Este site publica sobre licitações desde {SITE.foundingYear}. O
            acervo foi reescrito guia a guia, para a Lei 14.133/2021 —{" "}
            {resgatadas} endereços antigos apontam para o conteúdo novo
            correspondente.
            {GUIAS_EM_RECONSTRUCAO.length > 0 ? " Os próximos:" : null}
          </p>
          {GUIAS_EM_RECONSTRUCAO.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {GUIAS_EM_RECONSTRUCAO.map((guia) => (
                <li key={guia.href}>
                  <span className="font-medium">{guia.titulo}</span>
                  <span className="text-[var(--muted)]">
                    {" "}
                    — {guia.resumo} ({urlsDoAcervo(guia.href)} endereços do acervo)
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <p className="mt-12 text-sm leading-relaxed text-[var(--muted)]">
          Conteúdo informativo e operacional. Não constitui parecer jurídico.
          Saiba{" "}
          <a className="underline underline-offset-4" href="/sobre/">
            quem escreve e como este site é feito
          </a>
          .
        </p>
      </main>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
