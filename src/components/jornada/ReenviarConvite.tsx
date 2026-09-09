"use client";

import { useState } from "react";

/**
 * "Já comprei e não recebi o e-mail."
 *
 * A tela diz a MESMA coisa tendo achado a compra ou não, porque a rota também
 * diz. Diferenciar transformaria o formulário num verificador de clientes:
 * qualquer pessoa digitaria endereços e descobriria quem comprou.
 *
 * Por isso o texto de sucesso não promete "enviamos": ele diz o que a pessoa
 * precisa fazer e o que conferir. Prometer entrega que talvez não aconteça faz
 * quem digitou o endereço errado esperar por um e-mail que não vem.
 */
type Estado =
  | { tipo: "parado" }
  | { tipo: "enviando" }
  | { tipo: "pronto" }
  | { tipo: "erro"; mensagem: string };

export function ReenviarConvite() {
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });

  async function enviar(dados: FormData) {
    setEstado({ tipo: "enviando" });
    try {
      // Barra final: o site roda com `trailingSlash: true`, e sem ela o POST
      // pagaria um 308 antes de chegar na rota.
      const res = await fetch("/api/jornada/reenviar/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: dados.get("email") }),
      });

      if (res.ok) {
        setEstado({ tipo: "pronto" });
        return;
      }

      const corpo = (await res.json().catch(() => ({}))) as { mensagem?: string };
      setEstado({
        tipo: "erro",
        mensagem: corpo.mensagem ?? "Não conseguimos processar agora. Tente mais tarde.",
      });
    } catch {
      setEstado({ tipo: "erro", mensagem: "Falha de conexão. Tente de novo." });
    }
  }

  if (estado.tipo === "pronto") {
    return (
      <div className="rounded-lg border-l-4 border-l-[var(--accent)] bg-[var(--surface)] p-5 text-sm leading-relaxed">
        <p className="font-semibold">Pronto. Confira sua caixa de entrada.</p>
        <p className="mt-2">
          Se o e-mail não aparecer em alguns minutos, procure no spam. Se ainda assim não
          estiver lá, o endereço digitado pode ser diferente do que você usou na compra: é
          por ele que a Jornada reconhece o acesso.
        </p>
      </div>
    );
  }

  return (
    <form action={enviar} className="space-y-3">
      <label htmlFor="email-do-reenvio" className="block text-sm font-medium">
        O e-mail que você usou na compra
      </label>
      <input
        id="email-do-reenvio"
        name="email"
        type="email"
        required
        autoComplete="email"
        className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
      />
      <button
        type="submit"
        disabled={estado.tipo === "enviando"}
        className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {estado.tipo === "enviando" ? "Enviando…" : "Reenviar o convite"}
      </button>

      {estado.tipo === "erro" ? (
        <p className="rounded-lg border p-3 text-sm">{estado.mensagem}</p>
      ) : null}
    </form>
  );
}
