import ibge from "../../../dados/municipios-ibge.json" with { type: "json" };
import type { Edital } from "../fontes/tipos.ts";

/**
 * Onde o serviço acontece, e não onde fica quem compra.
 *
 * ## O defeito
 *
 * O PNCP publica o município da UNIDADE COMPRADORA, e era esse o "local" de
 * todo edital: o que pontuava a região, o que o painel mostrava e o que o
 * resumo dizia. Para prefeitura dá no mesmo. Para órgão nacional que compra
 * pela sede, não: em 25/09/2026 o resumo de uma empresa do Rio levou, como
 * "Rio de Janeiro/RJ", a limpeza da NAV Brasil em Alta Floresta/MT, a mais de
 * 2.000 km. O erro vale para os dois lados: quem atende Mato Grosso nunca
 * veria esse edital, porque ele "era" do Rio.
 *
 * ## A regra, e por que ela é estreita
 *
 * Quando o próprio objeto escreve o lugar como "Cidade/UF", "Cidade - UF" ou
 * "Cidade (UF)", e essa cidade EXISTE naquela UF segundo o IBGE, é ela que
 * vale. Conferir contra a lista oficial é o que separa "Caetité/BA" de
 * "Portaria GM/MS", "REFERE-SE" e "FUNASA/AC", que um padrão sozinho confunde:
 * numa amostra de 30 dias, a maioria das ocorrências de "/UF" no objeto era
 * ruído desse tipo.
 *
 * E ela só troca quando não há dúvida:
 *
 *   - um único lugar encontrado. Dois lugares diferentes é edital com mais
 *     de um local, e escolher um seria inventar;
 *   - se o objeto também cita a cidade da unidade compradora, fica a da
 *     unidade: o serviço pode ser lá;
 *   - mesmo nome da cidade compradora em outra UF é erro de digitação, e não
 *     outro lugar. Visto em 30/09/2026: o Município de Planalto/RS publicou
 *     "Município de Planalto/PR".
 *   - "com destino a Cidade/UF" é para onde vai uma viagem, e não onde o
 *     serviço é prestado (passagens aéreas de uma câmara mineira, 30/09/2026);
 *   - adesão a ata ("carona") cita a cidade DONA da ata, e não a do serviço.
 *     Visto na coleta de 30/09/2026: Valparaíso de Goiás/GO aderindo a uma
 *     ata da "Prefeitura Municipal de Santana/AP, na condição de carona".
 *
 * Na dúvida, o local continua sendo o da unidade compradora, como antes.
 */

export type LocalDeExecucao = {
  uf: string;
  municipio: string;
  codigoIbge: string;
  /** `objeto`: lido do texto do objeto. `unidade`: o da unidade compradora. */
  origem: "objeto" | "unidade";
  /** O trecho do objeto de onde o lugar saiu, quando `origem` é `objeto`. */
  trecho?: string;
};

const UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

/** Minúsculas, sem acento, hífen e apóstrofo viram espaço: "D'Oeste" = "d oeste". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`´-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Municipio = { codigoIbge: string; nome: string; uf: string };

/** `uf|nome normalizado` → município. Montado uma vez, na primeira consulta. */
let indice: Map<string, Municipio> | null = null;
/** Quantas palavras tem o nome oficial mais longo: até onde vale tentar. */
let maiorNome = 0;

function oIndice(): Map<string, Municipio> {
  if (!indice) {
    indice = new Map();
    for (const [codigoIbge, nomeOficial, ufOficial] of ibge.municipios as [string, string, string][]) {
      const chave = normalizar(nomeOficial);
      maiorNome = Math.max(maiorNome, chave.split(" ").length);
      indice.set(`${ufOficial}|${chave}`, { codigoIbge, nome: nomeOficial, uf: ufOficial });
    }
  }
  return indice;
}

function municipioPorNome(nome: string, uf: string): Municipio | null {
  return oIndice().get(`${uf}|${normalizar(nome)}`) ?? null;
}

/**
 * O lugar, a UF depois de "/", "-", "–", "—" ou entre parênteses. A UF precisa
 * vir em maiúsculas e sozinha: "mg - PE" e "REFERE-SE" já caem aqui ou na
 * conferência com o IBGE.
 */
const PADRAO = /([\p{L}'’ -]{2,80}?)\s*(?:[/–—-]\s*|\(\s*)([A-Z]{2})(?![\p{L}])/gu;

/** Os lugares escritos no objeto que existem no IBGE, sem repetição. */
export function lugaresNoObjeto(objeto: string): { municipio: Municipio; trecho: string }[] {
  const achados = new Map<string, { municipio: Municipio; trecho: string }>();
  for (const m of objeto.matchAll(PADRAO)) {
    const uf = m[2];
    if (!UFS.has(uf)) continue;
    const palavras = m[1].trim().split(/\s+/);
    oIndice();
    // Do nome mais longo para o mais curto: "Alta Floresta" antes de "Floresta".
    for (let n = Math.min(palavras.length, maiorNome); n >= 1; n--) {
      const candidato = palavras.slice(-n).join(" ");
      const municipio = municipioPorNome(candidato, uf);
      if (municipio) {
        // "Passagens com destino a Brasília/DF": o destino de uma viagem não
        // é onde o serviço é prestado. Visto na coleta de 30/09/2026.
        const antes = palavras.slice(0, palavras.length - n).slice(-2).join(" ");
        if (!/\bdestino\b/i.test(antes)) {
          achados.set(municipio.codigoIbge, { municipio, trecho: `${candidato}/${uf}` });
        }
        break;
      }
    }
  }
  return [...achados.values()];
}

/** Onde o edital acontece, pela regra descrita no topo deste arquivo. */
export function localDeExecucao(edital: Pick<Edital, "objeto"> & {
  local: Pick<Edital["local"], "uf" | "municipio" | "codigoIbge">;
}): LocalDeExecucao {
  const daUnidade: LocalDeExecucao = {
    uf: edital.local.uf,
    municipio: edital.local.municipio,
    codigoIbge: edital.local.codigoIbge,
    origem: "unidade",
  };

  // Carona: o lugar escrito é o da ata, e não o do serviço.
  if (/\b(carona|adesao|aderir|adesao a ata)\b/.test(normalizar(edital.objeto ?? ""))) return daUnidade;

  const lugares = lugaresNoObjeto(edital.objeto ?? "");
  if (lugares.length !== 1) return daUnidade;

  const [{ municipio, trecho }] = lugares;
  const mesmoLugar =
    municipio.codigoIbge === edital.local.codigoIbge ||
    (municipio.uf === edital.local.uf && normalizar(municipio.nome) === normalizar(edital.local.municipio));
  if (mesmoLugar) return daUnidade;

  // Mesmo nome, outra UF: erro de digitação de quem publicou.
  if (normalizar(municipio.nome) === normalizar(edital.local.municipio)) return daUnidade;

  return { uf: municipio.uf, municipio: municipio.nome, codigoIbge: municipio.codigoIbge, origem: "objeto", trecho };
}

/**
 * "Alta Floresta/MT (órgão: Rio de Janeiro/RJ)", ou só "Recife/PE".
 *
 * Dois-pontos, e não "órgão em": "em Rio de Janeiro" erra o artigo, e cada
 * cidade pede o seu ("no Recife", "em São Paulo").
 */
export function localEmTexto(
  local: LocalDeExecucao,
  unidade: { municipio: string; uf: string },
): string {
  const lugar = `${local.municipio}/${local.uf}`;
  return local.origem === "objeto" ? `${lugar} (órgão: ${unidade.municipio}/${unidade.uf})` : lugar;
}
