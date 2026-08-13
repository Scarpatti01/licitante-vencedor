"use client";

import { TelaDeErro } from "@/components/app/TelaDeErro";

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <TelaDeErro titulo="Não conseguimos abrir o cadastro guiado" erro={error} tentarDeNovo={reset} />;
}
