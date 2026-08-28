import type { Metadata } from "next";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";

const TITULO = "Aviso legal";
const DESCRICAO =
  "O que este site entrega e o que não entrega. É informação operacional sobre licitações, não parecer jurídico: a decisão de disputar é da empresa.";
const ATUALIZADO = "2026-08-12";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/aviso-legal/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO, title: TITULO, description: DESCRICAO, url: `${SITE.url}/aviso-legal/`, type: "website" },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE.url}/aviso-legal/#webpage`,
      name: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      dateModified: ATUALIZADO,
      isPartOf: { "@id": `${SITE.url}/#website` },
      publisher: { "@id": `${SITE.url}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Aviso legal", item: `${SITE.url}/aviso-legal/` },
      ],
    },
  ],
};

export default function AvisoLegal() {
  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Aviso legal" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Aviso legal
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Atualizado em 12 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <RespostaDireta>
            O que este site publica é informação operacional sobre licitações
            públicas. Não é parecer jurídico, não substitui advogado e não
            constitui recomendação de participar ou deixar de participar de
            nenhum certame. A decisão, o risco e a responsabilidade pela proposta
            são sempre da empresa licitante.
          </RespostaDireta>
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="natureza" titulo="A natureza do que entregamos">
            <P>
              Este site explica como funcionam as licitações públicas, o que a
              legislação exige e o que os tribunais de contas já decidiram. O
              objetivo é que o fornecedor entenda o procedimento e reconheça,
              sozinho, uma exigência ilegal quando ela aparecer no edital.
            </P>
            <P>
              Isso é diferente de análise jurídica. Analisar um edital concreto,
              redigir impugnação ou recurso e defender a empresa em processo
              sancionatório exigem exame do caso específico e responsabilidade
              profissional — e nada disso é feito aqui.
            </P>
            <Tabela
              cabecalho={["O que fazemos", "O que não fazemos"]}
              linhas={[
                ["Explicar a regra e citar a fonte oficial", "Interpretar o seu edital ou o seu contrato"],
                ["Mostrar o que a lei permite e proíbe exigir", "Afirmar que a sua empresa atende ou não atende"],
                ["Reunir e organizar dados públicos de contratações", "Garantir que os dados estejam completos ou atualizados na fonte"],
                ["Indicar prazos e procedimentos previstos em norma", "Controlar o seu prazo ou protocolar peça por você"],
                ["Apontar riscos típicos de um tipo de cláusula", "Emitir parecer sobre a viabilidade de um negócio"],
              ]}
            />
          </Secao>

          <Secao id="produto" titulo="Sobre o produto de triagem de editais">
            <P>
              O serviço de alerta e triagem entrega seleção e organização de
              editais publicados no Portal Nacional de Contratações Públicas,
              filtrados por critérios que o próprio assinante define. É trabalho
              operacional de garimpo e leitura prévia.
            </P>
            <P>
              O que ele não é: recomendação de investimento, promessa de
              resultado, garantia de que a empresa será habilitada, nem análise
              jurídica de risco contratual. Nenhum alerta substitui a leitura
              integral do edital antes de decidir disputar.
            </P>
            <P>
              A metodologia completa da coleta, com as limitações conhecidas,
              está publicada em{" "}
              <a className="underline underline-offset-4" href="/metodologia/">
                metodologia
              </a>{" "}
              — inclusive o que não é coberto.
            </P>
          </Secao>

          <Secao id="prazos" titulo="Prazos, valores e o que prevalece">
            <P>
              Datas, valores estimados e prazos exibidos aqui vêm da base pública
              do PNCP, tal como o órgão publicou. Eles podem estar
              desatualizados, incompletos ou conter erro de digitação da própria
              fonte — encontramos casos assim e os sinalizamos, mas não temos
              como corrigi-los.
            </P>
            <RespostaDireta>
              Em qualquer divergência entre o que este site mostra e o que consta
              no edital ou no portal oficial, prevalece o edital. Confira sempre
              o prazo e o valor na fonte antes de agir.
            </RespostaDireta>
          </Secao>

          <Secao id="atualizacao" titulo="Conteúdo tem data, e norma muda">
            <P>
              Cada guia traz a data em que foi atualizado. Legislação e
              jurisprudência mudam: um enunciado pode ser revisto, um decreto
              revogado, um entendimento superado depois da publicação do texto.
            </P>
            <P>
              Por isso todo guia indica a fonte oficial e ensina a conferir a
              vigência ali. Antes de usar qualquer citação daqui em peça formal,
              confirme o texto e o status na fonte primária.
            </P>
          </Secao>

          <Secao id="responsabilidade" titulo="Limitação de responsabilidade">
            <P>
              O conteúdo é oferecido no estado em que se encontra, para fins
              informativos. Não assumimos responsabilidade por decisão de
              participar de certame, por proposta apresentada, por
              desclassificação, por perda de prazo, nem por prejuízo decorrente
              do uso das informações aqui publicadas.
            </P>
            <P>
              Isso não é uma tentativa de fugir de responsabilidade pelo que
              escrevemos: erramos e corrigimos, e a correção é registrada. É o
              reconhecimento de um limite real — quem conhece o seu edital, o seu
              custo e a sua capacidade de execução é você.
            </P>
          </Secao>

          <Secao id="erros" titulo="Encontrou um erro?">
            <P>
              Avise. Conteúdo jurídico errado circula e causa dano, e correção
              silenciosa não resolve — quem leu a versão errada precisa saber.
              Erros apontados são verificados na fonte e corrigidos com registro
              da alteração.
            </P>
            <P>
              O canal de contato está em{" "}
              <a className="underline underline-offset-4" href="/sobre/">
                sobre
              </a>
              .
            </P>
          </Secao>

          <Secao id="acervo" titulo="Sobre o acervo anterior deste domínio">
            <P>
              Este domínio publicou conteúdo sobre licitações entre 2016 e 2025,
              sob outra autoria. A aquisição foi do domínio, não do conteúdo:
              nenhum texto do acervo anterior é republicado aqui.
            </P>
            <P>
              Os endereços antigos foram preservados e redirecionam para o guia
              atual do mesmo assunto, para que quem chegue por um link de anos
              atrás encontre material equivalente em vez de uma página de erro. A
              história completa está em{" "}
              <a className="underline underline-offset-4" href="/sobre/">
                sobre
              </a>
              .
            </P>
          </Secao>
        </div>

        <p className="mt-12 text-sm leading-relaxed text-[var(--muted)]">
          Em caso de dúvida sobre um certame específico, procure um advogado com
          atuação em direito administrativo. Este aviso integra as condições de
          uso deste site.
        </p>
      </main>

      {/* Sem a oferta do Workbook: página legal, mesmo motivo. */}
      <RodapeSite oferta={false} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
