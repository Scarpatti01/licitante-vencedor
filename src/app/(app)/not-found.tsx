import Link from "next/link";
import { BOTAO } from "@/components/app/ui";

/**
 * 404 de dentro do produto.
 *
 * Renderiza dentro do shell, então quem cai aqui continua vendo a empresa ativa
 * e as abas — sair de um endereço quebrado não deveria custar a sessão inteira.
 * As saídas são as quatro seções, e não um "voltar" genérico: quem digitou um
 * endereço errado quase sempre queria uma delas.
 */
export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <div className="rounded-xl border bg-[var(--background)] p-8">
        <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
          Erro 404
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Este endereço não existe no produto
        </h1>
        <p className="mt-3 leading-relaxed text-[var(--muted)]">
          Pode ser um link antigo, uma oportunidade que saiu da sua lista ou um
          endereço digitado com um caractere a mais.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/painel/" className={BOTAO.primario}>
            Ir para o painel
          </Link>
          <Link href="/oportunidades/" className={BOTAO.secundario}>
            Ver oportunidades
          </Link>
          <Link href="/perfil/" className={BOTAO.secundario}>
            Perfil da empresa
          </Link>
          <Link href="/configuracoes/" className={BOTAO.secundario}>
            Configurações
          </Link>
        </div>
      </div>
    </div>
  );
}
