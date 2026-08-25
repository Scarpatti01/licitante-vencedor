"use client";

import { useActionState, useState } from "react";
import { salvarRecortes } from "@/app/(app)/recortes/acoes";
import { ESTADO_INICIAL } from "@/components/perfil/estado";
import { BOTAO } from "@/components/app/ui";
import {
  descreverAbrangencia,
  LIMITE_DE_RECORTES,
  type Recorte,
} from "@/lib/dominio/recorte";

/**
 * Os recortes de abrangência, editáveis.
 *
 * ## Por que o estado é local e o índice é a chave
 *
 * A lista existe no cliente para o botão "acrescentar" e o "apagar" serem
 * imediatos, sem viagem ao servidor. O que vale, porém, é o que chega no POST:
 * `lerRecortesDoFormulario` lê os campos indexados e revalida tudo, inclusive o
 * limite de três. O estado local é conveniência; a regra é do servidor.
 *
 * ## O aviso que não pode sair daqui
 *
 * Quem tem zero recortes não recebe alerta nenhum. Isso é consequência
 * legítima (o cliente pode querer parar de receber), mas é a última coisa que
 * alguém descobre sozinho: ele apaga o último recorte, salva, e no dia seguinte
 * o silêncio parece defeito. Por isso a tela diz, no momento em que a lista
 * fica vazia, o que o silêncio vai significar.
 */

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

type Rascunho = {
  nome: string;
  tipo: "municipio" | "uf" | "brasil";
  uf: string;
  municipioIbge: string;
  municipioNome: string;
  palavras: string;
  excluidas: string;
  ticketMinimo: string;
  ticketMaximo: string;
};

const VAZIO: Rascunho = {
  nome: "",
  tipo: "uf",
  uf: "",
  municipioIbge: "",
  municipioNome: "",
  palavras: "",
  excluidas: "",
  ticketMinimo: "",
  ticketMaximo: "",
};

function paraRascunho(r: Recorte): Rascunho {
  const a = r.abrangencia;
  return {
    nome: r.nome,
    tipo: a.tipo,
    uf: a.tipo === "brasil" ? "" : a.uf,
    municipioIbge: a.tipo === "municipio" ? a.codigoIbge : "",
    municipioNome: a.tipo === "municipio" ? a.nome : "",
    palavras: r.palavrasChave.join(", "),
    excluidas: r.palavrasExcluidas.join(", "),
    ticketMinimo: r.ticketMinimo === null ? "" : String(r.ticketMinimo),
    ticketMaximo: r.ticketMaximo === null ? "" : String(r.ticketMaximo),
  };
}

const campo =
  "mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]";
const rotulo = "block text-xs font-medium text-[var(--muted)]";

export function FormularioDeRecortes({ recortes }: { recortes: Recorte[] }) {
  const [estado, acao, salvando] = useActionState(salvarRecortes, ESTADO_INICIAL);
  const [lista, setLista] = useState<Rascunho[]>(
    recortes.length > 0 ? recortes.map(paraRascunho) : [VAZIO],
  );

  const cheio = lista.length >= LIMITE_DE_RECORTES;

  return (
    <form action={acao} className="space-y-6">
      {estado.erros.quantidade ? (
        <p className="rounded-lg border border-[var(--impedimento)] px-4 py-3 text-sm">
          {estado.erros.quantidade}
        </p>
      ) : null}
      {estado.erros.abrangencia ? (
        <p className="rounded-lg border border-[var(--impedimento)] px-4 py-3 text-sm">
          {estado.erros.abrangencia}
        </p>
      ) : null}

      {lista.map((r, i) => (
        <fieldset key={i} className="rounded-xl border p-5">
          <legend className="px-2 text-sm font-semibold">
            {r.tipo === "brasil"
              ? descreverAbrangencia({ tipo: "brasil" })
              : r.uf
                ? r.tipo === "municipio" && r.municipioNome
                  ? `${r.municipioNome} (${r.uf})`
                  : `Estado: ${r.uf}`
                : `Recorte ${i + 1}`}
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={rotulo}>Nome do recorte</span>
              <input
                name={`recorte-${i}-nome`}
                value={r.nome}
                onChange={(e) =>
                  setLista((l) => l.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))
                }
                placeholder="Minha cidade"
                maxLength={60}
                className={campo}
              />
              <span className="mt-1 block text-xs text-[var(--muted)]">
                É por ele que você reconhece o alerta no e-mail.
              </span>
              {estado.erros[`recorte-${i}-nome`] ? (
                <span className="mt-1 block text-xs text-[var(--impedimento)]">
                  {estado.erros[`recorte-${i}-nome`]}
                </span>
              ) : null}
            </label>

            <label>
              <span className={rotulo}>Abrangência</span>
              <select
                name={`recorte-${i}-abrangencia`}
                value={r.tipo}
                onChange={(e) =>
                  setLista((l) =>
                    l.map((x, j) =>
                      j === i ? { ...x, tipo: e.target.value as Rascunho["tipo"] } : x,
                    ),
                  )
                }
                className={campo}
              >
                <option value="municipio">Um município</option>
                <option value="uf">Um estado inteiro</option>
                <option value="brasil">Brasil</option>
              </select>
              {estado.erros[`recorte-${i}-abrangencia`] ? (
                <span className="mt-1 block text-xs text-[var(--impedimento)]">
                  {estado.erros[`recorte-${i}-abrangencia`]}
                </span>
              ) : null}
            </label>

            {r.tipo !== "brasil" ? (
              <label>
                <span className={rotulo}>Estado</span>
                <select
                  name={`recorte-${i}-uf`}
                  value={r.uf}
                  onChange={(e) =>
                    setLista((l) => l.map((x, j) => (j === i ? { ...x, uf: e.target.value } : x)))
                  }
                  className={campo}
                >
                  <option value="">escolha</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {r.tipo === "municipio" ? (
              <>
                <label>
                  <span className={rotulo}>Município (código IBGE)</span>
                  <input
                    name={`recorte-${i}-municipio-ibge`}
                    value={r.municipioIbge}
                    onChange={(e) =>
                      setLista((l) =>
                        l.map((x, j) => (j === i ? { ...x, municipioIbge: e.target.value } : x)),
                      )
                    }
                    inputMode="numeric"
                    placeholder="2304400"
                    className={campo}
                  />
                </label>
                <label>
                  <span className={rotulo}>Nome do município</span>
                  <input
                    name={`recorte-${i}-municipio-nome`}
                    value={r.municipioNome}
                    onChange={(e) =>
                      setLista((l) =>
                        l.map((x, j) => (j === i ? { ...x, municipioNome: e.target.value } : x)),
                      )
                    }
                    placeholder="Fortaleza"
                    className={campo}
                  />
                </label>
              </>
            ) : null}

            <label className="sm:col-span-2">
              <span className={rotulo}>
                Palavras deste recorte {r.tipo === "brasil" ? "(obrigatório)" : "(opcional)"}
              </span>
              <input
                name={`recorte-${i}-palavras`}
                value={r.palavras}
                onChange={(e) =>
                  setLista((l) =>
                    l.map((x, j) => (j === i ? { ...x, palavras: e.target.value } : x)),
                  )
                }
                placeholder="pavimentação, drenagem"
                className={campo}
              />
              <span className="mt-1 block text-xs text-[var(--muted)]">
                Separe por vírgula. Vazio usa as palavras do perfil da empresa.
                {r.tipo === "brasil"
                  ? " No recorte Brasil, sem palavra você não recebe nada: são quase três mil editais por dia."
                  : ""}
              </span>
            </label>

            <label className="sm:col-span-2">
              <span className={rotulo}>Palavras que descartam (opcional)</span>
              <input
                name={`recorte-${i}-excluidas`}
                value={r.excluidas}
                onChange={(e) =>
                  setLista((l) =>
                    l.map((x, j) => (j === i ? { ...x, excluidas: e.target.value } : x)),
                  )
                }
                placeholder="merenda, uniforme"
                className={campo}
              />
            </label>

            <label>
              <span className={rotulo}>Valor mínimo (opcional)</span>
              <input
                name={`recorte-${i}-ticket-minimo`}
                value={r.ticketMinimo}
                onChange={(e) =>
                  setLista((l) =>
                    l.map((x, j) => (j === i ? { ...x, ticketMinimo: e.target.value } : x)),
                  )
                }
                placeholder="500.000"
                className={campo}
              />
            </label>

            <label>
              <span className={rotulo}>Valor máximo (opcional)</span>
              <input
                name={`recorte-${i}-ticket-maximo`}
                value={r.ticketMaximo}
                onChange={(e) =>
                  setLista((l) =>
                    l.map((x, j) => (j === i ? { ...x, ticketMaximo: e.target.value } : x)),
                  )
                }
                className={campo}
              />
              {estado.erros[`recorte-${i}-ticket`] ? (
                <span className="mt-1 block text-xs text-[var(--impedimento)]">
                  {estado.erros[`recorte-${i}-ticket`]}
                </span>
              ) : null}
            </label>
          </div>

          <button
            type="button"
            onClick={() => setLista((l) => l.filter((_, j) => j !== i))}
            className="mt-4 text-sm text-[var(--muted)] underline underline-offset-4"
          >
            Apagar este recorte
          </button>
        </fieldset>
      ))}

      {lista.length === 0 ? (
        <p className="rounded-lg border px-4 py-3 text-sm">
          Sem nenhum recorte você não recebe alerta. Se salvar assim, o silêncio de amanhã
          é isto, e não um defeito.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setLista((l) => [...l, VAZIO])}
          disabled={cheio}
          className={`${BOTAO.secundario} disabled:opacity-50`}
        >
          Acrescentar recorte
        </button>
        {cheio ? (
          <span className="text-xs text-[var(--muted)]">
            O seu plano permite {LIMITE_DE_RECORTES}. Apague um para criar outro.
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t pt-5">
        <button type="submit" disabled={salvando} className={BOTAO.primario}>
          {salvando ? "Salvando…" : "Salvar recortes"}
        </button>
        {estado.mensagem ? (
          <span
            className={`text-sm ${estado.status === "erro" ? "text-[var(--impedimento)]" : "text-[var(--muted)]"}`}
          >
            {estado.mensagem}
          </span>
        ) : null}
      </div>
    </form>
  );
}
