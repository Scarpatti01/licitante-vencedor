import type { Classificacao } from "./degradacao.ts";

/**
 * O veredito de uma rodada de coleta indo para `execucoes_de_coleta`.
 *
 * Sem `server-only`, pelo mesmo motivo de `editais/gravar.ts` e de todo
 * repositório de script deste projeto: quem chama é `ingerir-pncp.ts` ou
 * `juntar-coleta.ts`, Node puro, e aquele pacote lança na importação fora da
 * condição `react-server`.
 *
 * Uma linha por rodada, não um upsert: cada coleta é um evento — "às 06:10 de
 * hoje, a classificação foi X" — e não um estado que a próxima rodada
 * substitui. Quem lê pega a mais recente por `coletado_em`.
 */
export async function gravarExecucaoDeColeta(
  dados: { fonte: string; coletadoEm: string; classificacao: Classificacao },
  opcoes: { url: string; chave: string },
): Promise<void> {
  const { fonte, coletadoEm, classificacao } = dados;
  const { url, chave } = opcoes;

  const resposta = await fetch(`${url}/rest/v1/execucoes_de_coleta`, {
    method: "POST",
    headers: {
      apikey: chave,
      authorization: `Bearer ${chave}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      fonte,
      classe: classificacao.classe,
      motivos: classificacao.motivos,
      editais: classificacao.atual.editais,
      municipios: classificacao.atual.municipios,
      ufs: classificacao.atual.ufs,
      coletado_em: coletadoEm,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`execucoes_de_coleta: supabase recusou ${resposta.status} ${await resposta.text()}`);
  }
}
