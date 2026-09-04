/**
 * Decide se um dia sem leitura é falha nossa ou resultado honesto do dia.
 *
 * A guarda existe desde 16/08, quando `publicar-posts.ts` gravou 25 posts sem
 * uma única análise e o job ficou verde: o runner não instalava `pdfjs-dist`,
 * a causa era uma só e valia para todos os editais. Vinte e cinco editais
 * independentes não falham todos por acaso.
 *
 * O que ela errava, e este módulo corrige: contava como "tentativa de leitura"
 * o edital que não tinha o que ler. Em 24/08 a execução parou com erro porque
 * o ÚNICO edital fresco do dia era um PDF sem texto extraível (digitalizado).
 * Nada tinha quebrado. O alarme foi falso, e alarme falso repetido é como se
 * desliga uma guarda de verdade.
 *
 * A distinção que importa não é "leu ou não leu": é se chegamos a tentar.
 *
 *  - `semDocumento` — o edital não publicou anexo, ou o PDF não tinha texto.
 *    Nada nosso falhou; não há o que consertar aqui, e é o resultado normal de
 *    um punhado de editais todo dia.
 *  - `fonteIndisponivel` — pedimos a lista de documentos e a fonte não
 *    respondeu. Isso é nosso, ou do PNCP, e nunca é fato sobre o edital.
 *  - `recusadosPeloModelo` — o texto foi extraído e o provedor recusou (quota,
 *    credencial, schema). Isso é nosso.
 *  - `comErro` — download ou extração lançou. Isso também é nosso, e é a forma
 *    exata que a falha de 16/08 tomaria hoje.
 *
 * Só as três últimas contam. Se nenhuma aconteceu, o dia foi honesto.
 *
 * `fonteIndisponivel` entrou depois, e por um defeito real: até 04/09 ele vinha
 * embutido em `semDocumento`, então um dia em que a fonte não respondeu para
 * NENHUM edital contava zero tentativas e passava na guarda. Foi o que
 * aconteceu em 03/09, quando cinco editais deram `lista-indisponivel` em
 * sequência e a leva foi gravada sem uma linha de análise, com a execução
 * verde. Cinco editais independentes não deixam de responder por acaso — que é
 * literalmente a frase de abertura deste módulo, aplicada ao balde errado.
 */
export type ContagemDeLeitura = {
  /** Leituras que produziram análise de verdade nesta execução. */
  lidos: number;
  /** Editais sem nada que se pudesse mandar ao modelo. Fato sobre o edital. */
  semDocumento: number;
  /** A fonte não devolveu a lista de documentos. Isso é nosso. */
  fonteIndisponivel: number;
  /** Texto extraído, provedor recusou. */
  recusadosPeloModelo: number;
  /** Download ou extração lançou exceção. */
  comErro: number;
};

/**
 * Devolve a mensagem da falha sistêmica, ou `null` quando não há falha.
 *
 * Mensagem em vez de booleano porque quem chama precisa dizer ao operador o
 * que aconteceu, e a contagem que justifica o diagnóstico só existe aqui.
 */
export function falhaSistemicaDeLeitura(contagem: ContagemDeLeitura): string | null {
  const { lidos, semDocumento, fonteIndisponivel, recusadosPeloModelo, comErro } = contagem;

  if (lidos > 0) return null;

  const tentativasReais = recusadosPeloModelo + comErro + fonteIndisponivel;
  if (tentativasReais === 0) return null;

  const detalhe = [
    recusadosPeloModelo > 0 ? `${recusadosPeloModelo} recusada(s) pelo provedor de IA` : null,
    fonteIndisponivel > 0 ? `${fonteIndisponivel} sem resposta da fonte ao pedir os documentos` : null,
    comErro > 0 ? `${comErro} com erro de download ou extração` : null,
    semDocumento > 0 ? `${semDocumento} sem documento legível (não conta como tentativa)` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    `nenhuma das ${tentativasReais} tentativa(s) reais de leitura funcionou: ${detalhe}. ` +
    `Isso não é azar: é falha comum a todas, anterior ao edital. Nada foi regravado. ` +
    `As linhas de erro acima ("análise recusada em ..." ou "leitura falhou em ...") dizem a causa.`
  );
}

/** A linha de resumo que vai ao log, com ou sem falha. */
export function resumoDaLeitura(contagem: ContagemDeLeitura & { jaEmCache?: number }): string {
  const partes = [
    contagem.jaEmCache === undefined ? null : `${contagem.jaEmCache} em cache`,
    `${contagem.lidos} lido(s) agora`,
    `${contagem.semDocumento} sem documento legível`,
    `${contagem.fonteIndisponivel} sem resposta da fonte`,
    `${contagem.recusadosPeloModelo} recusado(s) pelo modelo`,
    `${contagem.comErro} com erro`,
  ].filter(Boolean);

  return partes.join(" · ");
}
