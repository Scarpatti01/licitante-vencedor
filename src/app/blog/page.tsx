import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { GUIAS_EM_RECONSTRUCAO, GUIAS_PUBLICADOS } from "@/lib/guias";
import { redirecionamentosAtivos, urlsDoAcervo } from "@/lib/legacy";

const TITULO = "Guias sobre licitações e contratos públicos";
const DESCRICAO =
  "Os guias do Licitante Vencedor sobre licitações, contratos administrativos, habilitação e jurisprudência — escritos para quem vende ao poder público, atualizados para a Lei 14.133/2021.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/blog/" },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE.url}/blog/`, type: "website" },
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
        itemListElement: GUIAS_PUBLICADOS.map((guia, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: guia.titulo,
          url: `${SITE.url}${guia.href}`,
        })),
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
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <a href="/" className="text-base font-semibold tracking-tight">{SITE.name}</a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <nav aria-label="Trilha" className="text-sm text-[var(--muted)]">
          <a href="/" className="underline-offset-4 hover:underline">Início</a>
          <span aria-hidden> › </span>
          <span>Guias</span>
        </nav>

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Guias sobre licitações e contratos públicos
        </h1>

        <p className="mt-6 leading-relaxed text-[var(--muted)]">
          Cada guia aqui cobre um assunto inteiro, do começo ao fim, na ordem em
          que ele aparece para quem vende ao poder público. Não são notícias:
          são textos de referência, revisados quando a norma ou o entendimento
          muda.
        </p>

        <section className="mt-12 space-y-8">
          {GUIAS_PUBLICADOS.map((guia) => (
            <article key={guia.href} className="border-t pt-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                <a href={guia.href} className="underline-offset-4 hover:underline">
                  {guia.titulo}
                </a>
              </h2>
              <p className="mt-3 leading-relaxed text-[var(--muted)]">{guia.resumo}</p>
              <p className="mt-3">
                <a href={guia.href} className="text-sm underline underline-offset-4">
                  Ler o guia
                </a>
              </p>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-lg border bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            O que ainda está sendo escrito
          </h2>
          <p className="mt-3 leading-relaxed text-[var(--muted)]">
            Este site publica sobre licitações desde {SITE.foundingYear}. O
            acervo está sendo reescrito guia a guia, para a Lei 14.133/2021 —{" "}
            {resgatadas} endereços antigos já apontam para o conteúdo novo
            correspondente. Os próximos:
          </p>
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
