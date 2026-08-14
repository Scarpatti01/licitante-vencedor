"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BotaoDeEnvio } from "@/components/app/EnvioDeFormulario";
import { ESTADO_INICIAL, type EstadoDaEntrada } from "@/lib/auth/estado";

/**
 * O formulário de entrar e o de criar conta são o mesmo.
 *
 * Os dois pedem e-mail e senha, tratam erro do mesmo jeito e diferem em três
 * strings e na action. Duplicá-los produziria o defeito clássico da dupla: uma
 * das telas ganha a correção de acessibilidade e a outra não, e ninguém percebe
 * porque as duas "funcionam".
 */

export function FormularioDeAcesso({
  acao,
  rotulo,
  enviando,
  minimoDaSenha,
  proximo,
  rodape,
}: {
  acao: (estado: EstadoDaEntrada, dados: FormData) => Promise<EstadoDaEntrada>;
  rotulo: string;
  enviando: string;
  /** Quando presente, vira a dica do campo de senha. Só a criação de conta usa. */
  minimoDaSenha?: number;
  /** Caminho para onde voltar depois de entrar. */
  proximo?: string;
  rodape: React.ReactNode;
}) {
  const [estado, executar] = useActionState(acao, ESTADO_INICIAL);

  return (
    <form action={executar} className="space-y-4">
      {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="senha" className="block text-sm font-medium">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={minimoDaSenha}
          // `new-password` na criação faz o gerenciador de senhas oferecer uma
          // senha forte em vez de tentar preencher com a antiga.
          autoComplete={minimoDaSenha ? "new-password" : "current-password"}
          aria-describedby={minimoDaSenha ? "dica-da-senha" : undefined}
          className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm"
        />
        {minimoDaSenha ? (
          <p id="dica-da-senha" className="text-xs text-[var(--muted)]">
            Pelo menos {minimoDaSenha} caracteres. Não exigimos símbolo nem maiúscula —
            comprimento protege mais que composição.
          </p>
        ) : null}
      </div>

      {/*
        Região viva criada desde o primeiro render, e não junto com a mensagem:
        leitor de tela costuma não anunciar região que nasce já preenchida,
        porque ele não estava observando aquele nó.
      */}
      <div aria-live="polite" className="min-h-6 text-sm">
        {estado.erro ? (
          <p className="font-medium text-rose-700 dark:text-rose-300">{estado.erro}</p>
        ) : estado.aviso ? (
          <p className="font-medium text-emerald-700 dark:text-emerald-300">{estado.aviso}</p>
        ) : null}
      </div>

      <BotaoDeEnvio enviando={enviando}>{rotulo}</BotaoDeEnvio>

      <p className="pt-2 text-sm text-[var(--muted)]">{rodape}</p>
    </form>
  );
}

/** Link discreto, para os rodapés das duas telas não divergirem no estilo. */
export function LinkDeAcesso({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-[var(--foreground)] underline underline-offset-4">
      {children}
    </Link>
  );
}
