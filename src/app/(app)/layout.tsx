import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { empresaAtual, ehDemonstracao, repositorio } from "@/lib/dados";
import { usuarioAtual, vinculoDoUsuario } from "@/lib/auth/sessao";
import { SITE } from "@/lib/site";
import { AvisoDeDemonstracao } from "@/components/app/AvisoDeDemonstracao";
import { NavegacaoDoApp } from "@/components/app/NavegacaoDoApp";
import { Etiqueta } from "@/components/app/ui";
import { diagnosticarPerfil, resumoDoPerfil } from "@/components/perfil/diagnostico";
import { formatarCnpj, NOME_DO_PORTE } from "@/components/perfil/validacao";

/**
 * O shell do produto.
 *
 * O que ele carrega e por quê:
 *
 * **A empresa ativa, sempre visível.** O produto é multiempresa desde o banco
 * (um contador com três CNPJs é caso previsto, não exceção), e a pior falha
 * possível é alguém decidir sobre um edital olhando o perfil da empresa errada.
 * Razão social e CNPJ no cabeçalho custam uma linha e eliminam a dúvida.
 *
 * **O estado do perfil, sempre visível.** O motor de score se recusa a pontuar
 * quando falta informação demais, e a tela precisa dizer isso onde o usuário
 * está, não numa página que ele nunca abre.
 *
 * **O aviso de demonstração, obrigatório.** Ver `AvisoDeDemonstracao`.
 *
 * A leitura de dados acontece aqui e é repetida nas páginas quando precisam do
 * mesmo perfil: `repositorio()` e `empresaAtual()` são memoizados por passagem
 * de renderização com `cache` do React, então ler duas vezes custa uma.
 */

export const metadata: Metadata = {
  // A área logada não é conteúdo público. Sem isto ela concorreria nos
  // resultados com as páginas que existem justamente para atrair a visita.
  robots: { index: false, follow: false },
};

export default async function LayoutDoProduto({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /*
   * Conta criada, empresa ainda não: vai para o onboarding.
   *
   * Sem este desvio, `empresaAtual()` cai na empresa de demonstração e a pessoa
   * usa o produto inteiro achando que os dados são dela — salva oportunidade,
   * edita perfil — e nada disso existe no cadastro que ela vai criar depois.
   *
   * A checagem mora aqui, e não no `proxy.ts`, por recomendação explícita do
   * guia de autenticação do Next: o proxy roda em toda rota, inclusive nas
   * pré-carregadas, e uma consulta ao banco ali vira uma consulta por
   * navegação. O layout roda uma vez por visita à área do produto.
   *
   * O destino fica FORA de `(app)` de propósito. Dentro, ele executaria este
   * mesmo layout, seria mandado para si mesmo e o navegador desistiria com
   * ERR_TOO_MANY_REDIRECTS. Peguei isso escrevendo este comentário, não
   * rodando — e é o tipo de laço que só aparece com um usuário logado sem
   * empresa, que é exatamente o estado que nenhum teste tinha ainda.
   */
  const usuario = await usuarioAtual();
  if (usuario) {
    const vinculo = await vinculoDoUsuario();
    if (!vinculo) redirect("/cadastrar-empresa/");
  }

  const repo = repositorio();
  const empresaId = await empresaAtual();
  const perfil = await repo.perfil(empresaId);
  const diagnostico = diagnosticarPerfil(perfil);
  const demonstracao = ehDemonstracao(repo);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)]">
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      {demonstracao ? <AvisoDeDemonstracao /> : null}

      <header className="sticky top-0 z-40 border-b bg-[var(--background)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 pt-4 pb-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/painel/"
              className="text-sm font-semibold tracking-tight whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {SITE.name}
            </Link>
            <span aria-hidden className="h-5 w-px bg-[var(--border)]" />
            <IdentidadeDaEmpresa
              razaoSocial={perfil?.razaoSocial ?? null}
              nomeFantasia={perfil?.nomeFantasia ?? null}
              cnpj={perfil?.cnpj ?? null}
              porte={perfil ? NOME_DO_PORTE[perfil.porte] : null}
            />
          </div>

          <Link
            href="/perfil/"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {perfil === null ? (
              <Etiqueta tom="atencao">Cadastro não iniciado</Etiqueta>
            ) : diagnostico.inertes.length === 0 ? (
              <Etiqueta tom="positivo">Perfil completo</Etiqueta>
            ) : (
              <Etiqueta tom={diagnostico.bloqueiaRecomendacao ? "critico" : "atencao"}>
                {resumoDoPerfil(diagnostico)}
              </Etiqueta>
            )}
          </Link>
        </div>

        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <NavegacaoDoApp />
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="border-t bg-[var(--background)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="max-w-xl leading-relaxed">
            Triagem e leitura de editais. Não é consultoria jurídica nem análise de
            probabilidade de resultado — a decisão de participar é sua.
          </p>
          <nav aria-label="Documentos do serviço" className="flex gap-4">
            <Link href="/metodologia/" className="underline-offset-4 hover:underline">
              Metodologia
            </Link>
            <Link href="/aviso-legal/" className="underline-offset-4 hover:underline">
              Aviso legal
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function IdentidadeDaEmpresa({
  razaoSocial,
  nomeFantasia,
  cnpj,
  porte,
}: {
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnpj: string | null;
  porte: string | null;
}) {
  if (razaoSocial === null) {
    return (
      <p className="truncate text-sm text-[var(--muted)]">
        Nenhuma empresa cadastrada nesta conta
      </p>
    );
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium" title={razaoSocial}>
        {nomeFantasia ?? razaoSocial}
      </p>
      <p className="truncate text-xs text-[var(--muted)]">
        {cnpj ? formatarCnpj(cnpj) : "CNPJ não informado"}
        {porte ? ` · ${porte}` : ""}
      </p>
    </div>
  );
}
