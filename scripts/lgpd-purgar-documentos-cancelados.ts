/**
 * A varredura de carência: apaga documento e atestado de toda empresa cuja
 * assinatura mais recente encerrou há mais que `DIAS_DE_GRACA_APOS_
 * CANCELAMENTO` dias. Nunca toca no histórico de triagem — ver o
 * comentário em `src/lib/lgpd/retencao.ts` sobre por que as duas trilhas
 * têm prazo diferente.
 *
 *   node scripts/lgpd-purgar-documentos-cancelados.ts --simular
 *   node scripts/lgpd-purgar-documentos-cancelados.ts
 *
 * Disparo manual só, por enquanto (`workflow_dispatch`, sem `cron`): a
 * tabela `assinaturas` está vazia até existir cobrança de verdade (ver
 * `docs/produto/roadmap.md`, Fase 5), e agendar uma varredura contra uma
 * tabela sempre vazia é betão sem viga — o dia de ligar o cron é o dia em
 * que a primeira assinatura for cancelada de verdade.
 */

import { abrirClienteLgpd, purgarDocumentosDeEmpresasCanceladas } from "../src/lib/lgpd/exclusao.ts";

const SEM_CONFIGURACAO = 78;

function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}

async function main() {
  const cliente = abrirClienteLgpd();
  if (!cliente) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a purgar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const agora = new Date();
  const simular = temFlag("simular");

  if (simular) {
    const vencidas = await cliente.empresasComPrazoDeGracaVencido(agora);
    console.log(
      vencidas.length === 0
        ? "[SIMULAÇÃO] nenhuma empresa com o prazo de carência vencido — nada seria apagado."
        : `[SIMULAÇÃO] apagaria documento e atestado de ${vencidas.length} empresa(s): ${vencidas.join(", ")}.`,
    );
    return;
  }

  const resultados = await purgarDocumentosDeEmpresasCanceladas(cliente, agora);

  if (resultados.length === 0) {
    console.log("nenhuma empresa com o prazo de carência vencido — nada apagado.");
    return;
  }

  console.log(`${resultados.length} empresa(s) purgada(s):`);
  for (const { empresaId, resumo } of resultados) {
    console.log(
      `  ${empresaId}: ${resumo.arquivos} arquivo(s), ${resumo.documentos} documento(s), ${resumo.atestados} atestado(s)`,
    );
  }
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
