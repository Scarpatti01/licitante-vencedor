import "server-only";
import type { IdentificacaoDoLead, Lead, ResultadoCaptura, ResultadoDaAcao } from "./leads";

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
  /**
   * Marca como confirmado o lead identificado pelo token.
   *
   * Precisa ser idempotente: o mesmo link é clicado duas vezes com frequência
   * (a pessoa volta ao e-mail para conferir), e vários clientes de e-mail
   * corporativos abrem todo link da mensagem antes de entregá-la. A segunda
   * chamada devolve `ja-estava` em vez de estragar o `confirmado_em` original,
   * que é a data que prova quando o consentimento foi dado.
   */
  confirmar(token: string): Promise<ResultadoDaAcao>;
  /** Tira o lead da lista. Idempotente pelos mesmos motivos de `confirmar`. */
  descadastrar(token: string): Promise<ResultadoDaAcao>;
};

function envObrigatoria(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

const agora = () => new Date().toISOString();

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

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  const tabela = `${url}/rest/v1/leads`;
  const porToken = (token: string) => `token=eq.${encodeURIComponent(token)}`;

  /** As colunas que o resto do código lê de uma linha de `leads`. */
  type Linha = {
    email?: unknown;
    cidade?: unknown;
    token?: unknown;
  };

  const identificar = (linha: Linha): IdentificacaoDoLead => ({
    email: typeof linha.email === "string" ? linha.email : "",
    cidade: typeof linha.cidade === "string" ? linha.cidade : null,
  });

  /**
   * Carimba uma coluna de data no lead do token, uma única vez.
   *
   * O filtro `<coluna>=is.null` no próprio UPDATE é o que torna a operação
   * idempotente **sem uma leitura antes**: se a coluna já tinha valor, nenhuma
   * linha é afetada e o carimbo original sobrevive. Fazer "ler, decidir,
   * escrever" abriria uma corrida entre dois cliques simultâneos no mesmo link,
   * e o perdedor sobrescreveria a data do consentimento.
   *
   * Zero linhas afetadas é ambíguo — pode ser "já estava" ou "token não existe"
   * —, e essas são telas diferentes. Só nesse caso vale a segunda consulta.
   */
  async function carimbar(
    token: string,
    coluna: "confirmado_em" | "descadastrado_em",
  ): Promise<ResultadoDaAcao> {
    try {
      const alterada = await fetch(`${tabela}?${porToken(token)}&${coluna}=is.null`, {
        method: "PATCH",
        headers: { ...cabecalhos, prefer: "return=representation" },
        body: JSON.stringify({ [coluna]: agora() }),
      });

      if (!alterada.ok) {
        console.error("[leads] supabase recusou", coluna, alterada.status, await alterada.text());
        return { situacao: "falha", detalhe: `banco respondeu ${alterada.status}` };
      }

      const linhas = (await alterada.json().catch(() => [])) as Linha[];
      if (Array.isArray(linhas) && linhas.length > 0) {
        return { situacao: "feito-agora", lead: identificar(linhas[0]) };
      }

      const existente = await fetch(`${tabela}?${porToken(token)}&select=email,cidade`, {
        headers: cabecalhos,
      });

      if (!existente.ok) {
        console.error("[leads] supabase recusou a consulta por token", existente.status);
        return { situacao: "falha", detalhe: `banco respondeu ${existente.status}` };
      }

      const achadas = (await existente.json().catch(() => [])) as Linha[];
      if (!Array.isArray(achadas) || achadas.length === 0) return { situacao: "token-desconhecido" };

      return { situacao: "ja-estava", lead: identificar(achadas[0]) };
    } catch (erro) {
      console.error("[leads] falha de rede em", coluna, erro);
      return { situacao: "falha", detalhe: "o banco não respondeu" };
    }
  }

  return {
    nome: "supabase",
    async gravar(lead) {
      try {
        const resposta = await fetch(tabela, {
          method: "POST",
          headers: {
            ...cabecalhos,
            // `ignore-duplicates` faz o mesmo e-mail reenviado devolver sucesso
            // em vez de erro: quem cadastra duas vezes não precisa saber que já
            // estava lá, e um 409 na cara do visitante viraria "deu errado".
            //
            // `return=representation` mudou junto com o double opt-in. Com
            // `return=minimal` não dava para distinguir "inseriu" de "ignorou", e
            // essa diferença agora importa: no caso ignorado, o token válido é o
            // que já está na linha, não o que acabamos de gerar.
            prefer: "resolution=ignore-duplicates,return=representation",
          },
          body: JSON.stringify({
            email: lead.email,
            cidade: lead.cidade,
            origem: lead.origem,
            recebido_em: lead.recebidoEm,
            token: lead.token,
          }),
        });

        if (!resposta.ok) {
          // O corpo do erro pode conter detalhe do banco. Fica no log do servidor,
          // nunca na resposta ao visitante.
          console.error("[leads] supabase recusou", resposta.status, await resposta.text());
          return { ok: false, motivo: "falha" };
        }

        const inseridas = (await resposta.json().catch(() => [])) as Linha[];
        if (Array.isArray(inseridas) && inseridas.length > 0) return { ok: true, token: lead.token };

        return reaproveitarCadastro(lead);
      } catch (erro) {
        console.error("[leads] falha de rede ao gravar", erro);
        return { ok: false, motivo: "falha" };
      }
    },
    confirmar: (token) => carimbar(token, "confirmado_em"),
    descadastrar: (token) => carimbar(token, "descadastrado_em"),
  };

  /**
   * O e-mail já estava cadastrado. Descobre com qual token, e reabre se for o
   * caso.
   *
   * Dois cenários diferentes se escondem aqui, e tratar os dois como um só
   * produz falha silenciosa — a pior espécie:
   *
   * - **Cadastro ativo.** Devolvemos o token que já está na linha, para o e-mail
   *   de confirmação levar um link que funciona. A primeira `origem` é
   *   preservada, que é a decisão registrada na migração: ela é a que converteu.
   * - **Cadastro descadastrado.** A pessoa saiu e voltou. Reabrimos: token novo,
   *   `confirmado_em` e `descadastrado_em` zerados. Sem isto, ela confirmaria o
   *   e-mail, veria "pronto!" na tela e continuaria fora da lista para sempre,
   *   porque o `descadastrado_em` antigo seguiria valendo. Zerar
   *   `confirmado_em` junto é deliberado: quem volta passa pelo opt-in de novo,
   *   e o consentimento que vale é o desta vez.
   */
  async function reaproveitarCadastro(lead: Lead): Promise<ResultadoCaptura> {
    const consulta = await fetch(
      `${tabela}?email=eq.${encodeURIComponent(lead.email)}&select=token,descadastrado_em`,
      { headers: cabecalhos },
    );

    if (!consulta.ok) {
      console.error("[leads] supabase recusou a consulta por e-mail", consulta.status);
      return { ok: false, motivo: "falha" };
    }

    const linhas = (await consulta.json().catch(() => [])) as (Linha & {
      descadastrado_em?: unknown;
    })[];
    if (!Array.isArray(linhas) || linhas.length === 0) {
      // Nem inseriu nem existe: o banco discordou de si mesmo. Melhor falhar
      // alto do que devolver um token que não identifica nada.
      console.error("[leads] insert ignorado mas e-mail não encontrado");
      return { ok: false, motivo: "falha" };
    }

    const linha = linhas[0];
    const ativo = linha.descadastrado_em === null || linha.descadastrado_em === undefined;
    if (ativo) {
      return typeof linha.token === "string" && linha.token
        ? { ok: true, token: linha.token }
        : { ok: false, motivo: "falha" };
    }

    const reaberto = await fetch(`${tabela}?email=eq.${encodeURIComponent(lead.email)}`, {
      method: "PATCH",
      headers: { ...cabecalhos, prefer: "return=minimal" },
      body: JSON.stringify({
        token: lead.token,
        confirmado_em: null,
        descadastrado_em: null,
        cidade: lead.cidade,
        recebido_em: lead.recebidoEm,
      }),
    });

    if (!reaberto.ok) {
      console.error("[leads] supabase recusou a reabertura", reaberto.status);
      return { ok: false, motivo: "falha" };
    }

    return { ok: true, token: lead.token };
  }
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
const RECUSAS_COM_200 = [
  "nao autorizado",
  "sem email",
  "corpo invalido",
  // As duas de baixo nasceram com o double opt-in: o script recusa cadastro sem
  // token (um lead sem token nunca conseguiria confirmar nem sair da lista) e
  // recusa ação que não conhece.
  "sem token",
  "acao desconhecida",
];

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

  /**
   * Uma chamada ao webhook. 15s, e não 8s: o app da web do Apps Script tem
   * partida a frio medida entre 3 e 4 segundos em dia bom, e um lead perdido por
   * impaciência é pior que uma requisição lenta — o visitante já foi embora da
   * página.
   *
   * `const` com arrow, e não `function`: declaração de função é içada, e o
   * compilador então precisa admitir que ela rode antes do `if (!url) return`
   * lá em cima — perdendo o estreitamento que garante que `url` não é nulo.
   */
  const chamar = async (corpo: unknown): Promise<{ status: number; texto: string }> => {
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000),
    });

    return { status: resposta.status, texto: (await resposta.text().catch(() => "")).trim() };
  };

  /**
   * Confirma ou descadastra pela planilha.
   *
   * Diferente de `gravar`, aqui o script responde **JSON**, com a mesma
   * `situacao` que o resto do código usa. Texto puro não daria conta: estas
   * ações precisam distinguir quatro desfechos e ainda devolver o e-mail e a
   * cidade da linha, que é o que permite mandar as boas-vindas sem uma segunda
   * chamada.
   *
   * O caso que exige atenção é o do **script antigo**. A implantação que está no
   * ar hoje não conhece `acao`: ela ignora o campo, trata a chamada como um
   * cadastro e responde `ok` — gravando uma linha de lixo com o token no lugar
   * do e-mail. Aceitar esse `ok` faria a tela dizer "confirmado" sobre nada.
   * Por isso resposta sem `situacao` é falha, e o diagnóstico diz o que veio.
   */
  const acaoNaPlanilha = async (
    acao: "confirmar" | "descadastrar",
    token: string,
  ): Promise<ResultadoDaAcao> => {
    try {
      const { status, texto } = await chamar({ acao, token });

      if (status < 200 || status >= 300) {
        console.error(`[leads] webhook recusou ${acao}`, status, texto.slice(0, 200));
        return { situacao: "falha", detalhe: `destino respondeu ${status} · ${forma}` };
      }

      const corpo = interpretarJson(texto);
      const situacao = corpo && typeof corpo.situacao === "string" ? corpo.situacao : null;

      if (situacao === "token-desconhecido") return { situacao: "token-desconhecido" };

      if (situacao === "feito-agora" || situacao === "ja-estava") {
        const email = typeof corpo?.email === "string" ? corpo.email : "";
        const cidade = typeof corpo?.cidade === "string" && corpo.cidade ? corpo.cidade : null;
        return { situacao, lead: email ? { email, cidade } : undefined };
      }

      console.error(`[leads] webhook respondeu sem situação conhecida em ${acao}: "${texto}"`);
      return {
        situacao: "falha",
        detalhe: `destino respondeu "${texto.slice(0, 60)}" · ${forma}`,
      };
    } catch (erro) {
      console.error(`[leads] webhook falhou em ${acao}`, erro);
      const causa = erro instanceof Error ? erro.name : "erro desconhecido";
      return { situacao: "falha", detalhe: `${causa} ao chamar o destino · ${forma}` };
    }
  };

  return {
    nome: "webhook",
    async gravar(lead) {
      try {
        // `acao` explícita para o script novo despachar sem adivinhar. O script
        // antigo ignora campo desconhecido, então cadastro continua funcionando
        // mesmo antes de a implantação ser atualizada — o que não funciona antes
        // disso é confirmar, e essa é justamente a que precisa gritar.
        const { status, texto } = await chamar({ ...lead, acao: "cadastrar" });

        if (status < 200 || status >= 300) {
          console.error("[leads] webhook recusou", status, texto.slice(0, 200));
          return {
            ok: false,
            motivo: "falha",
            detalhe: `destino respondeu ${status} · ${forma}`,
          };
        }

        if (RECUSAS_COM_200.includes(texto.toLowerCase())) {
          console.error(`[leads] webhook respondeu 200 recusando: "${texto}"`);
          return { ok: false, motivo: "falha", detalhe: `destino recusou: "${texto}"` };
        }

        // A planilha não deduplica, então o token que geramos é o que vale.
        return { ok: true, token: lead.token };
      } catch (erro) {
        console.error("[leads] webhook falhou", erro);
        const causa = erro instanceof Error ? erro.name : "erro desconhecido";
        return { ok: false, motivo: "falha", detalhe: `${causa} ao chamar o destino · ${forma}` };
      }
    },
    confirmar: (token) => acaoNaPlanilha("confirmar", token),
    descadastrar: (token) => acaoNaPlanilha("descadastrar", token),
  };
}

/** JSON do destino, ou `null` quando o corpo não é JSON de objeto. */
function interpretarJson(texto: string): Record<string, unknown> | null {
  try {
    const valor: unknown = JSON.parse(texto);
    return valor && typeof valor === "object" && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
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
