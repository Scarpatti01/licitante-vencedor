import "server-only";

/**
 * Limite de taxa em memória, com os limites declarados.
 *
 * Ele existe porque a captura passou a gravar de verdade. Enquanto
 * `gravarLead` era um stub, inundar `/api/alerta` não produzia nada; com
 * destino configurado, um robô enche a tabela de leads em minutos e envenena a
 * única métrica que diz qual conteúdo converte.
 *
 * **O que este limitador NÃO é.** O estado vive no processo. Em serverless, há
 * várias instâncias e elas nascem e morrem — então o teto real é por instância,
 * e um atacante distribuído passa. Isso está escrito aqui em vez de escondido:
 * um limitador que se apresenta como garantia e não é, é pior que nenhum,
 * porque desliga a vigilância de quem opera.
 *
 * **O que ele é.** O custo de um flood ingênuo de uma origem só, que é o caso
 * comum de formulário público, e uma trava que já existe quando o volume
 * justificar trocar por um contador compartilhado (Redis, ou uma função no
 * próprio Postgres). Somado ao honeypot e à unicidade de e-mail no banco, cobre
 * o abuso realista de um site deste tamanho.
 */

type Janela = { contagem: number; expiraEm: number };

const JANELAS = new Map<string, Janela>();

/** Teto de chaves distintas guardadas. Impede o mapa de virar vazamento. */
const MAXIMO_DE_CHAVES = 10_000;

export type ResultadoDoLimite = {
  permitido: boolean;
  /** Segundos até a janela virar. Vai no cabeçalho `Retry-After`. */
  esperarSegundos: number;
};

export function dentroDoLimite(
  chave: string,
  { maximo, janelaSegundos }: { maximo: number; janelaSegundos: number },
  agora: number = Date.now(),
): ResultadoDoLimite {
  const registro = JANELAS.get(chave);

  if (!registro || registro.expiraEm <= agora) {
    if (JANELAS.size >= MAXIMO_DE_CHAVES) limpar(agora);
    JANELAS.set(chave, { contagem: 1, expiraEm: agora + janelaSegundos * 1000 });
    return { permitido: true, esperarSegundos: 0 };
  }

  registro.contagem++;
  if (registro.contagem > maximo) {
    return {
      permitido: false,
      esperarSegundos: Math.max(1, Math.ceil((registro.expiraEm - agora) / 1000)),
    };
  }
  return { permitido: true, esperarSegundos: 0 };
}

function limpar(agora: number): void {
  for (const [chave, janela] of JANELAS) {
    if (janela.expiraEm <= agora) JANELAS.delete(chave);
  }
  // Se a limpeza não liberou nada, todas as janelas estão vivas: descarta a
  // mais antiga para o mapa não crescer sem fim. Perder uma contagem é melhor
  // que consumir memória do processo até ele cair.
  if (JANELAS.size >= MAXIMO_DE_CHAVES) {
    const primeira = JANELAS.keys().next();
    if (!primeira.done) JANELAS.delete(primeira.value);
  }
}

/**
 * Quem está chamando, do ponto de vista do limitador.
 *
 * `x-forwarded-for` é falsificável em geral, mas na Vercel o cabeçalho é
 * reescrito na borda e o primeiro endereço é o do cliente real. Fora dela, o
 * pior caso é o limite virar por-cabeçalho em vez de por-IP — degradação, não
 * brecha, já que nada aqui autoriza nada.
 */
export function identificarChamador(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconhecido";
}

/** Só para teste: zera o estado entre casos. */
export function esquecerTudo(): void {
  JANELAS.clear();
}
