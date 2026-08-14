import Link from "next/link";
import type { ReactNode } from "react";
import { CabecalhoSite } from "./Navegacao";

/**
 * A tela de resultado de uma ação vinda de link de e-mail.
 *
 * Serve `/confirmar/` e `/descadastrar/`, que têm a mesma forma: a pessoa chega
 * de fora, sem contexto, depois de clicar em algo dentro de um e-mail. Duas
 * decisões vêm daí.
 *
 * **Sem navegação e sem rodapé de site.** Quem chega aqui veio resolver uma
 * coisa só. Encher a página de links de blog e de produto no momento em que a
 * pessoa pediu para SAIR da lista é a espécie de esperteza que produz denúncia
 * de spam.
 *
 * **Todo estado termina em caminho adiante.** Inclusive o de erro — uma tela que
 * diz "link inválido" e para por aí devolve a pessoa ao e-mail, que é onde o
 * link inválido está. `caminhos` é obrigatório de propósito: não dá para criar
 * um beco sem saída sem reparar nisso.
 */

export type CaminhoAdiante = {
  href: string;
  rotulo: string;
  /** Destaca o caminho principal. No máximo um por tela. */
  principal?: boolean;
};

export function TelaDeAviso({
  titulo,
  children,
  caminhos,
}: {
  titulo: string;
  /** O que aconteceu e o que isso significa, em uma ou duas frases. */
  children: ReactNode;
  caminhos: CaminhoAdiante[];
}) {
  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-4xl">
          {titulo}
        </h1>

        <div className="mt-6 space-y-4 leading-relaxed">{children}</div>

        <div className="mt-10 flex flex-wrap gap-3">
          {caminhos.map((caminho) => (
            <Link
              key={caminho.href}
              href={caminho.href}
              prefetch={false}
              className={
                caminho.principal
                  ? "rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white"
                  : "rounded-md border px-5 py-2.5 text-sm font-medium"
              }
            >
              {caminho.rotulo}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

/** Parágrafo secundário das telas de aviso — o detalhe que não é a manchete. */
export function Detalhe({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-[var(--muted)]">{children}</p>;
}
