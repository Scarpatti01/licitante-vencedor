"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_DA_EMPRESA, empresasDoUsuario } from "./sessao";

/**
 * Troca a empresa aberta.
 *
 * ## A validação não é formalidade
 *
 * `empresasDoUsuario()` lê sob RLS: a lista só contém vínculos que existem de
 * verdade para quem está pedindo. Conferir contra ela antes de gravar é o que
 * impede alguém de chamar esta ação com o UUID de uma empresa alheia.
 *
 * Se passasse, os dados continuariam protegidos — a RLS barraria toda leitura
 * seguinte —, mas a interface abriria uma empresa que o usuário não pode ver e
 * mostraria telas vazias, sem explicar por quê. Recusar aqui mantém a promessa
 * da tela e o que o banco entrega dizendo a mesma coisa.
 *
 * Silenciosa no caso de recusa, de propósito: quem chega aqui com id inválido
 * ou é um defeito nosso ou é alguém tentando. Nem um nem outro merecem uma
 * mensagem que confirme se aquela empresa existe.
 */
export async function trocarDeEmpresa(empresaId: string): Promise<void> {
  const empresas = await empresasDoUsuario();
  if (!empresas.some((e) => e.empresaId === empresaId)) return;

  (await cookies()).set(COOKIE_DA_EMPRESA, empresaId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Um ano: a escolha da empresa é de trabalho, não de sessão. Quem gerencia
    // três clientes não quer reescolher a cada login.
    maxAge: 60 * 60 * 24 * 365,
  });

  /*
   * `layout` e não `page`: a empresa aberta atravessa TODA a área do produto —
   * o cabeçalho, o painel, as oportunidades, o perfil. Revalidar só a página
   * atual deixaria o resto servindo dados da empresa anterior até alguém
   * navegar, que é exatamente o erro que este seletor existe para evitar.
   */
  revalidatePath("/", "layout");
}
