import type { Edital } from "../pncp/tipos.ts";
import { diasAteEncerrar } from "../pncp/normaliza.ts";
import type { AnaliseDoEdital, PerfilDaEmpresa } from "./tipos.ts";
import { montarChecklist, prontidaoDocumental, type Checklist } from "./checklist.ts";
import { coberturaDeTermos, termosEncontrados } from "./texto.ts";
import { dataEHoraDeBrasilia } from "./datas.ts";
import { type Campo, desconhecido, doEdital, doPerfil, inferido } from "./procedencia.ts";

/**
 * Score de aderência: o quanto ESTE edital combina com ESTA empresa.
 *
 * Duas decisões de projeto explicam quase tudo que está aqui.
 *
 * **1. Um critério que não pôde ser avaliado não vale zero — ele sai da conta.**
 * O caminho fácil seria dar 0 ao que falta e devolver sempre um número redondo.
 * Isso transformaria ausência de informação em afirmação negativa: um edital sem
 * valor estimado publicado apareceria como "pouco aderente", quando a verdade é
 * que não sabemos. Aqui, critério indeterminado sai do numerador E do
 * denominador, e o que sobra é declarado em `cobertura`. Se a cobertura for
 * baixa demais, não há score — há um pedido de mais informação.
 *
 * **2. O número nunca viaja sozinho.** `criterios` carrega, para cada item, a
 * frase que a interface mostra e a procedência do dado que a sustenta. Um score
 * sem "por quê" é caixa-preta, e caixa-preta não sustenta uma decisão de gastar
 * uma semana montando proposta.
 *
 * Os pesos abaixo são um ponto de partida defensável, não uma verdade medida:
 * ainda não existe histórico de participação para calibrá-los. Quando existir
 * (ver `decisoes_de_triagem` no banco), eles passam a ser aprendidos, e este
 * comentário deve ser trocado pela descrição do método.
 */

export type StatusDoCriterio = "positivo" | "atencao" | "impedimento" | "indeterminado";

export type CriterioAvaliado = {
  chave: string;
  nome: string;
  peso: number;
  status: StatusDoCriterio;
  /** 0..1 do peso conquistado. `null` quando indeterminado (sai da conta). */
  aproveitamento: number | null;
  /** Frase pronta para a interface. Específica, nunca "compatível" no vácuo. */
  frase: string;
  /** De onde veio a informação que sustenta a frase. */
  procedencia: Campo<unknown>;
};

export type FaixaDoScore = "excelente" | "boa" | "moderada" | "baixa" | "indeterminada";

export type Score = {
  /** 0..100. `null` quando não há base suficiente — e aí `motivo` explica. */
  valor: number | null;
  faixa: FaixaDoScore;
  /** Fração do peso total que pôde ser avaliada (0..1). */
  cobertura: number;
  criterios: CriterioAvaliado[];
  positivos: CriterioAvaliado[];
  atencoes: CriterioAvaliado[];
  impedimentos: CriterioAvaliado[];
  indeterminados: CriterioAvaliado[];
  /** Preenchido quando `valor` é `null`. É o que o usuário lê no lugar do número. */
  motivo: string | null;
};

/**
 * Abaixo desta cobertura o número seria mais chute que medida.
 *
 * 0,5 não é mágico: é o ponto em que metade do peso dos critérios ficou sem
 * base. Preferimos dizer "faltam informações" a publicar um 62 que ninguém
 * consegue defender na frente do cliente.
 */
const COBERTURA_MINIMA = 0.5;

/**
 * A versão do algoritmo de score.
 *
 * Descoberta pela tabela, não pelo código: `oportunidades` e
 * `decisoes_de_triagem` declaram `versao_do_score text not null`, e não havia
 * constante nenhuma para preencher. O esquema estava certo e a implementação
 * devia essa informação.
 *
 * Ela existe para responder a pergunta que um cliente faz meses depois: "por
 * que este edital tinha 78 em março e teria 64 hoje?". Sem o carimbo, a
 * resposta seria recalcular com as regras de hoje — que responde outra
 * pergunta, e responde errado com toda a convicção.
 *
 * É também o que torna a reavaliação barata: mudou o algoritmo, mudou a versão,
 * e o que precisa ser refeito é exatamente o que está carimbado com a versão
 * antiga. A restrição `triagem_unica_por_versao` conta com isso.
 *
 * **Suba quando os PESOS, os cortes ou qualquer critério mudarem.** Não suba
 * por refatoração que não altere um número — versão que muda sem o resultado
 * mudar só faz reprocessar em vão.
 */
export const VERSAO_DO_SCORE = "score.v1";

const PESOS = {
  objeto: 25,
  regiao: 20,
  documentacao: 15,
  valor: 15,
  prazo: 10,
  experiencia: 10,
  capacidade: 10,
  modalidade: 5,
  complexidade: 5,
} as const;

function criterioObjeto(edital: Edital, perfil: PerfilDaEmpresa): CriterioAvaliado {
  const base = { chave: "objeto", nome: "Compatibilidade do objeto", peso: PESOS.objeto };

  const excluidas = termosEncontrados(edital.objeto, perfil.palavrasExcluidas);
  if (excluidas.length > 0) {
    return {
      ...base,
      status: "impedimento",
      aproveitamento: 0,
      frase: `O objeto contém ${excluidas.map((t) => `"${t}"`).join(", ")}, que você marcou como fora do seu escopo.`,
      procedencia: doPerfil(excluidas, "Palavras excluídas declaradas no seu perfil."),
    };
  }

  if (perfil.palavrasChave.length === 0) {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase: "Não há palavras-chave no seu perfil, então não dá para julgar se o objeto é do seu ramo.",
      procedencia: desconhecido("Perfil sem palavras-chave cadastradas."),
    };
  }

  const achados = termosEncontrados(edital.objeto, perfil.palavrasChave);
  if (achados.length === 0) {
    return {
      ...base,
      status: "atencao",
      aproveitamento: 0,
      frase: "Nenhuma das suas palavras-chave aparece no objeto deste edital.",
      procedencia: doEdital(edital.objeto, `Objeto publicado: "${edital.objeto}".`),
    };
  }

  // Mais termos casando é sinal mais forte, mas com retorno decrescente: o
  // segundo acerto acrescenta bem menos que o primeiro, e o quinto quase nada.
  const aproveitamento = Math.min(1, 0.7 + 0.15 * (achados.length - 1));
  return {
    ...base,
    status: "positivo",
    aproveitamento,
    frase: `O objeto casa com ${achados.map((t) => `"${t}"`).join(", ")} do seu perfil.`,
    procedencia: doEdital(edital.objeto, `Objeto publicado: "${edital.objeto}".`),
  };
}

function criterioRegiao(edital: Edital, perfil: PerfilDaEmpresa): CriterioAvaliado {
  const base = { chave: "regiao", nome: "Região de atuação", peso: PESOS.regiao };

  if (perfil.ufsAtendidas.length === 0) {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase: "Você não declarou em quais estados atende, então não dá para julgar a localização.",
      procedencia: desconhecido("Perfil sem UFs de atuação."),
    };
  }

  if (!perfil.ufsAtendidas.includes(edital.local.uf)) {
    return {
      ...base,
      status: "impedimento",
      aproveitamento: 0,
      frase: `A execução é em ${edital.local.municipio}/${edital.local.uf}, fora dos estados que você atende.`,
      procedencia: doPerfil(
        perfil.ufsAtendidas,
        `Estados declarados: ${perfil.ufsAtendidas.join(", ")}.`,
      ),
    };
  }

  const prioritario = perfil.municipiosPrioritarios.includes(edital.local.codigoIbge);
  return {
    ...base,
    status: "positivo",
    aproveitamento: prioritario ? 1 : 0.85,
    frase: prioritario
      ? `${edital.local.municipio}/${edital.local.uf} é um dos municípios que você marcou como prioritários.`
      : `${edital.local.municipio}/${edital.local.uf} está dentro dos estados que você atende.`,
    procedencia: doEdital(
      `${edital.local.municipio}/${edital.local.uf}`,
      "Município e UF da unidade compradora, informados na publicação.",
    ),
  };
}

function criterioValor(edital: Edital, perfil: PerfilDaEmpresa): CriterioAvaliado {
  const base = { chave: "valor", nome: "Valor dentro da sua faixa", peso: PESOS.valor };

  if (edital.valorSuspeito) {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase:
        "O valor publicado é implausível a ponto de não servir para comparação — provável erro de digitação na origem.",
      procedencia: desconhecido(
        `Valor publicado (R$ ${edital.valorEstimadoBruto?.toLocaleString("pt-BR")}) destoa do conjunto e foi marcado como suspeito.`,
      ),
    };
  }

  if (edital.valorEstimado === null) {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase: "O órgão não publicou valor estimado para este edital.",
      procedencia: desconhecido("Campo de valor estimado veio vazio na fonte."),
    };
  }

  if (perfil.ticketMinimo === null && perfil.ticketMaximo === null) {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase: "Você não declarou faixa de ticket, então não dá para julgar se o valor serve.",
      procedencia: desconhecido("Perfil sem ticket mínimo ou máximo."),
    };
  }

  const valor = edital.valorEstimado;
  const emReais = `R$ ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  const evidencia = doEdital(valor, `Valor estimado publicado: ${emReais}.`);

  if (perfil.ticketMinimo !== null && valor < perfil.ticketMinimo) {
    return {
      ...base,
      status: "atencao",
      aproveitamento: 0.3,
      frase: `${emReais} está abaixo do seu ticket mínimo (R$ ${perfil.ticketMinimo.toLocaleString("pt-BR")}).`,
      procedencia: evidencia,
    };
  }

  if (perfil.ticketMaximo !== null && valor > perfil.ticketMaximo) {
    const vezes = valor / perfil.ticketMaximo;
    return {
      ...base,
      status: "atencao",
      aproveitamento: vezes > 3 ? 0 : 0.2,
      frase:
        vezes > 3
          ? `${emReais} é mais de ${Math.floor(vezes)}× o seu ticket máximo — porte de contrato bem acima do que você declarou operar.`
          : `${emReais} está acima do seu ticket máximo (R$ ${perfil.ticketMaximo.toLocaleString("pt-BR")}).`,
      procedencia: evidencia,
    };
  }

  return {
    ...base,
    status: "positivo",
    aproveitamento: 1,
    frase: `${emReais} está dentro da faixa de valor que você opera.`,
    procedencia: evidencia,
  };
}

function criterioCapacidade(edital: Edital, perfil: PerfilDaEmpresa): CriterioAvaliado {
  const base = { chave: "capacidade", nome: "Capacidade financeira", peso: PESOS.capacidade };

  if (edital.valorEstimado === null || edital.valorSuspeito || perfil.faturamentoAnual === null) {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase: "Sem valor confiável do edital ou sem faturamento declarado, não dá para comparar porte.",
      procedencia: desconhecido(
        perfil.faturamentoAnual === null
          ? "Faturamento anual não informado no perfil."
          : "Valor do edital ausente ou marcado como suspeito.",
      ),
    };
  }

  const proporcao = edital.valorEstimado / perfil.faturamentoAnual;
  const pct = Math.round(proporcao * 100);
  // A referência não é arbitrária: a Lei 14.133 (art. 69) deixa o órgão exigir
  // capital ou patrimônio líquido de até 10% do valor estimado, e proíbe exigir
  // faturamento mínimo. Contrato que se aproxima do faturamento anual inteiro
  // costuma esbarrar em qualificação econômico-financeira.
  if (proporcao <= 0.5) {
    return {
      ...base,
      status: "positivo",
      aproveitamento: 1,
      frase: `O contrato equivale a ${pct}% do seu faturamento anual — porte confortável.`,
      procedencia: inferido(
        proporcao,
        "Razão entre o valor estimado publicado e o faturamento anual que você declarou.",
        "alta",
      ),
    };
  }
  if (proporcao <= 1) {
    return {
      ...base,
      status: "atencao",
      aproveitamento: 0.5,
      frase: `O contrato equivale a ${pct}% do seu faturamento anual — verifique a exigência de qualificação econômico-financeira.`,
      procedencia: inferido(
        proporcao,
        "Razão entre o valor estimado publicado e o faturamento anual que você declarou.",
        "alta",
      ),
    };
  }
  return {
    ...base,
    status: "atencao",
    aproveitamento: 0.1,
    frase: `O contrato é ${(proporcao).toFixed(1)}× o seu faturamento anual — o porte exigido tende a ser um obstáculo real.`,
    procedencia: inferido(
      proporcao,
      "Razão entre o valor estimado publicado e o faturamento anual que você declarou.",
      "alta",
    ),
  };
}

function criterioPrazo(edital: Edital, agora: Date): CriterioAvaliado {
  const base = { chave: "prazo", nome: "Prazo para preparar", peso: PESOS.prazo };
  const dias = diasAteEncerrar(edital, agora);

  if (dias === null) {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase: "Este edital não traz data de encerramento das propostas.",
      procedencia: desconhecido("Data de encerramento ausente na fonte."),
    };
  }

  const evidencia = doEdital(
    edital.encerramentoProposta,
    `Encerramento das propostas: ${dataEHoraDeBrasilia(edital.encerramentoProposta!)} (horário de Brasília).`,
  );

  if (dias < 0) {
    return {
      ...base,
      status: "impedimento",
      aproveitamento: 0,
      frase: "O prazo para propostas já encerrou.",
      procedencia: evidencia,
    };
  }
  if (dias <= 2) {
    return {
      ...base,
      status: "atencao",
      aproveitamento: 0.3,
      frase: `Faltam ${dias === 0 ? "menos de 24 horas" : `${dias} dia${dias === 1 ? "" : "s"}`} — só vale se a documentação já estiver pronta.`,
      procedencia: evidencia,
    };
  }
  if (dias <= 7) {
    return {
      ...base,
      status: "atencao",
      aproveitamento: 0.7,
      frase: `Faltam ${dias} dias. Dá para preparar, mas sem folga.`,
      procedencia: evidencia,
    };
  }
  return {
    ...base,
    status: "positivo",
    aproveitamento: 1,
    frase: `Faltam ${dias} dias até o encerramento — prazo confortável.`,
    procedencia: evidencia,
  };
}

function criterioDocumentacao(checklist: Checklist): CriterioAvaliado {
  const base = { chave: "documentacao", nome: "Documentação", peso: PESOS.documentacao };
  const prontidao = prontidaoDocumental(checklist);

  if (!checklist.derivadoDoDocumento || prontidao === null) {
    return checklist.analiseLeuTexto
      ? {
          ...base,
          status: "indeterminado",
          aproveitamento: null,
          frase:
            "O edital foi lido, mas nenhuma exigência de habilitação foi confirmada no texto — comparamos com o que a Lei 14.133 torna usual.",
          procedencia: desconhecido(
            "O documento foi lido; nenhuma exigência de habilitação sobreviveu à checagem de evidência contra o texto.",
          ),
        }
      : {
          ...base,
          status: "indeterminado",
          aproveitamento: null,
          frase:
            "O texto do edital ainda não foi lido, então não sabemos quais documentos ele exige.",
          procedencia: desconhecido(
            "Análise ainda no nível da publicação: as exigências de habilitação não foram extraídas.",
          ),
        };
  }

  const { disponiveis, obrigatorios, ausentes } = checklist.totais;
  if (ausentes > 0) {
    return {
      ...base,
      status: "atencao",
      aproveitamento: prontidao,
      frase: `${disponiveis} de ${obrigatorios} documentos obrigatórios disponíveis; ${ausentes} não estão no seu cadastro.`,
      procedencia: doPerfil(
        checklist.totais,
        "Cruzamento entre as exigências lidas no edital e os documentos do seu cadastro.",
      ),
    };
  }
  return {
    ...base,
    status: prontidao >= 0.9 ? "positivo" : "atencao",
    aproveitamento: prontidao,
    frase: `${disponiveis} de ${obrigatorios} documentos obrigatórios prontos; o restante precisa de conferência.`,
    procedencia: doPerfil(
      checklist.totais,
      "Cruzamento entre as exigências lidas no edital e os documentos do seu cadastro.",
    ),
  };
}

function criterioExperiencia(edital: Edital, perfil: PerfilDaEmpresa): CriterioAvaliado {
  const base = { chave: "experiencia", nome: "Experiência comprovável", peso: PESOS.experiencia };

  if (perfil.atestados.length === 0) {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase:
        "Você ainda não cadastrou atestados de capacidade técnica — sem eles não dá para dizer se a experiência cobre este objeto.",
      procedencia: desconhecido("Nenhum atestado cadastrado no perfil."),
    };
  }

  // Metade dos termos do objeto descritos no atestado é o corte. Abaixo disso o
  // atestado costuma ser de outra coisa que compartilha uma palavra; acima,
  // ele cobre o miolo do que o edital pede. O número é um ponto de partida
  // declarado, não uma medição — quando houver histórico de habilitação
  // aceita/recusada, ele vira parâmetro aprendido.
  const parecidos = perfil.atestados.filter(
    (a) => coberturaDeTermos(a.objeto, edital.objeto) >= 0.5,
  );

  if (parecidos.length === 0) {
    return {
      ...base,
      status: "atencao",
      aproveitamento: 0.2,
      frase: "Nenhum dos seus atestados descreve um objeto parecido com o deste edital.",
      procedencia: doPerfil(
        perfil.atestados.length,
        `${perfil.atestados.length} atestado(s) cadastrado(s), nenhum com objeto semelhante.`,
      ),
    };
  }

  const maior = Math.max(...parecidos.map((a) => a.valor ?? 0));
  const cobreValor = edital.valorEstimado === null || maior >= edital.valorEstimado * 0.5;
  return {
    ...base,
    status: cobreValor ? "positivo" : "atencao",
    aproveitamento: cobreValor ? 1 : 0.6,
    frase: cobreValor
      ? `Você tem ${parecidos.length} atestado(s) com objeto semelhante.`
      : `Você tem atestado com objeto semelhante, mas de porte menor que este contrato — confira o percentual exigido.`,
    procedencia: doPerfil(
      parecidos.map((a) => a.objeto),
      `Atestados semelhantes: ${parecidos.map((a) => a.objeto).join("; ")}.`,
    ),
  };
}

function criterioModalidade(edital: Edital, perfil: PerfilDaEmpresa): CriterioAvaliado {
  const base = { chave: "modalidade", nome: "Modalidade", peso: PESOS.modalidade };

  if (perfil.modalidadesAceitas.length === 0) {
    return {
      ...base,
      status: "positivo",
      aproveitamento: 1,
      frase: `${edital.modalidade} — você não restringiu modalidades no seu perfil.`,
      procedencia: doPerfil([], "Nenhuma restrição de modalidade declarada."),
    };
  }

  const aceita = perfil.modalidadesAceitas.some(
    (m) => termosEncontrados(edital.modalidade, [m]).length > 0,
  );
  return {
    ...base,
    status: aceita ? "positivo" : "atencao",
    aproveitamento: aceita ? 1 : 0,
    frase: aceita
      ? `${edital.modalidade} está entre as modalidades que você disputa.`
      : `${edital.modalidade} não está entre as modalidades que você marcou disputar.`,
    procedencia: doEdital(edital.modalidade, `Modalidade publicada: ${edital.modalidade}.`),
  };
}

function criterioComplexidade(analise: AnaliseDoEdital): CriterioAvaliado {
  const base = { chave: "complexidade", nome: "Exigências extras", peso: PESOS.complexidade };

  if (analise.profundidade === "lista") {
    return {
      ...base,
      status: "indeterminado",
      aproveitamento: null,
      frase: "Garantia, visita técnica e amostra só aparecem no texto do edital, que ainda não foi lido.",
      procedencia: desconhecido("Análise ainda no nível da publicação."),
    };
  }

  const extras: string[] = [];
  if (analise.garantiaExigida.origem !== "desconhecido" && analise.garantiaExigida.valor) {
    extras.push("garantia de proposta");
  }
  if (analise.visitaTecnicaExigida.origem !== "desconhecido" && analise.visitaTecnicaExigida.valor) {
    extras.push("visita técnica");
  }
  if (analise.amostraExigida.origem !== "desconhecido" && analise.amostraExigida.valor) {
    extras.push("amostra");
  }

  if (extras.length === 0) {
    return {
      ...base,
      status: "positivo",
      aproveitamento: 1,
      frase: "Sem garantia, visita técnica ou amostra identificadas no edital.",
      procedencia: doEdital(false, "Nenhuma das três exigências foi encontrada no texto."),
    };
  }
  return {
    ...base,
    status: "atencao",
    aproveitamento: Math.max(0, 1 - 0.35 * extras.length),
    frase: `O edital exige ${extras.join(", ")} — some isso ao tempo de preparação.`,
    procedencia: doEdital(extras, `Exigências localizadas no texto: ${extras.join(", ")}.`),
  };
}

function faixaDe(valor: number): FaixaDoScore {
  if (valor >= 85) return "excelente";
  if (valor >= 70) return "boa";
  if (valor >= 50) return "moderada";
  return "baixa";
}

export function calcularScore(
  edital: Edital,
  analise: AnaliseDoEdital,
  perfil: PerfilDaEmpresa,
  agora: Date = new Date(),
): { score: Score; checklist: Checklist } {
  const checklist = montarChecklist(analise, perfil, agora);

  const criterios = [
    criterioObjeto(edital, perfil),
    criterioRegiao(edital, perfil),
    criterioDocumentacao(checklist),
    criterioValor(edital, perfil),
    criterioPrazo(edital, agora),
    criterioExperiencia(edital, perfil),
    criterioCapacidade(edital, perfil),
    criterioModalidade(edital, perfil),
    criterioComplexidade(analise),
  ];

  const avaliados = criterios.filter((c) => c.aproveitamento !== null);
  const pesoTotal = criterios.reduce((s, c) => s + c.peso, 0);
  const pesoAvaliado = avaliados.reduce((s, c) => s + c.peso, 0);
  const cobertura = pesoAvaliado / pesoTotal;

  const grupos = {
    positivos: criterios.filter((c) => c.status === "positivo"),
    atencoes: criterios.filter((c) => c.status === "atencao"),
    impedimentos: criterios.filter((c) => c.status === "impedimento"),
    indeterminados: criterios.filter((c) => c.status === "indeterminado"),
  };

  if (cobertura < COBERTURA_MINIMA) {
    return {
      checklist,
      score: {
        valor: null,
        faixa: "indeterminada",
        cobertura,
        criterios,
        ...grupos,
        motivo:
          "Faltam informações demais para pontuar com honestidade: " +
          grupos.indeterminados.map((c) => c.nome.toLowerCase()).join(", ") +
          ".",
      },
    };
  }

  const conquistado = avaliados.reduce((s, c) => s + c.peso * (c.aproveitamento ?? 0), 0);
  const valor = Math.round((conquistado / pesoAvaliado) * 100);

  return {
    checklist,
    score: { valor, faixa: faixaDe(valor), cobertura, criterios, ...grupos, motivo: null },
  };
}
