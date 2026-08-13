import type { Metadata } from "next";
import Link from "next/link";
import { empresaAtual, repositorio } from "@/lib/dados";
import { FormularioDeAlertas } from "@/components/app/FormularioDeAlertas";
import { Aviso, BOTAO, Cartao, Definicao, Etiqueta, ListaDeDefinicoes, SemInformacao } from "@/components/app/ui";
import { Pagina } from "@/components/app/ui";
import { formatarCnpj, NOME_DO_PORTE } from "@/components/perfil/validacao";
import { assinaturaDaEmpresa } from "./assinatura";
import { lerPreferencias } from "./preferencias";

/**
 * Configurações: preferências de alerta e assinatura.
 *
 * A metade de baixo é somente leitura de propósito. Plano, valores e limites
 * são acordo comercial: mudam por contrato, não por clique — e uma tela que
 * deixasse alterar isso sem passar por cobrança criaria divergência entre o que
 * o cliente vê e o que ele paga.
 */

export const metadata: Metadata = {
  title: "Configurações",
  description: "Preferências do resumo diário e situação da assinatura.",
};

export default async function PaginaDeConfiguracoes() {
  const repo = repositorio();
  const empresaId = await empresaAtual();
  const [perfil, preferencias, assinatura] = await Promise.all([
    repo.perfil(empresaId),
    lerPreferencias(empresaId),
    assinaturaDaEmpresa(empresaId),
  ]);

  return (
    <Pagina
      titulo="Configurações"
      descricao="O que o produto manda para você, quando manda — e em que condições comerciais o serviço está prestado."
    >
      <FormularioDeAlertas preferencias={preferencias} />

      <Cartao
        titulo="Plano e assinatura"
        descricao="Somente leitura. Alterações de plano passam pelo contrato, não por esta tela."
      >
        {assinatura.encontrada ? (
          <ListaDeDefinicoes>
            <Definicao termo="Plano">
              <span className="font-medium">{assinatura.assinatura.plano}</span>{" "}
              <Etiqueta tom={assinatura.assinatura.status === "ativa" ? "positivo" : "atencao"}>
                {assinatura.assinatura.status}
              </Etiqueta>
            </Definicao>
            <Definicao termo="Implantação">
              {assinatura.assinatura.implantacao === null ? (
                <SemInformacao>não cobrada neste plano</SemInformacao>
              ) : (
                assinatura.assinatura.implantacao.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              )}
            </Definicao>
            <Definicao termo="Mensalidade">
              {assinatura.assinatura.mensalidade === null ? (
                <SemInformacao>não cobrada neste plano</SemInformacao>
              ) : (
                assinatura.assinatura.mensalidade.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              )}
            </Definicao>
            <Definicao termo="Taxa de êxito">
              {assinatura.assinatura.taxaDeExitoPercentual === null ? (
                <SemInformacao>não prevista neste plano</SemInformacao>
              ) : (
                `${assinatura.assinatura.taxaDeExitoPercentual}% sobre o contrato ganho`
              )}
            </Definicao>
          </ListaDeDefinicoes>
        ) : (
          <Aviso tom="neutro" titulo="Nenhum plano ativo registrado">
            {assinatura.motivo}
          </Aviso>
        )}
      </Cartao>

      <Cartao
        titulo="Empresa desta conta"
        descricao="Identificação usada em toda a triagem. Editar em Perfil."
        acoes={
          <Link href="/perfil/" className={BOTAO.secundario}>
            Editar perfil
          </Link>
        }
      >
        {perfil === null ? (
          <Aviso tom="atencao" titulo="Cadastro não iniciado">
            Sem perfil não há triagem: é o perfil que diz quais editais são seus.{" "}
            <Link href="/onboarding/" className="underline underline-offset-4">
              Começar o cadastro
            </Link>
            .
          </Aviso>
        ) : (
          <ListaDeDefinicoes>
            <Definicao termo="Razão social">{perfil.razaoSocial}</Definicao>
            <Definicao termo="Nome fantasia">
              {perfil.nomeFantasia ?? <SemInformacao />}
            </Definicao>
            <Definicao termo="CNPJ">{formatarCnpj(perfil.cnpj)}</Definicao>
            <Definicao termo="Porte">{NOME_DO_PORTE[perfil.porte]}</Definicao>
          </ListaDeDefinicoes>
        )}
      </Cartao>

      <Cartao titulo="Dados e privacidade">
        <div className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
          <p>
            O que você cadastra fica restrito à sua empresa. Toda leitura do
            produto exige a identificação da empresa dona do dado, e o banco
            aplica a mesma regra por baixo — são duas camadas independentes para
            o mesmo erro.
          </p>
          <p>
            A exportação e a exclusão definitiva do cadastro ainda não estão
            disponíveis nesta tela. Enquanto não estiverem, os dois pedidos são
            atendidos pelo canal de suporte e não dependem de nenhuma tela existir.
          </p>
        </div>
      </Cartao>
    </Pagina>
  );
}
