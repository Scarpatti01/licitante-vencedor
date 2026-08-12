/**
 * Ingestão do PNCP — coleta editais com propostas abertas e grava um snapshot.
 *
 *   node scripts/ingerir-pncp.ts --uf PE,PB,AL --dias 90 --saida dados/editais.json
 *   node scripts/ingerir-pncp.ts --uf PE --max-paginas 2        (teste rápido)
 *
 * Grava JSON e não banco de propósito, nesta etapa. As páginas regionais do
 * blog são estáticas com revalidação: elas precisam de um retrato consistente
 * no build, não de consulta viva. Banco passa a ser necessário quando entrar o
 * lado privado — preferência de usuário, histórico e o classificador — e aí a
 * escolha se faz com o requisito na mão, não por antecipação.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { coletarEditaisAbertos } from "../src/lib/pncp/cliente.ts";
import { ehUtilizavel, marcarValoresSuspeitos, normalizarEdital, somaConfiavel } from "../src/lib/pncp/normaliza.ts";
import type { Edital } from "../src/lib/pncp/tipos.ts";

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** `yyyyMMdd` a N dias de hoje — é o formato que a API exige. */
function dataFinalEm(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

const UFS_PILOTO = ["PE", "PB", "AL", "RN", "CE", "SE"];

async function main() {
  const ufs = (arg("uf") ?? UFS_PILOTO.join(",")).split(",").map((u) => u.trim().toUpperCase());
  const dias = Number(arg("dias") ?? 90);
  const maxPaginas = arg("max-paginas") ? Number(arg("max-paginas")) : undefined;
  const saida = resolve(process.cwd(), arg("saida") ?? "dados/editais.json");
  const dataFinal = dataFinalEm(dias);
  const coletadoEm = new Date().toISOString();

  console.log(`PNCP · propostas abertas até ${dataFinal} · UFs: ${ufs.join(", ")}`);
  if (maxPaginas) console.log(`(modo teste: no máximo ${maxPaginas} páginas por UF)`);

  const porId = new Map<string, Edital>();
  const descartados: Record<string, number> = {};
  let brutos = 0;

  for (const uf of ufs) {
    let daUf = 0;
    process.stdout.write(`  ${uf} `);

    for await (const c of coletarEditaisAbertos({
      uf,
      dataFinal,
      maxPaginas,
      aoProgredir: ({ pagina, totalPaginas }) => {
        if (pagina === 1) process.stdout.write(`(${totalPaginas} pág) `);
        process.stdout.write(".");
      },
      aoEsperar: (motivo, ms) => process.stdout.write(`[${motivo}, aguardando ${Math.round(ms / 1000)}s]`),
    })) {
      brutos++;
      if (!ehUtilizavel(c)) {
        descartados[uf] = (descartados[uf] ?? 0) + 1;
        continue;
      }
      // Dedup por id: um mesmo edital reaparece entre páginas quando o PNCP
      // reordena durante a coleta. Sem isto o mesmo certame vira duas linhas.
      porId.set(c.numeroControlePNCP, normalizarEdital(c, coletadoEm));
      daUf++;
    }
    console.log(` ${daUf}`);
  }

  const editais = [...porId.values()].sort((a, b) =>
    (a.encerramentoProposta ?? "").localeCompare(b.encerramentoProposta ?? ""),
  );

  const { marcados, corte } = marcarValoresSuspeitos(editais);
  const descartadosTotal = Object.values(descartados).reduce((a, b) => a + b, 0);

  const snapshot = {
    fonte: "pncp",
    coletadoEm,
    parametros: { ufs, dataFinal, dias },
    totais: {
      recebidos: brutos,
      utilizaveis: editais.length,
      descartadosPorCampoFaltando: descartadosTotal,
      duplicadosRemovidos: brutos - editais.length - descartadosTotal,
      valoresSuspeitos: marcados,
      corteDeValorSuspeito: Number.isFinite(corte) ? corte : null,
      valorTotalConfiavel: somaConfiavel(editais),
    },
    editais,
  };

  await mkdir(dirname(saida), { recursive: true });
  await writeFile(saida, JSON.stringify(snapshot, null, 1), "utf8");

  console.log(`\nrecebidos ${brutos} · utilizáveis ${editais.length} · descartados ${descartadosTotal} · duplicados ${snapshot.totais.duplicadosRemovidos}`);
  if (marcados) {
    console.log(
      `valores suspeitos marcados: ${marcados} (acima de R$ ${corte.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}) — fora dos agregados, mantidos na listagem`,
    );
  }
  console.log(`valor total confiável: R$ ${somaConfiavel(editais).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`);
  console.log(`gravado em ${saida}`);
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
