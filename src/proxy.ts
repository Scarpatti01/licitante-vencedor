import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROTAS_DE_ENTRADA, ROTAS_DO_PRODUTO, sobPrefixo } from "@/lib/auth/rotas";
import { LEGACY_GONE } from "@/lib/legacy";

/*
 * As listas de rotas e o casador moram em `@/lib/auth/rotas`, não aqui: são
 * regra de segurança, e regra que não pode ser testada porque vive num proxy é
 * regra que ninguém confere.
 *
 * A checagem daqui é OTIMISTA, e o guia de autenticação do Next é explícito
 * sobre por quê: o proxy roda em toda rota, inclusive nas que o navegador
 * pré-carrega, então consultar banco daqui multiplicaria consulta por
 * navegação. Quem autoriza de verdade é `empresaAtual()` no servidor, e a RLS
 * no banco depois dela. Este arquivo só evita a viagem até uma tela que o
 * visitante não poderia ver.
 */

/**
 * 410 Gone para a antiga área de assinante.
 *
 * 410 em vez de 404 é deliberado: comunica remoção intencional e o Google
 * retira do índice mais rápido do que trataria um 404, que ele reconsulta
 * por semanas achando que pode ser falha temporária.
 *
 * O `gone.json` grava os endereços na forma arquivada — com barra final, como
 * todo o resto do acervo WordPress, exceto o arquivo `.php`, que não tem barra
 * porque nunca teve. A comparação aqui ignora a barra dos dois lados para o
 * 410 valer nas duas formas.
 */
const GONE = new Set(LEGACY_GONE.map((p) => p.replace(/\/$/, "")));

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/\/$/, "");

  if (GONE.has(path)) {
    return new NextResponse(
      "410 Gone — esta página fazia parte da antiga área de assinante e não existe mais.",
      { status: 410, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  return await comSessao(request, path);
}

/**
 * Renova a sessão e decide quem passa.
 *
 * **A renovação é a razão principal deste bloco existir**, e ela vale mesmo nas
 * rotas públicas. O token do Supabase expira em uma hora; quem renova é quem
 * consegue gravar cookie, e num Server Component isso é proibido pelo Next. Sem
 * este passo, o usuário seria deslogado sozinho no meio da sessão — e o defeito
 * apareceria como "às vezes some", que é o pior formato de bug.
 *
 * A ordem interna importa: `getUser()` ANTES de qualquer decisão. É a chamada
 * que valida o token contra o servidor de autenticação e dispara a renovação;
 * decidir antes dela seria decidir com o cookie cru, que é justamente o que o
 * cliente controla.
 */
async function comSessao(request: NextRequest, path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem configuração não há login possível, e proteger rota seria trancar a
  // porta de uma casa sem chave: o produto segue em demonstração, aberto.
  if (!url || !chave) return NextResponse.next();

  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(paraGravar) {
        // Grava nos dois lados: na requisição, para que o resto deste arquivo
        // veja o cookie novo; e na resposta, para que o navegador o receba.
        for (const { name, value } of paraGravar) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of paraGravar) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const autenticado = Boolean(data.user);

  if (!autenticado && sobPrefixo(path, ROTAS_DO_PRODUTO)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar/";
    // Para onde voltar depois de entrar. Sem isto, quem clica num link direto
    // para uma oportunidade cai no painel e tem de procurar de novo o que já
    // tinha achado.
    destino.searchParams.set("proximo", request.nextUrl.pathname);
    return NextResponse.redirect(destino);
  }

  if (autenticado && sobPrefixo(path, ROTAS_DE_ENTRADA)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/painel/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}

/**
 * O matcher precisa alcançar URLs com extensão.
 *
 * A versão anterior excluía qualquer caminho contendo ponto, e com isso
 * `/login-do-assinante/hotlogin.php` nunca chegava até aqui: respondia 404 em
 * vez de 410. Num domínio que passou nove anos em WordPress, endereço
 * terminado em `.php` é acervo, não asset. Por isso a exclusão lista as
 * extensões de arquivo estático em vez de presumir que todo ponto é uma.
 *
 * A Vercel tem uma regra gerenciada que barra varredura de exploit em WordPress,
 * e ela responde 403 com `X-Vercel-Mitigated: deny` em `.php`. Isso não impede o
 * 410: o proxy atende primeiro os caminhos que casam com este matcher, e a regra
 * só alcança o que sobra. Medido em produção — `/login-do-assinante/hotlogin.php`
 * responde 410, enquanto `/wp-login.php` e qualquer outro `.php` seguem em 403.
 * Não mexa na proteção para "consertar" o 410; ele já funciona com ela ligada.
 */
export const config = {
  matcher: [
    "/((?!_next|api|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|map|json|txt|xml|woff|woff2|ttf|otf)$).*)",
  ],
};
