import "server-only";

import type { Decisao } from "./webhook.ts";

/**
 * Onde a compra da Hotmart vira acesso.
 *
 * Escreve em `compras_da_jornada` com a chave de serviço, que é a única que
 * pode: a política de RLS da tabela deixa o usuário LER a própria compra e
 * ninguém escrever. Se o usuário pudesse inserir, ele se daria acesso de graça,
 * e é por isso que esta parte mora no servidor.
 *
 * Não cria conta, não manda e-mail, não procura usuário. O acesso vale pelo
 * e-mail desde o instante em que a linha existe — `tem_acesso_a_jornada` faz a
 * junção com `auth.users` na hora da pergunta. Quem comprou e ainda não tem
 * conta encontra o acesso pronto quando criar uma com o mesmo e-mail.
 */

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

function credenciais(): { url: string; chave: string } | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  return url && chave ? { url, chave } : null;
}

/**
 * `efeito` é o que a rota registra no log, e o vocabulário é deliberado:
 * `revogada-antes-da-compra` é a lápide, o caso do aviso fora de ordem, e ele
 * aparece separado justamente para ser possível notar que aconteceu.
 *
 * `nada-a-revogar` saiu: enquanto ele existia, um reembolso sem compra
 * correspondente terminava em silêncio, que era o defeito.
 *
 * `aprovada-apos-revogacao` existe só para deixar de ser silêncio também. Ver
 * `gravarCompra`.
 */
export type Resultado =
  | {
      ok: true;
      efeito:
        | "gravada"
        | "repetida"
        | "revogada"
        | "revogada-antes-da-compra"
        | "ja-revogada"
        | "aprovada-apos-revogacao";
    }
  | { ok: false; motivo: string };

/**
 * Grava a compra, tratando reentrega como sucesso.
 *
 * A idempotência vem do banco, e não de uma consulta prévia que teria corrida
 * entre duas entregas simultâneas do mesmo evento. O que mudou é COMO o banco
 * avisa que já tinha a transação.
 *
 * ## O QUE EU AFIRMEI ERRADO, E O QUE A PRODUÇÃO MOSTROU
 *
 * Este comentário dizia que `Prefer: resolution=ignore-duplicates` faria o
 * PostgREST devolver 201 com lista vazia. Não faz. Sem `on_conflict=` na URL,
 * o PostgREST usa a CHAVE PRIMÁRIA como alvo do conflito, e aqui a chave
 * primária é `id`, gerado a cada tentativa. O índice único de
 * `referencia_externa` nunca é o alvo, então a violação sobe como erro:
 *
 *     POST | 409 | .../rest/v1/compras_da_jornada     (log do PostgREST, 08/09 21:53)
 *
 * Treze reentregas da Hotmart, treze 409, treze 503 devolvidos a ela, e uma
 * fila de retentativa que não terminaria nunca — sobre uma compra que já
 * estava gravada desde 21:45.
 *
 * ## POR QUE NÃO É SÓ PÔR `on_conflict=referencia_externa`
 *
 * Porque o índice é PARCIAL (`WHERE referencia_externa IS NOT NULL`), e o
 * Postgres não infere índice parcial sem o predicado junto. Testado contra o
 * banco de produção:
 *
 *     ERROR: 42P10: there is no unique or exclusion constraint
 *            matching the ON CONFLICT specification
 *
 * O PostgREST não tem como mandar o predicado. Então a saída não é ensinar o
 * alvo a ele: é ler o 409 pelo que ele significa.
 *
 * ## POR QUE 409 AQUI SÓ PODE SER DUPLICATA
 *
 * O PostgREST responde 409 para violação de unicidade e para violação de chave
 * estrangeira. Esta tabela tem uma única chave estrangeira, `usuario_id`, e
 * NENHUMA inserção daqui manda `usuario_id`. Logo, 409 aqui é a transação já
 * registrada, que é exatamente o sucesso que a reentrega deveria produzir.
 *
 * Esse raciocínio depende de continuar assim, e é por isso que
 * `repositorio.test.ts` cobra `usuario_id` fora de TODA inserção: quem
 * acrescentar a coluna reprova, e a mensagem manda revisitar o 409 junto.
 */
async function inserir(linha: Record<string, unknown>, oQue: string): Promise<Resultado> {
  const cred = credenciais();
  if (!cred) return { ok: false, motivo: "sem-credencial" };

  const resposta = await fetch(`${cred.url}/rest/v1/compras_da_jornada`, {
    method: "POST",
    headers: {
      apikey: cred.chave,
      authorization: `Bearer ${cred.chave}`,
      "content-type": "application/json",
      // `resolution=ignore-duplicates` saiu daqui: ele mira a chave primária,
      // que nunca conflita, e a sua presença sugeria uma proteção inexistente.
      prefer: "return=representation",
    },
    body: JSON.stringify([linha]),
    cache: "no-store",
  });

  // A transação já estava registrada. É reentrega, e reentrega é sucesso: 503
  // aqui faria a Hotmart insistir para sempre numa compra que já foi gravada.
  if (resposta.status === 409) return { ok: true, efeito: "repetida" };

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error(`Hotmart: não ${oQue}`, resposta.status, detalhe);
    return { ok: false, motivo: `banco-${resposta.status}` };
  }

  const gravadas = (await resposta.json().catch(() => [])) as unknown[];
  return { ok: true, efeito: gravadas.length > 0 ? "gravada" : "repetida" };
}

/**
 * Como está a compra desta transação, se ela existe.
 *
 * Só serve para instrumentação, e por isso engole todo erro devolvendo `null`:
 * uma consulta de log que falhe não pode derrubar a gravação de uma compra.
 */
async function situacaoDaCompra(
  referencia: string,
): Promise<{ revogadaEm: string | null; motivo: string | null } | null> {
  const cred = credenciais();
  if (!cred) return null;

  try {
    const alvo =
      `${cred.url}/rest/v1/compras_da_jornada` +
      `?referencia_externa=eq.${encodeURIComponent(referencia)}` +
      `&select=revogado_em,motivo_da_revogacao`;

    const resposta = await fetch(alvo, {
      headers: { apikey: cred.chave, authorization: `Bearer ${cred.chave}` },
      cache: "no-store",
    });
    if (!resposta.ok) return null;

    const linhas = (await resposta.json()) as Array<{
      revogado_em: string | null;
      motivo_da_revogacao: string | null;
    }>;
    const linha = linhas?.[0];
    if (!linha) return null;

    return { revogadaEm: linha.revogado_em, motivo: linha.motivo_da_revogacao };
  } catch {
    return null;
  }
}

/**
 * Grava a compra, e avisa alto quando ela chega sobre uma transação revogada.
 *
 * ## POR QUE ESTE AVISO EXISTE
 *
 * Compra aprovada sobre uma transação já revogada NÃO devolve acesso, e isso é
 * decisão, não esquecimento: religar automático devolveria o produto a quem deu
 * chargeback, e esse erro é silencioso e a favor de quem não pagou, enquanto o
 * contrário é barulhento e se conserta com um UPDATE.
 *
 * O problema é que a decisão foi tomada sem dado. A documentação da Hotmart, em
 * "Boas práticas de uso", não diz se ela reenvia `PURCHASE_APPROVED` para uma
 * transação reembolsada, estornada ou expirada. Conferido em 08/09: não está
 * lá, nem na página de códigos de resposta do webhook.
 *
 * Sem este aviso, o caso é indistinguível de uma reentrega comum: os dois
 * respondem 200 com efeito `repetida`, e a primeira ocorrência real passaria
 * sem deixar rastro. O dono só saberia pela reclamação de quem ficou de fora.
 *
 * ## O QUE FAZER QUANDO ELE APARECER
 *
 * A saída certa não é escolher uma política no escuro, é a que a própria
 * Hotmart recomenda naquela página: o webhook avisa que algo aconteceu, e a API
 * dela responde como a coisa está agora. Com a ocorrência em mãos, dá para
 * decidir se vale montar a autenticação de API para consultar o status real.
 *
 * ## A INSTRUMENTAÇÃO NÃO PODE QUEBRAR A COMPRA
 *
 * A consulta é feita DEPOIS da gravação e o seu resultado só muda o log. Se ela
 * falhar, o efeito volta a ser `repetida` e a resposta continua 200. Log que
 * derruba pagamento é pior que log nenhum.
 */
async function gravarCompra(email: string, referencia: string): Promise<Resultado> {
  const resultado = await inserir(
    { email, origem: "compra", referencia_externa: referencia },
    "gravou a compra",
  );

  // Só o 409 interessa: é ele que diz que a transação já estava registrada.
  if (!resultado.ok || resultado.efeito !== "repetida") return resultado;

  const situacao = await situacaoDaCompra(referencia);
  if (!situacao?.revogadaEm) return resultado;

  console.warn(
    "Hotmart: COMPRA APROVADA chegou para transação JÁ REVOGADA, e o acesso",
    "continua desligado.",
    "transação:", referencia,
    "revogada em:", situacao.revogadaEm,
    "motivo:", situacao.motivo,
  );
  return { ok: true, efeito: "aprovada-apos-revogacao" };
}

/**
 * Revoga a compra de uma transação.
 *
 * Filtra por `revogado_em is null` para a segunda entrega do mesmo reembolso
 * não sobrescrever a data da primeira: a data que interessa é a de quando o
 * dinheiro voltou, não a da última vez que a Hotmart avisou.
 *
 * ## QUANDO NÃO HÁ O QUE REVOGAR, A REVOGAÇÃO É GRAVADA MESMO ASSIM
 *
 * Webhook chega fora de ordem, porque o que falha é reentregue depois. Se o
 * reembolso chegar ANTES da compra aprovada da mesma transação, a versão
 * anterior deste código fazia isto:
 *
 *   1. o reembolso não achava linha para revogar, e respondia 200;
 *   2. a Hotmart considerava entregue e parava de reentregar;
 *   3. a compra aprovada chegava depois e criava a linha DO ZERO, sem
 *      revogação nenhuma.
 *
 * Acesso liberado numa compra reembolsada, para sempre, e sem nada em lugar
 * nenhum indicando isso. É o erro caro: silencioso e a favor de quem não pagou.
 *
 * A saída é gravar a revogação como uma linha já revogada. A compra aprovada
 * atrasada esbarra no índice único de `referencia_externa`, vira 200 sem
 * efeito, e o acesso nunca liga. `tem_acesso_a_jornada` só olha se
 * `revogado_em` é nulo, então a linha existir não dá acesso a ninguém.
 *
 * A ordem importa e é esta: PATCH primeiro, inserção só se ele não achou nada.
 * O contrário criaria a linha e depois a revogaria, com uma janela entre as
 * duas em que o acesso estaria valendo.
 */
async function revogarCompra(
  email: string,
  referencia: string,
  motivo: string,
): Promise<Resultado> {
  const cred = credenciais();
  if (!cred) return { ok: false, motivo: "sem-credencial" };

  const alvo =
    `${cred.url}/rest/v1/compras_da_jornada` +
    `?referencia_externa=eq.${encodeURIComponent(referencia)}&revogado_em=is.null`;

  const agora = new Date().toISOString();

  const resposta = await fetch(alvo, {
    method: "PATCH",
    headers: {
      apikey: cred.chave,
      authorization: `Bearer ${cred.chave}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify({ revogado_em: agora, motivo_da_revogacao: motivo }),
    cache: "no-store",
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("Hotmart: não revogou a compra", resposta.status, detalhe);
    return { ok: false, motivo: `banco-${resposta.status}` };
  }

  const mexidas = (await resposta.json().catch(() => [])) as unknown[];
  if (mexidas.length > 0) return { ok: true, efeito: "revogada" };

  /*
   * Zero linhas quer dizer uma de duas coisas, e as duas terminam bem aqui: ou
   * a linha já estava revogada, e a inserção bate no índice único e vira 200
   * sem efeito; ou ela ainda não existe, e a lápide impede que a compra
   * aprovada atrasada libere acesso.
   */
  const lapide = await inserir(
    {
      email,
      origem: "compra",
      referencia_externa: referencia,
      revogado_em: agora,
      motivo_da_revogacao: motivo,
    },
    "gravou a revogação sem compra",
  );
  if (!lapide.ok) return lapide;
  return { ok: true, efeito: lapide.efeito === "gravada" ? "revogada-antes-da-compra" : "ja-revogada" };
}

export async function aplicar(decisao: Decisao): Promise<Resultado> {
  if (decisao.fazer === "ignorar") return { ok: true, efeito: "repetida" };
  if (decisao.fazer === "liberar") return gravarCompra(decisao.email, decisao.referencia);
  return revogarCompra(decisao.email, decisao.referencia, decisao.motivo);
}
