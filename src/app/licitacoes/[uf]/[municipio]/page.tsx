import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { Faq, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import {
  caminhoDoMunicipio,
  MEDIDO_EM,
  modalidadesOrdenadas,
  municipioPorSlug,
  municipiosPublicaveis,
  ufFoiCompleta,
  type MunicipioAgregado,
} from "@/lib/regioes";
import { dataDeBrasilia } from "@/lib/dominio/datas";

/**
 * A página de mercado de um município.
 *
 * ## O que ela é, e o que ela deliberadamente não é
 *
 * **Não é listagem de editais abertos.** O agregado é um retrato do instante da
 * coleta, e edital tem prazo: publicar "34 editais abertos em Recife" a partir
 * de um arquivo de dois dias atrás afirmaria como presente o que já pode ter
 * encerrado — e o visitante que clicasse e não achasse concluiria, com razão,
 * que o site mente. Por isso toda afirmação aqui vem datada, no passado, e o
 * caminho para o que está aberto AGORA é o PNCP e o produto.
 *
 * É um retrato do mercado: quanto se comprou, por quais modalidades, quantos
 * órgãos compram. Isso envelhece bem, e é o que responde a pergunta de quem
 * busca "licitações em Recife" antes de decidir se vale entrar nessa praça.
 *
 * ## Por que existem tão poucas
 *
 * O portão está em `regioes.ts`, com os números que o motivaram. O resumo: no
 * agregado que originou esta página, 37 de 63 municípios tinham UM edital.
 * Publicar todos seria trocar autoridade de domínio por volume de URL.
 */

type Parametros = { uf: string; municipio: string };

/**
 * As páginas são geradas na build, a partir do agregado versionado.
 *
 * `dynamicParams = false` é a metade que importa: sem ele, `/licitacoes/pe/-um-
 * municipio-que-nao-passou-no-portao/` renderizaria sob demanda e o portão
 * viraria decoração. Com ele, o que não está aqui responde 404.
 */
export const dynamicParams = false;

export function generateStaticParams(): Parametros[] {
  return municipiosPublicaveis().map((m) => ({
    uf: m.uf.toLowerCase(),
    municipio: m.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametros>;
}): Promise<Metadata> {
  const { uf, municipio } = await params;
  const m = municipioPorSlug(uf, municipio);
  if (!m) return {};

  const titulo = `Licitações em ${m.municipio} (${m.uf}): o que os órgãos compram`;
  const descricao =
    `Retrato do mercado público de ${m.municipio}/${m.uf} a partir dos dados do PNCP: ` +
    `${m.editais} contratações medidas, ${m.orgaos} órgãos compradores e as modalidades usadas.`;

  return {
    title: titulo,
    description: descricao.slice(0, 160),
    alternates: { canonical: caminhoDoMunicipio(m) },
    openGraph: {
      images: IMAGENS_DE_COMPARTILHAMENTO,
      title: titulo,
      description: descricao.slice(0, 160),
      url: `${SITE.url}${caminhoDoMunicipio(m)}`,
      type: "article",
    },
  };
}

const real = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function PaginaDoMunicipio({
  params,
}: {
  params: Promise<Parametros>;
}) {
  const { uf, municipio } = await params;
  const m = municipioPorSlug(uf, municipio);

  // Com `dynamicParams = false` isto é inalcançável por navegação, e continua
  // certo: é o que garante que mexer no portão não deixe uma rota órfã servindo
  // página com dado que já não existe.
  if (!m) notFound();

  const medido = dataDeBrasilia(MEDIDO_EM);
  const completa = ufFoiCompleta(m.uf);
  const modalidades = modalidadesOrdenadas(m);
  const ticket = Math.round(m.valor / m.editais);

  return (
    <>
      <CabecalhoSite />
      <Trilha atual={`Licitações em ${m.municipio}`} />

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Licitações em {m.municipio} ({m.uf}): o que os órgãos compram
        </h1>

        <RespostaDireta>
          Na última medição, {m.municipio} teve <strong>{m.editais} contratações</strong>{" "}
          publicadas no PNCP, movimentando <strong>{real(m.valor)}</strong> entre{" "}
          <strong>{m.orgaos} órgãos compradores</strong>. Os números são de{" "}
          {medido} e descrevem o que foi publicado até ali — não o que está aberto
          agora.
        </RespostaDireta>

        <Secao id="mercado" titulo="O tamanho do mercado">
          <Tabela
            cabecalho={["Medida", "Valor", "O que significa"]}
            linhas={[
              [
                "Contratações",
                String(m.editais),
                "Publicações do município na janela coletada",
              ],
              [
                "Valor somado",
                real(m.valor),
                "Soma dos valores estimados informados pelos órgãos",
              ],
              [
                "Valor médio",
                real(ticket),
                "Ordem de grandeza do contrato típico, não uma previsão",
              ],
              [
                "Órgãos compradores",
                String(m.orgaos),
                "Quantas portas de entrada diferentes existem",
              ],
            ]}
          />
          <P>
            O valor médio é aritmética simples — soma dividida por contratações — e
            não descreve nenhum contrato em particular: uma obra grande no meio de
            compras pequenas puxa a média para cima sozinha. Ele serve para
            responder se esta praça costuma comprar na sua faixa, e não para
            estimar quanto você receberia.
          </P>
        </Secao>

        <Secao id="modalidades" titulo="Como esses órgãos compram">
          <Tabela
            cabecalho={["Modalidade", "Contratações"]}
            linhas={modalidades.map((mod) => [mod.nome, String(mod.editais)])}
          />
          <P>
            A modalidade determina o rito e, com ele, o esforço de participar. É a
            primeira coisa a olhar depois do objeto: um município que compra
            majoritariamente por pregão eletrônico é acessível de qualquer lugar
            do país, enquanto presença física e credenciamento mudam a conta de
            quem está longe.
          </P>
        </Secao>

        <CapturaAlerta
          origem={`regiao/${m.uf.toLowerCase()}-${m.slug}`}
          chamada={{
            titulo: `Quer saber quando ${m.municipio} publicar algo do seu ramo?`,
            texto:
              "Esta página é um retrato do passado. O alerta diário compara o que sai " +
              "hoje no PNCP com o perfil da sua empresa e manda só o que faz sentido — " +
              "com o prazo em destaque.",
          }}
        />

        <Secao id="agora" titulo="E o que está aberto agora?">
          <P>
            Esta página não responde isso, e a razão é a mesma que a torna
            confiável: os números foram medidos em {medido}, e edital tem prazo.
            Uma lista de “abertos” montada a partir de um arquivo de dias atrás
            mandaria você para certames já encerrados.
          </P>
          <P>
            Para o que está aberto neste instante, a fonte oficial é o{" "}
            <a href="https://www.pncp.gov.br/" rel="noopener">
              Portal Nacional de Contratações Públicas
            </a>
            . Como consultar sem se perder está em{" "}
            <Link href="/blog/como-saber-se-saiu-uma-licitacao/">
              como saber se saiu uma licitação
            </Link>
            , e o que costuma ser exigido para participar, em{" "}
            <Link href="/habilitacao/">habilitação</Link>.
          </P>
          {!completa ? (
            <P>
              <strong>Sobre a completude destes números:</strong> a coleta que os
              produziu não cobriu {m.uf} por inteiro — foi interrompida antes do
              fim. O mercado real de {m.municipio} é, portanto, <em>pelo menos</em>{" "}
              este; nunca menor. Preferimos publicar o piso medido a estimar o que
              não medimos.
            </P>
          ) : null}
        </Secao>

        <Faq
          itens={[
            {
              pergunta: `Quantas licitações ${m.municipio} publica?`,
              resposta:
                `Na medição de ${medido}, ${m.editais} contratações de ${m.orgaos} ` +
                `órgãos, somando ${real(m.valor)} em valores estimados. O número varia ` +
                `com a janela observada e não é uma média histórica.`,
            },
            {
              pergunta: `Preciso ser de ${m.municipio} para participar?`,
              resposta:
                "Não. A Lei 14.133/2021 não admite exigência de sede ou domicílio no " +
                "município como condição de habilitação. O que pode pesar é logística: " +
                "frete e prazo de entrega entram no seu preço, não no edital.",
            },
            {
              pergunta: "Estes valores são o que a empresa vencedora recebe?",
              resposta:
                "Não. São valores estimados pelos órgãos na publicação. O valor " +
                "contratado sai da disputa e costuma ficar abaixo do estimado.",
            },
            {
              pergunta: "Com que frequência esta página é atualizada?",
              resposta:
                `Ela reflete a última coleta versionada, feita em ${medido}. A coleta ` +
                "roda diariamente, e a página acompanha quando os dados entram no " +
                "repositório.",
            },
          ]}
        />

        <p className="mt-10 text-sm text-[var(--muted)]">
          Fonte: Portal Nacional de Contratações Públicas, coleta própria de{" "}
          {medido}. Código IBGE {m.ibge}.{" "}
          <Link href="/metodologia/">Como medimos</Link>.
        </p>

        <OutrosMunicipios atual={m} />
      </article>
    </>
  );
}

/**
 * A malha entre as regionais.
 *
 * Página regional isolada é folha solta — não distribui autoridade e não leva o
 * leitor a lugar nenhum. Com duas ou três páginas o bloco é modesto; ele cresce
 * junto com a cobertura, sem ninguém mexer aqui.
 */
function OutrosMunicipios({ atual }: { atual: MunicipioAgregado }) {
  const outros = municipiosPublicaveis().filter((m) => caminhoDoMunicipio(m) !== caminhoDoMunicipio(atual));
  if (outros.length === 0) return null;

  return (
    <nav className="mt-8 border-t pt-6">
      <h2 className="text-sm font-semibold tracking-wide text-[var(--muted)] uppercase">
        Outras praças medidas
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {outros.map((m) => (
          <li key={caminhoDoMunicipio(m)}>
            <Link href={caminhoDoMunicipio(m)}>
              {m.municipio} ({m.uf})
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
