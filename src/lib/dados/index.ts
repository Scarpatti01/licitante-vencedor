import "server-only";
import { cache } from "react";
import { RepositorioDeDemonstracao, EMPRESA_DE_DEMONSTRACAO, ehDemonstracao } from "./demonstracao";
import type { RepositorioDoProduto } from "./porta";

export type { RepositorioDoProduto, ResumoDaOportunidade, PainelDoDia, FiltroDeOportunidades } from "./porta";
export { ehDemonstracao };

/**
 * Ponto único de acesso a dados do lado servidor.
 *
 * `import "server-only"` no topo é barreira, não enfeite: se um componente de
 * cliente importar este módulo por engano, o build quebra em vez de mandar
 * consulta e credencial para o navegador.
 *
 * Hoje devolve o repositório de demonstração, porque ainda não há projeto
 * Postgres provisionado — essa é decisão do dono, com custo mensal, e não cabe
 * a um agente tomá-la. Quando houver, a troca acontece só aqui: nenhuma tela
 * conhece a implementação.
 *
 * `cache` do React memoiza por passagem de renderização, de modo que várias
 * partes da página compartilhem a mesma instância sem que ninguém precise
 * passá-la de componente em componente — que é justamente como uma instância
 * acaba vazando para o cliente.
 */
export const repositorio = cache((): RepositorioDoProduto => {
  return new RepositorioDeDemonstracao();
});

/**
 * A empresa cuja visão está sendo renderizada.
 *
 * Enquanto não há autenticação, devolve a empresa de demonstração. Quando a
 * autenticação entrar, esta função passa a ler a sessão e a resolver o vínculo
 * do usuário com a empresa — e continua sendo o ÚNICO lugar do sistema que
 * decide "de quem é o dado desta requisição". Concentrar isso em uma função é o
 * que torna o isolamento auditável: há um só ponto para revisar, e ele é este.
 */
export const empresaAtual = cache(async (): Promise<string> => {
  return EMPRESA_DE_DEMONSTRACAO;
});
