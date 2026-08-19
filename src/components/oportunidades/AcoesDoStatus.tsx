"use client";

import { useState, useTransition } from "react";
import type { SituacaoDaOportunidade } from "@/lib/dominio/tipos";
import { registrarAcaoNaOportunidade } from "@/app/(app)/oportunidades/acoes";
import { acoesDisponiveis } from "./transicoes";
import { Aviso } from "./Primitivos";

/**
 * Os botões que fecham o ciclo de "olhei" para "decidi".
 *
 * `situacao` chega como prop simples e não vira `useState`: a action chama
 * `refresh()` no sucesso, o servidor rerrenderiza a rota inteira no mesmo
 * round-trip, e este componente recebe a prop nova — espelhá-la em estado
 * local só criaria uma segunda fonte de verdade para ficar dessincronizada se
 * a chamada falhar a meio caminho.
 */
export function AcoesDoStatus({
  oportunidadeId,
  situacao,
}: {
  oportunidadeId: string;
  situacao: SituacaoDaOportunidade;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<SituacaoDaOportunidade | null>(null);

  const acoes = acoesDisponiveis(situacao);
  if (acoes.length === 0) return null;

  function registrar(proxima: SituacaoDaOportunidade) {
    setErro(null);
    setEmAndamento(proxima);
    iniciarTransicao(async () => {
      const resultado = await registrarAcaoNaOportunidade(oportunidadeId, proxima);
      if (!resultado.ok) setErro(resultado.erro);
      setEmAndamento(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {acoes.map((acao) => (
          <button
            key={acao.situacao}
            type="button"
            disabled={pendente}
            onClick={() => registrar(acao.situacao)}
            className={
              acao.destino === "positiva"
                ? "rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-60"
                : "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)] disabled:opacity-60"
            }
          >
            {pendente && emAndamento === acao.situacao ? "Registrando…" : acao.rotulo}
          </button>
        ))}
      </div>

      {erro ? (
        <Aviso tom="impedimento" titulo="Não conseguimos registrar">
          <p>{erro}</p>
        </Aviso>
      ) : null}
    </div>
  );
}
