import "server-only";

/**
 * A leitura dos leads para quem opera o negócio.
 *
 * Hoje a resposta a "quantos cadastros esta semana" é uma consulta SQL feita à
 * mão no painel do Supabase. Isso funciona uma vez; vira caro quando vira
 * hábito, e caro o bastante para não ser feito é o mesmo que não existir — a
 * decisão de onde investir em conteúdo passa a ser tomada por impressão.
 *
 * ## O que este arquivo NÃO devolve, e por quê
 *
 * **O token nunca sai daqui.** A consulta lista as colunas uma a uma em vez de
 * pedir `*`, e `token` não está entre elas. Ele é a credencial que confirma
 * cadastro e cancela inscrição pelos links públicos: quem o tem consegue tirar
 * qualquer pessoa da lista. Numa tela ele apareceria no HTML, no histórico do
 * navegador de quem abriu e em qualquer captura de tela colada num chat — e
 * nada na tela precisa dele, porque a tela é de leitura. `select` explícito em
 * vez de `*` é o que garante que uma coluna nova e sensível na tabela não
 * apareça aqui sozinha no dia em que for criada.
 *
 * ## Fala REST na unha, como os vizinhos
 *
 * Mesmo motivo de `leads-destinos.ts` e `alertas/repositorio.ts`: `leads` nega
 * tudo por RLS (a migração não cria policy nenhuma, de propósito), então só a
 * chave de serviço lê. E chave de serviço não pode encostar no cliente com
 * sessão do usuário — ela ignora RLS, e usá-la ali anularia o isolamento entre
 * empresas de uma vez. Aqui não há esse risco: quem chama já provou ser
 * administrador da plataforma antes de chegar, e o dado lido não é de tenant
 * nenhum.
 */

/**
 * O lead como a tela o vê. Sem token — ver o cabeçalho.
 */
export type LeadDoPainel = {
  email: string;
  cidade: string | null;
  origem: string;
  recebidoEm: string;
  confirmadoEm: string | null;
  descadastradoEm: string | null;
};

/**
 * Em que pé está o cadastro, agora.
 *
 * `descadastrado` tem precedência sobre `confirmado` porque quem confirmou e
 * depois pediu para sair está fora — contá-lo como confirmado inflaria a lista
 * de envio na tela enquanto o envio real (que filtra `descadastrado_em is null`)
 * mandaria para menos gente. Duas contagens divergentes para a mesma pergunta é
 * o tipo de defeito que só aparece quando alguém investiga outra coisa.
 */
export type EstadoDoLead = "confirmado" | "pendente" | "descadastrado";

export function estadoDoLead(lead: LeadDoPainel): EstadoDoLead {
  if (lead.descadastradoEm) return "descadastrado";
  if (lead.confirmadoEm) return "confirmado";
  return "pendente";
}

export type ContagemPorOrigem = {
  origem: string;
  total: number;
  /** Quantos daquela origem confirmaram alguma vez. É o que mede a qualidade. */
  confirmados: number;
};

export type ResumoDeLeads = {
  total: number;
  confirmados: number;
  pendentes: number;
  descadastrados: number;
  novosEm7Dias: number;
  novosEm30Dias: number;
  /**
   * Quantos confirmaram alguma vez, dividido pelo total — ou `null` quando não
   * há lead nenhum.
   *
   * `null` em vez de `0` porque zero por cento é uma afirmação ("ninguém
   * confirma") e a verdade, sem cadastros, é que não há o que medir. É a mesma
   * regra do motor de score: ausência de base não vira nota baixa, vira
   * ausência declarada.
   */
  taxaDeConfirmacao: number | null;
  porOrigem: ContagemPorOrigem[];
};

const DIA = 24 * 60 * 60 * 1000;

/**
 * Transforma a lista crua no que a tela mostra.
 *
 * Pura e exportada para o teste: é aqui que mora toda a aritmética, e aritmética
 * que só é conferível com banco na frente não é conferida.
 *
 * `agora` entra por parâmetro em vez de sair de `Date.now()` pelo mesmo motivo —
 * "novos em 7 dias" testado contra o relógio real produz teste que passa hoje e
 * falha em outra data.
 *
 * ## Confirmado agora × confirmou alguma vez
 *
 * São duas perguntas e a tela precisa das duas. `confirmados` conta quem está na
 * lista de envio HOJE (confirmou e não saiu). `taxaDeConfirmacao` e o
 * `confirmados` de cada origem contam quem confirmou ALGUMA VEZ, inclusive quem
 * saiu depois — porque a pergunta que a taxa responde é "este conteúdo traz
 * gente que confirma o e-mail?", e alguém que confirmou e meses depois se
 * descadastrou respondeu "sim" a essa pergunta. Misturar as duas faria o
 * conteúdo mais antigo parecer pior à medida que a lista envelhecesse.
 */
export function resumirLeads(leads: readonly LeadDoPainel[], agora: Date): ResumoDeLeads {
  const limite7 = agora.getTime() - 7 * DIA;
  const limite30 = agora.getTime() - 30 * DIA;

  let confirmados = 0;
  let pendentes = 0;
  let descadastrados = 0;
  let confirmaramAlgumaVez = 0;
  let novosEm7Dias = 0;
  let novosEm30Dias = 0;

  const porOrigem = new Map<string, ContagemPorOrigem>();

  for (const lead of leads) {
    switch (estadoDoLead(lead)) {
      case "confirmado":
        confirmados += 1;
        break;
      case "pendente":
        pendentes += 1;
        break;
      case "descadastrado":
        descadastrados += 1;
        break;
    }

    if (lead.confirmadoEm) confirmaramAlgumaVez += 1;

    const recebido = Date.parse(lead.recebidoEm);
    // Data ilegível não vira "hoje" nem "antigo": fica fora das duas janelas.
    // Um `NaN` comparado com `>=` já é falso, mas depender disso seria depender
    // de um acidente da linguagem — o `Number.isNaN` diz a intenção.
    if (!Number.isNaN(recebido)) {
      if (recebido >= limite7) novosEm7Dias += 1;
      if (recebido >= limite30) novosEm30Dias += 1;
    }

    const chave = lead.origem || "desconhecida";
    const atual = porOrigem.get(chave) ?? { origem: chave, total: 0, confirmados: 0 };
    atual.total += 1;
    if (lead.confirmadoEm) atual.confirmados += 1;
    porOrigem.set(chave, atual);
  }

  return {
    total: leads.length,
    confirmados,
    pendentes,
    descadastrados,
    novosEm7Dias,
    novosEm30Dias,
    taxaDeConfirmacao: leads.length === 0 ? null : confirmaramAlgumaVez / leads.length,
    // Maior volume primeiro; empate desfeito pelo nome para a ordem ser estável
    // entre recarregamentos. Lista que embaralha sozinha faz quem compara duas
    // semanas achar que algo mudou quando nada mudou.
    porOrigem: [...porOrigem.values()].sort(
      (a, b) => b.total - a.total || a.origem.localeCompare(b.origem, "pt-BR"),
    ),
  };
}

/**
 * Teto de linhas lidas numa passagem.
 *
 * Existe para que a tela tenha custo previsível quando a lista crescer. Quando o
 * teto é atingido, a tela DIZ que está mostrando os mais recentes em vez de
 * apresentar um total que já não é o total — a mesma regra da coleta do PNCP,
 * que declara cobertura parcial em vez de fingir que coletou tudo.
 */
export const TETO_DE_LEITURA = 2000;

export type LeituraDeLeads = {
  leads: LeadDoPainel[];
  /** A leitura bateu no teto? Então `total` é "pelo menos", não "exatamente". */
  truncada: boolean;
};

export type PainelDeLeads = {
  listar(): Promise<LeituraDeLeads>;
};

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

/**
 * Abre a leitura, ou devolve `null` quando não há credencial.
 *
 * `null` em vez de exceção porque "não configurado" e "quebrou" levam a telas
 * diferentes: a primeira explica o que falta ligar, a segunda pede socorro. Zerar
 * os números nos dois casos diria ao dono que ninguém se cadastrou, que é
 * exatamente a mentira que este projeto não conta.
 */
export function abrirPainelDeLeads(): PainelDeLeads | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  return {
    async listar() {
      const consulta = new URLSearchParams({
        // Explícito, e sem `token`. Ver o cabeçalho do arquivo.
        select: "email,cidade,origem,recebido_em,confirmado_em,descadastrado_em",
        order: "recebido_em.desc",
        limit: String(TETO_DE_LEITURA),
      });

      const resposta = await fetch(`${url}/rest/v1/leads?${consulta}`, {
        headers: {
          apikey: chave,
          authorization: `Bearer ${chave}`,
        },
        // A tela é um retrato de agora; cache aqui mostraria número velho para
        // quem abriu justamente para conferir se um cadastro entrou.
        cache: "no-store",
      });

      if (!resposta.ok) {
        // A mensagem descreve a FORMA do problema e nunca a credencial — mesma
        // regra do `detalhe` em `ResultadoCaptura`.
        throw new Error(`leads: supabase respondeu ${resposta.status}`);
      }

      const linhas = (await resposta.json()) as unknown;
      if (!Array.isArray(linhas)) return { leads: [], truncada: false };

      const leads = linhas.flatMap((linha) => {
        const l = linha as Record<string, unknown>;
        // Sem e-mail não há lead: a linha não é exibível nem contável como
        // cadastro. Descartar é mais honesto que mostrar uma linha vazia.
        if (typeof l.email !== "string") return [];

        return [
          {
            email: l.email,
            cidade: typeof l.cidade === "string" ? l.cidade : null,
            origem: typeof l.origem === "string" && l.origem ? l.origem : "desconhecida",
            recebidoEm: typeof l.recebido_em === "string" ? l.recebido_em : "",
            confirmadoEm: typeof l.confirmado_em === "string" ? l.confirmado_em : null,
            descadastradoEm:
              typeof l.descadastrado_em === "string" ? l.descadastrado_em : null,
          } satisfies LeadDoPainel,
        ];
      });

      return { leads, truncada: linhas.length >= TETO_DE_LEITURA };
    },
  };
}
