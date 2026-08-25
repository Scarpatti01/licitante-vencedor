/**
 * Grava o retrato dos editais abertos em `dados/abertos.json`.
 *
 *   node scripts/publicar-abertos.ts --simular   (só imprime os números)
 *   node scripts/publicar-abertos.ts             (grava o arquivo)
 *
 * Roda como passo da coleta, junto com o agregado e os posts, e é commitado
 * pelo mesmo passo — sob a mesma trava: se a coleta foi recusada por
 * degradação, nada disto é versionado, e o retrato anterior fica no ar. Um
 * retrato de coleta pela metade seria pior que um retrato de ontem, porque
 * pareceria igualmente novo.
 *
 * ## O que este script NÃO usa, de propósito
 *
 * A leitura de IA. Ela lê alguns editais por dia, custa por edital e serve à
 * análise do cliente. Esta página mostra o que a COLETA já trouxe — os 28.995
 * abertos estão no banco de graça. Usar a leitura aqui seria pagar 29 mil
 * análises para preencher uma listagem que ninguém pediu analisada.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { abrirRepositorio } from "../src/lib/triagem/repositorio.ts";
import {
  EDITAIS_NO_BRASIL,
  EDITAIS_POR_UF,
  type EditalAberto,
  type RetratoDeAbertos,
  type UfAberta,
} from "../src/lib/abertos/tipos.ts";

const SEM_CONFIGURACAO = 78;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}

function recorte(e: {
  id: string;
  objeto: string;
  orgao: { nome: string };
  local: { uf: string; municipio: string; municipioSlug: string };
  modalidade: string;
  valorEstimado: number | null;
  valorSuspeito: boolean;
  publicadoEm: string | null;
  encerramentoProposta: string | null;
  link: string;
}): EditalAberto {
  return {
    id: e.id,
    objeto: e.objeto,
    orgao: e.orgao.nome,
    uf: e.local.uf,
    municipio: e.local.municipio,
    municipioSlug: e.local.municipioSlug,
    modalidade: e.modalidade,
    /*
     * Valor suspeito não vai para a tela. `fontes/tipos.ts` explica: a fonte
     * tem erro de digitação, e um pregão de mobiliário declarado a R$ 77,84
     * bilhões destrói a credibilidade da página exatamente onde ela deveria ser
     * provada. O edital continua listado; só o número dele não é afirmado.
     */
    valorEstimado: e.valorSuspeito ? null : e.valorEstimado,
    publicadoEm: e.publicadoEm,
    encerramentoProposta: e.encerramentoProposta as string,
    link: e.link,
  };
}

async function main() {
  const simular = temFlag("simular");

  const repositorio = abrirRepositorio();
  if (!repositorio) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a gravar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const agora = new Date();
  const abertos = await repositorio.editaisAbertos(agora);

  // Sem `encerramentoProposta` não dá para dizer que está aberto nem marcar o
  // fim no relógio de quem lê. Fora da listagem, e contado à parte para a
  // ausência não virar silêncio.
  const comPrazo = abertos.filter((a) => a.edital.encerramentoProposta);
  const semPrazo = abertos.length - comPrazo.length;

  const limiteDeNovos = agora.getTime() - UM_DIA_MS;
  const limiteDeEncerramento = agora.getTime() + UM_DIA_MS;

  const ehNovo = (e: { publicadoEm: string | null }) =>
    e.publicadoEm !== null && new Date(e.publicadoEm).getTime() > limiteDeNovos;
  const encerraLogo = (e: { encerramentoProposta: string | null }) =>
    new Date(e.encerramentoProposta as string).getTime() <= limiteDeEncerramento;

  const porUf = new Map<string, typeof comPrazo>();
  for (const a of comPrazo) {
    const lista = porUf.get(a.edital.local.uf) ?? [];
    lista.push(a);
    porUf.set(a.edital.local.uf, lista);
  }

  const maisUrgentesPrimeiro = (a: (typeof comPrazo)[number], b: (typeof comPrazo)[number]) =>
    new Date(a.edital.encerramentoProposta as string).getTime() -
    new Date(b.edital.encerramentoProposta as string).getTime();

  const ufs: UfAberta[] = [...porUf.entries()]
    .map(([uf, lista]) => ({
      uf,
      abertos: lista.length,
      novos: lista.filter((a) => ehNovo(a.edital)).length,
      encerramEm24h: lista.filter((a) => encerraLogo(a.edital)).length,
      editais: [...lista].sort(maisUrgentesPrimeiro).slice(0, EDITAIS_POR_UF).map((a) => recorte(a.edital)),
    }))
    .sort((a, b) => b.abertos - a.abertos);

  const retrato: RetratoDeAbertos = {
    coletadoEm: agora.toISOString(),
    totais: {
      abertos: comPrazo.length,
      novos: comPrazo.filter((a) => ehNovo(a.edital)).length,
      encerramEm24h: comPrazo.filter((a) => encerraLogo(a.edital)).length,
    },
    ufs,
    encerrandoAgora: [...comPrazo].sort(maisUrgentesPrimeiro).slice(0, EDITAIS_NO_BRASIL).map((a) => recorte(a.edital)),
  };

  console.log(
    `${retrato.totais.abertos} aberto(s) · ${retrato.totais.novos} novo(s) nas últimas 24h · ` +
      `${retrato.totais.encerramEm24h} encerra(m) nas próximas 24h · ${ufs.length} UF(s)` +
      (semPrazo > 0 ? ` · ${semPrazo} sem prazo publicado, fora da listagem` : ""),
  );

  if (simular) {
    console.log("[SIMULAÇÃO] nada foi gravado.");
    return;
  }

  const destino = resolve(process.cwd(), "dados", "abertos.json");
  await mkdir(resolve(process.cwd(), "dados"), { recursive: true });
  await writeFile(destino, JSON.stringify(retrato, null, 2) + "\n");
  console.log(`retrato gravado em ${destino}`);
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
