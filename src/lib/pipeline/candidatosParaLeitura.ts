import { analiseNaoRealizada } from "../dominio/recomendacao.ts";
import type { PerfilDaEmpresa } from "../dominio/tipos.ts";
import type { Edital } from "../fontes/tipos.ts";
import { triar } from "./triagem.ts";

/**
 * Quem entra na leitura real do dia, e por quê.
 *
 * Extraído de `scripts/ler-recomendados.ts` para ser testável sem banco —
 * mesma separação de `pipeline/triagem.ts`: a decisão é pura, a gravação é do
 * script.
 *
 * ## Por que só o topo, e por que 25 por empresa
 *
 * Ler todo edital aberto compatível com alguma empresa não é viável: medido em
 * 21/08, uma única empresa (perfil de teste) já tinha 1.169 oportunidades
 * entregues — 47× o volume que `publicar-posts.ts` lê por dia. O filtro é
 * score ≥ 70 (`CORTE_DE_LEITURA`), o mesmo corte que já separa
 * "recomendada"/"recomendada forte" em `dominio/recomendacao.ts` e que já é o
 * piso do alerta por e-mail (`alertas/selecao.ts:scoreMinimo`) — não é um
 * número novo, é o que o produto já chama de "vale a pena". Com esse filtro,
 * o mesmo perfil de teste caiu para 21 editais abertos — perto do volume que
 * `publicar-posts.ts` já prova sustentável.
 *
 * `LEITURAS_POR_EMPRESA_POR_DIA = 25` é a rede de segurança sobre isso: sem
 * ela, uma empresa com área de atuação nacional poderia sozinha consumir um
 * orçamento de leitura arbitrariamente grande num único dia. É por EMPRESA, e
 * não um teto global, de propósito — cada empresa nova soma um custo teto
 * previsível (no máximo 25 leituras sua), em vez de competir por uma cota
 * compartilhada onde a enésima empresa cadastrada pode não sobrar nada. A
 * leitura em si é por EDITAL, não por empresa: duas empresas com o mesmo
 * edital no topo compartilham a mesma leitura (ver `ia/custo.ts`), então o
 * custo real de IA quase sempre fica abaixo de 25 × número de empresas.
 */

/** O piso da faixa "boa" em `dominio/score.ts` — ver o comentário do topo do arquivo. */
export const CORTE_DE_LEITURA = 70;

/** A rede de segurança por empresa — ver o comentário do topo do arquivo. */
export const LEITURAS_POR_EMPRESA_POR_DIA = 25;

/**
 * O teto enquanto NINGUÉM assina.
 *
 * Medido em 25/08: a leitura diária custava entre US$ 2,96 e US$ 5,73 por dia
 * — algo entre R$ 500 e R$ 700 por mês — para 1 empresa cadastrada e 0
 * assinaturas. Ler 22 editais por dia para ninguém é caro sem ser útil.
 *
 * Zerar seria pior que caro: a leitura diária é o que pegou a queda do `pdfjs`
 * em 16/08, a cota estourada em 24/08 e a análise que voltava vazia. Sistema
 * exercitado só quando chega o primeiro cliente quebra na frente dele.
 *
 * Cinco por dia mantém o pipeline vivo por uns R$ 40 a R$ 60 por mês.
 *
 * O teto volta a ser 25 SOZINHO no dia em que a primeira assinatura viva
 * aparecer — ver `tetoDeLeitura`. É de propósito que não dependa de alguém
 * lembrar: economia que precisa de memória vira, mais cedo ou mais tarde, um
 * cliente pagante recebendo cinco editais por dia.
 */
export const LEITURAS_SEM_ASSINANTE = 5;

/**
 * Quantos editais por empresa por dia, conforme haja ou não quem pague.
 *
 * `assinantesVivos` conta assinatura em `teste`, `ativa` ou `inadimplente` —
 * as três esperam serviço, e a diferença entre elas é assunto da cobrança, não
 * da leitura.
 */
export function tetoDeLeitura(assinantesVivos: number): number {
  return assinantesVivos > 0 ? LEITURAS_POR_EMPRESA_POR_DIA : LEITURAS_SEM_ASSINANTE;
}

export type EditalAbertoParaLeitura = { uuid: string; edital: Edital };

/** Um edital candidato a leitura, e toda empresa cujo topo-25 o inclui. */
export type Candidato = {
  uuid: string;
  edital: Edital;
  empresas: PerfilDaEmpresa[];
};

/**
 * Os candidatos: por empresa, o topo-25 com score ≥ 70 calculado SEM leitura.
 *
 * Um edital aparece uma vez só no mapa (chave = uuid), mesmo casando com
 * várias empresas — é a mesma leitura, compartilhada.
 */
export function candidatosParaLeitura(
  editaisAbertos: EditalAbertoParaLeitura[],
  perfis: PerfilDaEmpresa[],
  agora: Date = new Date(),
  /**
   * Quantos editais por empresa. Padrão 25, o teto de quem paga; quem chama
   * passa `tetoDeLeitura(assinantesVivos)` para o dia sem assinante custar o
   * que precisa custar e não mais.
   */
  teto: number = LEITURAS_POR_EMPRESA_POR_DIA,
  /**
   * Os editais (por uuid) que JÁ têm análise vigente.
   *
   * Sem isto, o teto era gasto com quem não precisava de nada. Medido em
   * 25/08, entre os cinco editais abertos de maior score, QUATRO já estavam
   * lidos — e ficariam no topo por semanas, porque encerram só em setembro.
   * Com o teto em 5, a leitura teria parado sozinha em um ou dois dias, sem
   * erro nenhum em log nenhum: todo dia gastaria as cinco vagas relendo do
   * cache e nunca chegaria ao primeiro edital novo.
   *
   * O cache já impedia de PAGAR duas vezes. O que faltava era não deixar o
   * edital já lido ocupar a vaga do edital novo.
   */
  jaLidos: ReadonlySet<string> = new Set(),
): Map<string, Candidato> {
  const porEditalId = new Map(editaisAbertos.map((e) => [e.edital.id, e]));
  const paresSemLeitura = editaisAbertos.map(({ edital }) => ({
    edital,
    analise: analiseNaoRealizada(edital.id, "leitura ainda não avaliada por ler-recomendados.ts"),
  }));

  const candidatos = new Map<string, Candidato>();

  for (const perfil of perfis) {
    const resultado = triar(paresSemLeitura, perfil, agora);

    const acimaDoCorte = resultado.entregues
      .filter((d) => (d.score ?? 0) >= CORTE_DE_LEITURA)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const uuidDe = (editalId: string) => porEditalId.get(editalId)?.uuid;
    const foiLido = (d: (typeof acimaDoCorte)[number]) => {
      const uuid = uuidDe(d.editalId);
      return uuid !== undefined && jaLidos.has(uuid);
    };

    /*
     * O teto vale só para quem vai CUSTAR. Os já lidos entram sem consumir
     * vaga: eles não gastam IA nenhuma, e continuar passando por eles mantém a
     * oportunidade fresca conforme o prazo se aproxima — a triagem depende de
     * `agora`, então a decisão de ontem pode não ser a de hoje.
     */
    const topo = [
      ...acimaDoCorte.filter(foiLido),
      ...acimaDoCorte.filter((d) => !foiLido(d)).slice(0, teto),
    ];

    for (const decisao of topo) {
      const par = porEditalId.get(decisao.editalId);
      if (!par) continue; // não deveria acontecer — defesa contra índice divergente

      const existente = candidatos.get(par.uuid);
      if (existente) existente.empresas.push(perfil);
      else candidatos.set(par.uuid, { uuid: par.uuid, edital: par.edital, empresas: [perfil] });
    }
  }

  return candidatos;
}
