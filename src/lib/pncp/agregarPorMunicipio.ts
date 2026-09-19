import type { Edital } from "../fontes/tipos.ts";

/**
 * O agregado por município, extraído de `ingerir-pncp.ts` e `juntar-coleta.ts`
 * — os dois montavam o MESMO `Map` por município, com a mesma lógica, cada um
 * na sua cópia. Enquanto a única saída era `orgaos: número`, duplicar era
 * barato. Deixou de ser no dia em que a página regional passou a precisar do
 * NOME de quem compra, e não só da contagem: duas cópias da mesma regra de
 * agregação divergindo é exatamente o tipo de bug que não aparece em teste
 * nenhum dos dois arquivos, só no dia em que alguém mexe em um e esquece o
 * outro.
 */

export type MunicipioAgregado = {
  uf: string;
  municipio: string;
  slug: string;
  ibge: string;
  editais: number;
  valor: number;
  /** Quantos órgãos distintos (por CNPJ) compraram aqui. */
  orgaos: number;
  modalidades: Record<string, number>;
  /**
   * Por CNPJ, e não por nome: o mesmo nome de secretaria se repete entre
   * municípios diferentes, e nada garante que não se repita também dentro de
   * um — usar o nome como chave fundiria dois compradores distintos que só
   * coincidem no rótulo.
   */
  compradores: Record<string, { nome: string; editais: number }>;
  /**
   * Quando ESTA linha foi medida, quando não foi na coleta que a acompanha.
   *
   * Ausente é o caso normal: a linha vem da coleta atual e vale a data dela.
   * Preenchido quer dizer que a UF não foi coletada nesta rodada e a medição
   * anterior foi carregada adiante, com a data em que de fato foi feita. Ver
   * `carregarUfAusente.ts`.
   */
  medidoEm?: string;
};

/**
 * Agrupa editais por município — mesmo critério de chave de
 * `caminhoDoMunicipio` (`uf/municipioSlug`), para o agregado e a rota
 * concordarem sobre o que é "o mesmo município".
 *
 * Ordena por volume, do maior para o menor — mesma ordem que
 * `municipiosPublicaveis()` aplica na leitura, aqui só para o arquivo
 * versionado já nascer legível quando alguém abrir para conferir.
 */
export function agregarPorMunicipio(editais: readonly Edital[]): MunicipioAgregado[] {
  const porMunicipio = new Map<
    string,
    {
      uf: string;
      municipio: string;
      slug: string;
      ibge: string;
      editais: number;
      valor: number;
      modalidades: Record<string, number>;
      compradores: Record<string, { nome: string; editais: number }>;
    }
  >();

  for (const e of editais) {
    const chave = `${e.local.uf}/${e.local.municipioSlug}`;
    let m = porMunicipio.get(chave);
    if (!m) {
      m = {
        uf: e.local.uf,
        municipio: e.local.municipio,
        slug: e.local.municipioSlug,
        ibge: e.local.codigoIbge,
        editais: 0,
        valor: 0,
        modalidades: {},
        compradores: {},
      };
      porMunicipio.set(chave, m);
    }

    m.editais++;
    if (!e.valorSuspeito) m.valor += e.valorEstimado ?? 0;
    m.modalidades[e.modalidade] = (m.modalidades[e.modalidade] ?? 0) + 1;

    const comprador = m.compradores[e.orgao.cnpj];
    if (comprador) comprador.editais++;
    else m.compradores[e.orgao.cnpj] = { nome: e.orgao.nome, editais: 1 };
  }

  return [...porMunicipio.values()]
    .map((m) => ({
      ...m,
      valor: Math.round(m.valor),
      orgaos: Object.keys(m.compradores).length,
    }))
    .sort((a, b) => b.editais - a.editais);
}

/** As esferas que a fonte distingue. Mesmo conjunto de `Edital["orgao"]`. */
export type Esfera = Edital["orgao"]["esfera"];

export type ContagemPorEsfera = {
  /** Quantos editais medidos nesta coleta, por esfera do órgão comprador. */
  porEsfera: Record<Esfera, number>;
  /**
   * A soma das partes, escrita e não deduzida pelo leitor.
   *
   * É o denominador de todo percentual derivado daqui, e existe por isso: sem
   * ele, quem monta o gráfico escolheria sozinho o denominador, e o candidato
   * mais à mão seria `cobertura.editaisColetados`. Os dois são iguais no dia
   * bom e DIFERENTES no dia em que uma UF ausente teve os municípios dela
   * carregados da medição anterior — aqueles editais contam na cobertura e não
   * passaram por esta contagem, porque não foram medidos hoje. Percentual com
   * denominador emprestado não fecha em 100, e ninguém percebe que não fechou.
   */
  total: number;
};

/**
 * A distribuição por esfera administrativa da coleta inteira.
 *
 * Responde "de onde vêm as licitações do Brasil" com o que foi medido hoje, e
 * não com um retrato tirado uma vez. A pergunta valia um infográfico em PNG na
 * home até 19/09/2026; em pixel, os números daquela arte já tinham envelhecido
 * 11 editais na primeira conferência, e nenhuma guarda consegue ler pixel.
 *
 * Fica aqui, ao lado de `agregarPorMunicipio`, pelo mesmo motivo que aquele
 * existe: é agregação da MESMA lista de editais, e as duas precisam continuar
 * enxergando a mesma coleta. Separadas em arquivos diferentes, divergiriam no
 * dia em que alguém filtrasse uma e esquecesse a outra.
 */
export function contarPorEsfera(editais: readonly Edital[]): ContagemPorEsfera {
  const porEsfera: Record<Esfera, number> = {
    municipal: 0,
    estadual: 0,
    distrital: 0,
    federal: 0,
    desconhecida: 0,
  };

  for (const e of editais) porEsfera[e.orgao.esfera]++;

  return {
    porEsfera,
    total: Object.values(porEsfera).reduce((s, n) => s + n, 0),
  };
}
