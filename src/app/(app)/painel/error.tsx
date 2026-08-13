"use client";

import Link from "next/link";

/**
 * Erro do painel.
 *
 * Duas coisas que ele NÃO faz: não sugere que o problema é do usuário e não
 * mostra pilha de erro. O `digest` fica visível porque é o que liga a tela ao
 * registro do servidor — quando o cliente escreve para o suporte com esse
 * código, a investigação começa no lugar certo em vez de "não consigo
 * reproduzir".
 */
export default function ErroNoPainel({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
        Falha ao montar o painel
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Não conseguimos carregar o seu dia
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-[var(--muted)]">
        A falha é nossa, não sua, e os seus dados não foram alterados. Tentar de novo costuma
        resolver quando o problema é passageiro.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Tentar de novo
        </button>
        <Link
          href="/oportunidades/"
          className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
        >
          Ir para a lista de oportunidades
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-8 text-xs text-[var(--muted)]">
          Código para o suporte: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
