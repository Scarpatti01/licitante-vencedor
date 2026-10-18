import type { Metadata } from "next";
import Link from "next/link";
import { ReenviarConvite } from "@/components/jornada/ReenviarConvite";
import { RodapeSite } from "@/components/RodapeSite";
import { DESTINO_DA_COMPRA } from "@/lib/email/mensagens";
import { CONTATO } from "@/lib/site";

/**
 * A primeira tela depois de pagar na Hotmart.
 *
 * O dono configura a página de obrigado do produto na Hotmart para apontar
 * para cá. A tela tem um trabalho só: levar quem acabou de pagar até a área
 * dele, onde estão os dois arquivos do livro e a Jornada, com o menor número
 * de decisões no caminho.
 *
 * ## Por que os arquivos não são baixados daqui
 *
 * Esta página é pública: qualquer pessoa com o endereço chega nela, tenha
 * pago ou não. Um link de download aqui entregaria o livro a quem nunca
 * comprou. Na área logada o download confere a compra e sai carimbado com o
 * nome de quem baixou, então o caminho certo é um só: criar a conta e baixar
 * lá dentro. A tela promete isso, e não mais que isso.
 *
 * ## O e-mail da compra
 *
 * A compra é reconhecida pelo e-mail usado na Hotmart. É o erro mais provável
 * de quem paga e não consegue entrar, então ele aparece no passo 1, em letra,
 * e não só num rodapé. Se a URL trouxer `email`, o formulário já nasce
 * preenchido; se não trouxer, nada quebra.
 */

export const metadata: Metadata = {
  title: "Compra confirmada",
  // Só faz sentido para quem acabou de pagar; indexada, confundiria quem procura.
  robots: { index: false, follow: false },
};

export default async function BoasVindas({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  const { email } = await searchParams;
  const emailDaCompra =
    typeof email === "string" && email.includes("@") ? email : null;

  const criarConta =
    `/criar-conta/?proximo=${encodeURIComponent(DESTINO_DA_COMPRA)}` +
    (emailDaCompra ? `&email=${encodeURIComponent(emailDaCompra)}` : "");
  const entrar = `/entrar/?proximo=${encodeURIComponent(DESTINO_DA_COMPRA)}`;

  return (
    <>
      <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
          Compra confirmada
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
          Obrigado. Seu Workbook e a Jornada estão esperando por você.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
          Tudo fica num lugar só, a sua área no site: o livro em PDF e em EPUB e
          as 12 semanas da Jornada. São três passos, e o primeiro leva um
          minuto.
        </p>

        <ol className="mt-10 space-y-5">
          <li className="rounded-xl border bg-[var(--surface)] p-6">
            <p className="text-sm font-semibold text-[var(--muted)]">Passo 1</p>
            <h2 className="mt-1 text-xl font-semibold">
              Crie a sua conta com o e-mail da compra
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              É pelo e-mail que você usou na Hotmart que a sua compra é
              reconhecida. Uma conta com outro endereço não encontra o acesso.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link
                href={criarConta}
                className="rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
              >
                Criar minha conta
              </Link>
              <Link
                href={entrar}
                className="text-sm underline underline-offset-4"
              >
                Já tenho conta: entrar
              </Link>
            </div>
          </li>

          <li className="rounded-xl border bg-[var(--surface)] p-6">
            <p className="text-sm font-semibold text-[var(--muted)]">Passo 2</p>
            <h2 className="mt-1 text-xl font-semibold">Baixe o livro</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Ao entrar, você já cai na sua área. No alto da página estão os
              dois botões: <strong>Baixar em PDF</strong>, para imprimir e
              preencher à mão, e <strong>Baixar em EPUB</strong>, para ler no
              celular ou no tablet (no Kindle, pelo Enviar para Kindle da Amazon). O seu exemplar sai com o seu
              nome, e você baixa de novo quando quiser.
            </p>
          </li>

          <li className="rounded-xl border bg-[var(--surface)] p-6">
            <p className="text-sm font-semibold text-[var(--muted)]">Passo 3</p>
            <h2 className="mt-1 text-xl font-semibold">Comece a semana 1</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Na mesma página está a Jornada, uma semana por vez. Os exercícios
              ficam salvos na sua conta, e você imprime as suas respostas quando
              quiser.
            </p>
          </li>
        </ol>

        <section className="mt-12 border-t pt-8">
          <h2 className="text-base font-semibold">Se algo não der certo</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
            <li>
              Mandamos também um e-mail para o endereço da compra, com o assunto
              &ldquo;Sua compra está confirmada&rdquo; e o mesmo botão. Se não
              achar, confira o spam e as promoções, ou peça de novo logo abaixo.
            </li>
            <li>
              Se você acabou de pagar, a confirmação da Hotmart pode levar
              alguns minutos para chegar até nós. Se entrar e ainda não vir a
              Jornada, espere um pouco e recarregue.
            </li>
            <li>
              Precisa de ajuda? Escreva para{" "}
              <a
                className="underline underline-offset-4"
                href={`mailto:${CONTATO.email}`}
              >
                {CONTATO.email}
              </a>{" "}
              com o e-mail da compra.
            </li>
          </ul>

          <h3 className="mt-8 text-sm font-semibold">
            Não recebeu o e-mail? Peça de novo
          </h3>
          <div className="mt-3">
            <ReenviarConvite />
          </div>
        </section>
      </main>
      {/* Quem acabou de comprar o Workbook não precisa ver a oferta dele. */}
      <RodapeSite oferta={false} />
    </>
  );
}
