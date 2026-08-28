"use client";

import { useActionState } from "react";
import { liberarAcesso, revogarAcesso, type EstadoDaLiberacao } from "@/app/administracao/jornada/acoes";

const INICIAL: EstadoDaLiberacao = { status: "vazio", mensagem: null };

function Recado({ estado }: { estado: EstadoDaLiberacao }) {
  if (!estado.mensagem) return null;
  return (
    <p
      role="status"
      className={
        "mt-3 text-sm " +
        (estado.status === "erro" ? "text-red-700 dark:text-red-400" : "text-[var(--muted)]")
      }
    >
      {estado.mensagem}
    </p>
  );
}

/**
 * Liberar acesso à jornada na mão.
 *
 * Pensado para o dono usar entre uma venda e outra, no celular, sem manual: um
 * campo de e-mail, o código da transação e um botão. A opção de cortesia existe
 * porque ela é o caso em que não há transação para informar.
 */
export function FormularioDeLiberacao() {
  const [estado, enviar, enviando] = useActionState(liberarAcesso, INICIAL);

  return (
    <form action={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          E-mail do comprador
        </label>
        <p className="text-xs text-[var(--muted)]">
          Exatamente como ele aparece na plataforma de pagamento. Maiúscula e
          espaço não atrapalham: nós normalizamos.
        </p>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          className="w-full rounded-lg border bg-[var(--surface)] p-3 text-sm text-[var(--foreground)]"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="referencia" className="block text-sm font-medium">
          Código da transação
        </label>
        <input
          id="referencia"
          name="referencia"
          type="text"
          autoComplete="off"
          className="w-full rounded-lg border bg-[var(--surface)] p-3 text-sm text-[var(--foreground)]"
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="origem" value="cortesia" className="h-4 w-4" />
        É cortesia, sem transação
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {enviando ? "Liberando..." : "Liberar acesso"}
      </button>

      <Recado estado={estado} />
    </form>
  );
}

/**
 * Revogar, para estorno e fraude.
 *
 * Separado do formulário de liberação de propósito: são ações de sinal
 * contrário, e um formulário só, com um seletor no meio, é como se clica na
 * errada com pressa.
 */
export function FormularioDeRevogacao() {
  const [estado, enviar, enviando] = useActionState(revogarAcesso, INICIAL);

  return (
    <form action={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email-revogar" className="block text-sm font-medium">
          E-mail
        </label>
        <input
          id="email-revogar"
          name="email"
          type="email"
          required
          autoComplete="off"
          className="w-full rounded-lg border bg-[var(--surface)] p-3 text-sm text-[var(--foreground)]"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="motivo" className="block text-sm font-medium">
          Motivo
        </label>
        <input
          id="motivo"
          name="motivo"
          type="text"
          required
          placeholder="Estorno, fraude, pedido do cliente"
          autoComplete="off"
          className="w-full rounded-lg border bg-[var(--surface)] p-3 text-sm text-[var(--foreground)]"
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {enviando ? "Revogando..." : "Revogar acesso"}
      </button>

      <Recado estado={estado} />
    </form>
  );
}
