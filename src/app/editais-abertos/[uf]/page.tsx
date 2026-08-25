import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { P, RespostaDireta, Secao } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { CardAssinatura } from "@/components/CardAssinatura";
import { RodapeSite } from "@/components/RodapeSite";
import { ListaDeAbertos, RetratoDatado } from "@/components/abertos/ListaDeAbertos";
import { COLETADO_EM, ufAberta, ufsComAbertos } from "@/lib/abertos/acervo";
import { temPaginaDeUf } from "@/lib/abertos/paginas";
import { limitarDescricao } from "@/lib/seo/resultado-de-busca";

/**
 * A listagem de editais abertos de um estado.
 *
 * Só existe para UF que tem amostra no retrato — ver `paginas.ts`. Uma página
 * de listagem sem listagem é uma URL vazia indexada, e isso custa autoridade de
 * domínio sem devolver nada.
 */

type Parametros = { uf: string };

/**
 * Sem geração sob demanda: uma UF que não passou no portão responde 404, em vez
 * de renderizar uma página vazia. Mesma disciplina de `/licitacoes/[uf]/[...]`.
 */
export const dynamicParams = false;

export function generateStaticParams(): Parametros[] {
  return ufsComAbertos()
    .filter(temPaginaDeUf)
    .map((u) => ({ uf: u.uf.toLowerCase() }));
}

const numero = (n: number) => n.toLocaleString("pt-BR");

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametros>;
}): Promise<Metadata> {
  const { uf } = await params;
  const u = ufAberta(uf);
  if (!u) return {};

  const titulo = `Editais abertos em ${u.uf}: ${numero(u.abertos)} agora, ${numero(u.novos)} novos`;
  const descricao =
    `${numero(u.abertos)} editais com proposta aberta em ${u.uf} e ${numero(u.novos)} publicados ` +
    `nas últimas 24 horas. Os que encerram primeiro, com o prazo de cada um e a hora do retrato.`;

  return {
    title: titulo,
    description: limitarDescricao(descricao),
    alternates: { canonical: `/editais-abertos/${u.uf.toLowerCase()}/` },
    openGraph: {
      images: IMAGENS_DE_COMPARTILHAMENTO,
      title: titulo,
      description: limitarDescricao(descricao),
      url: `${SITE.url}/editais-abertos/${u.uf.toLowerCase()}/`,
      type: "website",
    },
  };
}

export default async function EditaisAbertosDaUf({
  params,
}: {
  params: Promise<Parametros>;
}) {
  const { uf } = await params;
  const u = ufAberta(uf);
  if (!u || !temPaginaDeUf(u)) notFound();

  return (
    <>
      <CabecalhoSite />
      <Trilha atual={`Editais abertos em ${u.uf}`} />

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Editais abertos em {u.uf}
        </h1>

        <RetratoDatado coletadoEm={COLETADO_EM} />

        <RespostaDireta>
          <strong>{numero(u.abertos)} editais</strong> estavam com proposta aberta em{" "}
          {u.uf} quando este retrato foi tirado. <strong>{numero(u.novos)}</strong>{" "}
          apareceram nas últimas 24 horas e <strong>{numero(u.encerramEm24h)}</strong>{" "}
          encerram nas próximas 24.
        </RespostaDireta>

        <Secao id="abertos" titulo={`${u.editais.length} editais abertos em ${u.uf}`}>
          <P>
            Todos com prazo além da próxima coleta — nenhum encerra enquanto esta
            página estiver no ar. Os de prazo mais próximo primeiro.
          </P>
          <ListaDeAbertos editais={u.editais} />
        </Secao>

        <Secao id="brasil" titulo="Outros estados">
          <P>
            <Link href="/editais-abertos/" className="underline underline-offset-2">
              Ver o total do Brasil e a tabela por estado
            </Link>
            .
          </P>
        </Secao>

        <CapturaAlerta origem={`editais-abertos-${u.uf.toLowerCase()}`} />
        <CardAssinatura />
      </article>

      <RodapeSite />
    </>
  );
}
