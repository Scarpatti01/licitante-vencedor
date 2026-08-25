import type { Metadata } from "next";
import { empresaAtual, repositorio } from "@/lib/dados";
import { Pagina } from "@/components/app/ui";
import { FormularioDeRecortes } from "@/components/recortes/FormularioDeRecortes";
import { LIMITE_DE_RECORTES, TETO_DIARIO_POR_RECORTE } from "@/lib/dominio/recorte";

/**
 * Onde a empresa escolhe onde procurar.
 *
 * ## Por que esta página existe separada do perfil
 *
 * O perfil é quem a empresa É: CNPJ, porte, CNAE, atestados, documentos. O
 * recorte é onde ela quer PROCURAR. Misturar os dois obrigaria a empresa a
 * reabrir o cadastro inteiro toda vez que mudasse de cidade, e faria a tela do
 * perfil crescer até ninguém terminar de preencher.
 *
 * ## O que a página precisa dizer antes de qualquer campo
 *
 * Quantos editais cada abrangência traz por dia. Sem esse número, "Brasil"
 * parece a escolha generosa e é a que enche a caixa de entrada; "um município"
 * parece pouco e pode ser São Paulo, com uns 120 por dia. O cliente não tem
 * como saber isso, e a tela que pede a escolha é a que deve informar.
 */

export const metadata: Metadata = {
  title: "Onde procurar",
  description:
    "Os recortes de abrangência da sua conta: município, estado ou Brasil, cada um com o próprio filtro.",
};

export default async function PaginaDeRecortes() {
  const repo = await repositorio();
  const empresaId = await empresaAtual();
  const recortes = await repo.recortes(empresaId);

  return (
    <Pagina
      titulo="Onde procurar"
      descricao={`Até ${LIMITE_DE_RECORTES} recortes, cada um com a própria abrangência e o próprio filtro.`}
    >
      <div className="space-y-8">
        <div className="rounded-xl border p-5">
          <h2 className="text-sm font-semibold">Quanto cada abrangência traz por dia</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Medido no PNCP em 25/08/2026. Serve para escolher com número, e não no escuro.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[26rem] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Abrangência</th>
                  <th className="py-2 pr-4 text-right font-medium">Editais novos por dia</th>
                </tr>
              </thead>
              <tbody className="text-[var(--muted)]">
                <tr className="border-b">
                  <td className="py-2 pr-4">Município pequeno</td>
                  <td className="py-2 pr-4 text-right tabular-nums">menos de 1</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Fortaleza</td>
                  <td className="py-2 pr-4 text-right tabular-nums">46</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">São Paulo (município)</td>
                  <td className="py-2 pr-4 text-right tabular-nums">120</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Ceará (estado)</td>
                  <td className="py-2 pr-4 text-right tabular-nums">176</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">São Paulo (estado)</td>
                  <td className="py-2 pr-4 text-right tabular-nums">514</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Brasil</td>
                  <td className="py-2 pr-4 text-right tabular-nums">2.725</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Você não recebe tudo isso: o filtro do recorte corta, e cada recorte entrega no
            máximo {TETO_DIARIO_POR_RECORTE} por dia, os de maior aderência ao seu perfil. O
            número acima é o tamanho da piscina, não o do e-mail.
          </p>
        </div>

        <FormularioDeRecortes recortes={recortes} />
      </div>
    </Pagina>
  );
}
