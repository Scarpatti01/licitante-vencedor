"use client";

import { useCallback, useRef } from "react";

/**
 * Devolver ao formulário o que o usuário acabou de digitar.
 *
 * ## O que o React 19 faz, e por que aqui está errado
 *
 * `<form action={funcao}>` reseta o formulário a cada envio. Não é efeito
 * colateral nem opção: em `startHostTransition`, o React agenda
 * `requestFormReset(formFiber)` ANTES de chamar a ação, e o reset é aplicado no
 * commit da transição. Todo campo não controlado volta ao `defaultValue`
 * daquele instante — dê certo ou dê errado o envio.
 *
 * Para o formulário que o comportamento pressupõe — uma caixa de comentário,
 * enviada e esvaziada — está certo. Aqui é o oposto de duas maneiras:
 *
 * **O cadastro é um formulário só, em quatro etapas.** As seções que não são da
 * etapa atual continuam montadas (com `hidden`) justamente para que o envio
 * carregue o cadastro inteiro. Resetar entre as etapas esvazia as etapas já
 * preenchidas, e o envio seguinte sai sem CNPJ, sem razão social e sem porte —
 * que a validação recusa, corretamente, com "é obrigatório".
 *
 * **Erro de validação existe para ser corrigido, não redigitado.** Um CNPJ com
 * um dígito trocado apagava os trinta campos ao redor junto com ele.
 *
 * ## Por que restaurar sempre, e não só no erro
 *
 * No sucesso, o valor "certo" viria do perfil recém-gravado, que chega pelo
 * `refresh()` da action e atualiza o `defaultValue`. Isso depende de a
 * atualização do RSC comitar junto com o reset — uma ordem que o produto não
 * controla e que mudaria sem aviso numa atualização do framework. Restaurando
 * sempre, o que está na tela é sempre o que a pessoa digitou, e a correção do
 * defeito deixa de depender de uma corrida.
 *
 * O custo é conhecido e pequeno: um CNPJ digitado com máscara continua exibido
 * com máscara em vez de aparecer normalizado. O formulário aceita as duas
 * formas, e o banco guarda só dígitos de qualquer jeito.
 */

/** Controles que carregam valor. `<button>` fica de fora: `intencao` é do clique. */
type ControleDeFormulario =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function ehControle(elemento: Element): elemento is ControleDeFormulario {
  return (
    elemento instanceof HTMLInputElement ||
    elemento instanceof HTMLSelectElement ||
    elemento instanceof HTMLTextAreaElement
  );
}

/**
 * Reaplica ao DOM os valores de um `FormData`.
 *
 * Agrupa por `name` e distribui por posição, porque o cadastro tem campos
 * repetidos de propósito: `atestadoObjeto` aparece uma vez por linha da lista de
 * atestados, e casar o terceiro valor com o terceiro campo é o que impede as
 * linhas de trocarem de conteúdo entre si.
 */
export function reaplicar(formulario: HTMLFormElement, dados: FormData): void {
  const porNome = new Map<string, ControleDeFormulario[]>();

  for (const elemento of Array.from(formulario.elements)) {
    if (!ehControle(elemento) || elemento.name === "") continue;
    const lista = porNome.get(elemento.name);
    if (lista) lista.push(elemento);
    else porNome.set(elemento.name, [elemento]);
  }

  for (const [nome, controles] of porNome) {
    const valores = dados.getAll(nome).filter((v): v is string => typeof v === "string");

    // Caixa e rádio: a marcação é que o próprio valor do controle esteja na
    // lista. Desmarcado não aparece em `FormData` — então ausência aqui é
    // desmarcar, e não "deixar como está".
    const marcaveis = controles.filter(
      (c) => c instanceof HTMLInputElement && (c.type === "checkbox" || c.type === "radio"),
    ) as HTMLInputElement[];

    if (marcaveis.length === controles.length && marcaveis.length > 0) {
      for (const caixa of marcaveis) caixa.checked = valores.includes(caixa.value);
      continue;
    }

    controles.forEach((controle, i) => {
      controle.value = valores[i] ?? "";
    });
  }
}

export type PreenchimentoPreservado = {
  formularioRef: React.RefObject<HTMLFormElement | null>;
  /** Chame dentro da ação, com a `FormData` que ela recebeu. */
  lembrar: (dados: FormData) => void;
  /** Chame num efeito, depois do commit — é quando o reset do React já passou. */
  restaurar: () => void;
};

export function usePreenchimentoPreservado(): PreenchimentoPreservado {
  const formularioRef = useRef<HTMLFormElement>(null);
  const ultimoEnvio = useRef<FormData | null>(null);

  const lembrar = useCallback((dados: FormData) => {
    ultimoEnvio.current = dados;
  }, []);

  const restaurar = useCallback(() => {
    const formulario = formularioRef.current;
    const dados = ultimoEnvio.current;
    if (formulario && dados) reaplicar(formulario, dados);
  }, []);

  return { formularioRef, lembrar, restaurar };
}
