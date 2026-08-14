import { capturaConfigurada, emailPlausivel, gerarToken, gravarLead } from "@/lib/leads";
import { enviarConfirmacao } from "@/lib/leads-emails";
import { dentroDoLimite, identificarChamador } from "@/lib/limite-de-taxa";

/**
 * Recebe o cadastro no alerta gratuito.
 *
 * Regra que atravessa todo o arquivo: só responder sucesso quando o lead foi
 * realmente gravado. Qualquer outro caso devolve erro explícito, para a página
 * poder dizer a verdade ao visitante em vez de exibir "pronto!" sobre nada.
 *
 * Com o double opt-in, "sucesso" passou a ter dois graus, e eles não podem ser
 * achatados num só:
 *
 * - **gravado e confirmação enviada** — a tela manda procurar o e-mail;
 * - **gravado, confirmação NÃO enviada** — o lead existe (não dá para desgravar
 *   e não seria certo), mas mandar a pessoa esperar um e-mail que não saiu é
 *   mentira com data marcada: ela espera, nada chega, e conclui que o site é
 *   quebrado. A tela precisa dizer que houve problema no envio e oferecer o
 *   contato.
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

  const cidade = texto(corpo.cidade, 120);

  const resultado = await gravarLead({
    email,
    cidade,
    origem: texto(corpo.origem, 120) ?? "desconhecida",
    recebidoEm: new Date().toISOString(),
    // Gerado aqui, antes de gravar, porque o e-mail de confirmação precisa dele
    // no mesmo passo. O destino pode devolver OUTRO token — quando o e-mail já
    // estava cadastrado, vale o que já está lá —, e é o devolvido que vai no
    // link.
    token: gerarToken(),
  });

  if (!resultado.ok) {
    return Response.json(
      {
        erro: resultado.motivo,
        mensagem: "Não conseguimos registrar agora. Tente mais tarde.",
        // `diagnostico` descreve a FORMA da falha, nunca o segredo: qual status o
        // destino devolveu, se a URL termina em `/exec`, se traz token, quantos
        // caracteres tem. É o que permite consertar a configuração sem um
        // redeploy por palpite — a interface mostra só `mensagem`.
        ...(resultado.detalhe ? { diagnostico: resultado.detalhe } : {}),
      },
      { status: resultado.motivo === "sem-destino" ? 503 : 500 },
    );
  }

  const envio = await enviarConfirmacao({ email, cidade, token: resultado.token });

  if (!envio.ok) {
    /*
     * O lead está gravado e vai continuar gravado. Desfazer seria pior por dois
     * motivos: o registro de interesse é justamente o que permite alguém
     * responder à mão hoje, e um `delete` depois de um envio que talvez tenha
     * saído (o provedor pode ter aceitado e falhado na resposta) apagaria um
     * cadastro real.
     *
     * O que muda é a resposta: `201` continua, porque o recurso foi criado, e
     * `confirmacaoEnviada: false` conta ao formulário o que dizer. Devolver erro
     * aqui faria o visitante tentar de novo contra um cadastro que já existe.
     */
    console.error("[alerta] lead gravado mas confirmação não enviada", envio.motivo, envio.detalhe);
    return Response.json(
      {
        ok: true,
        confirmacaoEnviada: false,
        motivo: envio.motivo,
        ...(envio.detalhe ? { diagnostico: envio.detalhe } : {}),
      },
      { status: 201 },
    );
  }

  return Response.json({ ok: true, confirmacaoEnviada: true }, { status: 201 });
}
