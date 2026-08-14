import type { Avaliacao } from "@/lib/dominio/recomendacao";
import type { CriterioAvaliado } from "@/lib/dominio/score";
import { CRITERIO, TOM } from "./estilo";
import { Aviso, Procedencia, Selo } from "./Primitivos";

/**
 * Riscos: o que pode custar dias, dinheiro ou a habilitação — e o que não
 * sabemos sobre isso.
 *
 * A porta de dados entrega o cruzamento (`Avaliacao`), não a análise bruta do
 * documento. Isto aqui, então, não inventa uma lista de riscos: destaca os três
 * critérios que são risco operacional puro — exigências extras, prazo e
 * documentação — cada um com a frase e a procedência que o domínio já produziu.
 *
 * E quando o edital não foi lido em profundidade, a seção diz isso em primeiro
 * lugar. Uma tela que mostrasse "nenhum risco encontrado" sem ter aberto o
 * documento seria a mentira mais cara do produto: quem confia nela descobre a
 * exigência de garantia na véspera da sessão.
 */

const RISCOS_RELEVANTES = ["complexidade", "prazo", "documentacao"];

const CONTEXTO: Record<string, string> = {
  complexidade:
    "Garantia de proposta, visita técnica e amostra não aparecem no registro da publicação — só no texto do edital. Cada uma soma custo e dias ao preparo.",
  prazo:
    "O prazo é o risco que não se negocia: documento em ordem e proposta pronta não valem nada depois do encerramento.",
  documentacao:
    "Documento pendente é o que mais desclassifica fornecedor na habilitação, e é o único risco desta lista que depende só de você.",
};

export function Riscos({
  avaliacao,
  editalLido,
}: {
  avaliacao: Avaliacao;
  editalLido: boolean;
}) {
  const criterios = RISCOS_RELEVANTES.map((chave) =>
    avaliacao.score.criterios.find((criterio) => criterio.chave === chave),
  ).filter((criterio): criterio is CriterioAvaliado => criterio !== undefined);

  return (
    <div className="space-y-5">
      {!editalLido ? (
        <Aviso tom="indeterminado" titulo="Os riscos do texto deste edital não foram extraídos">
          <p>
            Esta análise foi feita sobre o registro oficial da publicação, sem baixar e ler o
            documento. Não há lista de riscos aqui porque ela não foi produzida — e não porque o
            edital não tenha nenhum. Antes de decidir, abra o registro oficial.
          </p>
        </Aviso>
      ) : null}

      <ul className="divide-y rounded-xl border">
        {criterios.map((criterio) => {
          const { rotulo, tom } = CRITERIO[criterio.status];
          return (
            <li key={criterio.chave} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <p className="leading-snug font-medium">{criterio.nome}</p>
                <Selo tom={tom} tamanho="pequeno">
                  {rotulo}
                </Selo>
              </div>
              <p className={`mt-2 text-sm leading-relaxed ${TOM[tom].texto}`}>{criterio.frase}</p>
              {CONTEXTO[criterio.chave] ? (
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  {CONTEXTO[criterio.chave]}
                </p>
              ) : null}
              <Procedencia campo={criterio.procedencia} className="mt-2" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
