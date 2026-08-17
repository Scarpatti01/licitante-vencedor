import { normalizar } from "../dominio/texto.ts";
import { desconhecido, doEdital, type Campo, type Confianca } from "../dominio/procedencia.ts";
import type { CampoExtraido } from "./schemas.ts";

/**
 * A trava contra invenção.
 *
 * O schema em `schemas.ts` PEDE evidência. Este arquivo CONFERE se a evidência
 * existe no texto que foi efetivamente enviado ao modelo. São coisas diferentes,
 * e a diferença é o produto: um modelo pode devolver um trecho plausível,
 * bem-formado, com aspas e numeração de item — e simplesmente inexistente no
 * edital. Já vi acontecer com qualquer modelo, em qualquer preço.
 *
 * Por isso a regra aqui é dura e sem exceção: **valor cujo trecho não é
 * localizável no texto analisado não vira dado do edital.** Vira
 * `desconhecido`, com motivo. Não importa se o modelo marcou confiança alta —
 * confiança do modelo não é evidência, é a mesma coisa que o palpite de cara
 * confiante que `procedencia.ts` existe para banir.
 */

/**
 * Palavras de uma janela de conferência.
 *
 * A comparação não é literal por um motivo prático: modelos reescrevem espaço,
 * hífen de quebra de linha e reticências ao citar, e uma checagem exata
 * recusaria citação honesta — o que empurraria campos verdadeiros para
 * `desconhecido` e tornaria o produto inútil por excesso de zelo.
 *
 * Oito palavras consecutivas é o meio-termo: é tolerante com a citação
 * reformatada e é muito difícil de acertar por acaso. Uma sequência de oito
 * palavras específicas de um edital não aparece por sorte num texto inventado.
 */
export const PALAVRAS_DA_JANELA = 8;

/** Abaixo disto não há o que conferir: "sim", "5%" ou "item 7" casam com tudo. */
export const MINIMO_DE_PALAVRAS = 3;

export type Localizacao = "exato" | "aproximado" | "ausente";

export type Verificador = {
  /** Onde a evidência foi procurada, para a mensagem de erro poder dizer. */
  readonly caracteresDaFonte: number;
  localizar(evidencia: string | null): Localizacao;
};

/**
 * Prepara a conferência normalizando a fonte UMA vez.
 *
 * Uma análise confere algumas dezenas de campos contra um texto de dezenas de
 * milhares de caracteres. Normalizar a fonte a cada campo seria refazer o mesmo
 * trabalho pesado por campo, sem necessidade.
 */
export function criarVerificador(fonte: string): Verificador {
  const alvo = ` ${normalizar(fonte)} `;

  return {
    caracteresDaFonte: fonte.length,
    localizar(evidencia: string | null): Localizacao {
      if (!evidencia) return "ausente";
      const limpa = normalizar(evidencia);
      if (limpa.length === 0) return "ausente";

      const palavras = limpa.split(" ").filter(Boolean);
      if (palavras.length < MINIMO_DE_PALAVRAS) return "ausente";

      if (alvo.includes(` ${limpa} `)) return "exato";

      const janela = Math.min(PALAVRAS_DA_JANELA, palavras.length);
      for (let i = 0; i + janela <= palavras.length; i++) {
        const trecho = palavras.slice(i, i + janela).join(" ");
        if (alvo.includes(` ${trecho} `)) return "aproximado";
      }

      return "ausente";
    },
  };
}

/**
 * O que aconteceu com um campo — e a distinção que muda dinheiro.
 *
 *   `sustentado` — veio com trecho e o trecho existe. Vira dado do edital.
 *   `sem_base`   — o modelo disse que não encontrou. É uma resposta HONESTA, e
 *                  não conta contra ele.
 *   `descartado` — o modelo afirmou algo e não sustentou. É invenção, e é isto
 *                  que a política de escalonamento mede.
 *
 * Misturar os dois últimos seria punir o modelo por admitir ignorância, e a
 * consequência prática seria escalar para o modelo caro justamente nos editais
 * que não têm o que extrair.
 */
export type ResultadoDoCampo = "sustentado" | "sem_base" | "descartado";

export type Conversao<T> = {
  campo: Campo<T>;
  resultado: ResultadoDoCampo;
};

/**
 * Citação aproximada nunca vira confiança alta.
 *
 * Se o modelo reformatou o trecho a ponto de não bater literalmente, alguma
 * coisa ele reescreveu — e reescrita é o começo da invenção. O dado continua
 * válido, mas entra na interface com o aviso que merece.
 */
function confiancaDe(localizacao: Localizacao, declarada: Confianca | null): Confianca {
  const base: Confianca = declarada ?? "media";
  if (localizacao === "aproximado" && base === "alta") return "media";
  return base;
}

/**
 * Converte o campo cru do modelo em `Campo<T>` do domínio.
 *
 * Quatro portas, e todas levam a `desconhecido` menos a última:
 *
 *   1. o modelo disse que não encontrou;
 *   2. disse que encontrou, mas não mandou valor;
 *   3. mandou valor, mas não mandou trecho que o sustente;
 *   4. mandou trecho, e o trecho não existe no texto analisado.
 *
 * `oQue` entra na mensagem porque o motivo é lido pelo cliente, e "Não foi
 * possível determinar" sem dizer o quê não ajuda ninguém a decidir.
 */
export function paraCampo<T>(
  extraido: CampoExtraido<T>,
  verificador: Verificador,
  oQue: string,
): Conversao<T> {
  if (!extraido.encontrado || extraido.valor === null || extraido.valor === undefined) {
    return {
      campo: desconhecido(
        extraido.motivo?.trim() || `Não localizamos ${oQue} no trecho do edital analisado.`,
      ),
      resultado: "sem_base",
    };
  }

  const evidencia = extraido.evidencia;
  const localizacao = verificador.localizar(evidencia);

  if (localizacao === "ausente") {
    return {
      campo: desconhecido(
        evidencia?.trim()
          ? `A leitura automática indicou ${oQue}, mas o trecho citado não foi encontrado no texto analisado. Não afirmamos sem base no edital.`
          : `A leitura automática indicou ${oQue} sem apontar o trecho do edital que sustenta a informação. Sem evidência, não afirmamos.`,
      ),
      resultado: "descartado",
    };
  }

  return {
    campo: doEdital(extraido.valor, evidencia!.trim(), confiancaDe(localizacao, extraido.confianca)),
    resultado: "sustentado",
  };
}
