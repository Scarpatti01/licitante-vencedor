import { Esqueleto } from "@/components/oportunidades/Primitivos";

/** Esqueleto do histórico: duas seções, mesma altura que elas terão com dado. */
export default function CarregandoHistorico() {
  return (
    <div
      role="status"
      aria-label="Carregando o histórico"
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <div>
        <Esqueleto className="h-8 w-48" />
        <Esqueleto className="mt-3 h-4 w-96 max-w-full" />
      </div>

      {[0, 1].map((secao) => (
        <div key={secao} className="space-y-4 border-t pt-8">
          <Esqueleto className="h-5 w-40" />
          <div className="divide-y overflow-hidden rounded-xl border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4 sm:grid sm:grid-cols-[4.5rem_minmax(0,1fr)_9rem] sm:gap-6 sm:p-5">
                <Esqueleto className="hidden h-6 w-14 sm:block" />
                <div className="space-y-2.5">
                  <Esqueleto className="h-5 w-3/4" />
                  <Esqueleto className="h-4 w-1/2" />
                </div>
                <div className="mt-3 sm:mt-0 sm:flex sm:justify-end">
                  <Esqueleto className="h-5 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <span className="sr-only">Carregando…</span>
    </div>
  );
}
