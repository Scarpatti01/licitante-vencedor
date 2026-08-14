import Link from "next/link";

/**
 * Edital fora do alcance desta empresa.
 *
 * O texto evita o clássico "não encontrado" seco porque, aqui, ele quase nunca
 * significa erro de digitação: significa que o certame não entrou na triagem
 * desta empresa, ou que a coleta ainda não cobriu o estado dele. Dizer isso é
 * responder à pergunta que o usuário faria em seguida.
 */
export default function EditalNaoEncontrado() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
        Edital indisponível
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Este edital não está na triagem da sua empresa
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-[var(--muted)]">
        Ou o endereço está incompleto, ou o certame não entrou na sua triagem — o que costuma
        acontecer quando o estado dele está fora da cobertura da coleta ou fora dos estados que você
        declarou atender.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/oportunidades/"
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Ver as suas oportunidades
        </Link>
        <Link
          href="/painel/"
          className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
        >
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
