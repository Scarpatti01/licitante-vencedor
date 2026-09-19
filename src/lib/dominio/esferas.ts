import agregados from "../../../dados/agregados.json" with { type: "json" };

/**
 * De onde vêm as licitações do Brasil, lido da coleta e não de uma arte.
 *
 * ## Por que este arquivo existe
 *
 * A pergunta "licitação é só contrato federal, coisa de empresa grande?" é a
 * objeção silenciosa de quem chega na home pela primeira vez, e a resposta é
 * um número: a maior parte sai de prefeitura. Até 19/09/2026 esse número
 * morava num PNG gerado uma vez.
 *
 * Um PNG é um número escrito à mão que nenhuma guarda consegue ler. A conferência
 * feita no dia em que aquela arte entrou já mostrou a deriva: no mesmo recorte de
 * 17 a 22/08/2026, a arte dizia 13.397 editais e a recontagem dava 13.408, porque
 * o PNCP publica com data retroativa e segue enchendo a semana depois que ela
 * acaba. Onze editais é pouco; a direção é o que importa, porque ela só cresce e
 * ninguém vai reabrir o Photoshop para corrigir.
 *
 * `numeros-da-coleta.test.ts` já proíbe contagem de edital chumbada no JSX da
 * home. Este arquivo é o mesmo princípio aplicado ao gráfico: o desenho é HTML,
 * os números saem da coleta diária, e a página acompanha sozinha.
 *
 * ## O que é agrupado, e por quê
 *
 * A fonte distingue cinco valores; a página mostra quatro linhas.
 *
 *   `distrital` entra em "Estadual", junto de `estadual`. O Distrito Federal
 *   exerce as competências de estado e de município ao mesmo tempo (CF, art.
 *   32, §1º), e o governo do DF é uma unidade federativa comprando, não uma
 *   prefeitura. Deixá-lo numa fatia própria de 0,2% seria ruído; jogá-lo em
 *   "outros" seria errado.
 *
 *   `desconhecida` aparece com o nome do que é: o registro do PNCP não disse.
 *   A arte antiga chamava isso de "Outros", que sugere uma quarta esfera que
 *   não existe. São centenas de editais por coleta, e escondê-los sob um
 *   rótulo vago é a diferença entre declarar o que não se sabe e disfarçar.
 */

/** As esferas como a fonte as entrega. */
type EsferaDaFonte = "municipal" | "estadual" | "distrital" | "federal" | "desconhecida";

export type FatiaDaEsfera = {
  /** Chave estável, para `key` de lista e para teste. */
  chave: "municipal" | "estadual" | "federal" | "naoInformada";
  rotulo: string;
  /** A quem pertence o órgão que comprou, em uma linha. */
  detalhe: string;
  editais: number;
  /** Fração exata, de 0 a 1. É ela que dimensiona a barra. */
  fracao: number;
  /** A mesma fração arredondada para exibição, em pt-BR ("62,1"). */
  percentual: string;
};

export type DistribuicaoPorEsfera = {
  fatias: FatiaDaEsfera[];
  /**
   * O denominador, vindo escrito da coleta.
   *
   * Não é `numerosDaColeta().editais`: aquele soma a cobertura publicada, que
   * inclui município carregado de UF ausente, medido semanas atrás. Este conta
   * só o que passou pela medição desta rodada. Nos dias bons os dois são iguais.
   */
  total: number;
  /** ISO do instante da coleta que produziu estes números. */
  medidoEm: string;
  /** Quantos em cada dez editais saem de prefeitura, arredondado. */
  emCadaDez: number;
};

const ROTULOS: {
  chave: FatiaDaEsfera["chave"];
  rotulo: string;
  detalhe: string;
  soma: EsferaDaFonte[];
}[] = [
  {
    chave: "municipal",
    rotulo: "Municipal",
    detalhe: "Prefeituras, câmaras e autarquias municipais",
    soma: ["municipal"],
  },
  {
    chave: "estadual",
    rotulo: "Estadual",
    detalhe: "Governos dos estados e do Distrito Federal",
    soma: ["estadual", "distrital"],
  },
  {
    chave: "federal",
    rotulo: "Federal",
    detalhe: "União, ministérios, universidades e estatais federais",
    soma: ["federal"],
  },
  {
    chave: "naoInformada",
    rotulo: "Não informada",
    detalhe: "O registro publicado no PNCP não declarou a esfera",
    soma: ["desconhecida"],
  },
];

/**
 * Lê a contagem do agregado versionado.
 *
 * Tolera ausência de propósito: `esferas` passou a ser escrito na coleta de
 * 20/09/2026, e um agregado anterior a isso não tem o campo. Devolver `null`
 * faz a seção sumir da home inteira, o que é o comportamento certo — melhor
 * não dizer nada do que desenhar um gráfico de zeros. A guarda que impede o
 * campo de sumir de vez mora em `esferas.test.ts`.
 */
export function distribuicaoPorEsfera(): DistribuicaoPorEsfera | null {
  return montarDistribuicao((agregados as { esferas?: unknown }).esferas, agregados.coletadoEm);
}

/**
 * A mesma leitura, sem o arquivo: é aqui que a regra é testável.
 *
 * `distribuicaoPorEsfera()` importa um JSON versionado que muda todo dia, então
 * um teste contra ele mede a coleta de hoje, não a regra. Separando, o teste
 * entrega a contagem que quiser — inclusive as que nunca aparecem num dia bom,
 * como esfera ausente, total zerado e campo que não veio.
 */
export function montarDistribuicao(
  bruto: unknown,
  coletadoEm: string,
): DistribuicaoPorEsfera | null {
  if (!bruto || typeof bruto !== "object") return null;

  const { porEsfera, total } = bruto as {
    porEsfera?: Partial<Record<EsferaDaFonte, unknown>>;
    total?: unknown;
  };
  if (!porEsfera || typeof porEsfera !== "object") return null;
  if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) return null;

  const numero = (e: EsferaDaFonte): number => {
    const n = porEsfera[e];
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  };

  const fatias = ROTULOS.map(({ chave, rotulo, detalhe, soma }) => {
    const editais = soma.reduce((s, e) => s + numero(e), 0);
    const fracao = editais / total;
    return {
      chave,
      rotulo,
      detalhe,
      editais,
      fracao,
      percentual: (fracao * 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    };
  });

  const municipal = fatias.find((f) => f.chave === "municipal");

  return {
    fatias,
    total,
    medidoEm: coletadoEm,
    emCadaDez: Math.round((municipal?.fracao ?? 0) * 10),
  };
}
