import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdministrador } from "@/lib/auth/administracao";

/**
 * O shell da área de operação.
 *
 * Fica FORA do grupo `(app)` de propósito. Aquele layout carrega a empresa ativa
 * e manda para o onboarding quem ainda não tem uma — comportamento certo para o
 * produto e errado aqui, porque quem opera o negócio pode não ser cliente dele.
 * Herdar aquele shell obrigaria o dono a cadastrar um CNPJ de mentira para
 * conseguir ver quantos leads entraram na semana.
 *
 * A separação também é conceitual, e é a mesma que justifica
 * `ADMINS_DA_PLATAFORMA` existir separado de `papel_na_empresa`: lá dentro tudo
 * é dado de um tenant; aqui nada é.
 */

/**
 * Renderização dinâmica, declarada — e não deduzida do ambiente.
 *
 * Sem esta linha o defeito é silencioso e completo: durante o build não há
 * cookie nem sessão, `exigirAdministrador()` chama `notFound()`, e o Next
 * **congela esse 404 como página estática**. O resultado é uma área de operação
 * que responde "não existe" para o administrador legítimo, em produção, para
 * sempre — e nada no log aponta para cá, porque do ponto de vista do Next tudo
 * correu bem.
 *
 * O que mascarava o problema é pior que o problema: com as credenciais do
 * Supabase presentes no build, `cookies()` chega a ser chamado e o Next marca a
 * rota como dinâmica sozinho. Ou seja, o modo de renderização de uma tela
 * protegida dependia de uma variável de ambiente estar definida na hora do
 * build. Medido: sem as variáveis, `/administracao/leads` sai como `○`
 * (estática) enquanto `/painel` e `/perfil` saem como `ƒ`.
 *
 * Página que decide autorização não pode ser pré-renderizada em nenhuma
 * circunstância. Isto declara isso, em vez de torcer para o efeito colateral
 * acontecer.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Área de operação não é conteúdo, e o `noindex` aqui é mais do que higiene de
  // SEO: sem ele, o endereço entraria no índice do Google e a proteção por
  // obscuridade que o 404 oferece — pequena, mas de graça — iria junto.
  robots: { index: false, follow: false },
};

export default async function LayoutDaAdministracao({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /*
   * A checagem se repete em cada página, e a repetição é deliberada.
   *
   * Layout do Next não é fronteira de segurança: ele não roda de novo numa
   * navegação do lado do cliente entre duas rotas que o compartilham, e não
   * cobre Route Handler nenhum. Protegê-lo aqui serve para o shell não ser
   * montado à toa; quem de fato barra é a linha no topo de cada página.
   */
  const administrador = await exigirAdministrador();

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      <header className="border-b bg-[var(--background)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight">Operação</span>
            <span className="text-xs text-[var(--muted)]">{administrador.email}</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/administracao/leads/" className="hover:underline">
              Leads
            </Link>
            <Link href="/painel/" className="text-[var(--muted)] hover:underline">
              Ir para o produto
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
