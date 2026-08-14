"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Os filtros da lista. O único ponto de interação real destas telas.
 *
 * É `"use client"` por um motivo concreto: aplicar filtro a cada mudança, sem
 * botão, é a diferença entre uma ferramenta de trabalho e um formulário. Todo o
 * resto do produto continua sendo Server Component.
 *
 * O estado mora na URL, não no componente. Isso é o que faz um filtro ser
 * compartilhável, sobreviver ao recarregamento e voltar certo no botão
 * "voltar" — e é o que permite ao servidor fazer a filtragem de verdade, com o
 * dado inteiro, em vez de esconder linhas já enviadas ao navegador.
 *
 * O `<form method="get">` em volta não é enfeite: sem JavaScript, ele continua
 * filtrando pelo caminho do navegador. O botão de enviar aparece só nesse caso.
 */

export type ValoresDosFiltros = {
  situacao: string;
  prazo: string;
  score: string;
  prioridade: string;
};

const SITUACOES: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Todas, menos descartadas" },
  { valor: "nova", rotulo: "Novas" },
  { valor: "vista", rotulo: "Já vistas" },
  { valor: "salva", rotulo: "Salvas" },
  { valor: "em_preparacao", rotulo: "Em preparação" },
  { valor: "participada", rotulo: "Participadas" },
  { valor: "descartada", rotulo: "Descartadas" },
];

const PRAZOS: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Qualquer prazo" },
  { valor: "3", rotulo: "Encerra em até 3 dias" },
  { valor: "7", rotulo: "Encerra em até 7 dias" },
  { valor: "15", rotulo: "Encerra em até 15 dias" },
  { valor: "30", rotulo: "Encerra em até 30 dias" },
];

const SCORES: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Qualquer score" },
  { valor: "50", rotulo: "Score 50 ou mais" },
  { valor: "70", rotulo: "Score 70 ou mais" },
  { valor: "85", rotulo: "Score 85 ou mais" },
];

const PRIORIDADES: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Tudo" },
  { valor: "urgentes", rotulo: "Só urgentes" },
  { valor: "recomendadas", rotulo: "Só recomendadas" },
];

export function construirEndereco(valores: ValoresDosFiltros): string {
  const parametros = new URLSearchParams();
  if (valores.situacao) parametros.set("situacao", valores.situacao);
  if (valores.prazo) parametros.set("prazo", valores.prazo);
  if (valores.score) parametros.set("score", valores.score);
  if (valores.prioridade) parametros.set("prioridade", valores.prioridade);
  const busca = parametros.toString();
  return busca ? `/oportunidades/?${busca}` : "/oportunidades/";
}

function Campo({
  nome,
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  nome: keyof ValoresDosFiltros;
  rotulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  aoMudar: (nome: keyof ValoresDosFiltros, valor: string) => void;
}) {
  const id = `filtro-${nome}`;
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-xs font-medium tracking-wide text-[var(--muted)] uppercase"
      >
        {rotulo}
      </label>
      <select
        id={id}
        name={nome}
        value={valor}
        onChange={(evento) => aoMudar(nome, evento.target.value)}
        className="mt-1.5 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Filtros({ valores }: { valores: ValoresDosFiltros }) {
  const router = useRouter();
  const [aplicando, iniciarTransicao] = useTransition();

  function aoMudar(nome: keyof ValoresDosFiltros, valor: string) {
    const proximos = { ...valores, [nome]: valor };
    iniciarTransicao(() => {
      router.push(construirEndereco(proximos), { scroll: false });
    });
  }

  return (
    <form
      method="get"
      action="/oportunidades/"
      aria-label="Filtros da lista"
      aria-busy={aplicando}
      className={`grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-4 ${
        aplicando ? "opacity-60" : ""
      }`}
    >
      <Campo
        nome="situacao"
        rotulo="Situação"
        valor={valores.situacao}
        opcoes={SITUACOES}
        aoMudar={aoMudar}
      />
      <Campo nome="prazo" rotulo="Prazo" valor={valores.prazo} opcoes={PRAZOS} aoMudar={aoMudar} />
      <Campo
        nome="score"
        rotulo="Score mínimo"
        valor={valores.score}
        opcoes={SCORES}
        aoMudar={aoMudar}
      />
      <Campo
        nome="prioridade"
        rotulo="Recorte"
        valor={valores.prioridade}
        opcoes={PRIORIDADES}
        aoMudar={aoMudar}
      />
      <noscript>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Aplicar filtros
        </button>
      </noscript>
    </form>
  );
}
