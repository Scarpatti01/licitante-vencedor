/**
 * Confere se o preço publicado e o preço cobrado são o mesmo número.
 *
 *   node scripts/conferir-precos.ts
 *
 * ## Por que este script existe
 *
 * Os valores moram em DOIS lugares, e isso é deliberado: `src/lib/precos.ts`
 * serve a página `/precos/`, que é estática de propósito — é marketing, precisa
 * ser rápida e indexável, e não abre conexão com o banco; a tabela `planos`
 * serve a cobrança, que precisa de linha editável sem deploy.
 *
 * Dois domicílios para o mesmo número é exatamente a forma de erro que
 * `cobertura.ts` documenta: ninguém escreve o valor errado: alguém atualiza UM
 * dos dois e o outro continua publicado, bonito e falso. Só que aqui a versão
 * falsa não é uma frase de marketing envelhecida — é o site anunciando R$ 800 e
 * a fatura chegando com outro valor, que é a maneira mais rápida de perder um
 * cliente e ganhar uma disputa no banco.
 *
 * Nenhum teste pega isso: o `vitest` roda sem banco, e o banco é metade da
 * comparação. Por isso é script, e por isso ele falha com código de saída
 * diferente de zero — para poder virar passo de workflow sem virar enfeite.
 */

import { PLANOS, divergenciasDePreco, type PlanoNoBanco } from "../src/lib/precos.ts";

const SEM_CONFIGURACAO = 78;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chave) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a conferir.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const consulta = new URLSearchParams({
    select: "codigo,ativo,mensalidade_em_centavos,limite_de_empresas",
  });
  const resposta = await fetch(`${url}/rest/v1/planos?${consulta}`, {
    headers: { apikey: chave, Authorization: `Bearer ${chave}` },
  });
  if (!resposta.ok) {
    throw new Error(`planos: supabase recusou ${resposta.status} ${await resposta.text()}`);
  }

  const divergencias = divergenciasDePreco((await resposta.json()) as PlanoNoBanco[]);

  if (divergencias.length > 0) {
    console.error("::error::preço publicado diverge do preço cobrado");
    for (const d of divergencias) console.error(`  - ${d}`);
    process.exit(1);
    return;
  }

  console.log(`ok: ${PLANOS.length} plano(s) conferem entre /precos/ e a tabela planos.`);
  for (const plano of PLANOS) {
    console.log(
      `  ${plano.codigo}: ${plano.mensalidadeEmCentavos} centavos, até ${plano.empresas} empresa(s)`,
    );
  }
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
