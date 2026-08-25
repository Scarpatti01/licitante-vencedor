import type { Metadata } from "next";
import { AUTHOR, SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { Citacao, Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { artigosDoGuia } from "@/lib/blog";

const TITULO = "Súmulas do TCU em licitações: o que cada uma muda na sua proposta";
const DESCRICAO =
  "As súmulas do TCU que mais aparecem em edital: 247, 262, 263, 269, 270, 272, 274, 275, 281, 283 e outras, com texto oficial e efeito prático.";
const ATUALIZADO = "2026-08-12";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/sumulas-tcu/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO,
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/sumulas-tcu/`,
    type: "article",
  },
};

const SECOES = [
  { id: "o-que-e", titulo: "O que é uma súmula do TCU e quem ela obriga" },
  { id: "como-usar", titulo: "Como usar uma súmula em impugnação e em recurso" },
  { id: "objeto", titulo: "Divisão do objeto: a súmula que mais abre mercado" },
  { id: "habilitacao", titulo: "Habilitação: o que o edital não pode exigir" },
  { id: "preco", titulo: "Preço, inexequibilidade e orçamento" },
  { id: "engenharia", titulo: "Obras e serviços de engenharia" },
  { id: "direta", titulo: "Contratação direta: inexigibilidade e dispensa" },
  { id: "ti", titulo: "Serviços de tecnologia da informação" },
  { id: "responsabilizacao", titulo: "Dano ao erário e prazo para cobrança" },
  { id: "vigencia", titulo: "As súmulas ainda valem sob a Lei 14.133?" },
  { id: "resumo", titulo: "Tabela de consulta rápida" },
];

const FAQ = [
  {
    pergunta: "Súmula do TCU tem força de lei?",
    resposta:
      "Não. Súmula não é norma: é a consolidação do entendimento reiterado do próprio tribunal, que vincula a atuação do TCU e orienta o gestor federal sujeito à sua jurisdição. Para o fornecedor, o valor é argumentativo e prático. Invocar uma súmula em impugnação é mostrar ao órgão que, se mantiver a exigência, ele já sabe qual será a leitura do tribunal que vai julgar as contas dele.",
  },
  {
    pergunta: "O edital exige coisa que a súmula proíbe. O que eu faço?",
    resposta:
      "Impugne dentro do prazo do edital, por escrito, citando o número da súmula e o trecho exato do edital que a contraria. Não espere a sessão para reclamar: exigência ilegal não impugnada no prazo costuma ser tratada como preclusa, e a discussão depois da abertura fica muito mais difícil de sustentar.",
  },
  {
    pergunta: "As súmulas citam a Lei 8.666, que foi revogada. Elas caducaram?",
    resposta:
      "A citação de um artigo revogado não apaga o entendimento por trás dela. Boa parte das súmulas expressa princípio que a Lei 14.133 manteve, competitividade, proporcionalidade das exigências, vedação a exigência desnecessária. O que muda é o cuidado: cite a súmula pelo raciocínio que ela consolida e ancore o pedido também no dispositivo correspondente da lei atual.",
  },
  {
    pergunta: "Súmula do TCU vale para licitação de estado e de município?",
    resposta:
      "A jurisdição do TCU alcança recursos federais. Estado e município têm o seu próprio tribunal de contas, com súmulas próprias. Na prática, o entendimento do TCU é citado em todo o país como referência persuasiva, e boa parte dos tribunais estaduais adota a mesma linha, mas o argumento fica mais forte quando você encontra a súmula do tribunal que efetivamente fiscaliza aquele órgão.",
  },
  {
    pergunta: "Onde confiro se uma súmula continua vigente?",
    resposta:
      "Na pesquisa de jurisprudência do próprio TCU, que informa a situação de cada enunciado. Vale o hábito antes de protocolar: súmula é revista, e sustentar impugnação em enunciado alterado enfraquece o resto do seu pedido.",
  },
  {
    pergunta: "Posso exigir que o pregoeiro aplique a súmula na hora da sessão?",
    resposta:
      "Você pode registrar a manifestação em campo próprio e, se for o caso, declarar intenção de recurso motivada. O pregoeiro não é obrigado a acatar de imediato, mas a manifestação registrada é o que preserva o seu direito de recorrer depois, sem ela, a via recursal se fecha.",
  },
];

const RESUMO: string[][] = [
  ["39", "Contratação direta", "Inexigibilidade por notória especialização só cabe em serviço de natureza singular"],
  ["247", "Divisão do objeto", "Objeto divisível deve ser adjudicado por item, e a habilitação tem de acompanhar a divisão"],
  ["257", "Engenharia", "Serviço comum de engenharia pode ser contratado por pregão"],
  ["258", "Orçamento", "Composição de custos, encargos e BDI integram o edital e a proposta; nada de “verba”"],
  ["260", "Engenharia", "É dever do gestor exigir ART das peças técnicas"],
  ["261", "Engenharia", "Projeto básico adequado e atualizado é necessário; revisão não pode transfigurar o objeto"],
  ["262", "Preço", "Inexequibilidade pelos índices legais é presunção relativa: cabe demonstrar que o preço fecha"],
  ["263", "Habilitação", "Quantitativo mínimo é legal, limitado às parcelas de maior relevância e proporcional ao objeto"],
  ["265", "Contratação direta", "Contratar subsidiária exige preço de mercado e pertinência com o objeto social"],
  ["269", "Tecnologia da informação", "Remuneração vinculada a resultado; posto ou hora só com justificativa prévia"],
  ["270", "Especificação", "Indicação de marca só por padronização estritamente necessária e justificada antes"],
  ["272", "Habilitação", "Vedada exigência que obrigue o licitante a gastar antes de ter o contrato"],
  ["274", "Habilitação", "Vedada exigência de inscrição prévia no SICAF como condição de habilitação"],
  ["275", "Qualificação econômica", "Capital mínimo, patrimônio líquido ou garantia, nunca os três somados"],
  ["281", "Cooperativas", "Vedada a participação quando o serviço exige subordinação, pessoalidade e habitualidade"],
  ["282", "Responsabilização", "Ação de ressarcimento ao erário é imprescritível"],
  ["283", "Habilitação", "Exige-se prova de regularidade fiscal, não certidão de quitação"],
  ["287", "Contratação direta", "Dispensa para promoção de concurso público exige nexo com a natureza da instituição"],
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE.url}/sumulas-tcu/#article`,
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
      "@id": `${SITE.url}/sumulas-tcu/#faq`,
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
        {
          "@type": "ListItem",
          position: 2,
          name: "Súmulas do TCU",
          item: `${SITE.url}/sumulas-tcu/`,
        },
      ],
    },
  ],
};

export default function SumulasTcu() {
  const artigos = artigosDoGuia("/sumulas-tcu/");

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Súmulas do TCU" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Súmulas do TCU em licitações
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · Atualizado em 12 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            Quase toda impugnação de edital que dá certo tem a mesma estrutura:
            um trecho do edital, um enunciado do TCU que diz o contrário, e três
            linhas ligando os dois. Não é retórica jurídica. É mostrar ao órgão
            que a exigência dele já foi analisada, e como.
          </P>
          <P>
            Reuni aqui as súmulas que mais aparecem em edital de compra e de
            serviço. De cada uma você encontra o texto oficial, na íntegra, e
            depois a leitura do que ela muda na sua proposta. Os dois estão
            visualmente separados de propósito: o que está no quadro é o
            tribunal falando, o resto sou eu.
          </P>

          <RespostaDireta>
            Súmula do TCU é a consolidação do entendimento reiterado do tribunal.
            Não é lei e não vincula o Judiciário, mas orienta o gestor federal e
            antecipa como o órgão de controle vai ler aquela cláusula. Para o
            fornecedor, serve a três coisas: identificar exigência ilegal antes
            de gastar com a proposta, sustentar impugnação dentro do prazo do
            edital e fundamentar recurso depois do julgamento.
          </RespostaDireta>

          <Indice itens={SECOES} />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="o-que-e" titulo="O que é uma súmula do TCU e quem ela obriga">
            <P>
              O TCU julga as contas de quem usa dinheiro federal. Quando o
              tribunal decide a mesma questão repetidas vezes no mesmo sentido,
              esse entendimento pode ser consolidado num enunciado curto, a
              súmula. Ela não cria obrigação nova: resume a leitura que o
              tribunal já vinha dando à norma que existe.
            </P>
            <P>
              Isso define exatamente o peso que ela tem para você. A súmula
              vincula a atuação do próprio TCU e orienta o administrador sujeito
              à sua jurisdição. Não vincula o juiz, e não alcança automaticamente
              licitação estadual ou municipal, que tem o tribunal de contas
              respectivo. O que ela dá ao fornecedor é previsibilidade: você sabe
              de antemão o que o controle vai apontar.
            </P>
            <P>
              Na prática, o efeito é maior do que a natureza jurídica sugere.
              Nenhum gestor quer manter cláusula que o tribunal que vai julgar as
              contas dele já classificou como restritiva. É por isso que uma
              impugnação bem ancorada em súmula costuma ser acatada sem briga.
            </P>
          </Secao>

          <Secao id="como-usar" titulo="Como usar uma súmula em impugnação e em recurso">
            <P>
              O erro mais comum é citar o número e parar por aí. “Fere a Súmula
              247 do TCU” não é argumento. É slogan. O que convence tem três
              partes, e cabe em um parágrafo.
            </P>
            <Tabela
              cabecalho={["Parte", "O que escrever", "Por que importa"]}
              linhas={[
                ["O que o edital diz", "Transcreva o item, com número e página", "Sem o trecho exato, o órgão responde genericamente e mantém tudo"],
                ["O que o tribunal já decidiu", "Transcreva a súmula inteira, não a paráfrase", "A força está no texto oficial; resumo abre espaço para o órgão discordar da sua leitura"],
                ["O pedido concreto", "Diga o que quer: suprimir, reduzir ou substituir a exigência", "Impugnação sem pedido determinado é respondida com “mantém-se o edital”"],
              ]}
            />
            <P>
              Prazo é o que mais elimina bom argumento. A impugnação tem janela
              própria no edital, e exigência não impugnada a tempo tende a ser
              tratada como preclusa. Se o certame já está em disputa, o caminho
              passa a ser a manifestação registrada e a intenção de recurso
              motivada, sem ela, a via recursal simplesmente se fecha.
            </P>
          </Secao>

          <Secao id="objeto" titulo="Divisão do objeto: a súmula que mais abre mercado">
            <P>
              Se você é pequeno e vive vendo certame grande demais para o seu
              tamanho, esta é a súmula que muda o seu ano.
            </P>
            <Citacao fonte="Súmula TCU nº 247">
              É obrigatória a admissão da adjudicação por item e não por preço
              global, nos editais das licitações para a contratação de obras,
              serviços, compras e alienações, cujo objeto seja divisível, desde
              que não haja prejuízo para o conjunto ou complexo ou perda de
              economia de escala, tendo em vista o objetivo de propiciar a ampla
              participação de licitantes que, embora não dispondo de capacidade
              para a execução, fornecimento ou aquisição da totalidade do objeto,
              possam fazê-lo com relação a itens ou unidades autônomas, devendo
              as exigências de habilitação adequar-se a essa divisibilidade.
            </Citacao>
            <P>
              O trecho decisivo é o final, e quase ninguém usa: a habilitação
              tem de acompanhar a divisão. Não adianta o edital dividir em itens
              e continuar exigindo atestado do volume total. Isso recria a
              barreira que a divisão deveria derrubar. Quando encontrar essa
              combinação, impugne os dois pontos juntos.
            </P>
            <P>
              A especificação do que se compra é o outro lado do mesmo problema.
              Marca fechada elimina concorrente antes da disputa começar.
            </P>
            <Citacao fonte="Súmula TCU nº 270">
              Em licitações referentes a compras, inclusive de softwares, é
              possível a indicação de marca, desde que seja estritamente
              necessária para atender exigências de padronização e que haja
              prévia justificação.
            </Citacao>
            <P>
              Repare nas duas condições cumulativas: padronização estritamente
              necessária <em>e</em> justificativa prévia. Edital que traz a marca
              sem a justificativa no processo não atende à segunda, e esse é o
              ponto de ataque mais simples de sustentar. Você não precisa
              discutir engenharia, só apontar a ausência do documento.
            </P>
          </Secao>

          <Secao id="habilitacao" titulo="Habilitação: o que o edital não pode exigir">
            <P>
              Habilitação é onde o edital restringe sem parecer restritivo. As
              súmulas desta seção são as que mais derrubam cláusula.
            </P>
            <Citacao fonte="Súmula TCU nº 272">
              No edital de licitação, é vedada a inclusão de exigências de
              habilitação e de quesitos de pontuação técnica para cujo
              atendimento os licitantes tenham de incorrer em custos que não
              sejam necessários anteriormente à celebração do contrato.
            </Citacao>
            <P>
              Esta é a súmula mais subutilizada da lista. Ela ataca a exigência
              de você já ter a estrutura antes de ganhar: sede na cidade, frota
              própria, equipe contratada, certificação cara. O critério é
              temporal, se o custo só faz sentido depois de assinado o contrato,
              não pode ser condição para disputar.
            </P>
            <Citacao fonte="Súmula TCU nº 263">
              Para a comprovação da capacidade técnico-operacional das
              licitantes, e desde que limitada, simultaneamente, às parcelas de
              maior relevância e valor significativo do objeto a ser contratado,
              é legal a exigência de comprovação da execução de quantitativos
              mínimos em obras ou serviços com características semelhantes,
              devendo essa exigência guardar proporção com a dimensão e a
              complexidade do objeto a ser executado.
            </Citacao>
            <P>
              Note que ela autoriza o quantitativo mínimo. Não adianta impugnar
              a existência da exigência. O que se impugna é o excesso: parcela
              que não é de maior relevância, ou quantitativo desproporcional ao
              objeto. Argumento vencedor aqui é aritmético, não retórico.
            </P>
            <Citacao fonte="Súmula TCU nº 283">
              Para fim de habilitação, a Administração Pública não deve exigir
              dos licitantes a apresentação de certidão de quitação de obrigações
              fiscais, e sim prova de sua regularidade.
            </Citacao>
            <P>
              A diferença entre quitação e regularidade decide certame. Quem tem
              débito parcelado e em dia está regular, mas não quitado. Edital que
              pede quitação está excluindo bom pagador que negociou dívida.
            </P>
            <Citacao fonte="Súmula TCU nº 274">
              É vedada a exigência de prévia inscrição no Sistema de
              Cadastramento Unificado de Fornecedores - Sicaf para efeito de
              habilitação em licitação.
            </Citacao>
            <P>
              Cadastro é facilidade, não requisito. O SICAF substitui a entrega
              de documentos para quem o mantém atualizado. Ele não pode ser a
              porta de entrada obrigatória. Vale o mesmo raciocínio para cadastro
              próprio de estado e de município.
            </P>
            <Citacao fonte="Súmula TCU nº 275">
              Para fins de qualificação econômico-financeira, a Administração
              pode exigir das licitantes, de forma não cumulativa, capital social
              mínimo, patrimônio líquido mínimo ou garantias que assegurem o
              adimplemento do contrato a ser celebrado, no caso de compras para
              entrega futura e de execução de obras e serviços.
            </Citacao>
            <P>
              A palavra que trabalha é “não cumulativa”. O edital escolhe uma
              das três. Exigir capital mínimo e garantia e patrimônio líquido ao
              mesmo tempo é o caso clássico, e é impugnação de redação simples.
            </P>
            <Citacao fonte="Súmula TCU nº 281">
              É vedada a participação de cooperativas em licitação quando, pela
              natureza do serviço ou pelo modo como é usualmente executado no
              mercado em geral, houver necessidade de subordinação jurídica entre
              o obreiro e o contratado, bem como de pessoalidade e habitualidade.
            </Citacao>
            <P>
              Esta corta nos dois sentidos: impede cooperativa de disputar
              serviço que exige subordinação, e impede o edital de vedar
              cooperativa em serviço que não exige. A vedação genérica a
              cooperativas, sem análise da natureza do serviço, contraria a
              própria súmula.
            </P>
          </Secao>

          {/*
            Guia de consulta: quem chega aqui quase sempre está procurando o
            texto de uma súmula, não um produto. A captura fica leve e diz para
            seguir lendo. O lugar é depois do bloco de habilitação, que é a
            sequência mais longa de cláusulas impugnáveis do guia — o ponto em
            que fica evidente que a súmula só rende dentro do prazo do edital.

            Sem heading próprio: o `Indice` promete uma lista fechada de seções,
            e um h2 comercial faria o sumário discordar do documento.
          */}
          <section aria-label="Alerta diário de editais">
            <CapturaAlerta
              origem="guia/sumulas-tcu#meio"
              chamada={{
                titulo: "Súmula só rende enquanto o edital ainda está aberto",
                texto:
                  "Você veio consultar súmula, e a lista continua logo abaixo. Siga em frente se for só isso. Fica o registro de que nenhuma delas se aplica a um edital que passou despercebido. Se ajudar, todo dia útil a gente manda os editais publicados no PNCP que combinam com o que a sua empresa vende, com prazo e link para o registro oficial.",
              }}
              textoDoBotao="Quero receber os editais do meu ramo"
            />
          </section>

          <Secao id="preco" titulo="Preço, inexequibilidade e orçamento">
            <P>
              Perder por preço baixo demais é a derrota mais frustrante que
              existe, e boa parte dela é evitável.
            </P>
            <Citacao fonte="Súmula TCU nº 262">
              O critério definido no art. 48, inciso II, § 1º, alíneas &quot;a&quot; e
              &quot;b&quot;, da Lei nº 8.666/93 conduz a uma presunção relativa de
              inexequibilidade de preços, devendo a Administração dar à licitante
              a oportunidade de demonstrar a exequibilidade da sua proposta.
            </Citacao>
            <P>
              Duas palavras carregam tudo: presunção relativa. O índice não
              desclassifica sozinho. Ele inverte o ônus e obriga o órgão a te
              dar chance de provar que o preço fecha. Desclassificação automática
              por planilha abaixo do parâmetro é ilegal, e é o erro mais comum
              de pregoeiro apressado.
            </P>
            <P>
              A prova que funciona é documental e específica: proposta do seu
              fornecedor com o preço de aquisição, contrato anterior executado em
              valor equivalente, planilha aberta mostrando de onde vem a margem.
              Alegar produtividade, sem número, não sustenta.
            </P>
            <Citacao fonte="Súmula TCU nº 258">
              As composições de custos unitários e o detalhamento de encargos
              sociais e do BDI integram o orçamento que compõe o projeto básico
              da obra ou serviço de engenharia, devem constar dos anexos do
              edital de licitação e das propostas das licitantes e não podem ser
              indicados mediante uso da expressão &quot;verba&quot; ou de unidades
              genéricas.
            </Citacao>
            <P>
              Esta serve para exigir do órgão o que ele te cobra. Se o edital
              pede a sua composição detalhada mas publica o orçamento próprio em
              “verba”, você está formando preço sem saber o parâmetro. Pedir a
              planilha detalhada é direito, e o pedido tem base expressa.
            </P>
          </Secao>

          <Secao id="engenharia" titulo="Obras e serviços de engenharia">
            <Citacao fonte="Súmula TCU nº 257">
              O uso do pregão nas contratações de serviços comuns de engenharia
              encontra amparo na Lei nº 10.520/2002.
            </Citacao>
            <P>
              O que decide não é a palavra “engenharia” no objeto, é se o serviço
              é comum, isto é, se dá para descrever por especificação usual de
              mercado. Manutenção predial rotineira costuma ser; obra com projeto
              singular, não.
            </P>
            <Citacao fonte="Súmula TCU nº 261">
              Em licitações de obras e serviços de engenharia, é necessária a
              elaboração de projeto básico adequado e atualizado, assim
              considerado aquele aprovado com todos os elementos descritos no
              art. 6º, inciso IX, da Lei nº 8.666, de 21 de junho de 1993,
              constituindo prática ilegal a revisão de projeto básico ou a
              elaboração de projeto executivo que transfigurem o objeto
              originalmente contratado em outro de natureza e propósito diversos.
            </Citacao>
            <P>
              A segunda metade protege quem já ganhou. Revisão de projeto que
              transforma o objeto em outra coisa é ilegal, e é assim que
              contrato vira execução diferente da que foi orçada, com o
              contratado absorvendo a diferença.
            </P>
            <Citacao fonte="Súmula TCU nº 260">
              É dever do gestor exigir apresentação de Anotação de
              Responsabilidade Técnica - ART referente a projeto, execução,
              supervisão e fiscalização de obras e serviços de engenharia, com
              indicação do responsável pela elaboração de plantas,
              orçamento-base, especificações técnicas, composições de custos
              unitários, cronograma físico-financeiro e outras peças técnicas.
            </Citacao>
            <P>
              Aqui a súmula cria dever para o órgão, não restrição para você.
              Serve como argumento quando o edital apresenta peças técnicas sem
              responsável identificado, o que costuma explicar orçamento-base
              irreal.
            </P>
          </Secao>

          <Secao id="direta" titulo="Contratação direta: inexigibilidade e dispensa">
            <P>
              Contratação direta é onde o concorrente some sem você entender por
              quê. Estas três súmulas delimitam quando ela cabe.
            </P>
            <Citacao fonte="Súmula TCU nº 39">
              A inexigibilidade de licitação para a contratação de serviços
              técnicos com pessoas físicas ou jurídicas de notória especialização
              somente é cabível quando se tratar de serviço de natureza singular,
              capaz de exigir, na seleção do executor de confiança, grau de
              subjetividade insuscetível de ser medido pelos critérios objetivos
              de qualificação inerentes ao processo de licitação, nos termos do
              art. 25, inciso II, da Lei nº 8.666/1993.
            </Citacao>
            <P>
              Notória especialização sozinha não basta. O serviço precisa ser
              singular, e singular não quer dizer complexo ou caro, quer dizer
              que não dá para comparar por critério objetivo. Serviço técnico que
              vários prestadores executam de forma equivalente é licitável, por
              mais especializado que seja.
            </P>
            <Citacao fonte="Súmula TCU nº 265">
              A contratação de subsidiárias e controladas com fulcro no art. 24,
              inciso XXIII, da Lei nº 8.666/93 somente é admitida nas hipóteses
              em que houver, simultaneamente, compatibilidade com os preços de
              mercado e pertinência entre o serviço a ser prestado ou os bens a
              serem alienados ou adquiridos e o objeto social das mencionadas
              entidades.
            </Citacao>
            <Citacao fonte="Súmula TCU nº 287">
              É lícita a contratação de serviço de promoção de concurso público
              por meio de dispensa de licitação, com fulcro no art. 24, inciso
              XIII, da Lei 8.666/1993, desde que sejam observados todos os
              requisitos previstos no referido dispositivo e demonstrado o nexo
              efetivo desse objeto com a natureza da instituição a ser
              contratada, além de comprovada a compatibilidade com os preços de
              mercado.
            </Citacao>
            <P>
              As duas seguem a mesma lógica e por isso são fáceis de usar juntas:
              a hipótese de contratação direta não se presume do enquadramento
              formal. É preciso nexo real com a atividade da contratada e preço
              compatível com o mercado. Faltando qualquer um, a dispensa não se
              sustenta.
            </P>
          </Secao>

          <Secao id="ti" titulo="Serviços de tecnologia da informação">
            <Citacao fonte="Súmula TCU nº 269">
              Nas contratações para a prestação de serviços de tecnologia da
              informação, a remuneração deve estar vinculada a resultados ou ao
              atendimento de níveis de serviço, admitindo-se o pagamento por hora
              trabalhada ou por posto de serviço somente quando as
              características do objeto não o permitirem, hipótese em que a
              excepcionalidade deve estar prévia e adequadamente justificada nos
              respectivos processos administrativos.
            </Citacao>
            <P>
              Ela estabelece uma ordem de preferência, não uma proibição:
              resultado primeiro, posto ou hora só como exceção justificada. Para
              quem vende TI, a leitura prática é que edital por posto sem
              justificativa no processo tem vício, e que proposta desenhada
              para nível de serviço tende a ser a que o controle prefere ver.
            </P>
            <P>
              Vale um lembrete que não é súmula, é consequência: contrato por
              resultado exige que você saiba medir o seu próprio custo por
              entrega. Quem só sabe precificar hora não consegue competir nesse
              desenho, e é aí que empresa boa perde para empresa organizada.
            </P>
          </Secao>

          <Secao id="responsabilizacao" titulo="Dano ao erário e prazo para cobrança">
            <Citacao fonte="Súmula TCU nº 282">
              As ações de ressarcimento movidas pelo Estado contra os agentes
              causadores de danos ao erário são imprescritíveis.
            </Citacao>
            <P>
              Esta não trata de disputa de edital, e é justamente por isso que
              merece atenção de quem executa contrato. Ela diz que a cobrança de
              dano ao erário não tem prazo para prescrever, o que significa que
              pendência de execução contratual mal resolvida não some com o
              tempo.
            </P>
            <P>
              A consequência operacional é simples e vale dinheiro: guarde a
              documentação de execução, medições, atestos, comunicações
              formais, aditivos, muito além do prazo em que a nota fiscal
              importa para o fisco. Quando a cobrança aparece, o que separa a
              empresa que se defende da que paga é ter o registro do que foi
              entregue e aprovado.
            </P>
          </Secao>

          <Secao id="vigencia" titulo="As súmulas ainda valem sob a Lei 14.133?">
            <P>
              Quase todas as súmulas acima citam a Lei 8.666 ou a Lei 10.520,
              hoje substituídas. A pergunta é inevitável, e a resposta honesta
              tem duas partes.
            </P>
            <P>
              A primeira: o que a súmula consolida é o raciocínio, não o número
              do artigo. Competitividade, proporcionalidade da exigência,
              vedação a restrição desnecessária e contraditório antes de
              desclassificar são princípios que a Lei 14.133 manteve. O
              entendimento sobre habilitação proporcional ou sobre presunção
              relativa de inexequibilidade não nasceu do artigo revogado. O
              artigo era só onde ele estava ancorado.
            </P>
            <P>
              A segunda: isso não autoriza citar o enunciado sozinho e considerar
              a discussão encerrada. A redação prudente cita a súmula pelo
              raciocínio e ancora o pedido também no dispositivo correspondente
              da lei atual. Assim o argumento não depende de o leitor aceitar que
              um artigo revogado ainda serve de fundamento.
            </P>
            <P>
              E antes de protocolar, confirme a situação do enunciado na pesquisa
              de jurisprudência do TCU. Súmula é revista, e sustentar pedido em
              texto alterado enfraquece tudo o que vem depois dele.
            </P>
          </Secao>

          <Secao id="resumo" titulo="Tabela de consulta rápida">
            <P>
              Para uso durante a leitura de um edital: localize o tema, confira o
              enunciado na seção correspondente e transcreva o texto oficial na
              impugnação.
            </P>
            <Tabela
              cabecalho={["Súmula", "Tema", "Efeito prático"]}
              linhas={RESUMO}
            />
            <P>
              Este guia cobre as súmulas de licitação e contrato mais recorrentes
              em edital, não o conjunto completo dos enunciados do tribunal. Para
              entender a diferença entre súmula, acórdão e decisão de tribunal
              estadual, e como escolher a decisão certa para cada argumento, veja{" "}
              <a className="underline underline-offset-4" href="/jurisprudencia/">
                jurisprudência em licitações
              </a>
              . Para a regra vigente, o{" "}
              <a className="underline underline-offset-4" href="/lei-14133/">
                guia da Lei 14.133
              </a>
              ; e para a fase de execução, o guia de{" "}
              <a className="underline underline-offset-4" href="/contratos/">
                contrato administrativo
              </a>
              .
            </P>
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes">
            <Faq itens={FAQ} />
          </Secao>

          <Secao id="fontes" titulo="Fontes">
            <P>
              Os textos das súmulas reproduzidos acima são atos oficiais do
              Tribunal de Contas da União, transcritos na íntegra. Confira a
              vigência de cada enunciado na fonte antes de usar em peça formal.
            </P>
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://pesquisa.apps.tcu.gov.br/pesquisa/sumula" target="_blank" rel="noopener">
                  Pesquisa de súmulas (Tribunal de Contas da União)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm" target="_blank" rel="noopener">
                  Lei nº 14.133/2021 (Planalto)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm" target="_blank" rel="noopener">
                  Lei nº 8.666/1993 (Planalto)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/leis/2002/l10520.htm" target="_blank" rel="noopener">
                  Lei nº 10.520/2002 (Planalto)
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
              Artigos sobre as súmulas na prática
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
          parecer jurídico, a análise de um edital concreto, a redação de
          impugnação e recurso e a defesa em processo sancionatório cabem à
          empresa e ao seu assessor jurídico. Leia o{" "}
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
