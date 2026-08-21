import Link from "next/link";
import { SITE } from "@/lib/site";
import { pracasParaBusca } from "@/lib/regioes";
import { BuscaDePracas } from "@/components/BuscaDePracas";
import { Logo } from "@/components/Logo";

/**
 * Cabeçalho e trilha das páginas internas.
 *
 * Estes dois blocos viviam copiados em cada página. A duplicação não era
 * inofensiva: o mesmo `<a href="/">` se repetiu sete vezes e cada página nova
 * nascia herdando o erro — foi assim que o lint acumulou catorze ocorrências da
 * mesma regra. Centralizados aqui, a próxima página herda a versão correta.
 *
 * A home tem cabeçalho próprio, com navegação e sem link para si mesma, então
 * não usa estes componentes de propósito — mas recebe a MESMA busca, montada da
 * mesma função, para as duas não divergirem com o tempo.
 *
 * `prefetch={false}` é deliberado: os dois links apontam para a home, apareceriam
 * em toda página e o padrão do Next é pré-carregar o que está na viewport. Seria
 * baixar a home inteira em cada visita por um link que quase ninguém clica.
 *
 * A busca é montada AQUI, no servidor, e desce como propriedade: `regioes.ts`
 * carrega 100 KB de agregado, e o componente de cliente não pode importá-lo sem
 * levar tudo junto para o navegador.
 */
/**
 * O menu, e por que ele é tão curto.
 *
 * As páginas internas não tinham menu nenhum — só o nome do site. Quem chegava
 * por busca num guia tinha exatamente uma saída: voltar. O rodapé agora carrega
 * o mapa completo; aqui em cima ficam os três destinos que respondem à pergunta
 * de quem acabou de chegar — *o que é isso, como funciona, e como recebo?*
 *
 * Três, e não oito, porque o cabeçalho divide espaço com a busca e o nome do
 * site. Menu que quebra em duas linhas no celular atrapalha mais do que ajuda, e
 * a cobertura completa é responsabilidade do rodapé.
 */
const MENU = [
  { href: "/como-funciona/", texto: "Como funciona" },
  { href: "/alerta-de-licitacao/", texto: "Alertas" },
  { href: "/blog/", texto: "Guias" },
];

export function CabecalhoSite() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" prefetch={false} aria-label={SITE.name}>
          <Logo />
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {/*
            Some no celular para o nome do site e a busca caberem sem espremer.
            Não é conteúdo perdido: os três destinos estão no rodapé, que existe
            em toda página.
          */}
          <nav aria-label="Principal" className="hidden gap-6 text-sm text-[var(--muted)] md:flex">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="underline-offset-4 hover:underline whitespace-nowrap"
              >
                {item.texto}
              </Link>
            ))}
          </nav>

          <BuscaDePracas pracas={pracasParaBusca()} className="w-36 sm:w-52" />

          {/*
            Fora do `nav` de cima, e não escondido no celular: login e cadastro
            já funcionam (chave confirmada, ver `roadmap.md`) e este era o único
            caminho que faltava — sem ele, quem lê um artigo e quer testar o
            produto só entrava digitando o endereço de cabeça.
          */}
          <Link
            href="/entrar/"
            prefetch={false}
            className="shrink-0 text-sm font-medium underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Trilha({ atual }: { atual: string }) {
  return (
    <nav aria-label="Trilha" className="text-sm text-[var(--muted)]">
      <Link href="/" prefetch={false} className="underline-offset-4 hover:underline">
        Início
      </Link>
      <span aria-hidden> › </span>
      <span>{atual}</span>
    </nav>
  );
}
