import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { caminhoDoPost, todosOsPosts } from "@/lib/posts/acervo";
import { CAMINHO_DO_HISTORICO } from "@/lib/posts/trilha";
import { dataDeBrasilia } from "@/lib/dominio/datas";

const TITULO = "Editais publicados: histórico de licitações";
const DESCRICAO = "Consulte os editais publicados pelo Licitante Vencedor, com órgão, município, data de publicação e prazo informado na coleta. Acervo histórico do PNCP.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: CAMINHO_DO_HISTORICO },
  openGraph: {
    title: TITULO, description: DESCRICAO, images: IMAGENS_DE_COMPARTILHAMENTO,
    url: `${SITE.url}${CAMINHO_DO_HISTORICO}`, type: "website",
  },
};

export default function EditaisPublicados() {
  const posts = todosOsPosts();
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE.url}${CAMINHO_DO_HISTORICO}#collection`,
    name: TITULO,
    description: DESCRICAO,
    inLanguage: SITE.locale,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem", position: i + 1,
        name: post.objeto, url: `${SITE.url}${caminhoDoPost(post)}`,
      })),
    },
  };

  return (
    <>
      <CabecalhoSite />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Trilha atual="Editais publicados" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Histórico de editais publicados
        </h1>
        <p className="mt-5 leading-relaxed text-[var(--muted)]">
          Os {posts.length} editais deste acervo estão organizados do mais recente
          para o mais antigo. Cada publicação preserva os dados disponíveis na
          coleta e o link para a fonte oficial.
        </p>
        <div className="mt-6 rounded-xl border bg-[var(--surface)] p-5 text-sm leading-relaxed">
          <p>
            <strong>Este é um acervo histórico.</strong> Inclui certames com prazo
            encerrado. As datas abaixo são as informadas na publicação, e podem
            ter sido alteradas pelo órgão.
          </p>
          <Link href="/editais-abertos/" className="mt-3 inline-block font-semibold text-[var(--accent)] underline underline-offset-4">
            Consultar o retrato de editais abertos →
          </Link>
        </div>
        <ol className="mt-8 space-y-4" aria-label="Editais do mais recente ao mais antigo">
          {posts.map((post) => (
            <li key={caminhoDoPost(post)} className="min-w-0 rounded-xl border p-5 [overflow-wrap:anywhere]">
              <p className="text-xs text-[var(--muted)]">
                Publicado aqui em <time dateTime={post.postadoEm}>{dataDeBrasilia(post.postadoEm)}</time>
                {" · "}{post.municipio}/{post.uf}
              </p>
              <h2 className="mt-2 text-base leading-relaxed font-semibold">
                <Link href={caminhoDoPost(post)} prefetch={false} className="underline decoration-[var(--border)] underline-offset-4 hover:text-[var(--accent)]">
                  {post.objeto}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{post.orgao}</p>
              <p className="mt-2 text-sm">
                {post.modalidade}{" · "}Propostas até {dataDeBrasilia(post.encerramentoProposta)}, conforme a coleta.
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-sm leading-relaxed text-[var(--muted)]">
          Para preparar a documentação, consulte o <Link href="/habilitacao/" className="underline underline-offset-4">guia de habilitação</Link>.
          {" "}Para acompanhar oportunidades para sua empresa, <Link href="/precos/" className="underline underline-offset-4">conheça os planos</Link>.
        </p>
      </main>
      <RodapeSite />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    </>
  );
}
