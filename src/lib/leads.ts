/**
 * Captura de interessados no alerta.
 *
 * O ponto que governa este arquivo: **um formulário que aceita e-mail sem ter
 * onde guardá-lo é pior do que nenhum formulário**. O visitante acredita que se
 * cadastrou, e o lead evapora sem que ninguém saiba. Por isso a captura só se
 * apresenta como funcional quando há destino configurado; sem destino, a página
 * mostra outro caminho de contato em vez de fingir que registrou.
 *
 * O destino é uma decisão de infraestrutura ainda em aberto neste projeto — hoje
 * o site não tem banco nem serviço de e-mail. Quando houver, implementar
 * `gravarLead` é a única mudança necessária: nada mais no site sabe onde o lead
 * vai parar.
 */

export type Lead = {
  email: string;
  /** Município de interesse, texto livre — o visitante escreve como quiser. */
  cidade: string | null;
  /** De qual página veio, para saber qual LP converte. */
  origem: string;
  recebidoEm: string;
};

export type ResultadoCaptura =
  | { ok: true }
  | { ok: false; motivo: "sem-destino" | "invalido" | "falha" };

/**
 * Validação de e-mail deliberadamente simples.
 *
 * Regex de e-mail "completa" é folclore: as que circulam rejeitam endereços
 * válidos e aceitam inválidos. O que dá para afirmar sem errar é o formato
 * grosseiro; o resto quem valida é o envio.
 */
export function emailPlausivel(valor: string): boolean {
  const v = valor.trim();
  if (v.length < 6 || v.length > 254) return false;
  if (/\s/.test(v)) return false;
  const partes = v.split("@");
  if (partes.length !== 2) return false;
  const [local, dominio] = partes;
  if (!local || !dominio) return false;
  if (!dominio.includes(".")) return false;
  if (dominio.startsWith(".") || dominio.endsWith(".") || dominio.includes("..")) return false;
  return true;
}

/**
 * Há destino configurado para os leads?
 *
 * Lido no servidor a cada chamada, e não em constante de módulo, para que
 * configurar a variável de ambiente passe a valer sem exigir novo build.
 */
export function capturaConfigurada(): boolean {
  return Boolean(process.env.LEADS_DESTINO);
}

/**
 * Grava o lead no destino configurado.
 *
 * Os destinos vivem em `leads-destinos.ts` — este arquivo continua sem saber
 * onde o lead vai parar, que era a propriedade que valia a pena preservar. O
 * contrato também não mudou: qualquer falha devolve `ok: false`, para a página
 * nunca dizer "cadastrado" sem que o registro exista de fato.
 *
 * O import é dinâmico porque `leads-destinos.ts` é `server-only`, e este módulo
 * exporta `emailPlausivel`, que é útil no cliente. Carregar estaticamente
 * arrastaria a barreira de servidor para qualquer componente que só quisesse
 * validar um e-mail.
 */
export async function gravarLead(lead: Lead): Promise<ResultadoCaptura> {
  if (!capturaConfigurada()) return { ok: false, motivo: "sem-destino" };

  const { destinoAtual } = await import("./leads-destinos");
  const destino = destinoAtual();

  // `LEADS_DESTINO` preenchido mas sem as credenciais do destino escolhido é
  // erro de configuração, não ausência de destino — e o visitante merece a
  // mesma mensagem honesta dos dois jeitos.
  if (!destino) return { ok: false, motivo: "sem-destino" };

  return destino.gravar(lead);
}
