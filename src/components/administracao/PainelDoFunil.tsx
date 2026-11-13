import { ETAPAS_DO_FUNIL, taxaDoFunil, type ResumoDoFunil } from "@/lib/funil";
import { dataEHoraDeBrasilia } from "@/lib/dominio/datas";

function porcentagem(valor: number | null) {
  return valor === null ? "Sem base" : valor.toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 });
}

export function PainelDoFunil({ resumo }: { resumo: ResumoDoFunil }) {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Cadastros recebidos de {dataEHoraDeBrasilia(resumo.desde)} até {dataEHoraDeBrasilia(resumo.ate)}, horário de Brasília.
        Os avanços dessa mesma coorte são consultados até o momento da leitura.
      </p>
      <ol className="space-y-4" aria-label="Etapas de ativação">
        {ETAPAS_DO_FUNIL.map((etapa, i) => {
          const total = resumo[etapa.chave];
          const anterior = i === 0 ? null : resumo[ETAPAS_DO_FUNIL[i - 1].chave];
          const taxa = taxaDoFunil(total, resumo.cadastros);
          return (
            <li key={etapa.chave} className="rounded-xl border bg-[var(--background)] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-semibold">{i + 1}. {etapa.nome}</h2>
                <strong className="text-2xl tabular-nums">{total.toLocaleString("pt-BR")}</strong>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{etapa.criterio}</p>
              <div aria-hidden className="mt-4 h-2 overflow-hidden rounded bg-[var(--surface)]">
                <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${(taxa ?? 0) * 100}%` }} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                {porcentagem(taxa)} dos cadastros
                {anterior === null ? "" : ` · ${porcentagem(taxaDoFunil(total, anterior))} do passo anterior · ${anterior - total} sem avançar`}
              </p>
            </li>
          );
        })}
      </ol>
      <section className="rounded-xl border bg-[var(--background)] p-5">
        <h2 className="font-semibold">Assinaturas ativas na coorte: {resumo.assinaturas_ativas}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Contas confirmadas dessa coorte com assinatura ativa e referência externa de cobrança.
          O teste não entra nessa contagem. A assinatura pode ocorrer antes da interação com um edital,
          por isso este número fica separado das etapas de ativação. Não é uma apuração de receita recebida.
        </p>
      </section>
    </div>
  );
}
