/**
 * Corta preservando palavra, com reticência.
 *
 * Cortar no meio da palavra faz um objeto de licitação virar outra coisa
 * ("aquisição de material hospit…"), e o leitor perde justamente o substantivo
 * que diria se aquilo é do ramo dele.
 *
 * ## Por que mora aqui, e não dentro de uma das mensagens
 *
 * Nasceu no alerta gratuito, privada. Em 22/08 o resumo do cliente precisou da
 * mesma coisa — e o defeito que motivou a mudança só apareceu rodando: numa
 * simulação contra dados reais, os objetos do PNCP saíram inteiros, com
 * centenas de caracteres cada, e a lista virou um paredão ilegível.
 *
 * Copiar a função para o outro arquivo teria funcionado e criado duas verdades
 * sobre "como se encurta um objeto aqui". Um lugar só é o que impede as duas
 * telas de divergirem sem ninguém decidir que deviam divergir.
 */
export function cortar(texto: string, maximo: number): string {
  const limpo = texto.trim().replace(/\s+/g, " ");
  if (limpo.length <= maximo) return limpo;

  const pedaco = limpo.slice(0, maximo);
  const ultimoEspaco = pedaco.lastIndexOf(" ");
  // Sem espaço nenhum na janela é palavra única gigante (URL colada no objeto,
  // por exemplo): aí corta seco mesmo, porque não há palavra a preservar.
  return `${(ultimoEspaco > maximo * 0.6 ? pedaco.slice(0, ultimoEspaco) : pedaco).trimEnd()}…`;
}

/**
 * Quanto do objeto cabe num rótulo de lista de e-mail.
 *
 * 120 é o que o alerta gratuito já usava, e não há razão para o resumo do
 * cliente usar outro: é a mesma restrição — uma linha que se lê de relance no
 * celular, sem empurrar o resto da linha para fora da tela.
 */
export const OBJETO_NO_ROTULO = 120;
