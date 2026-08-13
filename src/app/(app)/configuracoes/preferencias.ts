import "server-only";
import { cookies } from "next/headers";
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
 * O armazenamento é um cookie assinado pelo próprio navegador do usuário porque
 * a porta de dados ainda não tem lugar para preferência (ver
 * `RepositorioDoProduto`). Quando tiver, este arquivo é o único ponto a trocar:
 * nenhuma tela conhece o cookie.
 */

const COOKIE = "lv_preferencias_de_alerta";
const UM_ANO = 60 * 60 * 24 * 365;

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
  const bruto = (await cookies()).get(COOKIE)?.value;
  if (!bruto) return PADRAO;

  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return PADRAO;
  }

  if (typeof dados !== "object" || dados === null) return PADRAO;
  const p = dados as Record<string, unknown>;

  // Preferência guardada para outra empresa não vale para esta.
  if (p.empresaId !== empresaId) return PADRAO;

  return {
    horario:
      typeof p.horario === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.horario)
        ? p.horario
        : PADRAO.horario,
    apenasDiasUteis: booleano(p.apenasDiasUteis, PADRAO.apenasDiasUteis),
    canalEmail: booleano(p.canalEmail, PADRAO.canalEmail),
    email: textoOuNulo(p.email),
    canalWhatsapp: booleano(p.canalWhatsapp, PADRAO.canalWhatsapp),
    whatsapp: textoOuNulo(p.whatsapp),
    scoreMinimo: inteiroEntre(p.scoreMinimo, 0, 100, PADRAO.scoreMinimo),
    maximoPorEnvio: inteiroEntre(p.maximoPorEnvio, 1, 20, PADRAO.maximoPorEnvio),
    avisarPrazoDeSalvas: booleano(p.avisarPrazoDeSalvas, PADRAO.avisarPrazoDeSalvas),
    enviarQuandoVazio: booleano(p.enviarQuandoVazio, PADRAO.enviarQuandoVazio),
  };
}

export async function gravarPreferencias(
  empresaId: string,
  preferencias: PreferenciasDeEnvio,
): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify({ empresaId, ...preferencias }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UM_ANO,
  });
}
