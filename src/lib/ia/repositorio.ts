import type { ExecucaoDeIA } from "./custo.ts";
import { execucaoParaLinha, type ContextoDaExecucao } from "./mapeamento.ts";
import type { LinhaDeExecucao, ResumoMensalDeCusto } from "./tetoDeCusto.ts";

/**
 * As consultas em `execucoes_de_ia` e `avisos_de_custo_de_ia` que o script de
 * custo precisa.
 *
 * Sem `import "server-only"`: mesmo motivo de `alertas/repositorio.ts` — o
 * único consumidor é um script agendado, rodando em Node puro, e o marcador
 * lançaria na importação fora da condição `react-server`. Fala REST do
 * Supabase com a chave de serviço, pela mesma razão de sempre: não existe
 * usuário autenticado num processo que roda por agendamento.
 */

export type RepositorioDeIA = {
  /** Grava uma execução. Não lança em falha de rede — quem chama decide o que fazer. */
  gravarExecucao(execucao: ExecucaoDeIA, contexto: ContextoDaExecucao): Promise<void>;
  /** Todas as execuções cujo `criado_em` cai no mês do instante dado. */
  linhasDoMes(instante: Date): Promise<LinhaDeExecucao[]>;
  /** Já existe aviso registrado para o mês do instante dado? */
  avisoJaEnviadoNoMes(instante: Date): Promise<boolean>;
  /**
   * Registra o aviso deste mês, com o total (em centavos de real) que o
   * e-mail afirmou. Devolve `false` quando outra execução já tinha registrado
   * (a chave primária em `mes` barra a segunda gravação) — quem chama decide
   * se ainda assim manda o e-mail (não deveria).
   */
  registrarAviso(instante: Date, resumo: ResumoMensalDeCusto, totalEmCentavosBrl: number): Promise<boolean>;
};

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

/** Primeiro dia do mês do instante, como `YYYY-MM-DD` — a chave de `avisos_de_custo_de_ia.mes`. */
function inicioDoMes(instante: Date): string {
  return `${instante.getUTCFullYear()}-${String(instante.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Primeiro dia do mês seguinte — o limite superior (exclusivo) da janela de leitura. */
function inicioDoMesSeguinte(instante: Date): string {
  const proximo = new Date(Date.UTC(instante.getUTCFullYear(), instante.getUTCMonth() + 1, 1));
  return proximo.toISOString().slice(0, 10);
}

export function abrirRepositorioDeIA(): RepositorioDeIA | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  return {
    async gravarExecucao(execucao, contexto) {
      const linha = execucaoParaLinha(execucao, contexto);
      const resposta = await fetch(`${url}/rest/v1/execucoes_de_ia`, {
        method: "POST",
        headers: cabecalhos,
        body: JSON.stringify(linha),
      });
      if (!resposta.ok) {
        throw new Error(`execucoes_de_ia: supabase respondeu ${resposta.status} ${await resposta.text()}`);
      }
    },

    async linhasDoMes(instante) {
      /*
       * Paginado, e não `limit` alto sem mais nada — o mesmo corte silencioso do
       * PostgREST que `publicar-posts.ts` documenta (`candidatos`, 1.000 linhas
       * por resposta, sem aviso). Aqui o dado é volume mensal de execução de IA,
       * não editais por prazo, mas a mesma armadilha se aplica: um mês com mais
       * de 1.000 execuções teria o resto simplesmente ausente da soma, sem erro
       * nenhum indicando o corte.
       */
      const POR_PAGINA = 1000;
      const desde = inicioDoMes(instante);
      const ate = inicioDoMesSeguinte(instante);

      const linhas: LinhaDeExecucao[] = [];
      for (let inicio = 0; ; inicio += POR_PAGINA) {
        const consulta = new URLSearchParams({
          select: "modelo,tokens_de_entrada,tokens_de_saida,custo_em_centavos,sucesso",
          criado_em: `gte.${desde}`,
          order: "criado_em.asc",
          limit: String(POR_PAGINA),
          offset: String(inicio),
        });
        // `criado_em=lt.${ate}` não cabe no mesmo `URLSearchParams` sem colidir
        // com a chave `criado_em` já usada acima — PostgREST aceita repetir o
        // parâmetro para compor um intervalo (AND implícito entre eles).
        const destino = `${url}/rest/v1/execucoes_de_ia?${consulta}&criado_em=lt.${ate}`;

        const resposta = await fetch(destino, { headers: cabecalhos });
        if (!resposta.ok) {
          throw new Error(`execucoes_de_ia: supabase respondeu ${resposta.status} ${await resposta.text()}`);
        }

        const pagina = (await resposta.json()) as Record<string, unknown>[];
        for (const linha of pagina) {
          linhas.push({
            modelo: String(linha.modelo ?? "desconhecido"),
            tokensDeEntrada: Number(linha.tokens_de_entrada ?? 0),
            tokensDeSaida: Number(linha.tokens_de_saida ?? 0),
            custoEmCentavosUsd:
              typeof linha.custo_em_centavos === "number" ? linha.custo_em_centavos : null,
            sucesso: linha.sucesso === true,
          });
        }

        if (pagina.length < POR_PAGINA) break;
      }

      return linhas;
    },

    async avisoJaEnviadoNoMes(instante) {
      const consulta = new URLSearchParams({ select: "mes", mes: `eq.${inicioDoMes(instante)}` });
      const resposta = await fetch(`${url}/rest/v1/avisos_de_custo_de_ia?${consulta}`, {
        headers: cabecalhos,
      });
      if (!resposta.ok) {
        throw new Error(`avisos_de_custo_de_ia: supabase respondeu ${resposta.status} ${await resposta.text()}`);
      }
      const linhas = (await resposta.json()) as unknown[];
      return Array.isArray(linhas) && linhas.length > 0;
    },

    async registrarAviso(instante, resumo, totalEmCentavosBrl) {
      const resposta = await fetch(`${url}/rest/v1/avisos_de_custo_de_ia`, {
        method: "POST",
        // Absorve o par que já existia em vez de estourar — mesma defesa de
        // `alertas/repositorio.ts` contra duas execuções concorrentes gravando
        // o mesmo mês.
        headers: { ...cabecalhos, prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify({
          mes: inicioDoMes(instante),
          execucoes: resumo.execucoes,
          execucoes_sem_preco: resumo.execucoesSemPreco,
          total_em_centavos_brl: totalEmCentavosBrl,
        }),
      });
      if (!resposta.ok) {
        throw new Error(`avisos_de_custo_de_ia: supabase respondeu ${resposta.status} ${await resposta.text()}`);
      }
      const gravadas = (await resposta.json()) as unknown[];
      return Array.isArray(gravadas) && gravadas.length > 0;
    },
  };
}
