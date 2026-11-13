import Link from "next/link";
import { todosOsPosts, caminhoDoPost } from "@/lib/posts/acervo";
import { DEMONSTRACAO, selecionarDemonstracao } from "@/lib/posts/demonstracao";
import { dataDeBrasilia, dataEHoraDeBrasilia } from "@/lib/dominio/datas";
import { LeituraDoEdital } from "@/components/posts/LeituraDoEdital";

export function DemonstracaoDoProduto() {
  const post = selecionarDemonstracao(todosOsPosts());
  if (!post?.analise) return null;

  return (
    <section id="demonstracao" aria-labelledby="titulo-demonstracao" className="mx-auto max-w-5xl scroll-mt-8 px-6 py-16">
      <p className="text-sm font-semibold text-[var(--accent)]">Veja antes de se cadastrar</p>
      <h2 id="titulo-demonstracao" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Um edital real, com a leitura e as fontes
      </h2>
      <p className="mt-4 max-w-3xl leading-relaxed text-[var(--muted)]">
        Exemplo histórico do nosso acervo, publicado em {dataDeBrasilia(post.postadoEm)}.
        Não é uma oferta de oportunidade aberta. A análise retrata os documentos disponíveis naquela data.
        Esta leitura faz parte dos planos Empresa e Consultoria; o teste do Leve entrega os dados da publicação.
      </p>
      <article className="mt-6 rounded-xl border bg-[var(--surface)] p-5 sm:p-8">
        <p className="text-sm text-[var(--muted)]">{post.orgao} · {post.municipio}/{post.uf}</p>
        <h3 className="mt-3 text-lg font-semibold">{post.objeto}</h3>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-[var(--muted)]">Valor estimado na publicação</dt><dd className="mt-1 font-medium">{post.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div>
          <div><dt className="text-[var(--muted)]">Prazo original, em Brasília</dt><dd className="mt-1 font-medium">{dataEHoraDeBrasilia(post.encerramentoProposta)}</dd></div>
          <div><dt className="text-[var(--muted)]">Documentos lidos</dt><dd className="mt-1 font-medium">{post.documentosLidos}</dd></div>
        </dl>
        <p className="mt-5 leading-relaxed">{post.analise.resumoExecutivo.valor}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {DEMONSTRACAO.destaques.map((item) => (
            <div key={item.titulo} className="rounded-lg border bg-[var(--background)] p-4">
              <dt className="text-sm font-semibold">{item.titulo}</dt>
              <dd className="mt-2 text-sm leading-relaxed">
                {item.texto}{" "}
                <a href={`${DEMONSTRACAO.documento}#page=${item.pagina}`} rel="noopener" className="underline underline-offset-4">Página {item.pagina} do edital</a>.
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
          Garantias, vistoria e amostras conferidas no documento oficial em {DEMONSTRACAO.conferidoEm}.
          A vistoria é opcional. As amostras são de materiais da obra, durante a execução.
        </p>
        <details className="mt-6 border-t pt-5">
          <summary className="cursor-pointer font-semibold underline underline-offset-4">Abrir análise, exigências e evidências</summary>
          <div className="mt-5"><LeituraDoEdital analise={post.analise} documentosLidos={post.documentosLidos ?? 0} /></div>
        </details>
        <div className="mt-6 flex flex-wrap gap-5 text-sm">
          <a href={post.link} rel="noopener" className="underline underline-offset-4">Conferir publicação oficial no PNCP</a>
          <Link href={caminhoDoPost(post)} prefetch={false} className="underline underline-offset-4">Ver o registro completo no acervo</Link>
        </div>
      </article>
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
        A demonstração não usa o perfil de um cliente. Compatibilidade e situação documental dependem dos dados que a sua empresa declarar.
        A nota de aderência não representa probabilidade de vitória. Em caso de divergência, prevalece o edital.
      </p>
    </section>
  );
}
