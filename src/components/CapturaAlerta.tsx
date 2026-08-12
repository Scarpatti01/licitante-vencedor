"use client";

import { useState } from "react";

/**
 * Formulário de cadastro no alerta.
 *
 * Ele nunca diz "pronto" sem que o servidor tenha confirmado a gravação. Se a
 * captura ainda não tem destino configurado, a resposta 503 vira uma mensagem
 * honesta com um caminho alternativo — em vez de um agradecimento sobre um lead
 * que não existe em lugar nenhum.
 */

type Estado =
  | { tipo: "parado" }
  | { tipo: "enviando" }
  | { tipo: "ok" }
  | { tipo: "erro"; mensagem: string; semDestino: boolean };

export function CapturaAlerta({ origem }: { origem: string }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEstado({ tipo: "enviando" });

    try {
      // Barra final obrigatória: o site roda com `trailingSlash: true`, e sem
      // ela todo envio pagaria um 308 de normalização antes de chegar à rota.
      const res = await fetch("/api/alerta/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: dados.get("email"),
          cidade: dados.get("cidade"),
          site: dados.get("site"),
          origem,
        }),
      });

      if (res.ok) {
        setEstado({ tipo: "ok" });
        return;
      }

      const corpo = (await res.json().catch(() => ({}))) as { erro?: string; mensagem?: string };
      setEstado({
        tipo: "erro",
        mensagem: corpo.mensagem ?? corpo.erro ?? "Não conseguimos registrar agora.",
        semDestino: res.status === 503,
      });
    } catch {
      setEstado({
        tipo: "erro",
        mensagem: "Falha de conexão. Tente de novo.",
        semDestino: false,
      });
    }
  }

  if (estado.tipo === "ok") {
    return (
      <div className="rounded-lg border-l-4 border-l-[var(--accent)] bg-[var(--surface)] p-5">
        <p className="leading-relaxed">
          Cadastro registrado. Você vai receber os editais da sua cidade nos dias
          úteis, e pode sair a qualquer momento pelo link no rodapé do e-mail.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-[var(--surface)] p-6">
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Seu e-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@suaempresa.com.br"
              className="mt-1 w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Cidade de interesse</span>
            <input
              name="cidade"
              type="text"
              placeholder="Recife, Caruaru…"
              className="mt-1 w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        {/* Armadilha para robô: invisível e fora da ordem de tabulação. */}
        <input
          name="site"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <button
          type="submit"
          disabled={estado.tipo === "enviando"}
          className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {estado.tipo === "enviando" ? "Enviando…" : "Receber editais da minha cidade"}
        </button>

        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Grátis, sem cartão. Usamos seu e-mail apenas para enviar os editais que
          você pediu.
        </p>

        {estado.tipo === "erro" ? (
          <div
            role="alert"
            className="rounded-md border border-l-4 border-l-[var(--accent)] p-4 text-sm leading-relaxed"
          >
            {estado.semDestino ? (
              <>
                <strong>O cadastro ainda não está aberto.</strong> Estamos
                terminando a operação de envio e preferimos não guardar seu
                e-mail antes de conseguir entregar o que prometemos. Se quiser
                ser avisado na abertura, fale com a gente pelo{" "}
                <a className="underline underline-offset-4" href="/sobre/">
                  contato
                </a>
                .
              </>
            ) : (
              estado.mensagem
            )}
          </div>
        ) : null}
      </form>
    </div>
  );
}
