import type { Metadata } from "next";
import { AUTHOR, SITE } from "@/lib/site";
import { Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { artigosDoGuia } from "@/lib/blog";

const TITULO = "Jurisprudência em licitações: o que o TCU exige";
const DESCRICAO =
  "Quem decide o quê, a diferença entre súmula e acórdão, e como usar uma decisão do TCU para impugnar edital ou sustentar recurso.";
const ATUALIZADO = "2026-08-10";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/jurisprudencia/" },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE.url}/jurisprudencia/`, type: "article" },
};

const SECOES = [
  { id: "o-que-e", titulo: "O que é jurisprudência em licitações" },
  { id: "quem-decide", titulo: "Quem decide o quê: TCU, TCEs e Judiciário" },
  { id: "sumula-acordao", titulo: "Súmula, acórdão e decisão: as diferenças que importam" },
  { id: "como-usar", titulo: "Como usar um acórdão a seu favor" },
  { id: "temas", titulo: "Os temas que mais aparecem" },
  { id: "onde-consultar", titulo: "Onde consultar, de graça" },
  { id: "14133", titulo: "O que muda com a Lei 14.133" },
  { id: "erros", titulo: "Três erros comuns ao citar jurisprudência" },
];

const FAQ = [
  {
    pergunta: "Decisão do TCU vale como lei?",
    resposta:
      "Não. O TCU não legisla. Ele fiscaliza e interpreta. Mas a administração pública tende a seguir o entendimento consolidado para não ser questionada depois, e é por isso que uma decisão bem citada muda o comportamento do órgão na prática, mesmo sem força de lei.",
  },
  {
    pergunta: "Qual a diferença entre súmula e acórdão do TCU?",
    resposta:
      "O acórdão julga um caso concreto. A súmula consolida um entendimento que se repetiu em vários acórdãos e passa a valer como orientação geral. Em uma impugnação, a súmula é o argumento mais forte, porque não depende de o caso citado ser parecido com o seu.",
  },
  {
    pergunta: "Posso impugnar um edital citando jurisprudência?",
    resposta:
      "Sim, e é o uso mais eficaz. Qualquer pessoa é parte legítima para impugnar edital, com prazo de até três dias úteis antes da abertura do certame. Uma impugnação que aponta a cláusula restritiva e cita o entendimento consolidado sobre ela tem chance real de alterar o edital.",
  },
  {
    pergunta: "Toda exigência de atestado é ilegal?",
    resposta:
      "Não. Exigir comprovação de experiência anterior é legítimo. O que a jurisprudência combate é a exigência desproporcional: quantitativo mínimo acima do razoável, vedação a somar atestados sem justificativa, ou requisito que só um fornecedor do mercado consegue cumprir.",
  },
  {
    pergunta: "O TCU julga licitação de prefeitura?",
    resposta:
      "Como regra, não. O TCU fiscaliza recursos federais. Licitação municipal com dinheiro próprio é do tribunal de contas do estado, ou do tribunal do município onde existir. Mas se houver repasse federal (convênio, emenda, transferência voluntária), o TCU passa a ter competência.",
  },
  {
    pergunta: "Onde encontro as decisões sem pagar por serviço de pesquisa?",
    resposta:
      "No próprio portal do TCU, que tem busca pública de acórdãos e súmulas, e nos sítios dos tribunais de contas estaduais. Todo o conteúdo é público e gratuito. Serviços pagos vendem curadoria e alerta, não acesso.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE.url}/jurisprudencia/#article`,
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
      "@id": `${SITE.url}/jurisprudencia/#faq`,
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
        { "@type": "ListItem", position: 2, name: "Jurisprudência", item: `${SITE.url}/jurisprudencia/` },
      ],
    },
  ],
};

export default function Jurisprudencia() {
  const artigos = artigosDoGuia("/jurisprudencia/");

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Jurisprudência" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Jurisprudência em licitações: como as decisões definem o que podem exigir de você
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · Atualizado em 10 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            A maioria dos fornecedores lê o edital como se fosse a regra final. Não
            é. Acima dele existe a lei, e entre os dois existe uma camada que quase
            ninguém do lado privado consulta: o que os tribunais já decidiram sobre
            aquele tipo de exigência.
          </P>
          <P>
            Essa camada é a diferença entre aceitar uma cláusula restritiva e
            derrubá-la em três dias úteis.
          </P>

          <RespostaDireta>
            Jurisprudência em licitações é o conjunto de decisões dos tribunais de
            contas e do Judiciário sobre como a lei deve ser aplicada nos certames.
            Ela não substitui a lei, mas define o que é exigência legítima e o que é
            restrição indevida à competição, e é o argumento que sustenta uma
            impugnação de edital ou um recurso administrativo.
          </RespostaDireta>

          <Indice itens={SECOES} />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="o-que-e" titulo="O que é jurisprudência em licitações">
            <P>
              A lei é escrita em termos gerais. Ela diz que a administração pode
              exigir qualificação técnica compatível com o objeto, mas não diz qual
              percentual é compatível. Diz que o edital não pode conter cláusula que
              frustre o caráter competitivo, mas não lista quais cláusulas fazem
              isso.
            </P>
            <P>
              Quem preenche esse espaço são as decisões. Ao longo de décadas, os
              tribunais de contas julgaram milhares de casos concretos e formaram um
              corpo de entendimentos sobre o que é razoável exigir. É esse corpo que
              chamamos de jurisprudência.
            </P>
            <P>
              Para o fornecedor, isso tem valor direto e imediato. Quando você
              encontra no edital uma exigência que parece feita sob medida para o
              concorrente, a pergunta não é se ela te incomoda. É se já existe
              decisão dizendo que ela é indevida.
            </P>
          </Secao>

          <Secao id="quem-decide" titulo="Quem decide o quê: TCU, TCEs e Judiciário">
            <Tabela
              cabecalho={["Órgão", "O que fiscaliza", "Peso prático"]}
              linhas={[
                ["TCU", "Aplicação de recursos federais: órgãos da União, estatais federais e repasses a estados e municípios", "Máximo. É a referência nacional, e o entendimento dele costuma ser adotado mesmo onde não tem competência"],
                ["Tribunais de contas estaduais", "Recursos estaduais e, na maioria dos estados, também os municipais", "Alto na sua região. É quem julga a licitação da prefeitura do lado"],
                ["Tribunais de contas municipais", "Existem apenas em São Paulo e Rio de Janeiro", "Restrito a essas capitais"],
                ["Judiciário", "Legalidade do ato, quando provocado por quem tem interesse", "Mais lento e mais caro, mas é o único que suspende certame por liminar"],
              ]}
            />
            <P>
              A confusão mais comum é achar que o TCU julga tudo. Não julga. Se a
              prefeitura da sua cidade licita com recurso próprio, quem fiscaliza é o
              tribunal de contas do estado. O TCU só entra quando há dinheiro federal
              envolvido: convênio, emenda parlamentar, transferência voluntária.
            </P>
            <P>
              Isso não significa que a decisão do TCU seja inútil fora do âmbito
              federal. Ela é a referência técnica que os demais tribunais citam, e
              nenhum pregoeiro gosta de sustentar uma exigência que o TCU já
              considerou restritiva.
            </P>
          </Secao>

          <Secao id="sumula-acordao" titulo="Súmula, acórdão e decisão: as diferenças que importam">
            <Tabela
              cabecalho={["Instrumento", "O que é", "Força do argumento"]}
              linhas={[
                ["Acórdão", "Julgamento de um caso concreto", "Depende de o caso ser parecido com o seu. Precisa contextualizar"],
                ["Súmula", "Entendimento consolidado a partir de vários acórdãos", "A mais forte. Vale como orientação geral, sem depender do caso"],
                ["Informativo de licitações", "Boletim periódico que resume decisões recentes", "Ótimo para acompanhar, fraco para citar sozinho"],
              ]}
            />
            <P>
              Na hora de escrever uma impugnação, a hierarquia é essa. Súmula primeiro,
              acórdão como reforço. Citar cinco acórdãos parecidos impressiona menos
              do que citar uma súmula que trata exatamente do ponto.
            </P>
          </Secao>

          <Secao id="como-usar" titulo="Como usar um acórdão a seu favor">
            <P>
              Existem três momentos em que a jurisprudência entra, e eles têm prazos e
              efeitos bem diferentes:
            </P>
            <Tabela
              cabecalho={["Momento", "Prazo", "O que dá para conseguir"]}
              linhas={[
                ["Pedido de esclarecimento", "Antes da abertura, conforme o edital", "Fazer o órgão explicitar o que quis dizer. Sem confronto, e às vezes resolve"],
                ["Impugnação do edital", "Até 3 dias úteis antes da abertura", "Alterar ou anular a cláusula restritiva. É a via mais eficaz"],
                ["Recurso administrativo", "3 dias úteis da intimação", "Reverter inabilitação ou desclassificação já decidida"],
                ["Representação ao tribunal de contas", "A qualquer tempo", "Provocar a fiscalização. Lento para o seu certame, útil para o mercado"],
              ]}
            />
            <P>
              Uma impugnação bem feita tem quatro partes: aponta a cláusula exata,
              explica por que ela restringe a competição, cita o entendimento
              consolidado sobre aquele ponto e propõe a redação alternativa. Essa
              última parte é a que a maioria esquece, e é a que facilita a vida do
              agente de contratação, que muitas vezes só precisa de um texto pronto
              para justificar a mudança.
            </P>
            <P>
              Um detalhe operacional que decide casos: impugnar não é reclamar. O
              texto precisa ser objetivo, sem adjetivo, sem acusação de
              direcionamento. Insinuar má-fé fecha a porta que o argumento técnico
              tinha aberto.
            </P>
          </Secao>

          {/*
            A intenção de quem chega aqui é informacional: a pessoa quer entender
            jurisprudência, não contratar nada. Forçar venda neste guia queima o
            que o texto construiu. Então a captura vem depois da tabela de
            prazos — o único ponto em que o assunto encosta de verdade no
            produto, porque o prazo de impugnação conta da publicação — e diz na
            primeira linha que o leitor pode seguir em frente.

            Sem heading próprio: o `Indice` promete uma lista fechada de seções,
            e um h2 comercial faria o sumário discordar do documento.
          */}
          <section aria-label="Alerta diário de editais">
            <CapturaAlerta
              origem="guia/jurisprudencia#meio"
              chamada={{
                titulo: "O argumento só serve enquanto o prazo está aberto",
                texto:
                  "Este guia é sobre argumento, e ele continua logo abaixo. Pule esta caixa sem culpa. Fica só a observação prática: os prazos da tabela acima correm a partir da publicação. Se ajudar, dá para testar por 14 dias, sem cartão, o serviço que manda nos dias úteis os editais do PNCP que combinam com o que a sua empresa vende, com prazo e link para o registro oficial.",
              }}
              textoDoBotao="Quero testar por 14 dias"
            />
          </section>

          <Secao id="temas" titulo="Os temas que mais aparecem">
            <P>
              Depois de percorrer o acervo de decisões deste site, os assuntos que se
              repetem são sempre os mesmos. Vale conhecê-los, porque são também as
              cláusulas que mais aparecem em edital:
            </P>
            <Tabela
              cabecalho={["Tema", "A discussão"]}
              linhas={[
                ["Atestado de capacidade técnica", "Até que ponto o órgão pode exigir quantitativo mínimo, e se atestados podem ser somados. O TCU já consolidou que a exigência de quantidades mínimas é legítima, desde que justificada e proporcional ao objeto"],
                ["Parcelamento do objeto", "Objeto divisível licitado em lote único restringe a competição. Existe entendimento consolidado pela adjudicação por item quando há viabilidade técnica e econômica"],
                ["Indicação de marca", "Só se admite com justificativa técnica que demonstre a necessidade, não por preferência do setor requisitante"],
                ["Carta de solidariedade do fabricante", "Exigência frequentemente considerada restritiva, por transferir ao fabricante o poder de escolher quem participa"],
                ["Amostra e prova de conceito", "Quando podem ser exigidas e em que fase, para não virar barreira de entrada"],
                ["Garantia da proposta", "Percentuais e formas de prestação, e o adicional exigido de consórcios"],
                ["Distância máxima de instalações", "Exigência de sede ou planta a certa distância do órgão, quase sempre tratada como restritiva sem justificativa técnica"],
                ["Preço inexequível", "O licitante tem direito de demonstrar a exequibilidade antes de ser desclassificado"],
              ]}
            />
            <P>
              Se alguma dessas apareceu no seu edital, existe uma boa chance de haver
              decisão sobre o ponto. Vale procurar antes de decidir não participar.
            </P>
          </Secao>

          <Secao id="onde-consultar" titulo="Onde consultar, de graça">
            <P>
              Todo esse conteúdo é público. O portal do TCU tem busca aberta de
              acórdãos e súmulas, e cada tribunal de contas estadual mantém a sua. Não
              existe conteúdo pago aqui, o que se vende no mercado é curadoria e
              alerta, não acesso.
            </P>
            <P>
              O problema real não é encontrar. É saber o que procurar e ter tempo de
              procurar antes do prazo de impugnação fechar, que são três dias úteis
              antes da abertura. Na prática, quem não monitora o edital desde a
              publicação descobre a cláusula restritiva quando já não dá mais para
              impugnar.
            </P>
          </Secao>

          <Secao id="14133" titulo="O que muda com a Lei 14.133">
            <P>
              As decisões formadas sob a Lei 8.666 não viraram pó. Boa parte dos
              princípios que sustentam esses entendimentos, competitividade,
              isonomia, julgamento objetivo, proporcionalidade das exigências. Foi
              mantida e reforçada na nova lei.
            </P>
            <P>
              O que muda é o enquadramento. Uma decisão que citava o artigo 30 da
              8.666 sobre qualificação técnica hoje precisa ser lida à luz dos
              dispositivos correspondentes da 14.133. O raciocínio permanece; a
              referência legal, não.
            </P>
            <P>
              É exatamente por isso que este acervo está sendo reconstruído em vez de
              simplesmente republicado. Decisão antiga com artigo revogado, citada sem
              tradução, enfraquece a sua impugnação em vez de sustentá-la. Se você
              ainda não leu o comparativo entre as duas leis, comece pelo{" "}
              <a className="underline underline-offset-4" href="/lei-14133/">
                guia da Lei 14.133
              </a>.
            </P>
          </Secao>

          <Secao id="erros" titulo="Três erros comuns ao citar jurisprudência">
            <Tabela
              cabecalho={["Erro", "Por que atrapalha"]}
              linhas={[
                ["Citar acórdão sem contextualizar o caso", "O órgão responde que a situação era outra, e a impugnação morre ali"],
                ["Usar decisão fundada em artigo revogado", "Entrega ao órgão o argumento fácil de que a base legal não existe mais"],
                ["Copiar petição pronta da internet", "Costuma tratar de cláusula parecida, não da sua. Impugnação genérica é indeferida em uma linha"],
              ]}
            />
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes sobre jurisprudência em licitações">
            <Faq itens={FAQ} />
          </Secao>

          <Secao id="fontes" titulo="Fontes">
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://portal.tcu.gov.br/jurisprudencia/" target="_blank" rel="noopener">
                  Jurisprudência do Tribunal de Contas da União
                </a>
              </li>
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
              Artigos sobre jurisprudência aplicada
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
          parecer jurídico, a análise de um edital concreto e a redação de
          impugnação ou recurso cabem à empresa licitante e ao seu assessor
          jurídico. Leia o{" "}
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
