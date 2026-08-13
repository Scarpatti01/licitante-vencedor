import { Esqueleto } from "@/components/oportunidades/Primitivos";

/**
 * O esqueleto tem a forma exata do painel, não a forma de um spinner.
 *
 * Um retângulo pulsando no lugar certo diz "está chegando o que você esperava";
 * um spinner centralizado diz "espere sem saber o quê". Como o layout não muda
 * quando o conteúdo entra, também não há salto de página.
 */
export default function CarregandoPainel() {
  return (
    <div
      role="status"
      aria-label="Carregando o painel do dia"
      className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:space-y-10 sm:px-6 sm:py-10"
    >
      <div>
        <Esqueleto className="h-8 w-56" />
        <Esqueleto className="mt-3 h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-[var(--border)] sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 bg-[var(--background)] p-4 sm:p-5">
            <Esqueleto className="h-9 w-14" />
            <Esqueleto className="h-4 w-24" />
            <Esqueleto className="h-3 w-full" />
          </div>
        ))}
      </div>

      <Esqueleto className="h-14 w-full rounded-xl" />

      <div className="space-y-3">
        <Esqueleto className="h-6 w-48" />
        <div className="divide-y overflow-hidden rounded-xl border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 p-5">
              <Esqueleto className="h-4 w-32" />
              <Esqueleto className="h-5 w-2/3" />
              <Esqueleto className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Carregando…</span>
    </div>
  );
}
