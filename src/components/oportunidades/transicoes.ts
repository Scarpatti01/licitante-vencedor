import type { SituacaoDaOportunidade } from "@/lib/dominio/tipos";

/**
 * O caminho que uma oportunidade percorre depois que o cliente decide agir.
 *
 * `registrarAcao` (em `dados/porta.ts`) aceita qualquer uma das oito situações
 * a qualquer momento — é a implementação que não impõe ordem. A ordem é regra
 * de produto, não de dado: "perdida" só faz sentido depois de "participada", e
 * uma oportunidade "descartada" não volta a aparecer como se nada tivesse
 * acontecido. Este módulo é o único lugar que decide quais botões a tela
 * pode oferecer para cada situação atual — puro, sem `"use client"` nem
 * `"use server"`, para que um teste alcance sem simular navegador nem sessão.
 */

export type AcaoDisponivel = {
  situacao: SituacaoDaOportunidade;
  rotulo: string;
  /** Ações que fecham a oportunidade puxam a atenção de outro jeito na tela. */
  destino: "positiva" | "neutra" | "negativa";
};

const SALVAR: AcaoDisponivel = { situacao: "salva", rotulo: "Salvar", destino: "positiva" };
const DESCARTAR: AcaoDisponivel = {
  situacao: "descartada",
  rotulo: "Descartar",
  destino: "negativa",
};
const PREPARAR: AcaoDisponivel = {
  situacao: "em_preparacao",
  rotulo: "Marcar em preparação",
  destino: "positiva",
};
const PARTICIPAR: AcaoDisponivel = {
  situacao: "participada",
  rotulo: "Marcar como participada",
  destino: "positiva",
};
const VENCER: AcaoDisponivel = { situacao: "vencida", rotulo: "Marcar como vencida", destino: "positiva" };
const PERDER: AcaoDisponivel = { situacao: "perdida", rotulo: "Marcar como perdida", destino: "negativa" };

/**
 * As ações que a situação atual permite.
 *
 * `vencida`, `perdida` e `descartada` são estados terminais: devolvem lista
 * vazia, e é assim — não com um `disabled` na tela — que a interface aprende a
 * não desenhar botão nenhum ali.
 */
export function acoesDisponiveis(situacaoAtual: SituacaoDaOportunidade): AcaoDisponivel[] {
  switch (situacaoAtual) {
    case "nova":
    case "vista":
      return [SALVAR, DESCARTAR];
    case "salva":
      return [PREPARAR, DESCARTAR];
    case "em_preparacao":
      return [PARTICIPAR, DESCARTAR];
    case "participada":
      return [VENCER, PERDER];
    case "vencida":
    case "perdida":
    case "descartada":
      return [];
  }
}
