import type { Metadata } from "next";
import { FormularioDeEmpresa } from "@/components/auth/FormularioDeEmpresa";

/**
 * Cadastro da empresa, FORA do grupo `(app)`.
 *
 * A posição é a correção de um laço infinito, e vale explicar para ninguém
 * "arrumar" de volta: o layout de `(app)` manda para cá quem tem conta e não
 * tem empresa. Se esta página morasse lá dentro, ela executaria o mesmo layout,
 * seria redirecionada para si mesma, e o navegador desistiria com
 * ERR_TOO_MANY_REDIRECTS.
 *
 * Fora do grupo, ela também não carrega a navegação do produto — o que é certo:
 * não há painel, oportunidade nem perfil para navegar antes de existir empresa.
 */
export const metadata: Metadata = {
  title: "Cadastrar empresa",
  robots: { index: false, follow: false },
};

export default function CadastrarEmpresa() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Cadastre a sua empresa</h1>
      <p className="mt-2 mb-8 max-w-prose leading-relaxed text-[var(--muted)]">
        É o primeiro passo. Depois dele, o assistente pergunta o que a triagem
        precisa saber para separar o que é seu do que não é.
      </p>
      <FormularioDeEmpresa />
    </main>
  );
}
