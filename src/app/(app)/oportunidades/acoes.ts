"use server";

import { refresh } from "next/cache";
import { empresaAtual, repositorio } from "@/lib/dados";
import type { SituacaoDaOportunidade } from "@/lib/dominio/tipos";

/**
 * Registra a decisão do cliente sobre uma oportunidade: salvar, descartar,
 * marcar em preparação, participada, vencida ou perdida.
 *
 * Uma action é um endpoint POST alcançável sem passar pela tela — por isso
 * `situacao` é validada de novo aqui, contra a mesma lista fechada que
 * `SituacaoDaOportunidade` declara no domínio, e `empresaId` nunca vem do
 * cliente: `empresaAtual()` é o único lugar que decide de quem é a
 * requisição. Sem essa segunda validação, um POST forjado com
 * `situacao: "vencida"` bastaria para fechar a oportunidade de outra empresa.
 */

const SITUACOES_VALIDAS: readonly SituacaoDaOportunidade[] = [
  "nova",
  "vista",
  "salva",
  "descartada",
  "em_preparacao",
  "participada",
  "vencida",
  "perdida",
];

export async function registrarAcaoNaOportunidade(
  oportunidadeId: string,
  situacao: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!SITUACOES_VALIDAS.includes(situacao as SituacaoDaOportunidade)) {
    return { ok: false, erro: "Situação inválida." };
  }

  const repo = await repositorio();
  const empresaId = await empresaAtual();

  try {
    await repo.registrarAcao(empresaId, oportunidadeId, situacao as SituacaoDaOportunidade);
  } catch (erro) {
    console.error("Falha ao registrar ação na oportunidade", erro);
    return {
      ok: false,
      erro: "Não conseguimos gravar essa mudança agora. Tente de novo em alguns instantes.",
    };
  }

  // `refresh`, não `revalidatePath`: a página do edital lê `situacao` do
  // repositório a cada requisição, fora de qualquer cache de dados — o mesmo
  // padrão de `perfil/acoes.ts`.
  refresh();

  return { ok: true };
}
