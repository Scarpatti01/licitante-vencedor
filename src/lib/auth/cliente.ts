import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * O cliente Supabase ligado aos cookies da requisição.
 *
 * ## Por que existe, se `leads-destinos.ts` fala REST na unha
 *
 * As duas metades do sistema têm necessidades opostas. A captura de lead
 * acontece sem usuário nenhum: usa a chave de serviço, ignora RLS e não tem
 * sessão para carregar — `fetch` cru resolve sem arrastar dependência.
 *
 * Aqui é o contrário. A sessão do Supabase Auth vive em cookie, precisa ser
 * renovada quando o token expira, e é o token do usuário que faz a RLS decidir
 * o que ele enxerga. Reimplementar isso na mão seria reescrever refresh de
 * token e parsing de cookie — o tipo de código em que um erro sutil vira
 * "usuário A enxerga dado do usuário B".
 *
 * ## A chave publicável é a certa, e isso é o ponto
 *
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` não é segredo: ela vai para o navegador por
 * construção. O que protege o dado NÃO é a chave, são as policies mais o token
 * do usuário que viaja junto. É por isso que a RLS aplicada nas 21 tabelas é a
 * segurança do produto, e não um detalhe do banco.
 *
 * A chave de serviço nunca entra aqui. Ela ignora RLS; usá-la numa requisição
 * de usuário anularia o isolamento entre empresas de uma vez só.
 */

/**
 * Abre o cliente, ou devolve `null` quando não há configuração.
 *
 * `null` em vez de exceção porque quem chama trata ausência de configuração
 * como "ninguém está logado" — é o que mantém o site inteiro funcionando com o
 * repositório de demonstração enquanto o Supabase não estiver ligado no
 * ambiente.
 *
 * `cookies()` é assíncrono neste Next: a 15 tornou as APIs de requisição
 * assíncronas e a 16 removeu a compatibilidade síncrona. Por isso a função é
 * `async` inteira.
 */
export async function clienteDoServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return null;

  const armazem = await cookies();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return armazem.getAll();
      },
      setAll(paraGravar) {
        /*
         * Server Component não pode gravar cookie, e o Next lança se tentar.
         *
         * Isso não é um problema a contornar: quem renova a sessão é o
         * `proxy.ts`, que roda antes e pode gravar. Se a execução chegou aqui
         * durante uma renderização, o token já foi renovado lá e a gravação
         * seria redundante.
         *
         * Engolir exceção é quase sempre errado. Este é o caso em que a
         * alternativa — deixar estourar — quebraria toda página que lê a sessão.
         */
        try {
          for (const { name, value, options } of paraGravar) {
            armazem.set(name, value, options);
          }
        } catch {
          // Ver acima.
        }
      },
    },
  });
}

/** Há configuração de autenticação neste ambiente? */
export function autenticacaoConfigurada(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
