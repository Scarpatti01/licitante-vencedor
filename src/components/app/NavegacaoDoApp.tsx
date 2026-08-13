"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Abas do produto.
 *
 * Cliente por um motivo só: `usePathname`. O layout não re-renderiza na
 * navegação (ver o guia de `layout.js`), então marcar a aba ativa no servidor
 * deixaria o destaque preso na primeira rota visitada.
 *
 * O `aria-current="page"` é o que comunica a aba ativa para leitor de tela — a
 * cor sozinha não comunica nada para quem não a vê, e é justamente por isso que
 * a aba ativa também muda de peso e ganha a barra inferior.
 */

const ABAS = [
  { href: "/painel/", rotulo: "Painel" },
  { href: "/oportunidades/", rotulo: "Oportunidades" },
  { href: "/perfil/", rotulo: "Perfil" },
  { href: "/configuracoes/", rotulo: "Configurações" },
] as const;

export function NavegacaoDoApp() {
  const caminho = usePathname() ?? "/";

  return (
    <nav aria-label="Seções do produto" className="-mb-px overflow-x-auto">
      <ul className="flex min-w-max items-stretch gap-1">
        {ABAS.map((aba) => {
          const ativa = caminho === aba.href || caminho.startsWith(aba.href);
          return (
            <li key={aba.href}>
              <Link
                href={aba.href}
                aria-current={ativa ? "page" : undefined}
                className={`inline-flex items-center border-b-2 px-3 py-3 text-sm transition-colors focus-visible:rounded-t-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  ativa
                    ? "border-b-[var(--accent)] font-semibold text-[var(--foreground)]"
                    : "border-b-transparent text-[var(--muted)] hover:border-b-[var(--border)] hover:text-[var(--foreground)]"
                }`}
              >
                {aba.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
