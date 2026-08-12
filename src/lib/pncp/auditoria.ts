import type { Edital } from "./tipos";

/**
 * Revisão automática do que foi coletado, antes de qualquer publicação.
 *
 * A regra desta camada é uma só: **nada é inventado**. Um achado só existe se
 * for derivável do próprio dado, e a descrição diz qual medida o disparou. Onde
 * cabe hipótese de correção, ela vem rotulada como hipótese e acompanhada do
 * raciocínio — e quando mais de uma hipótese serve, todas são listadas e o
 * achado declara que não é possível determinar qual vale. Preencher a lacuna
 * com um palpete de aparência confiante é pior que deixá-la aberta: o leitor
 * não tem como saber que foi palpite.
 *
 * Igualmente importante: o que é padrão legítimo NÃO vira achado. Medido em
 * 2026-08-12, credenciamento tem duração mediana de 365 dias porque é contínuo
 * por natureza — uma checagem ingênua de "aberto há muito tempo" produziria
 * sete alarmes falsos no piloto. Antes de acrescentar regra aqui, verifique
 * contra o conjunto se o que parece erro não é só a modalidade sendo ela mesma.
 */

export type Achado = {
  /** `erro`: contradiz a própria base. `suspeita`: implausível, não impossível. `aviso`: incompleto. */
  gravidade: "erro" | "suspeita" | "aviso";
  regra: string;
  editalId: string;
  link: string;
  /** Texto pronto para publicação. */
  descricao: string;
  /** A medida concreta que disparou o achado. */
  evidencia: string;
  /** Só quando derivável do dado. `null` quando não há como inferir. */
  hipotese: string | null;
};

export type Auditoria = {
  revisadoEm: string;
  totalEditais: number;
  achados: Achado[];
  resumo: {
    erros: number;
    suspeitas: number;
    avisos: number;
    semValorInformado: number;
    percentualComValor: number;
  };
};

/** Os dois primeiros dígitos do código IBGE codificam a UF. */
const UF_POR_PREFIXO_IBGE: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

/** Dígitos verificadores do CNPJ. Aritmética pura — não depende de julgamento. */
export function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (pesos: number[]) => {
    const soma = pesos.reduce((acc, peso, i) => acc + Number(cnpj[i]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return (
    Number(cnpj[12]) === digito([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    Number(cnpj[13]) === digito([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  );
}

const brl = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Candidatos de correção para um valor implausível.
 *
 * Testa apenas erros de escala por potência de dez — o engano de digitação mais
 * comum em campo monetário, e o único que dá para testar contra o dado. Um
 * candidato só entra se cair dentro da faixa REALMENTE observada na mesma
 * modalidade. Se sobrar mais de um, o achado diz que não dá para decidir; se
 * não sobrar nenhum, não há hipótese e o achado sai sem ela.
 */
function candidatosDeEscala(valor: number, faixa: { min: number; max: number }) {
  return [10, 100, 1_000, 10_000, 100_000]
    .map((divisor) => ({ divisor, valor: valor / divisor }))
    .filter((c) => c.valor >= faixa.min && c.valor <= faixa.max);
}

function percentil(ordenados: number[], q: number): number {
  return ordenados[Math.floor(q * (ordenados.length - 1))];
}

export function auditar(editais: Edital[], revisadoEm: string): Auditoria {
  const achados: Achado[] = [];
  const referencia = new Date(revisadoEm);

  // Faixa observada por modalidade, ignorando o que já está marcado como
  // suspeito — senão o outlier alarga a própria faixa e se auto-inocenta.
  const faixaPorModalidade = new Map<string, { min: number; max: number }>();
  for (const modalidade of new Set(editais.map((e) => e.modalidade))) {
    const valores = editais
      .filter((e) => e.modalidade === modalidade && e.valorEstimado !== null && !e.valorSuspeito)
      .map((e) => e.valorEstimado as number)
      .sort((a, b) => a - b);
    if (valores.length >= 30) {
      faixaPorModalidade.set(modalidade, { min: percentil(valores, 0.5), max: valores[valores.length - 1] });
    }
  }

  for (const e of editais) {
    const base = { editalId: e.id, link: e.link };

    if (e.aberturaProposta && e.encerramentoProposta && new Date(e.encerramentoProposta) < new Date(e.aberturaProposta)) {
      achados.push({
        ...base,
        gravidade: "erro",
        regra: "prazo-invertido",
        descricao: `No edital ${e.id}, o encerramento das propostas está registrado antes da abertura.`,
        evidencia: `abertura ${e.aberturaProposta}, encerramento ${e.encerramentoProposta}`,
        hipotese: null,
      });
    }

    if (e.encerramentoProposta && new Date(e.encerramentoProposta) < referencia) {
      achados.push({
        ...base,
        gravidade: "erro",
        regra: "prazo-vencido",
        descricao: `O edital ${e.id} veio na consulta de propostas abertas, mas o prazo já havia encerrado no momento da coleta.`,
        evidencia: `encerrou em ${e.encerramentoProposta}, coleta em ${revisadoEm}`,
        hipotese: null,
      });
    }

    const ufDoIbge = UF_POR_PREFIXO_IBGE[e.local.codigoIbge.slice(0, 2)];
    if (ufDoIbge && ufDoIbge !== e.local.uf) {
      achados.push({
        ...base,
        gravidade: "erro",
        regra: "uf-divergente-do-ibge",
        descricao: `No edital ${e.id}, a UF informada não corresponde ao código IBGE do município.`,
        evidencia: `UF informada ${e.local.uf}, código IBGE ${e.local.codigoIbge} (prefixo ${e.local.codigoIbge.slice(0, 2)} = ${ufDoIbge})`,
        hipotese: `O prefixo do código IBGE indica ${ufDoIbge}. Qual dos dois campos está errado não é determinável pelo registro.`,
      });
    }

    if (!cnpjValido(e.orgao.cnpj)) {
      achados.push({
        ...base,
        gravidade: "erro",
        regra: "cnpj-invalido",
        descricao: `No edital ${e.id}, o CNPJ do órgão não passa na verificação dos dígitos.`,
        evidencia: `CNPJ ${e.orgao.cnpj} (${e.orgao.nome})`,
        hipotese: null,
      });
    }

    if (e.objeto.trim().length < 15) {
      achados.push({
        ...base,
        gravidade: "aviso",
        regra: "objeto-insuficiente",
        descricao: `O edital ${e.id} tem descrição de objeto curta demais para dizer o que está sendo comprado.`,
        evidencia: `objeto declarado: ${JSON.stringify(e.objeto)}`,
        hipotese: null,
      });
    }

    if (e.valorSuspeito && e.valorEstimado !== null) {
      const faixa = faixaPorModalidade.get(e.modalidade);
      const candidatos = faixa ? candidatosDeEscala(e.valorEstimado, faixa) : [];

      let hipotese: string;
      if (candidatos.length === 1) {
        const c = candidatos[0];
        hipotese = `Dividido por ${c.divisor.toLocaleString("pt-BR")}, o valor vira ${brl(c.valor)}, que cai dentro da faixa observada em ${e.modalidade} neste conjunto — compatível com erro de escala na digitação. É hipótese derivada da distribuição, não confirmação: só o órgão pode dizer o valor correto.`;
      } else if (candidatos.length > 1) {
        const lista = candidatos.map((c) => `dividido por ${c.divisor.toLocaleString("pt-BR")} daria ${brl(c.valor)}`).join("; ");
        hipotese = `Mais de uma correção de escala é compatível com a faixa observada em ${e.modalidade} (${lista}). **Não é possível determinar qual seria o valor correto** a partir do dado disponível.`;
      } else {
        hipotese = `Nenhuma correção por potência de dez cai na faixa observada em ${e.modalidade}. Não há hipótese sustentável para o valor correto.`;
      }

      achados.push({
        ...base,
        gravidade: "suspeita",
        regra: "valor-implausivel",
        descricao: `No edital ${e.id}, do órgão ${e.orgao.nome}, o valor estimado parece incoerente — possivelmente erro de digitação na fonte.`,
        evidencia: `valor declarado ${brl(e.valorEstimado)}${faixa ? `, contra máximo de ${brl(faixa.max)} entre os demais ${e.modalidade} deste conjunto` : ""}`,
        hipotese,
      });
    }
  }

  const semValor = editais.filter((e) => e.valorEstimado === null).length;

  return {
    revisadoEm,
    totalEditais: editais.length,
    achados,
    resumo: {
      erros: achados.filter((a) => a.gravidade === "erro").length,
      suspeitas: achados.filter((a) => a.gravidade === "suspeita").length,
      avisos: achados.filter((a) => a.gravidade === "aviso").length,
      semValorInformado: semValor,
      percentualComValor: editais.length
        ? Math.round((100 * (editais.length - semValor)) / editais.length)
        : 0,
    },
  };
}

/** Texto de publicação. É isto que vai junto do dado, não um resumo maquiado. */
export function relatorioEmTexto(
  a: Auditoria,
  cobertura?: { ufsSolicitadas: string[]; ufsComFalha: { uf: string; erro: string }[] },
): string {
  const l: string[] = [];
  l.push(`Revisão dos dados — ${a.totalEditais} editais coletados em ${a.revisadoEm}.`);
  l.push("");

  // Cobertura incompleta é a primeira coisa a declarar: ela muda o que os
  // números abaixo significam. Publicar total de "seis estados" tendo coletado
  // quatro é errar por omissão.
  if (cobertura && cobertura.ufsComFalha.length > 0) {
    l.push(
      `ATENÇÃO — cobertura incompleta. Das ${cobertura.ufsSolicitadas.length} UFs solicitadas, ${cobertura.ufsComFalha.length} não puderam ser coletadas nesta rodada e não estão representadas nos números abaixo:`,
    );
    for (const f of cobertura.ufsComFalha) l.push(`  ${f.uf}: ${f.erro}`);
    l.push("");
  }

  if (a.achados.length === 0) {
    l.push("Nenhuma incoerência encontrada nas verificações aplicadas: prazo, correspondência entre UF e código IBGE, dígitos do CNPJ, descrição do objeto e plausibilidade do valor.");
  } else {
    l.push(`Encontrados ${a.resumo.erros} erro(s), ${a.resumo.suspeitas} suspeita(s) e ${a.resumo.avisos} aviso(s).`);
    l.push("");
    for (const ach of a.achados) {
      l.push(`[${ach.gravidade.toUpperCase()}] ${ach.descricao}`);
      l.push(`  Evidência: ${ach.evidencia}`);
      if (ach.hipotese) l.push(`  Hipótese: ${ach.hipotese}`);
      l.push(`  Edital: ${ach.link}`);
      l.push("");
    }
  }

  l.push(`${a.resumo.percentualComValor}% dos editais têm valor estimado informado pelo órgão; nos demais o campo veio vazio na fonte e nenhum valor foi estimado por nós.`);
  return l.join("\n");
}
