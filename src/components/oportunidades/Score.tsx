import type { CriterioAvaliado, Score } from "@/lib/dominio/score";
import { CRITERIO, FAIXA, TOM } from "./estilo";
import { Procedencia, Selo } from "./Primitivos";

/**
 * O score na lista: número e faixa, ou o motivo de não haver número.
 *
 * `score.valor === null` NÃO vira 0 e não vira traço. Vira a palavra
 * "Sem score", e quem chama é obrigado a mostrar `score.motivo` ao lado — é o
 * que separa "esta oportunidade é ruim" de "não temos base para julgar", que
 * são conclusões opostas sobre o que o usuário deve fazer.
 */
export function ScoreCompacto({ score }: { score: Score }) {
  if (score.valor === null) {
    return (
      <div className="flex flex-col gap-1">
        <span
          className={`text-sm font-semibold tracking-tight ${TOM.indeterminado.texto}`}
        >
          Sem score
        </span>
        <span className="text-xs text-[var(--muted)]">indeterminado</span>
      </div>
    );
  }

  const faixa = FAIXA[score.faixa];
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-3xl leading-none font-semibold tabular-nums ${TOM[faixa.tom].texto}`}>
        {score.valor}
        <span className="text-sm font-normal text-[var(--muted)]">/100</span>
      </span>
      <span className="text-xs font-medium text-[var(--muted)]">{faixa.rotulo}</span>
    </div>
  );
}

/** Versão em linha, para o cabeçalho da linha no celular. */
export function ScoreEmLinha({ score }: { score: Score }) {
  if (score.valor === null) {
    return (
      <Selo tom="indeterminado" tamanho="pequeno">
        Sem score
      </Selo>
    );
  }
  const faixa = FAIXA[score.faixa];
  return (
    <Selo tom={faixa.tom} tamanho="pequeno" comGlifo={false}>
      <span className="tabular-nums">{score.valor}</span>
      <span className="font-normal opacity-80">/100 · {faixa.rotulo}</span>
    </Selo>
  );
}

/**
 * A cobertura é o que impede o número de ser lido como precisão que ele não tem.
 *
 * Critério sem base sai da conta em vez de valer zero (ver `score.ts`), e o
 * preço disso é que dois editais com 89 podem ter sido julgados por conjuntos
 * diferentes de critérios. A barra existe para o usuário ver isso.
 */
function Cobertura({ score }: { score: Score }) {
  const pct = Math.round(score.cobertura * 100);
  const avaliados = score.criterios.length - score.indeterminados.length;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
          Base do cálculo
        </span>
        <span className="text-xs tabular-nums text-[var(--muted)]">
          {avaliados} de {score.criterios.length} critérios
        </span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
        role="img"
        aria-label={`${pct}% do peso dos critérios pôde ser avaliado`}
      >
        <div
          className={`h-full rounded-full ${pct >= 50 ? TOM.positivo.barra : TOM.atencao.barra}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
        {pct}% do peso dos critérios pôde ser avaliado. O que não pôde ficou de fora da conta em vez
        de valer zero.
      </p>
    </div>
  );
}

/** O bloco do score na página do edital: número, faixa e base do cálculo. */
export function ScoreDetalhado({ score }: { score: Score }) {
  const faixa = FAIXA[score.faixa];

  return (
    <div className="rounded-xl border">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
        <div className="sm:w-44 sm:shrink-0">
          {score.valor === null ? (
            <>
              <p className={`text-xl font-semibold tracking-tight ${TOM.indeterminado.texto}`}>
                Sem score
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                Aderência indeterminada
              </p>
            </>
          ) : (
            <>
              <p className={`text-5xl leading-none font-semibold tabular-nums ${TOM[faixa.tom].texto}`}>
                {score.valor}
                <span className="text-xl font-normal text-[var(--muted)]">/100</span>
              </p>
              <p className="mt-2">
                <Selo tom={faixa.tom} tamanho="pequeno" comGlifo={false}>
                  Aderência {faixa.rotulo.toLowerCase()}
                </Selo>
              </p>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          {score.motivo ? (
            <p className="text-sm leading-relaxed">{score.motivo}</p>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Aderência entre este edital e o perfil da sua empresa. É triagem: mede o quanto o
              certame combina com o que você declarou — não é previsão de resultado.
            </p>
          )}
          <Cobertura score={score} />
        </div>
      </div>
    </div>
  );
}

/**
 * Um grupo de critérios — os "por quês" do número.
 *
 * Cada frase vem acompanhada da procedência do dado que a sustenta. É o que
 * transforma o score em argumento verificável em vez de caixa-preta: o usuário
 * lê "R$ 480.000 está dentro da faixa que você opera" e, embaixo, "Informado no
 * edital — valor total estimado, como publicado pelo órgão".
 */
export function GrupoDeCriterios({
  titulo,
  criterios,
  vazio,
}: {
  titulo: string;
  criterios: CriterioAvaliado[];
  vazio?: string;
}) {
  if (criterios.length === 0) {
    if (!vazio) return null;
    return (
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{titulo}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{vazio}</p>
      </div>
    );
  }

  const tom = CRITERIO[criterios[0].status].tom;
  const estilo = TOM[tom];

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span aria-hidden className={estilo.texto}>
          {estilo.glifo}
        </span>
        {titulo}
        <span className="font-normal text-[var(--muted)] tabular-nums">({criterios.length})</span>
      </h3>
      <ul className="mt-3 space-y-3">
        {criterios.map((criterio) => (
          <li key={criterio.chave} className={`rounded-lg p-3 ${estilo.bloco}`}>
            <p className="text-sm leading-relaxed">
              <span className="font-medium">{criterio.nome}.</span>{" "}
              <span className="text-[var(--foreground)]">{criterio.frase}</span>
            </p>
            <Procedencia campo={criterio.procedencia} className="mt-1.5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
