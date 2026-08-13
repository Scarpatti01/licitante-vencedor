import { Esqueleto } from "@/components/oportunidades/Primitivos";

/** Esqueleto da página do edital, na mesma largura e na mesma ordem do conteúdo. */
export default function CarregandoEdital() {
  return (
    <div
      role="status"
      aria-label="Carregando o edital"
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10"
    >
      <Esqueleto className="h-4 w-40" />

      <div className="mt-5 space-y-4">
        <Esqueleto className="h-6 w-32 rounded-full" />
        <Esqueleto className="h-8 w-full" />
        <Esqueleto className="h-8 w-2/3" />
        <Esqueleto className="h-4 w-72 max-w-full" />
      </div>

      <div className="mt-10 space-y-10">
        <div className="space-y-4 border-t pt-8">
          <Esqueleto className="h-6 w-32" />
          <Esqueleto className="h-24 w-full rounded-xl" />
        </div>

        <div className="space-y-4 border-t pt-8">
          <Esqueleto className="h-6 w-40" />
          <div className="grid gap-px overflow-hidden rounded-xl border bg-[var(--border)] sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 bg-[var(--background)] p-4 sm:p-5">
                <Esqueleto className="h-3 w-24" />
                <Esqueleto className="h-6 w-32" />
                <Esqueleto className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 border-t pt-8">
          <Esqueleto className="h-6 w-48" />
          <Esqueleto className="h-32 w-full rounded-xl" />
          <Esqueleto className="h-20 w-full rounded-lg" />
          <Esqueleto className="h-20 w-full rounded-lg" />
        </div>
      </div>

      <span className="sr-only">Carregando…</span>
    </div>
  );
}
