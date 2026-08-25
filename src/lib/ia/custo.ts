import type { ModoDeFalha, UsoDeTokens } from "./provedor.ts";
import type { OperacaoDeIA } from "./mapeamento.ts";

/**
 * Quanto custou, e qual modelo merecia o trabalho.
 *
 * Este arquivo existe porque a economia deste produto é frágil de um jeito
 * específico: a análise é feita UMA vez por edital e reaproveitada por todos os
 * assinantes (ver o comentário em `dominio/tipos.ts`), mas o número de editais
 * abertos no Brasil é grande e cresce. Ler todo edital com o modelo mais caro
 * transformaria uma margem confortável em prejuízo silencioso — silencioso
 * porque a fatura só chega no mês seguinte.
 *
 * Duas responsabilidades, então:
 *
 *   1. **Registrar** cada execução (modelo, tokens, custo, duração, resultado),
 *      para que a conta seja auditável antes de virar surpresa.
 *   2. **Escalonar**: decidir qual modelo um edital merece, com o caro sendo a
 *      exceção justificada e não o padrão.
 */

/**
 * Papéis, não marcas.
 *
 * O resto da camada raciocina em "econômico" e "premium"; quem sabe que o
 * econômico se chama `gemini-...` é `gemini.ts`, e mais ninguém. Trocar de
 * fornecedor é trocar o catálogo, não a política.
 */
export type CatalogoDeModelos = {
  economico: string;
  premium: string;
};

export type PrecoDoModelo = {
  /** Dólares por milhão de tokens de entrada. */
  entradaPorMilhao: number;
  /** Dólares por milhão de tokens de saída. */
  saidaPorMilhao: number;
  /** Data em que alguém CONFERIU este preço. */
  conferidoEm: string;
  /**
   * ONDE foi conferido, em uma linha.
   *
   * Não é enfeite: "preço publicado na página do fornecedor" e "preço que
   * apareceu na fatura" são afirmações diferentes, e a segunda inclui imposto,
   * câmbio do dia e eventual crédito promocional. Um número sem a fonte junto
   * vira, meses depois, um número que ninguém sabe se pode confiar.
   */
  fonte: string;
};

/**
 * Acima disto o Gemini cobra outro preço — e nós não sabemos qual.
 *
 * `gemini-3.1-pro-preview` dobra a entrada (US$ 2 → 4) e sobe a saída
 * (US$ 12 → 18) quando o prompt passa de 200 mil tokens. `PrecoDoModelo` só
 * guarda uma faixa, a de baixo, que é onde toda leitura nossa cai hoje: o maior
 * prompt já registrado tem 45.190 tokens, e `ORCAMENTO_PADRAO` corta o
 * documento em 60 mil CARACTERES.
 *
 * Se um dia passar, `estimarCusto` devolve "não sei" em vez de aplicar a faixa
 * errada. Custo subestimado pela metade é o erro que ninguém percebe, porque
 * ninguém desconfia de conta barata.
 */
export const LIMITE_DA_FAIXA_DE_PRECO = 200_000;

/**
 * A tabela de preços. Ponto único do sistema que conhece dinheiro por token.
 *
 * Nasceu vazia de propósito, e ficou vazia até 25/08 — chutar um número aqui
 * produziria relatório de custo com aparência de exatidão e conteúdo de
 * invenção, que é o pecado que o resto do produto existe para não cometer.
 *
 * O que mudou: os preços foram conferidos na página oficial do fornecedor, com
 * data e URL. Isso é MENOS que a fatura e MAIS que um chute, e a diferença
 * importa — a fatura inclui imposto, câmbio do dia e eventual crédito
 * promocional. Por isso cada linha carrega `fonte`, e por isso o aviso de custo
 * diz "estimativa pelo preço publicado".
 *
 * Um modelo ausente daqui não quebra nada: `estimarCusto` devolve `null` com
 * motivo e o painel mostra "custo não estimado". É o comportamento certo, e é o
 * que acontece hoje com `gemini-3.7-flash` — o id configurado como econômico
 * não aparece na tabela de preços do fornecedor.
 *
 * Preço muda. Ao reconferir, troque o número E a data: uma data velha ao lado
 * de um número certo ainda é honesta; uma data nova ao lado de um número velho
 * não é.
 */
const FONTE = "ai.google.dev/gemini-api/docs/pricing (preço publicado, não a fatura)";

export const PRECOS_POR_MODELO: Record<string, PrecoDoModelo> = {
  // A faixa de até 200k tokens de prompt — ver `LIMITE_DA_FAIXA_DE_PRECO`.
  // É o modelo que faz TODA leitura real hoje: 153 chamadas contra 11 do
  // econômico, que só foi exercitado por ping de diagnóstico.
  "gemini-3.1-pro-preview": {
    entradaPorMilhao: 2,
    saidaPorMilhao: 12,
    conferidoEm: "2026-08-25",
    fonte: FONTE,
  },
  "gemini-2.5-pro": {
    entradaPorMilhao: 1.25,
    saidaPorMilhao: 10,
    conferidoEm: "2026-08-25",
    fonte: FONTE,
  },
  "gemini-2.5-flash": {
    entradaPorMilhao: 0.3,
    saidaPorMilhao: 2.5,
    conferidoEm: "2026-08-25",
    fonte: FONTE,
  },
};

/**
 * A mesma tabela, com o desconto do lote aplicado.
 *
 * A Batch API cobra metade do preço da chamada avulsa — é desconto publicado
 * do fornecedor, não estimativa nossa. Ele fica AQUI, e não espalhado por quem
 * chama, porque esquecer de aplicá-lo faria o painel cobrar do lote o dobro do
 * que ele custou, e ninguém desconfia de um custo alto demais.
 *
 * Enquanto `PRECOS_POR_MODELO` estiver vazia, isto devolve vazio também, e
 * `estimarCusto` segue dizendo honestamente que não sabe.
 *
 * Ao preencher a tabela, confira o desconto vigente: metade é o que vale hoje.
 */
export const DESCONTO_DO_LOTE = 0.5;

export function precosEmLote(
  precos: Record<string, PrecoDoModelo> = PRECOS_POR_MODELO,
): Record<string, PrecoDoModelo> {
  return Object.fromEntries(
    Object.entries(precos).map(([modelo, preco]) => [
      modelo,
      {
        ...preco,
        entradaPorMilhao: preco.entradaPorMilhao * DESCONTO_DO_LOTE,
        saidaPorMilhao: preco.saidaPorMilhao * DESCONTO_DO_LOTE,
      },
    ]),
  );
}

export type CustoEstimado = {
  /** Dólares. `null` quando não há preço cadastrado — nunca zero. */
  usd: number | null;
  /** Por que não foi possível estimar. `null` quando foi. */
  motivo: string | null;
};

export function estimarCusto(
  modelo: string,
  uso: UsoDeTokens,
  precos: Record<string, PrecoDoModelo> = PRECOS_POR_MODELO,
): CustoEstimado {
  const preco = precos[modelo];
  if (!preco) {
    return {
      usd: null,
      motivo: `Não há preço conferido cadastrado para "${modelo}" em PRECOS_POR_MODELO.`,
    };
  }

  /*
   * Fora da faixa que a tabela cobre. Ver `LIMITE_DA_FAIXA_DE_PRECO`: o preço
   * do fornecedor muda acima de 200 mil tokens de prompt, e aplicar a faixa de
   * baixo devolveria metade do custo real com cara de número exato.
   */
  if (uso.entrada > LIMITE_DA_FAIXA_DE_PRECO) {
    return {
      usd: null,
      motivo:
        `O prompt teve ${uso.entrada.toLocaleString("pt-BR")} tokens, acima dos ` +
        `${LIMITE_DA_FAIXA_DE_PRECO.toLocaleString("pt-BR")} que a tabela cobre. ` +
        `Acima dessa faixa o fornecedor cobra mais, e o valor não está cadastrado.`,
    };
  }
  const usd =
    (uso.entrada / 1_000_000) * preco.entradaPorMilhao +
    (uso.saida / 1_000_000) * preco.saidaPorMilhao;
  return { usd, motivo: null };
}

/** Uma execução de IA, do jeito que ela entra no histórico. */
export type ExecucaoDeIA = {
  /** ISO 8601. */
  em: string;
  /**
   * O que se tentou fazer.
   *
   * É a união fechada de `mapeamento.ts`, e não `string`, desde 25/08: uma
   * operação que o mapeamento não conhece atravessava a tradução intacta e só
   * era recusada pelo Postgres, em produção, depois de a análise já ter sido
   * gravada. Agora não compila.
   */
  operacao: OperacaoDeIA;
  /** A que o trabalho se refere. Ex.: o `id` do edital. */
  referencia: string;
  /** Prompt versionado usado, ex.: `"analise-de-edital.v1"`. Permite reprocessar. */
  prompt: string;
  provedor: string;
  modelo: string;
  /** Chamadas efetivas ao fornecedor, incluindo retentativas. */
  tentativas: number;
  uso: UsoDeTokens;
  custo: CustoEstimado;
  duracaoMs: number;
  resultado: "ok" | "falha";
  falha: ModoDeFalha | null;
  /** Texto do erro, quando houve. */
  motivo: string | null;
  /**
   * Quantos campos o modelo devolveu e nós DESCARTAMOS por falta de evidência
   * localizável. É a métrica mais importante deste registro: se ela sobe, o
   * modelo está alucinando e a política de escalonamento precisa mudar.
   */
  camposDescartados: number;
};

export type RegistradorDeExecucao = (execucao: ExecucaoDeIA) => void;

/**
 * Registro em memória, para teste e para script de linha de comando.
 *
 * Persistência é decisão de infraestrutura e fica com o chamador — a camada de
 * IA não escolhe banco. O contrato é o `RegistradorDeExecucao`: quem tiver onde
 * gravar, passa a sua função.
 */
export function criarRegistroEmMemoria() {
  const execucoes: ExecucaoDeIA[] = [];
  return {
    execucoes,
    registrar: ((e: ExecucaoDeIA) => {
      execucoes.push(e);
    }) as RegistradorDeExecucao,
    /** Soma dos custos conhecidos, e quantas execuções ficaram sem preço. */
    total(): { usd: number; semPreco: number; tokens: number } {
      let usd = 0;
      let semPreco = 0;
      let tokens = 0;
      for (const e of execucoes) {
        tokens += e.uso.total;
        if (e.custo.usd === null) semPreco += 1;
        else usd += e.custo.usd;
      }
      return { usd, semPreco, tokens };
    },
  };
}

export type PorteDoTrabalho = "pequeno" | "medio" | "grande";

export type PlanoDeExecucao = {
  porte: PorteDoTrabalho;
  /** O modelo com que se COMEÇA. */
  modelo: string;
  /**
   * `true` quando vale gastar uma segunda passada barata para conferir o
   * resultado antes de considerá-lo bom.
   */
  validar: boolean;
  /** Para onde escalar se a primeira passada não se sustentar. `null` = não escala. */
  escalarPara: string | null;
  /** Frase que vai para o registro, explicando a escolha. */
  motivo: string;
};

/**
 * Os cortes da política, em caracteres do texto que efetivamente vai no prompt.
 *
 * Caracteres, e não tokens, porque tokens só se sabe depois de chamar — e a
 * decisão precisa ser tomada antes. A conversão grosseira para o português é de
 * ~4 caracteres por token; os cortes abaixo equivalem a mais ou menos 6 mil e
 * 22 mil tokens de entrada.
 *
 * Os números são um ponto de partida honesto, não uma medição: ajuste depois de
 * ver o histórico de `ExecucaoDeIA` acumulado, que é justamente para isso que
 * ele existe.
 */
export const CORTE_PEQUENO_EM_CARACTERES = 25_000;
export const CORTE_MEDIO_EM_CARACTERES = 90_000;

/**
 * Quantas seções relevantes distintas já fazem um edital ser "complexo".
 *
 * Um edital que fala de habilitação, qualificação técnica, garantia, prazos E
 * penalidades tem mais superfície para o modelo barato errar — mesmo sendo
 * curto. Complexidade sobe um degrau de porte.
 */
export const SECOES_PARA_COMPLEXO = 5;

/**
 * Que modelo este edital merece.
 *
 * A regra em uma frase: **o modelo caro é a exceção que se justifica, nunca o
 * padrão.** Edital pequeno vai no barato e acabou; médio vai no barato mas com
 * conferência, e só escala se a conferência reprovar; muito grande ou complexo
 * começa no premium, porque nesse caso a passada barata seria quase sempre
 * desperdiçada e teríamos pago duas vezes.
 *
 * `escalarPara` é `null` no porte pequeno de propósito: se o modelo barato não
 * consegue ler um edital curto, o problema quase sempre é o documento (digitalizado,
 * ilegível, vazio), e o caro vai falhar igual — cobrando mais caro pela falha.
 */
export function planejarExecucao(entrada: {
  caracteres: number;
  secoesEncontradas: number;
  /** `true` quando a segmentação precisou descartar trecho por falta de espaço. */
  elidiu: boolean;
  catalogo: CatalogoDeModelos;
}): PlanoDeExecucao {
  const { caracteres, secoesEncontradas, elidiu, catalogo } = entrada;

  const complexo = secoesEncontradas >= SECOES_PARA_COMPLEXO || elidiu;

  let porte: PorteDoTrabalho =
    caracteres <= CORTE_PEQUENO_EM_CARACTERES
      ? "pequeno"
      : caracteres <= CORTE_MEDIO_EM_CARACTERES
        ? "medio"
        : "grande";

  if (complexo && porte === "pequeno") porte = "medio";
  else if (complexo && porte === "medio") porte = "grande";

  const tamanho = `${caracteres.toLocaleString("pt-BR")} caracteres selecionados`;
  const complexidade = complexo
    ? `, ${secoesEncontradas} seções relevantes${elidiu ? " e trecho descartado por limite de contexto" : ""}`
    : `, ${secoesEncontradas} seções relevantes`;

  if (porte === "pequeno") {
    return {
      porte,
      modelo: catalogo.economico,
      validar: false,
      escalarPara: null,
      motivo: `Edital curto (${tamanho}${complexidade}): modelo econômico, passada única.`,
    };
  }

  if (porte === "medio") {
    return {
      porte,
      modelo: catalogo.economico,
      validar: true,
      escalarPara: catalogo.premium,
      motivo: `Edital de porte médio (${tamanho}${complexidade}): modelo econômico com conferência das evidências; escala para o premium só se a conferência reprovar.`,
    };
  }

  return {
    porte,
    modelo: catalogo.premium,
    validar: true,
    escalarPara: null,
    motivo: `Edital grande ou complexo (${tamanho}${complexidade}): começa no modelo premium, porque a passada econômica seria descartada e cobrada do mesmo jeito.`,
  };
}

/**
 * A conferência que decide se vale escalar.
 *
 * Não é o modelo que diz se foi bem: é a proporção de campos que sobreviveram à
 * checagem de evidência. Modelo que devolve muita coisa sem trecho localizável
 * está adivinhando, e adivinhação barata não fica boa com insistência — fica
 * boa com um modelo melhor, ou não fica.
 */
export const FRACAO_MINIMA_SUSTENTADA = 0.5;

export function evidenciasSuficientes(entrada: {
  camposSustentados: number;
  camposDescartados: number;
}): boolean {
  const total = entrada.camposSustentados + entrada.camposDescartados;
  if (total === 0) return false;
  return entrada.camposSustentados / total >= FRACAO_MINIMA_SUSTENTADA;
}
