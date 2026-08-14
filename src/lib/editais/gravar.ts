import type { Edital } from "../fontes/tipos.ts";
import { hashDeConteudo } from "../fontes/mudanca.ts";

/**
 * Os editais coletados indo para o Postgres.
 *
 * Até aqui a coleta gravava JSON, e isso bastava: as páginas regionais são
 * estáticas com revalidação e querem um retrato consistente no build, não
 * consulta viva. O que muda agora é o lado privado — triagem, oportunidades e
 * histórico só existem com o edital no banco, porque é lá que ele se cruza com
 * o perfil de cada empresa.
 *
 * O JSON continua. Ele é o artefato de auditoria da rodada e a entrada do
 * alerta enquanto a leitura do banco não entra; o banco não o substitui, o
 * complementa.
 *
 * ## Sem `server-only`, pelo mesmo motivo de `alertas/repositorio.ts`
 *
 * Quem chama isto é um script de agendamento em Node puro, onde aquele pacote
 * lança na importação — só a condição `react-server` recebe o módulo vazio.
 * Nada aqui é chamado pelo site.
 */

/** O que uma rodada de gravação produziu. */
export type ResultadoDaGravacao = {
  /** Quantos editais o banco confirmou ter recebido. */
  gravados: number;
  /** Lotes que falharam, com o motivo. Vazio é o caso bom. */
  falhas: { lote: number; motivo: string }[];
};

/**
 * Tamanho do lote.
 *
 * Uma UF grande passa de dez mil editais, e mandar tudo num POST só produz um
 * corpo de dezenas de MB — que estoura limite de proxy antes de chegar ao
 * Postgres, e quando não estoura torna a falha total: um registro ruim derruba
 * a rodada inteira. Em lotes, o estrago fica no lote.
 */
const TAMANHO_DO_LOTE = 500;

/** `Edital` do vocabulário do projeto virando linha da tabela. */
export function paraLinha(e: Edital) {
  return {
    id_canonico: e.id,
    fonte: e.fonte,
    id_na_fonte: e.idNaFonte,
    // Calculado na gravação, e não lido do edital, porque `Edital` não carrega
    // hash: ele é derivado, e derivado que viaja acaba divergindo da origem.
    hash_de_conteudo: hashDeConteudo(e),
    objeto: e.objeto,
    orgao_cnpj: /^[0-9]{14}$/.test(e.orgao.cnpj) ? e.orgao.cnpj : null,
    orgao_nome: e.orgao.nome,
    orgao_esfera: e.orgao.esfera,
    uf: e.local.uf.toUpperCase(),
    municipio: e.local.municipio,
    municipio_slug: e.local.municipioSlug,
    codigo_ibge: e.local.codigoIbge,
    modalidade: e.modalidade || "Não informada",
    modo_disputa: e.modoDisputa,
    instrumento: e.instrumento,
    amparo_legal: e.amparoLegal,
    registro_de_precos: e.registroDePrecos,
    // A coluna tem `check (valor_estimado > 0)`. `Edital` já converte o zero do
    // PNCP em `null`, mas um negativo vindo da fonte derrubaria o lote inteiro
    // por causa de um registro — e o bruto continua guardado ao lado.
    valor_estimado: e.valorEstimado !== null && e.valorEstimado > 0 ? e.valorEstimado : null,
    valor_estimado_bruto: e.valorEstimadoBruto,
    valor_suspeito: e.valorSuspeito,
    abertura_proposta: e.aberturaProposta,
    encerramento_proposta: e.encerramentoProposta,
    publicado_em: e.publicadoEm,
    situacao: e.situacao,
    link: e.link,
    coletado_em: e.coletadoEm,
  };
}

/**
 * Grava os editais, atualizando o que já existe.
 *
 * O conflito é resolvido por `(fonte, id_na_fonte)` — a restrição que a tabela
 * declara — e não pela chave primária, que é um uuid gerado aqui e que a fonte
 * não conhece. Editar em vez de duplicar é o comportamento certo: o mesmo
 * edital é recoletado todo dia enquanto estiver aberto, e o que muda nele
 * (prazo adiado, situação, valor corrigido) é justamente o que o cliente
 * precisa ver atualizado.
 *
 * `atualizado_em` NÃO é mandado: a trigger `marcar_atualizacao` cuida dele.
 * Mandar daqui competiria com ela e um dos dois perderia — silenciosamente.
 */
export async function gravarEditais(
  editais: Edital[],
  opcoes: { url: string; chave: string; aoProgredir?: (info: { gravados: number; total: number }) => void },
): Promise<ResultadoDaGravacao> {
  const { url, chave, aoProgredir } = opcoes;
  const resultado: ResultadoDaGravacao = { gravados: 0, falhas: [] };
  if (editais.length === 0) return resultado;

  const destino =
    `${url}/rest/v1/editais?on_conflict=fonte,id_na_fonte`;

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
    // `merge-duplicates` é o upsert do PostgREST. `return=minimal` porque a
    // resposta com as linhas gravadas seria dezenas de MB que ninguém lê.
    prefer: "resolution=merge-duplicates,return=minimal,count=exact",
  };

  for (let i = 0; i < editais.length; i += TAMANHO_DO_LOTE) {
    const lote = editais.slice(i, i + TAMANHO_DO_LOTE);
    const numero = Math.floor(i / TAMANHO_DO_LOTE) + 1;

    try {
      const resposta = await fetch(destino, {
        method: "POST",
        headers: cabecalhos,
        body: JSON.stringify(lote.map(paraLinha)),
      });

      if (!resposta.ok) {
        const corpo = await resposta.text().catch(() => "");
        resultado.falhas.push({
          lote: numero,
          motivo: `${resposta.status} ${corpo.slice(0, 300)}`,
        });
        // Continua nos próximos lotes: um lote ruim não pode custar os outros,
        // pelo mesmo princípio que isola UF na coleta.
        continue;
      }

      resultado.gravados += lote.length;
      aoProgredir?.({ gravados: resultado.gravados, total: editais.length });
    } catch (e) {
      resultado.falhas.push({
        lote: numero,
        motivo: e instanceof Error ? e.message : "falha de rede",
      });
    }
  }

  return resultado;
}
