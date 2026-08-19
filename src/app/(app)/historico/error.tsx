"use client";

import Link from "next/link";

/** Erro do histórico. A saída oferecida é o painel, já que não há filtro para limpar aqui. */
export default function ErroNoHistorico({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
        Falha ao carregar
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Não conseguimos mostrar o seu histórico
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-[var(--muted)]">
        A falha é nossa, não sua. Nenhuma decisão registrada foi perdida ou alterada — o que falhou
        foi a leitura para montar esta tela.
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
          Ver oportunidades em aberto
        </Link>
        <Link
          href="/painel/"
          className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
        >
          Voltar ao painel
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
