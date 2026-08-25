/**
 * Encerra os testes cujo prazo acabou.
 *
 *   node scripts/encerrar-testes.ts --simular   (só conta)
 *   node scripts/encerrar-testes.ts             (encerra)
 *
 * Roda ANTES do envio do resumo, e a ordem é a decisão: quem teve o teste
 * encerrado hoje não pode receber o e-mail de hoje. Encerrar depois de enviar
 * daria um dia a mais de produto a cada pessoa, todo dia, para sempre — e, pior,
 * mandaria um e-mail que promete um painel que a pessoa já não consegue abrir.
 *
 * ## Por que ele existe
 *
 * `assinaturas.teste_termina_em` existia desde o começo e NINGUÉM lia. Um teste
 * de 14 dias sem este script é o plano gratuito com passos a mais.
 */

import { DIAS_DE_TESTE } from "../src/lib/assinatura/teste.ts";

const SEM_CONFIGURACAO = 78;

function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

async function main() {
  const simular = temFlag("simular");

  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a encerrar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  /*
   * A contagem é feita ANTES, e é o que o `--simular` mostra. Chamar a função
   * de encerrar com um teto zero devolveria zero sempre, e simulação que sempre
   * diz "nada a fazer" dá confiança falsa antes de rodar de verdade.
   */
  const agora = new Date().toISOString();
  const consulta = new URLSearchParams({
    select: "id",
    status: "eq.teste",
    teste_termina_em: `lte.${agora}`,
  });

  const resposta = await fetch(`${url}/rest/v1/assinaturas?${consulta}`, { headers: cabecalhos });
  if (!resposta.ok) {
    throw new Error(`assinaturas: supabase respondeu ${resposta.status} ${await resposta.text()}`);
  }
  const aVencer = ((await resposta.json()) as unknown[]).length;

  console.log(`teste de ${DIAS_DE_TESTE} dias · ${aVencer} assinatura(s) com prazo vencido`);

  if (simular) {
    console.log("[SIMULAÇÃO] nada foi encerrado.");
    return;
  }

  const rpc = await fetch(`${url}/rest/v1/rpc/encerrar_testes_vencidos`, {
    method: "POST",
    headers: cabecalhos,
    body: "{}",
  });
  if (!rpc.ok) {
    throw new Error(`encerrar_testes_vencidos: supabase recusou ${rpc.status} ${await rpc.text()}`);
  }

  const encerradas = Number(await rpc.json());
  console.log(`${encerradas} teste(s) encerrado(s).`);

  /*
   * Divergir aqui não é fatal, mas é sinal: alguém assinou entre a contagem e a
   * chamada, ou a régua do script e a da função do banco discordam. A segunda
   * hipótese é a que custa caro, e o log é o que permite notá-la.
   */
  if (encerradas !== aVencer) {
    console.warn(
      `::warning title=Contagem divergiu::contei ${aVencer} e a função encerrou ${encerradas}. ` +
        "Se repetir, a régua do script e a do banco não são a mesma.",
    );
  }
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
