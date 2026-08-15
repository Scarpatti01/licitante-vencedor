import Link from "next/link";
import { SITE } from "@/lib/site";
import { pracasParaBusca } from "@/lib/regioes";
import { BuscaDePracas } from "@/components/BuscaDePracas";

/**
 * Cabeçalho e trilha das páginas internas.
 *
 * Estes dois blocos viviam copiados em cada página. A duplicação não era
 * inofensiva: o mesmo `<a href="/">` se repetiu sete vezes e cada página nova
 * nascia herdando o erro — foi assim que o lint acumulou catorze ocorrências da
 * mesma regra. Centralizados aqui, a próxima página herda a versão correta.
 *
 * A home tem cabeçalho próprio, com navegação e sem link para si mesma, então
 * não usa estes componentes de propósito — mas recebe a MESMA busca, montada da
 * mesma função, para as duas não divergirem com o tempo.
 *
 * `prefetch={false}` é deliberado: os dois links apontam para a home, apareceriam
 * em toda página e o padrão do Next é pré-carregar o que está na viewport. Seria
 * baixar a home inteira em cada visita por um link que quase ninguém clica.
 *
 * A busca é montada AQUI, no servidor, e desce como propriedade: `regioes.ts`
 * carrega 100 KB de agregado, e o componente de cliente não pode importá-lo sem
 * levar tudo junto para o navegador.
 */
export function CabecalhoSite() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" prefetch={false} className="text-base font-semibold tracking-tight">
          {SITE.name}
        </Link>
        <BuscaDePracas pracas={pracasParaBusca()} className="w-40 sm:w-56" />
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
