/**
 * Quem é dono da plataforma — que não é a mesma pergunta que "quem é dono de uma
 * empresa".
 *
 * O produto já tem papéis (`papel_na_empresa`: dono, administrador, operador,
 * leitor) e eles são **de dentro do tenant**: dizem o que alguém pode fazer com
 * o perfil, os documentos e os membros da empresa dele. Nenhum deles serve para
 * a tela de leads, porque lead não pertence a empresa nenhuma — é o funil do
 * site inteiro, e vê-lo é operação de quem opera o negócio, não de quem é
 * cliente dele. Reaproveitar `papel = 'dono'` para isso daria acesso ao funil
 * comercial inteiro a todo cliente que criasse a própria empresa, que é o
 * vazamento mais caro que este repositório poderia produzir: a lista de
 * interessados é o ativo de aquisição.
 *
 * ## Por que uma variável de ambiente, e não uma tabela
 *
 * Uma tabela `administradores_da_plataforma` é o desenho certo para uma equipe.
 * Hoje não há equipe: há uma pessoa. A variável entrega a mesma proteção sem
 * migração, sem tela de gestão de administradores e sem o risco novo que uma
 * tabela traz — a de alguém conseguir se inserir nela. O caminho de volta está
 * aberto: quando houver segundo operador, esta função vira uma consulta e a
 * única coisa que muda é o corpo dela; o formato do teste continua valendo.
 *
 * A troca é conhecida e aceita: mudar quem é administrador exige alterar a
 * variável e reimplantar, e não há trilha de auditoria de quem entrou na lista.
 * Para um operador só, os dois custos são teóricos.
 *
 * ## O arquivo é puro de propósito
 *
 * Sem `next/*`, sem `server-only` — pela mesma razão que `rotas.ts`: isto é
 * regra de autorização, e regra de autorização que não pode ser importada por um
 * `.test.ts` é regra que ninguém confere. Quem lê `process.env` é a tela.
 */

/**
 * O e-mail está na lista de administradores da plataforma?
 *
 * Recebe a lista crua (o valor da variável de ambiente) em vez de lê-la daqui,
 * para que o teste consiga exercitar as bordas sem mexer no ambiente do
 * processo.
 *
 * ## As decisões de comparação, uma a uma
 *
 * **Lista ausente ou vazia significa NINGUÉM, nunca TODOS.** É a decisão mais
 * importante do arquivo. O erro clássico em código de allowlist é tratar lista
 * vazia como "sem restrição" — e o dia em que a variável não chega ao ambiente
 * de produção (typo no nome, segredo não propagado para o preview) é
 * exatamente o dia em que a tela de leads abriria para qualquer pessoa logada.
 * Ausência de configuração desliga a capacidade; nunca a libera.
 *
 * **`toLowerCase` dos dois lados.** O Supabase guarda o endereço como a pessoa
 * digitou no cadastro, e ninguém digita o próprio e-mail sempre igual. Comparar
 * sensível a maiúsculas produziria o pior tipo de falha: o administrador
 * legítimo levando 404 na própria tela, sem nenhuma mensagem que explique.
 *
 * **`trim` de cada entrada.** `"a@x.com, b@x.com"` é como um humano escreve a
 * variável, com espaço depois da vírgula. Sem isto, ` b@x.com` nunca casaria.
 *
 * **Entradas vazias são descartadas.** Uma vírgula sobrando (`"a@x.com,"`)
 * produziria uma entrada `""` na lista; sem o descarte, um usuário sem e-mail
 * — o `email` do Supabase é opcional no tipo — casaria com ela.
 */
export function ehAdministradorDaPlataforma(
  email: string | null | undefined,
  listaBruta: string | null | undefined,
): boolean {
  const alvo = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!alvo) return false;

  for (const entrada of administradoresConfigurados(listaBruta)) {
    if (entrada === alvo) return true;
  }

  return false;
}

/**
 * A lista de administradores, normalizada.
 *
 * Separada de `ehAdministradorDaPlataforma` porque a tela também precisa saber
 * se há ALGUÉM configurado — para distinguir "você não é administrador" de
 * "ninguém é, porque a variável não foi definida". As duas situações levam à
 * mesma resposta HTTP, de propósito, mas rendem diagnósticos opostos para quem
 * opera, e o segundo é o que aparece no log.
 *
 * Aceita vírgula, espaço e quebra de linha como separadores: um segredo colado
 * de um gerenciador de senhas costuma vir com quebra de linha no fim, e essa
 * quebra não deveria custar uma hora de investigação.
 */
export function administradoresConfigurados(
  listaBruta: string | null | undefined,
): string[] {
  if (typeof listaBruta !== "string") return [];

  return listaBruta
    .split(/[\s,;]+/)
    .map((entrada) => entrada.trim().toLowerCase())
    .filter((entrada) => entrada.length > 0);
}
