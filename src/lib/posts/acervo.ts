/**
 * O acervo de posts publicados, lido dos arquivos versionados.
 *
 * ## Por que arquivos, e não uma consulta
 *
 * Cada leva do dia é um JSON em `dados/posts/AAAA-MM-DD.json`, commitado pela
 * coleta. O motivo está em `tipos.ts`: post é notícia datada, e precisa
 * continuar verdadeiro depois de o edital sumir da fonte.
 *
 * O efeito prático aqui é que as páginas são geradas na build, servidas
 * estáticas, e não tocam no banco — o mesmo desenho das páginas regionais.
 *
 * ## Leitura por `fs`, e não por `import.meta.glob`
 *
 * `import.meta.glob` é do Vite; este projeto compila com Turbopack, onde ele não
 * existe — a primeira versão deste arquivo o usou e o compilador recusou.
 * Ler o diretório com `fs` funciona nos dois lugares onde este módulo roda: na
 * geração das rotas e na renderização, ambas no servidor.
 *
 * Um arquivo malformado — coleta interrompida no meio da escrita, por exemplo —
 * quebraria o build inteiro, então cada leva passa por validação antes de entrar
 * no acervo. Entrada estragada é descartada e o resto publica: é o mesmo
 * princípio de `regioes.ts`, onde o que não dá para exibir com honestidade
 * simplesmente não é exibido.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { LevaDoDia, PostDeEdital } from "./tipos.ts";

const CAMPOS_DE_TEXTO = [
  "slug", "editalId", "objeto", "orgao", "modalidade",
  "uf", "municipio", "municipioSlug", "codigoIbge",
  "encerramentoProposta", "coletadoEm", "postadoEm", "link",
] as const;

/** Descarta o que não dá para renderizar com honestidade. */
function validar(bruto: unknown): PostDeEdital | null {
  if (!bruto || typeof bruto !== "object") return null;
  const p = bruto as Record<string, unknown>;

  for (const campo of CAMPOS_DE_TEXTO) {
    if (typeof p[campo] !== "string" || !(p[campo] as string).trim()) return null;
  }
  if (typeof p.valorEstimado !== "number" || !Number.isFinite(p.valorEstimado)) return null;
  if (Number.isNaN(new Date(p.encerramentoProposta as string).getTime())) return null;

  return {
    ...(p as unknown as PostDeEdital),
    registroDePrecos: p.registroDePrecos === true,
    publicadoEm: typeof p.publicadoEm === "string" ? p.publicadoEm : null,
  };
}

/**
 * Leitura síncrona, e é o que `generateStaticParams` exige.
 *
 * A geração das rotas roda de forma síncrona na build. Uma leitura assíncrona
 * devolveria promessa e a lista de rotas sairia vazia — a página existiria e
 * nenhuma URL seria criada, que é o tipo de falha silenciosa mais cara aqui:
 * build verde, site sem posts.
 */
function carregar(): PostDeEdital[] {
  const pasta = join(process.cwd(), "dados", "posts");

  let arquivos: string[];
  try {
    arquivos = readdirSync(pasta).filter((n) => n.endsWith(".json")).sort();
  } catch {
    // Sem a pasta — num clone novo, antes da primeira leva — o acervo é vazio.
    // Não é erro: os índices somem sozinhos e o resto do site segue igual.
    return [];
  }

  const todos: PostDeEdital[] = [];
  const vistos = new Set<string>();

  for (const nome of arquivos) {
    let leva: LevaDoDia | null = null;
    try {
      leva = JSON.parse(readFileSync(join(pasta, nome), "utf8")) as LevaDoDia;
    } catch {
      continue;
    }
    if (!leva || !Array.isArray(leva.posts)) continue;

    for (const bruto of leva.posts) {
      const post = validar(bruto);
      if (!post) continue;
      // Um edital pode ser reselecionado num dia seguinte se a leva anterior
      // falhou no meio. O primeiro publicado vence, para a URL não mudar.
      if (vistos.has(post.slug)) continue;
      vistos.add(post.slug);
      todos.push(post);
    }
  }

  // Mais recente primeiro, e slug no empate para a ordem ser estável entre
  // builds — lista que embaralha faz parecer que algo mudou quando nada mudou.
  return todos.sort(
    (a, b) => b.postadoEm.localeCompare(a.postadoEm) || a.slug.localeCompare(b.slug),
  );
}

const ACERVO: readonly PostDeEdital[] = carregar();

export function todosOsPosts(): readonly PostDeEdital[] {
  return ACERVO;
}

export function postPorSlug(uf: string, municipioSlug: string, slug: string): PostDeEdital | null {
  const alvoUf = uf.toUpperCase();
  return (
    ACERVO.find(
      (p) => p.uf === alvoUf && p.municipioSlug === municipioSlug && p.slug === slug,
    ) ?? null
  );
}

/** Os posts de um município, do mais recente para o mais antigo. */
export function postsDoMunicipio(uf: string, municipioSlug: string): PostDeEdital[] {
  const alvoUf = uf.toUpperCase();
  return ACERVO.filter((p) => p.uf === alvoUf && p.municipioSlug === municipioSlug);
}

/** `/licitacoes/pe/recife/pregao-eletronico-.../` */
export function caminhoDoPost(post: PostDeEdital): string {
  return `/licitacoes/${post.uf.toLowerCase()}/${post.municipioSlug}/${post.slug}/`;
}
