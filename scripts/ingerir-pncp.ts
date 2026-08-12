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
import { auditar, relatorioEmTexto } from "../src/lib/pncp/auditoria.ts";
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

  // Uma UF que falha não pode derrubar a coleta inteira. O PNCP saiu do ar no
  // meio do piloto de 2026-08-12 e levou junto tudo que já tinha sido coletado.
  // Agora cada UF é isolada: o que deu certo fica, o que falhou é declarado no
  // snapshot e no relatório. Cobertura parcial anunciada é utilizável; coleta
  // perdida, não.
  const falhas: { uf: string; erro: string }[] = [];

  for (const uf of ufs) {
    let daUf = 0;
    process.stdout.write(`  ${uf} `);

    try {
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
    } catch (e) {
      const erro = e instanceof Error ? e.message : String(e);
      falhas.push({ uf, erro });
      console.log(` INTERROMPIDA após ${daUf} — ${erro}`);
    }
  }

  if (porId.size === 0) {
    throw new Error(
      `nenhuma UF pôde ser coletada. Falhas: ${falhas.map((f) => `${f.uf} (${f.erro})`).join("; ")}`,
    );
  }

  const editais = [...porId.values()].sort((a, b) =>
    (a.encerramentoProposta ?? "").localeCompare(b.encerramentoProposta ?? ""),
  );

  const { marcados, corte } = marcarValoresSuspeitos(editais);
  const descartadosTotal = Object.values(descartados).reduce((a, b) => a + b, 0);

  // A revisão roda SEMPRE, antes de o snapshot existir. Coleta não publicada
  // sem revisão é a regra desta etapa, e o relatório vai junto do dado —
  // inclusive quando não acha nada, porque "revisado e limpo" também é
  // informação para quem lê.
  const auditoria = auditar(editais, coletadoEm);

  const snapshot = {
    fonte: "pncp",
    coletadoEm,
    parametros: { ufs, dataFinal, dias },
    cobertura: {
      ufsSolicitadas: ufs,
      ufsColetadas: ufs.filter((u) => !falhas.some((f) => f.uf === u)),
      ufsComFalha: falhas,
      completa: falhas.length === 0,
    },
    totais: {
      recebidos: brutos,
      utilizaveis: editais.length,
      descartadosPorCampoFaltando: descartadosTotal,
      duplicadosRemovidos: brutos - editais.length - descartadosTotal,
      valoresSuspeitos: marcados,
      corteDeValorSuspeito: Number.isFinite(corte) ? corte : null,
      valorTotalConfiavel: somaConfiavel(editais),
    },
    auditoria,
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

  // Dois artefatos versionados, e um não. O snapshot inteiro fica fora do
  // repositório — 3,6 MB por dia só das 6 UFs piloto é insustentável. O que
  // entra no git é o agregado por município (93 KB, e a série de commits diários
  // vira, de graça, o histórico de 12 meses que a página regional precisa) e o
  // relatório de revisão, que é o que dá rastro público às incoerências.
  const porMunicipio = new Map<string, {
    uf: string; municipio: string; slug: string; ibge: string;
    editais: number; valor: number; orgaos: Set<string>; modalidades: Record<string, number>;
  }>();

  for (const e of editais) {
    const chave = `${e.local.uf}/${e.local.municipioSlug}`;
    let m = porMunicipio.get(chave);
    if (!m) {
      m = { uf: e.local.uf, municipio: e.local.municipio, slug: e.local.municipioSlug,
            ibge: e.local.codigoIbge, editais: 0, valor: 0, orgaos: new Set(), modalidades: {} };
      porMunicipio.set(chave, m);
    }
    m.editais++;
    if (!e.valorSuspeito) m.valor += e.valorEstimado ?? 0;
    m.orgaos.add(e.orgao.cnpj);
    m.modalidades[e.modalidade] = (m.modalidades[e.modalidade] ?? 0) + 1;
  }

  const agregados = {
    coletadoEm,
    cobertura: snapshot.cobertura,
    municipios: [...porMunicipio.values()]
      .map((m) => ({ ...m, valor: Math.round(m.valor), orgaos: m.orgaos.size }))
      .sort((a, b) => b.editais - a.editais),
  };
  await writeFile(resolve(dirname(saida), "agregados.json"), JSON.stringify(agregados), "utf8");

  const relatorio = relatorioEmTexto(auditoria, snapshot.cobertura);
  await writeFile(resolve(dirname(saida), "revisao.md"), `# Revisão da coleta\n\n\`\`\`\n${relatorio}\n\`\`\`\n`, "utf8");
  console.log(`\nagregado: ${agregados.municipios.length} municípios`);
  console.log(`\n${"─".repeat(72)}\n${relatorio}`);
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
