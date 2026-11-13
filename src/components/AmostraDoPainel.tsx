import Link from "next/link";
import { DIAS_DE_TESTE } from "@/lib/assinatura/teste";

/** Dados da captura fornecida pelo dono. Não consulta nem expõe contas de clientes. */
const OPORTUNIDADES_DA_CAPTURA = [
  {
    orgao: "Município de Petrópolis",
    local: "Petrópolis/RJ",
    objeto: "Contratação de serviços de lavagem, desinfecção e higienização de caixas d’água e reservatórios",
    valor: 55_200,
    dias: 13,
  },
  {
    orgao: "Município de Armação dos Búzios",
    local: "Armação dos Búzios/RJ",
    objeto: "Registro de preços para serviços de controle de vetores e pragas urbanas",
    valor: 1_471_479,
    dias: 14,
  },
  {
    orgao: "Município de Nova Friburgo",
    local: "Nova Friburgo/RJ",
    objeto: "Controle de vetores e pragas urbanas e limpeza, higienização e desinfecção de caixas d’água",
    valor: 86_955,
    dias: 19,
  },
] as const;

export function AmostraDoPainel() {
  return (
    <section id="amostra-do-painel" aria-labelledby="titulo-amostra-painel" className="border-y bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <p className="text-sm font-semibold text-[var(--accent)]">Seu trabalho começa com uma visão mais clara</p>
        <h2 id="titulo-amostra-painel" className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Menos tempo procurando. Mais clareza para decidir.
        </h2>
        <p className="mt-5 max-w-3xl leading-relaxed text-[var(--muted)]">
          Reúna os editais do seu ramo em um painel com aderência ao perfil da sua
          empresa, valor, prazo e próxima ação. Veja o que merece atenção antes de
          abrir mais uma aba.
        </p>

        <figure className="mt-8 min-w-0" aria-label="Amostra da lista de oportunidades">
          <figcaption className="mb-3 text-sm leading-relaxed text-[var(--muted)]">
            Prévia baseada em uma captura do painel. Notas, valores e prazos são
            os do exemplo e não são atualizados aqui. Não é uma lista de editais abertos.
          </figcaption>
          <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#0e1c33] text-slate-200 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-[#091426] px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-medium tracking-wide text-slate-400">Licitante Vencedor</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Oportunidades</h3>
              </div>
              <span className="rounded-full border border-slate-600 px-3 py-1 text-xs font-medium text-slate-300">Amostra do painel</span>
            </div>
            <ul className="divide-y divide-slate-700">
              {OPORTUNIDADES_DA_CAPTURA.map((item) => (
                <li key={item.local} className="grid gap-4 p-5 md:grid-cols-[4.5rem_minmax(0,1fr)_9rem] md:gap-5 md:p-6">
                  <div className="hidden md:block">
                    <p className="text-3xl leading-none font-semibold tabular-nums text-emerald-300">86<span className="text-sm font-normal text-slate-400">/100</span></p>
                    <p className="mt-2 text-xs text-slate-400">Excelente</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      <span className="rounded-full border border-emerald-700 px-2 py-1 text-emerald-300 md:hidden">86/100 · Excelente</span>
                      <span className="rounded-full border border-emerald-700 px-2 py-1 text-emerald-300">✓ Prioridade</span>
                      <span className="rounded-full border border-slate-600 px-2 py-1 text-slate-300">não analisado</span>
                    </div>
                    <h4 className="mt-3 font-semibold leading-snug text-white">{item.objeto}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.orgao} · {item.local} · Pregão eletrônico</p>
                    <p className="mt-3 text-sm font-medium text-sky-200"><span aria-hidden>→ </span>Regularizar 2 documentos</p>
                  </div>
                  <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 md:flex-col md:items-end md:gap-3">
                    <div><dt className="sr-only">Valor estimado no exemplo</dt><dd className="font-semibold tabular-nums text-white">{item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</dd></div>
                    <div><dt className="sr-only">Prazo no exemplo</dt><dd className="rounded-full border border-slate-600 px-2 py-1 text-xs font-medium text-slate-200">Encerra em {item.dias} dias</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-[var(--muted)]">
            A nota mede aderência ao perfil declarado, não chance de vencer. O selo
            “não analisado” indica que o arquivo do edital não foi lido.
          </p>
        </figure>

        <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-xl border bg-[var(--background)] p-6 sm:p-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h3 className="text-xl font-semibold tracking-tight">Dê um próximo passo com mais informação.</h3>
            <p className="mt-3 leading-relaxed text-[var(--muted)]">
              Compare os planos e escolha como acompanhar suas oportunidades.
              Nos planos Empresa e Consultoria, os editais analisados também mostram
              exigências de habilitação e a comparação com os documentos declarados
              pela sua empresa. O teste de {DIAS_DE_TESTE} dias usa o Leve, sem leitura do arquivo.
            </p>
          </div>
          <Link href="/precos/" className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-3 rounded-lg bg-sky-400 px-6 py-3 text-center text-base font-semibold text-[#030814] transition-colors hover:bg-sky-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] sm:w-auto">
            Ver planos e escolher o meu <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
