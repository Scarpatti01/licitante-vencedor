/**
 * Se dá para receber aviso de venda da Hotmart, e com que segredo.
 *
 * Mesmo desenho de `pagamento/configuracao.ts`, e pela mesma razão: o padrão é
 * DESLIGADO, e sem o segredo a rota responde 503 em vez de aceitar qualquer
 * POST.
 *
 * O que um webhook aberto significa aqui é concreto: qualquer pessoa que
 * descubra o endereço manda um JSON dizendo "fulano@exemplo.com comprou" e
 * ganha o produto de graça, para sempre, sem passar por lugar nenhum que cobre.
 *
 * ## O `hottok` NÃO é assinatura, e a diferença importa
 *
 * A Stripe assina o corpo: o segredo prova que aquele conteúdo veio dela e não
 * foi alterado no caminho. A Hotmart manda um token fixo num cabeçalho, o
 * `hottok`, que só prova que quem chamou conhece o token. É mais fraco, e é o
 * que ela oferece.
 *
 * Duas consequências que o código respeita: a comparação é feita em tempo
 * constante, para não vazar o token caractere a caractere por diferença de
 * tempo; e o token nunca aparece em log nem em resposta de erro.
 *
 * O valor é criado pelo dono no painel da Hotmart e guardado como variável de
 * ambiente na Vercel. Ele não mora no repositório e não passa por conversa.
 */

const HOTTOK = "HOTMART_HOTTOK";

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

export function segredoDaHotmart(): string | null {
  return env(HOTTOK);
}

/**
 * Compara em tempo constante.
 *
 * `a === b` sai no primeiro caractere diferente, e a diferença de tempo entre
 * "errou no primeiro" e "errou no último" é medível pela rede. Com token de
 * 32 caracteres isso é o bastante para adivinhá-lo em algumas centenas de
 * milhares de tentativas, que é barato para quem quer o produto de graça.
 */
export function tokenConfere(recebido: string | null, esperado: string): boolean {
  if (!recebido) return false;

  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  // Comprimentos diferentes vazam por si, então a conta é feita sobre o
  // esperado e o resultado só é verdadeiro quando os dois batem inteiros.
  let diferenca = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) {
    diferenca |= (a[i] ?? 0) ^ b[i];
  }
  return diferenca === 0;
}
