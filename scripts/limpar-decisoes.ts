/**
 * Apaga as decisões de triagem cujo edital já não interessa a ninguém.
 *
 *   node scripts/limpar-decisoes.ts --simular   (só conta)
 *   node scripts/limpar-decisoes.ts             (apaga)
 *
 * Roda como passo da coleta, depois de gravar. A ordem importa: limpar antes de
 * coletar apagaria o que a coleta desta madrugada acabou de decidir sobre
 * editais que encerraram ontem, e é justamente na manhã seguinte que o cliente
 * abre o e-mail e pergunta por que não foi avisado.
 *
 * ## Por que ele NÃO faz a limpeza sozinho, em SQL puro
 *
 * A regra de quantos dias mora em `lib/retencao/decisoes.ts`, em TypeScript,
 * porque ela é decisão de produto e é testada lá. Este script é só o braço: ele
 * carrega o número de lá e passa para a função do banco. Se alguém mudar
 * `DIAS_APOS_ENCERRAMENTO`, a limpeza muda junto sem ninguém editar SQL.
 *
 * ## O silêncio que este script se recusa a fazer
 *
 * Nas primeiras semanas ele vai apagar ZERO, e isso é correto: a coleta começou
 * em 16/08, então nenhum edital encerrou há mais de trinta dias ainda. O
 * problema é que uma limpeza que apaga zero é indistinguível de uma limpeza
 * quebrada. Por isso ele sempre imprime quantas decisões existem, quantas estão
 * na mira e quantas saíram — três números, e não só o último.
 */

import { DIAS_APOS_ENCERRAMENTO } from "../src/lib/retencao/decisoes.ts";

const SEM_CONFIGURACAO = 78;

/**
 * Quantas linhas por chamada.
 *
 * Um `DELETE` de um milhão de linhas numa transação só segura lock demais e
 * incha o WAL. Cinco mil é uma transação curta que o autovacuum consegue
 * seguir, e o laço abaixo repete até secar.
 */
const LOTE = 5_000;

/**
 * Teto de chamadas numa execução.
 *
 * Não é para limitar a limpeza: é para um defeito na função do banco (um
 * `where` que nunca casa e devolve o mesmo lote para sempre) virar um job que
 * termina com erro em vez de um laço infinito segurando a coleta a noite toda.
 */
const MAXIMO_DE_RODADAS = 400;

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
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a limpar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  async function rpc(funcao: string, corpo: Record<string, unknown>): Promise<number> {
    const resposta = await fetch(`${url}/rest/v1/rpc/${funcao}`, {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify(corpo),
    });
    if (!resposta.ok) {
      throw new Error(`${funcao}: supabase recusou ${resposta.status} ${await resposta.text()}`);
    }
    return Number(await resposta.json());
  }

  const naMira = await rpc("contar_decisoes_expiradas", { dias: DIAS_APOS_ENCERRAMENTO });

  console.log(
    `retenção: ${DIAS_APOS_ENCERRAMENTO} dias após o encerramento do edital · ` +
      `${naMira.toLocaleString("pt-BR")} decisão(ões) na mira`,
  );

  if (simular) {
    console.log("[SIMULAÇÃO] nada foi apagado.");
    return;
  }

  let apagadas = 0;
  let rodadas = 0;

  for (; rodadas < MAXIMO_DE_RODADAS; rodadas++) {
    const nesta = await rpc("limpar_decisoes_expiradas", {
      dias: DIAS_APOS_ENCERRAMENTO,
      teto: LOTE,
    });
    apagadas += nesta;
    if (nesta === 0) break;
  }

  if (rodadas >= MAXIMO_DE_RODADAS) {
    console.error(
      `::error title=Limpeza não secou::${MAXIMO_DE_RODADAS} rodadas de ${LOTE} e ainda havia o que apagar. ` +
        "Ou a tabela cresceu muito além do previsto, ou a função do banco está devolvendo o mesmo lote.",
    );
    process.exit(1);
  }

  console.log(
    `${apagadas.toLocaleString("pt-BR")} decisão(ões) apagada(s) em ${rodadas} rodada(s).`,
  );

  /*
   * O aviso que evita um chamado de suporte contra nós mesmos: `DELETE` no
   * Postgres não devolve espaço ao disco. O autovacuum libera para reuso dentro
   * da tabela, então ela para de crescer, mas o medidor do Supabase não desce.
   * Sem esta linha, alguém confere depois da primeira limpeza, vê o número
   * parado e conclui que o script não funcionou.
   */
  if (apagadas > 0) {
    console.log(
      "obs: o espaço volta para reuso dentro da tabela, não para o disco. " +
        "O tamanho relatado pelo Supabase fica parado; o que muda é que ele para de subir.",
    );
  }
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
