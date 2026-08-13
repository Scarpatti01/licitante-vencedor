"use client";

import { useState } from "react";
import type { PerfilDaEmpresa } from "@/lib/dominio/tipos";
import type { ErrosDoFormulario } from "./leitura";
import { BOTAO } from "@/components/app/ui";

/**
 * Atestados de capacidade técnica — lista que cresce.
 *
 * Cliente porque a lista muda de tamanho na mão do usuário, e isso é interação
 * de verdade. Os campos continuam sendo `input` com `name` repetido: o servidor
 * lê com `getAll` e casa por posição, então o formulário funciona igual com ou
 * sem JavaScript já carregado.
 *
 * O texto de ajuda explica o critério que estes campos ligam. Atestado é o
 * campo que mais gente pula por achar burocrático, e é justamente o que decide
 * habilitação técnica em serviço continuado.
 */

type Atestado = PerfilDaEmpresa["atestados"][number];

const VAZIO: Atestado = { objeto: "", valor: null, orgao: null, ano: null };

export function ListaDeAtestados({
  atestados,
  erros,
}: {
  atestados: Atestado[];
  erros: ErrosDoFormulario;
}) {
  const [linhas, setLinhas] = useState<Atestado[]>(
    atestados.length > 0 ? atestados : [VAZIO],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Contratos que a sua empresa já executou e consegue comprovar. Usamos o
        objeto descrito aqui para dizer se a sua experiência cobre o que o edital
        exige — e o valor para avisar quando o atestado é de porte menor que o
        contrato em disputa. Sem nenhum atestado, esse critério fica inerte.
      </p>

      <ul className="space-y-4">
        {linhas.map((linha, indice) => (
          <li key={indice} className="rounded-lg border bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                Atestado {indice + 1}
              </p>
              {linhas.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setLinhas(linhas.filter((_, i) => i !== indice))}
                  className="rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] dark:text-rose-300 dark:hover:bg-rose-950/60"
                >
                  Remover
                </button>
              ) : null}
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor={`atestado-objeto-${indice}`}
                  className="block text-sm font-medium"
                >
                  Objeto executado
                </label>
                <input
                  id={`atestado-objeto-${indice}`}
                  name="atestadoObjeto"
                  defaultValue={linha.objeto}
                  placeholder="limpeza predial em unidades administrativas"
                  aria-invalid={erros[`atestadoObjeto:${indice}`] ? true : undefined}
                  aria-describedby={
                    erros[`atestadoObjeto:${indice}`]
                      ? `atestado-objeto-${indice}-erro`
                      : undefined
                  }
                  className="mt-2 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--accent)]"
                />
                {erros[`atestadoObjeto:${indice}`] ? (
                  <p
                    id={`atestado-objeto-${indice}-erro`}
                    className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300"
                  >
                    {erros[`atestadoObjeto:${indice}`]}
                  </p>
                ) : null}
              </div>

              <CampoSimples
                id={`atestado-valor-${indice}`}
                nome="atestadoValor"
                rotulo="Valor do contrato (R$)"
                valorInicial={linha.valor === null ? "" : String(linha.valor)}
                inputMode="decimal"
                erro={erros[`atestadoValor:${indice}`]}
              />
              <CampoSimples
                id={`atestado-orgao-${indice}`}
                nome="atestadoOrgao"
                rotulo="Órgão contratante"
                valorInicial={linha.orgao ?? ""}
              />
              <CampoSimples
                id={`atestado-ano-${indice}`}
                nome="atestadoAno"
                rotulo="Ano de conclusão"
                valorInicial={linha.ano === null ? "" : String(linha.ano)}
                inputMode="numeric"
                erro={erros[`atestadoAno:${indice}`]}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setLinhas([...linhas, VAZIO])}
        className={BOTAO.secundario}
      >
        Adicionar outro atestado
      </button>
    </div>
  );
}

function CampoSimples({
  id,
  nome,
  rotulo,
  valorInicial,
  inputMode,
  erro,
}: {
  id: string;
  nome: string;
  rotulo: string;
  valorInicial: string;
  inputMode?: "numeric" | "decimal";
  erro?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {rotulo}
        <span className="ml-2 text-xs font-normal text-[var(--muted)]">opcional</span>
      </label>
      <input
        id={id}
        name={nome}
        defaultValue={valorInicial}
        inputMode={inputMode}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className="mt-2 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--accent)]"
      />
      {erro ? (
        <p id={`${id}-erro`} className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
