import type { Metadata } from "next";
import Link from "next/link";
import { empresaAtual, repositorio } from "@/lib/dados";
import { Aviso, BOTAO, Pagina, Vazio } from "@/components/app/ui";
import { diagnosticarPerfil } from "@/components/perfil/diagnostico";
import { FormularioDoPerfil } from "@/components/perfil/FormularioDoPerfil";
import { ImpactoDoPerfil } from "@/components/perfil/ImpactoDoPerfil";

/**
 * Perfil Inteligente da Empresa.
 *
 * A página tem duas metades e a ordem entre elas é a decisão de produto: o
 * quadro de impacto vem ANTES do formulário. Quem chega aqui não quer editar
 * campo, quer saber se o cadastro está bom — e é a resposta a essa pergunta que
 * faz o cadastro ser terminado.
 */

export const metadata: Metadata = {
  title: "Perfil da empresa",
  description:
    "Os critérios que a sua empresa liga na triagem de editais, e os que seguem inertes por falta de dado.",
};

export default async function PaginaDePerfil({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { salvo } = await searchParams;
  const repo = repositorio();
  const empresaId = await empresaAtual();
  const perfil = await repo.perfil(empresaId);
  const diagnostico = diagnosticarPerfil(perfil);

  if (perfil === null) {
    return (
      <Pagina
        titulo="Perfil da empresa"
        descricao="Ainda não há cadastro para esta conta."
      >
        <Vazio
          titulo="Nenhum perfil cadastrado"
          acao={
            <Link href="/onboarding/" className={BOTAO.primario}>
              Começar o cadastro
            </Link>
          }
        >
          O perfil é o lado do cruzamento que você controla. Sem ele não há o que
          comparar com os editais coletados — e a triagem não tem como decidir o
          que mostrar e o que descartar.
        </Vazio>
      </Pagina>
    );
  }

  return (
    <Pagina
      titulo="Perfil da empresa"
      descricao="A mesma informação que o onboarding coletou, editável — com o efeito de cada campo na recomendação, à vista."
      acoes={
        <Link href="/onboarding/" className={BOTAO.secundario}>
          Refazer pelo assistente
        </Link>
      }
    >
      {salvo === "1" ? (
        <Aviso tom="positivo" titulo="Cadastro salvo">
          O que estava faltando aparece abaixo, com o efeito de cada campo. Você
          pode completar o resto quando quiser — o produto trabalha com perfil
          parcial e diz o que falta em vez de travar.
        </Aviso>
      ) : null}

      <p className="text-sm text-[var(--muted)]">
        Última atualização em{" "}
        <time dateTime={perfil.atualizadoEm}>
          {new Date(perfil.atualizadoEm).toLocaleString("pt-BR", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </time>
        .
      </p>

      <ImpactoDoPerfil diagnostico={diagnostico} />

      <FormularioDoPerfil perfil={perfil} />
    </Pagina>
  );
}
