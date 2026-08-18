import type { PerfilDaEmpresa, TipoDeDocumento } from "../dominio/tipos.ts";
import type { Edital } from "../fontes/tipos.ts";
import type { decisaoParaLinha, oportunidadeParaLinha } from "./mapeamento.ts";

/**
 * As consultas que o processo de triagem precisa fazer no banco: ler quem
 * assina (perfil) e o que está aberto (edital), gravar o que `mapeamento.ts`
 * produziu.
 *
 * ## Por que este arquivo tem seu próprio leitor de perfil
 *
 * `src/lib/dados/supabase.ts` já lê `PerfilDaEmpresa` do Postgres — mas para UMA
 * empresa, a da sessão, com `@supabase/ssr` e cookie. Aqui é o oposto: TODAS as
 * empresas com onboarding completo, num processo agendado sem sessão nenhuma.
 * Reusar aquele módulo arrastaria `server-only` para dentro de um script Node
 * puro, que é exatamente o defeito que `alertas/repositorio.ts` e
 * `editais/gravar.ts` já documentam e evitam — mesmo padrão, mesma razão.
 *
 * O preço de duplicar a leitura é pequeno e visível (queries parecidas em dois
 * arquivos); o preço de não duplicar seria dois runtimes incompatíveis
 * competindo pela mesma importação, e isso já quebrou a publicação de posts e o
 * alerta de e-mail neste projeto — duas vezes, ver
 * `src/lib/workflows-instalam-dependencias.test.ts`.
 *
 * ## A armadilha nomeada em `docs/produto/roadmap.md`
 *
 * Reconstruir `PerfilDaEmpresa` a partir de quatro tabelas é um caminho onde o
 * erro não derruba nada — produz um score plausível e errado.
 * `ticketMaximo` lido como `ticketMinimo` faz o critério de valor pontuar ao
 * contrário, e o número que sai parece tão razoável quanto o certo. A defesa
 * não é revisão de código, que não pega troca entre dois campos do mesmo tipo:
 * é o teste de ida e volta em `repositorio.test.ts`, que grava um perfil
 * conhecido, lê de novo, e exige igualdade campo a campo.
 */

/**
 * Como o Postgres devolve uma linha de `editais` (mesmas colunas de
 * `editais/gravar.ts:paraLinha`).
 *
 * Exportado para `dados/supabase.ts` reusar junto de `editalDaLinha`: a leitura
 * da tela e a leitura do script de triagem precisam do mesmo `Edital` a partir
 * da mesma tabela, e duplicar o formato das colunas numa terceira cópia é
 * exatamente o tipo de divergência silenciosa que este arquivo existe para
 * evitar em relação a `editais/gravar.ts`.
 */
export type LinhaDoEdital = {
  id: string;
  id_canonico: string;
  fonte: string;
  id_na_fonte: string;
  objeto: string;
  orgao_cnpj: string | null;
  orgao_nome: string;
  orgao_esfera: string;
  uf: string;
  municipio: string;
  municipio_slug: string;
  codigo_ibge: string;
  modalidade: string;
  modo_disputa: string | null;
  instrumento: string | null;
  amparo_legal: string | null;
  registro_de_precos: boolean;
  valor_estimado: string | number | null;
  valor_estimado_bruto: string | number | null;
  valor_suspeito: boolean;
  abertura_proposta: string | null;
  encerramento_proposta: string | null;
  publicado_em: string | null;
  situacao: string | null;
  link: string;
  coletado_em: string;
};

type LinhaDoPerfil = {
  porte: string;
  faturamento_anual: string | number | null;
  cnaes: string[] | null;
  palavras_chave: string[] | null;
  palavras_excluidas: string[] | null;
  ufs_atendidas: string[] | null;
  municipios_prioritarios: string[] | null;
  ticket_minimo: string | number | null;
  ticket_maximo: string | number | null;
  modalidades_aceitas: string[] | null;
  atualizado_em: string;
};

type LinhaDoDocumento = {
  tipo: string;
  descricao: string | null;
  valido_ate: string | null;
  sem_validade: boolean;
  arquivo_anexado: boolean;
};

type LinhaDoAtestado = {
  objeto: string;
  valor: string | number | null;
  orgao: string | null;
  ano: number | null;
};

type LinhaDaEmpresa = {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  perfis_da_empresa: LinhaDoPerfil | LinhaDoPerfil[] | null;
  documentos_da_empresa: LinhaDoDocumento[] | null;
  atestados: LinhaDoAtestado[] | null;
};

/**
 * `numeric` do Postgres chega como STRING no PostgREST — guarda mais precisão
 * do que um `double` de JavaScript representa, e a biblioteca prefere entregar
 * o texto exato a arredondar em silêncio. `null` continua `null`: um
 * faturamento não informado não pode virar zero na volta, ou o motor de score
 * passaria a tratar "não quis dizer" como "não fatura".
 */
function numero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** PostgREST devolve objeto para 1:1 e array para 1:N; aceita os dois. */
function primeira<T>(valor: T | T[] | null | undefined): T | null {
  if (valor === null || valor === undefined) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

/** A linha de `editais` virando o `Edital` que o motor de score consome. */
export function editalDaLinha(linha: LinhaDoEdital): Edital {
  return {
    id: linha.id_canonico,
    fonte: linha.fonte,
    idNaFonte: linha.id_na_fonte,
    objeto: linha.objeto,
    orgao: {
      // `orgao_cnpj` é `null` quando a fonte publicou um CNPJ que não passa no
      // `check` da coluna. `Edital.orgao.cnpj` não é opcional — string vazia é
      // a mesma escolha de `""` que o resto da leitura usa para texto ausente.
      cnpj: linha.orgao_cnpj ?? "",
      nome: linha.orgao_nome,
      esfera: linha.orgao_esfera as Edital["orgao"]["esfera"],
    },
    local: {
      uf: linha.uf,
      municipio: linha.municipio,
      municipioSlug: linha.municipio_slug,
      codigoIbge: linha.codigo_ibge,
    },
    modalidade: linha.modalidade,
    modoDisputa: linha.modo_disputa,
    instrumento: linha.instrumento,
    amparoLegal: linha.amparo_legal,
    registroDePrecos: linha.registro_de_precos,
    valorEstimado: numero(linha.valor_estimado),
    // A coluna não guarda o que a fonte publicou quando o estimado foi
    // descartado (ver `editais/gravar.ts:paraLinha`) — só o valor final.
    // `valorEstimadoBruto` na volta é o mesmo número, e não o bruto original;
    // é o que a tabela tem para devolver.
    valorEstimadoBruto: numero(linha.valor_estimado_bruto),
    valorSuspeito: linha.valor_suspeito,
    aberturaProposta: linha.abertura_proposta,
    encerramentoProposta: linha.encerramento_proposta,
    publicadoEm: linha.publicado_em,
    situacao: linha.situacao,
    link: linha.link,
    coletadoEm: linha.coletado_em,
  };
}

/** As quatro tabelas do perfil virando o `PerfilDaEmpresa` que o motor de score consome. */
export function perfilDaLinha(linha: LinhaDaEmpresa): PerfilDaEmpresa | null {
  const p = primeira(linha.perfis_da_empresa);

  // A consulta usa `perfis_da_empresa!inner`, então isto não deveria acontecer
  // — mas devolver `null` em vez de forçar o tipo é a mesma escolha de
  // `dados/supabase.ts:montarPerfil` para o mesmo caso.
  if (!p) return null;

  return {
    empresaId: linha.id,
    cnpj: linha.cnpj,
    razaoSocial: linha.razao_social,
    nomeFantasia: linha.nome_fantasia,
    porte: p.porte as PerfilDaEmpresa["porte"],
    faturamentoAnual: numero(p.faturamento_anual),
    cnaes: p.cnaes ?? [],
    palavrasChave: p.palavras_chave ?? [],
    palavrasExcluidas: p.palavras_excluidas ?? [],
    ufsAtendidas: p.ufs_atendidas ?? [],
    municipiosPrioritarios: p.municipios_prioritarios ?? [],
    ticketMinimo: numero(p.ticket_minimo),
    ticketMaximo: numero(p.ticket_maximo),
    documentos: (linha.documentos_da_empresa ?? []).map((d) => ({
      tipo: d.tipo as TipoDeDocumento,
      descricao: d.descricao,
      validoAte: d.valido_ate,
      semValidade: d.sem_validade,
      arquivoAnexado: d.arquivo_anexado,
    })),
    atestados: (linha.atestados ?? []).map((a) => ({
      objeto: a.objeto,
      valor: numero(a.valor),
      orgao: a.orgao,
      ano: a.ano,
    })),
    modalidadesAceitas: p.modalidades_aceitas ?? [],
    atualizadoEm: p.atualizado_em,
  };
}

const SELECAO_DO_PERFIL =
  "id, cnpj, razao_social, nome_fantasia, " +
  "perfis_da_empresa!inner(porte, faturamento_anual, cnaes, palavras_chave, palavras_excluidas, " +
  "ufs_atendidas, municipios_prioritarios, ticket_minimo, ticket_maximo, modalidades_aceitas, atualizado_em), " +
  "documentos_da_empresa(tipo, descricao, valido_ate, sem_validade, arquivo_anexado), " +
  "atestados(objeto, valor, orgao, ano)";

/**
 * Teto por página do PostgREST quando a consulta não pede `Range` — 1000 por
 * padrão, e silencioso: uma consulta sem paginação para de trazer linha
 * nenhuma a partir da 1001ª sem erro, sem aviso, sem `count` que denuncie.
 *
 * Hoje o acervo de editais já passa de 3.000 (ver o comentário de
 * `src/lib/dados/supabase.ts`), e cresce a cada coleta — paginar aqui não é
 * cautela por cautela, é o corte real acontecendo na primeira execução sem
 * ninguém precisar descobrir isso em produção.
 */
const POR_PAGINA = 1000;

export type EditalAberto = { uuid: string; edital: Edital };

export type Repositorio = {
  /** Toda empresa com onboarding completo (`ativa` e com `perfis_da_empresa`). */
  perfis(): Promise<PerfilDaEmpresa[]>;
  /** Editais com proposta ainda aberta, mais recente primeiro a encerrar. */
  editaisAbertos(agora?: Date): Promise<EditalAberto[]>;
  /**
   * Grava as oportunidades (upsert por `empresa_id, edital_id`).
   *
   * Devolve o id de cada linha gravada, por `empresa_id:edital_id` — é o que
   * `decisoes_de_triagem.oportunidade_id` precisa para linkar, e só existe
   * depois deste INSERT (gerado pelo banco ou já existente de uma triagem
   * anterior).
   */
  gravarOportunidades(linhas: ReturnType<typeof oportunidadeParaLinha>[]): Promise<Map<string, string>>;
  /** Grava as decisões de triagem (upsert por `empresa_id, edital_id, versao_do_score`). */
  gravarDecisoes(linhas: ReturnType<typeof decisaoParaLinha>[]): Promise<number>;
};

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

/** Tamanho do lote nos POSTs de gravação. Mesmo número de `editais/gravar.ts`, e pelo mesmo motivo: um lote ruim não pode custar os outros. */
const TAMANHO_DO_LOTE = 500;

/**
 * Abre o repositório, ou devolve `null` quando não há credencial — mesma
 * escolha de `alertas/repositorio.ts`: o chamador é um script agendado, e a
 * diferença entre "não configurado" e "quebrou" é a diferença entre uma
 * mensagem clara e um log de erro toda madrugada.
 */
export function abrirRepositorio(): Repositorio | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  async function paginado(caminho: string, parametrosFixos: Record<string, string>) {
    const todos: Record<string, unknown>[] = [];
    for (let inicio = 0; ; inicio += POR_PAGINA) {
      const consulta = new URLSearchParams({
        ...parametrosFixos,
        limit: String(POR_PAGINA),
        offset: String(inicio),
      });
      const resposta = await fetch(`${url}/rest/v1/${caminho}?${consulta}`, { headers: cabecalhos });
      if (!resposta.ok) {
        throw new Error(`${caminho}: supabase respondeu ${resposta.status} ${await resposta.text()}`);
      }
      const pagina = (await resposta.json()) as Record<string, unknown>[];
      todos.push(...pagina);
      if (pagina.length < POR_PAGINA) break;
    }
    return todos;
  }

  return {
    async perfis() {
      const linhas = await paginado("empresas", { select: SELECAO_DO_PERFIL, ativa: "eq.true" });
      const perfis: PerfilDaEmpresa[] = [];
      for (const linha of linhas) {
        const p = perfilDaLinha(linha as unknown as LinhaDaEmpresa);
        if (p) perfis.push(p);
      }
      return perfis;
    },

    async editaisAbertos(agora = new Date()) {
      const linhas = await paginado("editais", {
        select: "*",
        encerramento_proposta: `gt.${agora.toISOString()}`,
        order: "encerramento_proposta.asc",
      });
      return linhas.map((linha) => {
        const l = linha as unknown as LinhaDoEdital;
        return { uuid: l.id, edital: editalDaLinha(l) };
      });
    },

    async gravarOportunidades(linhas) {
      const mapa = new Map<string, string>();
      if (linhas.length === 0) return mapa;

      for (let i = 0; i < linhas.length; i += TAMANHO_DO_LOTE) {
        const lote = linhas.slice(i, i + TAMANHO_DO_LOTE);
        const resposta = await fetch(`${url}/rest/v1/oportunidades?on_conflict=empresa_id,edital_id`, {
          method: "POST",
          headers: {
            ...cabecalhos,
            // `merge-duplicates`: reprocessar atualiza score, criterios e
            // checklist da linha existente. `situacao` não vai no corpo (ver
            // `mapeamento.ts`), e por isso o merge não a toca — é assim que
            // reavaliar não apaga o que o cliente já fez com a oportunidade.
            prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify(lote),
        });

        if (!resposta.ok) {
          throw new Error(`oportunidades: supabase recusou ${resposta.status} ${await resposta.text()}`);
        }

        const gravadas = (await resposta.json()) as { id: string; empresa_id: string; edital_id: string }[];
        for (const g of gravadas) mapa.set(`${g.empresa_id}:${g.edital_id}`, g.id);
      }

      return mapa;
    },

    async gravarDecisoes(linhas) {
      if (linhas.length === 0) return 0;
      let gravadas = 0;

      for (let i = 0; i < linhas.length; i += TAMANHO_DO_LOTE) {
        const lote = linhas.slice(i, i + TAMANHO_DO_LOTE);
        const resposta = await fetch(
          `${url}/rest/v1/decisoes_de_triagem?on_conflict=empresa_id,edital_id,versao_do_score`,
          {
            method: "POST",
            headers: {
              ...cabecalhos,
              prefer: "resolution=merge-duplicates,return=representation",
            },
            body: JSON.stringify(lote),
          },
        );

        if (!resposta.ok) {
          throw new Error(`decisoes_de_triagem: supabase recusou ${resposta.status} ${await resposta.text()}`);
        }

        const linhasGravadas = (await resposta.json()) as unknown[];
        gravadas += linhasGravadas.length;
      }

      return gravadas;
    },
  };
}
