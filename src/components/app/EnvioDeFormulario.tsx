"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { BOTAO } from "./ui";

/**
 * Botão de envio que sabe quando está enviando.
 *
 * `useFormStatus` exige um componente separado, abaixo do `<form>` — é a única
 * forma de ele enxergar o estado do formulário. O texto muda junto com o
 * `disabled` porque desabilitar sem dizer o motivo parece a tela ter travado.
 *
 * `name`/`value` continuam funcionando: é assim que o mesmo formulário oferece
 * "salvar e continuar depois" e "concluir" sem duplicar campo nenhum.
 */
export function BotaoDeEnvio({
  children,
  enviando,
  name,
  value,
  variante = "primario",
}: {
  children: ReactNode;
  /** O que aparece durante o envio. */
  enviando?: string;
  name?: string;
  value?: string;
  variante?: keyof typeof BOTAO;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={BOTAO[variante]}
    >
      {pending ? (
        <>
          <span
            aria-hidden
            className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          {enviando ?? "Salvando…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Os quatro estados do salvamento em uma região viva só.
 *
 * Uma região por estado faria o leitor de tela anunciar duas vezes ou nenhuma,
 * dependendo da ordem em que os nós aparecem. Aqui o contêiner existe desde o
 * primeiro render — região viva criada junto com a mensagem costuma não ser
 * anunciada, porque o leitor de tela não estava observando aquele nó — e só o
 * texto dentro dele muda.
 */
export function EstadoDoSalvamento({
  salvando,
  status,
  mensagem,
  salvoEm,
}: {
  salvando: boolean;
  status: "inicial" | "sucesso" | "erro";
  mensagem: string | null;
  salvoEm: string | null;
}) {
  return (
    <div aria-live="polite" className="min-h-6 text-sm">
      {salvando ? (
        <p className="text-[var(--muted)]">Salvando o cadastro…</p>
      ) : status === "sucesso" ? (
        <p className="font-medium text-emerald-700 dark:text-emerald-300">
          {mensagem}
          {salvoEm
            ? ` Última gravação às ${new Date(salvoEm).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}.`
            : ""}
        </p>
      ) : status === "erro" ? (
        <p className="font-medium text-rose-700 dark:text-rose-300">{mensagem}</p>
      ) : null}
    </div>
  );
}
