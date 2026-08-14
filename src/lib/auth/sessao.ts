import "server-only";

import { cache } from "react";
import { clienteDoServidor } from "./cliente";

/**
 * Quem é o usuário desta requisição, e a qual empresa ele pertence.
 *
 * Este arquivo é a camada de acesso a dados que o guia de autenticação do Next
 * recomenda: um lugar só que verifica a sessão, memoizado com `cache` do React
 * para várias partes da mesma renderização não repetirem a checagem.
 *
 * ## `getUser`, nunca `getSession`
 *
 * `getSession()` devolve o que está no cookie, sem conferir com o servidor de
 * autenticação — e cookie é coisa que o cliente manda. `getUser()` valida o
 * token contra o Supabase. A diferença só aparece quando alguém forja um
 * cookie, que é exatamente a hora em que ela importa.
 *
 * ## A decisão de tenant mora aqui e em nenhum outro lugar
 *
 * `empresaDoUsuario` é o que transforma "este usuário existe" em "este dado é
 * dele". Enquanto houver um só ponto que responde isso, o isolamento entre
 * empresas é auditável: há um arquivo para revisar, e é este.
 *
 * A RLS ainda decide de novo no banco, e as duas checagens não são redundância
 * inútil — são camadas com modos de falha diferentes. Um erro aqui vira dado
 * errado na tela; um erro lá vira vazamento entre clientes.
 */

export type UsuarioAutenticado = {
  id: string;
  email: string | null;
};

/**
 * O usuário da requisição, ou `null` quando não há sessão válida.
 *
 * Não redireciona: quem decide o que fazer com a ausência de sessão é a tela.
 * Uma função de leitura que redireciona por conta própria é impossível de usar
 * em página pública que só quer saber se há alguém logado.
 */
export const usuarioAtual = cache(async (): Promise<UsuarioAutenticado | null> => {
  const supabase = await clienteDoServidor();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
});

export type VinculoDoUsuario = {
  empresaId: string;
  papel: "dono" | "administrador" | "operador" | "leitor";
};

/**
 * A empresa do usuário, ou `null` quando ele ainda não tem vínculo.
 *
 * `null` não é erro: é o estado de quem criou conta e ainda não passou pelo
 * onboarding. A tela que recebe `null` manda para o onboarding, e é assim que
 * "conta criada" e "empresa cadastrada" ficam sendo dois passos — que é o que
 * de fato são, já que uma pessoa pode ser convidada para uma empresa que outra
 * pessoa criou.
 *
 * A consulta NÃO filtra por `usuario_id`, e isso é deliberado: a policy de
 * `membros_da_empresa` já restringe ao próprio usuário. Repetir o filtro aqui
 * daria a impressão de que ele é o que protege — e no dia em que alguém mexesse
 * na policy, a proteção aparente continuaria no código enquanto a real teria
 * sumido. Melhor depender de uma coisa só, visível.
 */
export const vinculoDoUsuario = cache(async (): Promise<VinculoDoUsuario | null> => {
  const usuario = await usuarioAtual();
  if (!usuario) return null;

  const supabase = await clienteDoServidor();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("membros_da_empresa")
    .select("empresa_id, papel")
    .is("removido_em", null)
    // Uma pessoa em duas empresas é possível pelo modelo. Enquanto não existe
    // seletor de empresa na interface, vale a mais antiga — a que ela criou.
    // Determinístico é o que importa: sem ordem, duas requisições iguais
    // poderiam devolver empresas diferentes e a tela piscaria entre elas.
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    empresaId: data.empresa_id as string,
    papel: data.papel as VinculoDoUsuario["papel"],
  };
});
