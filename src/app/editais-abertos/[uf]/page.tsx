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
import { COLETADO_EM, perfilDaPraca, ufAberta, ufsComAbertos } from "@/lib/abertos/acervo";
import { percentual } from "@/lib/abertos/perfilDaUf";
import type { UfAberta } from "@/lib/abertos/tipos";
import { DISPENSA_POR_VALOR, REAJUSTE_VIGENTE, emReais } from "@/lib/dominio/limites-legais";
import { Faq, Indice, Tabela } from "@/components/Prose";
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


/**
 * O passo a passo, igual em toda praça.
 *
 * Não muda por estado, e é honesto que não mude: o procedimento é federal. O que
 * muda por estado é o que está aberto agora, e isso a página tira do retrato.
 * Inventar diferença regional aqui seria encher a página para parecer local.
 */
const PASSOS = [
  {
    titulo: "Tenha o CNPJ com a atividade certa",
    texto:
      "O objeto do edital é comparado com o seu CNAE. Vender o que o seu cadastro não descreve é desclassificação na habilitação, e alterar CNAE leva dias.",
  },
  {
    titulo: "Cadastre-se onde a disputa acontece",
    texto:
      "O PNCP publica, mas o certame roda no sistema que o órgão escolheu. O cadastro é gratuito e costuma levar de um a três dias úteis, então ele não pode começar na semana da sessão.",
  },
  {
    titulo: "Junte as certidões antes de precisar",
    texto:
      "Federal, estadual, municipal, FGTS e trabalhista. Todas com validade curta, e a municipal é a que mais demora a sair em cidade pequena.",
  },
  {
    titulo: "Leia o edital inteiro, inclusive os anexos",
    texto:
      "É no anexo que moram a exigência de atestado de capacidade técnica, a garantia de proposta e a visita técnica. Descobrir isso na véspera é o que mais elimina empresa preparada.",
  },
  {
    titulo: "Impugne o que estiver errado, no prazo",
    texto:
      "Exigência que restringe a competição pode ser impugnada, e o prazo é curto. Depois da sessão, o que resta é recurso, que é mais difícil e mais lento.",
  },
  {
    titulo: "Monte a proposta com o custo real",
    texto:
      "Preço abaixo do custo é desclassificado por inexequibilidade, e ganhar no vermelho é pior que perder. O valor estimado do edital é o teto, não a meta.",
  },
  {
    titulo: "Participe da sessão do começo ao fim",
    texto:
      "No pregão eletrônico há fase de lances e depois pedido de documento e de amostra, com prazo em horas. Sair antes do fim é perder o que já foi ganho.",
  },
  {
    titulo: "Assine o contrato e cumpra o que prometeu",
    texto:
      "Ganhar e não entregar gera sanção que impede de disputar em qualquer órgão do país. O contrato é o começo do trabalho, não o fim.",
  },
] as const;

/**
 * O FAQ, montado com os números da praça.
 *
 * As perguntas são as que o mercado faz, e as respostas usam o dado do retrato
 * quando existe dado. FAQ genérico por estado é o que o concorrente publica; o
 * que muda aqui é a primeira resposta trazer o número de hoje.
 */
function perguntasDaUf(u: UfAberta): { pergunta: string; resposta: string }[] {
  return [
    {
      pergunta: `Quantas licitações estão abertas em ${u.uf} agora?`,
      resposta: `${numero(u.abertos)} editais estavam com proposta aberta em ${u.uf} quando o retrato desta página foi tirado, e ${numero(u.encerramEm24h)} deles encerram nas próximas 24 horas. O número muda todo dia: a coleta roda de madrugada e a página é reconstruída com ela.`,
    },
    {
      pergunta: `Preciso ter empresa em ${u.uf} para participar?`,
      resposta:
        "Não. Licitação não pode exigir domicílio ou sede em determinado local como condição de participação, e o pregão eletrônico é disputado de qualquer lugar do país. O que pode existir é exigência ligada à execução, como prazo de entrega curto ou assistência no local, que na prática favorece quem está perto.",
    },
    {
      pergunta: "Quanto custa participar?",
      resposta:
        "O cadastro nos portais é gratuito e o edital é público. Os custos reais são as certidões, que costumam ser gratuitas ou baratas, e a garantia de proposta quando o edital exige. Desconfie de quem cobra para dar acesso a edital: ele é obrigatoriamente público.",
    },
    {
      pergunta: "Qual é a diferença entre pregão e dispensa?",
      resposta: `O pregão é a modalidade padrão para bem e serviço comum, com disputa de lances. A dispensa é contratação direta por valor pequeno, que em ${REAJUSTE_VIGENTE.ano} vale até ${emReais(DISPENSA_POR_VALOR.comprasEServicos)} em compras e serviços e até ${emReais(DISPENSA_POR_VALOR.obrasEEngenharia)} em obras e engenharia. Dispensa não é contratar quem quiser: a dispensa eletrônica também tem aviso público e disputa de preço.`,
    },
    {
      pergunta: "De onde vêm estes editais?",
      resposta:
        "Do Portal Nacional de Contratações Públicas, a base oficial onde a divulgação é obrigatória. A coleta é diária e automatizada, e a metodologia, com as limitações conhecidas, está publicada. Em qualquer divergência, prevalece o edital.",
    },
  ];
}

export default async function EditaisAbertosDaUf({
  params,
}: {
  params: Promise<Parametros>;
}) {
  const { uf } = await params;
  const u = ufAberta(uf);
  if (!u || !temPaginaDeUf(u)) notFound();

  const perfil = perfilDaPraca(u.uf);
  const faq = perguntasDaUf(u);

  /*
   * O índice lista só as seções que a página realmente tem.
   *
   * As duas tabelas de perfil somem quando o retrato é antigo demais para
   * carregá-las, e um índice com âncora para seção inexistente leva o leitor a
   * um pulo que não acontece.
   */
  const indice = [
    { id: "abertos", titulo: `Editais abertos agora em ${u.uf}` },
    ...(perfil && perfil.porCategoria.length > 0
      ? [{ id: "o-que-compram", titulo: "O que os órgãos estão comprando" }]
      : []),
    ...(perfil && perfil.porModalidade.length > 0
      ? [{ id: "como-compram", titulo: "Como os órgãos compram" }]
      : []),
    { id: "onde-encontrar", titulo: "Onde encontrar os editais" },
    { id: "como-participar", titulo: "Como participar, passo a passo" },
    { id: "pequena-empresa", titulo: "O que muda para ME e EPP" },
    { id: "faq", titulo: "Perguntas frequentes" },
  ];

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

        <Indice itens={indice} />

        <Secao id="abertos" titulo={`${u.editais.length} editais abertos em ${u.uf}`}>
          <P>
            Todos com prazo além da próxima coleta: nenhum encerra enquanto esta
            página estiver no ar. Os de prazo mais próximo primeiro.
          </P>
          <ListaDeAbertos editais={u.editais} />
          <P>
            São {numero(u.editais.length)} dos {numero(u.abertos)} abertos no
            estado. A lista mostra os mais urgentes; o resto continua no PNCP, e
            quem acompanha todos é a triagem diária.
          </P>
        </Secao>

        {perfil && perfil.porCategoria.length > 0 ? (
          <Secao id="o-que-compram" titulo={`O que os órgãos de ${u.uf} estão comprando`}>
            <P>
              A conta é sobre os {numero(u.abertos)} editais abertos no estado, e
              não sobre a amostra acima. Cada objeto é classificado pelo que o
              órgão declarou comprar.
            </P>
            <Tabela
              cabecalho={["O que está sendo comprado", "Editais abertos", "Fatia"]}
              linhas={perfil.porCategoria.map((f) => [
                f.rotulo,
                numero(f.quantidade),
                `${percentual(f.quantidade, u.abertos)}%`,
              ])}
            />
            <P>
              A fatia é calculada sobre o total do estado, então a soma da tabela
              não fecha 100%: a cauda de categorias com pouquíssimos editais está
              em “Outros”.
            </P>
          </Secao>
        ) : null}

        {perfil && perfil.porModalidade.length > 0 ? (
          <Secao id="como-compram" titulo={`Como os órgãos de ${u.uf} compram`}>
            <Tabela
              cabecalho={["Modalidade", "Editais abertos", "Fatia"]}
              linhas={perfil.porModalidade.map((f) => [
                f.rotulo,
                numero(f.quantidade),
                `${percentual(f.quantidade, u.abertos)}%`,
              ])}
            />
            <P>
              O pregão eletrônico costuma dominar porque é a modalidade padrão
              para bem e serviço comum, e ele é disputado de qualquer lugar do
              país. A dispensa aparece logo atrás e é a porta de entrada mais
              subestimada: em {REAJUSTE_VIGENTE.ano} ela vale até{" "}
              {emReais(DISPENSA_POR_VALOR.comprasEServicos)} em compras e
              serviços, com menos concorrência e documentação mais enxuta. O que
              cada modalidade exige está no{" "}
              <Link href="/lei-14133/" className="underline underline-offset-2">
                guia da Lei 14.133
              </Link>
              .
            </P>
          </Secao>
        ) : null}

        <Secao id="onde-encontrar" titulo={`Onde encontrar editais de ${u.uf}`}>
          <P>
            A publicação é centralizada e a disputa não é. Todo edital regido pela
            Lei 14.133 precisa aparecer no Portal Nacional de Contratações
            Públicas, mas o certame acontece no sistema que cada órgão já usa, e
            são dezenas deles.
          </P>
          <Tabela
            cabecalho={["Onde", "O que você encontra", "O que falta"]}
            linhas={[
              [
                "PNCP",
                "Todo edital, de todo ente que aderiu, com o arquivo oficial",
                "Filtro por ramo: a busca é por palavra, e o órgão escreve com as palavras dele",
              ],
              [
                `Sites das prefeituras de ${u.uf}`,
                "O edital e os anexos, às vezes antes do PNCP",
                "Um site por município, cada um com uma seção diferente",
              ],
              [
                "Diário oficial do estado",
                "O aviso de licitação, com data de sessão",
                "Aviso não é edital: o arquivo continua sendo baixado em outro lugar",
              ],
            ]}
          />
          <P>
            Como cada sistema funciona está no{" "}
            <Link href="/portais-de-licitacao/" className="underline underline-offset-2">
              guia dos portais de licitação
            </Link>
            .
          </P>
        </Secao>

        <Secao id="como-participar" titulo={`Como participar de uma licitação em ${u.uf}`}>
          <P>
            A ordem importa: cada passo depende do anterior, e o erro mais comum é
            descobrir a exigência do passo 4 na véspera da sessão.
          </P>
          <ol className="mt-4 space-y-3">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="flex gap-3 leading-relaxed">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold"
                >
                  {i + 1}
                </span>
                <span>
                  <strong>{passo.titulo}.</strong> {passo.texto}
                </span>
              </li>
            ))}
          </ol>
          <P>
            O que cada certidão significa, quando ela vence e o que fazer quando
            já venceu está no{" "}
            <Link href="/habilitacao/" className="underline underline-offset-2">
              guia de habilitação
            </Link>
            .
          </P>
        </Secao>

        <Secao id="pequena-empresa" titulo="O que muda para a microempresa e a EPP">
          <P>
            A Lei Complementar 123/2006 continua valendo sob a Lei 14.133, e ela dá
            duas vantagens que decidem disputa. Quem não sabe que tem, não usa.
          </P>
          <Tabela
            cabecalho={["Vantagem", "Como funciona na prática"]}
            linhas={[
              [
                "Empate ficto",
                "A pequena empresa que ficar até 5% acima da melhor proposta no pregão pode cobrir o lance e ganhar. Fora do pregão, a margem é de 10%.",
              ],
              [
                "Regularidade fiscal depois",
                "A documentação fiscal pode ser regularizada depois de você ser declarado vencedor, e não antes de disputar. Uma certidão vencida no dia da sessão não elimina automaticamente.",
              ],
              [
                "Licitação exclusiva",
                "Contratações de menor valor podem ser reservadas só para ME e EPP, o que tira a empresa grande da disputa.",
              ],
            ]}
          />
        </Secao>

        <Secao id="brasil" titulo="Outros estados">
          <P>
            <Link href="/editais-abertos/" className="underline underline-offset-2">
              Ver o total do Brasil e a tabela por estado
            </Link>
            .
          </P>
        </Secao>

        <Secao id="faq" titulo={`Perguntas frequentes sobre licitações em ${u.uf}`}>
          <Faq itens={faq} />
        </Secao>

        <CapturaAlerta origem={`editais-abertos-${u.uf.toLowerCase()}`} />
        <CardAssinatura />
      </article>

      <RodapeSite />

      {/*
        O dado estruturado do FAQ, que é o que rende resposta em destaque na
        busca. As perguntas são as MESMAS que a página mostra: schema que
        descreve conteúdo ausente da página é o que o Google trata como
        marcação enganosa, e o castigo é a página inteira perder o destaque.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "FAQPage",
                "@id": `${SITE.url}/editais-abertos/${u.uf.toLowerCase()}/#faq`,
                mainEntity: faq.map((f) => ({
                  "@type": "Question",
                  name: f.pergunta,
                  acceptedAnswer: { "@type": "Answer", text: f.resposta },
                })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Editais abertos",
                    item: `${SITE.url}/editais-abertos/`,
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `Editais abertos em ${u.uf}`,
                    item: `${SITE.url}/editais-abertos/${u.uf.toLowerCase()}/`,
                  },
                ],
              },
            ],
          }),
        }}
      />
    </>
  );
}
