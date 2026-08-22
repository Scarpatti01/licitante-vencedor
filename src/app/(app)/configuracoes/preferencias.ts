import "server-only";
import { clienteDoServidor } from "@/lib/auth/cliente";
import { PREFERENCIAS_PADRAO } from "@/lib/alertas/selecao";

/**
 * Preferências de alerta — onde elas ficam, e por que ainda ficam aqui.
 *
 * Quatro delas (`scoreMinimo`, `maximoPorEnvio`, `avisarPrazoDeSalvas`,
 * `enviarQuandoVazio`) são lidas de verdade pelo seletor de alertas em
 * `src/lib/alertas/selecao.ts` — os padrões vêm de lá, e não de números
 * escolhidos nesta tela, justamente para as duas pontas nunca divergirem.
 *
 * As outras (horário e canais) descrevem um envio que ainda não existe: não há
 * agendador nem serviço de disparo ligado. A tela DIZ isso, em vez de sugerir
 * que já está mandando mensagem. Prometer entrega que não acontece é a falha
 * mais cara que um produto de alerta pode ter.
 *
 * ## O armazenamento saiu do cookie em 22/08
 *
 * A versão anterior guardava tudo num cookie e dizia, aqui mesmo, que trocaria
 * quando houvesse lugar no banco. A troca deixou de ser melhoria e virou
 * requisito no dia em que passou a existir envio de verdade: cookie mora no
 * navegador de quem configurou, e quem envia é `scripts/enviar-resumo-diario.ts`
 * — um job de madrugada, sem navegador nenhum.
 *
 * Enquanto ninguém enviava nada, o cookie era inofensivo. Deixaria de ser do
 * pior jeito possível: a tela aceitando cliques, o cliente desligando o e-mail,
 * e o e-mail continuando a chegar.
 *
 * `preferencias_de_envio` é lida pelo cliente autenticado, sob RLS — a mesma
 * política das demais tabelas por empresa. O remetente lê pela chave de serviço.
 */

/** Onde a leitura e a escrita acontecem. Nenhuma tela conhece esta tabela. */
const TABELA = "preferencias_de_envio";

export type PreferenciasDeEnvio = {
  /** `HH:MM`, no fuso de Brasília — que é o fuso das sessões públicas. */
  horario: string;
  apenasDiasUteis: boolean;
  canalEmail: boolean;
  email: string | null;
  canalWhatsapp: boolean;
  whatsapp: string | null;
  scoreMinimo: number;
  maximoPorEnvio: number;
  avisarPrazoDeSalvas: boolean;
  enviarQuandoVazio: boolean;
};

export const PADRAO: PreferenciasDeEnvio = {
  // 7h é o horário anunciado nas páginas públicas do serviço; mudar aqui sem
  // mudar lá faria a tela contradizer a promessa comercial.
  horario: "07:00",
  apenasDiasUteis: true,
  canalEmail: true,
  email: null,
  canalWhatsapp: false,
  whatsapp: null,
  scoreMinimo: PREFERENCIAS_PADRAO.scoreMinimo,
  maximoPorEnvio: PREFERENCIAS_PADRAO.maximoPorEnvio,
  avisarPrazoDeSalvas: PREFERENCIAS_PADRAO.avisarPrazoDeSalvas,
  enviarQuandoVazio: PREFERENCIAS_PADRAO.enviarQuandoVazio,
};

function inteiroEntre(valor: unknown, minimo: number, maximo: number, padrao: number): number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= minimo && valor <= maximo
    ? valor
    : padrao;
}

function booleano(valor: unknown, padrao: boolean): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

function textoOuNulo(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

/**
 * Lê o que estiver guardado, campo a campo.
 *
 * Nada de `JSON.parse` e confiar no resultado: o cookie vem do cliente e pode
 * ter sido editado à mão. Cada campo é conferido contra o mesmo intervalo que o
 * formulário aceita, e o que não passar volta ao padrão em silêncio — uma
 * preferência corrompida não deve derrubar a página de configurações.
 */
export async function lerPreferencias(empresaId: string): Promise<PreferenciasDeEnvio> {
  const supabase = await clienteDoServidor();
  if (!supabase) return PADRAO;

  const { data, error } = await supabase
    .from(TABELA)
    .select(
      "horario,apenas_dias_uteis,canal_email,email,canal_whatsapp,whatsapp," +
        "score_minimo,maximo_por_envio,avisar_prazo_de_salvas,enviar_quando_vazio",
    )
    .eq("empresa_id", empresaId)
    .maybeSingle();

  // Empresa que nunca configurou nada não tem linha, e isso não é erro: os
  // padrões daqui são os mesmos do banco, de propósito.
  if (error || !data) return PADRAO;

  // Via `unknown`: sem tipos gerados, o cliente infere um union que inclui o
  // erro por coluna do PostgREST, e o compilador recusa a conversão direta.
  const p = data as unknown as Record<string, unknown>;

  /*
   * Cada campo continua passando pelos mesmos validadores do tempo do cookie.
   *
   * Parece redundante — o banco já tem `check` em quase tudo —, e não é: os
   * `check` protegem contra escrita inválida, e isto protege contra LEITURA de
   * algo que mudou de forma (coluna nova com outro tipo, migração pela metade,
   * valor gravado por fora). Preferência corrompida não deve derrubar a página
   * de configurações.
   */
  return {
    horario:
      typeof p.horario === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.horario)
        ? p.horario
        : PADRAO.horario,
    apenasDiasUteis: booleano(p.apenas_dias_uteis, PADRAO.apenasDiasUteis),
    canalEmail: booleano(p.canal_email, PADRAO.canalEmail),
    email: textoOuNulo(p.email),
    canalWhatsapp: booleano(p.canal_whatsapp, PADRAO.canalWhatsapp),
    whatsapp: textoOuNulo(p.whatsapp),
    scoreMinimo: inteiroEntre(p.score_minimo, 0, 100, PADRAO.scoreMinimo),
    maximoPorEnvio: inteiroEntre(p.maximo_por_envio, 1, 20, PADRAO.maximoPorEnvio),
    avisarPrazoDeSalvas: booleano(p.avisar_prazo_de_salvas, PADRAO.avisarPrazoDeSalvas),
    enviarQuandoVazio: booleano(p.enviar_quando_vazio, PADRAO.enviarQuandoVazio),
  };
}

export async function gravarPreferencias(
  empresaId: string,
  preferencias: PreferenciasDeEnvio,
): Promise<void> {
  const supabase = await clienteDoServidor();
  if (!supabase) return;

  /*
   * `upsert` pela chave primária: a empresa pode nunca ter configurado nada.
   *
   * As colunas de texto são `not null` com padrão vazio, então `null` do
   * formulário vira string vazia aqui — e não o contrário, que faria o banco
   * recusar a gravação e a tela dizer que salvou.
   */
  const { error } = await supabase.from(TABELA).upsert(
    {
      empresa_id: empresaId,
      horario: preferencias.horario,
      apenas_dias_uteis: preferencias.apenasDiasUteis,
      canal_email: preferencias.canalEmail,
      email: preferencias.email ?? "",
      canal_whatsapp: preferencias.canalWhatsapp,
      whatsapp: preferencias.whatsapp ?? "",
      score_minimo: preferencias.scoreMinimo,
      maximo_por_envio: preferencias.maximoPorEnvio,
      avisar_prazo_de_salvas: preferencias.avisarPrazoDeSalvas,
      enviar_quando_vazio: preferencias.enviarQuandoVazio,
    },
    { onConflict: "empresa_id" },
  );

  // Silêncio aqui seria a pior forma de falhar: a pessoa desliga o e-mail, a
  // tela confirma, e o e-mail continua chegando. Quem chama trata.
  if (error) {
    throw new Error(`preferências não foram gravadas: ${error.message}`);
  }
}
