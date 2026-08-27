"use client";

/**
 * Chama a impressão do navegador, onde "Salvar como PDF" já mora.
 *
 * Não é um download disfarçado: o rótulo diz imprimir ou salvar em PDF porque é
 * literalmente a caixa que vai abrir, e prometer um arquivo que nunca chega é a
 * forma mais fácil de fazer alguém achar que o produto quebrou.
 */
export function BotaoDeImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border px-4 py-2 text-sm font-medium"
    >
      Imprimir ou salvar em PDF
    </button>
  );
}
