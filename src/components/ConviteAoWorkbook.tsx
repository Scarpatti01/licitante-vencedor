import Link from "next/link";
import { OFERTA } from "@/lib/jornada/oferta";

/**
 * O Workbook no fim do post, logo acima do cartão de assinatura.
 *
 * ## Por que aqui, e não só no rodapé
 *
 * Até 17/10 o Workbook aparecia nos posts apenas no bloco do rodapé, depois do
 * "Continue" e de tudo o mais. O cartão de assinatura, que é o que o leitor via
 * no fim do texto, leva a uma página que hoje diz que ainda não dá para
 * assinar. O Workbook dá: o checkout está aberto. Então quem termina o post
 * querendo um próximo passo precisa ver, no mesmo lugar, o produto que pode
 * comprar agora.
 *
 * É uma chamada curta, não uma segunda vitrine: a vitrine completa continua no
 * rodapé (`OfertaDoWorkbook`). Preço e garantia saem de `OFERTA`, a única
 * fonte, e o texto não promete nada que o livro não tenha; a frase "do primeiro
 * cadastro ao contrato assinado" é a mesma que a home já usa para ele.
 */
export function ConviteAoWorkbook() {
  return (
    <aside className="mt-12 rounded-xl border p-6">
      <p className="text-lg font-semibold">
        Prefere aprender o caminho inteiro, no seu ritmo?
      </p>

      <p className="mt-3 leading-relaxed">
        O {OFERTA.nomeCompleto} leva você do primeiro cadastro ao contrato
        assinado, com folhas de trabalho para preencher a cada edital.{" "}
        {OFERTA.precoEscrito}, {OFERTA.formaDeCobranca}, com{" "}
        {OFERTA.diasDeGarantia} dias de garantia.
      </p>

      {/*
        A cor da borda vai em `style` porque `* { border-color }`, em
        `globals.css`, fica fora de camada e vence a classe `border-[cor]`.
      */}
      <Link
        href="/jornada/"
        style={{ borderColor: "var(--brass)" }}
        className="mt-5 inline-block rounded-md border px-5 py-2.5 text-sm font-medium text-[var(--brass)]"
      >
        Conhecer o Workbook
      </Link>
    </aside>
  );
}
