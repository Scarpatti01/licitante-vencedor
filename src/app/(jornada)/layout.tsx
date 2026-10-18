import type { Metadata } from "next";
import Link from "next/link";
import { usuarioAtual, vinculoDoUsuario } from "@/lib/auth/sessao";
import { sair } from "@/lib/auth/acoes";
import { SITE } from "@/lib/site";
import { ConviteDeInstalacao } from "@/components/ConviteDeInstalacao";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * O shell da Jornada, separado do shell do produto.
 *
 * ## Por que a Jornada saiu de `(app)`
 *
 * Até 18/10 ela morava dentro de `(app)`, e o layout de lá exige empresa
 * cadastrada: conta sem vínculo é mandada para `/cadastrar-empresa/`. Faz
 * sentido para quem assina o monitor de editais, que sem empresa não tem o que
 * monitorar. Não faz para quem comprou o Workbook na Hotmart: a pessoa pagou
 * por um livro e uma jornada, criou a conta pelo convite e, em vez do que
 * comprou, encontrava um formulário pedindo CNPJ. Pior: sem login, a rota
 * nem pedia para entrar, e mostrava a página de compra a quem já tinha pago.
 *
 * Aqui a única exigência é estar logado, e quem garante isso é o `proxy.ts`
 * (`/minha-jornada` está em `ROTAS_DO_PRODUTO`). O acesso em si, compra ou
 * assinatura, continua sendo decidido em `estadoDaJornada()`, página a página.
 *
 * Quem também assina vê o atalho para o painel; quem só comprou o livro não vê
 * um produto que não contratou.
 */
export default async function LayoutDaJornada({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const usuario = await usuarioAtual();
  const vinculo = usuario ? await vinculoDoUsuario() : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)]">
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-40 border-b bg-[var(--background)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
          <Link
            href="/minha-jornada/"
            className="text-sm font-semibold tracking-tight whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {SITE.name} · Jornada de 12 semanas
          </Link>

          <nav aria-label="Conta" className="flex items-center gap-4 text-sm">
            {vinculo ? (
              <Link
                href="/painel/"
                className="underline-offset-4 hover:underline"
              >
                Ir para o painel
              </Link>
            ) : null}
            {usuario ? (
              <>
                <span className="hidden text-xs text-[var(--muted)] sm:inline">
                  {usuario.email}
                </span>
                <form action={sair}>
                  <button
                    type="submit"
                    className="underline-offset-4 hover:underline"
                  >
                    Sair
                  </button>
                </form>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      {/* O app instalado abre em /minha-jornada/ (manifest.ts): é aqui que o
          convite para instalar faz sentido para quem só comprou o livro. */}
      <ConviteDeInstalacao />

      <footer className="border-t bg-[var(--background)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="max-w-xl leading-relaxed">
            O Workbook e a Jornada organizam o trabalho. Não são consultoria
            jurídica, e o edital prevalece em qualquer divergência.
          </p>
          <nav aria-label="Documentos do serviço" className="flex gap-4">
            <Link
              href="/jornada/"
              className="underline-offset-4 hover:underline"
            >
              Sobre a Jornada
            </Link>
            <Link
              href="/aviso-legal/"
              className="underline-offset-4 hover:underline"
            >
              Aviso legal
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
