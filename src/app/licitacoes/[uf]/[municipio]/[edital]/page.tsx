import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { P, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { CardAssinatura } from "@/components/CardAssinatura";
import { todosOsPosts, postPorSlug, caminhoDoPost } from "@/lib/posts/acervo";
import {
  encerrado,
  instanteDaPagina,
  limiteAproximadoDeImpugnacao,
  type PostDeEdital,
} from "@/lib/posts/tipos";
import { semCarimboDoPortal } from "@/lib/posts/slug";
import { caminhoDoMunicipio, municipioPorSlug, nomeDaUf } from "@/lib/regioes";
import { dataDeBrasilia } from "@/lib/dominio/datas";
import { LeituraDoEdital } from "@/components/posts/LeituraDoEdital";

/**
 * A página de um edital publicado como notícia datada.
 *
 * ## O que ela promete, e o que ela não promete
 *
 * Ela **não** diz "este edital está aberto". Diz "em tal dia, este edital estava
 * publicado com este prazo" — e as três datas ficam visíveis justamente para o
 * leitor saber em que ponto do tempo ele está. Quando o prazo passa, a página se
 * declara encerrada sozinha, sem ninguém republicar nada.
 *
 * Isso é o que torna o formato honesto: o post envelhece para arquivo, não para
 * mentira.
 *
 * ## Por que a tarja de encerrado é grande
 *
 * Quem chega do buscador procurando licitação aberta e cai num edital fechado
 * precisa perceber isso em um segundo. Se a informação for discreta, a pessoa lê
 * a página inteira e só descobre no fim — e aí se sente enganada, que é o único
 * jeito de este modelo queimar a marca.
 *
 * ## O que damos além do que o PNCP já tem
 *
 * O objeto e os números são públicos e estão na fonte. O que esta página soma é
 * contexto que a fonte não dá: o retrato do mercado daquele município, o prazo
 * aproximado para impugnar, e o que aquela modalidade exige de quem quer
 * participar. Sem isso a página seria cópia do PNCP — e a fonte oficial sempre
 * ranqueia melhor que a cópia dela.
 */

type Parametros = { uf: string; municipio: string; edital: string };

/** Geradas na build, a partir das levas versionadas. */
export const dynamicParams = false;

/**
 * Uma hora, e é o número que impede a página de mentir.
 *
 * O conteúdo do post é congelado — ele não muda depois de publicado. Mas UMA
 * afirmação da página depende do relógio: se o certame já encerrou. Sem
 * revalidação, esse estado ficaria fixo no instante do build, e um edital que
 * fecha às 09:30 continuaria exibindo "propostas até" para quem chegasse às 14h.
 *
 * É exatamente o modo de falha que a tarja existe para evitar — o visitante
 * descobrindo tarde que perdeu o prazo. Uma hora é folgado para um prazo medido
 * em dias, e mantém a página estática e barata no resto do tempo.
 */
export const revalidate = 3600;

export function generateStaticParams(): Parametros[] {
  return todosOsPosts().map((p) => ({
    uf: p.uf.toLowerCase(),
    municipio: p.municipioSlug,
    edital: p.slug,
  }));
}

const real = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** O título curto: o objeto sem o carimbo do portal, cortado no fim de palavra. */
function titulo(post: PostDeEdital): string {
  const limpo = semCarimboDoPortal(post.objeto);
  if (limpo.length <= 90) return limpo;
  const corte = limpo.slice(0, 90);
  return corte.slice(0, corte.lastIndexOf(" ")) + "…";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametros>;
}): Promise<Metadata> {
  const { uf, municipio, edital } = await params;
  const post = postPorSlug(uf, municipio, edital);
  if (!post) return {};

  const fechou = encerrado(post);
  const cabeca = `${post.modalidade} em ${post.municipio}/${post.uf}: ${titulo(post)}`;
  const descricao =
    `${fechou ? "ENCERRADO. " : ""}${post.orgao} publicou no PNCP em ` +
    `${post.publicadoEm ? dataDeBrasilia(post.publicadoEm) : "data não informada"}, ` +
    `com valor estimado de ${real(post.valorEstimado)} e propostas até ` +
    `${dataDeBrasilia(post.encerramentoProposta)}.`;

  return {
    title: cabeca.slice(0, 70),
    description: descricao.slice(0, 160),
    alternates: { canonical: caminhoDoPost(post) },
    openGraph: {
      images: IMAGENS_DE_COMPARTILHAMENTO,
      title: cabeca,
      description: descricao.slice(0, 160),
      url: `${SITE.url}${caminhoDoPost(post)}`,
      type: "article",
      publishedTime: post.postadoEm,
    },
  };
}

export default async function PaginaDoEdital({
  params,
}: {
  params: Promise<Parametros>;
}) {
  const { uf, municipio, edital } = await params;
  const post = postPorSlug(uf, municipio, edital);
  if (!post) notFound();

  // Um relógio só para a página inteira. Ver `instanteDaPagina`: duas leituras
  // separadas podem cair em lados diferentes do mesmo segundo e fazer a página
  // dizer "encerrado" num bloco e "ainda dá para impugnar" no outro.
  const agora = instanteDaPagina();
  const fechou = encerrado(post, agora);
  const praca = municipioPorSlug(post.uf, post.municipioSlug);
  const limiteImpugnacao = limiteAproximadoDeImpugnacao(post);
  const aindaDaParaImpugnar = limiteImpugnacao.getTime() > agora.getTime();

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${SITE.url}${caminhoDoPost(post)}#article`,
        headline: titulo(post),
        datePublished: post.postadoEm,
        dateModified: post.postadoEm,
        inLanguage: SITE.locale,
        publisher: { "@id": `${SITE.url}/#organization` },
        isPartOf: { "@id": `${SITE.url}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: `Licitações em ${post.municipio}`,
            item: `${SITE.url}${caminhoDoMunicipio({ uf: post.uf, slug: post.municipioSlug })}`,
          },
          { "@type": "ListItem", position: 3, name: titulo(post), item: `${SITE.url}${caminhoDoPost(post)}` },
        ],
      },
    ],
  };

  return (
    <>
      <CabecalhoSite />

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Trilha atual={`${post.municipio} · ${post.modalidade}`} />

        {/*
          A tarja é deliberadamente impossível de não ver. Ver a justificativa no
          cabeçalho do arquivo: leitor que descobre o encerramento no fim da
          página se sente enganado, e com razão.
        */}
        {fechou ? (
          <p className="mt-6 rounded-lg border border-l-4 border-l-[var(--brass)] bg-[var(--surface)] p-4 text-sm leading-relaxed">
            <strong>Este certame já encerrou.</strong> O prazo de propostas
            terminou em {dataDeBrasilia(post.encerramentoProposta)}. A página fica
            no ar como registro do que foi publicado — não é possível participar.
          </p>
        ) : null}

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {titulo(post)}
        </h1>

        <p className="mt-4 text-sm text-[var(--muted)]">
          {post.modalidade} · {post.municipio}/{post.uf} · {post.orgao}
        </p>

        {/*
          As três datas juntas, no topo.

          É o que torna o post honesto como notícia: publicação na fonte, coleta
          nossa e encerramento. O leitor sabe de que instante estamos falando
          antes de ler qualquer afirmação.
        */}
        <div className="mt-6">
          <Tabela
            cabecalho={["Quando", "Data"]}
            linhas={[
              ["Publicado no PNCP pelo órgão", post.publicadoEm ? dataDeBrasilia(post.publicadoEm) : "não informado"],
              ["Coletado por nós", dataDeBrasilia(post.coletadoEm)],
              [
                fechou ? "Encerrou em" : "Propostas até",
                dataDeBrasilia(post.encerramentoProposta),
              ],
            ]}
          />
        </div>

        <Secao id="o-que-e" titulo="O que está sendo comprado">
          {/*
            O objeto LITERAL, como o órgão escreveu — inclusive com erro de
            digitação, quando houver. O título acima é a versão curta; aqui é a
            fonte. Corrigir o texto do órgão seria reescrever documento oficial.
          */}
          <blockquote className="rounded-lg border bg-[var(--surface)] p-5 leading-relaxed">
            {post.objeto}
          </blockquote>
          <P>
            Transcrição literal do campo publicado pelo órgão no PNCP. Se houver
            divergência entre este texto e o edital, vale o edital.
          </P>

          <Tabela
            cabecalho={["Medida", "Valor"]}
            linhas={[
              ["Valor estimado pelo órgão", real(post.valorEstimado)],
              ["Modalidade", post.modalidade],
              ["Registro de preços", post.registroDePrecos ? "Sim" : "Não"],
              ["Órgão comprador", post.orgao],
            ]}
          />
          <P>
            O valor é o <strong>estimado na publicação</strong>, não o contratado.
            O valor final sai da disputa e costuma ficar abaixo do estimado.
          </P>
        </Secao>

        {/*
          A leitura vem logo depois do objeto, e antes de tudo o mais.

          É a única parte da página que não existe na fonte oficial — e é ela que
          responde a pergunta que trouxe o leitor até aqui: "eu consigo
          participar disto?". Enterrá-la no fim seria esconder o que dá valor ao
          post atrás do que qualquer um acha no PNCP.
        */}
        {post.analise?.analisadoEm ? (
          <Secao id="leitura" titulo="O que o edital exige">
            <LeituraDoEdital
              analise={post.analise}
              documentosLidos={post.documentosLidos ?? 0}
            />
          </Secao>
        ) : (
          <Secao id="leitura" titulo="A leitura deste edital">
            <P>
              Não conseguimos ler os documentos deste certame — ou o órgão não
              publicou anexo legível, ou o arquivo veio em formato que ainda não
              tratamos. Os dados acima vêm do registro da publicação no PNCP.
            </P>
            <P>
              Preferimos declarar a lacuna a preencher a página com um resumo que
              não teria como sustentar. O documento oficial está no link no fim
              desta página.
            </P>
          </Secao>
        )}

        {aindaDaParaImpugnar ? (
          <Secao id="impugnar" titulo="Até quando dá para questionar o edital">
            <P>
              O art. 164 da Lei 14.133/2021 admite impugnação até{" "}
              <strong>3 dias úteis</strong> antes da data de abertura. Contando em
              dias corridos a partir do encerramento, isso coloca o limite por
              volta de <strong>{dataDeBrasilia(limiteImpugnacao.toISOString())}</strong>.
            </P>
            <P>
              O cálculo é aproximado e <strong>para menos</strong>: não descontamos
              feriados municipais, que não temos. Ele serve para você saber que o
              prazo existe e está perto — a data que vale é a do edital. O passo a
              passo está em{" "}
              <Link href="/blog/prazo-para-impugnar-edital-de-licitacao/">
                prazo para impugnar edital
              </Link>
              .
            </P>
          </Secao>
        ) : null}

        {praca ? (
          <Secao id="praca" titulo={`O mercado de ${post.municipio}`}>
            <P>
              Este edital não é um caso isolado: na última medição,{" "}
              {post.municipio} teve <strong>{praca.editais} contratações</strong>{" "}
              publicadas no PNCP, movimentando {real(praca.valor)} entre{" "}
              <strong>{praca.orgaos} órgãos compradores</strong>.
            </P>
            <P>
              O retrato completo da praça — quanto se compra, por quais
              modalidades e quantos órgãos — está em{" "}
              <Link href={caminhoDoMunicipio({ uf: post.uf, slug: post.municipioSlug })}>
                licitações em {post.municipio}
              </Link>
              .
            </P>
          </Secao>
        ) : null}

        <CapturaAlerta
          origem={`edital/${post.uf.toLowerCase()}-${post.municipioSlug}`}
          chamada={{
            titulo: fechou
              ? "Este já encerrou. Quer receber os próximos enquanto dá tempo?"
              : `Quer saber quando ${post.municipio} publicar algo do seu ramo?`,
            texto:
              "Publicamos aqui uma amostra do que sai todo dia. O alerta gratuito manda " +
              "por e-mail os editais abertos da cidade que você indicar, com o prazo em " +
              "destaque, enquanto ainda dá para participar.",
          }}
        />

        <Secao id="fonte" titulo="Onde conferir o original">
          <P>
            O inteiro teor do edital, os anexos e qualquer retificação estão na
            fonte oficial:{" "}
            <a href={post.link} rel="noopener nofollow">
              este certame no PNCP
            </a>
            . Confira sempre o documento oficial antes de apresentar proposta — o
            órgão pode alterar prazo e condições depois da publicação.
          </P>
          <P>
            Em qual portal a disputa acontece é outra pergunta, e a resposta está
            em <Link href="/portais-de-licitacao/">portais de licitação</Link>. O
            que costuma ser exigido para participar está em{" "}
            <Link href="/habilitacao/">habilitação</Link>.
          </P>
        </Secao>

        <p className="mt-10 text-sm text-[var(--muted)]">
          Fonte: Portal Nacional de Contratações Públicas, coleta própria de{" "}
          {dataDeBrasilia(post.coletadoEm)}. Publicado em{" "}
          {dataDeBrasilia(post.postadoEm)} · {nomeDaUf(post.uf)} · Código IBGE{" "}
          {post.codigoIbge}. <Link href="/metodologia/">Como medimos</Link>.
        </p>

        <CardAssinatura />
      </article>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </>
  );
}
