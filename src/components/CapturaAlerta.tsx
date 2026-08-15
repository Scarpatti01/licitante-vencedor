"use client";

import { useState } from "react";

/**
 * Formulário de cadastro no alerta.
 *
 * Ele nunca diz "pronto" sem que o servidor tenha confirmado a gravação. Se a
 * captura ainda não tem destino configurado, a resposta 503 vira uma mensagem
 * honesta com um caminho alternativo — em vez de um agradecimento sobre um lead
 * que não existe em lugar nenhum.
 *
 * Com o double opt-in, o sucesso deixou de ser um estado só. O servidor grava o
 * lead e depois tenta enviar a confirmação, e as duas coisas podem discordar:
 * gravou e enviou, ou gravou e não enviou. Mandar procurar um e-mail que não
 * saiu é a pior das telas possíveis — a pessoa espera, nada chega, e ela não
 * volta. Daí `confirmacaoEnviada` na resposta e dois textos diferentes aqui.
 */

type Estado =
  | { tipo: "parado" }
  | { tipo: "enviando" }
  | { tipo: "ok"; confirmacaoEnviada: boolean }
  | { tipo: "erro"; mensagem: string; semDestino: boolean };

export function CapturaAlerta({
  origem,
  chamada,
  textoDoBotao = "Receber editais da minha cidade",
}: {
  /** Qual página gerou o cadastro. É o que permite saber qual conteúdo converte. */
  origem: string;
  /**
   * Chamada específica do contexto, exibida acima do formulário.
   *
   * Existe porque a captura que converte é a que fala do problema que o leitor
   * acabou de reconhecer como dele. Formulário genérico no meio de um artigo
   * sobre perder prazo desperdiça o único instante em que a pessoa está
   * disposta a agir. Sem `chamada`, o componente se comporta como já se
   * comportava nas duas LPs de produto.
   */
  chamada?: { titulo: string; texto: string };
  textoDoBotao?: string;
}) {
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
        const corpo = (await res.json().catch(() => ({}))) as { confirmacaoEnviada?: boolean };
        // Ausência do campo é tratada como "não enviou". Se a resposta veio de
        // uma versão que ainda não conhece o campo, prometer o e-mail seria
        // adivinhar — e o custo do palpite errado cai sobre o visitante.
        setEstado({ tipo: "ok", confirmacaoEnviada: corpo.confirmacaoEnviada === true });
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
        {estado.confirmacaoEnviada ? (
          <>
            <p className="leading-relaxed">
              <strong>Falta um clique.</strong> Enviamos um e-mail de confirmação
              para o endereço que você digitou. Só depois que você clicar no link
              é que os editais começam a chegar — é assim que garantimos que
              ninguém entra na lista sem pedir.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Não chegou em alguns minutos? Confira a caixa de spam e o promoções.
              Se digitou o e-mail errado, é só cadastrar de novo com o endereço
              certo.
            </p>
          </>
        ) : (
          <>
            <p className="leading-relaxed">
              <strong>Recebemos seu cadastro, mas o e-mail de confirmação não
              saiu.</strong>{" "}
              Seu interesse está registrado — o que falhou foi o envio, do nosso
              lado. Sem a confirmação, o alerta não começa.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Tente de novo daqui a pouco ou fale com a gente pelo{" "}
              <a className="underline underline-offset-4" href="/sobre/">
                contato
              </a>{" "}
              que confirmamos manualmente. Já sabemos do problema: ele fica
              registrado no nosso log.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-[var(--surface)] p-6">
      {chamada ? (
        <div className="mb-5">
          <p className="text-lg font-semibold tracking-tight">{chamada.titulo}</p>
          <p className="mt-2 leading-relaxed text-[var(--muted)]">{chamada.texto}</p>
        </div>
      ) : null}

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
          {estado.tipo === "enviando" ? "Enviando…" : textoDoBotao}
        </button>

        {/*
          A frase já era honesta; faltava o lastro.
          "Usamos seu e-mail apenas para X" é uma promessa sobre tratamento de
          dado pessoal, e o art. 9º da LGPD manda dar ao titular acesso claro à
          finalidade e aos direitos dele. Sem caminho para a política, a promessa
          fica sem como ser conferida — e é justamente aqui, no instante de
          entregar o e-mail, que a pessoa quer conferir.
        */}
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Grátis, sem cartão. Usamos seu e-mail apenas para enviar os editais que
          você pediu, e você sai com um clique. Sem rastreador e sem repasse a
          terceiros — veja a{" "}
          <a href="/privacidade/" className="underline underline-offset-4">
            política de privacidade
          </a>
          .
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
