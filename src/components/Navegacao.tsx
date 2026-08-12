import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * Cabeçalho e trilha das páginas internas.
 *
 * Estes dois blocos viviam copiados em cada página. A duplicação não era
 * inofensiva: o mesmo `<a href="/">` se repetiu sete vezes e cada página nova
 * nascia herdando o erro — foi assim que o lint acumulou catorze ocorrências da
 * mesma regra. Centralizados aqui, a próxima página herda a versão correta.
 *
 * A home tem cabeçalho próprio, com navegação e sem link para si mesma, então
 * não usa estes componentes de propósito.
 *
 * `prefetch={false}` é deliberado: os dois links apontam para a home, apareceriam
 * em toda página e o padrão do Next é pré-carregar o que está na viewport. Seria
 * baixar a home inteira em cada visita por um link que quase ninguém clica.
 */
export function CabecalhoSite() {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-3xl px-6 py-5">
        <Link href="/" prefetch={false} className="text-base font-semibold tracking-tight">
          {SITE.name}
        </Link>
      </div>
    </header>
  );
}

export function Trilha({ atual }: { atual: string }) {
  return (
    <nav aria-label="Trilha" className="text-sm text-[var(--muted)]">
      <Link href="/" prefetch={false} className="underline-offset-4 hover:underline">
        Início
      </Link>
      <span aria-hidden> › </span>
      <span>{atual}</span>
    </nav>
  );
}
