"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PerfilDaEmpresa } from "@/lib/dominio/tipos";
import type { IdentidadeDaEmpresa } from "@/lib/dados";
import { salvarPerfilDaEmpresa } from "@/app/(app)/perfil/acoes";
import { BotaoDeEnvio, EstadoDoSalvamento } from "@/components/app/EnvioDeFormulario";
import { Aviso, BOTAO, Cartao } from "@/components/app/ui";
import { ResumoDeErros } from "./campos";
import { ESTADO_INICIAL, type EstadoDoFormulario } from "./estado";
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
 * O onboarding guiado.
 *
 * Ele determina a qualidade de tudo que vem depois: sem região e sem faixa de
 * ticket o motor de score se recusa a pontuar, e um produto que não pontua não
 * recomenda nada. Daí as decisões abaixo.
 *
 * **Etapas curtas, com o motivo à vista.** Cada etapa abre dizendo o que aquele
 * bloco de campos liga na triagem. "Usamos isto para descartar editais fora do
 * seu estado" faz alguém preencher; um campo mudo chamado "UF" não faz.
 *
 * **Um formulário só, quatro vistas.** As seções ficam todas montadas e as que
 * não são da etapa atual ficam com `hidden` — o atributo, que também tira o
 * bloco da árvore de acessibilidade. Isso resolve dois problemas de uma vez: o
 * envio carrega o cadastro inteiro (nenhum campo de outra etapa é apagado por
 * omissão) e pular ou voltar não custa requisição nenhuma.
 *
 * **Salvar em cada etapa.** O botão principal grava e só então avança. Perfil
 * parcial é resultado válido: quem parar na etapa dois tem as etapas um e dois
 * gravadas, e o produto passa a dizer o que falta em vez de travar.
 */

const ETAPAS = [
  {
    chave: "empresa",
    titulo: "Empresa",
    resumo: "Quem é a empresa que vai disputar",
    porque:
      "CNPJ e porte definem de que benefícios você tem direito — ME e EPP têm preferência e itens exclusivos na Lei 14.133. O faturamento é o que nos permite avisar quando um contrato é grande demais para o seu porte.",
  },
  {
    chave: "atuacao",
    titulo: "Atuação",
    resumo: "O que você vende, na linguagem do edital",
    porque:
      "É o critério de maior peso da triagem. Procuramos as suas palavras-chave no objeto de cada edital publicado, e usamos as palavras excluídas para tirar da frente o ramo vizinho que usa o mesmo vocabulário.",
  },
  {
    chave: "capacidade",
    titulo: "Capacidade",
    resumo: "Onde você executa e de que tamanho",
    porque:
      "Esta é a etapa que mais muda o resultado. Sem estado declarado e sem faixa de ticket, metade dos critérios fica sem base e o motor prefere dizer 'faltam informações' a publicar um número que ninguém consegue defender.",
  },
  {
    chave: "documentacao",
    titulo: "Documentação",
    resumo: "O que você tem em mãos e até quando vale",
    porque:
      "É o que transforma a exigência de habilitação do edital em tarefa sua, com prazo. Certidão vencida deixa de ser descoberta na hora da sessão — mas só se a validade estiver aqui.",
  },
] as const;

/** De que etapa é cada erro devolvido pelo servidor. */
function etapaDoCampo(chave: string): number {
  if (["cnpj", "razaoSocial", "nomeFantasia", "porte", "faturamentoAnual"].includes(chave)) return 0;
  if (["cnaes", "palavrasChave", "palavrasExcluidas"].includes(chave)) return 1;
  if (
    ["uf", "municipiosPrioritarios", "ticketMinimo", "ticketMaximo", "modalidade"].includes(chave)
  ) {
    return 2;
  }
  return 3;
}

export function AssistenteDeOnboarding({
  perfil,
  identidade = null,
  etapaInicial = 0,
}: {
  perfil: PerfilDaEmpresa | null;
  /**
   * O que `/cadastrar-empresa/` já coletou. Sem isto, quem acabou de criar a
   * empresa reencontra CNPJ e razão social em branco na primeira etapa, dois
   * cliques depois de digitá-los.
   */
  identidade?: IdentidadeDaEmpresa | null;
  etapaInicial?: number;
}) {
  const roteador = useRouter();
  const [etapa, setEtapa] = useState(etapaInicial);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const resumoDeErrosRef = useRef<HTMLDivElement>(null);
  const { formularioRef, lembrar, restaurar } = usePreenchimentoPreservado();

  /**
   * A navegação do assistente mora AQUI, e não num efeito que observa o estado.
   *
   * `useActionState` aceita uma função de cliente: ela chama a Server Action,
   * espera a resposta e só então decide para onde ir. Isso mantém "salvou, logo
   * avança" no mesmo lugar onde a intenção do clique é conhecida — o botão que
   * enviou vem na própria `FormData`, então não há estado paralelo a sincronizar.
   *
   * O botão de concluir também navega por aqui, em vez de o servidor
   * redirecionar: um `redirect` na action apagaria o estado de sucesso antes de
   * a tela conseguir anunciá-lo.
   */
  const [estado, acao, salvando] = useActionState(
    async (anterior: EstadoDoFormulario, dados: FormData) => {
      // Antes de tudo: o React vai resetar este formulário no commit desta
      // transição, e as quatro etapas moram nele. Ver `preservarPreenchimento`.
      lembrar(dados);

      const resultado = await salvarPerfilDaEmpresa(anterior, dados);
      const intencao = dados.get("intencao");

      if (resultado.status === "erro") {
        const chaves = Object.keys(resultado.erros);
        if (chaves.length > 0) setEtapa(Math.min(...chaves.map(etapaDoCampo)));
        // O contêiner do resumo existe desde o primeiro render, então o foco
        // pode ir para ele antes mesmo de o conteúdo novo aparecer.
        resumoDeErrosRef.current?.focus();
        return resultado;
      }

      if (intencao === "concluir") {
        roteador.push("/perfil/?salvo=1");
      } else if (intencao === "avancar") {
        setEtapa((atual) => Math.min(atual + 1, ETAPAS.length - 1));
        tituloRef.current?.focus();
      }

      return resultado;
    },
    ESTADO_INICIAL,
  );

  /*
   * Roda DEPOIS do commit — que é quando o reset do React já foi aplicado. Um
   * `restaurar()` dentro da ação seria desfeito segundos depois, no commit.
   */
  useEffect(() => {
    restaurar();
  }, [estado, restaurar]);

  const trocarEtapa = (proxima: number) => {
    setEtapa(proxima);
    // O foco acompanha a troca: sem isto, quem navega por teclado continua no
    // rodapé enquanto o conteúdo mudou lá em cima. O `<h2>` é o mesmo nó em
    // todas as etapas — só o texto dentro dele muda —, então focar agora vale.
    tituloRef.current?.focus();
  };

  const atual = ETAPAS[etapa];
  const ultima = etapa === ETAPAS.length - 1;

  return (
    <form ref={formularioRef} action={acao} className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Etapas do cadastro">
        {ETAPAS.map((e, i) => {
          const ativa = i === etapa;
          return (
            <li key={e.chave}>
              <button
                type="button"
                onClick={() => trocarEtapa(i)}
                aria-current={ativa ? "step" : undefined}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  ativa
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                    : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--surface)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-5 items-center justify-center rounded-full text-xs ${
                    ativa
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] text-[var(--muted)]"
                  }`}
                >
                  {i + 1}
                </span>
                {e.titulo}
              </button>
            </li>
          );
        })}
      </ol>

      <div ref={resumoDeErrosRef} tabIndex={-1} className="focus-visible:outline-none">
        <ResumoDeErros
          erros={estado.erros}
          rotulos={Object.fromEntries(
            Object.keys(estado.erros).map((c) => [c, rotuloDoCampo(c)]),
          )}
        />
      </div>

      <Cartao>
        <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
          Etapa {etapa + 1} de {ETAPAS.length} · {atual.resumo}
        </p>
        <h2
          ref={tituloRef}
          tabIndex={-1}
          className="mt-1 text-xl font-semibold tracking-tight focus-visible:outline-none"
        >
          {atual.titulo}
        </h2>
        <div className="mt-4">
          <Aviso tom="destaque" papel="none" titulo="Por que pedimos isto">
            {atual.porque}
          </Aviso>
        </div>

        <div className="mt-6">
          <div hidden={etapa !== 0}>
            <SecaoEmpresa perfil={perfil} identidade={identidade} erros={estado.erros} />
          </div>
          <div hidden={etapa !== 1}>
            <SecaoAtuacao perfil={perfil} erros={estado.erros} />
          </div>
          <div hidden={etapa !== 2}>
            <SecaoCapacidade perfil={perfil} erros={estado.erros} />
          </div>
          <div hidden={etapa !== 3} className="space-y-6">
            <SecaoDocumentacao perfil={perfil} erros={estado.erros} />
            <details className="rounded-lg border bg-[var(--surface)] px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium">
                Atestados de capacidade técnica (opcional, dá para deixar para depois)
              </summary>
              <div className="mt-4">
                <SecaoAtestados perfil={perfil} erros={estado.erros} />
              </div>
            </details>
          </div>
        </div>
      </Cartao>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={etapa === 0 || salvando}
            onClick={() => trocarEtapa(etapa - 1)}
            className={BOTAO.secundario}
          >
            Voltar
          </button>
          {!ultima ? (
            <button
              type="button"
              disabled={salvando}
              onClick={() => trocarEtapa(etapa + 1)}
              className={BOTAO.discreto}
            >
              Pular esta etapa
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/*
            Este é o primeiro botão de envio do formulário, então é ele que o
            Enter dentro de um campo aciona. Sair sem perder o que foi digitado
            é o comportamento certo para essa tecla.
          */}
          <BotaoDeEnvio name="intencao" value="salvar" variante="secundario" enviando="Salvando…">
            Salvar e continuar depois
          </BotaoDeEnvio>
          {ultima ? (
            <BotaoDeEnvio name="intencao" value="concluir" enviando="Concluindo…">
              Concluir cadastro
            </BotaoDeEnvio>
          ) : (
            <BotaoDeEnvio name="intencao" value="avancar" enviando="Salvando…">
              Salvar e ir para {ETAPAS[etapa + 1].titulo}
            </BotaoDeEnvio>
          )}
        </div>
      </div>

      <EstadoDoSalvamento
        salvando={salvando}
        status={estado.status}
        mensagem={estado.mensagem}
        salvoEm={estado.salvoEm}
      />
    </form>
  );
}
