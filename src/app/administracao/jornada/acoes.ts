"use server";

import { refresh } from "next/cache";
import { exigirAdministrador } from "@/lib/auth/administracao";
import { abrirCompras, emailPlausivel, normalizarEmail } from "@/lib/jornada/compras";

export type EstadoDaLiberacao = {
  status: "vazio" | "ok" | "erro";
  mensagem: string | null;
};

/**
 * Liberar e revogar acesso à jornada, na mão.
 *
 * Existe para as primeiras vendas, antes de o webhook da plataforma de pagamento
 * subir. Depois dele continua útil: cortesia, reembolso e o caso em que o
 * comprador digitou o e-mail errado no checkout.
 *
 * `exigirAdministrador()` é a PRIMEIRA linha das duas ações, e não uma checagem
 * na página. Uma action é um endpoint POST alcançável sem passar pela tela, e
 * proteger só a tela deixaria aberta a porta que interessa a quem procura o que
 * atacar: a que escreve.
 */
export async function liberarAcesso(
  _anterior: EstadoDaLiberacao,
  dados: FormData,
): Promise<EstadoDaLiberacao> {
  await exigirAdministrador();

  const email = normalizarEmail(String(dados.get("email") ?? ""));
  const origem = dados.get("origem") === "cortesia" ? "cortesia" : "compra";
  const referenciaBruta = String(dados.get("referencia") ?? "").trim();

  if (!emailPlausivel(email)) {
    return { status: "erro", mensagem: "Esse e-mail não parece um e-mail. Confira e envie de novo." };
  }

  // A compra precisa de identificador da transação: é o que permite conciliar um
  // estorno com o acesso que ele deve encerrar. Cortesia não tem transação, e
  // por isso é a única que pode vir sem.
  if (origem === "compra" && referenciaBruta.length === 0) {
    return {
      status: "erro",
      mensagem:
        "Compra precisa do código da transação da plataforma de pagamento. Se for cortesia, marque a opção.",
    };
  }

  const painel = abrirCompras();
  if (!painel) {
    return {
      status: "erro",
      mensagem: "Falta a credencial do banco no ambiente: SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  try {
    await painel.liberar({
      email,
      origem,
      referencia: referenciaBruta.length > 0 ? referenciaBruta : null,
    });
  } catch (erro) {
    if (erro instanceof Error && erro.message === "duplicada") {
      return { status: "erro", mensagem: `Essa transação já tinha sido lançada. ${email} continua com acesso.` };
    }
    console.error("Falha ao liberar acesso à jornada", erro);
    return { status: "erro", mensagem: "Não conseguimos gravar agora. Tente de novo em alguns instantes." };
  }

  refresh();
  return {
    status: "ok",
    mensagem: `Liberado para ${email}. O acesso vale mesmo que a conta ainda não exista: quando essa pessoa entrar com esse e-mail, a jornada já está lá.`,
  };
}

export async function revogarAcesso(
  _anterior: EstadoDaLiberacao,
  dados: FormData,
): Promise<EstadoDaLiberacao> {
  await exigirAdministrador();

  const email = normalizarEmail(String(dados.get("email") ?? ""));
  const motivo = String(dados.get("motivo") ?? "").trim();

  if (!emailPlausivel(email)) {
    return { status: "erro", mensagem: "Esse e-mail não parece um e-mail." };
  }
  if (motivo.length === 0) {
    // O motivo é obrigatório no banco e aqui. Revogação sem motivo é uma linha
    // que ninguém consegue explicar seis meses depois, inclusive quem revogou.
    return { status: "erro", mensagem: "Escreva o motivo. Estorno, fraude, pedido do cliente." };
  }

  const painel = abrirCompras();
  if (!painel) {
    return { status: "erro", mensagem: "Falta a credencial do banco no ambiente." };
  }

  try {
    await painel.revogar(email, motivo);
  } catch (erro) {
    console.error("Falha ao revogar acesso à jornada", erro);
    return { status: "erro", mensagem: "Não conseguimos gravar agora. Tente de novo em alguns instantes." };
  }

  refresh();
  return { status: "ok", mensagem: `Acesso de ${email} revogado.` };
}
