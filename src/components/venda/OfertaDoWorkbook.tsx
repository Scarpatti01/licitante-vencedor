import Image from "next/image";
import Link from "next/link";
import { OFERTA } from "@/lib/jornada/oferta";

/**
 * O convite ao Workbook, para as páginas abertas ao público.
 *
 * Dois cartões lado a lado: a imagem do produto à esquerda, a chamada e o
 * preço à direita. No celular eles empilham, imagem em cima.
 *
 * POR QUE O PREÇO VEM DE `OFERTA`, E NÃO ESCRITO AQUI
 *
 * Este bloco se repete em mais de dez páginas. Preço escrito à mão em cada uma
 * é a receita conhecida para o cliente ler R$ 47 num guia, R$ 57 noutro, e
 * pagar um terceiro valor no checkout. `oferta.ts` existe para ser a única
 * fonte, e o valor riscado sai de `ancoragem`, onde o Workbook já estava
 * avaliado em R$ 97 desde antes desta seção existir.
 *
 * O QUE O TEXTO PODE AFIRMAR
 *
 * Só o que está no livro e no sistema: as 126 páginas, as 12 semanas, as 8
 * folhas de trabalho e os 89 termos do glossário. Nenhuma promessa de
 * resultado, porque licitação é disputa aberta e quem promete contrato promete
 * o que não depende dele.
 */

/**
 * A arte do produto.
 *
 * Fica numa constante porque trocar a imagem é decisão do dono e não deve
 * exigir procurar `<Image>` no meio do JSX.
 */
const ARTE = {
  src: "/workbook-do-licitante.webp",
  largura: 2000,
  altura: 1250,
  alt:
    "Três páginas do Workbook do Licitante: a capa, a folha de habilitação com a lista " +
    "de documentos para conferir antes de cada envio, e duas colunas do glossário.",
};

/** O valor com que o Workbook já era ancorado na página de venda. */
const VALOR_ANCORADO = OFERTA.ancoragem[0].valor;

/**
 * O que a pessoa recebe, e o acesso à Jornada vem primeiro de propósito.
 *
 * O R$ 47 não compra um PDF solto: compra a Jornada de 12 Semanas, e o
 * Workbook vem junto dela. Anunciar só o livro venderia por menos do que a
 * oferta é, e deixaria o comprador surpreso com o que encontrou depois.
 * Cada item aqui existe em `OFERTA.ancoragem`.
 */
const ENTREGAS = [
  "Acesso à Jornada de 12 Semanas dentro do sistema, com o seu progresso salvo",
  "8 folhas de trabalho para preencher e reusar a cada edital",
  "Exportação das suas respostas em PDF",
  "Glossário de 89 termos, para a leitura não travar na primeira palavra",
];

export function OfertaDoWorkbook() {
  return (
    // O container próprio deixa o bloco cair certo em qualquer página, dentro
    // ou fora do `<main>`, sem depender da largura que cada uma escolheu. A
    // medida é a mesma dos guias, senão o cartão desalinha do texto acima dele.
    <div className="mx-auto my-16 max-w-3xl px-6">
      <aside
        aria-labelledby="oferta-do-workbook"
        className="overflow-hidden rounded-2xl border border-[#1B2A47] bg-[#0C1B33]"
      >
        <div className="grid items-stretch md:grid-cols-2">
          <div className="flex items-center justify-center bg-[#030814] p-6 md:p-8">
            <Image
              src={ARTE.src}
              alt={ARTE.alt}
              width={ARTE.largura}
              height={ARTE.altura}
              sizes="(max-width: 768px) 100vw, 360px"
              className="h-auto w-full rounded-xl"
            />
          </div>

          <div className="flex flex-col justify-center p-6 md:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#D9B65F] uppercase">
              O Workbook do Licitante
            </p>

            <h2
              id="oferta-do-workbook"
              className="mt-3 text-2xl leading-tight font-semibold text-white"
            >
              Quem perde licitação quase nunca perde no preço. Perde no
              documento que faltou.
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-[#C7D0DE]">
              126 páginas para preencher, e não para ler, mais o acesso à{" "}
              {OFERTA.nome} dentro do sistema. O caminho inteiro, do primeiro
              cadastro ao contrato assinado, sem depender da sua memória.
            </p>

            <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-[#C7D0DE]">
              {ENTREGAS.map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9B65F]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-baseline gap-3">
              <span className="text-sm text-[#8C9AB1] line-through">
                R$ {VALOR_ANCORADO}
              </span>
              <span className="text-3xl font-semibold text-[#D9B65F]">
                {OFERTA.precoEscrito}
              </span>
              <span className="text-sm text-[#C7D0DE]">
                {OFERTA.formaDeCobranca}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#8C9AB1]">
              O Workbook e o acesso à {OFERTA.nome} vêm juntos, com{" "}
              {OFERTA.diasDeGarantia} dias de garantia.
            </p>

            <div className="mt-6">
              <Link
                href="/jornada/"
                className="inline-block rounded-lg bg-[#D9B65F] px-6 py-3 font-semibold text-[#0C1B33]"
              >
                Saiba mais
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
