import type { ReactNode } from "react";
import Link from "next/link";
import type { ResumoDaOportunidade } from "@/lib/dados/porta";
import type { SituacaoDaOportunidade } from "@/lib/dominio/tipos";
import { hrefDaOportunidade, SITUACAO, type Tom } from "./estilo";
import { Selo } from "./Primitivos";
import { ScoreEmLinha } from "./Score";

/**
 * Uma linha do histórico: o que a empresa decidiu, e o que aconteceu.
 *
 * `LinhaDaOportunidade` não serve para esta lista porque o seu elemento
 * central é `recomendacao.proximaAcao.titulo` — "Montar a proposta" numa
 * oportunidade `vencida` seria a tela dizendo para o cliente fazer de novo um
 * trabalho já concluído. Aqui a situação é o protagonista, não a próxima
 * ação: não há próxima ação num certame que já terminou.
 */

const TOM_DA_SITUACAO: Partial<Record<SituacaoDaOportunidade, Tom>> = {
  salva: "neutro",
  em_preparacao: "atencao",
  participada: "atencao",
  vencida: "positivo",
  perdida: "impedimento",
};

export function LinhaDoHistorico({ oportunidade }: { oportunidade: ResumoDaOportunidade }) {
  const { edital, avaliacao, situacao } = oportunidade;
  const tom = TOM_DA_SITUACAO[situacao] ?? "neutro";

  return (
    <li className="relative">
      <Link
        href={hrefDaOportunidade(oportunidade.id)}
        className="block px-4 py-4 transition-colors hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] sm:grid sm:grid-cols-[4.5rem_minmax(0,1fr)_9rem] sm:gap-6 sm:px-5 sm:py-5"
      >
        <div className="hidden sm:flex sm:items-start">
          <ScoreEmLinha score={avaliacao.score} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:hidden">
            <ScoreEmLinha score={avaliacao.score} />
          </div>

          <h3 className="mt-2 line-clamp-2 leading-snug font-medium tracking-tight text-balance sm:mt-0">
            {edital.objeto}
          </h3>

          <p className="mt-1.5 line-clamp-1 text-sm text-[var(--muted)]">
            {edital.orgao.nome}
            <span aria-hidden> · </span>
            {edital.local.municipio}/{edital.local.uf}
          </p>
        </div>

        <div className="mt-3 flex sm:mt-0 sm:items-start sm:justify-end">
          <Selo tom={tom}>{SITUACAO[situacao] ?? situacao}</Selo>
        </div>
      </Link>
    </li>
  );
}

export function ListaDoHistorico({ children }: { children: ReactNode }) {
  return <ul className="divide-y overflow-hidden rounded-xl border">{children}</ul>;
}
