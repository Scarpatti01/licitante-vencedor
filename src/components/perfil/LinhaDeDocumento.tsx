"use client";

import { useRef } from "react";
import { NOME_DO_DOCUMENTO, type PerfilDaEmpresa, type TipoDeDocumento } from "@/lib/dominio/tipos";

/**
 * Uma linha da lista de documentos: o tipo, a validade e "sem prazo".
 *
 * ## Por que a data e "sem prazo" se anulam
 *
 * São duas afirmações incompatíveis sobre o mesmo documento: "vale até tal dia"
 * e "não tem prazo". O banco já as recusa juntas
 * (`constraint validade_coerente`), e `leitura.ts` também — mas a tela deixava
 * o usuário marcar as duas, enviar o cadastro INTEIRO e só então descobrir, num
 * campo que ele precisava rolar para achar.
 *
 * Recusar depois é o desenho errado quando dá para não deixar acontecer.
 * Escolher um agora limpa o outro na hora, e a combinação inválida deixa de ser
 * representável pela tela.
 *
 * ## O que continua valendo do lado do servidor, e por quê
 *
 * Tudo. Uma Server Action é um endpoint POST alcançável sem passar por tela
 * nenhuma, e o que o navegador impediu não vale nada lá. As três camadas
 * continuam de pé e cada uma responde por uma coisa diferente:
 *
 *   · esta aqui  — o usuário não erra;
 *   · `leitura.ts` — quem envia direto não engana;
 *   · o `check` do Postgres — nenhum caminho de código, hoje ou depois,
 *     consegue gravar o par incoerente.
 *
 * ## Sem estado do React, de propósito
 *
 * Os dois campos continuam não controlados, e a exclusão acontece por `ref`.
 *
 * A alternativa — `useState` para os dois valores — brigaria com duas coisas que
 * já existem: o reset que o React 19 aplica ao formulário depois de toda ação, e
 * o `reaplicar` de `preservarPreenchimento`, que devolve os valores enviados
 * escrevendo direto no DOM. Campo controlado é território do React; campo não
 * controlado é território do DOM. Misturar os dois no mesmo input é como se
 * ganha um valor que pisca e volta.
 *
 * E o par sempre volta coerente desses dois caminhos: o reset restaura o
 * `defaultValue`, que vem do perfil gravado — e o `check` do banco garante que o
 * perfil gravado nunca tem os dois. O `reaplicar` restaura o que foi enviado,
 * que esta tela impediu de ser inválido.
 */

/**
 * Mantém data e "sem prazo" mutuamente exclusivos.
 *
 * `origem` diz qual dos dois o usuário acabou de mexer — é ele que vence, e é o
 * outro que cede. Sem isso, limpar um dispararia o handler do outro e os dois se
 * apagariam.
 */
export function manterExclusivos(
  origem: "data" | "semPrazo",
  data: HTMLInputElement | null,
  semPrazo: HTMLInputElement | null,
): void {
  if (!data || !semPrazo) return;

  if (origem === "data") {
    // Campo `type="date"` só reporta valor quando a data está completa: dia,
    // mês e ano. Digitar pela metade não desmarca nada, e é o certo — meia data
    // ainda não é uma escolha.
    if (data.value !== "") semPrazo.checked = false;
    return;
  }

  if (semPrazo.checked) data.value = "";
}

export function LinhaDeDocumento({
  tipo,
  documento,
  erro,
}: {
  tipo: TipoDeDocumento;
  documento: PerfilDaEmpresa["documentos"][number] | undefined;
  erro?: string;
}) {
  const idValidade = `campo-validade-${tipo.replace(/_/g, "-")}`;
  const validadeRef = useRef<HTMLInputElement>(null);
  const semPrazoRef = useRef<HTMLInputElement>(null);

  return (
    <li className="px-4 py-3 has-[:checked]:bg-[var(--accent-soft)]/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex flex-1 cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="documento"
            value={tipo}
            defaultChecked={documento !== undefined}
            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
          <span>
            <span className="font-medium">{NOME_DO_DOCUMENTO[tipo]}</span>
            {/*
              O estado do arquivo é informação, nunca campo editável: marcar uma
              caixa não anexa nada, e um "arquivo anexado" declarado faria o
              checklist dar o documento como pronto sem que ele exista.
            */}
            {documento?.arquivoAnexado ? (
              <span className="mt-0.5 block text-xs text-emerald-700 dark:text-emerald-300">
                Arquivo anexado no cadastro
              </span>
            ) : (
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                Sem arquivo anexado — entra no checklist como &ldquo;a verificar&rdquo;
              </span>
            )}
          </span>
        </label>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div>
            <label htmlFor={idValidade} className="sr-only">
              Válido até — {NOME_DO_DOCUMENTO[tipo]}
            </label>
            <input
              id={idValidade}
              ref={validadeRef}
              name={`validade:${tipo}`}
              type="date"
              defaultValue={documento?.validoAte ?? ""}
              onChange={() => manterExclusivos("data", validadeRef.current, semPrazoRef.current)}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? `${idValidade}-erro` : undefined}
              className={`rounded-lg border bg-[var(--background)] px-2.5 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--accent)] ${
                erro ? "border-rose-400 dark:border-rose-700" : ""
              }`}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
            <input
              ref={semPrazoRef}
              type="checkbox"
              name={`semValidade:${tipo}`}
              defaultChecked={documento?.semValidade ?? false}
              onChange={() =>
                manterExclusivos("semPrazo", validadeRef.current, semPrazoRef.current)
              }
              className="size-4 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
            sem prazo
          </label>
        </div>
      </div>

      {tipo === "outro" ? (
        <div className="mt-3">
          <label htmlFor="campo-descricao-outro" className="sr-only">
            Qual documento
          </label>
          <input
            id="campo-descricao-outro"
            name="descricao:outro"
            defaultValue={documento?.descricao ?? ""}
            placeholder="Qual documento? Ex.: licença ambiental de operação"
            className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--accent)]"
          />
        </div>
      ) : null}

      {erro ? (
        <p
          id={`${idValidade}-erro`}
          className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          {erro}
        </p>
      ) : null}
    </li>
  );
}
