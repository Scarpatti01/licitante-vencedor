/**
 * O que foi realmente coletado — em três estados, não em dois.
 *
 * DEFEITO CORRIGIDO AQUI (coleta de 2026-08-13): a cobertura era booleana por
 * UF. `ufsColetadas = ufs.filter(u => !falhas.some(f => f.uf === u))` trata
 * qualquer UF que tenha lançado erro como não coletada, mesmo quando ela já
 * havia entregue centenas de editais antes da interrupção. O dado parcial
 * continuava no snapshot — isso está certo — mas o relatório declarava o
 * contrário. No agregado versionado daquele dia, `ufsColetadas` é `[]` e o
 * texto afirma que PE e AL "não estão representadas nos números abaixo",
 * quando PE (100 editais) e AL (50) são as duas ÚNICAS representadas.
 *
 * Mentir sobre cobertura é pior que ter cobertura ruim: quem lê "6 UFs
 * falharam, aqui estão 150 editais" não tem como saber de onde vieram os 150.
 *
 * Os três estados:
 *
 *   completa — a fonte chegou ao fim da paginação daquela UF.
 *   parcial  — entregou N editais e PAROU (erro, 429 sem fim, orçamento de
 *              tempo). Os N estão nos números; o resto da UF não está.
 *   falha    — parou sem entregar nada. A UF inteira está fora dos números.
 *
 * `parcial` com `editais = 0` não existe: sem nada entregue, é falha. E
 * `completa` nunca tem motivo — se parou por algum motivo, não terminou.
 */

export type EstadoDaColeta = "completa" | "parcial" | "falha";

export type ColetaDeUf = {
  uf: string;
  estado: EstadoDaColeta;
  /** Editais utilizáveis que ENTRARAM, inclusive quando a UF foi interrompida. */
  editais: number;
  /** Por que parou antes do fim. `null` só quando terminou inteira. */
  motivo: string | null;
};

export type Cobertura = {
  ufsSolicitadas: string[];
  /** Uma entrada por UF solicitada, na ordem em que foram pedidas. */
  porUf: ColetaDeUf[];
  ufsCompletas: string[];
  ufsParciais: ColetaDeUf[];
  ufsComFalha: ColetaDeUf[];
  /** `true` só quando TODAS as UFs solicitadas terminaram inteiras. */
  completa: boolean;
  /** Total de editais que entraram, somando UFs completas e parciais. */
  editaisColetados: number;
};

/**
 * Classifica o resultado de uma UF a partir do que de fato aconteceu.
 *
 * A regra é a mesma dos três estados acima, escrita uma vez só para não haver
 * duas versões dela — foi exatamente ter a regra espalhada pelo script que
 * produziu o relatório errado de 13/08.
 */
export function classificarUf(resultado: {
  uf: string;
  editais: number;
  motivo?: string | null;
}): ColetaDeUf {
  const motivo = resultado.motivo ?? null;
  if (!motivo) return { uf: resultado.uf, estado: "completa", editais: resultado.editais, motivo: null };
  if (resultado.editais > 0) {
    return { uf: resultado.uf, estado: "parcial", editais: resultado.editais, motivo };
  }
  return { uf: resultado.uf, estado: "falha", editais: 0, motivo };
}

/**
 * Junta os resultados por UF no retrato que vai para o snapshot e o relatório.
 *
 * UF solicitada que não aparece nos resultados entra como falha declarada: a
 * coleta pode terminar antes de chegar nela (orçamento de tempo estourado), e
 * omitir a UF da lista faria o denominador encolher sozinho — outra forma de
 * mentir sobre cobertura, mais discreta que a primeira.
 */
export function resumirCobertura(ufsSolicitadas: string[], resultados: ColetaDeUf[]): Cobertura {
  const porNome = new Map(resultados.map((r) => [r.uf, r]));

  const porUf = ufsSolicitadas.map(
    (uf) =>
      porNome.get(uf) ?? {
        uf,
        estado: "falha" as const,
        editais: 0,
        motivo: "não coletada nesta rodada",
      },
  );

  return {
    ufsSolicitadas,
    porUf,
    ufsCompletas: porUf.filter((c) => c.estado === "completa").map((c) => c.uf),
    ufsParciais: porUf.filter((c) => c.estado === "parcial"),
    ufsComFalha: porUf.filter((c) => c.estado === "falha"),
    completa: porUf.every((c) => c.estado === "completa"),
    editaisColetados: porUf.reduce((a, c) => a + c.editais, 0),
  };
}

/** Quantos editais entraram por UF. É o que a guarda de degradação compara. */
export function editaisPorUf(cobertura: Cobertura): Record<string, number> {
  return Object.fromEntries(cobertura.porUf.map((c) => [c.uf, c.editais]));
}
