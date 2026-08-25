import Link from "next/link";
import { PrazoDoEdital } from "@/components/PrazoDoEdital";
import { dataEHoraDeBrasilia } from "@/lib/dominio/datas";
import type { EditalAberto } from "@/lib/abertos/tipos";

/**
 * A hora do retrato, no topo da página e não no rodapé.
 *
 * É a primeira coisa que quem procura licitação precisa saber, e a única que
 * separa "listagem honesta" de "listagem que envelheceu sem avisar". Fica antes
 * dos números de propósito: o leitor lê a validade antes de ler a promessa.
 */
export function RetratoDatado({ coletadoEm }: { coletadoEm: string }) {
  return (
    <p className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
      Retrato do PNCP em <strong>{dataEHoraDeBrasilia(coletadoEm)}</strong>, horário de
      Brasília. A lista é regravada a cada coleta; entre uma e outra, o que muda no
      PNCP não aparece aqui.
    </p>
  );
}

const real = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function ListaDeAbertos({ editais }: { editais: readonly EditalAberto[] }) {
  if (editais.length === 0) {
    return (
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        A amostra desta lista entra na próxima coleta.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
      {editais.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700"
        >
          <p className="text-sm font-medium text-balance">{e.objeto}</p>

          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {e.orgao} · {e.municipio}/{e.uf} · {e.modalidade}
            {/*
              Valor ausente vira "não informado", nunca R$ 0. O PNCP usa zero para
              "não informou" e também aceita valores reais baixos; afirmar zero
              seria inventar um dado que a fonte não deu — ver `fontes/tipos.ts`.
            */}
            {" · "}
            {e.valorEstimado === null ? "valor não informado" : real(e.valorEstimado)}
          </p>

          <p className="mt-2 text-sm">
            Propostas até <PrazoDoEdital em={e.encerramentoProposta} className="font-medium" />
          </p>

          <p className="mt-2 text-sm">
            <Link
              href={e.link}
              rel="nofollow noopener"
              target="_blank"
              className="underline underline-offset-2"
            >
              Ver o edital no PNCP
            </Link>
          </p>
        </li>
      ))}
    </ul>
  );
}
