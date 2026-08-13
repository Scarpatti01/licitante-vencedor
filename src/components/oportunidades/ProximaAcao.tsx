import Link from "next/link";
import type { ProximaAcao as TipoProximaAcao } from "@/lib/dominio/recomendacao";
import { TOM, type Tom } from "./estilo";
import { Selo } from "./Primitivos";

/**
 * O fim da página do edital, e o ponto do produto inteiro.
 *
 * `recomendacao.ts` diz por que ela existe: uma tela que informa muito e não
 * termina em verbo devolve o problema ao usuário. Por isso este é o único bloco
 * da página com fundo próprio, título em corpo grande e os links de saída —
 * quem rolar até aqui sabe o que fazer sem reler nada acima.
 *
 * O texto não é escrito aqui. Título, motivo e itens vêm prontos do domínio,
 * porque a redação de uma ação é decisão de produto e precisa ser a mesma no
 * painel, no e-mail e nesta página.
 */

const TOM_DA_ACAO: Record<TipoProximaAcao["tipo"], Tom> = {
  montar_proposta: "positivo",
  decidir_rapido: "atencao",
  regularizar_documentos: "atencao",
  ler_edital: "neutro",
  completar_perfil: "indeterminado",
  arquivar: "impedimento",
};

const ROTULO_DA_ACAO: Record<TipoProximaAcao["tipo"], string> = {
  montar_proposta: "Caminho livre",
  decidir_rapido: "Decisão de hoje",
  regularizar_documentos: "Pendência documental",
  ler_edital: "Falta leitura",
  completar_perfil: "Falta perfil",
  arquivar: "Sem caminho",
};

export function BlocoDeProximaAcao({
  acao,
  linkOficial,
}: {
  acao: TipoProximaAcao;
  linkOficial: string;
}) {
  const tom = TOM_DA_ACAO[acao.tipo];
  // Arquivar é a única ação que não merece a cor de "siga em frente". O resto
  // continua sendo trabalho a fazer, e o verde do produto é o convite a fazê-lo.
  const fundo = tom === "impedimento" ? TOM.impedimento.bloco : "bg-[var(--accent-soft)]";

  return (
    <section
      aria-labelledby="proxima-acao"
      className={`rounded-2xl p-6 ring-1 ring-inset ring-[var(--border)] sm:p-8 ${fundo}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <p
          className={`text-xs font-semibold tracking-[0.14em] uppercase ${
            tom === "impedimento" ? TOM.impedimento.texto : "text-[var(--accent)]"
          }`}
        >
          Próxima ação
        </p>
        <Selo tom={tom} tamanho="pequeno">
          {ROTULO_DA_ACAO[acao.tipo]}
        </Selo>
      </div>

      <h2
        id="proxima-acao"
        className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
      >
        {acao.titulo}
      </h2>

      <p className="mt-3 max-w-2xl leading-relaxed">{acao.porque}</p>

      {acao.itens.length > 0 ? (
        <ul className="mt-5 max-w-2xl space-y-2">
          {acao.itens.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-3">
        <a
          href={linkOficial}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          Abrir o registro oficial no PNCP
          <span aria-hidden> ↗</span>
        </a>
        <Link
          href="/oportunidades/"
          className="rounded-lg border bg-[var(--background)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          Voltar para a lista
        </Link>
      </div>

      <p className="mt-7 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">
        Isto é triagem operacional e checklist, não parecer jurídico e não estimativa de resultado.
        A leitura do edital na íntegra e a decisão de participar continuam sendo da sua empresa, e{" "}
        <strong className="font-medium text-[var(--foreground)]">
          em qualquer divergência prevalece o edital
        </strong>
        .
      </p>
    </section>
  );
}
