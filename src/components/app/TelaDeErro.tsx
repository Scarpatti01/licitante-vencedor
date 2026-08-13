"use client";

import Link from "next/link";
import { BOTAO } from "./ui";

/**
 * A tela de erro do produto.
 *
 * O que ela não faz: mostrar a mensagem crua da exceção. O texto de um erro de
 * servidor costuma ser inútil para quem lê e útil demais para quem procura
 * brecha. O `digest` aparece porque é o que liga o que o usuário viu ao que
 * ficou no log — sem ele, "deu erro" não é reportável.
 *
 * O que ela faz: oferecer as duas saídas reais. Tentar de novo resolve falha
 * transitória, que é a maioria; voltar ao painel resolve o resto.
 */
export function TelaDeErro({
  titulo,
  erro,
  tentarDeNovo,
}: {
  titulo: string;
  erro: Error & { digest?: string };
  tentarDeNovo: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <div className="rounded-xl border bg-[var(--background)] p-8">
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-3 leading-relaxed text-[var(--muted)]">
          A falha foi registrada. Nada do que você tinha salvo foi perdido — o
          erro aconteceu ao montar esta tela, não ao gravar o seu cadastro.
        </p>
        {erro.digest ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Código para o suporte:{" "}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs">
              {erro.digest}
            </code>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={tentarDeNovo} className={BOTAO.primario}>
            Tentar de novo
          </button>
          <Link href="/painel/" className={BOTAO.secundario}>
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}
