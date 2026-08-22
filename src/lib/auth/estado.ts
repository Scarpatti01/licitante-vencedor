/**
 * O estado do formulário de acesso, e os números que as telas repetem.
 *
 * Fica separado de `acoes.ts` por uma regra do próprio Next, não por gosto: um
 * módulo `"use server"` só pode exportar função assíncrona. Todo export dele
 * vira um endpoint alcançável pela rede, e uma constante não tem como ser isso.
 *
 * Descoberto no build, não na leitura: o `tsc` aceita numa boa e é o
 * compilador do Next que recusa.
 */

export type EstadoDaEntrada = {
  erro: string | null;
  /** Preenchido quando a ação terminou pedindo confirmação por e-mail. */
  aviso: string | null;
};

export const ESTADO_INICIAL: EstadoDaEntrada = { erro: null, aviso: null };

/**
 * Tamanho mínimo da senha.
 *
 * Oito é o piso do próprio Supabase. Não há regra de "uma maiúscula, um
 * símbolo": as diretrizes atuais do NIST desaconselham composição obrigatória,
 * porque ela produz `Senha@123` — previsível para quem ataca e chata para quem
 * usa. Comprimento é o que de fato pesa.
 */
export const MINIMO_DA_SENHA = 8;

/**
 * O que dizer quando o Supabase recusa a senha por ser fraca.
 *
 * Função pura, e separada da ação, pelo motivo de sempre nesta base: é uma
 * decisão de produto — o que a pessoa lê no pior momento do cadastro — e
 * decisão de produto se exercita com teste, não com opinião. Testá-la dentro de
 * `acoes.ts` exigiria simular `next/headers`, o cliente do Supabase e o limite
 * de taxa, e o que se quer conferir não tem nada a ver com nenhum dos três.
 *
 * `reasons` é do próprio Supabase (`AuthWeakPasswordError`), com três valores
 * possíveis: `length`, `characters` e `pwned`.
 *
 * `pwned` vem antes na ordem porque é o único que a pessoa não consegue
 * adivinhar sozinha. Comprimento ela vê contando; "essa senha está num vazamento
 * público" é informação que só nós temos, e é a que muda o comportamento dela
 * fora daqui também.
 */
export function mensagemDeSenhaRecusada(motivos: readonly string[]): string {
  if (motivos.includes("pwned")) {
    return (
      "Essa senha já apareceu em vazamentos públicos, então não dá para usá-la " +
      "aqui. Escolha outra — de preferência uma que você não use em nenhum " +
      "outro site."
    );
  }

  if (motivos.includes("length")) {
    return `A senha precisa de pelo menos ${MINIMO_DA_SENHA} caracteres.`;
  }

  // `characters` e qualquer motivo que o Supabase venha a acrescentar. Note que
  // NÃO ligamos exigência de composição no painel — ver o comentário de
  // `MINIMO_DA_SENHA` e a recomendação do NIST —, então este ramo é a rede de
  // segurança para um motivo que ainda não existe, e não o caso esperado.
  return "Essa senha é fácil de adivinhar. Escolha uma mais longa.";
}

/** O estado do cadastro de empresa. Separado pelo mesmo motivo do de cima. */
export type EstadoDaEmpresa = { erro: string | null };

export const EMPRESA_INICIAL: EstadoDaEmpresa = { erro: null };
