import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { empresaAtual, repositorio } from "@/lib/dados";
import { doEdital } from "@/lib/dominio/procedencia";
import { Procedencia, Secao, Selo } from "@/components/oportunidades/Primitivos";
import { GrupoDeCriterios, ScoreDetalhado } from "@/components/oportunidades/Score";
import { Checklist } from "@/components/oportunidades/Checklist";
import { DetalhesDaPublicacao, FichaDoEdital } from "@/components/oportunidades/FichaDoEdital";
import { Riscos } from "@/components/oportunidades/Riscos";
import { BlocoDeProximaAcao } from "@/components/oportunidades/ProximaAcao";
import { RECOMENDACAO, SITUACAO } from "@/components/oportunidades/estilo";

/**
 * A página do edital: a tela que o produto existe para entregar.
 *
 * A ordem não é estética, é a ordem em que a decisão se forma: o que é
 * (resumo), quanto/onde/até quando (a publicação), o quanto combina com você e
 * POR QUÊ (score com a explicação inteira), o que você precisa ter em mãos
 * (checklist), o que pode dar errado (riscos) e, por último e com o maior
 * destaque da página, o que fazer agora.
 *
 * Nada aqui estima resultado, e isso é decisão de produto e não omissão: não há
 * dado de concorrência, e um percentual inventado seria a informação mais
 * perigosa que este produto poderia publicar.
 *
 * `params` é `Promise` nesta versão do Next — é dado de requisição e chega
 * assíncrono. O identificador vai codificado na URL porque a chave canônica do
 * PNCP contém barra.
 */

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const repo = repositorio();
  const empresaId = await empresaAtual();
  const oportunidade = await repo.oportunidade(empresaId, decodeURIComponent(id));

  return {
    title: oportunidade
      ? oportunidade.edital.objeto.slice(0, 70)
      : "Edital não encontrado",
    robots: { index: false, follow: false },
  };
}

export default async function EditalPagina({ params }: Props) {
  const { id } = await params;
  const agora = new Date();
  const repo = repositorio();
  const empresaId = await empresaAtual();

  const oportunidade = await repo.oportunidade(empresaId, decodeURIComponent(id));
  if (!oportunidade) notFound();

  const { edital, avaliacao, situacao } = oportunidade;
  const { score, checklist, recomendacao } = avaliacao;
  const recomendado = RECOMENDACAO[recomendacao.nivel];

  // `derivadoDoDocumento` é o sinal, disponível na avaliação, de que o texto do
  // edital foi mesmo lido. Toda a honestidade das seções seguintes pendura-se
  // nele: sem leitura, "não encontramos exigência" vira "não procuramos".
  const editalLido = checklist.derivadoDoDocumento;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Trilha" className="text-sm text-[var(--muted)]">
        <Link href="/oportunidades/" className="underline-offset-4 hover:underline">
          Oportunidades
        </Link>
        <span aria-hidden> › </span>
        <span>Edital</span>
      </nav>

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Selo tom={recomendado.tom}>{recomendado.rotulo}</Selo>
          {recomendacao.urgente ? (
            <Selo tom="atencao" comGlifo={false}>
              Urgente
            </Selo>
          ) : null}
          {situacao !== "nova" ? (
            <span className="text-xs text-[var(--muted)]">{SITUACAO[situacao] ?? situacao}</span>
          ) : null}
        </div>

        <h1 className="mt-4 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
          {edital.objeto}
        </h1>

        <Procedencia
          campo={doEdital(edital.objeto, "Objeto publicado pelo órgão na fonte oficial.")}
          className="mt-3"
        />

        <p className="mt-4">
          <a
            href={edital.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--accent)] underline underline-offset-4"
          >
            Ver o registro oficial no PNCP
            <span aria-hidden> ↗</span>
          </a>
        </p>
      </header>

      <div className="mt-10 space-y-10">
        <Secao titulo="Resumo" descricao="A conclusão da triagem e sobre o que ela foi feita.">
          <div className="rounded-xl border p-5 sm:p-6">
            <p className="text-lg leading-relaxed text-balance">{recomendacao.resumo}</p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
              {editalLido
                ? "Esta análise inclui a leitura do documento do edital: as exigências abaixo foram extraídas do texto, e não presumidas."
                : "Esta análise foi feita sobre o registro oficial da publicação — o documento do edital não foi baixado nem lido. Tudo que depende do texto (exigências de habilitação, garantia, visita técnica, amostra e riscos) aparece marcado como não determinado, e nunca como ausência de exigência."}
            </p>
          </div>
        </Secao>

        <Secao
          titulo="A publicação"
          descricao="Valor, órgão, local e prazo — com a origem de cada um ao lado."
        >
          <div className="space-y-8">
            <FichaDoEdital edital={edital} agora={agora} />
            <DetalhesDaPublicacao edital={edital} />
          </div>
        </Secao>

        <Secao
          titulo="Aderência ao seu perfil"
          descricao="O número e, principalmente, os motivos dele. Mede o encaixe entre este edital e o que a sua empresa declarou — é triagem, não previsão de resultado."
        >
          <div className="space-y-8">
            <ScoreDetalhado score={score} />

            <div className="space-y-8">
              <GrupoDeCriterios titulo="Pontos positivos" criterios={score.positivos} />
              <GrupoDeCriterios titulo="Pontos de atenção" criterios={score.atencoes} />
              <GrupoDeCriterios titulo="Impedimentos" criterios={score.impedimentos} />
              <GrupoDeCriterios
                titulo="Não foi possível determinar"
                criterios={score.indeterminados}
                vazio="Todos os critérios tiveram base para serem avaliados."
              />
            </div>
          </div>
        </Secao>

        <Secao
          titulo="Checklist de habilitação"
          descricao="O cruzamento entre o que o edital exige e o que está no cadastro da sua empresa. Documento cadastrado não é o mesmo que documento válido na sessão — por isso são quatro estados, e não dois."
        >
          <Checklist checklist={checklist} />
        </Secao>

        <Secao
          titulo="Riscos"
          descricao="O que costuma custar dias de preparação, e o que ainda não dá para afirmar sobre este certame."
        >
          <Riscos avaliacao={avaliacao} editalLido={editalLido} />
        </Secao>

        <BlocoDeProximaAcao acao={recomendacao.proximaAcao} linkOficial={edital.link} />
      </div>
    </div>
  );
}
