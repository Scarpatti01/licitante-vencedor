import type { Checklist as TipoChecklist, StatusDoItem } from "@/lib/dominio/checklist";
import { FASE, ITEM_DO_CHECKLIST, TOM } from "./estilo";
import { Aviso, Selo } from "./Primitivos";

/**
 * O checklist de habilitação, com os quatro estados que ele tem de verdade.
 *
 * "Tenho" e "não tenho" seria mais fácil de desenhar e mentiria em metade dos
 * casos: certidão cadastrada sem arquivo, certidão vencida e exigência que nem
 * sabemos se este edital faz são três situações diferentes, e cada uma pede uma
 * providência diferente da empresa. A tela mostra as quatro.
 */

const ORDEM: StatusDoItem[] = ["ausente", "verificar", "nao_identificado", "disponivel"];

function Contador({
  status,
  quantidade,
}: {
  status: StatusDoItem;
  quantidade: number;
}) {
  const { rotulo, tom } = ITEM_DO_CHECKLIST[status];
  const estilo = TOM[tom];
  return (
    <div className="bg-[var(--background)] p-3 sm:p-4">
      <p className={`text-2xl leading-none font-semibold tabular-nums ${quantidade > 0 ? estilo.texto : "text-[var(--muted)]"}`}>
        {quantidade}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
        <span aria-hidden className={quantidade > 0 ? estilo.texto : "text-[var(--muted)]"}>
          {estilo.glifo}
        </span>
        {rotulo}
      </p>
    </div>
  );
}

export function Checklist({ checklist }: { checklist: TipoChecklist }) {
  const { totais, itens } = checklist;

  // Ordem deliberada: o que falta vem antes do que já está pronto. Uma lista
  // que começa pelos documentos em dia esconde o trabalho no fim da rolagem.
  const ordenados = [...itens].sort(
    (a, b) => ORDEM.indexOf(a.status) - ORDEM.indexOf(b.status),
  );

  return (
    <div className="space-y-5">
      {!checklist.derivadoDoDocumento ? (
        <Aviso tom="indeterminado" titulo="Este checklist ainda não foi extraído deste edital">
          <p>
            {checklist.analiseLeuTexto
              ? "O documento do edital foi lido, mas nenhuma exigência de habilitação foi confirmada nele — a lista abaixo é a habilitação que a Lei 14.133/2021 torna usual, não a exigência confirmada deste certame."
              : "O documento do edital não foi lido, então a lista abaixo é a habilitação que a Lei 14.133/2021 torna usual — não a exigência confirmada deste certame."}{" "}
            Trate-a como ponto de partida e confirme no texto oficial.
          </p>
        </Aviso>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
          {totais.obrigatorios === 1
            ? "1 documento obrigatório"
            : `${totais.obrigatorios} documentos obrigatórios`}
        </p>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-[var(--border)] sm:grid-cols-4">
          <Contador status="disponivel" quantidade={totais.disponiveis} />
          <Contador status="verificar" quantidade={totais.verificar} />
          <Contador status="ausente" quantidade={totais.ausentes} />
          <Contador status="nao_identificado" quantidade={totais.naoIdentificados} />
        </div>
      </div>

      <ul className="divide-y rounded-xl border">
        {ordenados.map((item) => {
          const { rotulo, tom } = ITEM_DO_CHECKLIST[item.status];
          return (
            <li
              key={`${item.tipo}-${item.nome}`}
              className="p-4 sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-5 sm:p-5"
            >
              <div className="mb-2 sm:mb-0">
                <Selo tom={tom} tamanho="pequeno">
                  {rotulo}
                </Selo>
              </div>
              <div className="min-w-0">
                <p className="leading-snug font-medium">{item.nome}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {FASE[item.fase]}
                  <span aria-hidden> · </span>
                  {item.obrigatorio ? "Obrigatório" : "Não obrigatório"}
                </p>
                {item.descricaoNoEdital ? (
                  <p className="mt-2 text-sm leading-relaxed">
                    <span className="text-[var(--muted)]">Como o edital pede: </span>
                    {item.descricaoNoEdital}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.observacao}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
