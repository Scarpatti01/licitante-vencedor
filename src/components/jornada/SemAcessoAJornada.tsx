import Link from "next/link";
import { Pagina } from "@/components/app/ui";
import { TOTAL_DE_ETAPAS } from "@/lib/jornada/conteudo";
import { usuarioAtual } from "@/lib/auth/sessao";
import { sairECriarContaDaCompra } from "@/lib/auth/acoes";
import { CONTATO } from "@/lib/site";

/**
 * O que aparece para quem ainda não tem a jornada.
 *
 * Duas portas, e a tela precisa mostrar as duas sem empurrar nenhuma: quem
 * assina já tem, e quem não assina compra à parte. Esconder a compra avulsa
 * transformaria a jornada num argumento de assinatura disfarçado, e quem quer
 * só o livro tem direito de comprar só o livro.
 */
export async function SemAcessoAJornada() {
  const usuario = await usuarioAtual();
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

        {/*
          Quem acabou de comprar na Hotmart e caiu aqui. Vem ANTES das ofertas:
          a pessoa que pagou e não vê o que pagou é a que mais precisa de
          resposta, e o motivo quase sempre é um destes dois. O e-mail logado
          aparece escrito porque comprar com um e criar a conta com outro é o
          caso mais comum, e ninguém descobre isso sem ver os dois lado a lado.
        */}
        <div className="rounded-xl border bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold">Já comprou o Workbook e caiu aqui?</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              A compra é reconhecida pelo e-mail usado na Hotmart.
              {usuario?.email ? (
                <>
                  {" "}Você entrou como <strong>{usuario.email}</strong>. Se comprou com outro
                  endereço,{" "}
                  <form action={sairECriarContaDaCompra} className="inline">
                    <button type="submit" className="underline underline-offset-4">
                      saia e crie a conta com o e-mail da compra
                    </button>
                  </form>
                  .
                </>
              ) : null}
            </li>
            <li>
              Se acabou de pagar, a confirmação da Hotmart pode levar alguns minutos para
              chegar aqui. Espere um pouco e recarregue esta página.
            </li>
            <li>
              Continua sem acesso? Escreva para{" "}
              <a className="underline underline-offset-4" href={`mailto:${CONTATO.email}`}>
                {CONTATO.email}
              </a>{" "}
              com o e-mail da compra, que a gente libera na mão.
            </li>
          </ol>
        </div>

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
