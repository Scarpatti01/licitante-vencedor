import type { Metadata } from "next";
import Link from "next/link";
import { ETAPAS, TOTAL_DE_ETAPAS } from "@/lib/jornada/conteudo";
import { estadoDaJornada } from "@/lib/jornada/repositorio";
import { Pagina } from "@/components/app/ui";
import { SemAcessoAJornada } from "@/components/jornada/SemAcessoAJornada";

/**
 * A jornada de doze semanas: o Workbook do Licitante virado produto.
 *
 * ## Por que a lista mostra as doze de uma vez, e não uma por vez
 *
 * Porque a promessa do produto é o caminho inteiro, e esconder o que vem
 * adiante transformaria isto num gotejamento que obriga a pessoa a confiar sem
 * ver. As etapas seguintes ficam abertas de propósito: quem já resolveu as
 * certidões não deve ser impedido de pular para a semana 5.
 *
 * O que a ordem faz é aconselhar, não trancar. As dependências são reais (não
 * dá para ler edital antes de levantar certidão), e a tela diz isso em texto em
 * vez de impedir com cadeado.
 */

export const metadata: Metadata = {
  title: "Jornada de 12 semanas",
  description:
    "O caminho do Workbook do Licitante, uma semana por vez, com os exercícios preenchidos aqui e exportáveis em PDF.",
};

export default async function PaginaDaJornada() {
  const estado = await estadoDaJornada();

  if (!estado.temAcesso) return <SemAcessoAJornada />;

  const percentual = Math.round((estado.concluidas / TOTAL_DE_ETAPAS) * 100);

  return (
    <Pagina
      titulo="Jornada de 12 semanas"
      descricao="Um passo por semana, na ordem em que as coisas dependem umas das outras."
    >
      <div className="space-y-8">
        <section className="rounded-xl border bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Seu progresso</h2>
            <p className="text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--fg)] tabular-nums">
                {estado.concluidas}
              </span>{" "}
              de {TOTAL_DE_ETAPAS} semanas
            </p>
          </div>

          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--muted-bg,#e5e7eb)]"
            role="progressbar"
            aria-valuenow={percentual}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso na jornada"
          >
            <div
              className="h-full rounded-full bg-[var(--accent,#1B4D8F)] transition-[width]"
              style={{ width: `${percentual}%` }}
            />
          </div>

          {estado.proxima ? (
            <p className="mt-4 text-sm">
              <Link
                className="font-medium underline underline-offset-4"
                href={`/minha-jornada/${estado.proxima.semana}/`}
              >
                Continuar na semana {estado.proxima.semana}: {estado.proxima.titulo}
              </Link>
            </p>
          ) : (
            <p className="mt-4 text-sm">
              As doze estão concluídas. O diagnóstico trimestral, na Folha F do
              livro, é o que mantém isso vivo daqui em diante.
            </p>
          )}
          <p className="mt-3 text-sm">
            <Link className="underline underline-offset-4" href="/minha-jornada/exportar/">
              Ver e imprimir as suas respostas
            </Link>
          </p>
        </section>

        {/*
          O livro. Links comuns, e não botões com JavaScript: assim o download
          funciona no menu do botão direito, no "abrir em nova aba" e num
          navegador com script desligado. A conferência da compra acontece no
          servidor a cada clique, então não há atalho a proteger aqui.
        */}
        <section className="rounded-xl border bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold">O Workbook do Licitante</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            As 126 páginas do livro que a jornada acompanha. O PDF é fiel à página
            impressa e serve para imprimir e preencher à mão. O EPUB reflui: você
            escolhe o tamanho da letra, usa modo noturno e continua de onde parou
            em outro aparelho.
          </p>

          {/*
            eslint-disable @next/next/no-html-link-for-pages -- Isto é download,
            não navegação. `<Link>` faria pré-busca da rota e navegação no
            cliente; a resposta é um arquivo binário com `content-disposition:
            attachment`, então o roteador não tem para onde navegar e o download
            não desce. Âncora comum é o certo aqui.
          */}
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
              href="/minha-jornada/livro/pdf/"
            >
              Baixar em PDF
            </a>
            <a
              className="rounded-lg border bg-[var(--background)] px-4 py-2.5 text-sm font-semibold"
              href="/minha-jornada/livro/epub/"
            >
              Baixar em EPUB
            </a>
          </div>
          {/* eslint-enable @next/next/no-html-link-for-pages */}

          <p className="mt-4 text-xs text-[var(--muted)]">
            O seu exemplar sai com o seu nome e o seu e-mail no rodapé de cada
            página. Ele é pessoal e intransferível, e a reprodução é proibida.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            No celular, o EPUB abre no Apple Books, no Google Play Livros ou no
            Kobo. Para ler no Kindle, use o &ldquo;Enviar para Kindle&rdquo; da
            Amazon, que aceita esse formato.
          </p>
        </section>

        <ol className="grid gap-3">
          {ETAPAS.map((etapa) => {
            const marca = estado.progresso.get(etapa.codigo);
            const concluida = Boolean(marca?.concluidaEm);
            const comecada = Boolean(marca) && !concluida;

            return (
              <li key={etapa.codigo}>
                <Link
                  href={`/minha-jornada/${etapa.semana}/`}
                  className="flex gap-4 rounded-xl border p-4 transition-colors hover:bg-[var(--surface)]"
                >
                  <span
                    aria-hidden="true"
                    className={
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums " +
                      (concluida ? "border-transparent bg-[var(--accent,#1B4D8F)] text-white" : "")
                    }
                  >
                    {concluida ? "✓" : etapa.semana}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">
                      Semana {etapa.semana}: {etapa.titulo}
                    </span>
                    <span className="mt-0.5 block text-sm text-[var(--muted)]">
                      {etapa.resumo}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">
                      {concluida
                        ? "Concluída"
                        : comecada
                          ? "Começada"
                          : etapa.noLivro}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </Pagina>
  );
}
