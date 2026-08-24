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
 * ## A leitura, que é o que justifica o post existir
 *
 * Para cada escolhido, o script baixa os documentos publicados, extrai o texto e
 * manda para a análise. Sem isso a página seria o objeto do edital copiado do
 * PNCP — e a fonte oficial sempre ranqueia melhor que a cópia dela.
 *
 * O custo é pequeno porque o volume é pequeno: 25 editais a ~4 MB e ~84 páginas
 * cada dão ~100 MB de download e ~20 segundos de extração. É a diferença entre
 * ler 25 e ler os 3.444 — e é a razão de a torneira ser estreita.
 *
 * **Sem `GEMINI_API_KEY` o script não simula nada.** Ele publica os posts sem
 * análise e diz quantos ficaram assim. Post sem leitura é mais magro; post com
 * leitura inventada é fraude.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { selecionarDoDia, POSTS_POR_DIA } from "../src/lib/posts/selecao.ts";
import { slugDoPost } from "../src/lib/posts/slug.ts";
import type { LevaDoDia, PostDeEdital } from "../src/lib/posts/tipos.ts";
import type { Edital } from "../src/lib/fontes/tipos.ts";
import { abrirRepositorioDeIA } from "../src/lib/ia/repositorio.ts";
import type { ExecucaoDeIA } from "../src/lib/ia/custo.ts";
import { lerEAnalisar } from "../src/lib/ia/lerEdital.ts";
import { falhaSistemicaDeLeitura, resumoDaLeitura } from "../src/lib/ia/falhaSistemica.ts";

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
const POR_PAGINA = 1000;

async function candidatos(url: string, chave: string): Promise<Edital[]> {
  const agora = new Date().toISOString();

  /*
   * Paginado, e não `limit=5000`, porque o `limit` MENTIA.
   *
   * O PostgREST tem um teto próprio de linhas por resposta — 1.000 nesta
   * instância — e ele vence qualquer `limit` maior pedido na URL. Sem erro, sem
   * cabeçalho de aviso: a resposta simplesmente vem cortada.
   *
   * O corte não seria grave se fosse aleatório. Ele é o pior possível: a
   * consulta ordena por `encerramento_proposta.asc`, então as 1.000 linhas que
   * chegavam eram exatamente as de prazo MAIS CURTO — e `motivoDaRecusa`
   * descarta prazo abaixo de 3 dias. Medido em 16/08: das 1.000 recebidas, 643
   * foram recusadas por "prazo-curto-demais", enquanto 2.108 editais elegíveis
   * existiam no banco e nunca foram considerados.
   *
   * Ou seja: a seleção pescava no pior lago, jogava fora dois terços do que
   * pegava, e escolhia os 25 do dia entre as sobras — sem que nada no log
   * indicasse que 2/3 do acervo estava fora de alcance.
   */
  const todos: Record<string, unknown>[] = [];
  for (let inicio = 0; ; inicio += POR_PAGINA) {
    const destino =
      `${url}/rest/v1/editais` +
      `?select=*&encerramento_proposta=gt.${agora}` +
      `&order=encerramento_proposta.asc` +
      `&limit=${POR_PAGINA}&offset=${inicio}`;

    const resposta = await fetch(destino, {
      headers: { apikey: chave, authorization: `Bearer ${chave}` },
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      throw new ErroDeOperacao(`banco recusou a leitura: ${resposta.status} ${corpo.slice(0, 200)}`);
    }

    const pagina = (await resposta.json()) as Record<string, unknown>[];
    todos.push(...pagina);

    // Página incompleta significa fim do conjunto. O servidor pode devolver
    // MENOS que o pedido por teto próprio, e é por isso que a condição de parada
    // olha o que chegou, não o que foi pedido.
    if (pagina.length < POR_PAGINA) break;
  }

  return todos.map(paraEdital);
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

  if (simular) {
    console.log("\nSIMULAÇÃO — nada lido, nada gravado.");
    return;
  }

  /*
   * A leitura roda DEPOIS da escolha, e uma de cada vez.
   *
   * Depois porque ler os 2.146 elegíveis para escolher 25 seria gastar 98% do
   * download e do modelo no que não vai virar página. Uma de cada vez porque o
   * PNCP é instável, e 25 downloads simultâneos contra uma fonte que já caiu
   * duas vezes num dia é a forma mais rápida de ser bloqueado.
   */
  const temChave = Boolean(process.env.GEMINI_API_KEY?.trim());
  console.log(
    temChave
      ? "\nlendo os documentos e analisando..."
      : "\nsem GEMINI_API_KEY: os posts saem sem leitura, e a página declara isso.",
  );

  /*
   * Cada leitura real de edital é uma execução de IA — e até hoje nenhuma
   * ficava gravada em `execucoes_de_ia` (só em memória, só para este log). É o
   * único caminho de produção que chama `analisarEdital` de verdade; sem
   * registrar aqui, o teto de custo do roadmap não tem o que somar.
   *
   * `registrar` de `analisarEdital` é síncrono, então a gravação é disparada e
   * empilhada aqui, não esperada linha a linha — esperar todas de uma vez, no
   * fim, é mais barato e não atrasa a leitura do próximo edital por causa de
   * uma escrita lenta no banco.
   */
  const repositorioDeIA = abrirRepositorioDeIA();
  const gravacoesPendentes: Promise<unknown>[] = [];
  const gravarExecucao = repositorioDeIA
    ? (execucao: ExecucaoDeIA) => {
        gravacoesPendentes.push(
          repositorioDeIA
            .gravarExecucao(execucao, { empresaId: null, editalId: null })
            .catch((e) => console.error(`  execucoes_de_ia: não gravou — ${e instanceof Error ? e.message : e}`)),
        );
      }
    : undefined;

  const posts: PostDeEdital[] = [];
  let comLeitura = 0;
  let semDocumento = 0;
  let recusadosPeloModelo = 0;
  let comErro = 0;

  for (const [i, edital] of escolhidos.entries()) {
    const post = paraPost(edital, agora.toISOString());

    if (temChave) {
      const { analise, documentos, motivo } = await lerEAnalisar(edital, gravarExecucao);
      post.analise = analise;
      post.documentosLidos = documentos;
      if (analise?.analisadoEm) comLeitura++;
      else if (motivo === "sem_documento") semDocumento++;
      else if (motivo === "recusado_pelo_modelo") recusadosPeloModelo++;
      else comErro++;

      console.log(
        `  [${String(i + 1).padStart(2)}/${escolhidos.length}] ${documentos} doc · ` +
          `${analise?.analisadoEm ? "lido" : "sem leitura"} · ${edital.local.municipio}/${edital.local.uf}`,
      );
    }

    posts.push(post);
  }

  // Espera toda gravação de execução de IA antes de seguir — o processo não
  // pode sair com uma escrita ainda em voo.
  await Promise.allSettled(gravacoesPendentes);

  const leva: LevaDoDia = { dia, consideradosNoDia: editais.length, posts };

  if (temChave) {
    const contagem = { lidos: comLeitura, semDocumento, recusadosPeloModelo, comErro };
    console.log(`\ncom leitura: ${comLeitura} de ${posts.length} · ${resumoDaLeitura(contagem)}`);

    /*
     * Zero leituras com a chave presente pode ser falha de sistema, e aí a leva
     * NÃO é gravada.
     *
     * `lerEAnalisar` captura a falha de CADA edital e devolve `analise: null`,
     * para que um PDF corrompido não derrube a leva inteira. O efeito colateral
     * é que a falha coletiva fica idêntica à individual — e foi assim que a
     * primeira rodada real, em 16/08, gravou 25 posts sem uma única análise, com
     * o job verde. A causa era uma só e valia para todos: o runner não instalava
     * `pdfjs-dist`.
     *
     * Vinte e cinco editais independentes não falham todos por acaso. Quando
     * nenhum é lido por causa nossa, o que quebrou está antes deles — e publicar
     * assim entrega ao leitor exatamente o que o site promete não ser: a listagem
     * crua que ele já acha no portal. Preferir o dia sem post ao dia com 25 posts
     * ocos é a mesma escolha que a guarda de degradação da coleta já faz: o que
     * se perde num dia volta no seguinte; a confiança de quem leu, não.
     *
     * O que NÃO derruba a leva é o edital sem documento legível. Ele não é falha
     * nossa, é o edital que não publicou anexo (ou publicou um PDF digitalizado),
     * e tratá-lo como quebra já produziu um alarme falso em 24/08. O critério
     * está em `falhaSistemica.ts`, com testes.
     *
     * Leitura parcial passa. É o resultado esperado num dia normal — post sem
     * análise ao lado de posts com análise continua sendo notícia honesta.
     */
    const falha = posts.length > 0 ? falhaSistemicaDeLeitura(contagem) : null;
    if (falha) {
      throw new ErroDeOperacao(
        `${falha} A leva NÃO foi gravada: o dia sem post é melhor que o dia com ` +
          `${posts.length} posts sem a leitura, que é o produto.`,
      );
    }
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
