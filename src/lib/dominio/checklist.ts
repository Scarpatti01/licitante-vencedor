import type { AnaliseDoEdital, DocumentoDaEmpresa, PerfilDaEmpresa, TipoDeDocumento } from "./tipos.ts";
import { NOME_DO_DOCUMENTO } from "./tipos.ts";
import { temValor } from "./procedencia.ts";
import { dataDeBrasilia } from "./datas.ts";

/**
 * Checklist: a exigência do edital virando tarefa da empresa.
 *
 * A regra que governa este arquivo está no enunciado do produto e é fácil de
 * violar sem perceber: **não afirmar que um documento está válido só porque ele
 * foi cadastrado**. Cadastro é declaração de intenção; o que vale na sessão é o
 * documento dentro do prazo, e o produto não tem como conferir isso sozinho.
 *
 * Daí os quatro estados serem quatro, e não dois. "Tenho" e "não tenho" seria
 * mais simples de programar e mentiria em metade dos casos.
 */

export type StatusDoItem =
  /** Documento cadastrado, com arquivo, e dentro da validade declarada. */
  | "disponivel"
  /** A empresa tem alguma coisa, mas falta arquivo, validade ou a validade venceu. */
  | "verificar"
  /** Exigido e sem nada correspondente no cadastro. */
  | "ausente"
  /** Não dá para afirmar que é exigido, ou não dá para casar com o cadastro. */
  | "nao_identificado";

export type ItemDoChecklist = {
  tipo: TipoDeDocumento;
  nome: string;
  /** Como o edital nomeou a exigência, quando ele foi lido. */
  descricaoNoEdital: string | null;
  fase: "habilitacao" | "proposta" | "execucao";
  obrigatorio: boolean;
  status: StatusDoItem;
  /** Frase pronta para a interface, explicando o status. Nunca genérica. */
  observacao: string;
};

export type Checklist = {
  itens: ItemDoChecklist[];
  /**
   * `false` quando o edital ainda não foi lido em profundidade. A interface
   * precisa disso para não apresentar um checklist curto como se fosse completo
   * — a lista da coleta não traz exigência nenhuma, e um checklist vazio
   * pareceria "não falta nada".
   */
  derivadoDoDocumento: boolean;
  /**
   * `true` quando o texto do edital foi de fato lido — mesmo que nenhuma
   * exigência tenha sobrevivido à checagem de evidência.
   *
   * Existe separado de `derivadoDoDocumento` porque "nunca lido" e "lido, mas
   * nada sustentado" são estados diferentes. Antes desta distinção, os dois
   * caíam no mesmo `false` e a interface dizia "o documento não foi baixado
   * nem lido" para um edital que tinha sido lido de ponta a ponta — só não
   * tinha exigência nenhuma que se sustentasse na checagem de evidência. É a
   * mesma invenção de certeza que este arquivo existe para evitar, ao
   * contrário: apagar que algo foi verificado é tão falso quanto inventar que
   * não foi.
   */
  analiseLeuTexto: boolean;
  totais: {
    obrigatorios: number;
    disponiveis: number;
    verificar: number;
    ausentes: number;
    naoIdentificados: number;
  };
};

/** Documentos que praticamente todo edital de habilitação exige na Lei 14.133. */
const HABILITACAO_USUAL: TipoDeDocumento[] = [
  "certidao_federal",
  "fgts",
  "trabalhista_cndt",
  "contrato_social",
];

function statusDoDocumento(
  doc: DocumentoDaEmpresa | undefined,
  agora: Date,
): { status: StatusDoItem; observacao: string } {
  if (!doc) {
    return {
      status: "ausente",
      observacao: "Não encontramos este documento no cadastro da sua empresa.",
    };
  }

  if (!doc.arquivoAnexado) {
    return {
      status: "verificar",
      observacao:
        "Cadastrado, mas sem arquivo anexado. Confirme que o documento existe e está em mãos antes da sessão.",
    };
  }

  if (doc.semValidade) {
    return {
      status: "disponivel",
      observacao: "Documento anexado e sem prazo de validade.",
    };
  }

  if (!doc.validoAte) {
    return {
      status: "verificar",
      observacao:
        "Documento anexado, mas sem data de validade informada. Confira o prazo — certidão vencida elimina na habilitação.",
    };
  }

  const validade = new Date(doc.validoAte);
  if (Number.isNaN(validade.getTime())) {
    return {
      status: "verificar",
      observacao: "A validade cadastrada não é uma data reconhecível. Confira o documento.",
    };
  }

  const dias = Math.ceil((validade.getTime() - agora.getTime()) / 86_400_000);
  if (dias < 0) {
    return {
      status: "verificar",
      observacao: `Validade vencida em ${dataDeBrasilia(doc.validoAte!)}. Renove antes de disputar.`,
    };
  }
  if (dias <= 30) {
    return {
      status: "verificar",
      observacao: `Vence em ${dias} dia${dias === 1 ? "" : "s"} (${dataDeBrasilia(doc.validoAte!)}). Renove para não perder o prazo.`,
    };
  }
  return {
    status: "disponivel",
    observacao: `Anexado e válido até ${dataDeBrasilia(doc.validoAte!)}.`,
  };
}

/**
 * Monta o checklist cruzando as exigências lidas do edital com o cadastro.
 *
 * Quando o edital não foi lido em profundidade, a função NÃO devolve lista
 * vazia: devolve os documentos de habilitação que a Lei 14.133 torna usuais,
 * marcados como `nao_identificado` no que depende do edital. É a diferença
 * entre "não falta nada" e "ainda não sabemos o que o edital pede" — e essa
 * diferença é o produto inteiro.
 */
export function montarChecklist(
  analise: AnaliseDoEdital,
  perfil: PerfilDaEmpresa,
  agora: Date = new Date(),
): Checklist {
  const porTipo = new Map<TipoDeDocumento, DocumentoDaEmpresa>();
  for (const doc of perfil.documentos) {
    // Um tipo pode ter mais de um documento cadastrado (duas certidões
    // estaduais, por exemplo). Fica o que a empresa apresentaria: primeiro
    // critério é ter arquivo anexado — um cadastro sem arquivo não vale mais
    // só por ter uma data de validade maior, ou o checklist preferirira um
    // registro vazio a um documento pronto. Entre dois com o mesmo status de
    // arquivo, fica o de validade mais longa.
    const atual = porTipo.get(doc.tipo);
    const substitui =
      !atual ||
      (doc.arquivoAnexado && !atual.arquivoAnexado) ||
      (doc.arquivoAnexado === atual.arquivoAnexado && (doc.validoAte ?? "") > (atual.validoAte ?? ""));
    if (substitui) porTipo.set(doc.tipo, doc);
  }

  const analiseLeuTexto = analise.profundidade !== "lista";
  const derivadoDoDocumento = analiseLeuTexto && analise.exigencias.length > 0;
  const itens: ItemDoChecklist[] = [];

  if (derivadoDoDocumento) {
    for (const exigencia of analise.exigencias) {
      const doc = porTipo.get(exigencia.tipo);
      const { status, observacao } = statusDoDocumento(doc, agora);
      itens.push({
        tipo: exigencia.tipo,
        nome: NOME_DO_DOCUMENTO[exigencia.tipo],
        descricaoNoEdital: temValor(exigencia.descricao) ? exigencia.descricao.valor : null,
        fase: exigencia.fase,
        // Exigência cuja obrigatoriedade não foi determinada entra como
        // obrigatória: errar para o lado de cobrar demais custa uma conferência,
        // errar para o outro custa a habilitação.
        obrigatorio: temValor(exigencia.obrigatoria) ? exigencia.obrigatoria.valor : true,
        status,
        observacao,
      });
    }
  } else {
    for (const tipo of HABILITACAO_USUAL) {
      const doc = porTipo.get(tipo);
      const { status, observacao } = statusDoDocumento(doc, agora);
      itens.push({
        tipo,
        nome: NOME_DO_DOCUMENTO[tipo],
        descricaoNoEdital: null,
        fase: "habilitacao",
        obrigatorio: true,
        status: status === "ausente" ? "nao_identificado" : status,
        observacao:
          status === "ausente"
            ? "Exigido na maioria dos editais pela Lei 14.133, mas ainda não confirmamos no texto deste. Não encontramos no seu cadastro."
            : `${observacao} Ainda não confirmamos que este edital exige o documento.`,
      });
    }
  }

  const obrigatorios = itens.filter((i) => i.obrigatorio);
  return {
    itens,
    derivadoDoDocumento,
    analiseLeuTexto,
    totais: {
      obrigatorios: obrigatorios.length,
      disponiveis: obrigatorios.filter((i) => i.status === "disponivel").length,
      verificar: obrigatorios.filter((i) => i.status === "verificar").length,
      ausentes: obrigatorios.filter((i) => i.status === "ausente").length,
      naoIdentificados: obrigatorios.filter((i) => i.status === "nao_identificado").length,
    },
  };
}

/**
 * Fração da documentação obrigatória efetivamente disponível — ou `null`.
 *
 * `null` quando não há base para calcular. Devolver `0` neste caso diria
 * "você não tem nada", que é uma afirmação sobre a empresa que o dado não
 * sustenta.
 */
export function prontidaoDocumental(checklist: Checklist): number | null {
  const avaliaveis = checklist.itens.filter(
    (i) => i.obrigatorio && i.status !== "nao_identificado",
  );
  if (avaliaveis.length === 0) return null;
  const pontos = avaliaveis.reduce(
    (soma, i) => soma + (i.status === "disponivel" ? 1 : i.status === "verificar" ? 0.5 : 0),
    0,
  );
  return pontos / avaliaveis.length;
}
