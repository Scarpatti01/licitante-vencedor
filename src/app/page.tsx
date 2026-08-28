import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { GUIAS_PUBLICADOS } from "@/lib/guias";
import { AutorBio } from "@/components/AutorBio";
import { numerosDaColeta, pracasParaBusca } from "@/lib/regioes";
import { BuscaDePracas } from "@/components/BuscaDePracas";
import { RodapeSite } from "@/components/RodapeSite";
import { ChuvaDeDados } from "@/components/ChuvaDeDados";
import { dataDeBrasilia } from "@/lib/dominio/datas";
import { Logo } from "@/components/Logo";

/**
 * O que o livro entrega, em coisas que existem dentro dele.
 *
 * Cada linha é conferível abrindo o PDF: as doze semanas são a Folha D, as
 * folhas de trabalho são os Anexos, e o glossário tem os 89 verbetes contados.
 * Promessa de resultado não entra aqui, porque licitação é disputa aberta e o
 * livro ensina processo, não vitória.
 */
const LIVRO_ENTREGA = [
  "As doze semanas guiadas, na ordem em que uma coisa depende da outra",
  "7 folhas de trabalho para preencher e reusar: habilitação, leitura de edital, acompanhamento de contrato e o registro das disputas de que você participou",
  "Um glossário de 89 termos do edital, para a leitura não travar na primeira palavra que ninguém explicou",
];

const PILARES = [
  {
    titulo: "Triagem diária do PNCP",
    texto:
      "Varremos as publicações do Portal Nacional de Contratações Públicas e separamos o que serve para o seu CNAE, o seu porte e a sua região. O que não serve, você nem vê.",
  },
  {
    titulo: "Checklist de habilitação",
    texto:
      "Cada edital chega com a lista de documentos exigidos, comparada com o que a sua empresa já tem em dia. Certidão vencida deixa de ser descoberta na hora da sessão.",
  },
  {
    titulo: "Prazo e risco na frente",
    texto:
      "Data da sessão, tempo restante e os pontos do edital que mais desclassificam fornecedor. Em português, sem juridiquês.",
  },
];

export default function Home() {
  const coleta = numerosDaColeta();

  return (
    <div className="min-h-screen">
      {/*
        O cabeçalho da home mora DENTRO do hero, e não acima dele.

        Separado, ele deixava uma emenda dura: barra clara colada num hero preto,
        exatamente na linha que o visitante olha primeiro. Absorvido, a primeira
        dobra vira um bloco só, e a chuva passa por trás do nome do site.
      */}
      {/*
        ## Sem `overflow-hidden` aqui, e com `z-30`

        As duas coisas consertam o mesmo defeito, que foi visto em produção: o
        painel da busca aparecia CORTADO na altura do cabeçalho — digitando
        "rio", "Rio Largo (AL)" ficava metade visível e metade recortada.

        `overflow-hidden` foi posto para conter a chuva, e recortava junto o
        painel da busca, que é posicionado fora da caixa do cabeçalho. Não era
        necessário: o canvas é `absolute inset-0`, então ele já está limitado à
        caixa por construção — não havia nada para conter.

        `z-30` resolve a segunda metade: o hero vem DEPOIS no documento e, com
        os dois criando contexto de empilhamento no mesmo nível, ele pintaria
        por cima do painel. Tirar só o recorte deixaria a lista aparecendo por
        trás do título — trocaria um defeito por outro.
      */}
      <header className="relative z-30 bg-[#030814]">
        <ChuvaDeDados />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[#030814] via-[#030814]/85 to-[#030814]/40"
        />

        <div className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          {/*
            `role="img"` não é enfeite: sem ele o `aria-label` é IGNORADO.
            Leitor de tela só honra rótulo em elemento com papel semântico, e
            `span` não tem nenhum — o Lighthouse acusa como
            `aria-prohibited-attr`.
            
            Aqui o logo não é link porque esta É a home, então não há `<a>` para
            carregar o rótulo. E ele precisa de rótulo: o SVG é `aria-hidden` e
            o nome escrito some no celular (`hidden sm:inline`), de modo que sem
            isto quem usa leitor de tela não recebe nada no lugar do logo.
          */}
          <span role="img" aria-label={SITE.name}>
            <Logo />
          </span>
          <nav className="flex items-center gap-4 text-sm text-slate-300 sm:gap-6">
            <Link href="/blog/" className="underline-offset-4 hover:underline">Guias</Link>
            {/* Some no celular para o campo de busca caber sem espremer o nome
                do site; a página continua alcançável pelo rodapé. */}
            <a href="/sobre/" className="hidden underline-offset-4 hover:underline sm:inline">Sobre</a>
            <BuscaDePracas pracas={pracasParaBusca()} className="w-36 sm:w-56" />
            {/* Não escondido no celular, diferente de "Sobre": login e cadastro
                já funcionam, e era o único caminho que faltava no site público. */}
            <Link href="/entrar/" className="shrink-0 font-medium underline-offset-4 hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/*
          O hero é escuro nos dois temas, de propósito.

          A chuva de caracteres só existe sobre fundo profundo — em tema claro
          ela vira poluição cinza. Em vez de renderizar duas versões e manter as
          duas, esta faixa declara a própria cor e o resto da página segue o tema
          do visitante. É a única seção do site que faz isso.

          O gradiente é pintado no CSS, e não pelo canvas: assim ele aparece no
          primeiro quadro, antes de qualquer JavaScript — e continua lá se o
          canvas nunca montar.
        */}
        <section className="relative isolate overflow-hidden bg-[#030814] pb-20 sm:pb-28">
          <ChuvaDeDados />

          {/*
            O véu entre a chuva e o texto. Sem ele o contraste do parágrafo cai
            abaixo do mínimo legível justamente onde uma coluna brilhante passa,
            e o texto pisca conforme a animação. Fixo, e não animado, para o
            contraste ser uma garantia e não uma média.
          */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#030814] via-[#030814]/85 to-[#030814]/40"
          />

          <div className="relative mx-auto max-w-5xl px-6 pt-14 sm:pt-20">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium tracking-wide text-sky-300 uppercase">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-sky-400" />
              {coleta.editais.toLocaleString("pt-BR")} editais {coleta.abrangencia}
              , varridos hoje
            </p>

            <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-white sm:text-6xl">
              Os editais que a sua empresa pode ganhar, já lidos.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              Todo dia útil, às 7h, você recebe os editais do PNCP compatíveis
              com o seu perfil, ordenados por aderência. Os mais aderentes vão
              com o documento lido: o que exigem de habilitação, o que falta no
              seu cadastro, o prazo e o risco. Você só decide se participa.
            </p>

            <p className="mt-6 max-w-2xl leading-relaxed text-slate-400">
              Não é mais uma lista de licitações para você garimpar. No topo da
              sua lista a leitura já está feita, para a decisão sair em minutos
              em vez de tomar a manhã inteira de alguém — e cada edital diz se
              foi lido ou se ainda está só no que o órgão publicou.
            </p>

            {/*
              O botão principal leva a PREÇOS, e não ao teste.

              Era a incoerência mais cara da página: o texto acima vende a
              leitura diária comparada ao perfil da empresa — que é o produto
              pago — e o botão entregava o alerta por cidade, que não lê nada.
              Quem clicava atrás do que acabou de ler recebia outra coisa, e a
              única forma de descobrir o preço era não existir.

              Em 25/08 o botão do meio deixou de oferecer o alerta gratuito, que
              acabou, e passou a oferecer os 14 dias de teste. A hierarquia é a
              mesma e o destino também (`/alerta-de-licitacao/`, reescrita): o
              principal mostra o preço, o do meio dá o caminho para quem quer
              ver antes de decidir.
            */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/precos/"
                className="rounded-md bg-sky-400 px-5 py-2.5 text-sm font-semibold text-[#030814] transition-colors hover:bg-sky-300"
              >
                Ver planos e preços
              </Link>
              <Link
                href="/alerta-de-licitacao/"
                className="rounded-md border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-400"
              >
                Testar 14 dias, sem cartão
              </Link>
              <Link
                href="/como-funciona/"
                className="rounded-md border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-400"
              >
                Como funciona
              </Link>
            </div>

            {/*
              A procedência do número, junto do número.

              É a mesma regra das páginas regionais: toda afirmação medida diz
              quando foi medida e de onde veio. Sem esta linha, a contagem do
              hero é propaganda; com ela, é um dado que o visitante pode conferir
              na fonte oficial.
            */}
            <p className="mt-8 text-xs text-slate-500">
              Coleta própria do{" "}
              <a href="https://www.pncp.gov.br/" rel="noopener" className="underline underline-offset-4">
                Portal Nacional de Contratações Públicas
              </a>{" "}
              em {dataDeBrasilia(coleta.medidoEm)} · {coleta.siglas.join(", ")} ·{" "}
              <Link href="/metodologia/" className="underline underline-offset-4">
                como medimos
              </Link>
            </p>
          </div>
        </section>

        <section className="border-y bg-[var(--surface)]">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:grid-cols-3">
            {PILARES.map((pilar) => (
              <div key={pilar.titulo}>
                <h2 className="text-lg font-semibold tracking-tight">
                  {pilar.titulo}
                </h2>
                <p className="mt-3 leading-relaxed text-[var(--muted)]">
                  {pilar.texto}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Um acervo de dez anos sendo reescrito
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--muted)]">
            O Licitante Vencedor publica sobre licitações e contratações
            públicas desde {SITE.foundingYear}. Todo esse acervo está sendo
            revisado e reescrito para a Lei 14.133/2021. Estes já estão no ar:
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {GUIAS_PUBLICADOS.map((guia) => (
              <article key={guia.href}>
                <h3 className="font-semibold tracking-tight">
                  <a href={guia.href} className="underline-offset-4 hover:underline">
                    {guia.titulo}
                  </a>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {guia.resumo}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-8">
            <Link href="/blog/" className="underline underline-offset-4">
              Ver todos os guias
            </Link>
          </p>
        </section>

        {/*
          O livro entra depois dos pilares e antes do autor, que é onde a
          pessoa já entendeu o que o produto faz e ainda não sabe o que leva
          junto. A imagem é composta de páginas reais do PDF, e não de uma
          ilustração: o que aparece legível ali existe no livro.
        */}
        <section className="border-t bg-[#030814]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-14 lg:py-20">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[#D9B65F] uppercase">
                Incluído na assinatura
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
                Do primeiro cadastro ao contrato assinado, sem depender da sua
                memória
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-[#C7D0DE]">
                O <strong className="font-semibold text-white">Workbook do Licitante</strong>{" "}
                é o caminho inteiro em 126 páginas, escrito para quem nunca
                disputou e ainda serve a quem já disputa. Ele vai junto com a
                assinatura, sem custo à parte.
              </p>

              <ul className="mt-7 space-y-3 text-[#C7D0DE]">
                {LIVRO_ENTREGA.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9B65F]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/precos/"
                  className="rounded-lg bg-[#D9B65F] px-5 py-3 font-semibold text-[#0C1B33]"
                >
                  Ver os planos
                </Link>
                <Link href="/jornada/" className="text-sm text-[#C7D0DE] underline underline-offset-4">
                  Ou comprar só o livro e a jornada
                </Link>
              </div>
            </div>

            <Image
              src="/workbook-do-licitante.webp"
              alt="Três páginas do Workbook do Licitante: a capa, a folha de habilitação com a lista de documentos para conferir antes de cada envio, e duas colunas do glossário."
              width={2000}
              height={1250}
              sizes="(max-width: 1024px) 100vw, 620px"
              className="h-auto w-full rounded-xl"
            />
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <AutorBio variante="home" />
          </div>
        </section>
      </main>

      {/*
        O rodapé próprio da home virou o global. Ele já dizia a ressalva
        jurídica, mas era o único do site: as outras 26 páginas públicas
        terminavam sem aviso legal, sem contato e sem saída.
      */}
      {/* Sem a oferta do Workbook: a home já tem a sua própria seção do Workbook, maior que este bloco. */}
      <RodapeSite oferta={false} />
    </div>
  );
}
