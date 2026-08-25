import { DIAS_DE_TESTE } from "./assinatura/teste.ts";

/**
 * O rótulo do botão que convida para o teste.
 *
 * ## Por que este módulo é tão pequeno, e por que quase não é módulo
 *
 * Nasceu, em 25/08, com a ambição de centralizar a oferta inteira: um
 * `PROMESSA_DO_TESTE` que todas as capturas usariam, para trocar a oferta em um
 * lugar só. Escrevi assim e fui aplicar nas dezoito páginas — e a aplicação
 * mostrou que a ideia estava errada.
 *
 * Cada captura termina com uma frase que só existe naquela página: no guia de
 * habilitação, "ver o edital na publicação é o que dá tempo de pedir a certidão
 * municipal antes de ela ser cobrada"; no de portais, "você continua disputando
 * no portal que o edital indicar". É essa frase que faz a captura converter,
 * porque ela fala do problema que o leitor acabou de reconhecer como dele. Um
 * texto único apagaria as dezoito.
 *
 * Então o que se centraliza é o RÓTULO, que não tem contexto nenhum, e o que
 * guarda o resto é `alerta-virou-convite.test.ts`: em vez de forçar uma frase
 * só, ele confere que nenhuma delas volte a prometer o alerta gratuito. Guardar
 * a proibição funcionou onde impor a redação não funcionaria.
 *
 * Deixei o registro porque a versão ambiciosa deste arquivo pareceu, por meia
 * hora, obviamente melhor.
 */

/** Diz o que o clique faz, e não o que o produto é. */
export const BOTAO_DO_TESTE = `Receber o convite do teste`;

/**
 * A frase curta, para onde não cabe a promessa inteira.
 *
 * Repare no que ela NÃO diz: não diz que os editais começam a chegar. Deixar o
 * e-mail rende um convite; o produto começa quando a pessoa cadastra a empresa,
 * porque sem empresa não há com o que comparar edital nenhum. Prometer o
 * contrário criaria a pior espera possível — alguém aguardando um e-mail diário
 * que depende de um passo que ninguém pediu que ela desse.
 */
export const PROMESSA_CURTA = `${DIAS_DE_TESTE} dias de teste, sem cartão e sem cobrança no fim.`;
