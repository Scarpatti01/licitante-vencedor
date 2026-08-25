import type { Metadata } from "next";
import { FormularioDeAcesso, LinkDeAcesso } from "@/components/auth/FormularioDeAcesso";
import { criarConta } from "@/lib/auth/acoes";
import { MINIMO_DA_SENHA } from "@/lib/auth/estado";

export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false, follow: false },
};

export default function CriarConta() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--muted)]">
        Depois de criar a conta você cadastra a empresa e os critérios de busca.
      </p>

      <FormularioDeAcesso
        acao={criarConta}
        rotulo="Criar conta"
        enviando="Criando…"
        minimoDaSenha={MINIMO_DA_SENHA}
        rodape={
          <>
            Já tem conta? <LinkDeAcesso href="/entrar/">Entrar</LinkDeAcesso>.
          </>
        }
      />

      {/*
        O aceite fica no ato de criar a conta, e não escondido num link de
        rodapé, porque é aqui que ele tem peso: é o instante em que a relação
        começa. Texto declarado acima do clique e links para as regras
        completas — sem caixa pré-marcada, que a LGPD não aceita como
        consentimento válido (art. 8º, § 3º) e que só serve para fingir que
        alguém leu.
      */}
      <p className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
        Ao criar a conta você concorda com os{" "}
        <LinkDeAcesso href="/termos/">termos de uso</LinkDeAcesso> e com a{" "}
        <LinkDeAcesso href="/privacidade/">política de privacidade</LinkDeAcesso>
        . Não usamos rastreador e não repassamos seus dados a terceiros.
      </p>
    </main>
  );
}
