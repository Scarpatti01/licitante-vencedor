import type { Metadata } from "next";
import { exigirAdministrador } from "@/lib/auth/administracao";
import { abrirCompras, TETO_DE_LEITURA, type CompraDaJornada } from "@/lib/jornada/compras";
import { Aviso, Cartao, Etiqueta, Pagina, Vazio } from "@/components/app/ui";
import {
  FormularioDeLiberacao,
  FormularioDeRevogacao,
} from "@/components/jornada/FormularioDeLiberacao";

export const metadata: Metadata = {
  title: "Acessos da jornada",
  robots: { index: false, follow: false },
};

/**
 * Onde o dono libera acesso à jornada na mão.
 *
 * Existe porque a venda avulsa acontece numa plataforma externa, e enquanto o
 * webhook dela não sobe alguém precisa transformar um pagamento aprovado em
 * acesso. Depois do webhook ela continua servindo: cortesia, reembolso, e o caso
 * frequente do comprador que digitou o e-mail errado no checkout.
 *
 * ## As três situações levam a três telas
 *
 * sem credencial do banco → diz o que falta ligar
 * banco recusou a leitura → diz que falhou, e não inventa lista vazia
 * leitura vazia           → diz que ninguém comprou ainda
 *
 * Achatar as três em "nenhuma compra" contaria ao dono que não vendeu quando o
 * que está errado é a configuração. Mesma regra da tela de leads.
 */
export default async function PaginaDeAcessosDaJornada() {
  await exigirAdministrador();

  const painel = abrirCompras();

  let compras: CompraDaJornada[] | null = null;
  let falha: string | null = null;
  if (painel) {
    try {
      compras = await painel.listar();
    } catch (erro) {
      console.error("Falha ao ler as compras da jornada", erro);
      falha = "O banco recusou a leitura. A lista abaixo não é 'nenhuma compra', é 'não deu para saber'.";
    }
  }

  const pagaramENaoEntraram = (compras ?? []).filter(
    (c) => !c.reivindicadoEm && !c.revogadoEm,
  ).length;

  return (
    <Pagina
      titulo="Acessos da jornada"
      descricao="Liberar acesso na mão, para as vendas que ainda não passam por webhook."
    >
      <div className="space-y-8">
        {!painel ? (
          <Aviso tom="atencao" titulo="Falta ligar o banco">
            Sem <code>SUPABASE_SERVICE_ROLE_KEY</code> no ambiente, esta tela não
            lê nem grava. As variáveis ficam na Vercel, em Settings, Environment
            Variables.
          </Aviso>
        ) : null}

        {falha ? (
          <Aviso tom="atencao" titulo="Não deu para ler">
            {falha}
          </Aviso>
        ) : null}

        <Cartao>
          <Etiqueta>Como funciona</Etiqueta>
          <p className="mt-2 text-sm text-[var(--muted)]">
            O acesso é registrado pelo <strong>e-mail</strong>, e não pela conta.
            Você pode liberar antes de a pessoa se cadastrar: quando ela entrar
            com esse mesmo e-mail, a jornada já está lá esperando. É o que impede
            uma compra de sumir por a conta ainda não existir.
          </p>
        </Cartao>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold">Liberar</h2>
            <div className="mt-4">
              <FormularioDeLiberacao />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold">Revogar</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Para estorno e fraude. Revoga todas as compras não revogadas
              daquele e-mail.
            </p>
            <div className="mt-4">
              <FormularioDeRevogacao />
            </div>
          </section>
        </div>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Compras registradas</h2>
            {compras && compras.length > 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {compras.length}
                {compras.length === TETO_DE_LEITURA ? " (limite da leitura)" : ""}
                {pagaramENaoEntraram > 0
                  ? `, sendo ${pagaramENaoEntraram} que ainda não entraram`
                  : ""}
              </p>
            ) : null}
          </div>

          {compras === null ? null : compras.length === 0 ? (
            <div className="mt-4">
              <Vazio titulo="Ninguém comprou ainda">
                Quando a primeira venda entrar, libere aqui e ela aparece nesta
                lista.
              </Vazio>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">E-mail</th>
                    <th className="py-2 pr-4 font-medium">Origem</th>
                    <th className="py-2 pr-4 font-medium">Transação</th>
                    <th className="py-2 pr-4 font-medium">Já entrou?</th>
                    <th className="py-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c) => (
                    <tr key={`${c.email}-${c.criadoEm}`} className="border-b align-top">
                      <td className="py-2 pr-4">{c.email}</td>
                      <td className="py-2 pr-4">{c.origem}</td>
                      <td className="py-2 pr-4 text-[var(--muted)]">{c.referencia ?? "sem"}</td>
                      <td className="py-2 pr-4">{c.reivindicadoEm ? "sim" : "ainda não"}</td>
                      <td className="py-2">
                        {c.revogadoEm ? `revogado: ${c.motivoDaRevogacao ?? "sem motivo"}` : "ativo"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Pagina>
  );
}
