import type { Metadata } from "next";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { Faq, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";

const TITULO = "Alerta de licitação: os editais da sua cidade no seu e-mail";
const DESCRICAO =
  "Receba todos os dias úteis os editais abertos da sua cidade, filtrados pelo que a sua empresa vende. Sem abrir dezenas de portais. Grátis para uma cidade, sem cartão.";
const ATUALIZADO = "2026-08-12";

export const metadata: Metadata = {
  title: "Alerta de licitação: editais da sua cidade por e-mail",
  description: DESCRICAO,
  alternates: { canonical: "/alerta-de-licitacao/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO, title: TITULO, description: DESCRICAO, url: `${SITE.url}/alerta-de-licitacao/`, type: "website" },
};

const FAQ = [
  {
    pergunta: "O alerta é gratuito mesmo?",
    resposta:
      "O acompanhamento de uma cidade é gratuito e não pede cartão. Planos pagos existem para quem precisa de mais cidades, filtro por CNAE e faixa de valor, e a leitura prévia do edital com checklist de habilitação.",
  },
  {
    pergunta: "De onde vêm os editais?",
    resposta:
      "Do Portal Nacional de Contratações Públicas, a base oficial onde a divulgação é obrigatória para todos os entes. A coleta é diária e automatizada, e a metodologia completa, com as limitações conhecidas, está publicada.",
  },
  {
    pergunta: "Vocês cobrem todo o Brasil?",
    resposta:
      "Ainda não. A operação começou por seis estados do Nordeste — Pernambuco, Paraíba, Alagoas, Rio Grande do Norte, Ceará e Sergipe — porque preferimos cobertura que conseguimos revisar a uma cobertura nacional sem conferência. Se a sua cidade não estiver na lista, o cadastro registra o interesse.",
  },
  {
    pergunta: "O alerta substitui a leitura do edital?",
    resposta:
      "Não, e nem tenta. Ele te avisa que existe um edital compatível com o que você vende, com prazo e valor à vista, para você decidir se vale abrir. A decisão de disputar exige ler o edital inteiro — inclusive os anexos.",
  },
  {
    pergunta: "Como faço para sair?",
    resposta:
      "Pelo link no rodapé de qualquer e-mail, sem precisar responder nem justificar. O descadastro é imediato e registrado.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE.url}/alerta-de-licitacao/#webpage`,
      name: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      dateModified: ATUALIZADO,
      isPartOf: { "@id": `${SITE.url}/#website` },
      publisher: { "@id": `${SITE.url}/#organization` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/alerta-de-licitacao/#faq`,
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
        { "@type": "ListItem", position: 2, name: "Alerta de licitação", item: `${SITE.url}/alerta-de-licitacao/` },
      ],
    },
  ],
};

export default function AlertaDeLicitacao() {
  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Alerta de licitação" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Os editais da sua cidade, no seu e-mail, todo dia útil
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">
          Sem abrir dezenas de portais para descobrir que não tinha nada do seu
          ramo. Grátis para uma cidade, sem cartão.
        </p>

        <div className="mt-8">
          <CapturaAlerta origem="/alerta-de-licitacao/" />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="problema" titulo="O problema não é falta de edital. É dispersão.">
            <P>
              A publicação é centralizada — todo edital tem que aparecer no
              Portal Nacional de Contratações Públicas. A disputa, não: cada
              órgão conduz o certame no sistema que já usa.
            </P>
            <P>
              Medimos isso. Numa amostra de 500 editais abertos em cinco estados,
              coletada em agosto de 2026, encontramos{" "}
              <strong>54 sistemas diferentes</strong> publicando — e o maior
              deles não chegava a 14% do total. Não existe “o portal” onde ficar
              de olho.
            </P>
            <Tabela
              cabecalho={["Como quase todo mundo faz", "O que acontece"]}
              linhas={[
                ["Abrir alguns portais quando lembra", "O edital que interessava fechou na terça"],
                ["Buscar por palavra-chave", "“Aquisição de gêneros alimentícios” não aparece para quem buscou “merenda escolar”"],
                ["Assinar avisos de um portal só", "Fica cego para os outros 53"],
                ["Pedir para alguém olhar", "Vira meio expediente por semana de trabalho manual"],
              ]}
            />
          </Secao>

          <Secao id="como" titulo="O que o alerta faz">
            <P>
              Todo dia útil de manhã, você recebe os editais abertos da sua
              cidade que combinam com o que a sua empresa vende. Cada linha traz
              o que é, quem está comprando, quanto vale, quando fecha e o link
              direto para o registro oficial.
            </P>
            <Tabela
              cabecalho={["No e-mail você vê", "Para quê"]}
              linhas={[
                ["Objeto da contratação", "Decidir em dois segundos se é do seu ramo"],
                ["Órgão comprador", "Reconhecer quem você já atendeu"],
                ["Valor estimado", "Saber se cabe no seu porte antes de abrir"],
                ["Dias até o encerramento", "Não descobrir na véspera"],
                ["Link para o edital no PNCP", "Ir direto à fonte, sem intermediário"],
              ]}
            />
            <P>
              Quando o valor não foi informado pelo órgão, o e-mail diz isso — em
              vez de exibir zero como se fosse preço. E quando encontramos
              incoerência na fonte, como valor com erro de digitação, o alerta
              sinaliza em vez de repassar o número em silêncio.
            </P>
          </Secao>

          <Secao id="prazo" titulo="Por que a frequência diária importa">
            <P>
              Prazo de licitação é curto e não espera. No conjunto que coletamos,
              das contratações com propostas abertas naquele momento,{" "}
              <strong>metade encerrava em até sete dias</strong> — e centenas
              fechavam em 24 horas.
            </P>
            <RespostaDireta>
              Quem confere os portais uma vez por semana perde, por construção, a
              maior parte do que estava aberto. Não por falta de capacidade
              técnica — por calendário.
            </RespostaDireta>
          </Secao>

          <Secao id="cobertura" titulo="Onde já funciona">
            <P>
              A operação começou por seis estados: Pernambuco, Paraíba, Alagoas,
              Rio Grande do Norte, Ceará e Sergipe. Na última coleta eram{" "}
              <strong>639 municípios</strong> com pelo menos um edital aberto.
            </P>
            <P>
              A cobertura é parcial de propósito. Preferimos seis estados
              coletados e revisados a uma cobertura nacional que não
              conseguíssemos conferir — e a{" "}
              <a className="underline underline-offset-4" href="/metodologia/">
                metodologia
              </a>{" "}
              publica as limitações em vez de escondê-las. Se a sua cidade ainda
              não está coberta, o cadastro registra o interesse e ele pesa na
              ordem de expansão.
            </P>
          </Secao>

          <Secao id="nao-e" titulo="O que este alerta não é">
            <P>
              Ele não lê o edital por você, não garante habilitação e não diz se
              você vai ganhar. Avisa que existe algo compatível, com prazo e
              valor à vista, para a decisão de abrir ser sua e ser rápida.
            </P>
            <P>
              Também não é consultoria jurídica. O que cada exigência de edital
              significa está nos guias — comece por{" "}
              <a className="underline underline-offset-4" href="/habilitacao/">
                habilitação
              </a>{" "}
              e{" "}
              <a className="underline underline-offset-4" href="/vender-para-o-governo/">
                como vender para o governo
              </a>
              . Os limites do serviço estão no{" "}
              <a className="underline underline-offset-4" href="/aviso-legal/">
                aviso legal
              </a>
              .
            </P>
          </Secao>

          <Secao id="cadastro" titulo="Comece pela sua cidade">
            <P>
              Uma cidade, de graça, sem cartão. Se depois você precisar de mais
              cidades, filtro por CNAE e faixa de valor, ou da leitura prévia com
              checklist de habilitação, existem planos para isso — mas só faz
              sentido depois que o alerta provar valor para você.
            </P>
            <CapturaAlerta origem="/alerta-de-licitacao/#cadastro" />
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes">
            <Faq itens={FAQ} />
          </Secao>
        </div>

        <p className="mt-12 text-sm leading-relaxed text-[var(--muted)]">
          Os dados vêm do Portal Nacional de Contratações Públicas. Em qualquer
          divergência, prevalece o edital. Leia o{" "}
          <a className="underline underline-offset-4" href="/aviso-legal/">
            aviso legal
          </a>{" "}
          e a{" "}
          <a className="underline underline-offset-4" href="/metodologia/">
            metodologia
          </a>
          .
        </p>
      </main>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
