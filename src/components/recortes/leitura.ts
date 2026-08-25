import {
  conferirConjunto,
  conferirRecorte,
  LIMITE_DE_RECORTES,
  type Abrangencia,
  type Recorte,
} from "@/lib/dominio/recorte";

/**
 * O formulário de recortes virando `Recorte[]`, ou a lista de erros.
 *
 * ## Por que a leitura mora aqui e não na action
 *
 * Mesma razão de `components/perfil/leitura.ts`: arquivo com `"use server"` é
 * um endpoint POST, e o que mora nele fica fora do alcance do `vitest`. A
 * validação é justamente a parte que não pode estar errada, então ela é o
 * pedaço que fica testável.
 *
 * ## O formulário é indexado, e isso é o que o torna traiçoeiro
 *
 * Os campos chegam como `recorte-0-nome`, `recorte-1-abrangencia`, e assim por
 * diante. Índice que vem do navegador não é confiável: pode vir com buraco (o
 * cliente apagou o do meio), pode vir fora de ordem, e pode vir com trinta
 * entradas se alguém montar o POST à mão. Nada aqui presume que os índices
 * sejam 0..n-1 contíguos, e o limite é conferido sobre o que sobrou depois de
 * ler, nunca sobre o que o formulário afirmou ter.
 */

export type ErrosDosRecortes = Record<string, string>;

export type LeituraDosRecortes =
  | { ok: true; recortes: Recorte[] }
  | { ok: false; erros: ErrosDosRecortes };

/** Quantos campos de recorte o formulário pode declarar, no máximo. */
const TETO_DE_INDICES = 20;

function texto(dados: FormData, chave: string): string {
  const valor = dados.get(chave);
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Uma lista separada por vírgula virando array, sem entrada vazia.
 *
 * Vírgula e não espaço porque palavra-chave de edital é expressão de várias
 * palavras: "material de limpeza" é um termo, não três.
 */
export function listaDeTermos(bruto: string): string[] {
  return bruto
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Um valor em reais digitado por gente, virando número.
 *
 * Aceita "500.000", "500000", "R$ 500.000,00" e vazio. Devolve `null` para
 * vazio e para o que não vira número — e `null` aqui significa "sem limite",
 * que é diferente de zero. Zero seria um teto de zero reais, e nenhum edital
 * passaria.
 */
export function valorEmReais(bruto: string): number | null {
  const limpo = bruto.replace(/[^\d,.-]/gu, "");
  if (limpo.length === 0) return null;

  // Formato brasileiro: ponto separa milhar, vírgula separa decimal.
  const normalizado = limpo.replace(/\./gu, "").replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function abrangenciaDoFormulario(
  dados: FormData,
  prefixo: string,
): { ok: true; abrangencia: Abrangencia } | { ok: false; erro: string } {
  const tipo = texto(dados, `${prefixo}-abrangencia`);
  const uf = texto(dados, `${prefixo}-uf`).toUpperCase();
  const ibge = texto(dados, `${prefixo}-municipio-ibge`);
  const nomeDoMunicipio = texto(dados, `${prefixo}-municipio-nome`);

  if (tipo === "brasil") return { ok: true, abrangencia: { tipo: "brasil" } };

  if (tipo === "uf") {
    if (uf.length === 0) return { ok: false, erro: "escolha o estado." };
    return { ok: true, abrangencia: { tipo: "uf", uf } };
  }

  if (tipo === "municipio") {
    if (uf.length === 0) return { ok: false, erro: "escolha o estado." };
    if (ibge.length === 0) return { ok: false, erro: "escolha o município." };
    return {
      ok: true,
      abrangencia: {
        tipo: "municipio",
        uf,
        codigoIbge: ibge,
        // Sem nome, o código IBGE serve: a página fica feia, não fica errada.
        nome: nomeDoMunicipio.length > 0 ? nomeDoMunicipio : ibge,
      },
    };
  }

  return { ok: false, erro: "escolha se o recorte é de município, estado ou Brasil." };
}

export function lerRecortesDoFormulario(dados: FormData): LeituraDosRecortes {
  const erros: ErrosDosRecortes = {};
  const recortes: Recorte[] = [];

  for (let i = 0; i < TETO_DE_INDICES; i++) {
    const prefixo = `recorte-${i}`;

    // Um índice sem abrangência é um índice que não existe. Não é erro: é o
    // buraco que sobra quando o cliente apaga o recorte do meio da lista.
    if (texto(dados, `${prefixo}-abrangencia`).length === 0) continue;

    const abrangencia = abrangenciaDoFormulario(dados, prefixo);
    if (!abrangencia.ok) {
      erros[`${prefixo}-abrangencia`] = abrangencia.erro;
      continue;
    }

    const recorte: Recorte = {
      // O id só existe depois de gravar: `salvarRecortes` substitui o conjunto
      // inteiro e o banco gera os novos. O índice serve para casar erro com
      // campo na tela, e some antes de chegar ao banco.
      id: prefixo,
      nome: texto(dados, `${prefixo}-nome`),
      abrangencia: abrangencia.abrangencia,
      palavrasChave: listaDeTermos(texto(dados, `${prefixo}-palavras`)),
      palavrasExcluidas: listaDeTermos(texto(dados, `${prefixo}-excluidas`)),
      ticketMinimo: valorEmReais(texto(dados, `${prefixo}-ticket-minimo`)),
      ticketMaximo: valorEmReais(texto(dados, `${prefixo}-ticket-maximo`)),
    };

    for (const falha of conferirRecorte(recorte)) {
      erros[`${prefixo}-${falha.campo}`] = falha.explicacao;
    }

    recortes.push(recorte);
  }

  /*
   * O limite é conferido sobre o que foi LIDO, e não sobre o que o formulário
   * disse ter. Um POST montado à mão com quatro recortes chega aqui como quatro
   * recortes, e é aqui que ele para — antes da action, antes da função do
   * banco, e antes de a trava por linha entrar em cena.
   */
  for (const falha of conferirConjunto(recortes)) {
    erros[falha.campo === "quantidade" ? "quantidade" : "abrangencia"] = falha.explicacao;
  }

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, recortes };
}

export { LIMITE_DE_RECORTES };
