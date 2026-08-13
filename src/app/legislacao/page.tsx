import type { Metadata } from "next";
import { AUTHOR, SITE } from "@/lib/site";
import { Citacao, Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { artigosDoGuia } from "@/lib/blog";

const TITULO = "Legislação de licitações: o que vale hoje e o que já foi revogado";
const DESCRICAO =
  "Quais normas de licitação estão em vigor em 2026, a data exata em que a Lei 8.666 e a Lei do Pregão foram revogadas, por que elas ainda aparecem em contrato vivo, e como conferir o status de qualquer norma sozinho.";
const ATUALIZADO = "2026-08-12";

export const metadata: Metadata = {
  title: "Legislação de licitações: o que vale hoje",
  description: DESCRICAO,
  alternates: { canonical: "/legislacao/" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/legislacao/`,
    type: "article",
  },
};

const SECOES = [
  { id: "o-que-vale", titulo: "A norma que vale hoje, e sobre quem ela manda" },
  { id: "revogadas", titulo: "O que foi revogado, e a data exata" },
  { id: "ainda-aparece", titulo: "Por que a 8.666 ainda aparece em contrato vivo" },
  { id: "hierarquia", titulo: "Lei, decreto, instrução normativa e edital" },
  { id: "acervo", titulo: "As normas que este site acompanhava: status verificado" },
  { id: "conferir", titulo: "Como conferir o status de qualquer norma sozinho" },
  { id: "estados", titulo: "Estados e municípios têm norma própria?" },
];

const FAQ = [
  {
    pergunta: "A Lei 8.666 ainda vale em 2026?",
    resposta:
      "Não para licitação nova. O art. 193 da Lei 14.133 revogou a Lei 8.666 em 30 de dezembro de 2023. Mas contrato assinado sob a 8.666 antes disso continua regido por ela até acabar — por isso a lei revogada ainda aparece em aditivo, reajuste e sanção de contratos que estão em execução.",
  },
  {
    pergunta: "E a Lei do Pregão, a 10.520?",
    resposta:
      "Revogada na mesma data, 30 de dezembro de 2023, pelo mesmo artigo. O pregão não acabou: ele deixou de ter lei própria e virou uma das modalidades da Lei 14.133. Quem cita a 10.520 em edital novo está citando norma revogada.",
  },
  {
    pergunta: "Meu edital cita a Lei 8.666. O que faço?",
    resposta:
      "Verifique a data. Se o edital é anterior a 30/12/2023, a citação pode ser legítima, porque durante a transição a Administração podia escolher o regime e tinha de declarar a escolha no edital. Se o edital é posterior e cita a 8.666 como fundamento, há vício e cabe impugnação — a própria Lei 14.133 vedava aplicação combinada dos dois regimes.",
  },
  {
    pergunta: "Vendo para uma estatal. Vale a Lei 14.133?",
    resposta:
      "Em regra, não. O § 1º do art. 1º da Lei 14.133 exclui empresas públicas, sociedades de economia mista e suas subsidiárias, que seguem a Lei 13.303/2016. Na prática isso muda habilitação, prazos e recursos — conferir qual regime rege o certame é a primeira leitura de qualquer edital de estatal.",
  },
  {
    pergunta: "Decreto federal vale para licitação de prefeitura?",
    resposta:
      "Não automaticamente. Decreto federal regulamenta a lei no âmbito da União. Estados e municípios editam os próprios regulamentos, e muitos adotam o federal por remissão expressa. Quem diz qual regulamento se aplica é o edital.",
  },
  {
    pergunta: "Onde encontro o texto oficial de uma norma?",
    resposta:
      "No Planalto, em planalto.gov.br. É a fonte que traz as anotações de revogação e de alteração no próprio texto. Sites de terceiros costumam republicar versões desatualizadas sem indicar isso.",
  },
];

const ACERVO: string[][] = [
  ["Lei 8.666/1993", "Licitações e contratos (regime anterior)", "Revogada em 30/12/2023 pelo art. 193, II, da Lei 14.133"],
  ["Lei 10.520/2002", "Lei federal do pregão", "Revogada em 30/12/2023 pelo art. 193, II, da Lei 14.133"],
  ["Lei 12.462/2011 (RDC)", "Regime Diferenciado de Contratações", "Arts. 1º a 47-A revogados em 30/12/2023 pelo art. 193, II"],
  ["Decreto 5.450/2005", "Regulamentava o pregão eletrônico", "Revogado pelo Decreto nº 10.024, de 2019 — anotação no próprio texto"],
  ["Decreto 10.024/2019", "Pregão eletrônico e dispensa eletrônica na esfera federal", "Sem anotação de revogação na consulta de 12/08/2026"],
  ["Decreto 7.746/2012", "Critérios de sustentabilidade nas contratações federais", "Sem anotação de revogação na consulta de 12/08/2026"],
  ["Decreto 9.046/2017", "Contratação plurianual no Executivo federal", "Sem anotação de revogação na consulta de 12/08/2026"],
  ["Lei 13.334/2016", "Cria o Programa de Parcerias de Investimentos (PPI)", "Em vigor, com alterações posteriores anotadas no texto"],
  ["Lei 13.448/2017", "Prorrogação e relicitação de contratos de parceria", "Em vigor, com alterações posteriores anotadas no texto"],
  ["Lei 6.404/1976", "Sociedades por ações", "Em vigor — não é norma de licitação, aparece em qualificação de licitante S.A."],
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE.url}/legislacao/#article`,
      headline: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      datePublished: ATUALIZADO,
      dateModified: ATUALIZADO,
      author: { "@id": `${SITE.url}/#${AUTHOR.slug}` },
      publisher: { "@id": `${SITE.url}/#organization` },
      isPartOf: { "@id": `${SITE.url}/#website` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/legislacao/#faq`,
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.pergunta,
        acceptedAnswer: { "@type": "Answer", text: f.resposta },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Legislação", item: `${SITE.url}/legislacao/` },
      ],
    },
  ],
};

export default function Legislacao() {
  const artigos = artigosDoGuia("/legislacao/");

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Legislação" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Legislação de licitações
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · Atualizado em 12 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            A pergunta que chega aqui quase sempre é uma variação de “essa lei
            ainda vale?”. E a resposta honesta raramente é sim ou não — é uma
            data. Norma de licitação não some: ela é revogada num dia
            determinado, e continua produzindo efeito nos contratos que nasceram
            antes dele.
          </P>
          <P>
            Este guia responde o que está em vigor, o que caiu e exatamente
            quando, por que a lei revogada continua aparecendo no seu contrato, e
            — o mais útil no longo prazo — como você confere o status de
            qualquer norma sem depender de mim nem de nenhum site.
          </P>

          <RespostaDireta>
            Desde 30 de dezembro de 2023, licitação nova segue a Lei
            14.133/2021. Nessa data foram revogadas a Lei 8.666/1993, a Lei
            10.520/2002 (pregão) e os arts. 1º a 47-A da Lei 12.462/2011 (RDC).
            Contrato assinado antes disso sob a lei antiga continua regido por
            ela até o fim. E estatais não entram nessa conta: empresas públicas e
            sociedades de economia mista seguem a Lei 13.303/2016.
          </RespostaDireta>

          <Indice itens={SECOES} />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="o-que-vale" titulo="A norma que vale hoje, e sobre quem ela manda">
            <P>
              A Lei 14.133/2021 é a lei geral de licitações e contratos
              administrativos. O primeiro artigo dela define o alcance, e vale
              ler com atenção porque é onde muita gente erra o regime logo na
              largada.
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 1º, caput">
              Esta Lei estabelece normas gerais de licitação e contratação para
              as Administrações Públicas diretas, autárquicas e fundacionais da
              União, dos Estados, do Distrito Federal e dos Municípios [...]
            </Citacao>
            <P>
              Ou seja: prefeitura, governo estadual, ministério, autarquia e
              fundação estão dentro. Mas o parágrafo seguinte abre uma exceção
              que decide qual edital você sabe ler.
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 1º, § 1º">
              Não são abrangidas por esta Lei as empresas públicas, as sociedades
              de economia mista e as suas subsidiárias, regidas pela Lei nº
              13.303, de 30 de junho de 2016 [...]
            </Citacao>
            <P>
              Isso é operacional, não acadêmico. Se você vende para uma estatal,
              o certame corre por outra lei, com regras próprias de habilitação,
              de recurso e de prazo. Confundir os dois regimes é a forma mais
              rápida de perder um certame por peça protocolada com fundamento
              errado.
            </P>
          </Secao>

          <Secao id="revogadas" titulo="O que foi revogado, e a data exata">
            <P>
              A revogação não veio no dia em que a Lei 14.133 foi publicada. Ela
              foi programada, adiada por medida provisória e finalmente fixada
              por lei complementar. O texto em vigor do art. 193 é este:
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 193, II — redação dada pela Lei Complementar nº 198, de 2023">
              Revogam-se: [...] II - em 30 de dezembro de 2023: a) a Lei nº
              8.666, de 21 de junho de 1993; b) a Lei nº 10.520, de 17 de julho
              de 2002; e c) os arts. 1º a 47-A da Lei nº 12.462, de 4 de agosto
              de 2011.
            </Citacao>
            <P>
              Três leituras práticas saem daí. A primeira: o pregão não foi
              extinto — ele perdeu a lei própria e passou a ser uma das
              modalidades da 14.133. Quem vê “Lei 10.520” em edital novo está
              vendo fundamento revogado.
            </P>
            <P>
              A segunda: da Lei 12.462 caíram os artigos do RDC, não a lei
              inteira. Ela tratava de outros assuntos além do regime de
              contratação, e esses continuam.
            </P>
            <P>
              A terceira é menos conhecida. Os artigos penais da 8.666 caíram
              antes de todo o resto, já na publicação da nova lei, em 1º de abril
              de 2021 — porque os crimes de licitação foram transferidos para o
              Código Penal. É por isso que processo criminal de licitação hoje
              cita artigo do Código Penal, e não da lei de licitações.
            </P>
          </Secao>

          <Secao id="ainda-aparece" titulo="Por que a 8.666 ainda aparece em contrato vivo">
            <P>
              Aqui está a parte que confunde quase todo fornecedor. A lei foi
              revogada, mas você continua vendo o número dela em aditivo,
              reajuste e notificação de sanção. Isso não é erro do órgão.
            </P>
            <P>
              Durante o período de transição, a Administração podia escolher em
              qual regime licitar, desde que declarasse a escolha no edital e não
              misturasse os dois. E a escolha acompanhava o contrato até o fim:
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 191, parágrafo único (redação original, com vigência encerrada)">
              [...] se a Administração optar por licitar de acordo com as leis
              citadas no inciso II do caput do art. 193 desta Lei, o contrato
              respectivo será regido pelas regras nelas previstas durante toda a
              sua vigência.
            </Citacao>
            <P>
              Resultado: existem hoje, em execução, milhares de contratos regidos
              por uma lei revogada, e eles vão continuar assim por anos. Se o seu
              contrato nasceu sob a 8.666, é a 8.666 que decide o seu reajuste, o
              seu aditivo e a sua defesa em processo sancionatório — não a 14.133.
            </P>
            <P>
              A consequência prática é chata e simples: quem executa contrato
              antigo precisa saber ler as duas leis. Não dá para “atualizar” o
              contrato para o regime novo por conta própria.
            </P>
          </Secao>

          <Secao id="hierarquia" titulo="Lei, decreto, instrução normativa e edital">
            <P>
              Boa parte das dúvidas de legislação some quando se entende quem
              manda em quem. São quatro camadas, e a que mais afeta a sua
              proposta é a última.
            </P>
            <Tabela
              cabecalho={["Camada", "Quem edita", "O que faz", "Alcance"]}
              linhas={[
                ["Lei", "Congresso Nacional", "Cria a regra geral e obriga todos os entes", "Nacional, quando é norma geral"],
                ["Decreto", "Chefe do Executivo", "Regulamenta a lei: detalha procedimento, não cria obrigação nova", "Só o ente que editou"],
                ["Instrução normativa / portaria", "Órgão central de compras", "Operacionaliza o decreto: formulários, sistemas, modelos", "Só a estrutura do órgão"],
                ["Edital", "O órgão que compra", "Aplica tudo acima ao caso concreto", "Aquele certame — e é o que te obriga"],
              ]}
            />
            <P>
              Duas conclusões que economizam discussão. Primeira: decreto federal
              não vale automaticamente para prefeitura. Estados e municípios
              editam regulamento próprio, e muitos adotam o federal por remissão
              expressa — mas quem diz qual se aplica é o edital.
            </P>
            <P>
              Segunda, e mais importante: na hora da disputa, o documento que
              rege você é o edital. Lei e decreto entram como fundamento para
              atacar cláusula ilegal, não como substitutos do que está escrito
              ali. Impugnação vencedora é a que mostra o conflito entre os dois,
              com os dois textos transcritos.
            </P>
          </Secao>

          {/*
            Página de consulta: a intenção é informacional e a captura tem de
            aceitar isso, senão atrapalha quem só queria saber se a 8.666 caiu.
            Vem no meio exato do guia, logo depois da frase que fecha a seção —
            "na hora da disputa, o documento que rege você é o edital" — porque
            é a única ponte honesta entre saber a norma e ter o edital na mão.

            Sem heading próprio: o `Indice` promete uma lista fechada de seções,
            e um h2 comercial faria o sumário discordar do documento.
          */}
          <section aria-label="Alerta diário de editais">
            <CapturaAlerta
              origem="guia/legislacao#meio"
              chamada={{
                titulo: "Saber qual norma vale não coloca o edital na sua frente",
                texto:
                  "Esta página é de consulta e o guia segue abaixo — pode pular. Só a observação prática do parágrafo acima: quem rege a disputa é o edital, e ele precisa chegar até você. Se quiser, todo dia útil a gente manda os editais publicados no PNCP que combinam com o que a sua empresa vende, com prazo e link para o registro oficial.",
              }}
              textoDoBotao="Quero receber os editais do meu ramo"
            />
          </section>

          <Secao id="acervo" titulo="As normas que este site acompanhava: status verificado">
            <P>
              Este endereço reunia, entre 2016 e 2017, o acompanhamento de leis,
              decretos e medidas provisórias de contratação pública. Quase uma
              década depois, boa parte mudou de status. Conferi cada uma no
              Planalto em 12 de agosto de 2026 e registro o que o texto oficial
              diz — não o que se costuma repetir por aí.
            </P>
            <Tabela cabecalho={["Norma", "Do que trata", "Status verificado"]} linhas={ACERVO} />
            <P>
              Uma ressalva que faço questão de deixar explícita: “sem anotação de
              revogação” é exatamente isso, e não é o mesmo que “aplica-se ao seu
              caso”. Um decreto pode continuar formalmente vigente e ter perdido
              utilidade porque a lei que ele regulamentava caiu. O Decreto
              7.746/2012, por exemplo, regulamenta dispositivo da lei antiga; ele
              não foi revogado, mas a base legal do tema mudou de endereço. Para
              decidir o que se aplica a um edital concreto, a leitura tem de ser
              feita sobre aquele edital.
            </P>
          </Secao>

          <Secao id="conferir" titulo="Como conferir o status de qualquer norma sozinho">
            <P>
              Este é o trecho que continua valendo depois que este guia
              envelhecer. O método leva menos de um minuto e não depende de
              intermediário.
            </P>
            <Tabela
              cabecalho={["Passo", "O que fazer", "O que observar"]}
              linhas={[
                ["1", "Abrir o texto no planalto.gov.br", "É a fonte que anota revogação e alteração dentro do próprio texto"],
                ["2", "Olhar o topo da página, antes da ementa", "É ali que aparece “Revogado pelo…”, “Vigência encerrada” ou “Vide…”"],
                ["3", "Ler as anotações entre parênteses ao lado dos artigos", "Um artigo pode ter caído sozinho, com a lei ainda de pé"],
                ["4", "Conferir a data de vigência, não só a de publicação", "Norma publicada hoje pode só valer daqui a meses — foi o caso da própria 14.133"],
                ["5", "Voltar ao edital", "Ele indica o regime escolhido, e é isso que rege o certame"],
              ]}
            />
            <P>
              O passo 3 é o que mais gente pula. Revogação parcial é comum — foi
              o que aconteceu com a Lei 12.462, que perdeu os artigos do RDC e
              manteve o resto. Quem lê só o cabeçalho conclui errado nos dois
              sentidos.
            </P>
          </Secao>

          <Secao id="estados" titulo="Estados e municípios têm norma própria?">
            <P>
              A Lei 14.133 é norma geral e alcança os três níveis de governo. O
              que estados e municípios editam são regulamentos: decretos que
              detalham o procedimento dentro da própria estrutura — pesquisa de
              preço, agente de contratação, sistema eletrônico usado, limites de
              alçada.
            </P>
            <P>
              Para quem vende, o efeito é bem concreto: a lei é a mesma em
              Recife, em Fortaleza e em Brasília, mas o rito operacional muda, e
              muda o portal onde a disputa acontece. É por isso que o cadastro em
              um sistema não te habilita nos demais.
            </P>
            <P>
              Onde cada certame é publicado e onde a disputa efetivamente ocorre
              é assunto do guia de{" "}
              <a className="underline underline-offset-4" href="/portais-de-licitacao/">
                portais de licitação
              </a>
              . Para a regra vigente artigo por artigo, veja o{" "}
              <a className="underline underline-offset-4" href="/lei-14133/">
                guia da Lei 14.133
              </a>
              ; para o que os tribunais já decidiram sobre exigência ilegal, a{" "}
              <a className="underline underline-offset-4" href="/jurisprudencia/">
                jurisprudência
              </a>{" "}
              e as{" "}
              <a className="underline underline-offset-4" href="/sumulas-tcu/">
                súmulas do TCU
              </a>
              .
            </P>
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes">
            <Faq itens={FAQ} />
          </Secao>

          <Secao id="fontes" titulo="Fontes">
            <P>
              Os textos citados acima são atos oficiais, transcritos do Planalto e
              conferidos em 12 de agosto de 2026. Norma muda: confira a vigência
              na fonte antes de usar em peça formal.
            </P>
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm" target="_blank" rel="noopener">
                  Lei nº 14.133/2021 — Planalto
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm" target="_blank" rel="noopener">
                  Lei nº 8.666/1993 — Planalto
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/leis/2002/l10520.htm" target="_blank" rel="noopener">
                  Lei nº 10.520/2002 — Planalto
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13303.htm" target="_blank" rel="noopener">
                  Lei nº 13.303/2016 (estatais) — Planalto
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/decreto/d10024.htm" target="_blank" rel="noopener">
                  Decreto nº 10.024/2019 — Planalto
                </a>
              </li>
            </ul>
          </Secao>
        </div>

        {/*
          Os artigos que aprofundam este hub, derivados do catálogo. Lista vazia
          não renderiza nada — nem título, nem "em breve". O projeto já anunciou
          "os próximos:" seguido de nada, e o custo disso é de confiança.
        */}
        {artigos.length > 0 ? (
          <section className="mt-16 border-t pt-8">
            <h2 className="text-lg font-semibold tracking-tight">
              Artigos sobre a legislação aplicada
            </h2>
            <ul className="mt-4 space-y-4">
              {artigos.map((artigo) => (
                <li key={artigo.slug}>
                  <a
                    href={`/blog/${artigo.slug}/`}
                    className="font-medium underline underline-offset-4"
                  >
                    {artigo.titulo}
                  </a>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                    {artigo.descricao}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12">
          <AutorBio />
        </div>

        <p className="mt-8 text-sm leading-relaxed text-[var(--muted)]">
          Este conteúdo tem finalidade informativa e operacional. Não constitui
          parecer jurídico — a análise de um edital concreto, a redação de
          impugnação e recurso e a defesa em processo sancionatório cabem à
          empresa e ao seu assessor jurídico. Leia o{" "}
          <a className="underline underline-offset-4" href="/aviso-legal/">
            aviso legal
          </a>
          .
        </p>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
