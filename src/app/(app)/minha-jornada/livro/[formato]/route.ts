import { NextResponse } from "next/server";
import { estadoDaJornada } from "@/lib/jornada/repositorio";
import { empresasDoUsuario, usuarioAtual } from "@/lib/auth/sessao";
import { carimbarEpub, carimbarPdf, type Comprador } from "@/lib/livro/carimbo";
import {
  baixarMestre,
  cabecalhoDeDownload,
  ehFormato,
  MESTRES,
} from "@/lib/livro/entrega";

/**
 * A entrega do livro a quem comprou.
 *
 * A ordem importa e é sempre esta: sessão, compra, arquivo. Nenhum byte do
 * mestre é lido antes de as duas primeiras passarem, porque ler primeiro e
 * conferir depois é como vazamento começa.
 *
 * O carimbo é aplicado aqui, na hora, com o nome e o e-mail de quem está
 * logado. Não existe cópia carimbada guardada em lugar nenhum: cada download é
 * conferido de novo e sai com o dono da sessão daquele momento.
 */

// O carimbo percorre as 126 páginas do PDF; o padrão de 15s não cobre isso com
// folga em máquina fria.
export const maxDuration = 60;

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ formato: string }> },
) {
  const { formato } = await params;
  if (!ehFormato(formato)) {
    return NextResponse.json({ erro: "Formato desconhecido." }, { status: 404 });
  }

  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Entre na sua conta para baixar." }, { status: 401 });
  }

  const { temAcesso } = await estadoDaJornada();
  if (!temAcesso) {
    // 403 e não 404: a pessoa está logada e o arquivo existe; o que falta é a
    // compra. Confundir os dois esconde do cliente o que ele precisa resolver.
    return NextResponse.json(
      { erro: "Este livro faz parte da Jornada de 12 Semanas." },
      { status: 403 },
    );
  }

  const mestre = await baixarMestre(formato);
  if (!mestre) {
    return NextResponse.json(
      { erro: "O livro está temporariamente indisponível. Tente de novo em alguns minutos." },
      { status: 503 },
    );
  }

  const comprador = await identificar(usuario.email);

  let arquivo: Uint8Array;
  try {
    arquivo =
      formato === "pdf"
        ? await carimbarPdf(mestre, comprador)
        : carimbarEpub(mestre, comprador);
  } catch (erro) {
    // Sem carimbo o arquivo não sai. Entregar um exemplar anônimo por causa de
    // uma falha nossa é perder justamente a rastreabilidade que ele existe para
    // dar, e ninguém perceberia que ela sumiu.
    console.error("Falha ao carimbar o livro", formato, erro);
    return NextResponse.json(
      { erro: "Não consegui preparar o seu exemplar agora. Tente de novo em alguns minutos." },
      { status: 500 },
    );
  }

  return new NextResponse(arquivo as unknown as BodyInit, {
    headers: {
      "content-type": MESTRES[formato].tipo,
      "content-disposition": cabecalhoDeDownload(formato),
      "content-length": String(arquivo.byteLength),
      // Exemplar nominal: nenhum intermediário pode guardar uma cópia e servir
      // ao próximo usuário o arquivo carimbado com o nome do anterior.
      "cache-control": "private, no-store, max-age=0",
    },
  });
}

/** Quem é o comprador, para o carimbo. O e-mail é o que identifica; o nome ajuda. */
async function identificar(email: string | null): Promise<Comprador> {
  const empresas = await empresasDoUsuario().catch(() => []);
  return { nome: empresas[0]?.nome ?? "", email: email ?? "" };
}
