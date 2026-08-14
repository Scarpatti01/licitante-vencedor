"use client";

import { useActionState } from "react";
import { salvarPreferenciasDeAlerta } from "@/app/(app)/configuracoes/acoes";
import type { PreferenciasDeEnvio } from "@/app/(app)/configuracoes/preferencias";
import { ESTADO_INICIAL } from "@/components/perfil/estado";
import { CampoDeTexto, ResumoDeErros } from "@/components/perfil/campos";
import { BotaoDeEnvio, EstadoDoSalvamento } from "./EnvioDeFormulario";
import { Aviso, Cartao } from "./ui";

/**
 * Preferências do resumo diário.
 *
 * A divisão em dois blocos não é estética: o primeiro configura um envio que
 * ainda não acontece (não há agendador ligado), o segundo configura a seleção,
 * que já roda de verdade em `src/lib/alertas/selecao.ts`. Misturar os dois faria
 * a tela sugerir que tudo aqui já está no ar.
 *
 * O teto por envio e o score mínimo são as duas defesas do produto contra a
 * única forma de um alerta morrer: mandar coisa demais até o cliente parar de
 * abrir. Por isso os dois estão à vista, e não escondidos em "avançado".
 */

const ROTULOS: Record<string, string> = {
  horario: "Horário do resumo",
  email: "E-mail",
  whatsapp: "WhatsApp",
  scoreMinimo: "Score mínimo",
  maximoPorEnvio: "Máximo por envio",
};

export function FormularioDeAlertas({
  preferencias,
}: {
  preferencias: PreferenciasDeEnvio;
}) {
  const [estado, acao, salvando] = useActionState(salvarPreferenciasDeAlerta, ESTADO_INICIAL);

  return (
    <form action={acao} className="space-y-6">
      <ResumoDeErros erros={estado.erros} rotulos={ROTULOS} />

      <Cartao
        titulo="Quando e por onde"
        descricao="O resumo é diário e vem com o que mudou a sua decisão, não com tudo que foi publicado."
      >
        <Aviso tom="atencao" titulo="O envio ainda não está ligado">
          O agendador e o serviço de disparo não estão em operação nesta versão.
          O que você definir aqui fica guardado e passa a valer no primeiro envio
          — não estamos mandando mensagem para estes contatos hoje.
        </Aviso>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <CampoDeTexto
            nome="horario"
            tipo="time"
            rotulo="Horário do resumo"
            obrigatorio
            valorInicial={preferencias.horario}
            erro={estado.erros.horario}
            ajuda="Horário de Brasília, que é o fuso das sessões públicas. Cedo o bastante para dar tempo de reagir a um prazo curto."
          />
          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                name="apenasDiasUteis"
                defaultChecked={preferencias.apenasDiasUteis}
                className="mt-0.5 size-4 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              />
              <span>
                <span className="font-medium">Somente em dias úteis</span>
                <span className="block text-xs text-[var(--muted)]">
                  Órgão não publica no fim de semana; resumo vazio no sábado é ruído.
                </span>
              </span>
            </label>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Canais</legend>
          <div className="mt-3 space-y-4">
            <div className="rounded-lg border p-4 has-[:checked]:border-[var(--accent)]/40 has-[:checked]:bg-[var(--accent-soft)]/40">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                <input
                  type="checkbox"
                  name="canalEmail"
                  defaultChecked={preferencias.canalEmail}
                  className="size-4 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
                E-mail
              </label>
              <div className="mt-3">
                <CampoDeTexto
                  nome="email"
                  tipo="email"
                  rotulo="Endereço para o resumo"
                  valorInicial={preferencias.email ?? ""}
                  erro={estado.erros.email}
                  autoComplete="email"
                  placeholder="licitacoes@suaempresa.com.br"
                  ajuda="Vale usar uma caixa compartilhada da equipe: o resumo é operacional, não pessoal."
                />
              </div>
            </div>

            <div className="rounded-lg border p-4 has-[:checked]:border-[var(--accent)]/40 has-[:checked]:bg-[var(--accent-soft)]/40">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                <input
                  type="checkbox"
                  name="canalWhatsapp"
                  defaultChecked={preferencias.canalWhatsapp}
                  className="size-4 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
                WhatsApp
              </label>
              <div className="mt-3">
                <CampoDeTexto
                  nome="whatsapp"
                  rotulo="Número com DDD"
                  valorInicial={preferencias.whatsapp ?? ""}
                  erro={estado.erros.whatsapp}
                  inputMode="numeric"
                  placeholder="11 90000-0000"
                  ajuda="O mesmo conteúdo do e-mail, em texto curto. Serve para prazo apertado, quando ninguém vai abrir a caixa de entrada a tempo."
                />
              </div>
            </div>
          </div>
        </fieldset>
      </Cartao>

      <Cartao
        titulo="O que merece interromper o seu dia"
        descricao="Estes quatro ajustes já valem: são lidos pela seleção que monta o resumo."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoDeTexto
            nome="scoreMinimo"
            rotulo="Score mínimo para alertar"
            valorInicial={String(preferencias.scoreMinimo)}
            erro={estado.erros.scoreMinimo}
            inputMode="numeric"
            ajuda="De 0 a 100. Abaixo disso a oportunidade continua na sua lista do painel — ela só não interrompe o seu dia."
          />
          <CampoDeTexto
            nome="maximoPorEnvio"
            rotulo="Máximo de oportunidades por envio"
            valorInicial={String(preferencias.maximoPorEnvio)}
            erro={estado.erros.maximoPorEnvio}
            inputMode="numeric"
            ajuda="De 1 a 20. Resumo longo não é lido, e o que fica de fora é sempre informado no rodapé da mensagem."
          />
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="avisarPrazoDeSalvas"
              defaultChecked={preferencias.avisarPrazoDeSalvas}
              className="mt-0.5 size-4 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
            <span>
              <span className="font-medium">
                Avisar quando o prazo de algo que salvei estiver acabando
              </span>
              <span className="block text-xs text-[var(--muted)]">
                É o aviso de maior valor do serviço: você já decidiu que interessa e
                está prestes a perder a data.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="enviarQuandoVazio"
              defaultChecked={preferencias.enviarQuandoVazio}
              className="mt-0.5 size-4 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
            <span>
              <span className="font-medium">Mandar mensagem mesmo quando não houver nada</span>
              <span className="block text-xs text-[var(--muted)]">
                Silêncio é resultado válido — a triagem trabalhou e nada passou no
                seu corte. Ligue se preferir a confirmação diária.
              </span>
            </span>
          </label>
        </div>
      </Cartao>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <EstadoDoSalvamento
          salvando={salvando}
          status={estado.status}
          mensagem={estado.mensagem}
          salvoEm={estado.salvoEm}
        />
        <BotaoDeEnvio enviando="Guardando…">Salvar preferências</BotaoDeEnvio>
      </div>
    </form>
  );
}
