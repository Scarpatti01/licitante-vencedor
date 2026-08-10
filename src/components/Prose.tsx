import type { ReactNode } from "react";

export function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t pt-10">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-[var(--muted)]">{children}</p>;
}

export function RespostaDireta({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-l-[var(--accent)] bg-[var(--surface)] p-5">
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

export function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-[var(--surface)]">
          <tr>
            {cabecalho.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-t align-top">
              {linha.map((celula, j) => (
                <td key={j} className="px-4 py-3 text-[var(--muted)]">{celula}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Indice({ itens }: { itens: { id: string; titulo: string }[] }) {
  return (
    <nav aria-label="Índice" className="rounded-lg border bg-[var(--surface)] p-6">
      <p className="text-sm font-semibold tracking-wide uppercase">Neste guia</p>
      <ol className="mt-3 space-y-2 text-sm">
        {itens.map((item, i) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="text-[var(--muted)] underline-offset-4 hover:underline">
              {i + 1}. {item.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Faq({ itens }: { itens: { pergunta: string; resposta: string }[] }) {
  return (
    <div className="mt-4 space-y-6">
      {itens.map((item) => (
        <div key={item.pergunta}>
          <h3 className="font-semibold">{item.pergunta}</h3>
          <p className="mt-2 leading-relaxed text-[var(--muted)]">{item.resposta}</p>
        </div>
      ))}
    </div>
  );
}
