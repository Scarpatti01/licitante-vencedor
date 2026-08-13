import { capturaConfigurada, emailPlausivel, gravarLead } from "@/lib/leads";
import { dentroDoLimite, identificarChamador } from "@/lib/limite-de-taxa";

/**
 * Recebe o cadastro no alerta gratuito.
 *
 * Regra que atravessa todo o arquivo: só responder sucesso quando o lead foi
 * realmente gravado. Qualquer outro caso devolve erro explícito, para a página
 * poder dizer a verdade ao visitante em vez de exibir "pronto!" sobre nada.
 *
 * O matcher do `proxy.ts` já exclui `/api`, então esta rota não passa por ele.
 */

export const dynamic = "force-dynamic";

type Corpo = {
  email?: unknown;
  cidade?: unknown;
  origem?: unknown;
  /**
   * Campo-armadilha, invisível para gente e preenchido por robô de formulário.
   * Se vier preenchido, a requisição é descartada — respondendo 200, porque
   * dizer ao robô que ele foi detectado só ensina o robô.
   */
  site?: unknown;
};

const texto = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/**
 * Cinco cadastros por minuto e por origem.
 *
 * O número vem do uso legítimo: uma pessoa preenche uma vez, erra o e-mail e
 * tenta de novo, talvez cadastre uma segunda cidade. Cinco cobre isso com folga
 * e ainda assim torna caro o flood ingênuo. Enquanto a captura era um stub isso
 * não fazia diferença; agora que o lead é gravado de verdade, faz.
 */
const LIMITE = { maximo: 5, janelaSegundos: 60 };

export async function POST(request: Request) {
  const chamador = identificarChamador(request);
  const limite = dentroDoLimite(`alerta:${chamador}`, LIMITE);
  if (!limite.permitido) {
    return Response.json(
      { erro: "limite", mensagem: "Muitas tentativas seguidas. Aguarde um instante." },
      { status: 429, headers: { "retry-after": String(limite.esperarSegundos) } },
    );
  }

  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return Response.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (texto(corpo.site, 100)) return Response.json({ ok: true }, { status: 200 });

  const email = texto(corpo.email, 254);
  if (!email || !emailPlausivel(email)) {
    return Response.json(
      { erro: "Confira o e-mail — o formato não parece válido." },
      { status: 400 },
    );
  }

  // Verificado antes de gravar para que a resposta seja específica: "ainda não
  // estamos recebendo cadastros" é informação útil; "falhou" não é.
  if (!capturaConfigurada()) {
    return Response.json(
      { erro: "sem-destino", mensagem: "O cadastro ainda não está aberto." },
      { status: 503 },
    );
  }

  const resultado = await gravarLead({
    email,
    cidade: texto(corpo.cidade, 120),
    origem: texto(corpo.origem, 120) ?? "desconhecida",
    recebidoEm: new Date().toISOString(),
  });

  if (!resultado.ok) {
    return Response.json(
      { erro: resultado.motivo, mensagem: "Não conseguimos registrar agora. Tente mais tarde." },
      { status: resultado.motivo === "sem-destino" ? 503 : 500 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}
