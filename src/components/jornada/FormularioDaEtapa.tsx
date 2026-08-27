"use client";

import { useActionState } from "react";
import { salvarEtapa, type EstadoDaEtapa } from "@/app/(app)/jornada/acoes";
import type { EtapaDaJornada } from "@/lib/jornada/conteudo";

const INICIAL: EstadoDaEtapa = { status: "vazio", mensagem: null };

/**
 * O exercício da semana.
 *
 * ## Por que os campos são `defaultValue` e não estado controlado
 *
 * Porque o valor que importa é o que a pessoa está digitando, e um estado
 * controlado que se reinicializa a cada revalidação apagaria o texto dela no
 * meio da frase. O formulário é a fonte da verdade até o envio; depois do
 * envio, o servidor é.
 *
 * ## Por que "salvar" e "concluir" são botões diferentes
 *
 * Salvar sem concluir é o caso comum: a pessoa preenche metade hoje e volta
 * amanhã. Um botão só obrigaria a escolher entre perder o rascunho e mentir na
 * barra de progresso.
 */
export function FormularioDaEtapa({
  etapa,
  respostas,
  concluida,
}: {
  etapa: EtapaDaJornada;
  respostas: Record<string, string>;
  concluida: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(salvarEtapa, INICIAL);

  return (
    <form action={enviar} className="space-y-6">
      <input type="hidden" name="etapa" value={etapa.codigo} />

      <fieldset className="space-y-5" disabled={enviando}>
        <legend className="text-sm font-semibold">O exercício desta semana</legend>

        {etapa.campos.map((campo) => {
          const id = `campo-${campo.codigo}`;
          return (
            <div key={campo.codigo} className="space-y-1.5">
              <label htmlFor={id} className="block text-sm font-medium">
                {campo.rotulo}
              </label>
              {campo.ajuda ? (
                <p className="text-xs text-[var(--muted)]">{campo.ajuda}</p>
              ) : null}
              {campo.formato === "longo" ? (
                <textarea
                  id={id}
                  name={`campo:${campo.codigo}`}
                  rows={4}
                  maxLength={4000}
                  defaultValue={respostas[campo.codigo] ?? ""}
                  className="w-full rounded-lg border bg-[var(--surface)] p-3 text-sm text-[var(--fg)]"
                />
              ) : (
                <input
                  id={id}
                  name={`campo:${campo.codigo}`}
                  type="text"
                  maxLength={4000}
                  defaultValue={respostas[campo.codigo] ?? ""}
                  className="w-full rounded-lg border bg-[var(--surface)] p-3 text-sm text-[var(--fg)]"
                />
              )}
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enviando ? "Salvando..." : "Salvar"}
        </button>

        {concluida ? (
          <button
            type="submit"
            name="reabrir"
            value="1"
            disabled={enviando}
            className="rounded-lg px-4 py-2 text-sm underline underline-offset-4 disabled:opacity-60"
          >
            Reabrir esta semana
          </button>
        ) : (
          <button
            type="submit"
            name="concluir"
            value="1"
            disabled={enviando}
            className="rounded-lg bg-[var(--accent,#1B4D8F)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Salvar e concluir a semana
          </button>
        )}

        {concluida ? (
          <span className="text-sm text-[var(--muted)]">Concluída</span>
        ) : null}
      </div>

      {estado.mensagem ? (
        <p
          role="status"
          className={
            "text-sm " + (estado.status === "erro" ? "text-red-700 dark:text-red-400" : "text-[var(--muted)]")
          }
        >
          {estado.mensagem}
        </p>
      ) : null}
    </form>
  );
}
