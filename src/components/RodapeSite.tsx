import Link from "next/link";
import { CONTATO, SITE } from "@/lib/site";

/**
 * O rodapé de todas as páginas públicas.
 *
 * ## Ele existia só na home
 *
 * Vinte e sete páginas públicas, e o rodapé estava numa. Nas outras vinte e seis
 * o conteúdo simplesmente acabava: sem aviso legal, sem contato, sem caminho de
 * saída. Quem chegava por busca — que é como quase todo mundo chega nos guias —
 * lia o texto e batia no fim da página sem nada para fazer depois.
 *
 * O custo não é só de navegação. As páginas legais precisam estar alcançáveis de
 * qualquer lugar do site: é assim que o visitante confere quem está por trás
 * antes de entregar o e-mail, e é a expectativa de qualquer comprador B2B que
 * avalie o fornecedor.
 *
 * ## Por que os links legais vêm primeiro na ordem do HTML
 *
 * A coluna legal é a primeira do documento — não a última — porque é ela que o
 * leitor de tela alcança primeiro ao entrar no rodapé, e é a que responde à
 * pergunta que trava a decisão: *com quem eu estou falando, e o que vocês fazem
 * com o meu dado?* No layout de várias colunas a ordem visual é a mesma; num
 * celular, a coluna legal fica no topo do bloco em vez do fim.
 *
 * ## A ressalva jurídica continua aqui, e não some no rodapé
 *
 * Ela é a mesma frase que a home já trazia, e a razão de estar em TODA página
 * agora é que ela é uma promessa do produto: nunca prometer vitória, nunca
 * substituir advogado. Uma ressalva que aparece só na home é uma ressalva que a
 * maioria dos visitantes nunca vê, porque a maioria nunca passa pela home.
 */

const PRODUTO = [
  { href: "/alerta-de-licitacao/", texto: "Alerta de licitações" },
  { href: "/como-funciona/", texto: "Como funciona" },
  { href: "/metodologia/", texto: "Como medimos" },
  { href: "/portais-de-licitacao/#pracas", texto: "Praças medidas" },
];

const CONTEUDO = [
  { href: "/blog/", texto: "Guias" },
  { href: "/lei-14133/", texto: "Lei 14.133" },
  { href: "/habilitacao/", texto: "Habilitação" },
  { href: "/vender-para-o-governo/", texto: "Vender para o governo" },
];

const LEGAL = [
  { href: "/privacidade/", texto: "Privacidade e LGPD" },
  { href: "/termos/", texto: "Termos de uso" },
  { href: "/aviso-legal/", texto: "Aviso legal" },
  { href: "/sobre/", texto: "Quem somos" },
];

function Coluna({
  titulo,
  itens,
}: {
  titulo: string;
  itens: readonly { href: string; texto: string }[];
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold tracking-wide uppercase">{titulo}</h2>
      <ul className="mt-3 space-y-2">
        {itens.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch={false}
              className="underline-offset-4 hover:underline"
            >
              {item.texto}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RodapeSite() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto max-w-5xl px-6 py-12 text-sm text-[var(--muted)]">
        <div className="grid gap-8 sm:grid-cols-3">
          <Coluna titulo="Transparência" itens={LEGAL} />
          <Coluna titulo="Produto" itens={PRODUTO} />
          <Coluna titulo="Conteúdo" itens={CONTEUDO} />
        </div>

        <div className="mt-10 border-t pt-8">
          <p className="font-medium text-[var(--foreground)]">{SITE.name}</p>

          <p className="mt-2 max-w-2xl leading-relaxed">
            Conteúdo informativo e triagem operacional de editais.{" "}
            <strong className="font-medium text-[var(--foreground)]">
              Não constitui parecer jurídico
            </strong>{" "}
            e não substitui advogado — a decisão de participar de um certame é
            sempre da empresa licitante, e nenhum resultado é prometido.
          </p>

          <p className="mt-4">
            Dados públicos do{" "}
            <a href="https://www.pncp.gov.br/" rel="noopener">
              Portal Nacional de Contratações Públicas
            </a>
            . Fale com a gente:{" "}
            <a
              href={`mailto:${CONTATO.email}`}
              className="underline underline-offset-4"
            >
              {CONTATO.email}
            </a>
          </p>

          {/*
            O ano sai de `new Date()` no servidor a cada render. Não é
            decoração: um "© 2026" chumbado no código vira "© 2026" em 2028, e
            rodapé desatualizado é o sinal mais barato de site abandonado.
          */}
          <p className="mt-4">
            © {new Date().getFullYear()} {SITE.name} · Publicando sobre
            licitações desde {SITE.foundingYear}
          </p>
        </div>
      </div>
    </footer>
  );
}
