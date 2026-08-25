import Link from "next/link";
import { PLANOS, emReais } from "@/lib/precos";

/**
 * O convite para o produto pago, no fim de todo post.
 *
 * ## Por que ele existe separado da captura
 *
 * `CapturaAlerta` vende o TESTE, e ele é honesto sobre o que entrega: a lista
 * dos editais publicados que combinam com o recorte e o ramo que a pessoa
 * pediu, por catorze dias, no plano Leve. Ponto.
 *
 * O que o plano de lista NÃO faz é ler o documento e conferir o que falta na
 * habilitação. Isso são os planos com leitura, e misturar as duas descrições
 * num formulário que diz "sem cartão" foi exatamente o defeito que o dono
 * apontou em 23/08: o texto em negrito descrevia a leitura do edital e a
 * checagem de cadastro, e a letra miúda logo abaixo dizia que era de graça.
 * Quem lê acredita na promessa maior e descobre a diferença depois, que é a
 * pior hora.
 *
 * Então cada post passa a ter os dois, e cada um diz a verdade do seu lado: a
 * captura do teste no meio do texto, onde a dor aparece, e este cartão no fim,
 * para quem chegou até lá querendo mais.
 *
 * A troca de 25/08 não mudou essa divisão de trabalho — mudou o que está do
 * lado de cá. Onde se lia "gratuito" agora se lê "teste de 14 dias", e a
 * assimetria que justifica os dois blocos continua sendo a leitura do
 * documento.
 *
 * ## O preço vem de `precos.ts`
 *
 * Não é enfeite de arquitetura. O valor mora num lugar só porque site que
 * anuncia um preço e cobra outro perde o cliente e ganha uma disputa no banco.
 * Se o plano mais barato mudar, este cartão muda junto, sem ninguém lembrar.
 */

const MAIS_BARATO = PLANOS.reduce((menor, plano) =>
  plano.mensalidadeEmCentavos < menor.mensalidadeEmCentavos ? plano : menor,
);

export function CardAssinatura() {
  return (
    <aside className="mt-12 rounded-xl border border-[var(--brass)] bg-[var(--brass-soft)] p-6">
      <p className="text-lg font-semibold text-[var(--brass)]">
        Quer isso pronto, todo dia útil?
      </p>

      <p className="mt-3 leading-relaxed">
        O teste manda os editais abertos dos recortes que você escolher, com
        nota de aderência. Os planos com leitura vão além: os mais compatíveis
        chegam com o documento lido: o que exigem, o que falta no seu cadastro
        e qual é o prazo.
      </p>

      <p className="mt-3 leading-relaxed">
        Você abre a lista e decide só uma coisa: se participa.
      </p>

      <Link
        href="/precos/"
        className="mt-5 inline-block rounded-md bg-[var(--brass)] px-5 py-2.5 text-sm font-medium text-[var(--brass-soft)]"
      >
        Ver planos e preços
      </Link>

      <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
        A partir de {emReais(MAIS_BARATO.mensalidadeEmCentavos)} por mês, sem
        fidelidade e com cancelamento pelo painel. A cobrança ainda não abriu, e
        a página de preços explica por quê.
      </p>
    </aside>
  );
}
