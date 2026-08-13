import type { Porte } from "@/lib/dominio/tipos";

/**
 * Validação e normalização dos campos do perfil.
 *
 * Fica fora dos componentes de propósito: as MESMAS funções rodam no navegador
 * (para o usuário ver o erro antes de enviar) e no Server Action (que é o único
 * lugar onde a validação vale, porque a action é um endpoint POST alcançável
 * sem passar pela tela). Duas implementações da regra de CNPJ divergiriam na
 * primeira correção feita só de um lado.
 *
 * Nada aqui importa `server-only` nem toca em dados — é aritmética pura.
 */

export const UFS = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
] as const;

const SIGLAS = new Set<string>(UFS.map((uf) => uf.sigla));

export function ufValida(sigla: string): boolean {
  return SIGLAS.has(sigla.trim().toUpperCase());
}

export const PORTES: { valor: Porte; nome: string; detalhe: string }[] = [
  { valor: "mei", nome: "MEI", detalhe: "Microempreendedor individual" },
  { valor: "me", nome: "ME", detalhe: "Microempresa" },
  { valor: "epp", nome: "EPP", detalhe: "Empresa de pequeno porte" },
  { valor: "media", nome: "Média", detalhe: "Acima do limite de EPP" },
  { valor: "grande", nome: "Grande", detalhe: "Grande porte" },
];

const VALORES_DE_PORTE = new Set<string>(PORTES.map((p) => p.valor));

export function porteValido(valor: string): valor is Porte {
  return VALORES_DE_PORTE.has(valor);
}

export const NOME_DO_PORTE: Record<Porte, string> = {
  mei: "MEI",
  me: "Microempresa (ME)",
  epp: "Empresa de pequeno porte (EPP)",
  media: "Média empresa",
  grande: "Grande empresa",
};

/**
 * Modalidades da Lei 14.133 como TERMOS, não como rótulos bonitos.
 *
 * O motor de score compara este texto com a modalidade publicada pela fonte
 * (`"Pregão - Eletrônico"`, por exemplo) por busca de termo. Trocar "Pregão"
 * por "Pregão eletrônico (art. 29)" aqui faria a comparação deixar de casar —
 * o rótulo da tela pode ser bonito, o valor gravado não pode.
 */
export const MODALIDADES = [
  { valor: "Pregão", detalhe: "Bens e serviços comuns" },
  { valor: "Concorrência", detalhe: "Obras, serviços e compras em geral" },
  { valor: "Concurso", detalhe: "Trabalho técnico, científico ou artístico" },
  { valor: "Leilão", detalhe: "Alienação de bens" },
  { valor: "Diálogo Competitivo", detalhe: "Objeto de solução não disponível no mercado" },
  { valor: "Dispensa", detalhe: "Contratação direta por dispensa" },
  { valor: "Inexigibilidade", detalhe: "Contratação direta por inviabilidade de competição" },
] as const;

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D+/g, "");
}

/**
 * Verificação real dos dois dígitos do CNPJ (módulo 11).
 *
 * Contar catorze caracteres não é validar: `11111111111111` tem catorze e não
 * existe. Um CNPJ errado no cadastro contamina tudo que vem depois — casamento
 * com SICAF, emissão de certidão, cobrança — e o erro só aparece no dia da
 * sessão, que é o pior dia possível para descobrir.
 */
export function cnpjValido(entrada: string): boolean {
  const digitos = apenasDigitos(entrada);
  if (digitos.length !== 14) return false;
  // Sequências repetidas passam no módulo 11 e não são CNPJ de ninguém.
  if (/^(\d)\1{13}$/.test(digitos)) return false;

  const numeros = digitos.split("").map(Number);

  const digitoVerificador = (ate: number): number => {
    // Pesos descem de 2 a 9 da direita para a esquerda e recomeçam.
    let soma = 0;
    let peso = 2;
    for (let i = ate - 1; i >= 0; i--) {
      soma += numeros[i] * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return digitoVerificador(12) === numeros[12] && digitoVerificador(13) === numeros[13];
}

export function formatarCnpj(entrada: string): string {
  const d = apenasDigitos(entrada);
  if (d.length !== 14) return entrada;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** CNAE em qualquer formatação (`8121-4/00`, `8121400`) vira os sete dígitos. */
export function normalizarCnae(entrada: string): string | null {
  const d = apenasDigitos(entrada);
  return d.length === 7 ? d : null;
}

export function formatarCnae(digitos: string): string {
  if (digitos.length !== 7) return digitos;
  return `${digitos.slice(0, 4)}-${digitos.slice(4, 5)}/${digitos.slice(5)}`;
}

/**
 * Lê número em português (`"1.200.000,50"`) ou em formato de campo numérico
 * (`"1200000.5"`). Devolve `null` para vazio — que é diferente de zero, e a
 * diferença importa: `faturamentoAnual: 0` afirmaria que a empresa não fatura.
 */
export function analisarNumero(entrada: string | null | undefined): number | null {
  if (entrada === null || entrada === undefined) return null;
  const texto = entrada.trim();
  if (texto === "") return null;

  const temVirgula = texto.includes(",");
  const limpo = temVirgula
    ? texto.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")
    : texto.replace(/[^0-9.-]/g, "");

  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

/** Separa termos por vírgula ou quebra de linha, sem deixar vazio nem repetido. */
export function separarTermos(entrada: string | null | undefined): string[] {
  if (!entrada) return [];
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const bruto of entrada.split(/[,\n;]/)) {
    const termo = bruto.trim().replace(/\s+/g, " ");
    if (termo === "") continue;
    const chave = termo.toLocaleLowerCase("pt-BR");
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(termo);
  }
  return saida;
}

/** `AAAA-MM-DD` que existe de fato no calendário. */
export function dataIsoValida(entrada: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada)) return false;
  const [ano, mes, dia] = entrada.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

export function emReais(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
