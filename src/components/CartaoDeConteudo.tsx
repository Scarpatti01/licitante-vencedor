import Link from "next/link";

/**
 * O cartão de um texto do site: guia na home, guia e artigo no índice do blog.
 *
 * ELE EXISTE PORQUE OS CARTÕES PRECISAM PARECER CLICÁVEIS, E NÃO SÓ SER
 *
 * O relato do dono, olhando a home: "esses cards são clicáveis, mas não
 * parecem". E não pareciam mesmo. Só o título era link, sem sublinhado em
 * repouso, dentro de um bloco sem borda e sem fundo: no computador a pista
 * aparecia ao passar o mouse por cima, e no celular não existe passar o mouse
 * por cima. Era o conteúdo de aquisição do site parecendo parágrafo.
 *
 * A pista tem quatro partes, e nenhuma delas quebra nada ao sumir: caixa
 * desenhada em repouso, título na cor de link, chamada escrita com seta, e a
 * área de clique valendo o cartão inteiro. Por isso o padrão mora num
 * componente só, e não copiado em três páginas: copiado, ele diverge na
 * primeira pressa e ninguém percebe, porque o site continua verde.
 *
 * ## Por que `after:absolute after:inset-0`, e não um `<Link>` em volta
 *
 * Envolver tudo no link é o que `Funil.tsx` e `LinhaDaOportunidade.tsx` fazem, e
 * ali cabe: são números e rótulos curtos. Aqui o resumo tem duas linhas de
 * prosa, e ele entraria no nome acessível do link, que é o que o leitor de tela
 * anuncia. O pseudo-elemento estica a área de clique sobre o cartão sem mexer no
 * conteúdo do link: o nome continua sendo só o título, e o resumo continua
 * selecionável com o mouse.
 *
 * A chamada é `aria-hidden` de propósito. Ela é a pista visual de que o bloco
 * leva a algum lugar; para quem usa leitor de tela essa pista já é o link do
 * título, e lê-la de novo só repetiria.
 *
 * O anel de foco é `has-[a:focus-visible]` no cartão, e não `focus-within`:
 * assim ele contorna a área que de fato responde ao Enter, e aparece só para
 * quem chegou pelo teclado. Com `focus-within`, o cartão ficaria contornado
 * depois de um clique de mouse.
 */
export function CartaoDeConteudo({
  href,
  titulo,
  resumo,
  chamada,
  nota,
  destaque = false,
  prefetch,
}: {
  href: string;
  titulo: string;
  resumo: string;
  /** O que a chamada visível diz. "Ler o guia", "Ler o artigo". */
  chamada: string;
  /** Linha miúda embaixo do resumo, tipo a data da última conferência. */
  nota?: string;
  /** Título grande, para a página em que a lista É o conteúdo. */
  destaque?: boolean;
  /**
   * `false` onde o cartão aponta para página pesada que a maioria não abre.
   * O padrão do Next é pré-carregar o que está na viewport, e nove hubs na
   * primeira dobra da home seriam nove páginas baixadas por visita.
   */
  prefetch?: boolean;
}) {
  return (
    <article className="group relative flex flex-col rounded-xl border bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-[var(--accent)] sm:p-6">
      <h3
        className={
          destaque
            ? "text-xl font-semibold tracking-tight sm:text-2xl"
            : "font-semibold tracking-tight"
        }
      >
        <Link
          href={href}
          prefetch={prefetch}
          className="text-[var(--accent)] underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-none"
        >
          {titulo}
        </Link>
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{resumo}</p>

      {nota ? <p className="mt-3 text-xs text-[var(--muted)]">{nota}</p> : null}

      <p
        aria-hidden
        className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-[var(--accent)]"
      >
        {chamada}
        <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
      </p>
    </article>
  );
}
