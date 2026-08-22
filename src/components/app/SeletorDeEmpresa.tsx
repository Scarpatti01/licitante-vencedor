"use client";

import { useTransition } from "react";
import { trocarDeEmpresa } from "@/lib/auth/empresa-ativa";

/**
 * Troca a empresa aberta, quando há mais de uma.
 *
 * ## Por que existe
 *
 * O produto é multiempresa desde o banco, e até 22/08 a interface abria sempre
 * a primeira e não dizia que havia outras. Para um contador ou uma consultoria
 * — que é o melhor canal de venda para licitações — o sistema mostrava um
 * cliente e escondia o resto, sem sinal nenhum de que existiam.
 *
 * ## Por que um `select` e não um menu bonito
 *
 * Porque é a decisão mais perigosa da tela, e não uma navegação qualquer: o
 * pior erro possível neste produto é alguém decidir sobre um edital olhando o
 * perfil da empresa errada. `select` nativo é o controle que todo mundo já sabe
 * usar, funciona com teclado e leitor de tela sem nada da nossa parte, e não
 * tem estado de "meio aberto" onde um toque errado troca de cliente sem querer.
 */
export function SeletorDeEmpresa({
  empresas,
  ativa,
}: {
  empresas: { empresaId: string; nome: string }[];
  ativa: string;
}) {
  const [trocando, iniciarTroca] = useTransition();

  // Uma empresa só não é escolha: seria um controle que não faz nada, ocupando
  // o lugar onde o nome dela deve aparecer.
  if (empresas.length < 2) return null;

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-[var(--muted)]">Empresa</span>
      <select
        value={ativa}
        disabled={trocando}
        onChange={(evento) => {
          const escolhida = evento.target.value;
          if (escolhida === ativa) return;
          iniciarTroca(() => {
            void trocarDeEmpresa(escolhida);
          });
        }}
        /*
         * `text-[var(--foreground)]` porque o campo pinta o próprio fundo — a
         * regra de `acessibilidade.test.ts`, que nasceu do campo de busca ficar
         * com texto invisível ao herdar a cor de um cabeçalho escuro.
         */
        className="max-w-[14rem] truncate rounded-md border bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)] disabled:opacity-60"
        aria-busy={trocando}
      >
        {empresas.map((e) => (
          <option key={e.empresaId} value={e.empresaId}>
            {e.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
