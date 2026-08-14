import "server-only";
import type { Lead, ResultadoCaptura } from "./leads";

/**
 * Onde o lead vai parar.
 *
 * O projeto vinha com `gravarLead` deliberadamente não implementado, e a
 * decisão estava certa: inventar integração com credencial imaginária produz um
 * formulário que parece funcionar e não funciona. O que mudou é que agora o
 * blog é o canal de aquisição — o tráfego orgânico bate nos guias, e cada
 * visitante que preenche e some é um lead que a empresa pagou (em conteúdo)
 * para conseguir e jogou fora.
 *
 * Então aqui estão os destinos, e nenhum deles é ligado por padrão. Cada um
 * acende com a variável de ambiente correspondente, e a ordem abaixo é a ordem
 * de preferência. Sem nenhuma variável, o comportamento continua exatamente o
 * de antes: 503 declarado e a página dizendo a verdade.
 *
 *   `LEADS_DESTINO=supabase` — grava na tabela `leads`. É o destino final.
 *   `LEADS_DESTINO=webhook`  — POST em `LEADS_WEBHOOK_URL`. Serve para começar
 *                              hoje, com uma planilha ou um automatizador, sem
 *                              esperar o banco existir.
 *
 * A ordem importa: um lead perdido não volta, e "esperar o banco" custou meses
 * de captação em muito projeto.
 */

export type Destino = {
  nome: string;
  gravar(lead: Lead): Promise<ResultadoCaptura>;
};

function envObrigatoria(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

/**
 * Grava na tabela `leads` do Postgres, via API do Supabase.
 *
 * Usa a chave de serviço porque a tabela nega tudo por RLS: o visitante não
 * está autenticado, e abrir uma policy de INSERT para `anon` transformaria o
 * endpoint público num formulário de inserção direta no banco. A chave nunca
 * sai do servidor — este arquivo é `server-only`.
 */
function destinoSupabase(): Destino | null {
  const url = envObrigatoria("NEXT_PUBLIC_SUPABASE_URL");
  const chave = envObrigatoria("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  return {
    nome: "supabase",
    async gravar(lead) {
      try {
        const resposta = await fetch(`${url}/rest/v1/leads`, {
          method: "POST",
          headers: {
            apikey: chave,
            authorization: `Bearer ${chave}`,
            "content-type": "application/json",
            // `ignore-duplicates` faz o mesmo e-mail reenviado devolver sucesso
            // em vez de erro: quem cadastra duas vezes não precisa saber que já
            // estava lá, e um 409 na cara do visitante viraria "deu errado".
            prefer: "resolution=ignore-duplicates,return=minimal",
          },
          body: JSON.stringify({
            email: lead.email,
            cidade: lead.cidade,
            origem: lead.origem,
            recebido_em: lead.recebidoEm,
          }),
        });

        if (resposta.ok) return { ok: true };
        // O corpo do erro pode conter detalhe do banco. Fica no log do servidor,
        // nunca na resposta ao visitante.
        console.error("[leads] supabase recusou", resposta.status, await resposta.text());
        return { ok: false, motivo: "falha" };
      } catch (erro) {
        console.error("[leads] falha de rede ao gravar", erro);
        return { ok: false, motivo: "falha" };
      }
    },
  };
}

/**
 * Respostas que chegam com status 200 e ainda assim significam recusa.
 *
 * App da web do Apps Script responde 200 para tudo — inclusive quando o próprio
 * script rejeita a chamada. Confiar só no status faria o site dizer "cadastrado"
 * ao visitante enquanto o lead era descartado do outro lado, que é exatamente o
 * erro que `leads.ts` existe para impedir. Estes são os textos que o script
 * documentado em `docs/produto/captura-de-leads.md` devolve ao recusar.
 *
 * A lista é curta e literal de propósito: webhook genérico (Zapier, Make, n8n)
 * responde 200 com JSON de sucesso, e não pode ser reprovado por engano.
 */
const RECUSAS_COM_200 = ["nao autorizado", "sem email", "corpo invalido"];

/**
 * Entrega o lead a um webhook — planilha, automatizador, CRM.
 *
 * Existe para a captação poder começar antes do banco. Não é gambiarra: é o
 * reconhecimento de que a decisão de provisionar Postgres é do dono e pode
 * demorar, enquanto o tráfego orgânico não espera.
 */
function destinoWebhook(): Destino | null {
  const url = envObrigatoria("LEADS_WEBHOOK_URL");
  if (!url) return null;

  /*
   * A forma da URL, sem o segredo. É o que permite responder "a variável está
   * truncada" sem imprimir a variável em lugar nenhum — e URL truncada foi
   * exatamente o defeito que custou duas rodadas de tentativa e erro na
   * primeira configuração.
   */
  const forma = (() => {
    try {
      const u = new URL(url);
      return [
        u.host,
        u.pathname.endsWith("/exec") ? "termina em /exec" : `caminho termina em "${u.pathname.slice(-6)}"`,
        u.searchParams.has("token") ? "com token" : "SEM token",
        `${url.length} caracteres`,
      ].join(", ");
    } catch {
      return `não é uma URL válida (${url.length} caracteres)`;
    }
  })();

  return {
    nome: "webhook",
    async gravar(lead) {
      try {
        // 15s, e não 8s: o app da web do Apps Script tem partida a frio medida
        // entre 3 e 4 segundos em dia bom, e um lead perdido por impaciência é
        // pior que uma requisição lenta — o visitante já foi embora da página.
        const resposta = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(lead),
          signal: AbortSignal.timeout(15_000),
        });

        const texto = (await resposta.text().catch(() => "")).trim();

        if (!resposta.ok) {
          console.error("[leads] webhook recusou", resposta.status, texto.slice(0, 200));
          return {
            ok: false,
            motivo: "falha",
            detalhe: `destino respondeu ${resposta.status} · ${forma}`,
          };
        }

        if (RECUSAS_COM_200.includes(texto.toLowerCase())) {
          console.error(`[leads] webhook respondeu 200 recusando: "${texto}"`);
          return { ok: false, motivo: "falha", detalhe: `destino recusou: "${texto}"` };
        }

        return { ok: true };
      } catch (erro) {
        console.error("[leads] webhook falhou", erro);
        const causa = erro instanceof Error ? erro.name : "erro desconhecido";
        return { ok: false, motivo: "falha", detalhe: `${causa} ao chamar o destino · ${forma}` };
      }
    },
  };
}

/**
 * O destino em uso, ou `null` quando nada está configurado.
 *
 * Lido a cada chamada, e não em constante de módulo, para configurar a variável
 * passar a valer sem exigir novo build — a mesma escolha que `capturaConfigurada`
 * já fazia.
 */
export function destinoAtual(): Destino | null {
  const escolhido = envObrigatoria("LEADS_DESTINO");
  if (!escolhido) return null;

  switch (escolhido) {
    case "supabase":
      return destinoSupabase();
    case "webhook":
      return destinoWebhook();
    default:
      // Valor desconhecido não pode virar "sem destino" silencioso: seria um
      // erro de digitação derrubando a captação sem ninguém perceber.
      console.error(
        `[leads] LEADS_DESTINO="${escolhido}" não é um destino conhecido (supabase, webhook)`,
      );
      return null;
  }
}
