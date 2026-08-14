import { NextResponse, type NextRequest } from "next/server";
import { LEGACY_GONE } from "@/lib/legacy";

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

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/\/$/, "");

  if (GONE.has(path)) {
    return new NextResponse(
      "410 Gone — esta página fazia parte da antiga área de assinante e não existe mais.",
      { status: 410, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  return NextResponse.next();
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
