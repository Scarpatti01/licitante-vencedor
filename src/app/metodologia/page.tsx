import type { Metadata } from "next";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";

const TITULO = "Metodologia: de onde vêm os dados";
const DESCRICAO =
  "De onde vêm os dados do PNCP, com que frequência coletamos, como normalizamos, o que a revisão automática barra e o que a coleta não alcança.";
const ATUALIZADO = "2026-08-21";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/metodologia/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO, title: TITULO, description: DESCRICAO, url: `${SITE.url}/metodologia/`, type: "website" },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE.url}/metodologia/#webpage`,
      name: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      dateModified: ATUALIZADO,
      isPartOf: { "@id": `${SITE.url}/#website` },
      publisher: { "@id": `${SITE.url}/#organization` },
    },
    {
      // O plano de arquitetura prevê `Dataset` para sustentar as páginas de
      // dados. Ele fica aqui, na página que descreve o método, e não nas
      // páginas que exibem números: é este documento que torna o conjunto
      // auditável.
      "@type": "Dataset",
      "@id": `${SITE.url}/metodologia/#dataset`,
      name: "Editais com propostas abertas no PNCP",
      description:
        "Contratações públicas com recebimento de propostas aberto, coletadas diariamente da API pública de consulta do Portal Nacional de Contratações Públicas, normalizadas e revisadas antes da publicação.",
      inLanguage: SITE.locale,
      isAccessibleForFree: true,
      creator: { "@id": `${SITE.url}/#organization` },
      license: "https://www.gov.br/pncp/",
      temporalCoverage: "2026-08/..",
      measurementTechnique:
        "Coleta automatizada via API REST pública do PNCP, com deduplicação por número de controle, normalização de fuso horário e revisão automática de consistência.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Metodologia", item: `${SITE.url}/metodologia/` },
      ],
    },
  ],
};

export default function Metodologia() {
  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Metodologia" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Metodologia
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Atualizado em 12 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            Todo número publicado neste site sobre editais vem de uma coleta
            automatizada, e nenhum deles é estimativa nossa. Esta página descreve
            exatamente de onde os dados vêm, o que fazemos com eles antes de
            publicar e — a parte que costuma faltar — o que eles não cobrem.
          </P>

          <RespostaDireta>
            Fonte: API pública de consulta do Portal Nacional de Contratações
            Públicas. Coleta diária, automatizada, das contratações com
            recebimento de propostas aberto. Todo lote passa por revisão
            automática antes de ser publicado, e as inconsistências encontradas
            são divulgadas junto com os dados, não escondidas.
          </RespostaDireta>
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="fonte" titulo="Fonte e frequência">
            <Tabela
              cabecalho={["Item", "Definição"]}
              linhas={[
                ["Fonte", "API pública de consulta do PNCP, sem autenticação"],
                ["O que é coletado", "Contratações com recebimento de propostas aberto, com prazo de encerramento nos 90 dias seguintes"],
                ["Frequência", "Diária, às 03h10 de Brasília, com segunda tentativa às 05h10"],
                ["Abrangência atual", "Nacional — as 27 unidades da federação"],
                ["Ritmo da coleta", "Sequencial, com pausa entre requisições, para não sobrecarregar um serviço público"],
              ]}
            />
            <P>
              A coleta começou deliberadamente pequena — seis estados do
              Nordeste —, para que a revisão fosse verificável antes de a
              abrangência crescer. Hoje ela pede as 27 UFs, e o critério não
              mudou junto: um dia em que algum estado não vem inteiro é
              classificado como parcial, com a lista do que faltou, em vez de
              ser publicado como se fosse o país todo.
            </P>
          </Secao>

          <Secao id="tratamento" titulo="O que fazemos com o dado bruto">
            <P>
              O PNCP entrega os registros no formato dele. Antes de qualquer
              publicação, quatro tratamentos são aplicados — e cada um existe por
              causa de um problema concreto que encontramos ao rodar a coleta.
            </P>
            <Tabela
              cabecalho={["Tratamento", "Por quê"]}
              linhas={[
                ["Fuso horário explicitado", "As datas vêm sem fuso e são de Brasília. Interpretadas como UTC, o prazo de um edital atrasaria três horas — e prazo é o dado que não pode errar"],
                ["Valor zero tratado como “não informado”", "O PNCP usa zero para valor não declarado, mas existem editais legítimos de centavos. O valor original é preservado ao lado, para nada se perder"],
                ["Deduplicação por número de controle", "O mesmo edital pode reaparecer entre páginas quando a base é reordenada durante a coleta"],
                ["Descarte de registro sem UF, município ou prazo", "Sem esses campos o edital não vira página nem alerta. Descartes são contados e informados"],
              ]}
            />
          </Secao>

          <Secao id="revisao" titulo="A revisão que roda antes de publicar">
            <P>
              Nenhum lote é publicado sem passar por verificação automática. São
              checagens aritméticas e estatísticas — nenhuma delas depende de
              julgamento sobre o mérito do edital.
            </P>
            <Tabela
              cabecalho={["Verificação", "O que detecta"]}
              linhas={[
                ["Prazo invertido", "Encerramento registrado antes da abertura"],
                ["Prazo vencido", "Edital devolvido como aberto, mas com prazo já encerrado"],
                ["UF x código IBGE", "Os dois primeiros dígitos do código IBGE codificam a UF; divergência indica erro de cadastro"],
                ["Dígitos do CNPJ", "CNPJ do órgão que não passa na verificação dos dígitos"],
                ["Objeto insuficiente", "Descrição curta demais para dizer o que está sendo comprado"],
                ["Valor implausível", "Valor que destoa da faixa observada na mesma modalidade"],
              ]}
            />
            <P>
              Igualmente importante é o que <em>não</em> virou regra. Testamos
              uma verificação de “edital aberto há tempo demais” e ela acusaria
              sete casos legítimos: eram credenciamentos, cuja duração mediana no
              próprio conjunto é de 365 dias, porque a modalidade é contínua por
              natureza. Alarme falso em massa destrói a utilidade da revisão, e a
              regra foi descartada.
            </P>
          </Secao>

          <Secao id="nao-inventar" titulo="A regra que governa o relatório de revisão">
            <P>
              Quando a revisão encontra uma inconsistência, ela é publicada junto
              com os dados. E há uma regra rígida sobre o que pode ser dito:
            </P>
            <RespostaDireta>
              Nada é inventado. Um achado só existe se for derivável do próprio
              dado, e o relatório mostra a medida que o disparou. Onde cabe
              hipótese de correção, ela vem rotulada como hipótese, com o
              raciocínio. Quando mais de uma hipótese é compatível, o relatório
              diz que não é possível determinar qual vale. Quando nenhuma é, diz
              que não há hipótese sustentável.
            </RespostaDireta>
            <P>
              Um exemplo real, do piloto de agosto de 2026: um pregão de
              mobiliário apareceu declarado a R$ 77,84 bilhões — sozinho, 88% do
              total de seis estados. Dividido por mil, o valor cai dentro da faixa
              normal da modalidade; dividido por dez mil, também. Como as duas
              hipóteses cabem, o correto é dizer que não dá para determinar o
              valor certo — e é isso que o relatório diz, em vez de escolher a
              mais bonita.
            </P>
            <P>
              O edital continua aparecendo na listagem, porque ele existe de
              verdade e alguém pode querer disputá-lo. O que ele não faz é entrar
              em soma nenhuma.
            </P>
          </Secao>

          <Secao id="limitacoes" titulo="Limitações conhecidas">
            <P>
              Esta seção existe porque conjunto de dados sem limitação declarada
              é conjunto de dados em que não se deve confiar.
            </P>
            <Tabela
              cabecalho={["Limitação", "Efeito prático"]}
              linhas={[
                ["Dependemos do que o órgão publicou", "Campo que o órgão deixou vazio chega vazio aqui. Não preenchemos lacuna por inferência"],
                ["Valor estimado nem sempre é informado", "Parte dos editais chega sem valor. Eles aparecem, sinalizados, e ficam fora dos totais"],
                ["A fonte tem erro de digitação", "Detectamos e sinalizamos os casos gritantes. Erros dentro da faixa plausível passam despercebidos por qualquer método"],
                ["A API do PNCP fica indisponível", "Aconteceu duas vezes no dia da implantação. Quando uma UF falha, a coleta segue nas demais e a cobertura incompleta é declarada"],
                ["Cobertura nacional, mas nem sempre inteira", "A coleta pede as 27 UFs. Quando alguma não vem completa, o dia é classificado como parcial e o relatório diz qual faltou — ausência aqui não significa ausência no PNCP"],
                ["Retrato do momento da coleta", "Alteração, suspensão ou revogação posterior só aparece na coleta seguinte"],
              ]}
            />
          </Secao>

          <Secao id="nao-cobre" titulo="O que a coleta não alcança">
            <P>
              Três exclusões que vale enunciar sem rodeio, porque nenhuma delas é
              defeito corrigível pelo método:
            </P>
            <P>
              O que não foi publicado no PNCP não existe para nós. A base cobre o
              que os órgãos divulgam ali; contratação conduzida fora dessa
              divulgação não é alcançada por nenhuma coleta baseada nessa fonte.
            </P>
            <P>
              Não lemos o inteiro teor do edital nem seus anexos. Trabalhamos com
              os campos estruturados do registro — objeto, órgão, local, prazo,
              valor, modalidade. Exigência de habilitação, especificação técnica e
              regra de julgamento estão no documento, e é ele que você precisa
              ler antes de decidir disputar.
            </P>
            <P>
              Não avaliamos se um edital é bom ou ganhável. Organizamos e
              sinalizamos; a análise de viabilidade é da empresa. Ver o{" "}
              <a className="underline underline-offset-4" href="/aviso-legal/">
                aviso legal
              </a>
              .
            </P>
          </Secao>

          <Secao id="reproduzir" titulo="Como conferir por conta própria">
            <P>
              Nada aqui depende de acreditar em nós. A fonte é pública e
              documentada, e qualquer pessoa pode repetir a consulta e comparar.
            </P>
            <P>
              O agregado por município e o relatório de revisão de cada coleta
              são versionados junto do código do site, o que significa que existe
              histórico: dá para ver o que mudou entre dois dias e quando uma
              inconsistência apareceu ou sumiu.
            </P>
            <ul className="mt-4 space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://pncp.gov.br/api/consulta/swagger-ui/index.html" target="_blank" rel="noopener">
                  Documentação da API pública de consulta do PNCP
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

        <p className="mt-12 text-sm leading-relaxed text-[var(--muted)]">
          Encontrou divergência entre o que mostramos e a fonte? Avise — a
          correção é feita e registrada. Em qualquer conflito, prevalece o
          edital.
        </p>
      </main>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
