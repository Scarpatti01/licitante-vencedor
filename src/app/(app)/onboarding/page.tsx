import type { Metadata } from "next";
import Link from "next/link";
import { empresaAtual, repositorio } from "@/lib/dados";
import { Aviso, BOTAO, Pagina } from "@/components/app/ui";
import { AssistenteDeOnboarding } from "@/components/perfil/AssistenteDeOnboarding";
import { diagnosticarPerfil } from "@/components/perfil/diagnostico";

/**
 * Onboarding guiado.
 *
 * O `?etapa=` na URL existe para que o produto consiga mandar alguém direto ao
 * ponto que falta — "complete a etapa de capacidade" tem de ser um link, não
 * uma instrução. Depois disso o assistente é client-side: pular e voltar não
 * podem custar uma requisição cada.
 */

export const metadata: Metadata = {
  title: "Cadastro guiado",
  description:
    "Quatro etapas curtas para o produto saber quais editais são seus e quais não são.",
};

const CHAVES = ["empresa", "atuacao", "capacidade", "documentacao"] as const;

export default async function PaginaDeOnboarding({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string }>;
}) {
  const { etapa } = await searchParams;

  const repo = repositorio();
  const empresaId = await empresaAtual();
  const perfil = await repo.perfil(empresaId);
  const diagnostico = diagnosticarPerfil(perfil);

  const indice = Math.max(0, CHAVES.indexOf((etapa ?? "") as (typeof CHAVES)[number]));

  return (
    <Pagina
      titulo={perfil === null ? "Vamos configurar a sua triagem" : "Revisar o cadastro"}
      descricao={
        perfil === null
          ? "Quatro etapas curtas. Cada uma explica o que liga na triagem — e você pode parar em qualquer ponto: o produto trabalha com cadastro parcial e diz o que falta."
          : "O assistente parte do que já está cadastrado. Dá para percorrer só a etapa que interessa e salvar."
      }
      acoes={
        perfil !== null ? (
          <Link href="/perfil/" className={BOTAO.secundario}>
            Ir para a edição completa
          </Link>
        ) : undefined
      }
    >
      {perfil !== null && diagnostico.inertes.length > 0 ? (
        <Aviso tom="atencao" titulo="O que ainda está faltando">
          {diagnostico.inertes.map((c) => c.campoQueFalta).filter(Boolean).join(", ")}.
          Cada um deles desliga um critério da recomendação — o quadro completo
          fica em{" "}
          <Link href="/perfil/" className="underline underline-offset-4">
            Perfil
          </Link>
          .
        </Aviso>
      ) : null}

      <AssistenteDeOnboarding perfil={perfil} etapaInicial={indice} />

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        O que você declara aqui vale como declaração sua e alimenta a triagem.
        Nada disto é conferido junto aos órgãos emissores, e nenhuma tela do
        produto vai afirmar que um documento está válido só porque ele foi
        cadastrado.
      </p>
    </Pagina>
  );
}
