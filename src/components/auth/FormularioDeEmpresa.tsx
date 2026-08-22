"use client";

import { useActionState } from "react";
import { BotaoDeEnvio } from "@/components/app/EnvioDeFormulario";
import { criarEmpresa } from "@/lib/auth/empresa";
import { EMPRESA_INICIAL } from "@/lib/auth/estado";

/**
 * O cadastro da empresa, primeiro passo de quem acabou de criar conta.
 *
 * Três campos e nada mais. A tentação de pedir endereço, telefone e porte aqui
 * é grande e custa caro: cada campo a mais é uma chance de abandono num momento
 * em que a pessoa ainda não viu valor nenhum. O que a triagem precisa vem
 * depois, no assistente de perfil, quando já dá para explicar o que cada
 * resposta liga.
 */
export function FormularioDeEmpresa() {
  const [estado, executar] = useActionState(criarEmpresa, EMPRESA_INICIAL);

  return (
    <form action={executar} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="cnpj" className="block text-sm font-medium">
          CNPJ
        </label>
        <input
          id="cnpj"
          name="cnpj"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="00.000.000/0000-00"
          className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
        />
        <p className="text-xs text-[var(--muted)]">
          Pode digitar com ou sem pontuação.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="razaoSocial" className="block text-sm font-medium">
          Razão social
        </label>
        <input
          id="razaoSocial"
          name="razaoSocial"
          required
          autoComplete="organization"
          className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="nomeFantasia" className="block text-sm font-medium">
          Nome fantasia <span className="font-normal text-[var(--muted)]">(opcional)</span>
        </label>
        <input
          id="nomeFantasia"
          name="nomeFantasia"
          autoComplete="off"
          className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
        />
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {estado.erro ? (
          <p className="font-medium text-rose-700 dark:text-rose-300">{estado.erro}</p>
        ) : null}
      </div>

      <BotaoDeEnvio enviando="Cadastrando…">Cadastrar empresa</BotaoDeEnvio>
    </form>
  );
}
