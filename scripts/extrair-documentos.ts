/**
 * Baixa e extrai os documentos dos editais de um snapshot.
 *
 *   node scripts/extrair-documentos.ts --limite 20
 *   node scripts/extrair-documentos.ts --editais dados/editais.json --limite 50
 *   node scripts/extrair-documentos.ts --limite 20 --simular   (não grava registro)
 *
 * É a ligação entre a coleta e a análise: até aqui o pipeline parava no nível
 * da publicação — objeto, valor, prazo — sem nunca ler o edital. Este script é
 * o que produz o texto.
 *
 * ## Onde mora o registro, e por que num arquivo
 *
 * O incremental precisa lembrar o que já baixou. O destino final é
 * `documentos_do_edital` no Postgres, cujo esquema já existe e já prevê isto
 * (a restrição `anexo_unico_por_edital` está lá exatamente para não repagar
 * extração). Enquanto a gravação no banco não está ligada, o registro vai para
 * um JSON em `dados/parciais/`, fora do versionamento.
 *
 * A escolha é deliberada e tem prazo de validade: um arquivo local não serve
 * para produção — dois runners não compartilham. Serve para o incremental ser
 * REAL desde já em execução local, em vez de existir só em teste. Trocar por
 * banco é implementar `registro`/`gravar`; nada mais neste arquivo muda.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { listarDocumentos, baixarDocumento } from "../src/lib/documentos/pncp.ts";
import { processarFila, type EditalParaProcessar, type Portas, type ResultadoDoEdital } from "../src/lib/documentos/processar.ts";
import type { RegistroDeDocumentos } from "../src/lib/documentos/incremental.ts";

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const temFlag = (nome: string) => process.argv.includes(`--${nome}`);

class ErroDeOperacao extends Error {}

async function main() {
  const caminhoDoSnapshot = resolve(process.cwd(), arg("editais") ?? "dados/editais.json");
  const limite = Number(arg("limite") ?? 20);
  const simular = temFlag("simular");
  const caminhoDoRegistro = resolve(
    dirname(caminhoDoSnapshot),
    arg("registro") ?? "parciais/documentos.json",
  );

  let bruto: string;
  try {
    bruto = await readFile(caminhoDoSnapshot, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
      throw new ErroDeOperacao(
        `${caminhoDoSnapshot} não existe — num clone novo isso é o esperado: o ` +
          "snapshot é artefato da coleta.\n\n" +
          "  npm run pncp:ingerir -- --uf PE --dias 20\n",
      );
    }
    throw e;
  }

  const snapshot = JSON.parse(bruto) as { editais?: unknown };
  if (!Array.isArray(snapshot.editais)) {
    throw new ErroDeOperacao(`${caminhoDoSnapshot}: sem a lista \`editais\`.`);
  }

  const editais: EditalParaProcessar[] = snapshot.editais
    .map((e) => e as Record<string, unknown>)
    .filter((e) => typeof e.id === "string" && typeof e.idNaFonte === "string")
    .map((e) => ({
      id: e.id as string,
      idNaFonte: e.idNaFonte as string,
      encerramentoProposta:
        typeof e.encerramentoProposta === "string" ? e.encerramentoProposta : null,
    }))
    .slice(0, limite);

  const registros: Record<string, RegistroDeDocumentos> = await readFile(caminhoDoRegistro, "utf8")
    .then((t) => JSON.parse(t))
    .catch(() => ({}));

  const jaConhecidos = Object.keys(registros).length;
  console.log(`${editais.length} editais (de ${snapshot.editais.length} no snapshot)`);
  console.log(`registro: ${jaConhecidos} edital(is) já processado(s) antes${simular ? " · SIMULAÇÃO, nada será gravado" : ""}\n`);

  const portas: Portas = {
    listar: listarDocumentos,
    baixar: baixarDocumento,
    registro: async (edital) => registros[edital.id] ?? null,
    /*
     * Sem carteira ligada, tudo interessa. É o padrão HONESTO para este
     * estágio: filtrar por uma triagem que ainda não tem clientes esconderia
     * todos os editais e faria o script parecer quebrado. Quando a triagem
     * estiver ligada, esta linha vira a consulta dela — e é aqui que os ~93%
     * viram economia de verdade em produção.
     */
    interessaAAlguem: async () => true,
    gravar: simular
      ? undefined
      : async (edital, resultado) => {
          if (resultado.processado) {
            registros[edital.id] = {
              assinatura: resultado.assinatura,
              baixadoEm: new Date().toISOString(),
            };
          }
        },
  };

  const resumo = await processarFila(editais, portas, (feito, total, r) => {
    const cabecalho = `[${String(feito).padStart(3)}/${total}]`;
    if (r.processado) {
      const recusas = Object.entries(r.recusas).map(([m, n]) => `${n} ${m}`).join(", ");
      console.log(
        `${cabecalho} ${r.documentos.length} doc · ${String(r.paginas).padStart(4)} pág · ` +
          `${String(Math.round(r.caracteres / 1000)).padStart(4)}k chars${recusas ? ` · ${recusas}` : ""}`,
      );
    } else {
      console.log(`${cabecalho} — ${r.motivo}${"detalhe" in r && r.detalhe ? ` (${r.detalhe})` : ""}`);
    }
  });

  if (!simular) {
    await mkdir(dirname(caminhoDoRegistro), { recursive: true });
    await writeFile(caminhoDoRegistro, JSON.stringify(registros, null, 2));
  }

  console.log("\n" + "─".repeat(60));
  console.log(`processados ......... ${resumo.processados} de ${resumo.editais}`);
  console.log(`páginas ............. ${resumo.paginas.toLocaleString("pt-BR")}`);
  console.log(`caracteres .......... ${resumo.caracteres.toLocaleString("pt-BR")}`);

  if (Object.keys(resumo.pulados).length > 0) {
    console.log(`\nnão processados, por motivo:`);
    for (const [motivo, n] of Object.entries(resumo.pulados).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${motivo.padEnd(22)} ${n}`);
    }
  }

  if (Object.keys(resumo.recusas).length > 0) {
    console.log(`\ndocumentos que não renderam texto:`);
    for (const [motivo, n] of Object.entries(resumo.recusas).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${motivo.padEnd(22)} ${n}`);
    }
  }

  if (!simular) console.log(`\nregistro gravado em ${caminhoDoRegistro}`);
}

main().catch((e) => {
  console.error(e instanceof ErroDeOperacao ? e.message : e);
  process.exit(1);
});
