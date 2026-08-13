import type { Edital } from "@/lib/pncp/tipos";
import { type Campo, doEdital } from "@/lib/dominio/procedencia";
import {
  dataHora,
  localDoEdital,
  orgaoDoEdital,
  prazoDoEdital,
  TOM,
  valorDoEdital,
} from "./estilo";
import { Procedencia } from "./Primitivos";

/**
 * Valor, órgão, local e prazo — os quatro dados que decidem se vale abrir o
 * edital, cada um com a sua procedência colada.
 *
 * Nenhum deles é impresso como texto solto: todos passam por `Campo`, o mesmo
 * tipo do domínio, para que "R$ 480.000" e "Sem valor estimado" cheguem à tela
 * pelo mesmo caminho e seja impossível esquecer de tratar o segundo caso.
 */
export function FichaDoEdital({ edital, agora }: { edital: Edital; agora: Date }) {
  const itens = [
    { rotulo: "Valor estimado", ...valorDoEdital(edital) },
    { rotulo: "Órgão comprador", ...orgaoDoEdital(edital) },
    { rotulo: "Local de execução", ...localDoEdital(edital) },
    { rotulo: "Prazo para propostas", ...prazoDoEdital(edital, agora) },
  ];

  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border bg-[var(--border)] sm:grid-cols-2">
      {itens.map((item) => (
        <div key={item.rotulo} className="bg-[var(--background)] p-4 sm:p-5">
          <dt className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            {item.rotulo}
          </dt>
          <dd className="mt-2">
            <p
              className={`text-lg leading-snug font-semibold tracking-tight ${
                item.tom === "neutro" ? "" : TOM[item.tom].texto
              }`}
            >
              {item.texto}
            </p>
            <Procedencia campo={item.campo} className="mt-2" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

type Secundario = { rotulo: string; texto: string; campo?: Campo<unknown> };

/**
 * O resto da publicação. Fica menor porque é menos decisivo, e não porque
 * importa menos: é aqui que estão modalidade, amparo legal e a hora exata da
 * sessão, que o licitante confere antes de montar proposta.
 */
export function DetalhesDaPublicacao({ edital }: { edital: Edital }) {
  const itens: Secundario[] = [
    {
      rotulo: "Modalidade",
      texto: edital.modalidade,
      campo: doEdital(edital.modalidade, "Modalidade informada na publicação."),
    },
    { rotulo: "Modo de disputa", texto: edital.modoDisputa ?? "Não informado" },
    { rotulo: "Instrumento", texto: edital.instrumento ?? "Não informado" },
    { rotulo: "Amparo legal", texto: edital.amparoLegal ?? "Não informado" },
    { rotulo: "Registro de preços", texto: edital.registroDePrecos ? "Sim" : "Não" },
    {
      rotulo: "Abertura das propostas",
      texto: edital.aberturaProposta ? dataHora(edital.aberturaProposta) : "Não informada",
    },
    {
      rotulo: "Publicado em",
      texto: edital.publicadoEm ? dataHora(edital.publicadoEm) : "Não informado",
    },
    { rotulo: "Situação na fonte", texto: edital.situacao ?? "Não informada" },
    {
      rotulo: "Fonte",
      texto: `${edital.fonte.toUpperCase()} · coletado em ${dataHora(edital.coletadoEm)}`,
    },
  ];

  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((item) => (
        <div key={item.rotulo}>
          <dt className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            {item.rotulo}
          </dt>
          <dd className="mt-1 text-sm leading-snug">{item.texto}</dd>
          {item.campo ? <Procedencia campo={item.campo} className="mt-1" /> : null}
        </div>
      ))}
    </dl>
  );
}
