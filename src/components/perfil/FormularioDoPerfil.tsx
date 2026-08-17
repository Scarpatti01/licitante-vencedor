"use client";

import { useActionState, useEffect, useRef } from "react";
import type { PerfilDaEmpresa } from "@/lib/dominio/tipos";
import { salvarPerfilDaEmpresa } from "@/app/(app)/perfil/acoes";
import { BotaoDeEnvio, EstadoDoSalvamento } from "@/components/app/EnvioDeFormulario";
import { Cartao } from "@/components/app/ui";
import { ResumoDeErros } from "./campos";
import { ESTADO_INICIAL } from "./estado";
import { usePreenchimentoPreservado } from "./preservarPreenchimento";
import {
  rotuloDoCampo,
  SecaoAtestados,
  SecaoAtuacao,
  SecaoCapacidade,
  SecaoDocumentacao,
  SecaoEmpresa,
} from "./SecoesDoPerfil";

/**
 * O perfil inteiro, editável.
 *
 * Mesmas seções do onboarding, todas visíveis: quem já passou pelo assistente
 * volta aqui para mexer em um campo, e um assistente de quatro passos para
 * corrigir um CNAE seria castigo.
 *
 * As seções têm `id` para que o quadro de impacto — o que está ativo e o que
 * está inerte — consiga mandar o usuário direto ao campo que resolve. É esse
 * caminho curto entre "este critério está desligado" e "o campo que o liga" que
 * faz alguém terminar o cadastro.
 */
export function FormularioDoPerfil({ perfil }: { perfil: PerfilDaEmpresa | null }) {
  const resumoRef = useRef<HTMLDivElement>(null);
  const { formularioRef, lembrar, restaurar } = usePreenchimentoPreservado();

  /*
   * O envelope existe só para guardar a `FormData` antes de a ação rodar: o
   * React reseta o formulário no commit desta transição, e este aqui é o
   * cadastro inteiro. Um erro num campo apagaria os outros trinta. Ver
   * `preservarPreenchimento`.
   */
  const [estado, acao, salvando] = useActionState(
    async (anterior: Parameters<typeof salvarPerfilDaEmpresa>[0], dados: FormData) => {
      lembrar(dados);
      return salvarPerfilDaEmpresa(anterior, dados);
    },
    ESTADO_INICIAL,
  );

  // Depois do commit, quando o reset já passou.
  useEffect(() => {
    restaurar();
  }, [estado, restaurar]);

  useEffect(() => {
    if (estado.status === "erro" && Object.keys(estado.erros).length > 0) {
      resumoRef.current?.focus();
      resumoRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [estado.status, estado.erros]);

  return (
    <form ref={formularioRef} action={acao} className="space-y-6">
      <div ref={resumoRef} tabIndex={-1} className="focus-visible:outline-none">
        <ResumoDeErros
          erros={estado.erros}
          rotulos={Object.fromEntries(
            Object.keys(estado.erros).map((c) => [c, rotuloDoCampo(c)]),
          )}
        />
      </div>

      <Cartao
        id="secao-empresa"
        titulo="Empresa"
        descricao="Identificação e porte. É o que o edital confere na habilitação jurídica."
      >
        <SecaoEmpresa perfil={perfil} erros={estado.erros} />
      </Cartao>

      <Cartao
        id="secao-atuacao"
        titulo="Atuação"
        descricao="O vocabulário com que procuramos você no objeto dos editais."
      >
        <SecaoAtuacao perfil={perfil} erros={estado.erros} />
      </Cartao>

      <Cartao
        id="secao-capacidade"
        titulo="Capacidade"
        descricao="Onde você executa, de que tamanho e em que modalidades."
      >
        <SecaoCapacidade perfil={perfil} erros={estado.erros} />
      </Cartao>

      <Cartao
        id="secao-documentacao"
        titulo="Documentação"
        descricao="O que existe no cadastro e até quando vale. É o lado da empresa no checklist de habilitação."
      >
        <SecaoDocumentacao perfil={perfil} erros={estado.erros} />
      </Cartao>

      <Cartao
        id="secao-atestados"
        titulo="Atestados de capacidade técnica"
        descricao="A experiência que você consegue comprovar."
      >
        <SecaoAtestados perfil={perfil} erros={estado.erros} />
      </Cartao>

      {/*
        A barra fica grudada no rodapé porque o formulário é longo: obrigar a
        rolar até o fim para salvar uma correção feita no meio é o atrito que
        faz gente desistir de manter o cadastro em dia.
      */}
      <div className="sticky bottom-0 -mx-5 border-t bg-[var(--background)]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <EstadoDoSalvamento
            salvando={salvando}
            status={estado.status}
            mensagem={estado.mensagem}
            salvoEm={estado.salvoEm}
          />
          <BotaoDeEnvio enviando="Salvando…">Salvar cadastro</BotaoDeEnvio>
        </div>
      </div>
    </form>
  );
}
