import Link from "next/link";
import { dataDeBrasilia } from "@/lib/dominio/datas";
import type { DistribuicaoPorEsfera, FatiaDaEsfera } from "@/lib/dominio/esferas";

/**
 * O gráfico de onde vêm as licitações, desenhado em HTML.
 *
 * Substituiu um PNG em 19/09/2026. O porquê está em `lib/dominio/esferas.ts`:
 * número dentro de imagem é número escrito à mão que nenhuma guarda lê.
 *
 * Trocar a arte por HTML resolveu três coisas de uma vez, e só a primeira era
 * o objetivo:
 *
 *   1. Os números acompanham a coleta diária sozinhos.
 *   2. No celular a arte antiga encolhia inteira e o miolo dela virava borrão
 *      de 6px. Aqui o texto é texto: reflui, e o leitor dá zoom se quiser.
 *   3. Quem usa leitor de tela recebe a mesma lista que todo mundo, em vez de
 *      um `alt` que eu escrevi descrevendo o que a imagem mostrava.
 *
 * A barra é `aria-hidden` de propósito. Tudo que ela representa está escrito
 * na lista logo abaixo; anunciada, ela leria quatro divs vazias antes de a
 * pessoa chegar no conteúdo.
 */

/**
 * A cor de cada fatia, nos dois temas.
 *
 * `--accent` e `--brass` já viram sozinhas no modo escuro; as outras duas
 * precisam do par explícito. Nenhuma informação depende SÓ da cor: cada fatia
 * repete rótulo e percentual em texto na lista, e a barra é decorativa.
 */
const COR: Record<FatiaDaEsfera["chave"], string> = {
  municipal: "bg-[var(--accent)]",
  estadual: "bg-sky-600 dark:bg-sky-400",
  federal: "bg-[var(--brass)]",
  naoInformada: "bg-slate-400 dark:bg-slate-500",
};

export function EsferasDaColeta({ dados }: { dados: DistribuicaoPorEsfera }) {
  const { fatias, total, medidoEm } = dados;

  return (
    <figure className="mt-8">
      {/*
        `flex` com `flex-grow` proporcional, e não `width` em porcentagem.

        Com larguras percentuais, o arredondamento de subpixel de quatro caixas
        deixa uma fresta na borda direita em certas larguras de tela. O grow
        divide o espaço que existe, então a barra fecha sempre.

        `min-w-[2px]` garante que uma fatia pequena continue visível em vez de
        sumir: "quase nenhum" e "nenhum" são fatos diferentes.
      */}
      <div
        aria-hidden
        className="flex h-10 w-full overflow-hidden rounded-lg sm:h-12"
      >
        {fatias
          .filter((f) => f.editais > 0)
          .map((f) => (
            <div
              key={f.chave}
              className={`min-w-[2px] ${COR[f.chave]}`}
              style={{ flexGrow: f.fracao }}
            />
          ))}
      </div>

      <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {fatias.map((f) => (
          <li key={f.chave} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-1.5 size-3 shrink-0 rounded-sm ${COR[f.chave]}`}
            />
            <div>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {f.percentual}%
                </span>
                <span className="font-medium">{f.rotulo}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {f.editais.toLocaleString("pt-BR")} editais · {f.detalhe}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/*
        A procedência junto do número, como no hero e nas páginas regionais.
        Toda afirmação medida diz quando foi medida e de onde veio.
      */}
      <figcaption className="mt-8 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">
        Base: os {total.toLocaleString("pt-BR")} editais da nossa coleta do{" "}
        <a
          href="https://www.pncp.gov.br/"
          rel="noopener"
          className="underline underline-offset-4"
        >
          Portal Nacional de Contratações Públicas
        </a>{" "}
        em {dataDeBrasilia(medidoEm)}. Os percentuais são arredondados e podem
        não somar exatamente 100. Edital publicado não é contrato assinado: o
        gráfico mostra onde a disputa começa, não quem ganhou.{" "}
        <Link href="/metodologia/" className="underline underline-offset-4">
          Como medimos
        </Link>
      </figcaption>
    </figure>
  );
}
