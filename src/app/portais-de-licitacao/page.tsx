import type { Metadata } from "next";
import { AUTHOR, SITE } from "@/lib/site";
import { Citacao, Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { artigosDoGuia } from "@/lib/blog";

const TITULO = "Portais de licitação: onde o edital é publicado e onde a disputa acontece";
const DESCRICAO =
  "O PNCP centraliza a publicação, mas a disputa acontece em outro lugar. Medimos 500 editais abertos em 5 estados e encontramos 54 sistemas diferentes. Como descobrir em qual portal cada certame corre.";
const ATUALIZADO = "2026-08-12";

export const metadata: Metadata = {
  title: "Portais de licitação: onde publicam e onde se disputa",
  description: DESCRICAO,
  alternates: { canonical: "/portais-de-licitacao/" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/portais-de-licitacao/`,
    type: "article",
  },
};

const SECOES = [
  { id: "regra", titulo: "A regra que explica toda a confusão" },
  { id: "pncp", titulo: "O que o PNCP é — e o que ele não é" },
  { id: "quantos", titulo: "Quantos portais existem, de verdade" },
  { id: "federal", titulo: "O caso federal: Compras.gov.br e SICAF" },
  { id: "descobrir", titulo: "Como descobrir em qual portal disputar um edital" },
  { id: "conta", titulo: "A conta que quase ninguém faz" },
];

/**
 * Medição própria, não estimativa: 500 editais com propostas abertas coletados
 * da API pública do PNCP em 12/08/2026, em PE, CE, SP, MG e RS. O campo
 * `usuarioNome` identifica o sistema que publicou. Números conferíveis por
 * qualquer um que repita a consulta.
 */
const SISTEMAS: string[][] = [
  ["Licitar Digital", "13,4%", "67"],
  ["Compras.gov.br", "11,6%", "58"],
  ["ECustomize", "9,4%", "47"],
  ["UMUPP", "8,6%", "43"],
  ["Bolsa Nacional de Compras (BNC)", "7,6%", "38"],
  ["Fiorilli Software", "5,8%", "29"],
  ["GovernançaBrasil", "5,2%", "26"],
  ["BLL Compras", "3,4%", "17"],
  ["Outros 46 sistemas somados", "35,0%", "175"],
];

const FAQ = [
  {
    pergunta: "Se tudo é publicado no PNCP, por que preciso me cadastrar em outros portais?",
    resposta:
      "Porque o PNCP centraliza a divulgação, não a disputa. O art. 174 da Lei 14.133 cria o PNCP para a divulgação centralizada e obrigatória dos atos, e prevê a realização das contratações nele como faculdade. Na prática, a maioria dos órgãos conduz o certame no próprio sistema, e é lá que você precisa estar cadastrado para dar lance.",
  },
  {
    pergunta: "Existe um cadastro único que sirva para tudo?",
    resposta:
      "Não. O SICAF unifica o cadastro no âmbito federal, e é aceito por muitos órgãos de outras esferas por remissão no edital. Mas estados, municípios e os portais privados mantêm cadastros próprios. Quem diz qual cadastro vale naquele certame é o edital.",
  },
  {
    pergunta: "Quantos portais eu preciso acompanhar?",
    resposta:
      "Depende de onde você quer vender, e o número é maior do que parece. Numa amostra de 500 editais abertos em cinco estados, medida em agosto de 2026, encontramos 54 sistemas distintos publicando. Um fornecedor regional que atenda a alguns municípios já esbarra em meia dúzia.",
  },
  {
    pergunta: "É obrigatório publicar em Diário Oficial também?",
    resposta:
      "Sim. Além do inteiro teor no PNCP, o § 1º do art. 54 exige a publicação de extrato do edital no Diário Oficial do ente e em jornal diário de grande circulação. O que vale para conferir o conteúdo completo, porém, é o PNCP.",
  },
  {
    pergunta: "Portal privado pode cobrar para eu participar?",
    resposta:
      "Os portais privados operam sob modelos comerciais próprios, e as condições variam entre plataformas — cadastro, taxa por certame, assinatura. Confira as condições no próprio portal indicado pelo edital antes de disputar, porque isso entra no seu custo de participação e afeta a formação do preço.",
  },
  {
    pergunta: "O edital não diz em qual portal é a sessão. E agora?",
    resposta:
      "Procure o link para o sistema de origem no registro do PNCP — na amostra que medimos, 67% dos editais traziam esse link. Se não houver, o próprio edital indica o endereço da sessão em cláusula específica; e, na falta dos dois, cabe pedido de esclarecimento ao órgão, dentro do prazo do edital.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE.url}/portais-de-licitacao/#article`,
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
      "@id": `${SITE.url}/portais-de-licitacao/#faq`,
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
        { "@type": "ListItem", position: 2, name: "Portais de licitação", item: `${SITE.url}/portais-de-licitacao/` },
      ],
    },
  ],
};

export default function PortaisDeLicitacao() {
  const artigos = artigosDoGuia("/portais-de-licitacao/");

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Portais de licitação" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Portais de licitação
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · Atualizado em 12 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            A dúvida chega sempre igual: “se agora tudo é publicado no PNCP, por
            que continuo tendo que me cadastrar em um monte de portal?”. A
            resposta está numa distinção que a lei faz e quase ninguém percebe —
            e ela vale dinheiro, porque define quantos sistemas você precisa
            acompanhar para não perder edital do seu ramo.
          </P>
          <P>
            Para escrever este guia eu não fui atrás de lista pronta. Coletei 500
            editais com propostas abertas direto da API pública do PNCP, em cinco
            estados, e contei quantos sistemas diferentes publicaram. O número
            surpreende.
          </P>

          <RespostaDireta>
            A publicação é centralizada e obrigatória no PNCP; a realização do
            certame nele é facultativa. Por isso o edital aparece num lugar só, e
            a disputa acontece espalhada. Na nossa medição de 500 editais abertos
            em PE, CE, SP, MG e RS, 54 sistemas distintos publicaram — nenhum
            deles com mais de 14% do total. Não existe “o portal” das licitações.
          </RespostaDireta>

          <Indice itens={SECOES} />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="regra" titulo="A regra que explica toda a confusão">
            <P>
              Está em dois incisos do artigo que criou o PNCP. Leia com atenção
              o contraste entre eles:
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 174, caput, I e II">
              É criado o Portal Nacional de Contratações Públicas (PNCP), sítio
              eletrônico oficial destinado à: I - divulgação centralizada e
              obrigatória dos atos exigidos por esta Lei; II - realização
              facultativa das contratações pelos órgãos e entidades dos Poderes
              Executivo, Legislativo e Judiciário de todos os entes federativos.
            </Citacao>
            <P>
              Divulgação: <strong>obrigatória</strong>. Realização:{" "}
              <strong>facultativa</strong>. Toda a confusão sobre portais nasce
              dessa única palavra de diferença. O órgão é obrigado a publicar no
              PNCP, mas pode conduzir a sessão onde quiser — e a maioria conduz
              no sistema que já usa.
            </P>
            <P>
              A publicidade do edital tem regra própria, e ela também não elimina
              os outros canais:
            </P>
            <Citacao fonte="Lei 14.133/2021, art. 54, caput e § 1º">
              A publicidade do edital de licitação será realizada mediante
              divulgação e manutenção do inteiro teor do ato convocatório e de
              seus anexos no Portal Nacional de Contratações Públicas (PNCP). §
              1º Sem prejuízo do disposto no caput, é obrigatória a publicação de
              extrato do edital no Diário Oficial da União, do Estado, do
              Distrito Federal ou do Município [...] bem como em jornal diário de
              grande circulação.
            </Citacao>
            <P>
              Repare na diferença de conteúdo: no PNCP vai o{" "}
              <em>inteiro teor</em>; no Diário Oficial, só o <em>extrato</em>.
              Quem acompanha licitação por Diário Oficial está lendo resumo.
            </P>
          </Secao>

          <Secao id="pncp" titulo="O que o PNCP é — e o que ele não é">
            <Tabela
              cabecalho={["O PNCP é", "O PNCP não é"]}
              linhas={[
                ["O lugar onde a existência do certame se torna oficial", "O lugar onde a maioria das disputas acontece"],
                ["A fonte do inteiro teor do edital e dos anexos", "Um cadastro único que te habilita em todo lugar"],
                ["Uma base pública consultável, com API aberta", "Uma ferramenta de triagem: não filtra por perfil da sua empresa"],
                ["Obrigatório para todos os entes federativos", "Substituto do Diário Oficial, que segue obrigatório em extrato"],
              ]}
            />
            <P>
              A terceira linha é a que mais frustra quem chega. O PNCP entrega
              tudo o que existe, sem ordenar por relevância para você. Encontrar
              os três editais do seu CNAE no seu raio de atuação, entre milhares
              publicados por dia, é trabalho que o portal oficial não faz — e não
              se propõe a fazer.
            </P>
          </Secao>

          <Secao id="quantos" titulo="Quantos portais existem, de verdade">
            <P>
              Aqui está o dado que eu não encontrei pronto em lugar nenhum, e por
              isso fui medir. Em 12 de agosto de 2026, coletei da API pública do
              PNCP 500 editais com recebimento de propostas aberto, em cinco
              estados de regiões diferentes, e agrupei pelo sistema que publicou
              cada um.
            </P>
            <Tabela
              cabecalho={["Sistema que publicou", "Participação", "Editais na amostra"]}
              linhas={SISTEMAS}
            />
            <P>
              <strong>54 sistemas distintos</strong> numa amostra de 500 editais.
              O maior deles não chega a 14%. E a cauda é o que assusta: 46
              sistemas somam mais de um terço de tudo — muitos deles empresas de
              software municipal que atendem a um punhado de prefeituras cada.
            </P>
            <P>
              Isso desmonta a pergunta “qual é o melhor portal para se
              cadastrar?”. Não existe um portal que cubra o mercado. Existe o
              portal que o órgão que você quer atender usa.
            </P>
            <P>
              Uma ressalva honesta sobre este número: é uma amostra de cinco
              estados num dia. A ordem dos primeiros colocados muda conforme a
              região e o período, e a lista completa é maior que 54 no país
              inteiro. O que a medição estabelece com segurança não é o ranking —
              é a ordem de grandeza da dispersão.
            </P>
          </Secao>

          {/*
            Logo depois da medição, que é onde o leitor para de achar que existe
            "o portal" e passa a enxergar o tamanho da vigilância manual. O 54 é
            o número apurado neste próprio guia — não é dado de fora.

            Sem heading próprio: o `Indice` promete uma lista fechada de seções,
            e um h2 comercial faria o sumário discordar do documento.
          */}
          <section aria-label="Alerta diário de editais">
            <CapturaAlerta
              origem="guia/portais-de-licitacao#meio"
              chamada={{
                titulo: "São 54 sistemas para vigiar, ou um e-mail por dia útil",
                texto:
                  "A publicação é a parte centralizada, e dá para usar isso a favor. Todo dia útil, os editais publicados no PNCP que combinam com o que a sua empresa vende — com objeto, órgão, valor, prazo e o link para o registro oficial. Você continua disputando no portal que o edital indicar; o que sai da rotina é abrir todos eles para descobrir se tem algo seu.",
              }}
              textoDoBotao="Quero receber os editais do meu ramo"
            />
          </section>

          <Secao id="federal" titulo="O caso federal: Compras.gov.br e SICAF">
            <P>
              No âmbito federal a coisa é mais simples, e vale começar por aí se
              você está montando operação do zero. O Compras.gov.br concentra a
              condução dos certames dos órgãos federais, e o cadastro de
              fornecedor é o SICAF, acessado com conta gov.br do representante
              legal.
            </P>
            <P>
              Dois pontos práticos. O cadastro é gratuito e não tem intermediário
              obrigatório — se alguém cobra para “credenciar sua empresa no
              governo federal”, está cobrando por tarefa que você faz sozinho. E
              o SICAF é aceito por muitos órgãos estaduais e municipais quando o
              edital assim prevê, o que economiza documentação repetida.
            </P>
            <P>
              O passo a passo do cadastro, com o que costuma travar em cada
              etapa, está no guia de{" "}
              <a className="underline underline-offset-4" href="/vender-para-o-governo/">
                como vender para o governo
              </a>
              . O que o SICAF substitui e o que ele não substitui na habilitação
              está em{" "}
              <a className="underline underline-offset-4" href="/habilitacao/">
                habilitação
              </a>
              .
            </P>
          </Secao>

          <Secao id="descobrir" titulo="Como descobrir em qual portal disputar um edital">
            <P>
              Você achou o edital no PNCP e quer dar lance. O caminho é este, na
              ordem:
            </P>
            <Tabela
              cabecalho={["Passo", "Onde olhar", "Observação"]}
              linhas={[
                ["1", "Link para o sistema de origem, no próprio registro do PNCP", "Na amostra medida, 67% dos editais traziam esse link"],
                ["2", "Cláusula do edital que indica o endereço da sessão", "Costuma estar nas disposições iniciais, junto de data e hora"],
                ["3", "Site do órgão comprador", "Prefeituras costumam manter página fixa com o portal que usam"],
                ["4", "Pedido de esclarecimento ao órgão", "Dentro do prazo do edital — e a resposta vale para todos os licitantes"],
              ]}
            />
            <P>
              O passo 1 resolve dois terços dos casos e é o mais ignorado. Os
              outros 33% exigem leitura do edital — e é bom lembrar que o prazo
              de cadastro no portal indicado corre junto com o prazo da proposta.
              Descobrir na véspera que o cadastro leva três dias úteis é a forma
              mais banal de perder um certame que você ganharia.
            </P>
          </Secao>

          <Secao id="conta" titulo="A conta que quase ninguém faz">
            <P>
              Junte os números deste guia e olhe para a sua rotina. Se você
              atende a uma região com, digamos, quinze municípios, é provável que
              esteja diante de meia dúzia de sistemas diferentes, cada um com
              cadastro próprio, interface própria e regra própria de aviso.
            </P>
            <P>
              Acompanhar isso à mão significa abrir vários sites por dia,
              procurar por palavra-chave em cada um, e ainda assim depender de o
              termo do edital coincidir com o termo que você buscou — objeto
              descrito como “aquisição de gêneros alimentícios” não aparece para
              quem procurou por “merenda escolar”.
            </P>
            <P>
              É por isso que quem vende com constância acaba trocando a busca
              manual por monitoramento: o edital chega até você, filtrado pelo
              seu CNAE, pela sua região e pela sua faixa de valor, em vez de você
              ir atrás dele em 54 lugares. A decisão de fazer isso à mão ou não é
              sua — o que este guia entrega é o tamanho real do problema, medido
              e não estimado.
            </P>
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes">
            <Faq itens={FAQ} />
          </Secao>

          <Secao id="fontes" titulo="Fontes e método">
            <P>
              Os dispositivos legais foram transcritos do texto oficial da Lei
              14.133/2021 no Planalto, conferido em 12 de agosto de 2026.
            </P>
            <P>
              Os números de dispersão de portais são medição própria: 500 editais
              com recebimento de propostas aberto, coletados da API pública de
              consulta do PNCP em 12 de agosto de 2026, nas UFs PE, CE, SP, MG e
              RS, agrupados pelo campo que identifica o sistema publicador.
              Qualquer pessoa pode repetir a consulta e conferir.
            </P>
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm" target="_blank" rel="noopener">
                  Lei nº 14.133/2021 — Planalto
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.pncp.gov.br/" target="_blank" rel="noopener">
                  Portal Nacional de Contratações Públicas
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://pncp.gov.br/api/consulta/swagger-ui/index.html" target="_blank" rel="noopener">
                  API pública de consulta do PNCP — documentação
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.gov.br/compras/pt-br" target="_blank" rel="noopener">
                  Compras.gov.br e SICAF
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
              Artigos sobre portais e publicação de editais
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
