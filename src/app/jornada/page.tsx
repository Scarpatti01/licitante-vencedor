import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Playfair_Display, Lato } from "next/font/google";
import { AUTHOR, CONTATO, SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import {
  checkoutAberto, economiaEmReais, OFERTA, valorAncorado,
} from "@/lib/jornada/oferta";
import {
  ANTES_E_DEPOIS, AUTOR, CONTEUDO, DECLARACAO, DESBLOQUEIA, DISCLAIMER,
  DOR, FAQ, HERO, NAO_E_PARA, POR_DENTRO, TRANSFORMACAO, ULTIMO_CTA, VERDADES,
} from "@/components/venda/copy-da-jornada";
import { CLASSE_RAIZ, ESTILO_PREMIUM } from "@/components/venda/estilo";
import { Icone } from "@/components/venda/Icone";
import { CapturaAlerta } from "@/components/CapturaAlerta";

/*
 * As duas faces do Workbook, carregadas só nesta rota. `display: swap` deixa o
 * texto legível antes de a fonte chegar, que é o que importa numa página que
 * recebe tráfego pago: a primeira dobra precisa ler, não esperar.
 */
const display = Playfair_Display({
  variable: "--fonte-display", subsets: ["latin", "latin-ext"], display: "swap",
});
const corpo = Lato({
  variable: "--fonte-corpo", weight: ["400", "700"], subsets: ["latin", "latin-ext"], display: "swap",
});

/*
 * Literais, e não template. A guarda de SEO lê estes dois nomes direto do fonte
 * para medir o título renderizado e o corte da descrição, e uma interpolação a
 * faria pular a página inteira sem avisar.
 */
const TITULO = "Jornada de 12 Semanas: sua primeira licitação";
const DESCRICAO =
  "Em 12 semanas, sua empresa sai do zero e disputa a primeira licitação sabendo o que faz. Pagamento único de R$ 47, com 7 dias de garantia.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/jornada/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO,
    title: TITULO, description: DESCRICAO,
    url: `${SITE.url}/jornada/`, type: "website",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      "@id": `${SITE.url}/jornada/#produto`,
      name: OFERTA.nomeCompleto,
      description: DESCRICAO,
      brand: { "@type": "Brand", name: SITE.name },
      author: { "@type": "Person", name: AUTHOR.name },
      offers: {
        "@type": "Offer",
        price: String(OFERTA.preco),
        priceCurrency: "BRL",
        availability: checkoutAberto()
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
        url: `${SITE.url}/jornada/`,
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/jornada/#faq`,
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.pergunta,
        acceptedAnswer: { "@type": "Answer", text: f.resposta },
      })),
    },
  ],
};

const MICROCOPY_ABERTO = `Acesso imediato. ${OFERTA.diasDeGarantia} dias de garantia. Pagamento seguro.`;
const MICROCOPY_FECHADO = "Sem compromisso. Só um aviso no dia em que a compra abrir.";

const ABERTO = checkoutAberto();

/**
 * O botão de ação.
 *
 * Mora fora do componente da página de propósito. A primeira versão estava
 * declarada dentro do render, e o lint reprovou com razão: componente criado
 * durante a renderização é remontado a cada passagem, perdendo estado e
 * refazendo trabalho. Aqui ele é estático, e o que ele precisa saber sai de
 * `OFERTA`, que é constante de módulo.
 *
 * Enquanto o checkout não existe, ele NÃO vira um retângulo morto: leva à lista
 * de espera. Uma página de venda com o botão principal inerte gasta o clique
 * pago e não devolve nada, e quem chegou até ali já demonstrou o interesse mais
 * caro de conseguir.
 */
function Cta({ children, id }: { children: React.ReactNode; id?: string }) {
  if (ABERTO) {
    return (
      <a id={id} className="cta" href={OFERTA.CHECKOUT} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <a id={id} className="cta" href="#avise-me">
      Quero saber quando abrir
    </a>
  );
}

/**
 * A página de venda da Jornada.
 *
 * ## Por que ela vive dentro do site, e não como HTML solto
 *
 * Porque solta ela teria que duplicar o cabeçalho, o rodapé e as três páginas
 * legais que este domínio já tem. Duas políticas de privacidade que divergem
 * não é um detalhe de organização: é um problema de LGPD, porque o titular
 * passa a não saber qual vale. Aqui ela é estática como qualquer outra rota,
 * carrega só as duas fontes do livro e reaproveita o que já foi escrito.
 *
 * ## O que ela NÃO faz, de propósito
 *
 * Não inventa depoimento, não inventa número de aluno e não promete resultado
 * em certame. As seções de prova social e de vídeo só aparecem quando existir
 * material real em `OFERTA`. Uma página de venda que mente sobre resultado é a
 * única coisa capaz de estragar a reputação que o resto do domínio construiu.
 */
export default function PaginaDeVendaDaJornada() {
  const ano = new Date().getFullYear();
  const MICROCOPY = ABERTO ? MICROCOPY_ABERTO : MICROCOPY_FECHADO;

  return (
    <div className={`${display.variable} ${corpo.variable} ${CLASSE_RAIZ}`}>
      <style>{ESTILO_PREMIUM}</style>

      {/* ---------- BLOCO 1: hero ---------- */}
      <header className="px-6 pt-16 pb-20 text-center sm:pt-24">
        <div className="mx-auto max-w-4xl">
          <p className="etiqueta">{HERO.etiqueta}</p>

          <h1 className="mt-6" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
            {HERO.titulo.map((parte, i) =>
              parte.destaque ? (
                <span key={i} className="destaque">{parte.texto}</span>
              ) : (
                <span key={i}>{parte.texto}</span>
              ),
            )}
          </h1>

          <p
            className="serifa mx-auto mt-7 max-w-2xl italic"
            style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.45rem)", lineHeight: 1.55, color: "var(--tinta-fraca)" }}
          >
            {HERO.subtitulo}
          </p>

          <p className="mx-auto mt-5 max-w-xl text-[0.98rem]" style={{ color: "var(--tinta-fraca)" }}>
            {HERO.apoio}
          </p>

          {OFERTA.VIDEO_EMBED ? (
            <div
              className="mx-auto mt-10 aspect-video w-full max-w-3xl overflow-hidden rounded-2xl"
              dangerouslySetInnerHTML={{ __html: OFERTA.VIDEO_EMBED }}
            />
          ) : null}

          <div className="mt-10 flex flex-col items-center gap-3">
            <Cta id="comecar">Garantir meu acesso por {OFERTA.precoEscrito}</Cta>
            <p className="text-sm" style={{ color: "var(--tinta-fraca)" }}>{MICROCOPY}</p>
          </div>

          <div className="ornamento mt-12"><span>&#9670;</span></div>
        </div>
      </header>

      {/* ---------- BLOCO 1B: o produto por dentro ---------- */}
      <section className="overflow-hidden px-6 pb-16 pt-4" style={{ background: "var(--creme)" }}>
        <div className="mx-auto max-w-6xl">
          <p className="etiqueta text-center">{POR_DENTRO.etiqueta}</p>

          <h2 className="mt-5 text-center" style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>
            {POR_DENTRO.titulo}
          </h2>

          <p
            className="serifa mx-auto mt-4 max-w-2xl text-center italic"
            style={{ fontSize: "clamp(1.02rem, 2vw, 1.2rem)", lineHeight: 1.6, color: "var(--tinta-fraca)" }}
          >
            {POR_DENTRO.subtitulo}
          </p>

          {/* no celular a composição de três aparelhos fica ilegível, então mostramos só a tela do telefone */}
          <Image
            src="/jornada-por-dentro-celular.webp"
            alt={POR_DENTRO.altCelular}
            width={900}
            height={1510}
            sizes="(max-width: 639px) 88vw, 1px"
            className="surge mx-auto mt-10 h-auto w-[88%] max-w-xs sm:hidden"
            priority={false}
          />

          <Image
            src="/jornada-por-dentro.webp"
            alt={POR_DENTRO.alt}
            width={2200}
            height={965}
            sizes="(max-width: 639px) 1px, (max-width: 1152px) 100vw, 1152px"
            className="surge mt-10 hidden h-auto w-full sm:block"
            priority={false}
          />

          <dl className="mt-10 grid grid-cols-2 gap-y-8 border-t pt-10 sm:grid-cols-4" style={{ borderColor: "var(--champagne)" }}>
            {POR_DENTRO.numeros.map((item) => (
              <div key={item.rotulo} className="text-center">
                <dt className="serifa" style={{ fontSize: "clamp(2rem, 4.5vw, 2.8rem)", color: "var(--dourado)", lineHeight: 1 }}>
                  {item.numero}
                </dt>
                <dd
                  className="mt-2 text-[0.78rem] uppercase"
                  style={{ letterSpacing: "0.14em", color: "var(--tinta-fraca)" }}
                >
                  {item.rotulo}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- BLOCO 2: o que você desbloqueia ---------- */}
      <section className="px-6 py-16" style={{ background: "var(--papel)" }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center" style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>
            {DESBLOQUEIA.titulo}
          </h2>
          <p className="mt-3 text-center" style={{ color: "var(--tinta-fraca)" }}>
            {DESBLOQUEIA.intro}
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {DESBLOQUEIA.cards.map((card) => (
              <li key={card.titulo} className="surge cartao flex gap-4 p-6">
                <span style={{ color: "var(--dourado)" }} className="mt-0.5 shrink-0">
                  <Icone nome={card.icone} tamanho={26} />
                </span>
                <span>
                  <span className="serifa block text-[1.12rem] font-semibold">{card.titulo}</span>
                  <span className="mt-1 block text-[0.95rem]" style={{ color: "var(--tinta-fraca)" }}>
                    {card.texto}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- BLOCO 3: dor ---------- */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>{DOR.titulo}</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {DOR.casos.map((caso) => (
              <div key={caso.titulo} className="surge cartao p-6">
                <p className="serifa text-[1.12rem] font-semibold">{caso.titulo}</p>
                <p className="mt-2.5 text-[0.95rem]" style={{ color: "var(--tinta-fraca)" }}>{caso.texto}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-12 text-[1.35rem]">{DOR.armadilhas.titulo}</h3>
          <ul className="mt-6 space-y-7">
            {DOR.armadilhas.itens.map((a) => (
              <li key={a.titulo} className="surge border-l-2 pl-5" style={{ borderColor: "var(--dourado)" }}>
                <p className="font-bold" style={{ color: "var(--carvao)" }}>{a.titulo}</p>
                <p className="mt-1.5 text-[0.95rem]" style={{ color: "var(--tinta-fraca)" }}>{a.texto}</p>
              </li>
            ))}
          </ul>

          <p className="serifa mt-10 text-center text-[1.3rem] italic" style={{ color: "var(--carvao)" }}>
            {DOR.virada}
          </p>
        </div>
      </section>

      {/* ---------- Os números, que são o lastro ---------- */}
      <section className="px-6 py-16" style={{ background: "var(--champagne-claro)" }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center" style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>
            {VERDADES.titulo}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {VERDADES.itens.map((v) => (
              <div key={v.numero} className="surge text-center">
                <p
                  className="serifa"
                  style={{ fontSize: "clamp(2.6rem,6vw,3.4rem)", color: "var(--carvao)", fontVariantNumeric: "tabular-nums" }}
                >
                  {v.numero}
                </p>
                <p className="mt-1 font-bold" style={{ color: "var(--carvao)" }}>{v.titulo}</p>
                <p className="mt-2 text-[0.93rem]" style={{ color: "var(--tinta-fraca)" }}>{v.texto}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-xs" style={{ color: "var(--tinta-fraca)" }}>
            {VERDADES.fonte}{" "}
            <Link className="underline underline-offset-2" href="/metodologia/">
              Como isso é apurado
            </Link>
          </p>
        </div>
      </section>

      {/* ---------- A transformação semana a semana ---------- */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>{TRANSFORMACAO.titulo}</h2>
          <p className="mt-3" style={{ color: "var(--tinta-fraca)" }}>{TRANSFORMACAO.intro}</p>

          <ol className="mt-10 space-y-7">
            {TRANSFORMACAO.marcos.map((m) => (
              <li key={m.semana} className="surge">
                <p className="etiqueta">{m.semana}</p>
                <p className="serifa mt-1.5 text-[1.35rem]">{m.promessa}</p>
                <p className="mt-1.5 text-[0.97rem]" style={{ color: "var(--tinta-fraca)" }}>{m.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Antes e depois ---------- */}
      <section className="px-6 py-16" style={{ background: "var(--papel)" }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center" style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>
            {ANTES_E_DEPOIS.titulo}
          </h2>
          <ul className="mt-10 space-y-4">
            {ANTES_E_DEPOIS.linhas.map((l) => (
              <li key={l.antes} className="surge grid gap-3 sm:grid-cols-2">
                <p className="flex gap-2.5 text-[0.95rem]" style={{ color: "var(--tinta-fraca)" }}>
                  <span className="mt-0.5 shrink-0 opacity-60"><Icone nome="errado" tamanho={18} /></span>
                  {l.antes}
                </p>
                <p className="flex gap-2.5 text-[0.95rem] font-medium" style={{ color: "var(--carvao)" }}>
                  <span className="mt-0.5 shrink-0" style={{ color: "var(--dourado)" }}>
                    <Icone nome="certo" tamanho={18} />
                  </span>
                  {l.depois}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- BLOCO 4: autor ---------- */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="surge cartao p-7 sm:p-9">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <Image
                src={AUTHOR.photo}
                alt={`Retrato de ${AUTHOR.name}`}
                width={192}
                height={192}
                className="h-28 w-28 shrink-0 rounded-full object-cover"
                style={{ border: "1px solid var(--champagne)", padding: 4 }}
              />
              <div>
                <p className="etiqueta">Quem assina</p>
                <h2 className="mt-1.5 text-[1.7rem]">{AUTOR.titulo}</h2>
                <p className="serifa mt-1 text-[1.02rem] italic" style={{ color: "var(--tinta-fraca)" }}>
                  {AUTOR.cargo}
                </p>
              </div>
            </div>

            <ul className="mt-7 space-y-2.5">
              {AUTOR.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-[0.95rem]">
                  <span className="mt-0.5 shrink-0" style={{ color: "var(--dourado)" }}>
                    <Icone nome="certo" tamanho={18} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-7 space-y-3">
              {AUTOR.historia.map((p, i) => (
                <p key={i} className="text-[0.97rem]" style={{ color: "var(--tinta-fraca)" }}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Prova social: só existe se houver material real ---------- */}
      {OFERTA.DEPOIMENTOS.length > 0 ? (
        <section className="px-6 py-16" style={{ background: "var(--papel)" }}>
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center" style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>
              Quem já fez as doze semanas
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {OFERTA.DEPOIMENTOS.map((d) => (
                <div key={d.nome} className="surge cartao overflow-hidden">
                  <div className="aspect-video" dangerouslySetInnerHTML={{ __html: d.embed }} />
                  <p className="p-4 text-sm font-medium">{d.nome}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------- A declaração de interesse ---------- */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div
            className="surge p-7"
            style={{ background: "var(--champagne-claro)", borderLeft: "3px solid var(--dourado)", borderRadius: "0 14px 14px 0" }}
          >
            <p className="etiqueta">{DECLARACAO.titulo}</p>
            <div className="mt-3 space-y-3">
              {DECLARACAO.texto.map((p, i) => (
                <p key={i} className="text-[0.97rem]">{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Para quem não serve ---------- */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>{NAO_E_PARA.titulo}</h2>
          <p className="mt-3" style={{ color: "var(--tinta-fraca)" }}>{NAO_E_PARA.intro}</p>
          <ul className="mt-6 space-y-3">
            {NAO_E_PARA.casos.map((c) => (
              <li key={c} className="surge flex gap-3 text-[0.97rem]">
                <span className="mt-0.5 shrink-0 opacity-50"><Icone nome="errado" tamanho={18} /></span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- BLOCO 7: a oferta ---------- */}
      <section id="oferta" className="px-6 py-16" style={{ background: "var(--papel)" }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center" style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>
            {CONTEUDO.titulo}
          </h2>

          <ul className="mt-10 space-y-4">
            {CONTEUDO.itens.map((item) => (
              <li key={item.titulo} className="surge flex gap-3.5">
                <span className="mt-1 shrink-0" style={{ color: "var(--dourado)" }}>
                  <Icone nome="certo" tamanho={20} />
                </span>
                <span>
                  <span className="serifa block text-[1.1rem] font-semibold">{item.titulo}</span>
                  <span className="mt-0.5 block text-[0.95rem]" style={{ color: "var(--tinta-fraca)" }}>
                    {item.texto}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {OFERTA.mostrarAncoragem ? (
            <div className="surge cartao mt-10 p-6" style={{ background: "var(--champagne-claro)" }}>
              <p className="etiqueta">O que isso vale, item a item</p>
              <ul className="mt-4 space-y-2">
                {OFERTA.ancoragem.map((a) => (
                  <li key={a.item} className="flex flex-wrap justify-between gap-2 text-[0.93rem]">
                    <span>{a.item}</span>
                    <span className="tabular-nums line-through" style={{ color: "var(--tinta-fraca)" }}>
                      R$ {a.valor}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className="mt-4 flex flex-wrap justify-between gap-2 border-t pt-4 text-[0.95rem] font-bold"
                style={{ borderColor: "var(--champagne)" }}
              >
                <span>Valor total</span>
                <span className="tabular-nums line-through" style={{ color: "var(--tinta-fraca)" }}>
                  R$ {valorAncorado()}
                </span>
              </p>
            </div>
          ) : null}

          <div className="mt-10 text-center">
            <p className="etiqueta">Hoje, por</p>
            <p
              className="serifa mt-2"
              style={{ fontSize: "clamp(3rem,9vw,4.5rem)", color: "var(--carvao)", lineHeight: 1 }}
            >
              {OFERTA.precoEscrito}
            </p>
            <p className="mt-2 text-[0.95rem]" style={{ color: "var(--tinta-fraca)" }}>
              {OFERTA.formaDeCobranca}, acesso sem prazo
              {OFERTA.mostrarAncoragem ? `, uma economia de R$ ${economiaEmReais()}` : ""}
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Cta>Garantir meu acesso agora</Cta>
              <p className="text-sm" style={{ color: "var(--tinta-fraca)" }}>{MICROCOPY}</p>
            </div>
          </div>

          <div
            className="surge mt-12 flex flex-col items-center gap-3 p-7 text-center"
            style={{ border: "1px solid var(--champagne)", borderRadius: 14 }}
          >
            <span style={{ color: "var(--dourado)" }}><Icone nome="escudo" tamanho={44} /></span>
            <p className="serifa text-[1.35rem]">
              Garantia incondicional de {OFERTA.diasDeGarantia} dias
            </p>
            <p className="max-w-lg text-[0.95rem]" style={{ color: "var(--tinta-fraca)" }}>
              Você entra, olha tudo, e se não for para você, pede o reembolso sem
              precisar justificar nada. Prefiro devolver o seu dinheiro a ter
              alguém carregando um material que não serviu.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- BLOCO 8: FAQ ---------- */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center" style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)" }}>
            Perguntas que todo mundo faz antes
          </h2>
          <div className="mt-10 space-y-2">
            {FAQ.map((f) => (
              <details key={f.pergunta} className="surge cartao px-5 py-4">
                <summary className="cursor-pointer list-none font-bold" style={{ color: "var(--carvao)" }}>
                  {f.pergunta}
                </summary>
                <p className="mt-3 text-[0.95rem]" style={{ color: "var(--tinta-fraca)" }}>
                  {f.resposta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Lista de espera, enquanto a compra não abre ---------- */}
      {!ABERTO ? (
        <section id="avise-me" className="px-6 py-16" style={{ background: "var(--champagne-claro)" }}>
          <div className="mx-auto max-w-2xl">
            <CapturaAlerta
              origem="/jornada/"
              chamada={{
                titulo: "Avise quando a Jornada abrir",
                texto:
                  "Deixe o seu e-mail e você recebe o aviso no dia em que a compra abrir, com o preço de lançamento garantido. Nada além disso, e você sai da lista quando quiser.",
              }}
              textoDoBotao="Quero ser avisado"
            />
          </div>
        </section>
      ) : null}

      {/* ---------- BLOCO 9: último CTA ---------- */}
      <section className="px-6 py-20 text-center" style={{ background: "var(--carvao)" }}>
        <div className="mx-auto max-w-2xl">
          <h2 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", color: "var(--papel)" }}>
            {ULTIMO_CTA.titulo}
          </h2>
          <p className="serifa mt-5 text-[1.2rem] italic" style={{ color: "var(--champagne)" }}>
            {ULTIMO_CTA.texto}
          </p>
          <p className="mt-4 text-[0.97rem]" style={{ color: "#B8B2A6" }}>
            {ULTIMO_CTA.lembrete}
          </p>
          <div className="mt-9 flex flex-col items-center gap-3">
            <Cta>Começar hoje por {OFERTA.precoEscrito}</Cta>
            <p className="text-sm" style={{ color: "#B8B2A6" }}>{MICROCOPY}</p>
          </div>
        </div>
      </section>

      {/* ---------- BLOCO 10: disclaimer e rodapé ---------- */}
      <footer className="px-6 py-14" style={{ background: "var(--creme)", borderTop: "1px solid var(--champagne)" }}>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="serifa text-[1.15rem]">{SITE.name}</p>
              <p className="mt-2 text-sm" style={{ color: "var(--tinta-fraca)" }}>
                Conteúdo e triagem de editais para empresas fornecedoras do setor público.
              </p>
            </div>

            <nav aria-label="Links legais">
              <p className="etiqueta">Institucional</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a className="underline underline-offset-4" href={`mailto:${CONTATO.email}`}>Contato</a></li>
                <li><Link className="underline underline-offset-4" href="/privacidade/">Política de Privacidade</Link></li>
                <li><Link className="underline underline-offset-4" href="/termos/">Termos de Uso</Link></li>
                <li><Link className="underline underline-offset-4" href="/aviso-legal/">Aviso legal</Link></li>
              </ul>
            </nav>

            <div>
              <p className="etiqueta">O produto</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link className="underline underline-offset-4" href="/sobre/">Sobre</Link></li>
                <li><Link className="underline underline-offset-4" href="/blog/">Guias</Link></li>
                <li><Link className="underline underline-offset-4" href="/metodologia/">Metodologia</Link></li>
                <li><Link className="underline underline-offset-4" href="/precos/">Planos da assinatura</Link></li>
              </ul>
            </div>

            <div>
              <p className="etiqueta">Direitos</p>
              <p className="mt-3 text-sm" style={{ color: "var(--tinta-fraca)" }}>
                &copy; {ano} {SITE.name}. Todos os direitos reservados.
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-3 border-t pt-8" style={{ borderColor: "var(--champagne)" }}>
            {DISCLAIMER.map((p, i) => (
              <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--tinta-fraca)" }}>
                {p}
              </p>
            ))}
            <p className="text-xs leading-relaxed" style={{ color: "var(--tinta-fraca)" }}>
              Dúvida, correção ou pedido relativo aos seus dados:{" "}
              <a className="underline underline-offset-2" href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a>.
            </p>
          </div>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
