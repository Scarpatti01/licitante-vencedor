import type { Metadata } from "next";
import Link from "next/link";
import { CONTATO, SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";

/**
 * Os termos de uso.
 *
 * ## O que estes termos evitam prometer
 *
 * A tentação num documento destes é blindar o fornecedor e prometer o mundo ao
 * cliente. As duas coisas envelhecem mal. O que estes termos fazem é declarar,
 * em linguagem que o cliente entende, exatamente onde termina a nossa obrigação
 * e onde começa a decisão dele:
 *
 * - Entregamos **triagem e leitura**, não vitória em certame. Nenhum resultado é
 *   prometido, e prometer seria tanto desonesto quanto juridicamente ruim.
 * - A fonte é o **PNCP**, que sai do ar e publica com atraso. Isso é limite da
 *   fonte, não defeito nosso — mas o cliente precisa saber que existe, porque
 *   afeta o que ele recebe.
 * - O **edital publicado prevalece** sobre qualquer resumo nosso. Se divergirem,
 *   vale o edital, e dizemos isso antes de o cliente descobrir sozinho.
 *
 * ## Sem cláusula de foro abusiva
 *
 * O foro é o do domicílio do cliente quando ele for consumidor, porque o art.
 * 51, IV do CDC derruba cláusula que dificulte a defesa dele — e cláusula
 * derrubada em juízo não protege ninguém, só dá trabalho.
 */

const TITULO = "Termos de uso";
const DESCRICAO =
  "As regras do serviço em português claro: o que entregamos, o que não prometemos, como é a cobrança e o cancelamento, e o que prevalece quando o resumo diverge do edital.";
const ATUALIZADO = "2026-08-15";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/termos/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO,
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/termos/`,
    type: "website",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE.url}/termos/#webpage`,
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
        { "@type": "ListItem", position: 2, name: "Termos de uso", item: `${SITE.url}/termos/` },
      ],
    },
  ],
};

export default function Termos() {
  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Termos de uso" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Termos de uso
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Atualizado em 15 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <RespostaDireta>
            Entregamos triagem e leitura de editais publicados no PNCP:
            selecionamos o que é compatível com o perfil da sua empresa e
            explicamos o que cada um exige.{" "}
            <strong>Não prometemos que você vencerá certame algum</strong>, não
            damos parecer jurídico e não participamos da licitação por você.
            Quando o nosso resumo divergir do edital, vale o edital.
          </RespostaDireta>
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="quem" titulo="Quem contrata e quem fornece">
            <P>
              Estes termos regem o uso do {SITE.name} ({SITE.url}), fornecido por{" "}
              {CONTATO.controlador}. Usar o site ou o serviço significa concordar
              com eles.
            </P>
            <P>
              O serviço é destinado a empresas que fornecem ou pretendem fornecer
              à Administração Pública. Para contratar é preciso ser maior de 18
              anos e ter poderes para representar a empresa cadastrada.
            </P>
          </Secao>

          <Secao id="entregamos" titulo="O que entregamos — e o que não">
            <Tabela
              cabecalho={["Entregamos", "Não entregamos"]}
              linhas={[
                [
                  "Varredura diária das publicações do PNCP",
                  "Garantia de que nenhum edital deixará de ser captado",
                ],
                [
                  "Triagem por CNAE, porte, região e faixa de valor",
                  "Decisão sobre participar — ela é sua",
                ],
                [
                  "Leitura do edital com exigências, prazos e riscos em destaque",
                  "Parecer jurídico ou consultoria advocatícia",
                ],
                [
                  "Comparação da habilitação exigida com o que você declarou ter",
                  "Emissão, renovação ou validação de certidões",
                ],
                [
                  "Alerta por e-mail quando surge edital compatível",
                  "Cadastro, proposta ou lance em portal de disputa",
                ],
                [
                  "Indicação da fonte de cada informação",
                  "Promessa de vitória, pontuação ou classificação",
                ],
              ]}
            />
            <P>
              A coluna da direita não é modéstia: é o limite do que um serviço de
              informação pode honestamente prometer. Quem promete resultado em
              licitação está vendendo outra coisa.
            </P>
          </Secao>

          <Secao id="fonte" titulo="A fonte, e os limites que ela impõe">
            <P>
              Os dados vêm do Portal Nacional de Contratações Públicas, que é a
              fonte oficial. Isso traz dois limites que você precisa conhecer
              antes de contratar, e que não estão sob nosso controle:
            </P>
            <P>
              <strong>O PNCP sai do ar.</strong> Não é hipótese — acontece, e
              quando acontece a varredura daquele período fica incompleta.
              Declaramos a cobertura obtida em vez de fingir que foi total, e a
              varredura tem segunda tentativa no mesmo dia.
            </P>
            <P>
              <strong>Órgãos publicam com atraso e retificam.</strong> Um edital
              pode ser alterado depois de publicado, inclusive em prazo. Nós
              detectamos mudanças, mas quem define o que vale é a publicação
              oficial no dia em que você a consulta.
            </P>
            <P>
              Por isso: <strong>o edital publicado prevalece sobre qualquer
              informação nossa</strong>. Confira sempre o documento oficial antes
              de apresentar proposta. O método completo está em{" "}
              <Link href="/metodologia/">como medimos</Link>.
            </P>
          </Secao>

          <Secao id="conta" titulo="Sua conta e seus dados">
            <P>
              Você é responsável por manter a confidencialidade do acesso e pela
              veracidade do perfil que cadastrar. Perfil errado produz triagem
              errada — se o CNAE ou a faixa de valor estiverem incorretos, os
              editais selecionados serão os errados, e isso não é falha do
              serviço.
            </P>
            <P>
              Os dados de cada empresa são isolados dos das demais no próprio
              banco. O que coletamos e o que fazemos com isso está em{" "}
              <Link href="/privacidade/">privacidade</Link>.
            </P>
          </Secao>

          <Secao id="pagamento" titulo="Assinatura, cobrança e cancelamento">
            <P>
              O plano contratado, o preço e a periodicidade são os exibidos no
              momento da contratação. Mudança de preço só vale para ciclos
              futuros, e é avisada por e-mail com pelo menos 30 dias de
              antecedência — nunca aplicada retroativamente.
            </P>
            <P>
              <strong>Cancelamento é a qualquer momento</strong>, pelo painel ou
              pelo e-mail de contato, sem multa e sem fidelidade. O serviço
              continua até o fim do ciclo já pago.
            </P>
            <P>
              Contratação a distância dá direito a arrependimento em até 7 dias,
              na forma do art. 49 do Código de Defesa do Consumidor, quando
              aplicável ao contratante.
            </P>
          </Secao>

          <Secao id="uso" titulo="O que não pode">
            <P>
              O conteúdo dos guias e as análises produzidas são nossos e ficam
              disponíveis para o uso da sua empresa. O que não pode: revender ou
              redistribuir o serviço, automatizar coleta em massa das nossas
              páginas, tentar burlar o isolamento entre clientes, ou usar o
              serviço para qualquer finalidade ilícita.
            </P>
            <P>
              Os dados de licitação em si são públicos e de origem
              governamental — sobre eles não reivindicamos exclusividade alguma.
            </P>
          </Secao>

          <Secao id="responsabilidade" titulo="Limitação de responsabilidade">
            <P>
              O serviço é de informação e apoio à decisão. Não respondemos por
              perda de oportunidade, desclassificação, inabilitação ou prejuízo
              decorrente de decisão de participar ou não participar de certame —
              essa decisão, com todo o risco dela, é da empresa licitante.
            </P>
            <P>
              Também não respondemos por indisponibilidade, atraso ou erro da
              fonte oficial, nem por alteração de edital feita pelo órgão.
            </P>
            <P>
              Nada aqui afasta as responsabilidades que a lei não permite afastar,
              inclusive as do Código de Defesa do Consumidor quando ele se
              aplicar. Em qualquer caso, nossa responsabilidade fica limitada ao
              valor pago pelo cliente nos 12 meses anteriores ao fato.
            </P>
            <P>
              A íntegra da ressalva sobre a natureza do conteúdo está no{" "}
              <Link href="/aviso-legal/">aviso legal</Link>.
            </P>
          </Secao>

          <Secao id="mudancas" titulo="Mudanças nestes termos">
            <P>
              Podemos alterar estes termos. Mudança relevante — preço, escopo do
              serviço, responsabilidades — é comunicada por e-mail com
              antecedência, e você pode cancelar sem custo se não concordar.
              Correção de redação entra sem aviso, e a data no topo muda.
            </P>
          </Secao>

          <Secao id="foro" titulo="Lei aplicável e foro">
            <P>
              Aplica-se a lei brasileira. Fica eleito o foro do domicílio do
              contratante quando ele for consumidor; nos demais casos, o foro da
              comarca do fornecedor.
            </P>
            <P>
              Antes de qualquer disputa, escreva para{" "}
              <a
                className="underline underline-offset-4"
                href={`mailto:${CONTATO.email}`}
              >
                {CONTATO.email}
              </a>
              . A maior parte dos problemas se resolve em um e-mail.
            </P>
          </Secao>
        </div>
      </main>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
