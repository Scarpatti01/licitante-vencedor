import { NextResponse } from "next/server";

import { emailPlausivel, normalizarEmail } from "@/lib/jornada/compras";
import { reenviarConvite } from "@/lib/hotmart/reenvio";
import { dentroDoLimite, identificarChamador } from "@/lib/limite-de-taxa";

/**
 * Reenvia o convite de criação de conta a quem já comprou.
 *
 * ## A RESPOSTA NÃO CONTA SE O E-MAIL COMPROU
 *
 * Sucesso e "não encontrei" respondem exatamente igual. Diferenciar os dois
 * transformaria esta rota num verificador de clientes: qualquer pessoa
 * digitaria endereços e descobriria quem comprou o produto. Isso é dado de
 * terceiro, e vazá-lo por um formulário aberto não é aceitável nem em troca de
 * uma mensagem de erro mais gentil.
 *
 * A única resposta diferente é 400 para e-mail com formato inválido, que não
 * revela nada: qualquer um sabe que "abc" não é e-mail.
 *
 * ## O LIMITE DE TAXA NÃO É ZELO, É A DEFESA PRINCIPAL
 *
 * Sem ele, esta rota manda e-mail para qualquer endereço que alguém digitar,
 * quantas vezes quiser. Vira ferramenta de incômodo contra terceiros e queima
 * a reputação do nosso domínio no caminho, o que derruba a entrega dos alertas
 * de todo mundo.
 *
 * ## `await`, E NÃO DISPARAR E ESQUECER
 *
 * Mesma razão do webhook: função serverless pode ser congelada quando a
 * resposta sai, e promessa solta morre com ela.
 */

const LIMITE = { maximo: 3, janelaSegundos: 600 };

export const dynamic = "force-dynamic";

export async function POST(requisicao: Request) {
  const chamador = identificarChamador(requisicao.headers);
  const limite = dentroDoLimite(`reenvio-da-jornada:${chamador}`, LIMITE);
  if (!limite.permitido) {
    return NextResponse.json(
      { erro: "limite", mensagem: "Muitas tentativas seguidas. Aguarde alguns minutos." },
      { status: 429, headers: { "retry-after": String(limite.esperarSegundos) } },
    );
  }

  let corpo: { email?: unknown };
  try {
    corpo = (await requisicao.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ erro: "corpo-invalido" }, { status: 400 });
  }

  const email = typeof corpo.email === "string" ? normalizarEmail(corpo.email) : "";
  if (!email || !emailPlausivel(email)) {
    return NextResponse.json(
      { erro: "email", mensagem: "Confira o e-mail: o formato não parece válido." },
      { status: 400 },
    );
  }

  await reenviarConvite(email);

  // Sempre igual. Ver a nota sobre verificador de clientes, acima.
  return NextResponse.json({ ok: true });
}
