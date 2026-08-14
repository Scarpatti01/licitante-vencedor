import { z, type ZodType } from "zod";
import { TIPOS_DE_DOCUMENTO } from "../dominio/tipos";

/**
 * O contrato da resposta do modelo.
 *
 * A regra deste arquivo em uma frase: **resposta que não valida é falha, não
 * "quase certo"**. Não existe conserto parcial, não existe campo aproveitado de
 * um objeto torto. O motivo é o mesmo do resto do produto: um JSON meio certo
 * produz uma análise meio certa, e uma análise meio certa é indistinguível de
 * uma certa na tela do cliente — até ele conferir o edital e perder a confiança
 * em tudo o que mostramos.
 *
 * A forma dos campos é o outro ponto. O modelo NÃO devolve `string` solta: ele
 * devolve `{ encontrado, valor, evidencia, confianca, motivo }`. Assim, "não
 * achei" é uma resposta que ele consegue dar sem quebrar o formato — e a saída
 * mais fácil deixa de ser inventar. Um schema que só aceita `valor: string`
 * pressiona o modelo a preencher, o que é exatamente o comportamento que este
 * produto não pode ter.
 */

export const CONFIANCAS = ["alta", "media", "baixa"] as const;
export const FASES = ["habilitacao", "proposta", "execucao"] as const;

/**
 * O formato de um campo extraído, do lado do modelo.
 *
 * `evidencia` é o trecho LITERAL do texto analisado que sustenta o valor. É o
 * campo mais importante do schema: sem ele, o valor não vira `CampoDoEdital` —
 * vira `desconhecido`, por mais convicto que o modelo tenha soado.
 */
export type CampoExtraido<T> = {
  encontrado: boolean;
  valor: T | null;
  evidencia: string | null;
  confianca: (typeof CONFIANCAS)[number] | null;
  motivo: string | null;
};

function campoExtraido<T extends ZodType>(valor: T) {
  return z.object({
    encontrado: z.boolean(),
    valor: valor.nullable(),
    evidencia: z.string().nullable(),
    confianca: z.enum(CONFIANCAS).nullable(),
    motivo: z.string().nullable(),
  });
}

export const campoDeTexto = campoExtraido(z.string());
export const campoBooleano = campoExtraido(z.boolean());

/**
 * Tetos de tamanho: defesa contra resposta degenerada.
 *
 * Modelo em laço devolve 400 "exigências" iguais, e cada uma delas custa token
 * de saída e vira linha numa tela que ninguém consegue ler. Rejeitar é mais
 * barato que exibir.
 */
export const LIMITE_DE_EXIGENCIAS = 60;
export const LIMITE_DE_RISCOS = 20;

export const exigenciaExtraida = z.object({
  /**
   * Lista fechada, vinda de `dominio/tipos.ts`. É o que permite casar exigência
   * com documento cadastrado sem comparar texto livre — e impede o modelo de
   * inventar uma categoria de documento que o produto não sabe tratar.
   */
  tipo: z.enum(TIPOS_DE_DOCUMENTO),
  fase: z.enum(FASES),
  descricao: campoDeTexto,
  obrigatoria: campoBooleano,
});

export const respostaDeAnaliseDeEdital = z.object({
  resumoExecutivo: campoDeTexto,
  criterioDeJulgamento: campoDeTexto,
  garantiaExigida: campoBooleano,
  visitaTecnicaExigida: campoBooleano,
  amostraExigida: campoBooleano,
  exigencias: z.array(exigenciaExtraida).max(LIMITE_DE_EXIGENCIAS),
  riscos: z.array(campoDeTexto).max(LIMITE_DE_RISCOS),
});

export type RespostaDeAnaliseDeEdital = z.infer<typeof respostaDeAnaliseDeEdital>;
export type ExigenciaExtraida = z.infer<typeof exigenciaExtraida>;

/**
 * O mesmo schema, em JSON Schema, para o fornecedor que aceita saída estruturada.
 *
 * Fica aqui, e não no adaptador, porque JSON Schema é padrão aberto: qualquer
 * fornecedor que suporte saída estruturada consome isto. O adaptador só passa
 * adiante.
 *
 * `reused: "inline"` é decisão prática: `zod` normalmente fatora subschemas
 * repetidos em `$defs`/`$ref`, e o suporte a referência varia muito entre
 * fornecedores. Como `campoExtraido` se repete em quase todo campo, o schema
 * sairia cheio de `$ref` — e um `$ref` mal suportado degrada silenciosamente a
 * saída estruturada para texto livre. Inline é maior e funciona em todo lugar.
 */
export function jsonSchemaParaModelo(schema: ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "output",
    unrepresentable: "any",
    reused: "inline",
  }) as Record<string, unknown>;
}

/** Mensagem de validação legível, que vai para a instrução corretiva e para o log. */
export function descreverErroDeValidacao(erro: z.ZodError): string {
  return erro.issues
    .slice(0, 12)
    .map((i) => `- ${i.path.join(".") || "(raiz)"}: ${i.message}`)
    .join("\n");
}
