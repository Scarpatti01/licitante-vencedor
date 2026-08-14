import {
  TIPOS_DE_DOCUMENTO,
  type DocumentoDaEmpresa,
  type PerfilDaEmpresa,
  type TipoDeDocumento,
} from "@/lib/dominio/tipos";
import {
  analisarNumero,
  apenasDigitos,
  cnpjValido,
  dataIsoValida,
  MODALIDADES,
  normalizarCnae,
  porteValido,
  separarTermos,
  ufValida,
} from "./validacao";

/**
 * `FormData` crua vira `PerfilDaEmpresa` — ou vira lista de erros.
 *
 * Três regras governam este arquivo.
 *
 * **1. Perfil parcial é resultado legítimo.** Só CNPJ, razão social e porte são
 * obrigatórios, porque sem eles não existe cadastro. Todo o resto pode ficar
 * vazio, e o produto passa a dizer o que aquilo desliga (ver `diagnostico.ts`)
 * em vez de barrar o usuário na porta. Onboarding que exige tudo de uma vez é
 * onboarding abandonado no terceiro campo.
 *
 * **2. Vazio vira `null`, nunca zero.** `faturamentoAnual: 0` afirmaria que a
 * empresa não fatura, e o motor de score trataria isso como fato declarado. A
 * mesma regra de `procedencia.ts`, aplicada na entrada de dados.
 *
 * **3. Declarar não é anexar.** `arquivoAnexado` NUNCA é ligado por marcação em
 * formulário. Ele só permanece `true` para documento que já chegou assim do
 * repositório. Enquanto não existe upload, todo documento novo entra sem
 * arquivo — e o checklist o mostra como "verificar", que é a verdade.
 */

export type ErrosDoFormulario = Record<string, string>;

export type LeituraDoPerfil =
  | { ok: true; perfil: PerfilDaEmpresa }
  | { ok: false; erros: ErrosDoFormulario };

const MODALIDADES_VALIDAS = new Set<string>(MODALIDADES.map((m) => m.valor));

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function marcado(dados: FormData, campo: string): boolean {
  return dados.get(campo) !== null;
}

function lista(dados: FormData, campo: string): string[] {
  return dados
    .getAll(campo)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

/**
 * Número opcional, com as três respostas possíveis distintas: ausente,
 * inválido e presente. Colapsar "inválido" em "ausente" faria um erro de
 * digitação virar silêncio.
 */
function numeroOpcional(
  bruto: string,
  campo: string,
  erros: ErrosDoFormulario,
  { minimo = 0, rotulo }: { minimo?: number; rotulo: string },
): number | null {
  if (bruto === "") return null;
  const numero = analisarNumero(bruto);
  if (numero === null || Number.isNaN(numero)) {
    erros[campo] = `${rotulo} precisa ser um número. Use apenas dígitos, ponto e vírgula.`;
    return null;
  }
  if (numero < minimo) {
    erros[campo] = `${rotulo} não pode ser menor que ${minimo}.`;
    return null;
  }
  return numero;
}

function lerDocumentos(
  dados: FormData,
  base: PerfilDaEmpresa | null,
  erros: ErrosDoFormulario,
): DocumentoDaEmpresa[] {
  const anteriores = new Map<TipoDeDocumento, DocumentoDaEmpresa>(
    (base?.documentos ?? []).map((d) => [d.tipo, d]),
  );
  const declarados = new Set(lista(dados, "documento"));
  const saida: DocumentoDaEmpresa[] = [];

  for (const tipo of TIPOS_DE_DOCUMENTO) {
    if (!declarados.has(tipo)) continue;

    const semValidade = marcado(dados, `semValidade:${tipo}`);
    const validadeBruta = texto(dados, `validade:${tipo}`);
    const descricao = texto(dados, `descricao:${tipo}`);

    if (semValidade && validadeBruta !== "") {
      erros[`validade:${tipo}`] =
        "Escolha um dos dois: ou o documento tem prazo e você informa a data, ou ele não tem prazo.";
      continue;
    }

    if (!semValidade) {
      if (validadeBruta === "") {
        // Exigir a validade é a regra do checklist virando regra de entrada:
        // um documento sem prazo declarado não pode ser contado como pronto, e
        // deixar o campo passar em branco produziria exatamente essa ilusão.
        erros[`validade:${tipo}`] =
          "Informe até quando vale, ou marque que este documento não tem prazo de validade.";
        continue;
      }
      if (!dataIsoValida(validadeBruta)) {
        erros[`validade:${tipo}`] = "Data inválida. Use o formato dia/mês/ano.";
        continue;
      }
    }

    saida.push({
      tipo,
      descricao: descricao === "" ? null : descricao,
      validoAte: semValidade ? null : validadeBruta,
      semValidade,
      // Ver a regra 3 no topo do arquivo.
      arquivoAnexado: anteriores.get(tipo)?.arquivoAnexado ?? false,
    });
  }

  return saida;
}

function lerAtestados(
  dados: FormData,
  erros: ErrosDoFormulario,
  anoLimite: number,
): PerfilDaEmpresa["atestados"] {
  const objetos = dados.getAll("atestadoObjeto");
  const valores = dados.getAll("atestadoValor");
  const orgaos = dados.getAll("atestadoOrgao");
  const anos = dados.getAll("atestadoAno");

  const saida: PerfilDaEmpresa["atestados"] = [];

  for (let i = 0; i < objetos.length; i++) {
    const objeto = typeof objetos[i] === "string" ? (objetos[i] as string).trim() : "";
    const valorBruto = typeof valores[i] === "string" ? (valores[i] as string).trim() : "";
    const orgao = typeof orgaos[i] === "string" ? (orgaos[i] as string).trim() : "";
    const anoBruto = typeof anos[i] === "string" ? (anos[i] as string).trim() : "";

    // Linha em branco é linha que o usuário adicionou e não preencheu. Some sem
    // reclamar; reclamar de campo que ele não quis usar é atrito puro.
    if (objeto === "" && valorBruto === "" && orgao === "" && anoBruto === "") continue;

    if (objeto === "") {
      erros[`atestadoObjeto:${i}`] = "Descreva o objeto do atestado ou apague a linha.";
      continue;
    }

    const valor = numeroOpcional(valorBruto, `atestadoValor:${i}`, erros, {
      rotulo: "O valor do atestado",
    });

    let ano: number | null = null;
    if (anoBruto !== "") {
      const numero = Number(anoBruto);
      if (!Number.isInteger(numero) || numero < 1900 || numero > anoLimite) {
        erros[`atestadoAno:${i}`] = `Informe um ano entre 1900 e ${anoLimite}.`;
      } else {
        ano = numero;
      }
    }

    saida.push({ objeto, valor, orgao: orgao === "" ? null : orgao, ano });
  }

  return saida;
}

export function lerPerfilDoFormulario(
  dados: FormData,
  base: PerfilDaEmpresa | null,
  /**
   * Vem SEMPRE do servidor, nunca do formulário. Um `empresaId` aceito do
   * cliente transformaria a action em "escreva no cadastro de quem você quiser".
   */
  empresaId: string,
  agora: Date = new Date(),
): LeituraDoPerfil {
  const erros: ErrosDoFormulario = {};

  // ---- Empresa -----------------------------------------------------------
  const cnpjBruto = texto(dados, "cnpj");
  const cnpj = apenasDigitos(cnpjBruto);
  if (cnpj === "") {
    erros.cnpj = "O CNPJ identifica a empresa no cadastro e nos portais. É obrigatório.";
  } else if (!cnpjValido(cnpj)) {
    erros.cnpj = "Este CNPJ não passa na verificação dos dígitos. Confira número por número.";
  }

  const razaoSocial = texto(dados, "razaoSocial");
  if (razaoSocial === "") {
    erros.razaoSocial = "Informe a razão social exatamente como está no contrato social.";
  }

  const nomeFantasia = texto(dados, "nomeFantasia");

  const porteBruto = texto(dados, "porte");
  if (porteBruto === "") {
    erros.porte = "Selecione o porte — ele muda o direito de preferência de ME e EPP.";
  } else if (!porteValido(porteBruto)) {
    erros.porte = "Porte não reconhecido.";
  }

  const faturamentoAnual = numeroOpcional(texto(dados, "faturamentoAnual"), "faturamentoAnual", erros, {
    rotulo: "O faturamento anual",
  });

  // ---- Atuação -----------------------------------------------------------
  const cnaes: string[] = [];
  for (const bruto of separarTermos(texto(dados, "cnaes"))) {
    const normalizado = normalizarCnae(bruto);
    if (normalizado === null) {
      erros.cnaes = `"${bruto}" não é um CNAE de sete dígitos. Exemplo: 8121-4/00.`;
      break;
    }
    if (!cnaes.includes(normalizado)) cnaes.push(normalizado);
  }

  const palavrasChave = separarTermos(texto(dados, "palavrasChave"));
  const palavrasExcluidas = separarTermos(texto(dados, "palavrasExcluidas"));

  const conflito = palavrasChave.find((t) =>
    palavrasExcluidas.some((e) => e.toLocaleLowerCase("pt-BR") === t.toLocaleLowerCase("pt-BR")),
  );
  if (conflito) {
    erros.palavrasExcluidas = `"${conflito}" está nas duas listas. Um termo que exclui e inclui ao mesmo tempo sempre exclui.`;
  }

  // ---- Capacidade --------------------------------------------------------
  const ufsAtendidas: string[] = [];
  for (const uf of lista(dados, "uf")) {
    const sigla = uf.toUpperCase();
    if (!ufValida(sigla)) {
      erros.uf = `"${uf}" não é uma UF válida.`;
      break;
    }
    if (!ufsAtendidas.includes(sigla)) ufsAtendidas.push(sigla);
  }

  const municipiosPrioritarios: string[] = [];
  for (const bruto of separarTermos(texto(dados, "municipiosPrioritarios"))) {
    const codigo = apenasDigitos(bruto);
    if (codigo.length !== 7) {
      erros.municipiosPrioritarios = `"${bruto}" não é um código IBGE de município (sete dígitos).`;
      break;
    }
    if (!municipiosPrioritarios.includes(codigo)) municipiosPrioritarios.push(codigo);
  }

  const ticketMinimo = numeroOpcional(texto(dados, "ticketMinimo"), "ticketMinimo", erros, {
    rotulo: "O ticket mínimo",
  });
  const ticketMaximo = numeroOpcional(texto(dados, "ticketMaximo"), "ticketMaximo", erros, {
    rotulo: "O ticket máximo",
  });
  if (
    ticketMinimo !== null &&
    ticketMaximo !== null &&
    !erros.ticketMinimo &&
    !erros.ticketMaximo &&
    ticketMinimo > ticketMaximo
  ) {
    erros.ticketMaximo = "O ticket máximo precisa ser maior ou igual ao mínimo.";
  }

  const modalidadesAceitas: string[] = [];
  for (const modalidade of lista(dados, "modalidade")) {
    if (!MODALIDADES_VALIDAS.has(modalidade)) {
      erros.modalidade = `"${modalidade}" não é uma modalidade reconhecida.`;
      break;
    }
    if (!modalidadesAceitas.includes(modalidade)) modalidadesAceitas.push(modalidade);
  }

  // ---- Documentação e experiência ---------------------------------------
  const documentos = lerDocumentos(dados, base, erros);
  const atestados = lerAtestados(dados, erros, agora.getFullYear() + 1);

  if (Object.keys(erros).length > 0) return { ok: false, erros };

  return {
    ok: true,
    perfil: {
      empresaId,
      cnpj,
      razaoSocial,
      nomeFantasia: nomeFantasia === "" ? null : nomeFantasia,
      // `porteValido` já rodou; o cast existe porque o TypeScript não carrega a
      // garantia através do objeto de erros.
      porte: porteBruto as PerfilDaEmpresa["porte"],
      faturamentoAnual,
      cnaes,
      palavrasChave,
      palavrasExcluidas,
      ufsAtendidas,
      municipiosPrioritarios,
      ticketMinimo,
      ticketMaximo,
      documentos,
      atestados,
      modalidadesAceitas,
      atualizadoEm: agora.toISOString(),
    },
  };
}
