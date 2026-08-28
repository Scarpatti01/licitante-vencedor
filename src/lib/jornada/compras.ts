import "server-only";

/**
 * As compras da jornada, lidas e escritas com a chave de serviço.
 *
 * ## Por que chave de serviço, e não a sessão do administrador
 *
 * Porque conceder acesso é escrita privilegiada: a política da tabela não deixa
 * NENHUM usuário logado inserir, de propósito. Se deixasse, qualquer pessoa com
 * conta se daria a jornada de graça. A tela de administração já confirma quem é
 * o operador; a partir daí, quem escreve é o servidor.
 *
 * ## Ausência de configuração não vira zero
 *
 * `abrirCompras()` devolve `null` quando falta credencial, e a tela diz o que
 * ligar. Achatar isso em "nenhuma compra" contaria ao dono que ninguém comprou
 * quando o que está errado é o ambiente, e é a mesma regra de `leads-painel.ts`.
 */

export type CompraDaJornada = {
  email: string;
  origem: "compra" | "cortesia";
  referencia: string | null;
  criadoEm: string;
  reivindicadoEm: string | null;
  revogadoEm: string | null;
  motivoDaRevogacao: string | null;
};

export const TETO_DE_LEITURA = 200;

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim().length > 0 ? valor : null;
}

/** Minúsculas e sem espaço, igual à trava do banco. */
export function normalizarEmail(bruto: string): string {
  return bruto.trim().toLowerCase();
}

/**
 * Um e-mail plausível, conferido do mesmo jeito que o banco confere.
 *
 * Não tenta validar RFC: a única pergunta que importa aqui é se a linha vai ser
 * aceita pelo check da tabela. Um formato recusado pelo banco depois de a tela
 * dizer "liberado" seria a pior das respostas.
 */
export function emailPlausivel(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email === normalizarEmail(email);
}

export type PainelDeCompras = {
  listar(): Promise<CompraDaJornada[]>;
  liberar(entrada: {
    email: string;
    origem: "compra" | "cortesia";
    referencia: string | null;
  }): Promise<void>;
  revogar(email: string, motivo: string): Promise<void>;
};

export function abrirCompras(): PainelDeCompras | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  return {
    async listar() {
      const consulta = new URLSearchParams({
        select: "email,origem,referencia_externa,criado_em,reivindicado_em,revogado_em,motivo_da_revogacao",
        order: "criado_em.desc",
        limit: String(TETO_DE_LEITURA),
      });

      const resposta = await fetch(`${url}/rest/v1/compras_da_jornada?${consulta}`, {
        headers: cabecalhos,
        // Retrato de agora: cache aqui mostraria uma liberação que acabou de
        // ser feita como se não tivesse acontecido.
        cache: "no-store",
      });
      if (!resposta.ok) throw new Error(`compras: supabase respondeu ${resposta.status}`);

      const linhas = (await resposta.json()) as unknown;
      if (!Array.isArray(linhas)) return [];

      return linhas.flatMap((linha): CompraDaJornada[] => {
        const l = linha as Record<string, unknown>;
        if (typeof l.email !== "string") return [];
        return [{
          email: l.email,
          origem: l.origem === "cortesia" ? "cortesia" : "compra",
          referencia: typeof l.referencia_externa === "string" ? l.referencia_externa : null,
          criadoEm: String(l.criado_em ?? ""),
          reivindicadoEm: typeof l.reivindicado_em === "string" ? l.reivindicado_em : null,
          revogadoEm: typeof l.revogado_em === "string" ? l.revogado_em : null,
          motivoDaRevogacao: typeof l.motivo_da_revogacao === "string" ? l.motivo_da_revogacao : null,
        }];
      });
    },

    async liberar({ email, origem, referencia }) {
      const resposta = await fetch(`${url}/rest/v1/compras_da_jornada`, {
        method: "POST",
        headers: { ...cabecalhos, prefer: "return=minimal" },
        body: JSON.stringify({ email, origem, referencia_externa: referencia }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.text();
        // 23505 é violação de unicidade: a mesma referência já foi lançada. É o
        // caso do dedo duplo no botão, e dizer "já estava liberado" é mais útil
        // que devolver um código de erro do Postgres.
        if (corpo.includes("23505")) throw new Error("duplicada");
        throw new Error(`compras: supabase respondeu ${resposta.status}`);
      }
    },

    async revogar(email, motivo) {
      const consulta = new URLSearchParams({
        email: `eq.${email}`,
        revogado_em: "is.null",
      });
      const resposta = await fetch(`${url}/rest/v1/compras_da_jornada?${consulta}`, {
        method: "PATCH",
        headers: { ...cabecalhos, prefer: "return=minimal" },
        body: JSON.stringify({
          revogado_em: new Date().toISOString(),
          motivo_da_revogacao: motivo,
        }),
      });
      if (!resposta.ok) throw new Error(`compras: supabase respondeu ${resposta.status}`);
    },
  };
}
