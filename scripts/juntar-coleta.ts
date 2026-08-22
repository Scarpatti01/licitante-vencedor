/**
 * Junta os parciais de uma coleta paralela num agregado só.
 *
 *   node scripts/juntar-coleta.ts --parciais dados/parciais/shards
 *
 * ## O que este script existe para resolver
 *
 * A coleta sequencial das 6 UFs piloto leva 14 minutos. Medido contra o PNCP em
 * 2026-08-15, o Brasil inteiro são **592 páginas contra 71** — 33 minutos num dia
 * rápido e **117 num dia normal**, contra um teto de 45 no job. Não cabe.
 *
 * Paralelizado por UF, cada shard cuida de um estado e o mais lento define o
 * tempo total. Este script é a outra metade: alguém precisa juntar o que os 27
 * produziram.
 *
 * De quebra, resolve um problema que a versão sequencial tem: hoje o PNCP cair
 * no meio derruba a coleta inteira. Com um job por UF, ele cair derruba UM
 * estado — e os outros 26 publicam normalmente.
 *
 * ## Por que juntar os EDITAIS, e não os agregados
 *
 * Seria mais barato somar 27 agregados prontos. Não daria o mesmo resultado, e a
 * diferença importa:
 *
 * - **A auditoria compara editais entre si.** `marcarValoresSuspeitos` acha o
 *   valor absurdo comparando com os demais da mesma modalidade; rodando por UF,
 *   o corte sairia de 27 conjuntos pequenos e um outlier nacional passaria
 *   despercebido no estado dele.
 * - **A deduplicação é global.** Um edital pode aparecer em duas UFs quando o
 *   órgão é estadual e a unidade compradora fica em outro estado.
 *
 * Custa ~30 MB de artefatos por rodada. É barato para manter a semântica.
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { deduplicar } from "../src/lib/fontes/deduplicacao.ts";
import { resumirCobertura, type ColetaDeUf } from "../src/lib/fontes/cobertura.ts";
import { auditar, relatorioEmTexto } from "../src/lib/pncp/auditoria.ts";
import { marcarValoresSuspeitos, somaConfiavel } from "../src/lib/pncp/normaliza.ts";
import { agregarPorMunicipio } from "../src/lib/pncp/agregarPorMunicipio.ts";
import { atualizarRegistro, normalizarRegistro } from "../src/lib/pncp/registroDePublicacao.ts";
import { classificarColeta, resumirAgregado } from "../src/lib/fontes/degradacao.ts";
import { gravarExecucaoDeColeta } from "../src/lib/fontes/execucoes.ts";
import { fontePncp } from "../src/lib/fontes/pncp.ts";
import type { Edital } from "../src/lib/fontes/tipos.ts";

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

class ErroDeOperacao extends Error {}

type Parcial = {
  coletadoEm?: string;
  cobertura?: { porUf?: ColetaDeUf[] };
  editais?: Edital[];
};

/** Lê o agregado anterior. Ausência não é erro: a primeira coleta não tem. */
async function lerAgregado(caminho: string) {
  try {
    return JSON.parse(await readFile(caminho, "utf8")) as {
      municipios?: { uf?: string; editais?: number }[];
    };
  } catch {
    return null;
  }
}

/** Lê o registro de publicação. Ausência não é erro: o primeiro dia não tem anterior. */
async function lerRegistro(caminho: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(caminho, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const pastaDeParciais = resolve(process.cwd(), arg("parciais") ?? "dados/parciais/shards");
  const caminhoAgregado = resolve(process.cwd(), arg("agregado") ?? "dados/agregados.json");
  const pastaDados = dirname(caminhoAgregado);
  const pastaParciais = resolve(pastaDados, "parciais");
  const caminhoRegistro = resolve(pastaDados, "municipios-publicados.json");

  let arquivos: string[];
  try {
    arquivos = (await readdir(pastaDeParciais)).filter((n) => n.endsWith(".json")).sort();
  } catch {
    throw new ErroDeOperacao(`${pastaDeParciais} não existe — nenhum shard entregou resultado.`);
  }

  if (arquivos.length === 0) {
    throw new ErroDeOperacao(`${pastaDeParciais} está vazia — nenhum shard entregou resultado.`);
  }

  const coletados: Edital[] = [];
  const porUf: ColetaDeUf[] = [];
  const ufs: string[] = [];
  let coletadoEm = "";

  for (const nome of arquivos) {
    let parcial: Parcial;
    try {
      parcial = JSON.parse(await readFile(join(pastaDeParciais, nome), "utf8")) as Parcial;
    } catch (e) {
      /*
       * Um parcial ilegível é a assinatura de um shard morto no meio da escrita.
       * Não pode derrubar a junção — é o mesmo princípio que isola UF na coleta:
       * um estado ruim não custa os outros 26. Ele some da cobertura, e a
       * classificação enxerga a rodada como incompleta, que é o certo.
       */
      console.error(`  ${nome}: ilegível, ignorado (${(e as Error).message.slice(0, 80)})`);
      continue;
    }

    for (const linha of parcial.cobertura?.porUf ?? []) {
      porUf.push(linha);
      if (typeof linha.uf === "string") ufs.push(linha.uf);
    }
    for (const edital of parcial.editais ?? []) coletados.push(edital);

    // O instante da rodada é o do shard que começou primeiro: é ele que
    // descreve a janela de "propostas abertas" que a coleta enxergou.
    const quando = parcial.coletadoEm ?? "";
    if (quando && (!coletadoEm || quando < coletadoEm)) coletadoEm = quando;

    console.log(`  ${nome.padEnd(22)} ${String(parcial.editais?.length ?? 0).padStart(5)} editais`);
  }

  if (coletados.length === 0) {
    throw new ErroDeOperacao(
      `nenhum edital nos ${arquivos.length} parciais. Estado por UF: ` +
        porUf.map((c) => `${c.uf}=${c.estado}`).join("; "),
    );
  }

  const cobertura = resumirCobertura(ufs, porUf);

  const dedup = deduplicar(coletados, { [fontePncp.nome]: fontePncp.precedencia });
  const editais = dedup.editais.sort((a, b) =>
    (a.encerramentoProposta ?? "").localeCompare(b.encerramentoProposta ?? ""),
  );

  const { marcados, corte } = marcarValoresSuspeitos(editais);
  const auditoria = auditar(editais, coletadoEm);

  const agregados = {
    coletadoEm,
    fonte: fontePncp.nome,
    cobertura,
    municipios: agregarPorMunicipio(editais),
  };

  const relatorio = relatorioEmTexto(auditoria, cobertura);

  // A MESMA guarda da coleta sequencial. Paralelizar não pode enfraquecer a
  // regra que impede um dia ruim de apagar um dia bom.
  const anterior = await lerAgregado(caminhoAgregado);
  const classificacao = classificarColeta({
    cobertura,
    atual: resumirAgregado(agregados),
    anterior: anterior ? resumirAgregado(anterior) : null,
  });

  await mkdir(pastaParciais, { recursive: true });
  await writeFile(
    join(pastaParciais, "classificacao.json"),
    JSON.stringify({ coletadoEm, ...classificacao }, null, 1),
    "utf8",
  );

  /*
   * O snapshot que o ALERTA DIÁRIO lê. Sem ele, o e-mail não sai.
   *
   * ## Por que faltava, e por que isso não apareceu antes
   *
   * `enviar-alertas.ts` não recoleta — ele baixa o snapshot que a coleta já
   * produziu, para não dobrar a carga sobre o PNCP e, pior, para não afirmar no
   * e-mail coisas que o site não mostra. Quem produzia esse arquivo era a
   * coleta SEQUENCIAL, e ela deixou de rodar diariamente em 21/08, quando a
   * paralela assumiu. A paralela nunca o escreveu.
   *
   * O defeito ficou invisível por dois dias porque o alerta aceita snapshot com
   * até 36 horas: na sexta ele ainda encontrou o de quinta e mandou o e-mail
   * normalmente. Na segunda o arquivo teria quase cem horas e o envio pararia —
   * sem que nada tivesse "quebrado" naquele dia.
   *
   * Forma idêntica à de `ingerir-pncp.ts` porque quem lê é o mesmo código, e
   * ele confere as duas chaves: `editais` para ter o que enviar, `coletadoEm`
   * para recusar dado velho. Escrever aqui algo "parecido" seria trocar uma
   * falha barulhenta por uma silenciosa.
   */
  await writeFile(
    resolve(pastaDados, "editais.json"),
    // `editais`, e NÃO `marcados`: `marcarValoresSuspeitos` devolve a CONTAGEM
    // de marcados e altera os editais no próprio array. Escrever `marcados`
    // aqui gravaria um número onde o leitor espera a lista — e o `JSON.stringify`
    // aceita numa boa, então nem o compilador reclamaria. O alerta morreria com
    // "sem a lista `editais`", num arquivo que parece perfeitamente normal.
    JSON.stringify({ coletadoEm, fonte: fontePncp.nome, cobertura, editais }, null, 1),
    "utf8",
  );

  // Mesmo registro que a coleta sequencial grava, pela mesma razão — ver o
  // comentário em `ingerir-pncp.ts`. Não derruba a junção por falta ou falha
  // de credencial: o agregado e a revisão já estão gravados a esta altura.
  const urlDoBanco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveDoBanco = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (urlDoBanco && chaveDoBanco) {
    try {
      await gravarExecucaoDeColeta(
        { fonte: fontePncp.nome, coletadoEm, classificacao },
        { url: urlDoBanco, chave: chaveDoBanco },
      );
    } catch (e) {
      console.error(`execucoes_de_coleta: não gravou — ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(
    `\n${arquivos.length} parcial(is) · ${coletados.length} recebidos · ` +
      `${editais.length} após dedup (${dedup.repetidosNaFonte} repetidos) · ` +
      `${marcados} valor(es) suspeito(s)` +
      (Number.isFinite(corte) ? ` acima de ${Math.round(corte).toLocaleString("pt-BR")}` : ""),
  );
  console.log(`valor total confiável: R$ ${somaConfiavel(editais).toLocaleString("pt-BR")}`);

  if (classificacao.preservarAnterior) {
    const dia = coletadoEm.slice(0, 10);
    await writeFile(join(pastaParciais, `agregados-${dia}.json`), JSON.stringify(agregados), "utf8");
    console.log(`\nCOLETA DEGRADADA — o agregado anterior foi PRESERVADO.`);
    for (const m of classificacao.motivos) console.log(`  · ${m}`);
  } else {
    await writeFile(caminhoAgregado, JSON.stringify(agregados), "utf8");
    await writeFile(
      resolve(pastaDados, "revisao.md"),
      `# Revisão da coleta\n\n\`\`\`\n${relatorio}\n\`\`\`\n`,
      "utf8",
    );

    // Mesma guarda do agregado: o registro só cresce, e só a partir de uma
    // coleta que substituiu a série. Ver `src/lib/pncp/registroDePublicacao.ts`.
    const registroAnterior = normalizarRegistro(await lerRegistro(caminhoRegistro));
    const registro = atualizarRegistro(registroAnterior, agregados.municipios);
    await writeFile(caminhoRegistro, JSON.stringify(registro, null, 1) + "\n", "utf8");

    console.log(`\ncoleta ${classificacao.classe} — agregado atualizado: ${agregados.municipios.length} municípios`);
    console.log(`registro de publicação: ${registro.municipios.length} município(s) já tiveram lastro alguma vez`);
    for (const m of classificacao.motivos) console.log(`  · ${m}`);
  }

  console.log(`\n${"─".repeat(72)}\n${relatorio}`);
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
