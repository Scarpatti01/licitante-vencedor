"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Um vídeo do YouTube que só carrega o player quando a pessoa pede.
 *
 * ## Por que não o iframe direto
 *
 * O iframe padrão do YouTube baixa perto de 1 MB de JavaScript e abre conexão
 * com meia dúzia de domínios do Google no instante em que a página carrega,
 * assista a pessoa ou não. Na home isso desfaria o trabalho de desempenho de
 * 20/09/2026, que tirou 794 KB de cada visita.
 *
 * Aqui a página mostra só a capa, servida do próprio site, e um botão. O
 * player entra no clique, já tocando. Até o clique, nenhum dado da visita vai
 * para o YouTube, o que também poupa a pergunta de cookies de terceiros.
 *
 * O domínio é `youtube-nocookie.com`, a versão do próprio YouTube que não grava
 * cookie de rastreamento antes de a pessoa dar play.
 */
export function VideoDoYoutube({
  id,
  titulo,
  capa,
}: {
  /** O identificador do vídeo, o que vem depois de `youtu.be/`. */
  id: string;
  titulo: string;
  /** A capa, salva em `public/`. Ver a nota acima sobre não buscar no YouTube. */
  capa: string;
}) {
  const [tocando, setTocando] = useState(false);

  if (tocando) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTocando(true)}
      aria-label={`Assistir ao vídeo: ${titulo}`}
      className="group relative block aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
    >
      <Image
        src={capa}
        alt=""
        fill
        sizes="(max-width: 1024px) 92vw, 960px"
        className="object-cover transition-opacity group-hover:opacity-90"
      />
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110 sm:size-20"
      >
        <svg viewBox="0 0 24 24" className="ml-1 size-7 fill-white sm:size-9">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  );
}
