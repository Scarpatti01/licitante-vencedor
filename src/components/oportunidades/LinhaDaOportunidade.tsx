import type { ReactNode } from "react";
import Link from "next/link";
import type { ResumoDaOportunidade } from "@/lib/dados/porta";
import {
  hrefDaOportunidade,
  prazoDoEdital,
  RECOMENDACAO,
  SITUACAO,
  TOM,
  valorDoEdital,
} from "./estilo";
import { Selo } from "./Primitivos";
import { ScoreCompacto, ScoreEmLinha } from "./Score";

/**
 * Uma linha da lista.
 *
 * A hierarquia dentro dela responde, nesta ordem, às perguntas que o
 * empresário faz enquanto rola a página: *dá para eu?* (score e recomendação),
 * *o que é?* (objeto, órgão, local), *quanto e até quando?* (valor e prazo),
 * *e daí?* (a próxima ação, já escrita como verbo).
 *
 * Uma tabela de verdade foi descartada de propósito: no celular ela vira
 * rolagem horizontal ou fonte de 10px, e é no celular que o dono da PME abre o
 * alerta. O que existe aqui é uma lista de blocos que se reorganiza em colunas
 * a partir de `sm`, sem esconder coluna nenhuma.
 */
export function LinhaDaOportunidade({
  oportunidade,
  agora,
}: {
  oportunidade: ResumoDaOportunidade;
  agora: Date;
}) {
  const { edital, avaliacao, situacao } = oportunidade;
  const { score, recomendacao } = avaliacao;

  /*
   * O edital cujo documento ninguém abriu é marcado NA LISTA, e não só na tela
   * de detalhe.
   *
   * A tela de detalhe já dizia isso desde sempre, e parecia suficiente. Não é:
   * a lista é onde o cliente decide o que vale abrir, e é o único lugar que
   * alguns editais chegam a ter. Sem o selo aqui, dez linhas com aderência 82
   * parecem dez análises — e a diferença entre "avaliamos o documento" e
   * "avaliamos o que o órgão publicou" só apareceria depois do clique, para os
   * poucos que clicam.
   *
   * No plano de lista NENHUM edital é lido, então o selo aparece em todos. Isso
   * é feio de propósito: é a diferença que o cliente comprou, e escondê-la para
   * a tela ficar limpa é vender uma coisa e entregar outra.
   */
  const naoAnalisado = !avaliacao.checklist.analiseLeuTexto;
  const recomendado = RECOMENDACAO[recomendacao.nivel];
  const valor = valorDoEdital(edital);
  const prazo = prazoDoEdital(edital, agora);

  // Barra lateral só nos dois casos que precisam saltar da lista: o que acaba
  // agora e o que a empresa não pode disputar. Colorir toda linha faria a cor
  // deixar de significar alguma coisa.
  const barra = recomendacao.urgente
    ? TOM.atencao.barra
    : recomendacao.nivel === "nao_recomendada"
      ? TOM.impedimento.barra
      : null;

  return (
    <li className="relative">
      {barra ? <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${barra}`} /> : null}
      <Link
        href={hrefDaOportunidade(oportunidade.id)}
        className="block px-4 py-4 transition-colors hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] sm:grid sm:grid-cols-[4.5rem_minmax(0,1fr)_11rem] sm:gap-6 sm:px-5 sm:py-5"
      >
        <div className="hidden sm:block">
          <ScoreCompacto score={score} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="sm:hidden">
              <ScoreEmLinha score={score} />
            </span>
            <Selo tom={recomendado.tom} tamanho="pequeno">
              {recomendado.rotulo}
            </Selo>
            {naoAnalisado ? (
              <Selo tom="neutro" tamanho="pequeno" comGlifo={false}>
                não analisado
              </Selo>
            ) : null}
            {recomendacao.urgente ? (
              <Selo tom="atencao" tamanho="pequeno" comGlifo={false}>
                Urgente
              </Selo>
            ) : null}
            {situacao !== "nova" ? (
              <span className="text-xs text-[var(--muted)]">{SITUACAO[situacao] ?? situacao}</span>
            ) : null}
          </div>

          <h3 className="mt-2 line-clamp-2 leading-snug font-medium tracking-tight text-balance">
            {edital.objeto}
          </h3>

          <p className="mt-1.5 line-clamp-1 text-sm text-[var(--muted)]">
            {edital.orgao.nome}
            <span aria-hidden> · </span>
            {edital.local.municipio}/{edital.local.uf}
            <span aria-hidden> · </span>
            {edital.modalidade}
          </p>

          {score.valor === null && score.motivo ? (
            <p className={`mt-2 line-clamp-2 text-xs leading-relaxed ${TOM.indeterminado.texto}`}>
              {score.motivo}
            </p>
          ) : null}

          <p className="mt-2.5 flex items-start gap-1.5 text-sm font-medium">
            <span aria-hidden className="text-[var(--accent)]">
              →
            </span>
            <span className="min-w-0">
              <span className="sr-only">Próxima ação: </span>
              {recomendacao.proximaAcao.titulo}
            </span>
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mt-0 sm:flex-col sm:items-end sm:gap-2">
          <span
            className={`text-sm font-semibold tabular-nums sm:text-base ${
              valor.tom === "neutro" ? "" : TOM[valor.tom].texto
            }`}
          >
            {valor.texto}
          </span>
          <Selo tom={prazo.tom} tamanho="pequeno" comGlifo={prazo.tom !== "neutro"}>
            {prazo.resumo}
          </Selo>
        </div>
      </Link>
    </li>
  );
}

/** A moldura da lista. Existe para a lista ter uma borda só, e não oito. */
export function ListaDeOportunidades({ children }: { children: ReactNode }) {
  return <ul className="divide-y overflow-hidden rounded-xl border">{children}</ul>;
}
