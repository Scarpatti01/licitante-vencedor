/**
 * Como a empresa é chamada nas telas.
 *
 * ## O DEFEITO QUE MOTIVOU ESTE ARQUIVO
 *
 * A mesma tela chamava a empresa por dois nomes. O painel dizia "Empresa:
 * Imunidex", e logo abaixo o aviso de perfil incompleto dizia "O perfil de
 * Insect Never Conservadora e Dedetizadora LTDA. está incompleto". Os dois
 * corretos, os dois sobre a mesma empresa, e nenhum leitor obrigado a saber
 * disso.
 *
 * O aviso é a mensagem mais importante da tela, porque é o que explica por que
 * falta score. Ele começar com um nome que o cliente não usa para se referir a
 * si mesmo faz a pessoa hesitar antes de entender que a frase é sobre ela.
 *
 * ## POR QUE UMA FUNÇÃO, E NÃO `?? ` REPETIDO
 *
 * `nomeFantasia ?? razaoSocial` estava escrito em três lugares e faltava num
 * quarto. Foi assim que a divergência apareceu: não por alguém discordar da
 * regra, mas por ela não existir em lugar nenhum que se pudesse chamar.
 *
 * ## ONDE A RAZÃO SOCIAL AINDA APARECE, E POR QUÊ
 *
 * Em Configurações, sob o rótulo "Razão social", que é a tela onde o nome
 * jurídico É a informação. E no `title` do rodapé lateral, como dica ao passar
 * o mouse. Os dois casos estão declarados em `nome-da-empresa.guarda.test.ts`.
 */
export function nomeDaEmpresa(perfil: {
  razaoSocial: string;
  nomeFantasia?: string | null;
}): string {
  const fantasia = perfil.nomeFantasia?.trim();
  return fantasia || perfil.razaoSocial;
}
