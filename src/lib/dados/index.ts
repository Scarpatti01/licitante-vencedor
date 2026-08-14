import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { RepositorioDeDemonstracao, EMPRESA_DE_DEMONSTRACAO, ehDemonstracao } from "./demonstracao";
import type { RepositorioDoProduto } from "./porta";
import { vinculoDoUsuario } from "../auth/sessao";

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
 * É o ÚNICO lugar do sistema que decide "de quem é o dado desta requisição".
 * Concentrar isso numa função é o que torna o isolamento auditável: há um só
 * ponto para revisar, e ele é este.
 *
 * Com sessão válida e vínculo, devolve a empresa do usuário. Sem sessão — ou
 * sem Supabase configurado no ambiente — devolve a de demonstração, e o layout
 * do produto exibe o aviso correspondente. Os dois caminhos convivem de
 * propósito: o visitante conhece o produto sem criar conta, e ninguém confunde
 * uma coisa com a outra, porque a tela avisa qual está vendo.
 *
 * Usuário autenticado SEM vínculo também cai na demonstração. É o estado de
 * quem criou conta e ainda não fez o onboarding, e é o `proxy.ts` que o manda
 * para lá — aqui a resposta precisa ser um id válido, não uma exceção que
 * derrubaria a página no meio da renderização.
 *
 * O `await connection()` é de segurança, não de performance, e precisa ficar
 * AQUI e não em cada página. Sem ele, o Next pré-renderiza no build tudo que não
 * toca uma API de requisição — e o `/painel` saía do build como HTML estático.
 * Hoje isso "funciona", porque o repositório é de demonstração e o dado é o
 * mesmo para todos. No dia em que a autenticação entrar, a mesma página
 * estaria servindo o painel de uma empresa para todas as outras, e o defeito
 * apareceria como vazamento entre clientes, não como página desatualizada.
 *
 * Amarrando a espera à função que resolve o tenant, qualquer tela que leia dado
 * de empresa vira dinâmica por construção. Nenhuma delas precisa lembrar de
 * declarar `dynamic`, e nenhuma nova pode esquecer.
 */
export const empresaAtual = cache(async (): Promise<string> => {
  await connection();

  const vinculo = await vinculoDoUsuario();
  return vinculo?.empresaId ?? EMPRESA_DE_DEMONSTRACAO;
});
