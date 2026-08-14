/**
 * As três consultas que o alerta diário precisa fazer no banco.
 *
 * ## Por que NÃO há `import "server-only"` aqui
 *
 * Os outros módulos que tocam a chave de serviço (`leads-destinos.ts`,
 * `leads-emails.ts`) declaram `server-only`, e a ausência aqui é decisão, não
 * esquecimento: aquele pacote não é uma checagem de ambiente, é um marcador para
 * o bundler. Só a condição `react-server` recebe o módulo vazio; a condição
 * `default` — que é a de `node scripts/…` — recebe um arquivo que **lança na
 * importação**. Verificado, não deduzido.
 *
 * E o único consumidor deste arquivo é justamente um script agendado, rodando em
 * Node puro. Com o marcador, o alerta diário não sobe do chão.
 *
 * O que se perde é o aviso em tempo de build caso alguém importe isto de um
 * componente de cliente. O que sobra no lugar: nada aqui é chamado pelo site, e
 * um import assim quebraria no primeiro `fetch` sem credencial — a chave não
 * existe no navegador. Se um dia o site precisar destas consultas, o caminho é
 * uma rota de servidor que as chame, e o marcador entra lá.
 *
 * Fica separado do envio pelo motivo de sempre neste projeto: quem decide o que
 * mandar (`lead.ts`) e quem escreve o texto (`mensagem-do-lead.ts`) são testáveis
 * sem rede, e continuam assim porque o acesso a dados mora aqui. O runner junta
 * as peças.
 *
 * Fala REST do Supabase com a chave de serviço, como `leads-destinos.ts`, e pelo
 * mesmo motivo: `leads` e `envios_de_alerta` negam tudo por RLS e não existe
 * usuário autenticado num processo que roda por agendamento.
 */

const agora = () => new Date().toISOString();

export type LeadParaAlerta = {
  id: string;
  email: string;
  cidade: string | null;
  /** Token de descadastro — vai no rodapé de todo e-mail. */
  token: string;
};

export type Repositorio = {
  /** Quem pode receber alerta hoje. */
  destinatarios(): Promise<LeadParaAlerta[]>;
  /** Ids de edital que este lead já recebeu, em qualquer envio anterior. */
  jaEnviados(leadId: string): Promise<Set<string>>;
  /**
   * Registra o que acabou de sair.
   *
   * Devolve quantas linhas de fato entraram. Menos que o pedido significa que
   * outra execução já tinha gravado aquele par — ver o comentário sobre a
   * restrição de unicidade na migração.
   */
  registrar(leadId: string, editalIds: string[], idNoProvedor: string | null): Promise<number>;
};

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

/**
 * Abre o repositório, ou devolve `null` quando não há credencial.
 *
 * `null` em vez de exceção porque o chamador é um script de agendamento, e a
 * diferença entre "não configurado" e "quebrou" é a diferença entre sair com
 * uma mensagem clara e encher o log de erro toda madrugada.
 */
export function abrirRepositorio(): Repositorio | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  return {
    async destinatarios() {
      /*
       * As três condições são o consentimento inteiro, e nenhuma é dispensável:
       *
       *   `confirmado_em=not.is.null` — clicou no link. Sem isso não houve
       *     double opt-in, e mandar assim mesmo transformaria a confirmação em
       *     teatro.
       *   `descadastrado_em=is.null` — não pediu para sair. Enviar depois do
       *     pedido de saída é o que faz uma pessoa clicar em "isto é spam" em
       *     vez de no link do rodapé.
       *   `cidade=not.is.null` — sem região não há o que filtrar. Quem cadastrou
       *     sem cidade não recebe: o alerta seria "todos os editais do Brasil",
       *     que não é o produto que ele pediu.
       */
      const consulta = new URLSearchParams({
        select: "id,email,cidade,token",
        confirmado_em: "not.is.null",
        descadastrado_em: "is.null",
        cidade: "not.is.null",
        order: "recebido_em.asc",
      });

      const resposta = await fetch(`${url}/rest/v1/leads?${consulta}`, { headers: cabecalhos });
      if (!resposta.ok) {
        throw new Error(`leads: supabase respondeu ${resposta.status} ${await resposta.text()}`);
      }

      const linhas = (await resposta.json()) as unknown;
      if (!Array.isArray(linhas)) return [];

      return linhas.flatMap((linha) => {
        const l = linha as Record<string, unknown>;
        // Linha sem e-mail ou sem token não vira envio: o primeiro não tem para
        // onde ir, e o segundo sairia sem link de descadastro funcional — que é
        // justamente o e-mail que não se pode mandar.
        if (typeof l.id !== "string" || typeof l.email !== "string" || typeof l.token !== "string") {
          return [];
        }
        return [{
          id: l.id,
          email: l.email,
          cidade: typeof l.cidade === "string" ? l.cidade : null,
          token: l.token,
        }];
      });
    },

    async jaEnviados(leadId) {
      const consulta = new URLSearchParams({
        select: "edital_id",
        lead_id: `eq.${leadId}`,
      });

      const resposta = await fetch(`${url}/rest/v1/envios_de_alerta?${consulta}`, {
        headers: cabecalhos,
      });
      if (!resposta.ok) {
        throw new Error(`envios: supabase respondeu ${resposta.status} ${await resposta.text()}`);
      }

      const linhas = (await resposta.json()) as unknown;
      if (!Array.isArray(linhas)) return new Set();

      return new Set(
        linhas
          .map((linha) => (linha as Record<string, unknown>).edital_id)
          .filter((id): id is string => typeof id === "string"),
      );
    },

    async registrar(leadId, editalIds, idNoProvedor) {
      if (editalIds.length === 0) return 0;

      /*
       * `resolution=ignore-duplicates` faz o insert absorver o par que já
       * existia em vez de estourar o lote inteiro. É o que torna a gravação
       * segura numa retentativa: se o e-mail saiu e o processo morreu antes de
       * registrar, rodar de novo grava o que falta sem reclamar do que já está.
       *
       * O risco oposto — gravar o envio e o e-mail não ter saído — é evitado
       * pela ordem no runner: grava DEPOIS do provedor aceitar. Um edital que o
       * lead não recebeu e consta como enviado é silêncio permanente sobre
       * aquele certame; um que ele recebeu e não consta é, no pior caso, um
       * e-mail repetido. A segunda falha é a que se pode admitir.
       */
      const resposta = await fetch(`${url}/rest/v1/envios_de_alerta`, {
        method: "POST",
        headers: {
          ...cabecalhos,
          prefer: "resolution=ignore-duplicates,return=representation",
        },
        body: JSON.stringify(
          editalIds.map((edital_id) => ({
            lead_id: leadId,
            edital_id,
            enviado_em: agora(),
            id_no_provedor: idNoProvedor,
          })),
        ),
      });

      if (!resposta.ok) {
        throw new Error(`envios: supabase recusou ${resposta.status} ${await resposta.text()}`);
      }

      const gravadas = (await resposta.json()) as unknown;
      return Array.isArray(gravadas) ? gravadas.length : 0;
    },
  };
}
