import { prazoDeGracaVencido } from "./retencao.ts";

/**
 * A execução da política de retenção e exclusão de dados (LGPD).
 *
 * Duas trilhas, com prazos diferentes porque respondem a perguntas
 * diferentes — ver `retencao.ts` para a primeira e o comentário de
 * `executarExclusaoLgpd` para a segunda:
 *
 *   1. **Carência após cancelamento.** Documento de habilitação (arquivo em
 *      `documentos_da_empresa` e `atestados`) some sozinho, `DIAS_DE_GRACA_
 *      APOS_CANCELAMENTO` dias depois de a empresa perder cobertura — o que a
 *      view `cobertura_da_empresa` responde, porque a assinatura pertence a
 *      quem paga e uma pessoa pode sustentar várias empresas. O
 *      histórico de triagem continua — ele não é "documento do cliente", é o
 *      registro de uma decisão do produto, e é o que sustenta o suporte
 *      ("por que eu não recebi esse edital?") mesmo depois do cancelamento.
 *
 *   2. **Pedido explícito de exclusão.** Some tudo que é específico daquela
 *      empresa: documento, atestado, perfil declarado e histórico de
 *      triagem. O que NÃO sai — de propósito, sob a exceção do art. 16, IV
 *      da LGPD (uso exclusivo do controlador, sem repasse a terceiro) — é
 *      `acoes_na_oportunidade` e `eventos_de_auditoria`: as duas já nascem
 *      sem policy de DELETE para nenhum papel (ver os comentários das
 *      tabelas no banco), porque são a prova de o que o produto mostrou e o
 *      que o cliente fez, caso uma disputa apareça depois.
 *
 * ## Sem `server-only`, pelo mesmo motivo de `triagem/repositorio.ts`
 *
 * Quem chama isto são os scripts em `scripts/lgpd-*.ts`, Node puro — aquele
 * pacote lança fora da condição `react-server`.
 *
 * ## Por que fetch cru, e não o SDK, para o Postgres
 *
 * Mesmo padrão do resto de `src/lib/*​/repositorio.ts`: script agendado,
 * sem sessão, credencial de serviço só. Para o Storage a regra muda — a
 * documentação do Supabase é explícita: "Deleting objects should always be
 * done via the Storage API and NOT via a SQL query", porque a tabela
 * `storage.objects` é só metadado; apagar a linha sem passar pela API deixa
 * o arquivo de verdade órfão no bucket. `apagarArquivos` chama o endpoint
 * de exclusão em lote da própria API de Storage, nunca `DELETE FROM
 * storage.objects`.
 */

const BUCKET_DE_DOCUMENTOS = "documentos-da-empresa";

export type ResumoDeDocumentos = {
  documentos: number;
  arquivos: number;
  atestados: number;
};

export type ResumoDeExclusaoLgpd = ResumoDeDocumentos & {
  decisoesDeTriagem: number;
  perfilApagado: boolean;
};

export type ClienteLgpd = {
  apagarDocumentosEAtestados(empresaId: string): Promise<ResumoDeDocumentos>;
  apagarHistoricoDeTriagem(empresaId: string): Promise<number>;
  apagarPerfil(empresaId: string): Promise<boolean>;
  /** Empresas cuja assinatura mais recente encerrou há mais que o prazo de carência. */
  empresasComPrazoDeGracaVencido(agora: Date, diasDeGraca?: number): Promise<string[]>;
};

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

type LinhaDeDocumento = { id: string; caminho_no_storage: string | null };
type LinhaDeCobertura = { empresa_id: string; sem_cobertura_desde: string | null };

/**
 * Abre o cliente, ou devolve `null` sem credencial — mesma escolha de
 * `triagem/repositorio.ts`: "não configurado" e "quebrou" precisam de
 * mensagens diferentes.
 */
export function abrirClienteLgpd(): ClienteLgpd | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  async function apagar(
    caminho: string,
    filtro: string,
    contexto: string,
  ): Promise<number> {
    const resposta = await fetch(`${url}/rest/v1/${caminho}?${filtro}`, {
      method: "DELETE",
      headers: { ...cabecalhos, prefer: "return=representation" },
    });
    if (!resposta.ok) {
      throw new Error(`${contexto}: supabase recusou ${resposta.status} ${await resposta.text()}`);
    }
    const apagadas = (await resposta.json()) as unknown[];
    return apagadas.length;
  }

  async function apagarArquivos(caminhos: string[]): Promise<number> {
    if (caminhos.length === 0) return 0;
    const resposta = await fetch(`${url}/storage/v1/object/${BUCKET_DE_DOCUMENTOS}`, {
      method: "DELETE",
      headers: cabecalhos,
      body: JSON.stringify({ prefixes: caminhos }),
    });
    if (!resposta.ok) {
      throw new Error(`storage: supabase recusou ${resposta.status} ${await resposta.text()}`);
    }
    const removidos = (await resposta.json()) as unknown[];
    return removidos.length;
  }

  return {
    async apagarDocumentosEAtestados(empresaId) {
      const consulta = new URLSearchParams({
        select: "id,caminho_no_storage",
        empresa_id: `eq.${empresaId}`,
      });
      const resposta = await fetch(`${url}/rest/v1/documentos_da_empresa?${consulta}`, {
        headers: cabecalhos,
      });
      if (!resposta.ok) {
        throw new Error(
          `documentos_da_empresa: supabase recusou ${resposta.status} ${await resposta.text()}`,
        );
      }
      const documentos = (await resposta.json()) as LinhaDeDocumento[];
      const caminhos = documentos
        .map((d) => d.caminho_no_storage)
        .filter((c): c is string => c !== null);

      // Arquivo primeiro: se a exclusão do Storage falhar, a linha do banco
      // continua apontando pra ele, e nada fica órfão sem ninguém apontar.
      const arquivos = await apagarArquivos(caminhos);
      const atestados = await apagar(
        "atestados",
        `empresa_id=eq.${empresaId}`,
        "atestados",
      );
      const documentosApagados = await apagar(
        "documentos_da_empresa",
        `empresa_id=eq.${empresaId}`,
        "documentos_da_empresa",
      );

      return { documentos: documentosApagados, arquivos, atestados };
    },

    async apagarHistoricoDeTriagem(empresaId) {
      return apagar(
        "decisoes_de_triagem",
        `empresa_id=eq.${empresaId}`,
        "decisoes_de_triagem",
      );
    },

    async apagarPerfil(empresaId) {
      const apagados = await apagar(
        "perfis_da_empresa",
        `empresa_id=eq.${empresaId}`,
        "perfis_da_empresa",
      );
      return apagados > 0;
    },

    async empresasComPrazoDeGracaVencido(agora, diasDeGraca) {
      // Lê `cobertura_da_empresa`, e não `assinaturas`.
      //
      // A assinatura pertence a QUEM PAGA, não a uma empresa: um contador pode
      // sustentar cinco. Então "quando esta empresa deixou de ser paga?" não é
      // mais uma coluna — é o encontro de duas pontas, a pessoa deixar de ser
      // dona dela ou a assinatura dessa pessoa terminar, o que vier primeiro.
      // A view resolve isso e já devolve uma linha por empresa, o que dispensa
      // a desduplicação por assinatura mais recente que existia aqui.
      //
      // `sem_cobertura_desde` nulo é empresa que NUNCA teve assinatura — o
      // cliente gratuito. Ela não entra na purga porque nenhuma relação paga
      // terminou, e apagar documento dela seria apagar o que não venceu.
      const consulta = new URLSearchParams({
        select: "empresa_id,sem_cobertura_desde",
        sem_cobertura_desde: "not.is.null",
      });
      const resposta = await fetch(`${url}/rest/v1/cobertura_da_empresa?${consulta}`, {
        headers: cabecalhos,
      });
      if (!resposta.ok) {
        throw new Error(
          `cobertura_da_empresa: supabase recusou ${resposta.status} ${await resposta.text()}`,
        );
      }
      const linhas = (await resposta.json()) as LinhaDeCobertura[];

      const vencidas: string[] = [];
      for (const linha of linhas) {
        if (!linha.sem_cobertura_desde) continue;
        if (prazoDeGracaVencido(new Date(linha.sem_cobertura_desde), agora, diasDeGraca)) {
          vencidas.push(linha.empresa_id);
        }
      }
      return vencidas;
    },
  };
}

/**
 * O pedido explícito de exclusão (LGPD, art. 18, IX). Some tudo que é
 * específico da empresa — documento, atestado, perfil declarado, histórico
 * de triagem. Não apaga a linha de `empresas` nem `acoes_na_oportunidade`/
 * `eventos_de_auditoria`: ver o comentário no topo do arquivo.
 */
export async function executarExclusaoLgpd(
  cliente: ClienteLgpd,
  empresaId: string,
): Promise<ResumoDeExclusaoLgpd> {
  const documentos = await cliente.apagarDocumentosEAtestados(empresaId);
  const decisoesDeTriagem = await cliente.apagarHistoricoDeTriagem(empresaId);
  const perfilApagado = await cliente.apagarPerfil(empresaId);
  return { ...documentos, decisoesDeTriagem, perfilApagado };
}

/**
 * A varredura de carência: só documento e atestado, nunca triagem — ver o
 * comentário no topo do arquivo sobre por que as duas trilhas têm prazo
 * diferente.
 */
export async function purgarDocumentosDeEmpresasCanceladas(
  cliente: ClienteLgpd,
  agora: Date,
  diasDeGraca?: number,
): Promise<{ empresaId: string; resumo: ResumoDeDocumentos }[]> {
  const empresas = await cliente.empresasComPrazoDeGracaVencido(agora, diasDeGraca);
  const resultados: { empresaId: string; resumo: ResumoDeDocumentos }[] = [];
  for (const empresaId of empresas) {
    const resumo = await cliente.apagarDocumentosEAtestados(empresaId);
    resultados.push({ empresaId, resumo });
  }
  return resultados;
}
