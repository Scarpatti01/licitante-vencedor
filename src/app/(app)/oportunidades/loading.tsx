import { Esqueleto } from "@/components/oportunidades/Primitivos";

/**
 * Esqueleto da lista.
 *
 * O bloco de filtros aparece com a mesma altura que terá depois: é o elemento
 * com que o usuário mais interage, e vê-lo pular para baixo quando as linhas
 * chegam é o tipo de detalhe que faz uma ferramenta parecer improvisada.
 */
export default function CarregandoOportunidades() {
  return (
    <div
      role="status"
      aria-label="Carregando as oportunidades"
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <div>
        <Esqueleto className="h-8 w-64" />
        <Esqueleto className="mt-3 h-4 w-96 max-w-full" />
      </div>

      <div className="rounded-xl border p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Esqueleto className="h-3 w-20" />
              <Esqueleto className="h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t pt-3">
          <Esqueleto className="h-4 w-40" />
        </div>
      </div>

      <div className="divide-y overflow-hidden rounded-xl border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 sm:grid sm:grid-cols-[4.5rem_minmax(0,1fr)_11rem] sm:gap-6 sm:p-5">
            <Esqueleto className="hidden h-10 w-14 sm:block" />
            <div className="space-y-2.5">
              <Esqueleto className="h-5 w-28 rounded-full" />
              <Esqueleto className="h-5 w-3/4" />
              <Esqueleto className="h-4 w-1/2" />
              <Esqueleto className="h-4 w-40" />
            </div>
            <div className="mt-3 space-y-2 sm:mt-0 sm:flex sm:flex-col sm:items-end">
              <Esqueleto className="h-5 w-24" />
              <Esqueleto className="h-5 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Carregando…</span>
    </div>
  );
}
