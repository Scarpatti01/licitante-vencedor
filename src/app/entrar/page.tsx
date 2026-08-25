import type { Metadata } from "next";
import { FormularioDeAcesso, LinkDeAcesso } from "@/components/auth/FormularioDeAcesso";
import { entrar } from "@/lib/auth/acoes";

/**
 * Entrada de cliente.
 *
 * Fora do grupo `(app)` de propósito: aquele layout traz a navegação do produto
 * e o aviso de demonstração, e as duas coisas pressupõem alguém já dentro.
 *
 * `noindex` porque tela de login não tem o que fazer em busca — ela não responde
 * a intenção nenhuma e ainda dilui o rastreamento das páginas que convertem.
 */
export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  // `searchParams` é uma Promise neste Next — mudou na 15, e a 16 removeu o
  // acesso síncrono de compatibilidade.
  const { proximo } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--muted)]">
        Acesse o painel da sua empresa.
      </p>

      <FormularioDeAcesso
        acao={entrar}
        rotulo="Entrar"
        enviando="Entrando…"
        proximo={proximo}
        rodape={
          <>
            Ainda não tem conta? <LinkDeAcesso href="/criar-conta/">Criar conta</LinkDeAcesso>.
          </>
        }
      />
    </main>
  );
}
