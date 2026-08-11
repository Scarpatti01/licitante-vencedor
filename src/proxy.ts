import { NextResponse, type NextRequest } from "next/server";
import { LEGACY_GONE } from "@/lib/legacy";

/**
 * 410 Gone para a antiga área de assinante.
 *
 * 410 em vez de 404 é deliberado: comunica remoção intencional e o Google
 * retira do índice mais rápido do que trataria um 404, que ele reconsulta
 * por semanas achando que pode ser falha temporária.
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

export const config = {
  matcher: ["/((?!_next|api|.*\\.).*)"],
};
