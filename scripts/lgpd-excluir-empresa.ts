/**
 * O pedido explícito de exclusão de dados (LGPD, art. 18, IX): apaga
 * documento, atestado, perfil declarado e histórico de triagem de UMA
 * empresa. Roda à mão, quando um pedido chega — não há tela de
 * autoatendimento para isto ainda, e um pedido de exclusão é raro o
 * bastante para não justificar uma.
 *
 *   node scripts/lgpd-excluir-empresa.ts --empresa <uuid> --simular
 *   node scripts/lgpd-excluir-empresa.ts --empresa <uuid>
 *
 * O que NÃO é apagado, de propósito — ver o comentário em
 * `src/lib/lgpd/exclusao.ts`: a linha de `empresas`, `acoes_na_oportunidade`
 * e `eventos_de_auditoria`.
 */

import { abrirClienteLgpd, executarExclusaoLgpd } from "../src/lib/lgpd/exclusao.ts";

const SEM_CONFIGURACAO = 78;
const USO_INCORRETO = 64;

function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}

function valorDaFlag(nome: string): string | null {
  const i = process.argv.indexOf(`--${nome}`);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

async function main() {
  const empresaId = valorDaFlag("empresa");
  if (!empresaId) {
    console.error("uso: node scripts/lgpd-excluir-empresa.ts --empresa <uuid> [--simular]");
    process.exit(USO_INCORRETO);
    return;
  }

  const cliente = abrirClienteLgpd();
  if (!cliente) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a apagar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const simular = temFlag("simular");
  if (simular) {
    console.log(
      `[SIMULAÇÃO] apagaria documentos, atestados, perfil e histórico de triagem da empresa ${empresaId}. ` +
        "Rode sem --simular para executar de verdade.",
    );
    return;
  }

  const resumo = await executarExclusaoLgpd(cliente, empresaId);

  console.log(`empresa ${empresaId} — exclusão concluída:`);
  console.log(`  ${resumo.arquivos} arquivo(s) apagado(s) do Storage`);
  console.log(`  ${resumo.documentos} documento(s) e ${resumo.atestados} atestado(s) apagados`);
  console.log(`  perfil declarado ${resumo.perfilApagado ? "apagado" : "não existia"}`);
  console.log(`  ${resumo.decisoesDeTriagem} decisão(ões) de triagem apagada(s)`);
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
