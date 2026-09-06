import retrato from "../../../dados/abertos.json" with { type: "json" };
import type { MunicipioAberto, RetratoDeAbertos, UfAberta } from "./tipos.ts";
import type { PerfilDaUf } from "./perfilDaUf.ts";

/**
 * A leitura do retrato versionado.
 *
 * Mesmo padrão do agregado e dos posts: o arquivo é gravado pela coleta, entra
 * no repositório e vira página na build. A diferença é a validade — este
 * envelhece em horas, não em semanas, e por isso toda página que o usa é
 * obrigada a mostrar `COLETADO_EM`.
 */
const dados = retrato as RetratoDeAbertos;

export const COLETADO_EM: string = dados.coletadoEm;
export const TOTAIS = dados.totais;

export function ufsComAbertos(): UfAberta[] {
  return dados.ufs;
}

export function ufAberta(sigla: string): UfAberta | null {
  const alvo = sigla.toUpperCase();
  return dados.ufs.find((u) => u.uf === alvo) ?? null;
}

export function abertosNoBrasil() {
  return dados.abertos;
}

/**
 * As contagens de abertos de uma cidade, ou `null` quando não há o que dizer.
 *
 * ## Os dois `null`, que são o mesmo `null` de propósito
 *
 * `null` quando o retrato ainda não traz `municipios` (o arquivo versionado
 * hoje foi gravado antes deste campo existir, e só a coleta seguinte o
 * preenche — mesma janela de um dia que `perfilDaPraca` já trata aqui), e
 * `null` quando a cidade simplesmente não tem edital aberto agora.
 *
 * Achatar os dois é deliberado, e é o oposto do que `carregarUfAusente.ts`
 * decidiu, porque a pergunta é outra. Lá o número ia para a tela e a distinção
 * mudava o que se afirmava. Aqui as duas respostas produzem a MESMA tela: sem
 * bloco. Uma cidade sem edital aberto não ganha um "0 editais abertos", que
 * seria verdade hoje e mentira em duas horas, e é justamente o tipo de zero
 * que faz o visitante concluir que o site não tem dado.
 */
export function abertosNoMunicipio(uf: string, slug: string): MunicipioAberto | null {
  const lista = dados.municipios;
  if (!lista) return null;

  const alvo = uf.toUpperCase();
  return lista.find((m) => m.uf === alvo && m.slug === slug) ?? null;
}

/**
 * O perfil de compras da praça, ou `null` quando o retrato é antigo demais.
 *
 * ## Por que `null` e não um objeto vazio
 *
 * `perfil` passou a existir em 26/08. O `abertos.json` que está no repositório
 * neste instante foi gravado pela coleta da manhã daquele dia, antes da
 * mudança — ou seja, o campo não existe nele, e só passa a existir na coleta
 * seguinte.
 *
 * O tipo diz que ele é obrigatório, e diz certo: é o que a coleta grava DAQUI
 * PARA A FRENTE, e deixá-lo opcional convidaria a omiti-lo em silêncio. Quem
 * precisa tolerar a janela de um dia é a leitura, e é aqui que ela mora, uma vez
 * só, em vez de virar `?.` espalhado pelo JSX.
 *
 * `null` e não `{ porCategoria: [], porModalidade: [] }` porque as duas coisas
 * são diferentes e a página trata cada uma do seu jeito: vazio é "esta praça
 * não tem editais abertos", e ausente é "ainda não medimos". A segunda esconde
 * a seção; a primeira mostraria uma tabela em branco afirmando que o estado não
 * compra nada.
 */
export function perfilDaPraca(sigla: string): PerfilDaUf | null {
  const u = ufAberta(sigla);
  if (!u) return null;

  const perfil = (u as Partial<UfAberta>).perfil;
  if (!perfil || !Array.isArray(perfil.porCategoria)) return null;
  return perfil;
}

/**
 * Há quanto tempo o retrato foi tirado, em horas cheias.
 *
 * Serve para a página dizer "medido há 3 horas" em vez de só uma data — a
 * pergunta de quem chega é "isso está velho?", e um número de horas responde
 * melhor que um carimbo de tempo.
 */
export function horasDesdeAColeta(agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(COLETADO_EM).getTime()) / 3_600_000));
}
