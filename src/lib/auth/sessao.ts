import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
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
/** Uma empresa a que o usuário pertence, como o seletor precisa dela. */
export type EmpresaDoUsuario = {
  empresaId: string;
  nome: string;
  papel: VinculoDoUsuario["papel"];
};

/**
 * O cookie que guarda qual empresa está aberta.
 *
 * É PREFERÊNCIA, não credencial. O valor dele nunca é usado direto: passa por
 * `empresasDoUsuario()`, que lê sob RLS e só devolve vínculos reais. Cookie
 * adulterado para o UUID de outra empresa não abre nada — cai fora da lista e
 * o código volta ao padrão.
 *
 * Vale insistir no porquê: RLS já barraria a leitura dos dados, mas devolver um
 * `empresaId` alheio faria a interface prometer uma empresa e mostrar telas
 * vazias. Validar aqui é o que mantém as duas pontas concordando.
 */
export const COOKIE_DA_EMPRESA = "lv_empresa";

/**
 * Todas as empresas do usuário, da mais antiga para a mais nova.
 *
 * A ordem é a de criação, e é determinística de propósito: sem ordem, duas
 * requisições iguais poderiam devolver empresas em sequência diferente, e o
 * seletor pularia de posição entre um carregamento e outro.
 */
export const empresasDoUsuario = cache(async (): Promise<EmpresaDoUsuario[]> => {
  const usuario = await usuarioAtual();
  if (!usuario) return [];

  const supabase = await clienteDoServidor();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("membros_da_empresa")
    .select("empresa_id, papel, empresas(razao_social, nome_fantasia)")
    .is("removido_em", null)
    .order("criado_em", { ascending: true });

  if (error || !data) return [];

  return data.flatMap((bruta) => {
    const l = bruta as unknown as Record<string, unknown>;
    const empresaId = typeof l.empresa_id === "string" ? l.empresa_id : null;
    if (!empresaId) return [];

    const e = (Array.isArray(l.empresas) ? l.empresas[0] : l.empresas) as
      | Record<string, unknown>
      | undefined;

    const nome =
      (typeof e?.nome_fantasia === "string" && e.nome_fantasia.trim()) ||
      (typeof e?.razao_social === "string" && e.razao_social.trim()) ||
      "Empresa sem nome";

    return [{ empresaId, nome, papel: l.papel as VinculoDoUsuario["papel"] }];
  });
});

/**
 * A empresa aberta agora.
 *
 * ## O defeito que isto corrige
 *
 * Até 22/08 esta função pegava SEMPRE a primeira empresa e não havia como
 * trocar. O modelo de dados sempre permitiu uma pessoa em várias empresas — e
 * contadores e consultorias, que são o melhor canal de venda para licitações,
 * gerenciam várias. Para eles o produto mostrava uma e escondia as outras, sem
 * dizer que existiam.
 *
 * Agora a escolha vem do cookie, VALIDADA contra os vínculos reais. Sem escolha
 * válida, vale a mais antiga — o comportamento de antes, que continua correto
 * para quem tem uma empresa só.
 */
export const vinculoDoUsuario = cache(async (): Promise<VinculoDoUsuario | null> => {
  const empresas = await empresasDoUsuario();
  if (empresas.length === 0) return null;

  const escolhida = (await cookies()).get(COOKIE_DA_EMPRESA)?.value;
  // `find` sobre a lista que veio do banco: é isto que torna o cookie inócuo
  // quando aponta para algo que não é do usuário.
  const alvo = empresas.find((e) => e.empresaId === escolhida) ?? empresas[0];

  return { empresaId: alvo.empresaId, papel: alvo.papel };
});
