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
 * Ainda não implementado de propósito: escolher entre banco, serviço de e-mail
 * ou planilha é decisão do dono, e inventar uma integração com credencial
 * imaginária produziria um formulário que parece funcionar e não funciona.
 *
 * Enquanto `LEADS_DESTINO` não existir, esta função nunca é chamada — a rota
 * responde antes que a captura está indisponível, e a página diz isso ao
 * visitante.
 */
export async function gravarLead(lead: Lead): Promise<ResultadoCaptura> {
  if (!capturaConfigurada()) return { ok: false, motivo: "sem-destino" };

  // Ponto único de integração. Ao implementar, manter o contrato: devolver
  // `ok: false` em qualquer falha, para a página nunca dizer "cadastrado" sem
  // que o registro exista de fato.
  void lead;
  return { ok: false, motivo: "falha" };
}
