import "server-only";

import { criarProvedorResend, mensagemDoConvite } from "@/lib/email";

/**
 * O convite para criar conta, disparado quando a compra é gravada.
 *
 * ## QUEM GARANTE QUE ELE SAI UMA VEZ SÓ
 *
 * O banco. A rota só chama isto quando `aplicar` devolve efeito `gravada`, que
 * é a INSERÇÃO ter acontecido de fato. Reentrega da Hotmart devolve `repetida`,
 * porque o índice único de `referencia_externa` barrou, e reentrega acontece às
 * dezenas: em 08/09 foram 165 do mesmo evento. Sem essa amarra, seriam 165
 * e-mails para a mesma pessoa.
 *
 * Repare que a garantia não é uma flag nem uma consulta prévia, que teriam
 * corrida entre duas entregas simultâneas. É o mesmo índice único que já
 * governa a idempotência da compra.
 *
 * ## POR QUE ELE NUNCA DERRUBA A COMPRA
 *
 * A mesma regra do log do #144, e aqui ela pesa mais. Se uma falha de e-mail
 * virasse erro na rota, a Hotmart receberia não-2xx, reentregaria, e a
 * reentrega devolveria `repetida`, que NÃO dispara convite nenhum. Ou seja: o
 * único efeito de propagar o erro seria a compra ficar eternamente em
 * retentativa no painel, sem nunca reenviar o e-mail que falhou.
 *
 * Então a falha é registrada e engolida. O comprador sem convite tem saída
 * (recebeu o produto pela Hotmart, e o acesso está esperando pelo e-mail dele);
 * a compra em retentativa infinita não tem.
 */
export async function convidarParaCriarConta(email: string): Promise<void> {
  try {
    // O provedor é sempre construído: a checagem de credencial mora no envio,
    // que devolve `sem-credencial` em vez de fingir que a mensagem saiu.
    const resultado = await criarProvedorResend().enviar(mensagemDoConvite({ email }));
    if (!resultado.ok) {
      // Sem o endereço: log de produção não é lugar para dado do comprador.
      console.error("Hotmart: convite não saiu.", resultado.motivo, resultado.detalhe ?? "");
      return;
    }

    console.log("Hotmart: convite enviado.", resultado.id);
  } catch (erro) {
    console.error("Hotmart: convite falhou.", erro instanceof Error ? erro.message : erro);
  }
}
