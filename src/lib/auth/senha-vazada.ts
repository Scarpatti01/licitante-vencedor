import { createHash } from "node:crypto";

/**
 * A senha que a pessoa escolheu já apareceu em vazamento público?
 *
 * ## Por que isto existe em vez de um botão no painel
 *
 * O Supabase tem essa proteção pronta, e ela é a recomendação do NIST — ver o
 * comentário de `MINIMO_DA_SENHA`. Ligá-la, porém, exige plano Pro: em 22/08 o
 * painel recusou o toggle com "available on Pro Plans and up".
 *
 * A alternativa não é abrir mão da proteção. A fonte que o Supabase consulta é
 * pública e gratuita — o Pwned Passwords do Have I Been Pwned —, e consultá-la
 * direto cabe em pouco código. O que se paga lá é a conveniência, não o dado.
 *
 * ## A senha NUNCA sai daqui
 *
 * É o ponto que faz esta consulta ser aceitável, e vale entender antes de mexer:
 *
 *   1. calcula-se o SHA-1 da senha, aqui no servidor;
 *   2. envia-se só os CINCO primeiros caracteres do hash;
 *   3. o serviço devolve todos os sufixos que começam com aqueles cinco;
 *   4. a comparação final acontece aqui, sobre a lista recebida.
 *
 * Quem opera o serviço vê um prefixo compartilhado por dezenas de milhares de
 * senhas diferentes, e não tem como saber qual é a nossa — é o protocolo de
 * k-anonimato que o próprio HIBP publicou para este fim. Nem a senha nem o hash
 * inteiro trafegam.
 *
 * SHA-1 aqui não é escolha de segurança e não guarda nada: é só o formato de
 * índice que o serviço usa. A senha continua sendo guardada pelo Supabase, com
 * o algoritmo dele.
 */

/** Quantos caracteres do hash viajam. Definido pelo protocolo do HIBP. */
const TAMANHO_DO_PREFIXO = 5;

/**
 * Quanto esperamos pelo serviço antes de desistir.
 *
 * Curto de propósito: isto roda no meio do cadastro, com a pessoa olhando para
 * um botão girando. Dois segundos é folgado para a chamada real (a resposta é
 * pequena e o serviço é rápido) e curto o bastante para não parecer travado
 * quando ele estiver ruim.
 */
const ESPERA_MAXIMA_EM_MS = 2000;

/** O hash da senha, partido como o protocolo pede. */
export function partirOHash(senha: string): { prefixo: string; sufixo: string } {
  const hash = createHash("sha1").update(senha, "utf8").digest("hex").toUpperCase();
  return {
    prefixo: hash.slice(0, TAMANHO_DO_PREFIXO),
    sufixo: hash.slice(TAMANHO_DO_PREFIXO),
  };
}

/**
 * Em quantos vazamentos aquele sufixo aparece, segundo o corpo devolvido.
 *
 * ## O detalhe que engana
 *
 * Pedimos `Add-Padding: true`, e com isso a resposta vem com sufixos FALSOS
 * misturados aos verdadeiros — para quem observa a rede não deduzir nada pelo
 * tamanho dela. Os falsos vêm com contagem ZERO, e é assim que se distinguem.
 *
 * Quem tratar "sufixo presente na lista" como "senha vazada" recusa senhas
 * perfeitamente boas, e o erro é traiçoeiro: só aparece quando o padding calha
 * de gerar o sufixo que interessa, o que é raro e não reproduz.
 */
export function contagemNaResposta(corpo: string, sufixo: string): number {
  const alvo = sufixo.toUpperCase();

  for (const linha of corpo.split("\n")) {
    const [candidato, contagem] = linha.trim().split(":");
    if (candidato?.toUpperCase() !== alvo) continue;

    const vezes = Number.parseInt(contagem ?? "", 10);
    return Number.isFinite(vezes) ? vezes : 0;
  }

  return 0;
}

/**
 * `true` quando a senha aparece em vazamento conhecido.
 *
 * ## Falha ABERTA, de propósito
 *
 * Se o serviço não responder, esta função devolve `false` — ou seja, deixa a
 * pessoa se cadastrar.
 *
 * A escolha inversa parece mais segura e não é. Recusar cadastro porque um
 * terceiro está fora do ar transforma a indisponibilidade DELES em
 * indisponibilidade NOSSA, e a pessoa do outro lado não tem como entender nem
 * contornar: ela lê que a senha é ruim quando o problema é a nossa rede. O que
 * se perde falhando aberto é uma fração das senhas ruins, num intervalo raro; o
 * que se perde falhando fechado é o cadastro inteiro, exatamente quando alguém
 * estava tentando virar cliente.
 *
 * Vale lembrar que esta é uma camada A MAIS: `MINIMO_DA_SENHA` continua valendo
 * sempre, e não depende de rede nenhuma.
 */
export async function senhaFoiVazada(
  senha: string,
  buscar: typeof fetch = fetch,
): Promise<boolean> {
  const { prefixo, sufixo } = partirOHash(senha);

  try {
    const resposta = await buscar(`https://api.pwnedpasswords.com/range/${prefixo}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(ESPERA_MAXIMA_EM_MS),
    });

    if (!resposta.ok) return false;

    return contagemNaResposta(await resposta.text(), sufixo) > 0;
  } catch {
    // Rede fora, tempo esgotado, resposta ilegível: ver "Falha ABERTA" acima.
    return false;
  }
}
