import type { ReactNode } from "react";

/**
 * Primitivas visuais do produto.
 *
 * Ficam separadas de `Prose.tsx` porque resolvem um problema diferente: aquele
 * arquivo é para texto longo lido uma vez; este é para tela de trabalho, aberta
 * todo dia útil, onde a densidade importa e a hierarquia precisa aguentar
 * quinze blocos na mesma página sem virar sopa.
 *
 * Nenhum destes componentes tem estado — todos rodam no servidor. O `"use
 * client"` do projeto é gasto só onde existe interação de verdade.
 */

/**
 * Classes dos botões, em um lugar só.
 *
 * O foco visível está embutido em todas as variantes de propósito: quem navega
 * por teclado não deve depender de alguém ter lembrado de acrescentar o anel em
 * cada botão. `disabled:` também é comum às três porque botão em envio precisa
 * parecer inerte sem sumir.
 */
const BASE_DO_BOTAO =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60";

export const BOTAO = {
  primario: `${BASE_DO_BOTAO} bg-[var(--accent)] text-white hover:opacity-90 dark:text-[#04121b]`,
  secundario: `${BASE_DO_BOTAO} border bg-[var(--background)] hover:bg-[var(--surface)]`,
  discreto: `${BASE_DO_BOTAO} text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]`,
} as const;

export function Pagina({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {titulo}
          </h1>
          {descricao ? (
            <div className="mt-2 leading-relaxed text-[var(--muted)]">{descricao}</div>
          ) : null}
        </div>
        {acoes ? <div className="flex shrink-0 items-center gap-2">{acoes}</div> : null}
      </div>
      <div className="mt-8 space-y-6">{children}</div>
    </div>
  );
}

export function Cartao({
  titulo,
  descricao,
  acoes,
  children,
  id,
}: {
  titulo?: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-xl border bg-[var(--background)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      {titulo ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold tracking-tight">{titulo}</h2>
            {descricao ? (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                {descricao}
              </p>
            ) : null}
          </div>
          {acoes ? <div className="flex items-center gap-2">{acoes}</div> : null}
        </header>
      ) : null}
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

const TONS = {
  neutro: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
  positivo:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
  atencao:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  critico:
    "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200",
  destaque:
    "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]",
} as const;

export type Tom = keyof typeof TONS;

export function Etiqueta({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONS[tom]}`}
    >
      {children}
    </span>
  );
}

/**
 * Bloco de aviso.
 *
 * `role="status"` em vez de `alert` por padrão: o leitor de tela anuncia quando
 * terminar a frase atual, em vez de interromper. Interromper fica reservado a
 * erro de envio, onde a interrupção é o ponto.
 */
export function Aviso({
  tom = "neutro",
  titulo,
  children,
  papel = "status",
}: {
  tom?: Tom;
  titulo?: string;
  children: ReactNode;
  papel?: "status" | "alert" | "none";
}) {
  return (
    <div
      role={papel === "none" ? undefined : papel}
      className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${TONS[tom]}`}
    >
      {titulo ? <p className="font-semibold">{titulo}</p> : null}
      <div className={titulo ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}

/** Estado vazio com saída. Um vazio sem próximo passo é um beco. */
export function Vazio({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-10 text-center">
      <p className="font-semibold tracking-tight">{titulo}</p>
      <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {children}
      </div>
      {acao ? <div className="mt-5 flex justify-center">{acao}</div> : null}
    </div>
  );
}

export function Definicao({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div className="py-3">
      <dt className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">{termo}</dt>
      <dd className="mt-1 leading-relaxed break-words">{children}</dd>
    </div>
  );
}

export function ListaDeDefinicoes({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-8 divide-y sm:grid-cols-2 sm:divide-y-0">{children}</dl>;
}

/** Ausência declarada. Nunca "—" mudo: o usuário precisa saber o que fazer. */
export function SemInformacao({ children }: { children?: ReactNode }) {
  return (
    <span className="text-[var(--muted)] italic">{children ?? "não informado"}</span>
  );
}

/** Esqueleto de carregamento. Puro enfeite acessível: escondido do leitor. */
export function Esqueleto({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-[var(--surface)] ${className}`}
    />
  );
}

export function CarregandoPagina({ titulo }: { titulo: string }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <p className="sr-only" role="status">
        Carregando {titulo}…
      </p>
      <Esqueleto className="h-9 w-72 max-w-full" />
      <Esqueleto className="mt-3 h-5 w-full max-w-xl" />
      <div className="mt-8 space-y-6">
        <Esqueleto className="h-40 w-full" />
        <Esqueleto className="h-64 w-full" />
      </div>
    </div>
  );
}
