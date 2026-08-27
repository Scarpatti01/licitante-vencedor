import Link from "next/link";
import { Pagina } from "@/components/app/ui";
import { TOTAL_DE_ETAPAS } from "@/lib/jornada/conteudo";

/**
 * O que aparece para quem ainda não tem a jornada.
 *
 * Duas portas, e a tela precisa mostrar as duas sem empurrar nenhuma: quem
 * assina já tem, e quem não assina compra à parte. Esconder a compra avulsa
 * transformaria a jornada num argumento de assinatura disfarçado, e quem quer
 * só o livro tem direito de comprar só o livro.
 */
export function SemAcessoAJornada() {
  return (
    <Pagina
      titulo="Jornada de 12 semanas"
      descricao="O caminho do Workbook do Licitante, com os exercícios preenchidos aqui."
    >
      <div className="space-y-6">
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          São {TOTAL_DE_ETAPAS} semanas, na ordem em que as coisas dependem umas
          das outras: o diagnóstico, as certidões, os cadastros, o mapa das suas
          praças, a triagem cronometrada, a primeira disputa e a decisão sobre o
          que automatizar. Cada semana tem um critério de conclusão escrito e um
          exercício que fica salvo na sua conta.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-5">
            <h2 className="text-sm font-semibold">Já vem com a assinatura</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Quem assina o Licitante Vencedor tem a jornada incluída, e o teste
              também dá acesso a ela.
            </p>
            <p className="mt-4 text-sm">
              <Link className="font-medium underline underline-offset-4" href="/precos/">
                Ver os planos
              </Link>
            </p>
          </div>

          <div className="rounded-xl border p-5">
            <h2 className="text-sm font-semibold">Ou compre só a jornada</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Pagamento único de R$ 47, acesso sem prazo, sem assinar nada.
              Inclui o livro em PDF e as folhas de trabalho.
            </p>
            <p className="mt-4 text-sm">
              <Link className="font-medium underline underline-offset-4" href="/jornada/">
                Ver a jornada
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Pagina>
  );
}
