import type { Metadata } from "next";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { COBERTURA } from "@/lib/cobertura";
import { Faq, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { DIAS_DE_TESTE } from "@/lib/assinatura/teste";

const TITULO = "Alerta de licitação: os editais da sua cidade no seu e-mail";
const DESCRICAO =
  "Nos dias úteis, os editais abertos que combinam com o que a sua empresa vende. Sem abrir dezenas de portais. Teste 14 dias, sem cartão.";
const ATUALIZADO = "2026-08-25";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/alerta-de-licitacao/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO, title: TITULO, description: DESCRICAO, url: `${SITE.url}/alerta-de-licitacao/`, type: "website" },
};

const FAQ = [
  {
    pergunta: "Quanto custa para experimentar?",
    resposta:
      "Nada, por 14 dias, e não pedimos cartão. O teste roda no plano Leve, o mesmo que custa R$ 59 por mês depois: até três recortes, nota de aderência e o resumo nos dias úteis. No fim do prazo o acesso para sozinho — como não há cartão cadastrado, não há como cobrar sem você pedir.",
  },
  {
    pergunta: "O alerta gratuito diário acabou mesmo?",
    resposta:
      "Acabou em 25 de agosto de 2026. Ele mandava os editais abertos de uma cidade sem comparar com o perfil da empresa, e era, na prática, uma versão pior do produto pago — de graça e para sempre. Em vez de manter os dois, preferimos abrir o produto inteiro por 14 dias. Quem estava cadastrado recebeu o convite por e-mail.",
  },
  {
    pergunta: "De onde vêm os editais?",
    resposta:
      "Do Portal Nacional de Contratações Públicas, a base oficial onde a divulgação é obrigatória para todos os entes. A coleta é diária e automatizada, e a metodologia completa, com as limitações conhecidas, está publicada.",
  },
  {
    pergunta: "Vocês cobrem todo o Brasil?",
    resposta:
      "Sim — as 27 unidades da federação, coletadas todo dia. A operação começou por seis estados do Nordeste, para ser revisada antes de crescer, e hoje pede o país inteiro. Quando um estado não vem completo, o dia é classificado como parcial e o relatório diz qual faltou: ausência aqui não significa ausência no PNCP.",
  },
  {
    pergunta: "O resumo substitui a leitura do edital?",
    resposta:
      "Não, e nem tenta. Ele avisa que existe um edital compatível com o que você vende, com prazo e valor à vista, para você decidir se vale abrir. No plano Leve, que é onde o teste roda, não abrimos o arquivo: a decisão de disputar exige ler o edital inteiro, inclusive os anexos.",
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
          Os editais do seu ramo, no seu e-mail, nos dias úteis
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">
          Sem abrir dezenas de portais para descobrir que não tinha nada do seu
          ramo. Teste {DIAS_DE_TESTE} dias, sem cartão, e o acesso para sozinho
          no fim.
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

          <Secao id="como" titulo="O que chega no e-mail">
            <P>
              Nos dias úteis de manhã, você recebe os editais abertos dos
              recortes que escolheu — até três: uma cidade, um estado ou o Brasil
              — que combinam com o que a sua empresa vende. Cada linha traz o que
              é, o quanto combina com o seu perfil, quem está comprando, quanto
              vale, quando fecha e o link direto para o registro oficial.
            </P>
            <P>
              Dia sem edital novo é dia sem e-mail. É deliberado: mensagem
              diária que às vezes não tem nada dentro treina o leitor a não abrir
              a que tem.
            </P>
            <Tabela
              cabecalho={["No e-mail você vê", "Para quê"]}
              linhas={[
                ["Objeto da contratação", "Decidir em dois segundos se é do seu ramo"],
                ["Aderência, de 0 a 100", "Ler de cima para baixo e parar quando quiser"],
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
              No país inteiro — {COBERTURA.extensao}. Na coleta de{" "}
              {COBERTURA.dataPorExtenso} eram{" "}
              <strong>{COBERTURA.municipios} municípios</strong> com pelo menos
              um edital.
            </P>
            <P>
              A operação começou por seis estados do Nordeste, coletados e
              revisados antes de crescer, e só depois abriu para as demais UFs.
              O que não mudou foi a conferência: quando um estado não vem
              inteiro, o dia é classificado como parcial e o relatório diz qual
              faltou, em vez de somar o que sobrou como se fosse o total. A{" "}
              <a className="underline underline-offset-4" href="/metodologia/">
                metodologia
              </a>{" "}
              publica as limitações em vez de escondê-las.
            </P>
          </Secao>

          <Secao id="nao-e" titulo="O que o teste não é">
            <P>
              Ele não lê o edital por você — no plano Leve, que é onde o teste
              roda, não abrimos o arquivo. Não garante habilitação e não diz se
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

          <Secao id="cadastro" titulo="Comece o teste">
            <P>
              {DIAS_DE_TESTE} dias, sem cartão. Deixe o e-mail e mandamos o
              convite; o teste começa quando você cadastrar a empresa e escolher
              os recortes, que é o que permite comparar cada edital com o que
              você vende.
            </P>
            <P>
              Se depois você precisar da leitura prévia do documento, com as
              exigências de habilitação extraídas do texto, existem planos para
              isso — mas só faz sentido depois que o resumo provar valor para
              você.
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
