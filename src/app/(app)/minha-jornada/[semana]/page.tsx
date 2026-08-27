import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ETAPAS, etapaPorSemana, TOTAL_DE_ETAPAS } from "@/lib/jornada/conteudo";
import { estadoDaJornada, respostasDaEtapa } from "@/lib/jornada/repositorio";
import { Pagina } from "@/components/app/ui";
import { SemAcessoAJornada } from "@/components/jornada/SemAcessoAJornada";
import { FormularioDaEtapa } from "@/components/jornada/FormularioDaEtapa";

type Parametros = { params: Promise<{ semana: string }> };

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const { semana } = await params;
  const etapa = etapaPorSemana(Number(semana));
  if (!etapa) return { title: "Semana não encontrada" };
  return {
    title: `Semana ${etapa.semana}: ${etapa.titulo}`,
    description: etapa.resumo,
  };
}

/**
 * Uma semana da jornada.
 *
 * ## Por que o exercício fica na mesma página do texto
 *
 * Porque o livro é para preencher, e separar leitura de preenchimento em duas
 * telas cria um passo a mais entre entender e responder. É exatamente nesse
 * passo que a pessoa fecha a aba.
 *
 * ## Por que não há cadeado na semana seguinte
 *
 * A ordem aconselha e não tranca. Quem já tem certidão em dia não deve ser
 * obrigado a marcar a semana 2 como concluída para chegar na 3, e um produto
 * que finge que ela não sabe o que já sabe é um produto que ela abandona.
 */
export default async function PaginaDaSemana({ params }: Parametros) {
  const { semana } = await params;
  const numero = Number(semana);
  const etapa = etapaPorSemana(numero);
  if (!etapa) notFound();

  const estado = await estadoDaJornada();
  if (!estado.temAcesso) return <SemAcessoAJornada />;

  const respostas = await respostasDaEtapa(etapa.codigo);
  const concluida = Boolean(estado.progresso.get(etapa.codigo)?.concluidaEm);

  const anterior = ETAPAS.find((e) => e.semana === numero - 1);
  const seguinte = ETAPAS.find((e) => e.semana === numero + 1);

  return (
    <Pagina
      titulo={`Semana ${etapa.semana}: ${etapa.titulo}`}
      descricao={etapa.resumo}
    >
      <div className="space-y-8">
        <p className="text-xs text-[var(--muted)]">
          Semana {etapa.semana} de {TOTAL_DE_ETAPAS} &middot; No livro: {etapa.noLivro}
        </p>

        <div className="max-w-2xl space-y-4">
          {etapa.texto.map((paragrafo, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {paragrafo}
            </p>
          ))}
        </div>

        <div className="rounded-xl border-l-2 border-[var(--accent,#1B4D8F)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
            Como eu sei que terminei
          </p>
          <p className="mt-1 text-sm">{etapa.criterio}</p>
        </div>

        <FormularioDaEtapa
          etapa={etapa}
          respostas={Object.fromEntries(respostas)}
          concluida={concluida}
        />

        <nav className="flex flex-wrap justify-between gap-4 border-t pt-5 text-sm">
          {anterior ? (
            <Link className="underline underline-offset-4" href={`/minha-jornada/${anterior.semana}/`}>
              Semana {anterior.semana}: {anterior.titulo}
            </Link>
          ) : (
            <Link className="underline underline-offset-4" href="/minha-jornada/">
              Voltar para a jornada
            </Link>
          )}
          {seguinte ? (
            <Link className="underline underline-offset-4" href={`/minha-jornada/${seguinte.semana}/`}>
              Semana {seguinte.semana}: {seguinte.titulo}
            </Link>
          ) : null}
        </nav>
      </div>
    </Pagina>
  );
}
