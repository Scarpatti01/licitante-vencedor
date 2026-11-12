import { PLANOS, emReais, type Plano } from "@/lib/precos";
import { DIAS_DE_TESTE } from "@/lib/assinatura/teste";

const LINHAS: { titulo: string; valor: (plano: Plano) => string }[] = [
  { titulo: "Mensalidade", valor: (p) => `${emReais(p.mensalidadeEmCentavos)}/mês` },
  { titulo: "Empresas na conta", valor: (p) => String(p.empresas) },
  { titulo: "Abrangência", valor: (p) => p.recortes === null ? "Regiões do perfil da empresa" : `Até ${p.recortes} recortes` },
  { titulo: "Dados da publicação, aderência e histórico", valor: () => "Incluídos" },
  { titulo: "Resumo por e-mail", valor: () => "Dias úteis com edital novo" },
  { titulo: "Leitura do documento", valor: (p) => p.profundidade === "documento" ? "Editais de maior aderência, com volume diário limitado" : "Não incluída" },
  { titulo: "Exigências e comparação documental", valor: (p) => p.profundidade === "documento" ? "Nos editais analisados" : "Não incluídas" },
];

export function ComparacaoDePlanos() {
  return (
    <section id="comparar-planos" aria-labelledby="titulo-comparacao" className="mt-12 scroll-mt-8">
      <h2 id="titulo-comparacao" className="text-xl font-semibold">Compare o que cada plano entrega</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">No celular, deslize a tabela para comparar. O teste de {DIAS_DE_TESTE} dias usa o plano Leve, sem leitura do documento.</p>
      <div className="mt-5 overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Comparação dos planos, com rolagem horizontal">
        <table className="w-full min-w-[680px] text-left text-sm">
          <caption className="sr-only">Recursos e preços mensais dos planos do Licitante Vencedor</caption>
          <thead className="bg-[var(--surface)]"><tr><th scope="col" className="p-4">Recurso</th>{PLANOS.map((p) => <th key={p.codigo} scope="col" className="p-4">{p.nome}</th>)}</tr></thead>
          <tbody>{LINHAS.map((linha) => <tr key={linha.titulo} className="border-t"><th scope="row" className="p-4 font-medium">{linha.titulo}</th>{PLANOS.map((p) => <td key={p.codigo} className="p-4 align-top">{linha.valor(p)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">Nos planos com leitura, os demais editais continuam identificados como não analisados. Não há número mínimo de leituras por dia.</p>
    </section>
  );
}
