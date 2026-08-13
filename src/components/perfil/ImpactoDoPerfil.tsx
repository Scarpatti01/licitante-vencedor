import Link from "next/link";
import { Aviso, Cartao, Etiqueta } from "@/components/app/ui";
import type { DiagnosticoDoPerfil, SecaoDoPerfil } from "./diagnostico";

/**
 * O que o cadastro liga e o que ele deixa desligado.
 *
 * Existe para responder a pergunta que ninguém faz em voz alta: "por que eu
 * preencheria mais um campo?". Barra de progresso não responde isso — dizer que
 * o critério de região está inerte, e que por isso edital de outro estado
 * continua entrando na lista, responde.
 *
 * O vocabulário é deliberado. Um critério sem dado não vale zero e não é "nota
 * baixa": ele sai da conta. Chamar isso de "inerte" mantém a tela coerente com
 * o motor, que prefere não pontuar a pontuar mal.
 */

const ANCORA: Record<SecaoDoPerfil, string> = {
  empresa: "#secao-empresa",
  atuacao: "#secao-atuacao",
  capacidade: "#secao-capacidade",
  documentacao: "#secao-documentacao",
  atestados: "#secao-atestados",
};

export function ImpactoDoPerfil({
  diagnostico,
  base = "",
}: {
  diagnostico: DiagnosticoDoPerfil;
  /** Prefixo do link quando o quadro não está na mesma página do formulário. */
  base?: string;
}) {
  const { criterios, inertes, bloqueiaRecomendacao } = diagnostico;

  return (
    <Cartao
      titulo="O que o seu cadastro liga na recomendação"
      descricao={
        inertes.length === 0
          ? "Todos os critérios que dependem do perfil estão ativos."
          : `${inertes.length} de ${criterios.length} critérios estão inertes por falta de dado. Critério inerte não vale zero: ele sai da conta, e o que sobra sustenta menos a recomendação.`
      }
    >
      {bloqueiaRecomendacao ? (
        <div className="mb-5">
          <Aviso tom="critico" titulo="Sem isto, não há score">
            Faltam região e/ou faixa de ticket. Quando metade do peso dos critérios
            fica sem base, o motor não publica um número — ele devolve o motivo. É
            uma escolha: um 62 que ninguém consegue defender na frente do cliente
            vale menos que um &ldquo;faltam informações&rdquo;.
          </Aviso>
        </div>
      ) : null}

      <ul className="divide-y">
        {criterios.map((criterio) => (
          <li key={criterio.chave} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="sm:w-56 sm:shrink-0">
              <p className="text-sm font-medium">{criterio.nome}</p>
              <div className="mt-1">
                {criterio.estado === "inerte" ? (
                  <Etiqueta tom="atencao">Inerte</Etiqueta>
                ) : criterio.estado === "ativo" ? (
                  <Etiqueta tom="positivo">Ativo</Etiqueta>
                ) : (
                  <Etiqueta tom="neutro">Sempre ativo</Etiqueta>
                )}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-[var(--muted)]">{criterio.efeito}</p>
              {criterio.campoQueFalta ? (
                <Link
                  href={`${base}${ANCORA[criterio.secao]}`}
                  className="mt-1.5 inline-block text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  Preencher {criterio.campoQueFalta.toLocaleLowerCase("pt-BR")}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
