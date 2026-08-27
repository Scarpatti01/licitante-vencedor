import { ETAPAS } from "./conteudo";
import { estadoDaJornada, respostasDaEtapa } from "./repositorio";

/**
 * As respostas da pessoa, montadas para virar um documento.
 *
 * ## Por que HTML e não uma biblioteca de PDF
 *
 * Porque o navegador já sabe paginar, hifenizar e imprimir, e porque o usuário
 * imprime com um atalho que ele já conhece. Uma biblioteca de PDF no servidor
 * custaria dependência, memória e um segundo motor de layout para manter em
 * pé, tudo isso para produzir um documento pior que o que o Ctrl+P dá de graça.
 *
 * A folha usa a mesma identidade do livro: quem preencheu na tela reconhece o
 * papel.
 */

export type EtapaExportada = {
  semana: number;
  titulo: string;
  criterio: string;
  concluidaEm: string | null;
  campos: { rotulo: string; resposta: string | null }[];
};

export type Exportacao = {
  concluidas: number;
  total: number;
  etapas: EtapaExportada[];
};

export async function montarExportacao(): Promise<Exportacao | null> {
  const estado = await estadoDaJornada();
  if (!estado.temAcesso) return null;

  const etapas: EtapaExportada[] = [];
  for (const etapa of ETAPAS) {
    const respostas = await respostasDaEtapa(etapa.codigo);
    etapas.push({
      semana: etapa.semana,
      titulo: etapa.titulo,
      criterio: etapa.criterio,
      concluidaEm: estado.progresso.get(etapa.codigo)?.concluidaEm ?? null,
      campos: etapa.campos.map((campo) => ({
        rotulo: campo.rotulo,
        // Campo em branco continua aparecendo, com a pauta vazia. Sumir com ele
        // esconderia da pessoa exatamente o que ela ainda não respondeu, que é
        // metade do valor de olhar a folha inteira.
        resposta: respostas.get(campo.codigo) ?? null,
      })),
    });
  }

  return { concluidas: estado.concluidas, total: ETAPAS.length, etapas };
}

/** Data por extenso, para o cabeçalho da folha. */
export function dataPorExtenso(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
