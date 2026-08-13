import Link from "next/link";
import type { PainelDoDia } from "@/lib/dados/porta";
import { TOM } from "./estilo";

/**
 * O funil do dia: de tudo que entrou, o que sobrou para você olhar.
 *
 * Quatro números e não oito. A tentação num painel é mostrar tudo que dá para
 * contar; o efeito é que nada fica em primeiro plano e o usuário passa a
 * ignorar a faixa inteira. Estes quatro são os que mudam a decisão de como
 * gastar a próxima hora — e cada um leva à lista já filtrada, porque número que
 * não dá para abrir é enfeite.
 */

type Etapa = {
  chave: string;
  valor: number;
  rotulo: string;
  explicacao: string;
  href: string;
  /** Cor só quando o número pede ação. Zero não merece destaque. */
  cor?: string;
};

export function Funil({ painel }: { painel: PainelDoDia }) {
  const etapas: Etapa[] = [
    {
      chave: "novas",
      valor: painel.novas,
      rotulo: "Novas",
      explicacao: "Coletadas e ainda não abertas por você.",
      href: "/oportunidades/?situacao=nova",
    },
    {
      chave: "recomendadas",
      valor: painel.recomendadas,
      rotulo: "Recomendadas",
      explicacao: "O cruzamento com o seu perfil é favorável.",
      href: "/oportunidades/?prioridade=recomendadas",
    },
    {
      chave: "excelentes",
      valor: painel.excelentes,
      rotulo: "Excelentes",
      explicacao: "Score 85 ou mais de aderência ao seu perfil.",
      href: "/oportunidades/?score=85",
      cor: painel.excelentes > 0 ? TOM.positivo.texto : undefined,
    },
    {
      chave: "urgentes",
      valor: painel.urgentes,
      rotulo: "Urgentes",
      explicacao: "Recomendadas que encerram em até 3 dias.",
      href: "/oportunidades/?prioridade=urgentes",
      cor: painel.urgentes > 0 ? TOM.atencao.texto : undefined,
    },
  ];

  return (
    <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-[var(--border)] sm:grid-cols-4">
      {etapas.map((etapa) => (
        <li key={etapa.chave} className="bg-[var(--background)]">
          <Link
            href={etapa.href}
            className="block h-full p-4 transition-colors hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-5"
          >
            <p
              className={`text-4xl leading-none font-semibold tabular-nums ${etapa.cor ?? ""} ${
                etapa.valor === 0 ? "text-[var(--muted)]" : ""
              }`}
            >
              {etapa.valor}
            </p>
            <p className="mt-2 text-sm font-semibold tracking-tight">{etapa.rotulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{etapa.explicacao}</p>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/**
 * Documentação pendente somada nas recomendadas.
 *
 * Fica fora do funil de propósito: não é uma etapa dele, é a única métrica do
 * painel que fala da empresa e não dos editais — e é a que mais desclassifica
 * fornecedor na hora da sessão.
 */
export function DocumentacaoPendente({ quantidade }: { quantidade: number }) {
  const pendente = quantidade > 0;
  const estilo = pendente ? TOM.atencao : TOM.positivo;

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 ${estilo.bloco}`}>
      <span aria-hidden className={estilo.texto}>
        {estilo.glifo}
      </span>
      <p className="text-sm">
        <span className={`font-semibold ${estilo.texto}`}>
          {pendente
            ? `${quantidade} ${quantidade === 1 ? "documento obrigatório pendente" : "documentos obrigatórios pendentes"}`
            : "Nenhum documento obrigatório pendente"}
        </span>{" "}
        <span className="text-[var(--muted)]">
          {pendente
            ? "nas oportunidades recomendadas. Documento pendente é o que mais desclassifica fornecedor na habilitação."
            : "nas oportunidades recomendadas, com base no que está no cadastro da sua empresa."}
        </span>
      </p>
    </div>
  );
}
