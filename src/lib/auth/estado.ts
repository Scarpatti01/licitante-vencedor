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

/** O estado do cadastro de empresa. Separado pelo mesmo motivo do de cima. */
export type EstadoDaEmpresa = { erro: string | null };

export const EMPRESA_INICIAL: EstadoDaEmpresa = { erro: null };
