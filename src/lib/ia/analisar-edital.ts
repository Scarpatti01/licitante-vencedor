import type { AnaliseDoEdital, ExigenciaDoEdital } from "../dominio/tipos.ts";
import { desconhecido, type Campo } from "../dominio/procedencia.ts";
import type { Edital } from "../fontes/tipos.ts";
import { criarProvedorGemini, modelosGemini } from "./gemini.ts";
import { criarVerificador, paraCampo, type Conversao, type Verificador } from "./evidencia.ts";
import { PROMPT_DE_ANALISE_EM_USO } from "./prompts/index.ts";
import { respostaDeAnaliseDeEdital, type RespostaDeAnaliseDeEdital } from "./schemas.ts";
import { segmentarEdital, ORCAMENTO_PADRAO, type Segmentacao } from "./segmentacao.ts";
import {
  estimarCusto,
  evidenciasSuficientes,
  planejarExecucao,
  type CatalogoDeModelos,
  type PlanoDeExecucao,
  type PrecoDoModelo,
  type RegistradorDeExecucao,
} from "./custo.ts";
import {
  gerarComRetentativa,
  type OpcoesDeRetentativa,
  type ProvedorDeIA,
  type ResultadoDaGeracao,
} from "./provedor.ts";

/**
 * De edital para `AnaliseDoEdital`.
 *
 * Este é o arquivo que amarra as peças, e o lugar onde as duas regras que o
 * produto não pode quebrar viram código:
 *
 *   1. **Sem chave, o sistema não finge.** Não há exceção subindo daqui. Sem
 *      provedor configurado sai uma `AnaliseDoEdital` legítima, com
 *      `analisadoEm: null`, `profundidade: "lista"` e todo campo `desconhecido`
 *      com motivo explícito. A página continua de pé dizendo o que não sabe —
 *      mesmo padrão de `leads.ts`, onde um formulário sem destino se apresenta
 *      como indisponível em vez de engolir o e-mail do visitante.
 *
 *   2. **Nada vira dado sem evidência conferida.** Tudo o que o modelo devolve
 *      passa por `evidencia.ts` e é confrontado com o texto que foi realmente
 *      enviado. O que não bate cai para `desconhecido` e é contado — a contagem
 *      é o que decide se vale escalar de modelo.
 */

export type OpcoesDeAnalise = {
  /** Texto do documento do edital, quando a camada de fontes conseguiu extrair. */
  textoDoDocumento?: string | null;
  /** Trocável para teste e para outro fornecedor. Padrão: Gemini. */
  provedor?: ProvedorDeIA;
  catalogo?: CatalogoDeModelos;
  /** Onde registrar o custo. Persistência é do chamador; ver `custo.ts`. */
  registrar?: RegistradorDeExecucao;
  precos?: Record<string, PrecoDoModelo>;
  orcamentoDeCaracteres?: number;
  retentativa?: OpcoesDeRetentativa;
  sinal?: AbortSignal;
  /** Injetável para o teste não depender do relógio. */
  agora?: () => Date;
};

/**
 * A análise que existe quando a leitura não aconteceu.
 *
 * Repare que ela é uma análise VÁLIDA, e não um `null` que o chamador teria de
 * tratar: o produto tem o que mostrar sobre o edital (a coleta) e tem o que
 * dizer sobre o que falta (o motivo). É a diferença entre uma tela vazia e uma
 * tela honesta.
 */
export function analiseNaoRealizada(editalId: string, motivo: string): AnaliseDoEdital {
  return {
    editalId,
    analisadoEm: null,
    versaoDoPrompt: null,
    modelo: null,
    resumoExecutivo: desconhecido(motivo),
    exigencias: [],
    criterioDeJulgamento: desconhecido(motivo),
    garantiaExigida: desconhecido(motivo),
    visitaTecnicaExigida: desconhecido(motivo),
    amostraExigida: desconhecido(motivo),
    riscos: [],
    profundidade: "lista",
  };
}

type CamposConvertidos = {
  resumoExecutivo: Campo<string>;
  criterioDeJulgamento: Campo<string>;
  garantiaExigida: Campo<boolean>;
  visitaTecnicaExigida: Campo<boolean>;
  amostraExigida: Campo<boolean>;
  exigencias: ExigenciaDoEdital[];
  riscos: Campo<string>[];
  sustentados: number;
  descartados: number;
};

/**
 * Aplica a conferência de evidência a tudo o que o modelo devolveu.
 *
 * Exigência sem descrição sustentada é REMOVIDA, não rebaixada. É a decisão
 * mais severa deste arquivo, e ela vem do custo do erro: uma exigência inventada
 * manda a empresa correr atrás de documento que ninguém pediu, ou pior, ocupa a
 * linha de uma exigência real na tela. Uma lista mais curta e verdadeira é
 * melhor que uma lista completa e contaminada — e `montarChecklist` já sabe
 * tratar lista curta como "ainda não sabemos", nunca como "não falta nada".
 */
function converter(resposta: RespostaDeAnaliseDeEdital, verificador: Verificador): CamposConvertidos {
  let sustentados = 0;
  let descartados = 0;

  const contar = <T>(conversao: Conversao<T>): Campo<T> => {
    if (conversao.resultado === "sustentado") sustentados += 1;
    else if (conversao.resultado === "descartado") descartados += 1;
    return conversao.campo;
  };

  const resumoExecutivo = contar(paraCampo(resposta.resumoExecutivo, verificador, "o resumo do objeto"));
  const criterioDeJulgamento = contar(
    paraCampo(resposta.criterioDeJulgamento, verificador, "o critério de julgamento"),
  );
  const garantiaExigida = contar(
    paraCampo(resposta.garantiaExigida, verificador, "exigência de garantia"),
  );
  const visitaTecnicaExigida = contar(
    paraCampo(resposta.visitaTecnicaExigida, verificador, "exigência de visita técnica"),
  );
  const amostraExigida = contar(paraCampo(resposta.amostraExigida, verificador, "exigência de amostra"));

  const exigencias: ExigenciaDoEdital[] = [];
  const vistas = new Set<string>();
  for (const bruta of resposta.exigencias) {
    const descricao = paraCampo(bruta.descricao, verificador, "esta exigência");
    // Aqui `sem_base` conta como descarte, e não como honestidade: listar uma
    // exigência já é afirmar que ela existe. Dizer "encontrado: false" dentro de
    // um item que o próprio modelo resolveu listar é contradição, não humildade.
    if (descricao.resultado === "sustentado") sustentados += 1;
    else descartados += 1;
    // Exigência sem base no texto não entra. Ver o comentário acima.
    if (descricao.resultado !== "sustentado") continue;

    const chave = `${bruta.tipo}|${bruta.fase}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);

    exigencias.push({
      tipo: bruta.tipo,
      descricao: descricao.campo,
      fase: bruta.fase,
      obrigatoria: contar(
        paraCampo(bruta.obrigatoria, verificador, "se esta exigência é obrigatória"),
      ),
    });
  }

  const riscos: Campo<string>[] = [];
  for (const bruto of resposta.riscos) {
    const risco = paraCampo(bruto, verificador, "este ponto de atenção");
    if (risco.resultado === "sustentado") {
      sustentados += 1;
      riscos.push(risco.campo);
    } else if (risco.resultado === "descartado") {
      // Risco inventado é o pior tipo de ruído: assusta o cliente para longe de
      // um certame que ele ganharia. Some da lista e conta contra o modelo.
      descartados += 1;
    }
  }

  return {
    resumoExecutivo,
    criterioDeJulgamento,
    garantiaExigida,
    visitaTecnicaExigida,
    amostraExigida,
    exigencias,
    riscos,
    sustentados,
    descartados,
  };
}

/**
 * Quanto do edital foi de fato lido.
 *
 * `lista` quando não havia documento: só os metadados da coleta entraram no
 * prompt, e o checklist precisa saber disso para não apresentar uma lista curta
 * como completa. `documento_parcial` quando a segmentação omitiu qualquer
 * trecho — o que é o caso comum, e é honesto dizer.
 */
function profundidadeDe(seg: Segmentacao): AnaliseDoEdital["profundidade"] {
  if (seg.caracteresOriginais === 0) return "lista";
  return seg.omitiu ? "documento_parcial" : "documento_completo";
}

/**
 * A metade da análise que acontece ANTES do modelo.
 *
 * Existe separada porque a leitura em lote precisa exatamente disto: montar o
 * pedido de dezenas de editais, mandar todos de uma vez, e só depois converter
 * cada resposta. A alternativa seria o lote reimplementar segmentação, fonte e
 * plano — e no dia em que uma das duas cópias mudasse, o mesmo edital passaria
 * a receber análises diferentes conforme o caminho por onde entrou. Isso é
 * indefensável num produto cujo valor é a análise ser confiável.
 *
 * `fonte` é o campo que amarra as duas metades: é o texto que o modelo recebe E
 * o texto contra o qual as evidências são conferidas. Quem prepara o pedido tem
 * de guardá-lo para a hora de converter a resposta.
 */
export type PedidoDeAnalise = {
  /** O que o modelo lê, e contra o que a evidência é conferida. Os dois. */
  fonte: string;
  prompt: string;
  instrucaoDeSistema: string;
  referenciaDoPrompt: string;
  plano: PlanoDeExecucao;
  segmentacao: Segmentacao;
};

export function prepararAnalise(
  edital: Edital,
  opcoes: {
    textoDoDocumento?: string | null;
    orcamentoDeCaracteres?: number;
    catalogo?: CatalogoDeModelos;
  } = {},
): PedidoDeAnalise {
  const prompt = PROMPT_DE_ANALISE_EM_USO;
  const catalogo = opcoes.catalogo ?? modelosGemini();

  const segmentacao = segmentarEdital(opcoes.textoDoDocumento ?? "", {
    orcamento: opcoes.orcamentoDeCaracteres ?? ORCAMENTO_PADRAO,
  });

  // A fonte é o que o modelo vai ler E o texto contra o qual as evidências serão
  // conferidas. Precisa ser o MESMO objeto: conferir contra o documento inteiro
  // enquanto se envia um recorte aceitaria como válida a citação de um trecho
  // que o modelo não recebeu — ou seja, um acerto por adivinhação.
  const fonte = prompt.montarFonte(edital, segmentacao.texto);

  return {
    fonte,
    prompt: prompt.montar({ fonte, houveOmissao: segmentacao.omitiu }),
    instrucaoDeSistema: prompt.sistema,
    referenciaDoPrompt: prompt.referencia,
    segmentacao,
    plano: planejarExecucao({
      caracteres: fonte.length,
      secoesEncontradas: segmentacao.secoesEncontradas.length,
      elidiu: segmentacao.descartouRelevante,
      catalogo,
    }),
  };
}

/** A outra metade: da resposta crua do modelo à análise conferida. */
export type AnaliseMontada = {
  analise: AnaliseDoEdital;
  /** Quantos campos se sustentaram na conferência de evidência. */
  sustentados: number;
  descartados: number;
};

/**
 * Converte a resposta do modelo em análise, conferindo cada campo contra a
 * fonte que foi realmente enviada.
 *
 * Serve tanto à chamada avulsa quanto ao lote, e é essa partilha que garante
 * que o mesmo edital com a mesma resposta produz a mesma análise nos dois
 * caminhos.
 */
export function montarAnaliseDaResposta(
  edital: Edital,
  resposta: RespostaDeAnaliseDeEdital,
  pedido: PedidoDeAnalise,
  opcoes: { modelo: string; agora?: () => Date },
): AnaliseMontada {
  const convertido = converter(resposta, criarVerificador(pedido.fonte));
  const agora = opcoes.agora ?? (() => new Date());

  return {
    sustentados: convertido.sustentados,
    descartados: convertido.descartados,
    analise: {
      editalId: edital.id,
      analisadoEm: agora().toISOString(),
      versaoDoPrompt: pedido.referenciaDoPrompt,
      modelo: opcoes.modelo,
      resumoExecutivo: convertido.resumoExecutivo,
      exigencias: convertido.exigencias,
      criterioDeJulgamento: convertido.criterioDeJulgamento,
      garantiaExigida: convertido.garantiaExigida,
      visitaTecnicaExigida: convertido.visitaTecnicaExigida,
      amostraExigida: convertido.amostraExigida,
      riscos: convertido.riscos,
      profundidade: profundidadeDe(pedido.segmentacao),
    },
  };
}

export async function analisarEdital(
  edital: Edital,
  opcoes: OpcoesDeAnalise = {},
): Promise<AnaliseDoEdital> {
  const agora = opcoes.agora ?? (() => new Date());
  const provedor = opcoes.provedor ?? criarProvedorGemini();
  const catalogo = opcoes.catalogo ?? modelosGemini();
  const prompt = PROMPT_DE_ANALISE_EM_USO;

  const registrar = (
    plano: PlanoDeExecucao | null,
    resultado: ResultadoDaGeracao<unknown>,
    descartados: number,
  ) => {
    opcoes.registrar?.({
      em: agora().toISOString(),
      operacao: "analise-de-edital",
      referencia: edital.id,
      prompt: prompt.referencia,
      provedor: provedor.nome,
      modelo: resultado.modelo,
      tentativas: resultado.tentativas,
      uso: resultado.uso,
      custo: estimarCusto(resultado.modelo, resultado.uso, opcoes.precos),
      duracaoMs: resultado.duracaoMs,
      resultado: resultado.ok ? "ok" : "falha",
      falha: resultado.ok ? null : resultado.falha,
      motivo: resultado.ok ? (plano?.motivo ?? null) : resultado.motivo,
      camposDescartados: descartados,
    });
  };

  if (!provedor.configurado()) {
    const motivo =
      "A leitura automática do edital não foi executada porque não há provedor de IA configurado neste ambiente. Os dados abaixo vêm apenas do que a fonte oficial publicou.";
    registrar(
      null,
      {
        ok: false,
        falha: "sem_credencial",
        motivo,
        modelo: catalogo.economico,
        uso: { entrada: 0, saida: 0, total: 0 },
        duracaoMs: 0,
        tentativas: 0,
      },
      0,
    );
    return analiseNaoRealizada(edital.id, motivo);
  }

  const pedido = prepararAnalise(edital, {
    textoDoDocumento: opcoes.textoDoDocumento,
    orcamentoDeCaracteres: opcoes.orcamentoDeCaracteres,
    catalogo,
  });
  const plano = pedido.plano;

  const executar = async (modelo: string) => {
    const resultado = await gerarComRetentativa(
      provedor,
      {
        prompt: pedido.prompt,
        schema: respostaDeAnaliseDeEdital,
        modelo,
        instrucaoDeSistema: pedido.instrucaoDeSistema,
        temperatura: 0,
        nomeDoSchema: "respostaDeAnaliseDeEdital",
        sinal: opcoes.sinal,
      },
      opcoes.retentativa,
    );

    if (!resultado.ok) {
      registrar(plano, resultado, 0);
      return { resultado, montada: null as AnaliseMontada | null };
    }

    const montada = montarAnaliseDaResposta(edital, resultado.valor, pedido, {
      modelo: resultado.modelo,
      agora,
    });
    registrar(plano, resultado, montada.descartados);
    return { resultado, montada };
  };

  let { resultado, montada } = await executar(plano.modelo);

  /*
   * O escalonamento, e por que ele fica AQUI e não dentro do provedor.
   *
   * A decisão de gastar mais depende da qualidade do que voltou — quantos campos
   * se sustentaram na conferência de evidência —, e isso o provedor não tem como
   * saber: para ele, um JSON válido cheio de invenção é sucesso. Só quem
   * confrontou a resposta com o edital pode dizer que valeu pagar mais.
   *
   * E só escala uma vez. Um edital que derrota dois modelos é um problema de
   * documento (digitalizado, ilegível, protegido), e a terceira tentativa cobra
   * de novo pela mesma resposta.
   */
  if (
    plano.escalarPara &&
    plano.validar &&
    (!montada ||
      !evidenciasSuficientes({
        camposSustentados: montada.sustentados,
        camposDescartados: montada.descartados,
      }))
  ) {
    const escalado = await executar(plano.escalarPara);
    if (escalado.montada) {
      const melhorou = !montada || escalado.montada.sustentados > montada.sustentados;
      if (melhorou) {
        resultado = escalado.resultado;
        montada = escalado.montada;
      }
    }
  }

  if (!montada || !resultado.ok) {
    const motivo = resultado.ok
      ? "A leitura automática do edital não produziu resultado utilizável."
      : `A leitura automática do edital falhou: ${resultado.motivo}`;
    return analiseNaoRealizada(edital.id, motivo);
  }

  return montada.analise;
}
