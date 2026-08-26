import type { Metadata } from "next";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { Citacao, Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { limitarDescricao } from "@/lib/seo/resultado-de-busca";
import {
  DISPENSA_POR_VALOR,
  DOBRAM_O_LIMITE,
  REAJUSTE_VIGENTE,
  emReais,
  vigenciaPorExtenso,
} from "@/lib/dominio/limites-legais";

/**
 * A página viva dos valores que envelhecem.
 *
 * ## Por que ela existe, e por que num endereço próprio
 *
 * Os limites de dispensa mudam por decreto todo fim de ano. Impressos em
 * material que não se atualiza, eles não envelhecem com barulho: envelhecem em
 * silêncio. O guia da Lei 14.133 deste site carregou os valores de 2021 por
 * cinco anos sem que nada reclamasse, porque "R$ 50 mil" é um texto
 * perfeitamente válido.
 *
 * Este endereço nasceu de uma decisão editorial de 26/08: todo número que
 * envelhece sai do material distribuído (PDF, workbook, apostila) e passa a ser
 * citado por link fixo. O material diz "consulte o limite vigente em
 * /limites/"; esta página mostra o valor com o decreto e a data grudados nele.
 *
 * Quem atualiza um lugar só não esquece o segundo lugar, porque não há segundo.
 *
 * ## O que ela não pode virar
 *
 * Uma página de números soltos. O leitor que chega aqui está decidindo se uma
 * contratação cabe em dispensa, e a resposta errada custa a ele uma anulação.
 * Por isso ela carrega, junto do valor: a exceção do dobro, que é a que mais
 * confunde; a proibição de fracionar despesa para caber, que é a irregularidade
 * mais comum; e a data em que tudo isto vira notícia velha.
 *
 * Os valores vêm de `dominio/limites-legais.ts` e nunca são escritos aqui à
 * mão. `limites-legais.test.ts` reprova cifra literal perto de uma citação do
 * art. 75, e é ela que garante que esta página não se descole da fonte.
 */

const TITULO = "Limites de dispensa da Lei 14.133 em 2026";

/*
 * Montada a partir dos valores, e por isso passa por `limitarDescricao`.
 *
 * A descrição interpola o decreto e as duas cifras, então ela muda de tamanho
 * junto com eles: um reajuste que empurre um valor para a casa dos milhões
 * acrescenta caracteres aqui sem ninguém reparar. `resultado-de-busca.guarda`
 * reprova descrição montada que não passe por este corte, e reprovou esta
 * página na primeira execução, que é exatamente o efeito para o qual ela foi
 * escrita.
 */
const DESCRICAO = limitarDescricao(
  `Os valores de dispensa por valor em ${REAJUSTE_VIGENTE.ano}: ` +
    `${emReais(DISPENSA_POR_VALOR.obrasEEngenharia)} para obras e ` +
    `${emReais(DISPENSA_POR_VALOR.comprasEServicos)} para compras, pelo ` +
    `${REAJUSTE_VIGENTE.decreto.replace("nº ", "")}. Quando mudam e quem tem o dobro.`,
);
const ATUALIZADO = REAJUSTE_VIGENTE.vigenteDesde;

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/limites/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO,
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/limites/`,
    type: "article",
  },
};

const SECOES = [
  { id: "valores", titulo: "Os valores em vigor, e de onde eles vêm" },
  { id: "dobro", titulo: "Quem trabalha com o dobro do limite" },
  { id: "centavos", titulo: "Por que obras não é exatamente o dobro de compras" },
  { id: "fracionamento", titulo: "O que o limite não autoriza: fracionar a despesa" },
  { id: "quando-muda", titulo: "Quando estes números mudam" },
  { id: "conferir", titulo: "Como conferir na fonte oficial" },
];

const FAQ = [
  {
    pergunta: `Qual é o valor da dispensa de licitação em ${REAJUSTE_VIGENTE.ano}?`,
    resposta:
      `${emReais(DISPENSA_POR_VALOR.obrasEEngenharia)} para obras e serviços de engenharia, ` +
      `e ${emReais(DISPENSA_POR_VALOR.comprasEServicos)} para as demais compras e serviços. ` +
      `Os dois valores foram fixados pelo ${REAJUSTE_VIGENTE.decreto} e valem desde ` +
      `${vigenciaPorExtenso()}.`,
  },
  {
    pergunta: "Esse limite vale para todo órgão público?",
    resposta:
      `Não. Consórcio público, autarquia e fundação qualificada como agência executiva ` +
      `trabalham com o dobro dos dois valores. Fornecedor que atende consórcio ` +
      `intermunicipal, comum em saúde e em resíduos, costuma descobrir isso tarde.`,
  },
  {
    pergunta: "Posso dividir uma compra grande em várias menores para caber na dispensa?",
    resposta:
      "Não. Fracionar a despesa para fugir da modalidade devida é irregularidade, e o " +
      "limite é apurado pelo total do exercício para objetos da mesma natureza, não " +
      "por nota fiscal. É um dos apontamentos mais frequentes dos tribunais de contas.",
  },
  {
    pergunta: "Com que frequência esses valores mudam?",
    resposta:
      "Uma vez por ano. O decreto de reajuste costuma sair no fim de dezembro e passa a " +
      `valer em 1º de janeiro. O reajuste em vigor foi de ${REAJUSTE_VIGENTE.percentual
        .toString()
        .replace(".", ",")}% pelo IPCA-E.`,
  },
  {
    pergunta: "Dispensa por valor é a mesma coisa que inexigibilidade?",
    resposta:
      "Não. Dispensa é quando a competição seria possível e a lei autoriza abrir mão dela, " +
      "e o valor é uma das hipóteses. Inexigibilidade é quando a competição é inviável, " +
      "como no fornecedor exclusivo. São artigos diferentes e exigem justificativas " +
      "diferentes no processo.",
  },
];

export default function Limites() {
  const dobroObras = emReais(DISPENSA_POR_VALOR.obrasEEngenharia * 2);
  const dobroCompras = emReais(DISPENSA_POR_VALOR.comprasEServicos * 2);

  return (
    <>
      <CabecalhoSite />
      <Trilha atual="Limites de dispensa" />

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Limites de dispensa da Lei 14.133
          </h1>
          <p className="text-lg leading-relaxed text-[var(--muted)]">
            Os valores que decidem se uma contratação pode ser feita sem
            licitação, com o decreto que os fixou e a data em que passaram a
            valer. Esta página é atualizada quando o decreto muda.
          </p>
          <p className="text-sm text-[var(--muted)]">
            Vigente desde {vigenciaPorExtenso()} · {REAJUSTE_VIGENTE.decreto}
          </p>
        </header>

        <div className="mt-8">
          <RespostaDireta>
            Em {REAJUSTE_VIGENTE.ano}, a dispensa por valor vale até{" "}
            <strong>{emReais(DISPENSA_POR_VALOR.obrasEEngenharia)}</strong> para
            obras e serviços de engenharia, e até{" "}
            <strong>{emReais(DISPENSA_POR_VALOR.comprasEServicos)}</strong> para
            as demais compras e serviços.
          </RespostaDireta>
        </div>

        <div className="mt-8">
          <Indice itens={SECOES} />
        </div>

        <div className="mt-10 space-y-10">
          <Secao id="valores" titulo="Os valores em vigor, e de onde eles vêm">
            <P>
              A Lei 14.133 autoriza a contratação direta por valor em duas
              faixas, e corrige as duas por decreto todo ano. Os números abaixo
              são os que valem hoje.
            </P>

            {/*
              Duas colunas, e não três.
              A primeira versão trazia uma coluna "com o dobro", calculada aqui.
              Número derivado apresentado ao lado de número publicado se
              confunde com ele, e a tabela passaria a afirmar como limite legal
              uma conta nossa. Pior: o dobro de compras cai a dois centavos do
              limite de obras, então as duas linhas ficavam quase idênticas na
              mesma coluna. O dobro está explicado em prosa na seção seguinte,
              onde dá para dizer que é conta e não citação.
            */}
            <Tabela
              cabecalho={["Tipo de contratação", "Limite publicado no decreto"]}
              linhas={[
                [
                  "Obras e serviços de engenharia",
                  emReais(DISPENSA_POR_VALOR.obrasEEngenharia),
                ],
                [
                  "Demais compras e serviços",
                  emReais(DISPENSA_POR_VALOR.comprasEServicos),
                ],
              ]}
            />

            <P>
              Estes são os dois números do decreto. Uma lista específica de
              contratantes trabalha com o dobro deles, e é o assunto da próxima
              seção.
            </P>
          </Secao>

          <Secao id="dobro" titulo="Quem trabalha com o dobro do limite">
            <P>
              A lei dobra as duas faixas para {DOBRAM_O_LIMITE}. Dobrando os
              valores acima, dá {dobroObras} em obras e {dobroCompras} nas
              demais compras. São contas, e não citações do decreto: o decreto
              publica as faixas simples, e é a lei que manda dobrá-las para
              esses contratantes.
            </P>
            <P>
              Repare numa armadilha visual nesse segundo número. O dobro da
              faixa de compras, {dobroCompras}, fica a dois centavos do limite
              de obras, {emReais(DISPENSA_POR_VALOR.obrasEEngenharia)}. São
              coisas completamente diferentes que quase compartilham a mesma
              grafia, e trocar uma pela outra é fácil quando se lê depressa.
            </P>
            <P>
              É a exceção que mais confunde, e confunde para os dois lados: há
              quem deixe de propor achando que a compra não caberia, e há quem
              suponha o dobro onde o contratante é uma prefeitura comum.
              Confira no edital quem é o órgão contratante antes de contar com
              o teto ampliado.
            </P>
          </Secao>

          <Secao id="centavos" titulo="Por que obras não é exatamente o dobro de compras">
            <P>
              Parece que deveria ser, e não é. Dobrar o limite de compras daria
              dois centavos a mais do que o limite de obras publicado. A
              diferença vem de arredondamento na própria fonte: o decreto fixa
              cada faixa por si, e não deriva uma da outra.
            </P>
            <P>
              O detalhe importa por um motivo prático. Quem calcula o limite de
              obras multiplicando o de compras por dois vai trabalhar com um
              teto que não existe, e a diferença aparece exatamente no ponto em
              que a contratação cabe ou não cabe.
            </P>
          </Secao>

          <Secao
            id="fracionamento"
            titulo="O que o limite não autoriza: fracionar a despesa"
          >
            <P>
              O erro mais comum com estes números não é errar o valor. É supor
              que basta dividir uma compra grande em pedaços menores para cada
              pedaço caber na dispensa.
            </P>
            <P>
              O limite é apurado pelo total do exercício para objetos da mesma
              natureza, e não por nota fiscal ou por processo. Comprar o mesmo
              material em quatro dispensas ao longo do ano, somando acima do
              teto, é fracionamento de despesa. É um dos apontamentos mais
              frequentes dos tribunais de contas, e atinge tanto o gestor quanto
              a relação do fornecedor com aquele órgão.
            </P>
            <Citacao fonte="Posicionamento deste site">
              Em qualquer divergência entre o que esta página diz e o que o
              edital ou o parecer do órgão diz, prevalece o documento oficial.
              Este texto informa o valor vigente e o rito; ele não substitui
              advogado nem parecer jurídico.
            </Citacao>
          </Secao>

          <Secao id="quando-muda" titulo="Quando estes números mudam">
            <P>
              Uma vez por ano. O decreto de reajuste costuma ser publicado no
              fim de dezembro e passa a valer no primeiro dia de janeiro. O
              índice usado é o IPCA-E, e o reajuste em vigor foi de{" "}
              {REAJUSTE_VIGENTE.percentual.toString().replace(".", ",")}%.
            </P>
            <P>
              É por isso que esta página existe num endereço próprio. Todo
              material que a gente publica em PDF ou impresso cita este link em
              vez de imprimir o número, porque um valor impresso continua
              parecendo certo depois de deixar de ser. Quem chegou aqui por um
              livro ou por uma apostila está lendo o valor de hoje, não o do dia
              em que aquele material foi escrito.
            </P>
          </Secao>

          <Secao id="conferir" titulo="Como conferir na fonte oficial">
            <P>
              Não confie neste site para uma decisão que vale dinheiro sem
              conferir na fonte, e isso vale para qualquer site. O{" "}
              {REAJUSTE_VIGENTE.decreto} está publicado no Diário Oficial da
              União e no portal da Presidência da República, e o texto do artigo
              75 da Lei 14.133 traz as duas faixas e a regra do dobro.
            </P>
            <P>
              Se a data no topo desta página estiver muito distante do ano
              corrente, presuma que saiu decreto novo e confira antes de usar o
              número. A data está no topo justamente para permitir essa
              desconfiança.
            </P>
          </Secao>

          <Secao id="perguntas" titulo="Perguntas frequentes">
            <Faq itens={FAQ} />
          </Secao>
        </div>

        <div className="mt-12">
          <CapturaAlerta origem="limites" />
        </div>

        <div className="mt-12">
          <AutorBio />
        </div>

        <p className="mt-8 text-sm text-[var(--muted)]">
          Última verificação do conteúdo: {ATUALIZADO}.
        </p>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((item) => ({
              "@type": "Question",
              name: item.pergunta,
              acceptedAnswer: { "@type": "Answer", text: item.resposta },
            })),
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: SITE.url },
              {
                "@type": "ListItem",
                position: 2,
                name: "Limites de dispensa",
                item: `${SITE.url}/limites/`,
              },
            ],
          }),
        }}
      />

      <RodapeSite />
    </>
  );
}
