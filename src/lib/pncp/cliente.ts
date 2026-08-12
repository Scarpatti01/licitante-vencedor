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
};

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
 * Uma requisição, com retentativa só no que faz sentido retentar.
 *
 * 5xx, 429 e falha de rede são transitórios — vale insistir com espera
 * crescente. 4xx é parâmetro errado nosso: insistir só transforma um bug
 * visível em lentidão inexplicável, então falha na hora e alto.
 */
async function buscarComRetentativa(
  url: string,
  tentativas = 6,
  aoEsperar?: (motivo: string, ms: number) => void,
): Promise<unknown> {
  let ultimoErro: unknown;

  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(60_000),
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
        aoEsperar?.("429", espera);
        ultimoErro = new ErroPncp("PNCP respondeu 429", 429, url);
        await dormir(espera);
        continue;
      }

      if (res.status >= 500) {
        const espera = 2 ** i * 1000;
        aoEsperar?.(String(res.status), espera);
        ultimoErro = new ErroPncp(`PNCP respondeu ${res.status}`, res.status, url);
        await dormir(espera);
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
      ultimoErro = e;
      const espera = 2 ** i * 1000;
      aoEsperar?.("rede", espera);
      await dormir(espera);
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
  const { uf, dataFinal, maxPaginas = Infinity, pausaMs = 800, aoProgredir, aoEsperar } = opcoes;

  let pagina = 1;
  let totalPaginas = 1;
  let acumulado = 0;

  while (pagina <= totalPaginas && pagina <= maxPaginas) {
    const params = new URLSearchParams({
      dataFinal,
      pagina: String(pagina),
      tamanhoPagina: String(TAMANHO_PAGINA),
    });
    if (uf) params.set("uf", uf);

    const url = `${BASE}/v1/contratacoes/proposta?${params}`;
    const bruto = (await buscarComRetentativa(url, 6, aoEsperar)) as PaginaPncp<ContratacaoPncp>;

    // Página vazia devolve `data: null` em vez de `[]` em alguns casos.
    const itens = Array.isArray(bruto?.data) ? bruto.data : [];
    totalPaginas = bruto?.totalPaginas ?? 0;
    acumulado += itens.length;

    aoProgredir?.({ pagina, totalPaginas, acumulado });

    for (const item of itens) yield item;

    if (itens.length === 0) break;
    pagina++;
    if (pagina <= totalPaginas && pagina <= maxPaginas) await dormir(pausaMs);
  }
}

export { ErroPncp };
