import type { AnaliseDoEdital } from "../dominio/tipos.ts";
import type { Candidato } from "../pipeline/candidatosParaLeitura.ts";
import { triar } from "../pipeline/triagem.ts";
import { decisaoParaLinha, oportunidadeParaLinha } from "./mapeamento.ts";
import type { Repositorio } from "./repositorio.ts";

/**
 * Regrava as oportunidades dos editais que acabaram de ser lidos.
 *
 * `triar-editais.ts` já gravou cada par empresa×edital com a análise "de ficha"
 * — honesta, mas sem documento. Depois que a leitura acontece, os pares
 * afetados são reavaliados com a análise real e regravados por cima, na mesma
 * chave, sem versão nova: o algoritmo de score não mudou, só o dado de entrada
 * melhorou.
 *
 * Vive aqui, e não dentro de um script, porque agora há DOIS caminhos de
 * leitura — a avulsa de `ler-recomendados.ts` e a em lote de `ler-em-lote.ts` —
 * e a regravação precisa ser literalmente a mesma nos dois. Duas cópias desta
 * função significariam, no primeiro dia em que uma delas mudasse, oportunidades
 * gravadas com regras diferentes conforme o horário em que o edital entrou.
 */
export type ResultadoDaRegravacao = {
  oportunidades: number;
  decisoes: number;
};

export async function regravarComAnalise(opcoes: {
  repositorio: Repositorio;
  candidatos: Map<string, Candidato>;
  /** Por uuid do edital. Quem não está aqui não foi lido e fica como está. */
  analises: Map<string, AnaliseDoEdital>;
  agora: Date;
}): Promise<ResultadoDaRegravacao> {
  const { repositorio, candidatos, analises, agora } = opcoes;

  const linhasDeOportunidade: ReturnType<typeof oportunidadeParaLinha>[] = [];
  const porDecidir: {
    empresaId: string;
    editalUuid: string;
    decisao: ReturnType<typeof triar>["decisoes"][number];
  }[] = [];

  for (const candidato of candidatos.values()) {
    const analise = analises.get(candidato.uuid);
    // Não foi lido nem estava em cache: segue com o score "de ficha" já gravado.
    if (!analise) continue;

    for (const perfil of candidato.empresas) {
      const { decisoes } = triar([{ edital: candidato.edital, analise }], perfil, agora);
      const decisao = decisoes[0];

      if (decisao.entregue) {
        linhasDeOportunidade.push(
          oportunidadeParaLinha({
            empresaId: perfil.empresaId,
            editalId: candidato.uuid,
            edital: candidato.edital,
            avaliacao: decisao.avaliacao,
            avaliadoEm: decisao.decididoEm,
          }),
        );
      }

      porDecidir.push({ empresaId: perfil.empresaId, editalUuid: candidato.uuid, decisao });
    }
  }

  const mapaDeOportunidades = await repositorio.gravarOportunidades(linhasDeOportunidade);

  const linhasDeDecisao = porDecidir.map(({ empresaId, editalUuid, decisao }) =>
    decisaoParaLinha({
      empresaId,
      editalId: editalUuid,
      decisao,
      oportunidadeId: mapaDeOportunidades.get(`${empresaId}:${editalUuid}`) ?? null,
    }),
  );

  return {
    oportunidades: mapaDeOportunidades.size,
    decisoes: await repositorio.gravarDecisoes(linhasDeDecisao),
  };
}
