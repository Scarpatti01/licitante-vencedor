import type { ContratacaoPncp, PaginaPncp } from "./tipos";

/**
 * Cliente da API pública de consulta do PNCP.
 *
 * A API é pública e sem autenticação, o que é conveniente e perigoso na mesma
 * medida: nada impede de martelar um serviço do governo com requisição em
 * paralelo. Este cliente é deliberadamente sequencial e com pausa entre
 * páginas. Coletar 27 UFs devagar é aceitável; ser bloqueado por abuso, não.
 */

const BASE = "https://pncp.gov.br/api/consulta";

/** Máximo aceito pela API. Menos que isso só multiplica requisições. */
const TAMANHO_PAGINA = 50;

export type OpcoesColeta = {
  /** Sigla da UF. Sem ela a consulta traz o país inteiro. */
  uf?: string;
  /**
   * Limite superior da data de encerramento das propostas, `yyyyMMdd`.
   * O endpoint devolve o que fecha ATÉ esta data.
   */
  dataFinal: string;
  /** Teto de páginas por consulta. Existe para o modo de teste não varrer tudo. */
  maxPaginas?: number;
  /**
   * Pausa entre páginas, em ms. O padrão saiu de medição: a 350ms o PNCP
   * cortou com 429 depois de ~26 páginas seguidas. 800ms atravessou o piloto
   * inteiro sem corte. Baixar isto é convite a tomar bloqueio.
   */
  pausaMs?: number;
  /** Recebe progresso; serve para o CLI mostrar o que está acontecendo. */
  aoProgredir?: (info: { pagina: number; totalPaginas: number; acumulado: number }) => void;
  /** Avisa que entrou em espera por limite ou erro, para o CLI não parecer travado. */
  aoEsperar?: (motivo: string, ms: number) => void;
  /**
   * Instante (epoch ms) em que esta coleta tem de parar, aconteça o que
   * acontecer.
   *
   * DEFEITO QUE ISTO CORRIGE, medido na coleta de 2026-08-13: o orçamento de
   * tempo existia no script, mas era conferido ENTRE editais produzidos — e o
   * tempo é gasto DENTRO do `fetch`. Uma UF que não consegue a primeira página
   * não produz edital nenhum, então a conferência nunca roda, e a UF fica presa
   * na retentativa: 6 tentativas × 60s de timeout, mais a espera exponencial,
   * passam de seis minutos para UMA página que nunca vem. Com 30 minutos para
   * seis UFs, as duas primeiras consumiam tudo e as quatro seguintes eram
   * puladas por "orçamento esgotado antes de começar" — que foi exatamente o
   * resultado observado.
   *
   * Com o prazo aqui dentro, o teto de cada requisição encolhe junto com o que
   * resta, a retentativa para quando não há mais tempo, e a UF é interrompida
   * cedo o bastante para as próximas ainda terem a sua fatia. Cobertura parcial
   * declarada continua sendo o resultado — só que agora de mais UFs, e não de
   * duas.
   *
   * Ausente, o comportamento é o de antes: sem prazo, nada corta.
   */
  prazo?: number;
};

/**
 * A coleta parou por falta de tempo, não por defeito.
 *
 * Classe própria porque o motivo aparece no relatório de cobertura, e "orçamento
 * de tempo esgotado" e "PNCP respondeu 500" levam a decisões opostas: o primeiro
 * pede mais orçamento ou menos UFs por rodada, o segundo pede esperar o portal
 * voltar. Antes os dois chegavam como `The operation was aborted due to
 * timeout`, que não distingue nada.
 */
class ErroDeOrcamento extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroDeOrcamento";
  }
}

/**
 * Campos declarados e atribuídos à mão de propósito: o `node` roda TypeScript
 * apagando tipos, sem gerar código, então `constructor(readonly status: ...)`
 * — que depende de emissão — falha em tempo de execução. Os scripts deste
 * diretório rodam por esse caminho, então o módulo tem de sobreviver a ele.
 */
class ErroPncp extends Error {
  status: number | null;
  url: string;

  constructor(message: string, status: number | null, url: string) {
    super(message);
    this.name = "ErroPncp";
    this.status = status;
    this.url = url;
  }
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Espera o backoff, mas nunca além do prazo.
 *
 * A espera do 429 chega a 120s. Dormir isso com 20s de orçamento restante
 * gastaria 100s que pertencem às UFs seguintes — e ainda acordaria para
 * descobrir que não há mais tempo. Encurtar a espera não atropela o PNCP: quem
 * acorda cedo bate no guarda do topo do laço e desiste, em vez de fazer outra
 * requisição.
 */
async function esperarSemEstourar(
  espera: number,
  prazo: number | undefined,
  aoEsperar: ((motivo: string, ms: number) => void) | undefined,
  motivo: string,
): Promise<void> {
  const real = Math.max(0, Math.min(espera, restanteAte(prazo)));
  if (real === 0) return;
  aoEsperar?.(motivo, real);
  await dormir(real);
}

/**
 * Uma requisição, com retentativa só no que faz sentido retentar.
 *
 * 5xx, 429 e falha de rede são transitórios — vale insistir com espera
 * crescente. 4xx é parâmetro errado nosso: insistir só transforma um bug
 * visível em lentidão inexplicável, então falha na hora e alto.
 */
const TIMEOUT_MAX_MS = 60_000;

/**
 * Quanto falta até o prazo, ou `Infinity` quando não há prazo.
 *
 * **Sempre inteiro**, e isso não é preciosismo — foi um defeito real, pego
 * rodando contra o PNCP de verdade. Quem calcula o prazo reparte o tempo entre
 * as UFs restantes (`restante / (total - i)`), o que produz milissegundo
 * fracionário para toda UF menos a última, onde a divisão é por 1. Esse valor
 * chegava a `AbortSignal.timeout()` e a `setTimeout()`, que exigem inteiro, e a
 * exceção voltava disfarçada de erro de rede: cinco UFs "falhando" com
 * `The value of "delay" is out of range` e só a última coletando.
 *
 * `floor` e não `round` porque arredondar para cima devolveria um prazo alguns
 * milissegundos além do combinado — o erro pequeno na direção errada.
 */
function restanteAte(prazo: number | undefined): number {
  return prazo === undefined ? Infinity : Math.floor(prazo - Date.now());
}

async function buscarComRetentativa(
  url: string,
  tentativas = 6,
  aoEsperar?: (motivo: string, ms: number) => void,
  prazo?: number,
): Promise<unknown> {
  let ultimoErro: unknown;

  for (let i = 0; i < tentativas; i++) {
    /*
     * O teto de CADA requisição é o menor entre 60s e o que resta do orçamento.
     * Sem isto, a última tentativa de uma UF quase sem tempo ainda esperaria um
     * minuto inteiro por uma resposta que já não caberia no prazo — e esse
     * minuto sai do orçamento das UFs seguintes.
     */
    const restante = restanteAte(prazo);
    if (restante <= 0) {
      throw new ErroDeOrcamento(
        ultimoErro instanceof Error
          ? `orçamento de tempo esgotado durante a consulta (último erro: ${ultimoErro.message})`
          : "orçamento de tempo esgotado durante a consulta",
      );
    }

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(Math.min(TIMEOUT_MAX_MS, restante)),
        headers: { accept: "application/json", "user-agent": "licitantevencedor.com.br" },
      });

      if (res.ok) return await res.json();

      if (res.status === 429) {
        // Medido em 2026-08-12: o PNCP corta por rajada depois de algumas
        // dezenas de páginas seguidas e volta sozinho em pouco tempo. Ele não
        // manda `Retry-After` nem cabeçalho de quota, então a espera é cega e
        // por isso generosa — 15s, 30s, 60s. Insistir de 2 em 2 segundos, que
        // era o comportamento anterior, só gasta as tentativas sem sair do
        // corte. Se um dia mandarem `Retry-After`, ele tem precedência.
        const cabecalho = Number(res.headers.get("retry-after"));
        const espera = Number.isFinite(cabecalho) && cabecalho > 0
          ? cabecalho * 1000
          : Math.min(15_000 * 2 ** i, 120_000);
        ultimoErro = new ErroPncp("PNCP respondeu 429", 429, url);
        await esperarSemEstourar(espera, prazo, aoEsperar, "429");
        continue;
      }

      if (res.status >= 500) {
        const espera = 2 ** i * 1000;
        ultimoErro = new ErroPncp(`PNCP respondeu ${res.status}`, res.status, url);
        await esperarSemEstourar(espera, prazo, aoEsperar, String(res.status));
        continue;
      }

      // 4xx que não seja 429 é parâmetro errado nosso. Insistir transformaria
      // um bug visível em lentidão inexplicável.
      const corpo = await res.text().catch(() => "");
      throw new ErroPncp(
        `PNCP respondeu ${res.status} e o erro não é transitório — confira os parâmetros. ${corpo.slice(0, 300)}`,
        res.status,
        url,
      );
    } catch (e) {
      if (e instanceof ErroPncp && e.status !== null && e.status < 500 && e.status !== 429) throw e;
      // Estourar o orçamento não é transitório: insistir é exatamente o que não
      // se quer, já que o tempo acabou.
      if (e instanceof ErroDeOrcamento) throw e;
      ultimoErro = e;
      await esperarSemEstourar(2 ** i * 1000, prazo, aoEsperar, "rede");
    }
  }

  throw ultimoErro instanceof Error
    ? ultimoErro
    : new ErroPncp("Falha desconhecida ao consultar o PNCP", null, url);
}

/**
 * Contratações com recebimento de propostas aberto, página a página.
 *
 * Gerador em vez de array por um motivo prático: uma UF grande passa de dez mil
 * registros, e o consumidor quase sempre quer filtrar ou gravar em fluxo. Assim
 * a memória não cresce com o tamanho da UF.
 */
export async function* coletarEditaisAbertos(
  opcoes: OpcoesColeta,
): AsyncGenerator<ContratacaoPncp> {
  const {
    uf,
    dataFinal,
    maxPaginas = Infinity,
    pausaMs = 800,
    aoProgredir,
    aoEsperar,
    prazo,
  } = opcoes;

  let pagina = 1;
  let totalPaginas = 1;
  let acumulado = 0;

  while (pagina <= totalPaginas && pagina <= maxPaginas) {
    /*
     * Antes de pedir a próxima página, e não só depois de produzir um edital.
     *
     * **Lança em vez de retornar**, e a diferença é a que mais importa neste
     * arquivo. `classificarUf` trata motivo nulo como UF COMPLETA — então uma
     * parada silenciosa aqui declararia "coletei tudo" para uma UF interrompida
     * no meio da paginação. A janela não é teórica: é a pausa de cortesia entre
     * páginas, de até 800ms, que é justamente onde o orçamento costuma acabar.
     *
     * O que já foi produzido não se perde: os editais das páginas anteriores já
     * foram entregues ao consumidor, e o script os mantém — ele só passa a
     * saber que a UF ficou pela metade. Coleta parcial declarada é o resultado
     * certo; coleta parcial disfarçada de completa é o defeito que a guarda de
     * degradação existe para impedir, e que uma parada muda reintroduziria por
     * baixo dela.
     */
    if (restanteAte(prazo) <= 0) {
      throw new ErroDeOrcamento(
        `orçamento de tempo esgotado após ${pagina - 1} página(s)`,
      );
    }

    const params = new URLSearchParams({
      dataFinal,
      pagina: String(pagina),
      tamanhoPagina: String(TAMANHO_PAGINA),
    });
    if (uf) params.set("uf", uf);

    const url = `${BASE}/v1/contratacoes/proposta?${params}`;
    const bruto = (await buscarComRetentativa(url, 6, aoEsperar, prazo)) as PaginaPncp<
      ContratacaoPncp
    >;

    // Página vazia devolve `data: null` em vez de `[]` em alguns casos.
    const itens = Array.isArray(bruto?.data) ? bruto.data : [];
    totalPaginas = bruto?.totalPaginas ?? 0;
    acumulado += itens.length;

    aoProgredir?.({ pagina, totalPaginas, acumulado });

    for (const item of itens) yield item;

    if (itens.length === 0) break;
    pagina++;
    if (pagina <= totalPaginas && pagina <= maxPaginas) {
      // A pausa de cortesia também não pode furar o prazo.
      await dormir(Math.max(0, Math.min(pausaMs, restanteAte(prazo))));
    }
  }
}

export { ErroPncp, ErroDeOrcamento };
