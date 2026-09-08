import "server-only";

import type { Decisao } from "./webhook.ts";

/**
 * Onde a compra da Hotmart vira acesso.
 *
 * Escreve em `compras_da_jornada` com a chave de serviço, que é a única que
 * pode: a política de RLS da tabela deixa o usuário LER a própria compra e
 * ninguém escrever. Se o usuário pudesse inserir, ele se daria acesso de graça,
 * e é por isso que esta parte mora no servidor.
 *
 * Não cria conta, não manda e-mail, não procura usuário. O acesso vale pelo
 * e-mail desde o instante em que a linha existe — `tem_acesso_a_jornada` faz a
 * junção com `auth.users` na hora da pergunta. Quem comprou e ainda não tem
 * conta encontra o acesso pronto quando criar uma com o mesmo e-mail.
 */

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

function credenciais(): { url: string; chave: string } | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  return url && chave ? { url, chave } : null;
}

export type Resultado =
  | { ok: true; efeito: "gravada" | "repetida" | "revogada" | "nada-a-revogar" }
  | { ok: false; motivo: string };

/**
 * Grava a compra, tratando reentrega como sucesso.
 *
 * `Prefer: resolution=ignore-duplicates` faz o PostgREST devolver 201 sem
 * inserir quando o índice único de `referencia_externa` já tem aquela
 * transação. É o que transforma a reentrega da Hotmart em nada, do lado certo:
 * no banco, e não numa consulta prévia que teria corrida entre duas entregas
 * simultâneas do mesmo evento.
 */
async function gravarCompra(email: string, referencia: string): Promise<Resultado> {
  const cred = credenciais();
  if (!cred) return { ok: false, motivo: "sem-credencial" };

  const resposta = await fetch(`${cred.url}/rest/v1/compras_da_jornada`, {
    method: "POST",
    headers: {
      apikey: cred.chave,
      authorization: `Bearer ${cred.chave}`,
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify([{ email, origem: "compra", referencia_externa: referencia }]),
    cache: "no-store",
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("Hotmart: não gravou a compra", resposta.status, detalhe);
    return { ok: false, motivo: `banco-${resposta.status}` };
  }

  // Lista vazia significa que o índice único barrou: a compra já estava lá.
  const gravadas = (await resposta.json().catch(() => [])) as unknown[];
  return { ok: true, efeito: gravadas.length > 0 ? "gravada" : "repetida" };
}

/**
 * Revoga a compra de uma transação.
 *
 * Filtra por `revogado_em is null` para a segunda entrega do mesmo reembolso
 * não sobrescrever a data da primeira: a data que interessa é a de quando o
 * dinheiro voltou, não a da última vez que a Hotmart avisou.
 */
async function revogarCompra(referencia: string, motivo: string): Promise<Resultado> {
  const cred = credenciais();
  if (!cred) return { ok: false, motivo: "sem-credencial" };

  const alvo =
    `${cred.url}/rest/v1/compras_da_jornada` +
    `?referencia_externa=eq.${encodeURIComponent(referencia)}&revogado_em=is.null`;

  const resposta = await fetch(alvo, {
    method: "PATCH",
    headers: {
      apikey: cred.chave,
      authorization: `Bearer ${cred.chave}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify({ revogado_em: new Date().toISOString(), motivo_da_revogacao: motivo }),
    cache: "no-store",
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("Hotmart: não revogou a compra", resposta.status, detalhe);
    return { ok: false, motivo: `banco-${resposta.status}` };
  }

  const mexidas = (await resposta.json().catch(() => [])) as unknown[];
  return { ok: true, efeito: mexidas.length > 0 ? "revogada" : "nada-a-revogar" };
}

export async function aplicar(decisao: Decisao): Promise<Resultado> {
  if (decisao.fazer === "ignorar") return { ok: true, efeito: "repetida" };
  if (decisao.fazer === "liberar") return gravarCompra(decisao.email, decisao.referencia);
  return revogarCompra(decisao.referencia, decisao.motivo);
}
