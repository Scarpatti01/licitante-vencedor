import type { Metadata } from "next";
import { AUTHOR, SITE } from "@/lib/site";
import { Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { artigosDoGuia } from "@/lib/blog";
import {
  DISPENSA_POR_VALOR,
  DOBRAM_O_LIMITE,
  REAJUSTE_VIGENTE,
  emReais,
  vigenciaPorExtenso,
} from "@/lib/dominio/limites-legais";

const TITULO = "Lei 14.133/2021: dispensa, prazos e sanções";
const DESCRICAO =
  "O que mudou da 8.666 para a Lei 14.133 na prática: modalidades, critérios de julgamento, dispensa, prazos e os erros que mais desclassificam.";
const ATUALIZADO = "2026-08-26";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/lei-14133/" },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE.url}/lei-14133/`, type: "article" },
};

const SECOES = [
  { id: "o-que-e", titulo: "O que é a Lei 14.133/2021" },
  { id: "o-que-mudou", titulo: "O que mudou da 8.666 para a 14.133" },
  { id: "modalidades", titulo: "As cinco modalidades de licitação" },
  { id: "julgamento", titulo: "Critérios de julgamento e modos de disputa" },
  { id: "contratacao-direta", titulo: "Contratação direta: dispensa e inexigibilidade" },
  { id: "auxiliares", titulo: "Os procedimentos auxiliares" },
  { id: "fornecedor", titulo: "O que muda no seu dia a dia como fornecedor" },
  { id: "pncp", titulo: "Onde os editais são publicados: o PNCP" },
  { id: "erros", titulo: "Os erros que mais desclassificam" },
];

const FAQ = [
  {
    pergunta: "A Lei 8.666 ainda vale em 2026?",
    resposta:
      "Não para licitações novas. A 8.666/93, a Lei do Pregão (10.520/2002) e o RDC (12.462/2011) foram revogadas em 30 de dezembro de 2023. Contratos assinados sob a lei antiga continuam regidos por ela até o fim da vigência, então na prática as duas convivem, uma para contratos em execução, outra para tudo que é licitado hoje.",
  },
  {
    pergunta: "Quais modalidades a Lei 14.133 extinguiu?",
    resposta:
      "Convite e tomada de preços deixaram de existir. Sobraram cinco modalidades: pregão, concorrência, concurso, leilão e diálogo competitivo, esta última criada pela nova lei.",
  },
  {
    pergunta: "Qual é o limite de valor para dispensa de licitação?",
    resposta:
      `Em ${REAJUSTE_VIGENTE.ano}, ${emReais(DISPENSA_POR_VALOR.obrasEEngenharia)} para obras e serviços de engenharia (art. 75, I) e ${emReais(DISPENSA_POR_VALOR.comprasEServicos)} para as demais compras e serviços (art. 75, II). São os valores do ${REAJUSTE_VIGENTE.decreto}, que reajustou os limites em ${String(REAJUSTE_VIGENTE.percentual).replace(".", ",")}% e vale desde ${vigenciaPorExtenso()}. Os dois dobram quando a contratação é feita por ${DOBRAM_O_LIMITE}. O decreto sai todo fim de dezembro, então em janeiro confira se já há um novo.`,
  },
  {
    pergunta: "O pregoeiro deixou de existir?",
    resposta:
      "A figura central passou a ser o agente de contratação, designado para conduzir o processo. No pregão ele continua sendo chamado de pregoeiro. Mudou menos o nome e mais a responsabilidade: a nova lei detalha atribuições e exige segregação de funções.",
  },
  {
    pergunta: "Habilitação vem antes ou depois do julgamento?",
    resposta:
      "Depois. A nova lei consolidou a inversão de fases: primeiro se julgam as propostas, depois se analisa a documentação apenas do licitante mais bem classificado. Na prática, quem não chega em primeiro raramente tem a papelada examinada.",
  },
  {
    pergunta: "Qual o prazo para recorrer de uma decisão?",
    resposta:
      "Três dias úteis contados da intimação, com igual prazo para contrarrazões. No pregão eletrônico existe um passo anterior e fatal: a intenção de recurso precisa ser manifestada na própria sessão, no momento em que o sistema abre. Perdeu essa janela, perdeu o direito.",
  },
  {
    pergunta: "Onde encontro os editais publicados sob a Lei 14.133?",
    resposta:
      "No Portal Nacional de Contratações Públicas, o PNCP. A lei o define como o sítio oficial de divulgação, o que na prática transformou um universo espalhado por dezenas de portais em uma fonte única e consultável.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE.url}/lei-14133/#article`,
      headline: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      datePublished: ATUALIZADO,
      dateModified: ATUALIZADO,
      author: { "@id": `${SITE.url}/#${AUTHOR.slug}` },
      publisher: { "@id": `${SITE.url}/#organization` },
      isPartOf: { "@id": `${SITE.url}/#website` },
      about: {
        "@type": "Legislation",
        name: "Lei nº 14.133, de 1º de abril de 2021",
        legislationIdentifier: "Lei 14.133/2021",
        legislationJurisdiction: "BR",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/lei-14133/#faq`,
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
        { "@type": "ListItem", position: 2, name: "Lei 14.133/2021", item: `${SITE.url}/lei-14133/` },
      ],
    },
  ],
};

export default function Lei14133() {
  const artigos = artigosDoGuia("/lei-14133/");

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Lei 14.133/2021" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Lei 14.133/2021: o guia da Nova Lei de Licitações para quem vende ao governo
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · Atualizado em 10 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            Quase toda explicação sobre a Nova Lei de Licitações é escrita para quem
            compra. Fala de planejamento, de governança, de responsabilidade do
            gestor. Este guia é escrito para o outro lado do balcão: a empresa que
            quer vender, precisa entender as regras do jogo e não tem departamento
            jurídico para traduzir 194 artigos.
          </P>
          <P>
            A pergunta que importa aqui não é o que a lei diz. É o que ela muda na
            sua rotina de participar de certame.
          </P>

          <RespostaDireta>
            A Lei 14.133/2021 é a Nova Lei de Licitações e Contratos Administrativos,
            em vigor desde abril de 2021 e obrigatória para todas as contratações
            desde 30 de dezembro de 2023, quando a Lei 8.666/93 foi revogada. Ela
            unificou pregão, concorrência e RDC em um regime só, tornou a inversão de
            fases a regra e centralizou a divulgação de editais no PNCP.
          </RespostaDireta>

          <Indice itens={SECOES} />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="o-que-e" titulo="O que é a Lei 14.133/2021">
            <P>
              Sancionada em 1º de abril de 2021, a Lei 14.133 substituiu três normas
              que conviviam de forma desconfortável havia quase trinta anos: a Lei
              8.666/93, a Lei do Pregão e o Regime Diferenciado de Contratações. Até
              2023 as duas gerações de regras conviveram, e o órgão escolhia por qual
              licitar. Desde 30 de dezembro daquele ano, só existe uma.
            </P>
            <P>
              Isso tem uma consequência prática que muita empresa ainda não absorveu:
              qualquer edital publicado hoje segue a 14.133. Se o seu material de
              apoio interno, a sua planilha de documentos ou o seu modelo de proposta
              foram montados na era da 8.666, eles estão desatualizados.
            </P>
          </Secao>

          <Secao id="o-que-mudou" titulo="O que mudou da 8.666 para a 14.133">
            <P>
              Comparativo do que efetivamente altera a vida de quem participa:
            </P>
            <Tabela
              cabecalho={["Aspecto", "Lei 8.666/93", "Lei 14.133/2021"]}
              linhas={[
                ["Modalidades", "Convite, tomada de preços, concorrência, concurso, leilão (+ pregão em lei própria)", "Pregão, concorrência, concurso, leilão e diálogo competitivo"],
                ["Ordem das fases", "Habilitação antes do julgamento, como regra", "Julgamento antes da habilitação, como regra"],
                ["Quem conduz", "Comissão de licitação", "Agente de contratação (pregoeiro, no pregão)"],
                ["Planejamento", "Pouco detalhado", "ETP, termo de referência e matriz de riscos"],
                ["Divulgação", "Diário oficial e sítios de cada órgão", "PNCP como portal oficial único"],
                ["Contratação direta", "Artigos 24 e 25", "Artigos 74 e 75, com processo próprio"],
                ["Garantia em obras", "Percentual limitado", "Seguro-garantia com cláusula de retomada"],
              ]}
            />
            <P>
              A mudança de ordem das fases é a que mais muda o comportamento
              comercial. Na lógica antiga, toda empresa precisava chegar com a
              documentação impecável só para entrar na disputa. Agora a papelada do
              licitante mais bem classificado é que será examinada, o que reduz o
              custo de participar, mas aumenta o custo de errar, porque quando a sua
              vez chega, você já está em primeiro e tem tudo a perder.
            </P>
          </Secao>

          <Secao id="modalidades" titulo="As cinco modalidades de licitação">
            <Tabela
              cabecalho={["Modalidade", "Para que serve"]}
              linhas={[
                ["Pregão", "Bens e serviços comuns, aqueles cujo padrão de desempenho pode ser definido objetivamente. É a modalidade da maioria esmagadora dos certames."],
                ["Concorrência", "Obras, serviços especiais e compras que não se enquadram como comuns."],
                ["Concurso", "Trabalho técnico, científico ou artístico, com prêmio ou remuneração ao vencedor."],
                ["Leilão", "Alienação de bens da administração a quem oferecer o maior lance."],
                ["Diálogo competitivo", "Contratações de inovação ou de solução ainda indefinida, em que a administração conversa com os licitantes antes de fechar o objeto."],
              ]}
            />
            <P>
              Convite e tomada de preços foram extintos. Se você ainda ouve esses
              nomes em conversa de mercado, é resquício, ou contrato antigo em
              execução.
            </P>
          </Secao>

          <Secao id="julgamento" titulo="Critérios de julgamento e modos de disputa">
            <P>
              O critério de julgamento define como o vencedor é escolhido: menor
              preço, maior desconto, melhor técnica ou conteúdo artístico, técnica e
              preço, maior lance e maior retorno econômico. Menor preço e maior
              desconto respondem pela maior parte do que você vai encontrar.
            </P>
            <P>
              O modo de disputa define a mecânica da sessão, e é aqui que se ganha ou
              se perde dinheiro:
            </P>
            <Tabela
              cabecalho={["Modo", "Como funciona"]}
              linhas={[
                ["Aberto", "Lances públicos e sucessivos, com prorrogação automática. Você vê a disputa acontecer."],
                ["Fechado", "Proposta única e sigilosa até a abertura. Não há como reagir ao concorrente."],
                ["Aberto e fechado", "Fase de lances abertos seguida de uma proposta final fechada dos melhores colocados."],
                ["Fechado e aberto", "Propostas sigilosas primeiro, depois disputa aberta entre os classificados."],
              ]}
            />
            <P>
              Precificar para modo fechado e para modo aberto são exercícios
              diferentes. No aberto, sobra margem para reagir; no fechado, a sua
              primeira proposta é a única. Vale ler o edital olhando esse campo antes
              de montar a planilha de custo.
            </P>
          </Secao>

          <Secao id="contratacao-direta" titulo="Contratação direta: dispensa e inexigibilidade">
            <P>
              Nem toda compra pública passa por certame. A contratação direta tem duas
              portas, e confundi-las é comum:
            </P>
            <Tabela
              cabecalho={["Instituto", "Artigo", "Quando se aplica"]}
              linhas={[
                ["Dispensa", "Art. 75", "A competição seria possível, mas a lei autoriza pular. Casos típicos: valor abaixo do limite, emergência, licitação deserta ou fracassada."],
                ["Inexigibilidade", "Art. 74", "A competição é inviável. Fornecedor exclusivo, serviço técnico especializado de notória especialização, artista consagrado."],
              ]}
            />
            <P>
              Os limites do artigo 75 são corrigidos por decreto todo ano. Em{" "}
              {REAJUSTE_VIGENTE.ano} eles valem assim:
            </P>
            <Tabela
              cabecalho={["O que está sendo contratado", `Limite em ${REAJUSTE_VIGENTE.ano}`, "Base"]}
              linhas={[
                [
                  "Obras e serviços de engenharia",
                  emReais(DISPENSA_POR_VALOR.obrasEEngenharia),
                  "Art. 75, I",
                ],
                [
                  "Demais compras e serviços",
                  emReais(DISPENSA_POR_VALOR.comprasEServicos),
                  "Art. 75, II",
                ],
              ]}
            />
            <P>
              Os valores vêm do {REAJUSTE_VIGENTE.decreto}, que reajustou os limites
              em {String(REAJUSTE_VIGENTE.percentual).replace(".", ",")}% pelo IPCA-E
              e vale desde {vigenciaPorExtenso()}. Os dois dobram quando quem contrata
              é {DOBRAM_O_LIMITE}. É a exceção que mais confunde, e ela aparece
              bastante em saúde e em resíduos, onde o consórcio intermunicipal é
              comum.
            </P>
            <P>
              O decreto novo sai todo fim de dezembro. Em janeiro, confira se já há
              outro: trabalhar com o valor do ano passado é erro que aparece em
              proposta e em cotação.
            </P>
            <P>
              Para o fornecedor pequeno, a dispensa eletrônica é a porta de entrada
              mais subestimada do mercado público. Volume alto, concorrência baixa,
              ciclo curto, e quase ninguém monitora.
            </P>
          </Secao>

          <Secao id="auxiliares" titulo="Os procedimentos auxiliares">
            <P>
              A lei criou instrumentos que não são licitação, mas orbitam em torno
              dela: credenciamento, pré-qualificação, procedimento de manifestação de
              interesse, sistema de registro de preços e registro cadastral.
            </P>
            <P>
              O registro de preços merece atenção comercial. Ganhar uma ata não
              garante faturamento, mas garante o direito de fornecer se e quando o órgão
              precisar. Empresa que projeta receita com base em ata assinada costuma
              se frustrar. Por outro lado, uma ata vigente é ativo de longo prazo, e
              adesões de outros órgãos podem multiplicar o volume original.
            </P>
          </Secao>

          <Secao id="fornecedor" titulo="O que muda no seu dia a dia como fornecedor">
            <P>
              Resumindo o que a nova lei significa na operação de uma empresa que
              vende ao governo:
            </P>
            <Tabela
              cabecalho={["Frente", "O que fazer"]}
              linhas={[
                ["Habilitação", "Manter certidões e atestados sempre vigentes. Com a inversão de fases, você só descobre um problema quando já está em primeiro lugar."],
                ["Monitoramento", "Acompanhar o PNCP, não portais isolados. A publicação oficial migrou."],
                ["Proposta", "Ler o modo de disputa antes de precificar."],
                ["Prazos", "Manifestar intenção de recurso na própria sessão. É a janela mais curta e mais fatal do processo."],
                ["Contrato", "Conhecer as regras de alteração e reajuste antes de assinar, não depois."],
              ]}
            />
          </Secao>

          {/*
            Logo depois da tabela que lista as cinco frentes da operação. É ali
            que a linha "Monitoramento" aparece como tarefa, e ainda antes da
            seção do PNCP — o leitor acabou de receber uma lista de deveres e é
            o momento em que tirar um deles da mão tem valor óbvio.

            A chamada devolve só essa linha, de propósito: prometer as outras
            quatro seria vender o que o produto não faz.

            Sem heading próprio: o `Indice` promete uma lista fechada de seções,
            e um h2 comercial faria o sumário discordar do documento.
          */}
          <section aria-label="Alerta diário de editais">
            <CapturaAlerta
              origem="guia/lei-14133#meio"
              chamada={{
                titulo: "Das cinco linhas acima, o monitoramento é a que ninguém faz à mão por muito tempo",
                texto:
                  "Teste por 14 dias, sem cartão: nos dias úteis, os editais publicados no PNCP que combinam com o que a sua empresa vende, com nota de aderência, órgão, valor, prazo e o link para o registro oficial. Habilitação, proposta, prazos e contrato continuam com você; esta é a linha que dá para tirar da rotina.",
              }}
              textoDoBotao="Quero testar por 14 dias"
            />
          </section>

          <Secao id="pncp" titulo="Onde os editais são publicados: o PNCP">
            <P>
              O Portal Nacional de Contratações Públicas é definido pela própria lei
              como sítio oficial de divulgação. Editais, atas, contratos e aditivos de
              União, estados e municípios passam por ali.
            </P>
            <P>
              Para quem vende, isso é a melhor notícia da nova lei. Antes, acompanhar
              o mercado significava vigiar dezenas de portais com cadastros e
              interfaces diferentes. Agora existe uma fonte única, e, sendo pública e
              estruturada, ela pode ser monitorada de forma automática, o que antes só
              grandes empresas conseguiam.
            </P>
          </Secao>

          <Secao id="erros" titulo="Os erros que mais desclassificam">
            <P>
              Nenhum deles tem a ver com preço. Todos são operacionais, e todos são
              evitáveis:
            </P>
            <Tabela
              cabecalho={["Erro", "Como evitar"]}
              linhas={[
                ["Certidão vencida na data da sessão", "Controlar validade por calendário, não por memória. Um documento que venceu dois dias antes elimina uma proposta vencedora."],
                ["Não manifestar intenção de recurso", "Tratar o momento da sessão como prazo fatal, porque é."],
                ["Atestado que não cobre o quantitativo exigido", "Conferir o percentual mínimo antes de decidir participar."],
                ["Proposta fora do modelo do edital", "Usar o anexo do próprio edital, sempre."],
                ["Preço inexequível sem demonstração", "Levar a composição de custos pronta para a diligência."],
              ]}
            />
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes sobre a Lei 14.133">
            <Faq itens={FAQ} />
          </Secao>

          <Secao id="fontes" titulo="Fontes">
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm" target="_blank" rel="noopener">
                  Lei nº 14.133/2021 (Planalto)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.pncp.gov.br/" target="_blank" rel="noopener">
                  Portal Nacional de Contratações Públicas
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://portal.tcu.gov.br/" target="_blank" rel="noopener">
                  Tribunal de Contas da União
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
              Artigos sobre a Lei 14.133 na prática
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
          Este guia tem finalidade informativa e operacional. Não constitui parecer
          jurídico: a decisão de participar de um certame e a interpretação de
          cláusulas específicas de edital cabem à empresa licitante e ao seu
          assessor jurídico. Leia o{" "}
          <a className="underline underline-offset-4" href="/aviso-legal/">
            aviso legal
          </a>
          .
        </p>
      </main>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
