import type { Metadata } from "next";
import Link from "next/link";

const DESCRICAO =
  "A tela que o aplicativo instalado mostra quando abre sem internet, com o que acontece com o que você já salvou.";

export const metadata: Metadata = {
  title: "Sem conexão",
  description: DESCRICAO,
  robots: { index: false, follow: false },
};

/**
 * A tela que o service worker mostra quando a navegação falha por falta de rede.
 *
 * Existe para o app instalado não cair na página de erro do navegador, que num
 * app em tela cheia parece defeito nosso. Ela é estática de propósito: precisa
 * abrir sem servidor, sem sessão e sem dado de ninguém.
 */
export default function SemConexao() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brass)]">
        Sem conexão
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
        Você está offline
      </h1>
      <p className="mt-4 text-[var(--muted)]">
        A sua jornada e os seus editais ficam no servidor, e por isso precisam de
        internet para carregar. Assim que a conexão voltar, é só recarregar e
        você continua de onde parou. Nada do que você já salvou se perdeu.
      </p>
      <p className="mt-8">
        <Link
          href="/minha-jornada/"
          className="inline-block rounded-lg bg-[var(--accent)] px-5 py-3 font-semibold text-white"
        >
          Tentar de novo
        </Link>
      </p>
    </main>
  );
}
