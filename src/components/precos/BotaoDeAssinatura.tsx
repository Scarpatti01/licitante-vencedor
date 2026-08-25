"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * O botão que leva ao pagamento.
 *
 * ## Por que ele fala com uma rota, e não com uma Server Action
 *
 * A rota devolve uma URL da Stripe e o navegador vai para lá. Uma action
 * devolveria a mesma URL e alguém teria que navegar mesmo assim, com o
 * complicador de que redirecionar de dentro de uma action tem regra própria no
 * Next. Uma chamada explícita seguida de `location.assign` é o caminho que se
 * lê inteiro.
 *
 * ## O erro que ele mostra
 *
 * Nunca o da Stripe. O corpo daquele erro pode conter dado da requisição, e o
 * cliente não precisa lê-lo: ele precisa saber que não deu e que não foi
 * cobrado. As duas frases abaixo são as únicas que ele vê, e a segunda existe
 * porque "deu erro" sem "você não foi cobrado" deixa a pessoa em dúvida sobre a
 * própria fatura.
 */
export function BotaoDeAssinatura({ plano, nome }: { plano: string; nome: string }) {
  const router = useRouter();
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar() {
    setIndo(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/pagamento/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plano }),
      });

      if (resposta.status === 401) {
        // Sem sessão não dá para saber de quem é a assinatura. Mandar para o
        // login guardando o destino é melhor que dizer "faça login" e deixar a
        // pessoa se virar.
        router.push(`/entrar/?destino=${encodeURIComponent("/precos/")}`);
        return;
      }

      if (!resposta.ok) throw new Error(String(resposta.status));

      const { url } = (await resposta.json()) as { url?: string };
      if (!url) throw new Error("sem url");

      // `location.assign` e não o roteador: o destino é a Stripe, fora deste
      // aplicativo. O roteador do Next é para rota interna.
      location.assign(url);
    } catch {
      setErro("Não conseguimos abrir o pagamento agora. Você não foi cobrado; tente de novo.");
      setIndo(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={assinar}
        disabled={indo}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {indo ? "Abrindo…" : `Assinar ${nome}`}
      </button>
      {erro ? <p className="mt-2 text-xs text-[var(--impedimento)]">{erro}</p> : null}
    </div>
  );
}
