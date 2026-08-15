/**
 * Escolhe os editais do dia e grava a leva que vira post.
 *
 *   node scripts/publicar-posts.ts                 # grava dados/posts/HOJE.json
 *   node scripts/publicar-posts.ts --limite 10
 *   node scripts/publicar-posts.ts --simular       # mostra a escolha, não grava
 *
 * Roda DEPOIS da coleta, lendo do Postgres — que a essa altura já recebeu os
 * editais do dia. Ler do banco e não do snapshot é deliberado: o banco tem o
 * acumulado, então um edital publicado ontem e ainda aberto continua elegível
 * hoje, enquanto o snapshot só tem a varredura da rodada.
 *
 * ## O que este script NÃO faz
 *
 * Não analisa o edital com IA. A leitura é o que dá valor ao post, e ela precisa
 * de `GEMINI_API_KEY` — enquanto ela não existir, o post sai com o contexto que
 * conseguimos afirmar sem modelo nenhum: o retrato do mercado daquele município,
 * o prazo de impugnação e o que a modalidade exige. É menos do que queremos, e é
 * verdade — que é a ordem certa das duas coisas.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { selecionarDoDia, POSTS_POR_DIA } from "../src/lib/posts/selecao.ts";
import { slugDoPost } from "../src/lib/posts/slug.ts";
import type { LevaDoDia, PostDeEdital } from "../src/lib/posts/tipos.ts";
import type { Edital } from "../src/lib/fontes/tipos.ts";

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const temFlag = (nome: string) => process.argv.includes(`--${nome}`);

class ErroDeOperacao extends Error {}

/** Uma linha de `editais` no vocabulário do projeto. */
function paraEdital(linha: Record<string, unknown>): Edital {
  return {
    id: String(linha.id_canonico),
    fonte: String(linha.fonte),
    idNaFonte: String(linha.id_na_fonte),
    objeto: String(linha.objeto ?? ""),
    orgao: {
      cnpj: String(linha.orgao_cnpj ?? ""),
      nome: String(linha.orgao_nome ?? ""),
      esfera: (linha.orgao_esfera ?? "desconhecida") as Edital["orgao"]["esfera"],
    },
    local: {
      uf: String(linha.uf ?? ""),
      municipio: String(linha.municipio ?? ""),
      municipioSlug: String(linha.municipio_slug ?? ""),
      codigoIbge: String(linha.codigo_ibge ?? ""),
    },
    modalidade: String(linha.modalidade ?? ""),
    modoDisputa: (linha.modo_disputa as string) ?? null,
    instrumento: (linha.instrumento as string) ?? null,
    amparoLegal: (linha.amparo_legal as string) ?? null,
    registroDePrecos: linha.registro_de_precos === true,
    valorEstimado: typeof linha.valor_estimado === "string"
      ? Number(linha.valor_estimado)
      : (linha.valor_estimado as number) ?? null,
    valorEstimadoBruto: null,
    valorSuspeito: linha.valor_suspeito === true,
    aberturaProposta: (linha.abertura_proposta as string) ?? null,
    encerramentoProposta: (linha.encerramento_proposta as string) ?? null,
    publicadoEm: (linha.publicado_em as string) ?? null,
    situacao: (linha.situacao as string) ?? null,
    link: String(linha.link ?? ""),
    coletadoEm: String(linha.coletado_em ?? ""),
  } as Edital;
}

/**
 * Busca os candidatos no banco.
 *
 * O filtro grosso vai na consulta — só o que ainda está aberto — porque trazer
 * as dezenas de milhares de linhas fechadas para descartar em JavaScript seria
 * desperdício de rede. O filtro fino fica em `selecionarDoDia`, que é puro e
 * testado.
 */
async function candidatos(url: string, chave: string): Promise<Edital[]> {
  const agora = new Date().toISOString();
  const destino =
    `${url}/rest/v1/editais` +
    `?select=*&encerramento_proposta=gt.${agora}` +
    `&order=encerramento_proposta.asc&limit=5000`;

  const resposta = await fetch(destino, {
    headers: { apikey: chave, authorization: `Bearer ${chave}` },
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new ErroDeOperacao(`banco recusou a leitura: ${resposta.status} ${corpo.slice(0, 200)}`);
  }

  const linhas = (await resposta.json()) as Record<string, unknown>[];
  return linhas.map(paraEdital);
}

function paraPost(edital: Edital, postadoEm: string): PostDeEdital {
  return {
    slug: slugDoPost(edital),
    editalId: edital.id,
    objeto: edital.objeto,
    orgao: edital.orgao.nome,
    modalidade: edital.modalidade,
    valorEstimado: edital.valorEstimado as number,
    registroDePrecos: edital.registroDePrecos,
    uf: edital.local.uf,
    municipio: edital.local.municipio,
    municipioSlug: edital.local.municipioSlug,
    codigoIbge: edital.local.codigoIbge,
    publicadoEm: edital.publicadoEm,
    encerramentoProposta: edital.encerramentoProposta as string,
    coletadoEm: edital.coletadoEm,
    postadoEm,
  link: edital.link,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new ErroDeOperacao(
      "sem NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY — não há de onde ler os editais.",
    );
  }

  const limite = Number(arg("limite") ?? POSTS_POR_DIA);
  const simular = temFlag("simular");
  const agora = new Date();
  const dia = agora.toISOString().slice(0, 10);

  const editais = await candidatos(url, chave);
  console.log(`${editais.length} editais abertos no banco`);

  const { escolhidos, recusas } = selecionarDoDia(editais, { limite, agora });

  console.log(`\nescolhidos: ${escolhidos.length}`);
  for (const [motivo, n] of Object.entries(recusas).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${motivo.padEnd(22)} ${n}`);
  }

  console.log("");
  for (const e of escolhidos) {
    const valor = (e.valorEstimado ?? 0).toLocaleString("pt-BR", {
      style: "currency", currency: "BRL", maximumFractionDigits: 0,
    });
    console.log(`  ${e.local.municipio}/${e.local.uf} · ${valor.padStart(16)} · ${e.objeto.slice(0, 58)}`);
  }

  const leva: LevaDoDia = {
    dia,
    consideradosNoDia: editais.length,
    posts: escolhidos.map((e) => paraPost(e, agora.toISOString())),
  };

  if (simular) {
    console.log("\nSIMULAÇÃO — nada gravado.");
    return;
  }

  const destino = resolve(process.cwd(), "dados/posts", `${dia}.json`);
  await mkdir(resolve(process.cwd(), "dados/posts"), { recursive: true });
  await writeFile(destino, JSON.stringify(leva, null, 2) + "\n");
  console.log(`\nleva gravada em ${destino}`);
}

main().catch((e) => {
  console.error(e instanceof ErroDeOperacao ? e.message : e);
  process.exit(1);
});
