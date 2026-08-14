import type { Metadata } from "next";
import { AUTHOR, SITE } from "@/lib/site";
import { Citacao, Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { artigosDoGuia } from "@/lib/blog";

const TITULO = "Habilitação em licitação: os documentos, os limites e o que desclassifica";
const DESCRICAO =
  "O que a Lei 14.133 permite exigir na habilitação e o que ela proíbe: os 4% dos atestados, o teto de 50%, o limite de 10% para capital mínimo, o que dá para corrigir depois de entregue e quando a amostra pode ser pedida.";
const ATUALIZADO = "2026-08-12";

export const metadata: Metadata = {
  title: "Habilitação em licitação: documentos, limites e o que desclassifica",
  description: DESCRICAO,
  alternates: { canonical: "/habilitacao/" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/habilitacao/`,
    type: "article",
  },
};

const SECOES = [
  { id: "quatro", titulo: "As quatro habilitações" },
  { id: "quando", titulo: "Quando os documentos são pedidos — e de quem" },
  { id: "corrigir", titulo: "Entregou com erro: o que ainda dá para corrigir" },
  { id: "tecnica", titulo: "Qualificação técnica: os 4% e o teto de 50%" },
  { id: "economica", titulo: "Qualificação econômico-financeira: o que é vedado exigir" },
  { id: "amostra", titulo: "Amostra e prova de conceito" },
  { id: "fases", titulo: "A ordem das fases, e quando ela se inverte" },
  { id: "checklist", titulo: "Checklist de quem não quer perder por documento" },
];

const FAQ = [
  {
    pergunta: "Preciso entregar todos os documentos junto com a proposta?",
    resposta:
      "Em regra, não. O art. 63, II, da Lei 14.133 determina que os documentos de habilitação sejam exigidos apenas do licitante vencedor — a exceção é quando o edital inverte as fases e coloca a habilitação antes do julgamento. E a regularidade fiscal, pelo inciso III, só é cobrada depois do julgamento e só do mais bem classificado.",
  },
  {
    pergunta: "Esqueci um documento. Dá para enviar depois?",
    resposta:
      "Depende do que é. O art. 64 proíbe substituir ou apresentar documento novo, mas abre duas exceções em diligência: complementar informação sobre documento já apresentado, desde que sobre fato que já existia na abertura, e atualizar documento cuja validade venceu depois do recebimento das propostas. E a comissão pode sanar erro ou falha que não altere a substância. Documento que simplesmente não foi entregue não se encaixa em nenhuma dessas.",
  },
  {
    pergunta: "O edital pede atestado do volume total do contrato. Isso vale?",
    resposta:
      "Não. O art. 67, § 2º, admite exigir quantidades mínimas de até 50% das parcelas de maior relevância — e essas parcelas, pelo § 1º, são só as que valem 4% ou mais do total estimado. Exigir 100% do volume, ou exigir sobre parcela que não é relevante, extrapola a lei e é impugnável.",
  },
  {
    pergunta: "Pode exigir atestado de serviço prestado só em determinada região?",
    resposta:
      "Não. O § 2º do art. 67 veda expressamente limitações de tempo e de locais específicos relativas aos atestados. Cláusula que só aceita experiência no estado ou nos últimos X anos contraria o texto da lei.",
  },
  {
    pergunta: "Podem exigir faturamento mínimo da minha empresa?",
    resposta:
      "Não. O art. 69, § 2º, veda exigência de valores mínimos de faturamento anterior e de índices de rentabilidade ou lucratividade. O que a Administração pode exigir, pelo § 4º, é capital mínimo ou patrimônio líquido de até 10% do valor estimado — um ou outro, e limitado a esse teto.",
  },
  {
    pergunta: "Minha empresa tem menos de dois anos. Fico fora?",
    resposta:
      "Não. O art. 69, § 6º, prevê que os documentos contábeis se limitem ao último exercício quando a pessoa jurídica foi constituída há menos de dois anos. Edital que exige dois exercícios sem essa ressalva elimina empresa nova sem base legal.",
  },
  {
    pergunta: "Sou obrigado a mandar amostra junto com a proposta?",
    resposta:
      "Não. Pelo art. 42, § 2º, a amostra é exigida do licitante provisoriamente vencedor, na fase de julgamento, ou depois do julgamento como condição para assinar. Exigir amostra de todos os participantes antecipa custo de produção e logística para quem talvez nem chegue a ser classificado, e o texto da lei não autoriza essa cobrança generalizada.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE.url}/habilitacao/#article`,
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
      "@id": `${SITE.url}/habilitacao/#faq`,
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
        { "@type": "ListItem", position: 2, name: "Habilitação", item: `${SITE.url}/habilitacao/` },
      ],
    },
  ],
};

export default function Habilitacao() {
  const artigos = artigosDoGuia("/habilitacao/");

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Habilitação" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Habilitação
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · Atualizado em 12 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            Perde-se mais contrato na habilitação do que no preço. E a maior
            parte dessas derrotas não é por falta de capacidade — é por certidão
            vencida, atestado no formato errado ou por uma exigência do edital
            que sequer poderia estar ali.
          </P>
          <P>
            Este guia trata das duas frentes na mesma ordem em que elas
            aparecem: o que você precisa ter em dia, e o que o edital não pode
            pedir. A segunda é a que quase ninguém usa, e é onde estão os números
            — 4%, 50%, 10% — que decidem impugnação.
          </P>

          <RespostaDireta>
            A habilitação se divide em jurídica, técnica, fiscal/social/
            trabalhista e econômico-financeira. Pela Lei 14.133, os documentos
            são exigidos apenas do licitante vencedor, e a regularidade fiscal só
            depois do julgamento. Atestado só pode ser cobrado sobre parcelas que
            valham 4% ou mais do total, em quantidade de até 50% delas, sem
            restrição de tempo ou região. E capital mínimo ou patrimônio líquido
            fica limitado a 10% do valor estimado — faturamento mínimo é vedado.
          </RespostaDireta>

          <Indice itens={SECOES} />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="quatro" titulo="As quatro habilitações">
            <Citacao fonte="Lei 14.133/2021, art. 62">
              A habilitação é a fase da licitação em que se verifica o conjunto
              de informações e documentos necessários e suficientes para
              demonstrar a capacidade do licitante de realizar o objeto da
              licitação, dividindo-se em: I - jurídica; II - técnica; III -
              fiscal, social e trabalhista; IV - econômico-financeira.
            </Citacao>
            <P>
              Guarde as duas palavras do meio: <em>necessários e suficientes</em>.
              Elas são o fundamento de quase toda impugnação de habilitação. O
              edital não pode pedir o que não é necessário para executar
              <em>aquele</em> objeto, e o que ele pede tem de bastar.
            </P>
            <Tabela
              cabecalho={["Habilitação", "O que demonstra", "Onde mais se erra"]}
              linhas={[
                ["Jurídica", "Que a empresa existe e pode assumir a obrigação", "Alteração contratual recente não averbada; objeto social que não cobre o item"],
                ["Técnica", "Que você já executou algo equivalente", "Atestado sem os quantitativos discriminados, ou emitido sem os dados do contratante"],
                ["Fiscal, social e trabalhista", "Que está regular perante os fiscos, FGTS e Justiça do Trabalho", "Certidão municipal, que é a que mais demora e a que menos gente monitora"],
                ["Econômico-financeira", "Que tem lastro para aguentar o contrato", "Balanço não registrado; índices do edital calculados errado na própria planilha"],
              ]}
            />
          </Secao>

          <Secao id="quando" titulo="Quando os documentos são pedidos — e de quem">
            <P>
              Esta é a mudança que mais alivia o dia a dia de quem disputa muito,
              e ainda pega gente de surpresa.
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 63, II e III">
              II - será exigida a apresentação dos documentos de habilitação
              apenas pelo licitante vencedor, exceto quando a fase de habilitação
              anteceder a de julgamento; III - serão exigidos os documentos
              relativos à regularidade fiscal, em qualquer caso, somente em
              momento posterior ao julgamento das propostas, e apenas do licitante
              mais bem classificado.
            </Citacao>
            <P>
              Na prática: você não monta dossiê para cada certame que disputa.
              Apresenta proposta, e o esforço documental só vem se você vencer. O
              inciso III é ainda mais forte — a regularidade fiscal fica para
              depois do julgamento <em>em qualquer caso</em>, inclusive quando as
              fases estão invertidas.
            </P>
            <P>
              Isso muda a estratégia de quem é pequeno: dá para disputar mais
              certames com a mesma estrutura administrativa. O que não muda é a
              necessidade de manter as certidões válidas — porque o prazo entre
              vencer e comprovar é curto, e ninguém consegue tirar certidão
              municipal em duas horas.
            </P>
          </Secao>

          {/*
            A captura entra aqui, e não no rodapé, porque este é o parágrafo em
            que a dor fica concreta: o leitor acabou de ler que o prazo entre
            vencer e comprovar é curto. É o instante em que "chegar ao edital
            mais cedo" deixa de ser abstração e vira o tempo de tirar a certidão.

            Sem heading próprio de propósito. O `Indice` acima promete uma lista
            fechada de seções; acrescentar um h2 comercial ao sumário da página
            faria o índice discordar do documento. O `aria-label` dá o nome
            acessível sem inventar entrada de outline — mesma forma que as
            capturas de /blog/ já usam.
          */}
          <section aria-label="Alerta diário de editais">
            <CapturaAlerta
              origem="guia/habilitacao#meio"
              chamada={{
                titulo:
                  "O prazo para renovar certidão começa quando o edital sai, não quando você vence",
                texto:
                  "Todo dia útil, os editais publicados no PNCP que combinam com o que a sua empresa vende — com objeto, órgão, valor, prazo e o link para o registro oficial. Ver o edital na publicação é o que dá tempo de pedir a certidão municipal antes de ela ser cobrada.",
              }}
              textoDoBotao="Quero receber os editais do meu ramo"
            />
          </section>

          <Secao id="corrigir" titulo="Entregou com erro: o que ainda dá para corrigir">
            <P>
              Esta é a pergunta que mais chega, e a resposta tem um contorno
              nítido na lei.
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 64">
              Após a entrega dos documentos para habilitação, não será permitida
              a substituição ou a apresentação de novos documentos, salvo em sede
              de diligência, para: I - complementação de informações acerca dos
              documentos já apresentados pelos licitantes e desde que necessária
              para apurar fatos existentes à época da abertura do certame; II -
              atualização de documentos cuja validade tenha expirado após a data
              de recebimento das propostas.
            </Citacao>
            <P>
              Traduzindo para as três situações reais que aparecem:
            </P>
            <Tabela
              cabecalho={["Situação", "Dá para resolver?", "Fundamento"]}
              linhas={[
                ["Certidão venceu depois da entrega das propostas", "Sim — cabe atualização", "Art. 64, II"],
                ["Documento entregue, mas faltou detalhar uma informação que já existia", "Sim — cabe complementação em diligência", "Art. 64, I"],
                ["Documento simplesmente não foi entregue", "Não — é apresentação de documento novo", "Art. 64, caput"],
                ["Erro material que não muda a substância (soma, digitação)", "Sim — a comissão pode sanar", "Art. 64, § 1º"],
              ]}
            />
            <P>
              A linha divisória é essa: complementar o que existe, sim; suprir o
              que faltou, não. Vale como regra de conferência antes de enviar —
              o que não foi anexado não tem conserto depois.
            </P>
          </Secao>

          <Secao id="tecnica" titulo="Qualificação técnica: os 4% e o teto de 50%">
            <P>
              Aqui estão os dois números que mais derrubam cláusula de edital, e
              a maioria dos fornecedores não sabe que existem.
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 67, §§ 1º e 2º">
              § 1º A exigência de atestados será restrita às parcelas de maior
              relevância ou valor significativo do objeto da licitação, assim
              consideradas as que tenham valor individual igual ou superior a 4%
              (quatro por cento) do valor total estimado da contratação. § 2º
              Observado o disposto no caput e no § 1º deste artigo, será admitida
              a exigência de atestados com quantidades mínimas de até 50%
              (cinquenta por cento) das parcelas de que trata o referido
              parágrafo, vedadas limitações de tempo e de locais específicos
              relativas aos atestados.
            </Citacao>
            <P>
              São três travas em dois parágrafos, e cada uma é um argumento
              independente de impugnação:
            </P>
            <Tabela
              cabecalho={["Trava", "O que significa", "Cláusula que a viola"]}
              linhas={[
                ["Só parcelas relevantes", "Item precisa valer 4% ou mais do total estimado", "Atestado exigido sobre item acessório do objeto"],
                ["Teto de 50%", "Quantidade mínima exigida não passa de metade da parcela", "Atestado do volume integral do contrato"],
                ["Sem tempo nem lugar", "Não se pode restringir por período ou região", "“Experiência nos últimos 3 anos” ou “no Estado de X”"],
              ]}
            />
            <P>
              A terceira é a mais fácil de vencer, porque a vedação está escrita
              com todas as letras e não depende de interpretação. Se o edital
              exige experiência recente ou local, transcreva o § 2º e peça a
              supressão.
            </P>
            <P>
              Sobre somar atestados de contratos diferentes para atingir o
              quantitativo: a lei não trata do tema, nem para permitir nem para
              proibir. Quem decide isso na prática é a jurisprudência dos
              tribunais de contas, e a leitura correta depende do objeto. É
              assunto de{" "}
              <a className="underline underline-offset-4" href="/jurisprudencia/">
                jurisprudência
              </a>
              , não de texto legal — e desconfie de quem afirmar categoricamente
              nos dois sentidos.
            </P>
          </Secao>

          <Secao id="economica" titulo="Qualificação econômico-financeira: o que é vedado exigir">
            <P>
              O art. 69 é curto e cheio de vedações. Ele fecha a lista do que
              pode ser pedido — o que não está ali, não cabe.
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 69, caput, I e II">
              A habilitação econômico-financeira visa a demonstrar a aptidão
              econômica do licitante para cumprir as obrigações decorrentes do
              futuro contrato, devendo ser comprovada de forma objetiva, por
              coeficientes e índices econômicos previstos no edital, devidamente
              justificados no processo licitatório, e será restrita à
              apresentação da seguinte documentação: I - balanço patrimonial,
              demonstração de resultado de exercício e demais demonstrações
              contábeis dos 2 (dois) últimos exercícios sociais; II - certidão
              negativa de feitos sobre falência expedida pelo distribuidor da
              sede do licitante.
            </Citacao>
            <P>
              E as vedações, que são o que interessa para impugnar:
            </P>
            <Tabela
              cabecalho={["Dispositivo", "O que estabelece"]}
              linhas={[
                ["§ 2º", "Vedada exigência de faturamento mínimo anterior e de índices de rentabilidade ou lucratividade"],
                ["§ 4º", "Capital mínimo ou patrimônio líquido de até 10% do valor estimado — nas compras para entrega futura e na execução de obras e serviços"],
                ["§ 5º", "Vedados índices e valores não usualmente adotados para avaliar a situação econômico-financeira"],
                ["§ 6º", "Empresa constituída há menos de 2 anos apresenta apenas o último exercício"],
              ]}
            />
            <P>
              O § 2º é o mais desrespeitado. Exigir faturamento mínimo é a forma
              clássica de excluir empresa pequena mantendo a aparência de
              critério técnico — e a lei simplesmente proíbe. O § 6º é o que
              permite empresa nova disputar, e some de muitos editais.
            </P>
            <P>
              Repare também no “devidamente justificados no processo
              licitatório” do caput: o índice não basta constar do edital, ele
              precisa ter justificativa no processo. Pedir vista dessa
              justificativa costuma revelar que ela não existe.
            </P>
          </Secao>

          <Secao id="amostra" titulo="Amostra e prova de conceito">
            <P>
              Quatro dos endereços que este site mantinha tratavam de amostra —
              sinal de quanto o tema gerava disputa. A lei atual delimita quando
              ela cabe, e o detalhe decisivo é <em>de quem</em> se exige.
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 42, § 2º">
              A Administração poderá, nos termos do edital de licitação, oferecer
              protótipo do objeto pretendido e exigir, na fase de julgamento das
              propostas, amostras do licitante provisoriamente vencedor, para
              atender a diligência ou, após o julgamento, como condição para
              firmar contrato.
            </Citacao>
            <P>
              Ou seja: amostra do <em>provisoriamente vencedor</em>, não de todos
              os participantes. Exigir amostra de todo mundo transfere custo de
              produção e logística para quem talvez nem chegue a ser classificado
              — e é exatamente o tipo de exigência que restringe a competição sem
              trazer benefício à Administração.
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 41, II">
              [A Administração poderá excepcionalmente] exigir amostra ou prova
              de conceito do bem no procedimento de pré-qualificação permanente,
              na fase de julgamento das propostas ou de lances, ou no período de
              vigência do contrato ou da ata de registro de preços, desde que
              previsto no edital da licitação e justificada a necessidade de sua
              apresentação.
            </Citacao>
            <P>
              Duas condições cumulativas outra vez: previsão no edital{" "}
              <em>e</em> justificativa da necessidade. Edital que pede amostra sem
              justificar a necessidade no processo não atende à segunda — e essa
              é a impugnação mais simples de redigir, porque você não discute
              mérito técnico, só aponta a ausência do documento.
            </P>
          </Secao>

          <Secao id="fases" titulo="A ordem das fases, e quando ela se inverte">
            <Citacao fonte="Lei 14.133/2021, art. 17, caput e § 1º">
              O processo de licitação observará as seguintes fases, em sequência:
              I - preparatória; II - de divulgação do edital de licitação; III -
              de apresentação de propostas e lances, quando for o caso; IV - de
              julgamento; V - de habilitação; VI - recursal; VII - de
              homologação. § 1º A fase referida no inciso V do caput deste artigo
              poderá, mediante ato motivado com explicitação dos benefícios
              decorrentes, anteceder as fases referidas nos incisos III e IV do
              caput deste artigo, desde que expressamente previsto no edital de
              licitação.
            </Citacao>
            <P>
              A regra é habilitação <em>depois</em> do julgamento. A inversão é
              exceção e exige duas coisas: ato motivado explicitando os
              benefícios, e previsão expressa no edital. Faltando qualquer uma, a
              inversão é atacável.
            </P>
            <P>
              Para você, a diferença é de esforço: com a ordem normal, só o
              vencedor monta a documentação; com a habilitação antecipada, todos
              montam. Por isso a inversão precisa ser justificada — ela aumenta o
              custo de participar.
            </P>
          </Secao>

          <Secao id="checklist" titulo="Checklist de quem não quer perder por documento">
            <Tabela
              cabecalho={["Item", "Cuidado prático"]}
              linhas={[
                ["Certidões federal, FGTS, trabalhista, estadual e municipal", "Alerta de vencimento no calendário. A municipal é a que mais atrasa"],
                ["Contrato social com a última alteração consolidada", "Alteração recente não averbada trava a habilitação jurídica"],
                ["Objeto social e CNAE compatíveis com o item", "Correção leva semanas na Junta Comercial — tempo que não existe com edital publicado"],
                ["Balanço patrimonial registrado", "Conferir os índices do edital na sua própria planilha antes de enviar"],
                ["Atestados com quantitativos discriminados", "Atestado genérico, sem quantidade, não comprova o que o edital pede"],
                ["Leitura do edital procurando os limites", "4% e 50% nos atestados, 10% no capital, vedação de faturamento mínimo"],
              ]}
            />
            <P>
              A última linha é a que vira dinheiro. Antes de decidir que você não
              atende ao edital, confira se a exigência que te elimina é legal —
              em boa parte dos casos não é, e o prazo de impugnação ainda está
              aberto. Como redigir esse pedido está em{" "}
              <a className="underline underline-offset-4" href="/sumulas-tcu/">
                súmulas do TCU
              </a>
              ; a regra geral, no{" "}
              <a className="underline underline-offset-4" href="/lei-14133/">
                guia da Lei 14.133
              </a>
              ; e o caminho de quem está começando, em{" "}
              <a className="underline underline-offset-4" href="/vender-para-o-governo/">
                como vender para o governo
              </a>
              .
            </P>
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes">
            <Faq itens={FAQ} />
          </Secao>

          <Secao id="fontes" titulo="Fontes">
            <P>
              Os dispositivos citados foram transcritos do texto oficial da Lei
              14.133/2021 no Planalto, conferido em 12 de agosto de 2026.
            </P>
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm" target="_blank" rel="noopener">
                  Lei nº 14.133/2021 — Planalto
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.gov.br/compras/pt-br" target="_blank" rel="noopener">
                  Compras.gov.br e SICAF
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://pesquisa.apps.tcu.gov.br/pesquisa/sumula" target="_blank" rel="noopener">
                  Súmulas do Tribunal de Contas da União
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
              Artigos sobre habilitação
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
