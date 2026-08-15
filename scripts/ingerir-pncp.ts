/**
 * Ingestão de editais — coleta o que está com proposta aberta e grava snapshot,
 * agregado e relatório de revisão.
 *
 *   node scripts/ingerir-pncp.ts --uf PE,PB,AL --dias 90 --saida dados/editais.json
 *   node scripts/ingerir-pncp.ts --uf PE --max-paginas 2        (teste rápido)
 *   node scripts/ingerir-pncp.ts --orcamento-min 20             (corta cedo, de propósito)
 *
 * O nome do arquivo ainda diz "pncp" porque o cron e a documentação apontam
 * para ele, mas o script já não conhece o PNCP: ele fala com `FonteDeEditais`
 * (`src/lib/fontes/`) e o PNCP é a implementação que está plugada.
 *
 * Grava JSON e não banco de propósito, nesta etapa. As páginas regionais do
 * blog são estáticas com revalidação: elas precisam de um retrato consistente
 * no build, não de consulta viva. Banco passa a ser necessário quando entrar o
 * lado privado — preferência de usuário, histórico e o classificador — e aí a
 * escolha se faz com o requisito na mão, não por antecipação.
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fontePncp } from "../src/lib/fontes/pncp.ts";
import { classificarUf, resumirCobertura, type ColetaDeUf } from "../src/lib/fontes/cobertura.ts";
import { classificarColeta, resumirAgregado } from "../src/lib/fontes/degradacao.ts";
import { deduplicar } from "../src/lib/fontes/deduplicacao.ts";
import { marcarValoresSuspeitos, somaConfiavel } from "../src/lib/pncp/normaliza.ts";
import { auditar, relatorioEmTexto } from "../src/lib/pncp/auditoria.ts";
import { gravarEditais } from "../src/lib/editais/gravar.ts";
import type { Edital } from "../src/lib/fontes/tipos.ts";

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

/**
 * Orçamento de tempo, em minutos, para a coleta inteira.
 *
 * DEFEITO CORRIGIDO AQUI: a execução de 2026-08-13 levou ~43 minutos contra o
 * `timeout-minutes: 45` do workflow. Um run só um pouco mais lento morre no
 * meio — e morrendo no meio ele não grava NADA: nem snapshot, nem agregado, nem
 * relatório. Perde-se inclusive o que já tinha sido coletado, que é o cenário
 * que a coleta isolada por UF existia justamente para evitar.
 *
 * A escolha foi orçamento de tempo, e não paralelismo entre UFs. Paralelizar
 * contra o PNCP é o caminho mais curto para o 429: o cliente é sequencial por
 * medição (a 350ms entre páginas o portal cortou depois de ~26 páginas), e
 * disparar 6 UFs juntas multiplica por 6 a taxa que já se sabe estar no limite.
 * Trocaríamos um defeito raro (run lento) por um frequente (bloqueio).
 *
 * Com orçamento, o run lento vira coleta PARCIAL declarada em vez de morte
 * súbita — e cobertura parcial agora é um estado de primeira classe, que o
 * relatório sabe descrever e a guarda de degradação sabe avaliar. 30 minutos
 * contra 45 do workflow deixa folga para gravar tudo e ainda commitar.
 */
const ORCAMENTO_PADRAO_MIN = 30;

async function main() {
  const ufs = (arg("uf") ?? UFS_PILOTO.join(",")).split(",").map((u) => u.trim().toUpperCase());
  const dias = Number(arg("dias") ?? 90);
  const maxPaginas = arg("max-paginas") ? Number(arg("max-paginas")) : undefined;
  const orcamentoMin = Number(arg("orcamento-min") ?? ORCAMENTO_PADRAO_MIN);
  const saida = resolve(process.cwd(), arg("saida") ?? "dados/editais.json");
  const pastaDados = dirname(saida);
  const pastaParciais = resolve(pastaDados, arg("parciais") ?? "parciais");
  const dataFinal = dataFinalEm(dias);
  const coletadoEm = new Date().toISOString();
  const prazoGlobal = Date.now() + orcamentoMin * 60_000;

  const fonte = fontePncp;

  console.log(`${fonte.rotulo} · propostas abertas até ${dataFinal} · UFs: ${ufs.join(", ")}`);
  console.log(`orçamento de tempo: ${orcamentoMin} min para a coleta inteira`);
  if (maxPaginas) console.log(`(modo teste: no máximo ${maxPaginas} páginas por UF)`);

  // O agregado anterior é lido ANTES de qualquer escrita: ele é o que está no
  // diretório, ou seja, o último agregado versionado (o workflow faz checkout).
  // É contra ele que a guarda de degradação compara.
  const caminhoAgregado = resolve(pastaDados, "agregados.json");
  const anterior = await lerAgregado(caminhoAgregado);

  const coletados: Edital[] = [];
  const descartados: Record<string, number> = {};
  const resultadosPorUf: ColetaDeUf[] = [];
  let brutos = 0;

  // Uma UF que falha não pode derrubar a coleta inteira. O PNCP saiu do ar no
  // meio do piloto de 2026-08-12 e levou junto tudo que já tinha sido coletado.
  // Agora cada UF é isolada, e termina em um de três estados — completa,
  // parcial ou falha. O parcial é o que faltava: uma UF interrompida DEPOIS de
  // entregar editais tinha o dado mantido e a coleta declarada como falha
  // total, o que fez o relatório de 13/08 negar exatamente as duas UFs que
  // sustentavam os números.
  for (const [i, uf] of ufs.entries()) {
    if (!fonte.cobre(uf)) {
      resultadosPorUf.push(classificarUf({ uf, editais: 0, motivo: `${fonte.rotulo} não cobre esta UF` }));
      console.log(`  ${uf} — fora da abrangência de ${fonte.nome}`);
      continue;
    }

    const restanteMs = prazoGlobal - Date.now();
    if (restanteMs <= 0) {
      resultadosPorUf.push(
        classificarUf({ uf, editais: 0, motivo: `orçamento de ${orcamentoMin} min esgotado antes de começar esta UF` }),
      );
      console.log(`  ${uf} — pulada: orçamento de tempo esgotado`);
      continue;
    }

    // Reparte o que sobrou entre as UFs que faltam. Quem termina rápido devolve
    // o tempo para as seguintes, sem cota fixa que desperdiça.
    // `floor` na origem: a divisão pelo número de UFs restantes produz
    // milissegundo fracionário, e prazo fracionário já quebrou a coleta inteira
    // uma vez ao chegar em `setTimeout`. O cliente também se defende disso, e
    // as duas guardas são baratas.
    const prazoDaUf = Math.floor(Date.now() + restanteMs / (ufs.length - i));
    const idsDaUf = new Set<string>();
    let motivo: string | null = null;

    process.stdout.write(`  ${uf} `);

    try {
      for await (const e of fonte.coletar({
        uf,
        dataFinal,
        maxPaginas,
        coletadoEm,
        // O prazo agora vai para dentro da fonte, e é o que de fato corta.
        // A conferência abaixo continua, mas passou a ser a segunda linha:
        // ela só roda depois de um edital sair, e o caso que quebrou a coleta
        // de 13/08 foi justamente o da UF que não conseguia produzir nenhum.
        prazo: prazoDaUf,
        aoReceber: () => brutos++,
        aoDescartar: () => {
          descartados[uf] = (descartados[uf] ?? 0) + 1;
        },
        aoProgredir: ({ pagina, totalPaginas }) => {
          if (pagina === 1) process.stdout.write(`(${totalPaginas} pág) `);
          process.stdout.write(".");
        },
        aoEsperar: (m, ms) => process.stdout.write(`[${m}, aguardando ${Math.round(ms / 1000)}s]`),
      })) {
        coletados.push(e);
        idsDaUf.add(e.id);

        if (Date.now() > prazoDaUf) {
          // Quebrar o `for await` encerra o gerador da fonte — a conexão em
          // curso é abandonada e a paginação para. É o motivo de a porta
          // devolver `AsyncIterable` e não array.
          motivo = `orçamento de tempo da UF esgotado (${orcamentoMin} min para ${ufs.length} UFs)`;
          break;
        }
      }
    } catch (e) {
      motivo = e instanceof Error ? e.message : String(e);
    }

    const resultado = classificarUf({ uf, editais: idsDaUf.size, motivo });
    resultadosPorUf.push(resultado);
    console.log(
      resultado.estado === "completa"
        ? ` ${resultado.editais}`
        : ` ${resultado.estado.toUpperCase()} com ${resultado.editais} — ${motivo}`,
    );
  }

  const cobertura = resumirCobertura(ufs, resultadosPorUf);

  if (coletados.length === 0) {
    // Sem nada coletado não há o que classificar, e sair com erro é o certo: o
    // agregado anterior fica onde está (não foi tocado) e o job vermelho é o
    // que efetivamente avisa alguém. A mensagem descreve TODAS as UFs, e não só
    // as que falharam — uma rodada em que todas terminaram vazias é um
    // diagnóstico bem diferente de uma em que todas caíram.
    throw new Error(
      `nenhum edital coletado. Estado por UF: ${cobertura.porUf
        .map((c) => `${c.uf}=${c.estado}${c.motivo ? ` (${c.motivo})` : ""}`)
        .join("; ")}`,
    );
  }

  // Deduplicação em um lugar só, com nome e com teste. Ver o comentário de
  // `deduplicacao.ts`: hoje ela é quase trivial porque só há uma fonte, e é
  // agora que o lugar precisa existir.
  const dedup = deduplicar(coletados, { [fonte.nome]: fonte.precedencia });
  const editais = dedup.editais.sort((a, b) =>
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
    fonte: fonte.nome,
    coletadoEm,
    parametros: { ufs, dataFinal, dias, orcamentoMin },
    cobertura,
    totais: {
      recebidos: brutos,
      utilizaveis: editais.length,
      descartadosPorCampoFaltando: descartadosTotal,
      repetidosNaFonte: dedup.repetidosNaFonte,
      fundidosEntreFontes: dedup.fundidosEntreFontes,
      valoresSuspeitos: marcados,
      corteDeValorSuspeito: Number.isFinite(corte) ? corte : null,
      valorTotalConfiavel: somaConfiavel(editais),
    },
    auditoria,
    editais,
  };

  await mkdir(dirname(saida), { recursive: true });
  await writeFile(saida, JSON.stringify(snapshot, null, 1), "utf8");

  console.log(
    `\nrecebidos ${brutos} · utilizáveis ${editais.length} · descartados ${descartadosTotal} · repetidos ${dedup.repetidosNaFonte}`,
  );
  if (marcados) {
    console.log(
      `valores suspeitos marcados: ${marcados} (acima de R$ ${corte.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}) — fora dos agregados, mantidos na listagem`,
    );
  }
  console.log(`valor total confiável: R$ ${somaConfiavel(editais).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`);
  console.log(`gravado em ${saida}`);

  /*
   * E, quando houver credencial, o mesmo lote vai para o Postgres.
   *
   * O JSON continua sendo gravado sempre e não vira legado: ele é o artefato de
   * auditoria da rodada, a entrada das páginas regionais estáticas e o que o
   * alerta lê hoje. O banco é o que torna possível o lado privado — triagem e
   * oportunidades só existem com o edital cruzável com o perfil de cada empresa.
   *
   * Grava mesmo quando a coleta veio degradada, ao contrário do commit do
   * agregado. Não é incoerência: o upsert nunca apaga, então um dia ruim não
   * tem como desfazer um dia bom aqui. O agregado é substituído, o edital é
   * acrescentado.
   *
   * Sem credencial, não é erro nem aviso barulhento: é o estado normal de quem
   * roda a coleta na própria máquina para inspecionar o JSON.
   */
  const urlDoBanco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveDoBanco = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (urlDoBanco && chaveDoBanco) {
    const gravacao = await gravarEditais(editais, { url: urlDoBanco, chave: chaveDoBanco });
    console.log(`banco: ${gravacao.gravados}/${editais.length} editais gravados`);

    for (const falha of gravacao.falhas) {
      console.error(`  lote ${falha.lote} falhou: ${falha.motivo}`);
    }

    // Falha de gravação não derruba o run — o JSON já está salvo e a coleta
    // custou meia hora contra um serviço instável. Mas sai como aviso visível,
    // e o resumo acima diz exatamente quantos ficaram de fora.
    if (gravacao.falhas.length > 0) {
      console.error(`banco: ${gravacao.falhas.length} lote(s) não gravados — ver acima`);
    }
  } else {
    console.log("banco: sem credencial, nada gravado (só o JSON)");
  }

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
    fonte: fonte.nome,
    cobertura,
    municipios: [...porMunicipio.values()]
      .map((m) => ({ ...m, valor: Math.round(m.valor), orgaos: m.orgaos.size }))
      .sort((a, b) => b.editais - a.editais),
  };

  const relatorio = relatorioEmTexto(auditoria, cobertura);

  // A guarda: uma coleta degradada NÃO substitui a série. Ver `degradacao.ts`.
  const classificacao = classificarColeta({
    cobertura,
    atual: resumirAgregado(agregados),
    anterior: anterior ? resumirAgregado(anterior) : null,
  });

  await mkdir(pastaParciais, { recursive: true });
  // O veredito sai em arquivo, e não só em stdout, porque quem age sobre ele é
  // o workflow — e casar decisão de commit com `grep` na saída do console é
  // frágil do jeito que já custou caro aqui.
  await writeFile(
    join(pastaParciais, "classificacao.json"),
    JSON.stringify({ coletadoEm, ...classificacao }, null, 1),
    "utf8",
  );

  if (classificacao.preservarAnterior) {
    const dia = coletadoEm.slice(0, 10);
    await writeFile(join(pastaParciais, `agregados-${dia}.json`), JSON.stringify(agregados), "utf8");
    await writeFile(
      join(pastaParciais, `revisao-${dia}.md`),
      `# Revisão da coleta (DEGRADADA — não substituiu o agregado)\n\n${classificacao.motivos.map((m) => `- ${m}`).join("\n")}\n\n\`\`\`\n${relatorio}\n\`\`\`\n`,
      "utf8",
    );
    console.log(`\nCOLETA DEGRADADA — o agregado anterior foi PRESERVADO.`);
    for (const m of classificacao.motivos) console.log(`  · ${m}`);
    console.log(`resultado desta rodada gravado em ${pastaParciais}/ (fora do versionamento)`);
  } else {
    await writeFile(caminhoAgregado, JSON.stringify(agregados), "utf8");
    await writeFile(
      resolve(pastaDados, "revisao.md"),
      `# Revisão da coleta\n\n\`\`\`\n${relatorio}\n\`\`\`\n`,
      "utf8",
    );
    console.log(`\ncoleta ${classificacao.classe} — agregado atualizado: ${agregados.municipios.length} municípios`);
    for (const m of classificacao.motivos) console.log(`  · ${m}`);
  }

  console.log(`\n${"─".repeat(72)}\n${relatorio}`);
}

/** Lê o agregado do disco. Ausência não é erro: a primeira coleta não tem anterior. */
async function lerAgregado(caminho: string) {
  try {
    return JSON.parse(await readFile(caminho, "utf8")) as { municipios?: { uf?: string; editais?: number }[] };
  } catch {
    return null;
  }
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
