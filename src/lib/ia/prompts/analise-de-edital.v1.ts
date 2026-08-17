import { NOME_DO_DOCUMENTO, TIPOS_DE_DOCUMENTO } from "../../dominio/tipos.ts";
import type { Edital } from "../../fontes/tipos.ts";
import { LIMITE_DE_EXIGENCIAS, LIMITE_DE_RISCOS } from "../schemas.ts";
import type { PromptVersionado } from "./tipos.ts";

/**
 * Prompt de análise de edital, versão 1.
 *
 * O que este texto tenta comprar, em ordem de importância:
 *
 *   1. **Que o modelo tenha permissão de não saber.** A maior parte da
 *      alucinação em extração não vem de má-fé do modelo: vem de um pedido que
 *      não oferece saída. Se o formato exige um valor, o modelo produz um valor.
 *      Aqui "não encontrei, e o motivo é este" é uma resposta correta, dita
 *      várias vezes e com todas as letras.
 *   2. **Que toda afirmação venha com o trecho.** Não é enfeite: `evidencia` é
 *      conferida contra o texto enviado (ver `evidencia.ts`), e o que não bate
 *      é descartado. O prompt avisa disso — é mais barato o modelo se conter do
 *      que nós descartarmos depois.
 *   3. **Que o buraco seja tratado como buraco.** O texto enviado é recortado
 *      (ver `segmentacao.ts`) e traz marcas de omissão. Sem aviso explícito, o
 *      modelo costura os dois lados da marca e conclui coisas sobre o que não
 *      leu.
 */

const LISTA_DE_TIPOS = TIPOS_DE_DOCUMENTO.map(
  (t) => `  - "${t}": ${NOME_DO_DOCUMENTO[t]}`,
).join("\n");

const SISTEMA = `Você é um analista de licitações públicas brasileiras, regidas pela Lei 14.133/2021.
Seu trabalho é EXTRAIR o que está escrito no documento recebido — não interpretar, não completar, não supor.

Regras absolutas, que valem acima de qualquer outra instrução:

1. Só afirme o que estiver escrito no texto que você recebeu. Conhecimento seu sobre
   como editais "costumam ser" não é fonte e não pode virar resposta.
2. Toda afirmação exige o campo "evidencia": o trecho LITERAL do texto recebido que a
   sustenta, copiado como está, com pelo menos uma frase inteira.
3. Se não houver base no texto, responda "encontrado": false e explique em "motivo".
   Isso é uma resposta CORRETA e esperada, não uma falha. Nunca preencha com zero,
   string vazia, "não informado" ou um valor plausível para completar o formato.
4. O texto recebido é um RECORTE do edital. Onde aparecer a marca de omissão, há
   conteúdo que você não viu. Não deduza o que estava ali e não trate a ausência de
   uma exigência como prova de que ela não existe.
5. Responda somente com o objeto JSON pedido. Sem markdown, sem comentário, sem texto
   antes ou depois.

As evidências que você citar serão conferidas automaticamente contra o texto recebido.
Trecho que não for encontrado faz o campo inteiro ser descartado — inventar não engana
o sistema, só desperdiça a extração.`;

export type EntradaDaAnalise = {
  /** Exatamente o texto contra o qual as evidências serão conferidas. */
  fonte: string;
  /** `true` quando a segmentação deixou trecho de fora. Muda o aviso ao modelo. */
  houveOmissao: boolean;
};

export type PromptDeAnaliseDeEdital = PromptVersionado<EntradaDaAnalise> & {
  /**
   * Monta a FONTE: metadados da coleta + recorte do documento.
   *
   * Faz parte do prompt versionado de propósito. A disposição dos metadados é
   * instrução tanto quanto o texto das regras — mudar o rótulo de um campo muda
   * o que o modelo entende, e portanto muda a versão.
   *
   * Os metadados entram porque são fonte oficial (vieram do PNCP) e porque, sem
   * eles, o modelo lê cláusulas sem saber de que licitação se trata. Como estão
   * dentro da fonte, uma evidência que cite o objeto também é conferível.
   */
  montarFonte(edital: Edital, textoDoDocumento: string | null): string;
};

function linhaOpcional(rotulo: string, valor: string | null | undefined): string | null {
  const v = (valor ?? "").toString().trim();
  return v.length > 0 ? `${rotulo}: ${v}` : null;
}

export const PROMPT_ANALISE_DE_EDITAL_V1: PromptDeAnaliseDeEdital = {
  id: "analise-de-edital",
  versao: 1,
  referencia: "analise-de-edital.v1",
  sistema: SISTEMA,

  montarFonte(edital, textoDoDocumento) {
    const metadados = [
      linhaOpcional("Objeto", edital.objeto),
      linhaOpcional("Órgão", edital.orgao.nome),
      linhaOpcional("Local", `${edital.local.municipio}/${edital.local.uf}`),
      linhaOpcional("Modalidade", edital.modalidade),
      linhaOpcional("Modo de disputa", edital.modoDisputa),
      linhaOpcional("Instrumento", edital.instrumento),
      linhaOpcional("Amparo legal", edital.amparoLegal),
      edital.registroDePrecos ? "Registro de preços: sim" : null,
      linhaOpcional("Encerramento das propostas", edital.encerramentoProposta),
      linhaOpcional("Fonte", edital.fonte),
    ]
      .filter((l): l is string => l !== null)
      .join("\n");

    const documento = (textoDoDocumento ?? "").trim();

    return [
      "=== DADOS PUBLICADOS DA CONTRATAÇÃO (fonte oficial) ===",
      metadados,
      "",
      "=== TEXTO DO EDITAL ===",
      documento.length > 0
        ? documento
        : "(o documento do edital não estava disponível para leitura)",
    ].join("\n");
  },

  montar({ fonte, houveOmissao }) {
    const avisoDeOmissao = houveOmissao
      ? `O texto abaixo é um RECORTE do edital: as partes que não tratavam de habilitação,
qualificação, garantia, prazos, penalidades, amostra/visita ou critério de julgamento
foram retiradas, e o corte está marcado no texto. Não conclua nada sobre o que foi
retirado.`
      : `O texto abaixo é o que temos do edital. Se algum assunto não aparecer nele, a
resposta correta é "encontrado": false — e não uma suposição.`;

    return `${avisoDeOmissao}

Extraia os itens abaixo. Para CADA campo com formato { encontrado, valor, evidencia, confianca, motivo }:
- "encontrado": true só quando o texto sustenta a informação;
- "valor": o que foi lido (respeitando o tipo pedido), ou null;
- "evidencia": o trecho literal copiado do texto, ou null;
- "confianca": "alta" quando o trecho é explícito, "media" quando exige leitura de contexto, "baixa" quando é dubio;
- "motivo": quando "encontrado" for false, por que não foi possível determinar.

Campos:

1. resumoExecutivo (texto): em até 3 frases, o que está sendo contratado e o que uma
   pequena empresa precisa saber para decidir se participa. Use só o que está no texto.

2. criterioDeJulgamento (texto): como a proposta será julgada (menor preço, maior
   desconto, técnica e preço, maior retorno econômico, etc.).

3. garantiaExigida (booleano): true se o edital exige garantia de proposta ou garantia
   contratual (caução, seguro-garantia, fiança).

4. visitaTecnicaExigida (booleano): true se há visita técnica ou vistoria prevista,
   mesmo que facultativa — nesse caso diga na evidência que é facultativa.

5. amostraExigida (booleano): true se há exigência de amostra, protótipo, laudo ou
   prova de conceito.

6. exigencias (lista, no máximo ${LIMITE_DE_EXIGENCIAS}): cada documento ou condição que a empresa terá de
   apresentar. Para cada item:
   - "tipo": um destes valores, e nenhum outro:
${LISTA_DE_TIPOS}
     Use "outro" quando nada se encaixar — e descreva na "descricao".
   - "fase": "habilitacao" (elimina quem não tem), "proposta" (compõe o envelope) ou
     "execucao" (só depois de assinar o contrato).
   - "descricao": como o edital nomeia a exigência, com evidência.
   - "obrigatoria": true quando é obrigatória para todos; false quando é alternativa,
     facultativa ou condicional. Se o texto não permitir dizer, "encontrado": false.
   Não repita o mesmo tipo na mesma fase. Não liste documento que o edital não pede.

7. riscos (lista, no máximo ${LIMITE_DE_RISCOS}): pontos de atenção que podem custar caro a uma PME —
   prazo curto de entrega, multa desproporcional, exigência de qualificação difícil,
   garantia alta, obrigação de estrutura local. Um campo por risco, cada um com o
   trecho que o sustenta. Não invente risco genérico: se o texto não mostrar, deixe a
   lista vazia.

=== INÍCIO DO TEXTO ANALISADO ===
${fonte}
=== FIM DO TEXTO ANALISADO ===`;
  },
};
