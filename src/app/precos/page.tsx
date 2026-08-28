import type { Metadata } from "next";
import Link from "next/link";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import {
  PLANOS,
  O_QUE_NENHUM_PLANO_FAZ,
  O_QUE_O_PLANO_DE_LISTA_NAO_FAZ,
  oQueIncluiO,
  emReais,
  porEmpresa,
} from "@/lib/precos";
import { limitarDescricao } from "@/lib/seo/resultado-de-busca";
import { pagamentoLigado } from "@/lib/pagamento/configuracao";
import { DIAS_DE_TESTE } from "@/lib/assinatura/teste";
import { BotaoDeAssinatura } from "@/components/precos/BotaoDeAssinatura";
import { Faq, P, RespostaDireta, Secao } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";

const TITULO = "Preços: da lista do edital ao documento lido";
/*
 * A descrição DERIVA dos planos, e não os repete.
 *
 * Este é o texto que aparece no resultado da busca. Fixá-lo na mão significa
 * que, no dia em que o preço mudar, o Google continuaria anunciando o antigo
 * até alguém lembrar deste arquivo — e o visitante chegaria achando que o site
 * subiu o preço no meio do caminho.
 */
/**
 * Os dois grupos da página, na ordem em que o leitor decide.
 *
 * A pergunta que separa os planos não é "quanto posso gastar", é "eu preciso
 * que alguém abra o arquivo do edital?". Quem responde não já sabe qual metade
 * olhar, e não perde tempo comparando com o plano caro; quem responde sim
 * precisa entender do que está abrindo mão antes de ser atraído pelo barato.
 */
const GRUPOS = [
  {
    profundidade: "lista" as const,
    titulo: "Sem abrir o arquivo do edital",
    explicacao:
      "Você fica sabendo que o edital existe, onde, de quanto e até quando, com um score de aderência ao seu perfil. É o que a publicação informa, chegando cedo e filtrado.",
  },
  {
    profundidade: "documento" as const,
    titulo: "Com a leitura do documento",
    explicacao:
      "Além do acima, alguém lê o arquivo: exigências de habilitação, garantia, visita técnica, riscos, e o que falta na sua documentação para cada edital.",
  },
];

const MAIS_BARATO = PLANOS.reduce((a, b) =>
  a.mensalidadeEmCentavos <= b.mensalidadeEmCentavos ? a : b,
);

const DESCRICAO = limitarDescricao(
  `Quatro planos, a partir de ${emReais(MAIS_BARATO.mensalidadeEmCentavos)} por mês. ` +
    `O que muda é o quanto entramos no edital e quantas empresas cabem na conta.`,
);
const ATUALIZADO = "2026-08-22";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/precos/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO,
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/precos/`,
    type: "website",
  },
};

/**
 * `schema.org/Offer`, um por plano.
 *
 * É daqui que buscadores clássicos e motores de IA tiram "quanto custa". Os
 * valores vêm de `PLANOS`, a mesma fonte que a página exibe — preço divergente
 * entre o texto e o dado estruturado faz o buscador anunciar um número que a
 * página não pratica, e o visitante chega achando que foi enganado.
 *
 * `availability: PreOrder` porque é a verdade hoje: o preço está definido e a
 * forma de pagar ainda não existe. Marcar `InStock` seria afirmar que dá para
 * comprar agora.
 */
const schema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${SITE.name}, assinatura`,
  description: DESCRICAO,
  brand: { "@type": "Brand", name: SITE.name },
  offers: PLANOS.map((plano) => ({
    "@type": "Offer",
    name: plano.nome,
    price: (plano.mensalidadeEmCentavos / 100).toFixed(2),
    priceCurrency: "BRL",
    availability: "https://schema.org/PreOrder",
    url: `${SITE.url}/precos/`,
  })),
};

export default function Precos() {
  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Preços" />

        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Quanto custa receber os editais já lidos
        </h1>

        <div className="mt-4 space-y-4">
          <P>
            Dois planos, e o que muda entre eles é uma coisa só:{" "}
            <strong>quantas empresas cabem na conta</strong>. O produto entregue
            é o mesmo nos dois.
          </P>
        </div>

        {/*
          Os planos ANTES de qualquer outra coisa. Quem abre esta página veio
          por um número; fazer a pessoa rolar por três parágrafos até achá-lo é
          o que transforma interesse em desistência.
        */}
        <div className="mt-10 space-y-10">
          {/*
            Agrupado por PROFUNDIDADE, e não por preço crescente.

            O eixo que decide a compra não é quanto custa, é se o produto abre o
            arquivo do edital ou não. Quem só quer saber que o edital existe não
            precisa comparar com o plano caro; quem precisa das exigências de
            habilitação não deve ser tentado pelo barato sem entender o que
            está abrindo mão. Uma fileira de quatro cartões em ordem de preço
            faria as duas coisas erradas ao mesmo tempo.
          */}
          {GRUPOS.map((grupo) => (
            <section key={grupo.profundidade}>
              <h2 className="text-lg font-semibold tracking-tight">{grupo.titulo}</h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{grupo.explicacao}</p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {PLANOS.filter((p) => p.profundidade === grupo.profundidade).map((plano) => (
                  <div key={plano.codigo} className="rounded-xl border p-6">
                    <p className="text-sm font-semibold">{plano.nome}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{plano.paraQuem}</p>

                    <p className="mt-5 text-3xl font-semibold tracking-tight">
                      {emReais(plano.mensalidadeEmCentavos)}
                      <span className="text-base font-normal text-[var(--muted)]"> /mês</span>
                    </p>

                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {plano.empresas === 1 ? "1 empresa" : `até ${plano.empresas} empresas`}
                      {plano.empresas > 1 ? ` · ${porEmpresa(plano)}` : ""}
                      {plano.recortes !== null ? ` · até ${plano.recortes} recortes` : ""}
                    </p>

                    {pagamentoLigado() ? (
                      <div className="mt-5">
                        <BotaoDeAssinatura plano={plano.codigo} nome={plano.nome} />
                      </div>
                    ) : null}

                    <ul className="mt-5 space-y-2 border-t pt-4">
                      {oQueIncluiO(plano).map((item) => (
                        <li key={item} className="flex gap-2 text-sm leading-relaxed">
                          <span aria-hidden className="text-[var(--accent)]">
                            •
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 space-y-12">
          {/*
            A ressalva vem LOGO depois do preço, e não no rodapé.
            
            Este site declara limitação em toda superfície, e a página que pede
            dinheiro não seria a exceção. Deixar o visitante descobrir no
            checkout que não há checkout é o caminho mais curto para ele nunca
            mais voltar.
          */}
          {pagamentoLigado() ? null : (
          <Secao id="ainda-nao-abriu" titulo="Ainda não dá para assinar — e é de propósito">
            <RespostaDireta>
              O preço está definido, a forma de pagamento ainda não. Preferimos
              publicar o valor e dizer isso a deixar você descobrir no fim do
              cadastro.
            </RespostaDireta>
            <P>
              Deixe o seu e-mail abaixo dizendo qual plano interessa. Quando a
              cobrança abrir, você é avisado primeiro — e o preço que você vê
              hoje é o que vai valer para quem entrou nesta lista.
            </P>
            <div className="mt-2">
              {/*
                `origem` é o que qualifica este cadastro: quem se inscreve AQUI
                já viu o preço e continuou. O painel de leads agrupa por origem,
                então essa distinção aparece sem trabalho nenhum.

                Não pedimos qual plano. O formulário tem e-mail e cidade, e
                enfiar a escolha do plano no campo de cidade seria gambiarra que
                suja o dado que o alerta usa para filtrar praça.
              */}
              <CapturaAlerta
                origem="/precos/"
                chamada={{
                  titulo: "Avise-me quando a assinatura abrir",
                  texto:
                    "Você entra na frente e mantém o preço desta página. Enquanto isso, mandamos o convite para os 14 dias de teste — sem cartão, e o acesso para sozinho no fim.",
                }}
                textoDoBotao="Quero ser avisado"
              />
            </div>
          </Secao>
          )}

          <Secao id="nao-faz" titulo="O que os planos não fazem">
            <P>
              Esta seção fica na mesma altura da de cima porque descobrir
              limitação depois de pagar é o que gera pedido de reembolso — e
              porque é o que separa uma ferramenta de trabalho de uma promessa.
            </P>

            <h3 className="mt-6 text-base font-semibold">
              O Leve e o Leve Escritório, especificamente
            </h3>
            <P>
              Eles dizem <strong>que</strong> o edital existe e <strong>o quanto</strong>{" "}
              ele parece combinar com o seu perfil. Eles não abrem o arquivo.
            </P>
            <ul className="mt-2 space-y-2">
              {O_QUE_O_PLANO_DE_LISTA_NAO_FAZ.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed">
                  <span aria-hidden className="text-[var(--muted)]">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-8 text-base font-semibold">Nenhum plano, nem o mais caro</h3>
            <ul className="mt-2 space-y-2">
              {O_QUE_NENHUM_PLANO_FAZ.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-[var(--muted)]">
                  <span aria-hidden>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Secao>

          {/*
            Esta seção chamava-se "Se ainda é cedo para assinar" e oferecia o
            alerta gratuito. Ele acabou em 25/08 — entregava de graça e para
            sempre o essencial do que o Leve cobra, e nenhuma tabela de preços
            sobrevive a ter, no rodapé, um link para a versão sem preço.

            O que ficou no lugar não é um plano menor: é o mesmo Leve, por
            catorze dias, e depois ele para sozinho.
          */}
          <Secao id="teste" titulo="Se quiser ver antes de decidir">
            <P>
              São {DIAS_DE_TESTE} dias no plano Leve, sem cartão. Você cadastra
              a empresa, escolhe até três recortes e passa a receber o resumo
              nos dias úteis, exatamente como quem assina.
            </P>
            <P>
              No fim do prazo o acesso para sozinho. Não há cobrança automática,
              porque não há cartão cadastrado para cobrar — se você quiser
              continuar, assina; se não quiser, não precisa fazer nada.
            </P>
            <P>
              <Link className="underline underline-offset-4" href="/alerta-de-licitacao/">
                Como funciona o teste de {DIAS_DE_TESTE} dias
              </Link>
            </P>
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes">
            <Faq
              itens={[
                {
                  pergunta: "O que muda de um plano para o outro?",
                  resposta:
                    "Duas coisas, e só elas. Se abrimos o arquivo do edital ou não, que é a diferença entre saber que ele existe e saber o que ele exige; e quantas empresas cabem na mesma conta. Não cobramos por uso, porque isso puniria justamente quem disputa mais.",
                },
                {
                  pergunta: "Sou contador e cuido de vários clientes. Preciso de uma conta por cliente?",
                  resposta:
                    `Não. O plano ${PLANOS[1].nome} cobre até ${PLANOS[1].empresas} empresas na ` +
                    `mesma conta, e o painel troca entre elas. Sai ${porEmpresa(PLANOS[1])}, ` +
                    `contra ${emReais(PLANOS[0].mensalidadeEmCentavos)} de uma conta avulsa.`,
                },
                {
                  pergunta: "O que acontece se eu passar de cinco empresas?",
                  resposta:
                    "Fale com a gente antes de contratar. Acima de cinco o preço deixa de ser de tabela e depende do volume, e prometer um número aqui que não conseguimos sustentar seria pior que não ter número.",
                },
                {
                  pergunta: "Tem fidelidade ou multa?",
                  resposta:
                    "Não. A assinatura é mensal e você cancela quando quiser. Prender cliente por contrato é o que se faz quando o produto não segura sozinho.",
                },
                {
                  pergunta: "Vocês leem TODOS os editais que chegam?",
                  resposta:
                    "Depende do plano, e a tela diz sempre qual é o caso. No Leve e no Leve Escritório não lemos nenhum: você recebe o que o órgão publicou, cedo e filtrado pelo seu perfil. No Empresa e no Consultoria lemos os de maior aderência, com volume diário limitado, e nos demais aparece o que o órgão publicou — marcado como não analisado.",
                },
              ]}
            />
          </Secao>
        </div>

        <p className="mt-12 text-sm leading-relaxed text-[var(--muted)]">
          Preços em reais, por mês. Atualizado em{" "}
          {new Date(`${ATUALIZADO}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}.
        </p>
      </main>

      {/* Sem a oferta do Workbook: já é a página de preços, com a oferta inteira aberta. */}
      <RodapeSite oferta={false} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
