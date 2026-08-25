import "server-only";

import type { OportunidadeDoResumo } from "./plano.ts";
import {
  FILTRO_POSTGREST_DE_VIVAS,
  leituraInclusaNoPlano as planoInclui,
  recebeOResumo,
} from "../assinatura/vivas.ts";

/**
 * De onde vêm os dados do resumo diário, e para onde vai o registro do envio.
 *
 * Mesma forma de `alertas/repositorio.ts` — `fetch` cru contra o PostgREST, sem
 * cliente do Supabase — e pela mesma razão declarada lá: este código roda em
 * script de agendamento, e a chave de serviço não pode encostar em nada que o
 * navegador alcance.
 */

export type EmpresaParaResumo = {
  id: string;
  nome: string;
  /** Para onde mandar. Vem das preferências, ou do dono da conta. */
  email: string;
  ufsAtendidas: string[];
  preferencias: { scoreMinimo: number; maximoPorEnvio: number };
  /**
   * O plano desta empresa inclui abrir o arquivo do edital?
   *
   * Lido de `planos.limite_de_analises_profundas` pela assinatura viva: zero
   * significa que o plano É de lista, e não que a cota acabou. É a tabela de
   * cobrança dizendo o que o produto é.
   *
   * Sem assinatura viva legível, o padrão é `false`. O erro para o lado de
   * prometer menos: dizer "o seu plano não inclui" a quem paga pela leitura é
   * um susto que o suporte desfaz numa frase; dizer "ainda não lemos" a quem
   * nunca vai ser lido é a promessa que vira reembolso.
   */
  leituraInclusaNoPlano: boolean;
};

export type Repositorio = {
  /** Empresas com assinatura viva do titular, com perfil, com e-mail e com o canal LIGADO. */
  destinatarias(): Promise<EmpresaParaResumo[]>;
  oportunidadesDe(empresaId: string): Promise<OportunidadeDoResumo[]>;
  jaEnviados(empresaId: string): Promise<Set<string>>;
  registrar(empresaId: string, editaisIds: string[], idNoProvedor: string | null): Promise<number>;
};

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const numero = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Abre o repositório, ou `null` quando falta credencial. Ver `alertas/repositorio.ts`. */
export function abrirRepositorioDoResumo(): Repositorio | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  const cabecalhos = {
    apikey: chave,
    authorization: `Bearer ${chave}`,
    "content-type": "application/json",
  };

  async function pedir(caminho: string, init?: RequestInit): Promise<unknown> {
    const resposta = await fetch(`${url}/rest/v1/${caminho}`, {
      ...init,
      headers: { ...cabecalhos, ...(init?.headers ?? {}) },
    });
    if (!resposta.ok) {
      throw new Error(`${caminho.split("?")[0]}: supabase respondeu ${resposta.status} ${await resposta.text()}`);
    }
    return resposta.status === 204 ? null : await resposta.json();
  }

  /*
   * O e-mail do dono, pela API de administração do Auth.
   *
   * `auth.users` não é exposta pelo PostgREST, e é bom que não seja. Em vez de
   * abrir uma view ou uma função só para isto — superfície nova num esquema que
   * hoje está bem fechado —, usamos o endpoint de administração, que a chave de
   * serviço já pode chamar. Mesmo nível de confiança do acesso que este arquivo
   * já tem.
   */
  async function emailDoUsuario(usuarioId: string): Promise<string | null> {
    try {
      const resposta = await fetch(`${url}/auth/v1/admin/users/${usuarioId}`, { headers: cabecalhos });
      if (!resposta.ok) return null;
      const corpo = (await resposta.json()) as Record<string, unknown>;
      return texto(corpo.email);
    } catch {
      // Falha aqui significa um destinatário a menos nesta execução, e não uma
      // execução a menos. O log do script mostra quantas empresas entraram.
      return null;
    }
  }

  return {
    async destinatarias() {
      /*
       * O `select` embutido traz perfil e preferências numa consulta só.
       *
       * Uma por empresa seria N+1 contra o banco em cada madrugada, e o custo
       * some enquanto há uma empresa cadastrada — que é exatamente quando
       * ninguém percebe que ele existe.
       */
      const consulta = new URLSearchParams({
        select:
          "id,razao_social,nome_fantasia," +
          "perfis_da_empresa(ufs_atendidas)," +
          "preferencias_de_envio(canal_email,email,score_minimo,maximo_por_envio)," +
          "membros_da_empresa(usuario_id,papel,removido_em)",
      });

      /*
       * As assinaturas vêm numa consulta À PARTE, e não embutidas em
       * `empresas`, porque não existe caminho entre as duas tabelas:
       * `assinaturas.titular_id` aponta para `auth.users`, e a empresa chega
       * ao usuário por `membros_da_empresa`. Sem chave estrangeira entre
       * `empresas` e `assinaturas`, o PostgREST não consegue embutir — ele
       * recusa a consulta inteira com PGRST200.
       *
       * Escrevi o embed assim mesmo em 25/08 e só descobri conferindo o
       * esquema. O erro seria barulhento (o `pedir` lança, e o job de envio
       * falharia), mas barulhento na madrugada é barulhento tarde demais.
       */
      const [linhas, linhasDeAssinatura] = await Promise.all([
        pedir(`empresas?${consulta}`),
        pedir(
          "assinaturas?select=titular_id,status,planos(limite_de_analises_profundas)" +
            `&status=${FILTRO_POSTGREST_DE_VIVAS}`,
        ),
      ]);
      if (!Array.isArray(linhas)) return [];

      /** A assinatura viva de cada titular, por `usuario_id`. */
      const assinaturaDoTitular = new Map<string, Record<string, unknown>>();
      if (Array.isArray(linhasDeAssinatura)) {
        for (const bruta of linhasDeAssinatura) {
          const a = bruta as Record<string, unknown>;
          const titular = texto(a.titular_id);
          // A primeira ganha: o filtro já trouxe só as vivas, e uma conta com
          // duas vivas ao mesmo tempo é problema de cobrança, não de envio.
          if (titular && !assinaturaDoTitular.has(titular)) assinaturaDoTitular.set(titular, a);
        }
      }

      const empresas: EmpresaParaResumo[] = [];

      for (const bruta of linhas) {
        const l = bruta as Record<string, unknown>;
        const id = texto(l.id);
        if (!id) continue;

        const perfil = (Array.isArray(l.perfis_da_empresa) ? l.perfis_da_empresa[0] : l.perfis_da_empresa) as
          | Record<string, unknown>
          | undefined;
        const prefs = (Array.isArray(l.preferencias_de_envio) ? l.preferencias_de_envio[0] : l.preferencias_de_envio) as
          | Record<string, unknown>
          | undefined;

        /*
         * Sem perfil não há recorte, e sem recorte o "resumo" seria a lista
         * inteira do país — que não é o produto que ninguém contratou.
         */
        if (!perfil) continue;

        /*
         * `canal_email` desligado é o DESCADASTRO do cliente, e é aqui que ele
         * vale. Ausência de linha significa que a empresa nunca configurou nada,
         * e o padrão do banco é ligado — igual ao que a tela mostra.
         */
        if (prefs && prefs.canal_email === false) continue;

        /*
         * O destino: o que a empresa configurou, ou o dono da conta.
         *
         * A primeira versão exigia o e-mail configurado, e estava errada de um
         * jeito que só apareceu ao olhar o banco: NENHUMA empresa tem linha em
         * `preferencias_de_envio` — a tabela acabou de nascer. O produto teria
         * ficado inerte, em silêncio, esperando alguém preencher um formulário
         * que ninguém sabia que precisava preencher.
         *
         * O dono é o destinatário natural: foi ele quem criou a conta, com esse
         * endereço. Configurar outro continua possível, e passa na frente.
         */
        const dono = (Array.isArray(l.membros_da_empresa) ? l.membros_da_empresa : [])
          .map((m) => m as Record<string, unknown>)
          .find((m) => m.papel === "dono" && m.removido_em === null);

        const usuarioDoDono = texto(dono?.usuario_id);
        const email = texto(prefs?.email) ?? (usuarioDoDono ? await emailDoUsuario(usuarioDoDono) : null);
        if (!email) continue;

        const ufs = Array.isArray(perfil.ufs_atendidas)
          ? perfil.ufs_atendidas.filter((u): u is string => typeof u === "string").map((u) => u.toUpperCase())
          : [];

        /*
         * A assinatura é do TITULAR (um usuário), não da empresa. O dono da
         * conta é quem a contratou, e é por ele que se chega ao plano.
         */
        const viva = usuarioDoDono ? assinaturaDoTitular.get(usuarioDoDono) : undefined;

        /*
         * O PORTÃO. Sem assinatura viva do titular, não sai e-mail.
         *
         * Até 25/08 esta linha não existia, e a consulta acima servia só para
         * descobrir a profundidade do plano. O efeito era que qualquer conta com
         * perfil recebia o resumo diário para sempre — o alerta gratuito que
         * acabou naquele dia, de volta pela porta dos fundos e com outro nome.
         * Sem isto, `encerrar_testes_vencidos()` marca `encerrada` no banco e o
         * e-mail continua saindo, que é o pior dos dois mundos: a métrica diz
         * que o teste acabou e o cliente não sente nada.
         *
         * A decisão mora em `assinatura/vivas.ts` porque este arquivo é
         * `server-only` e fala com o PostgREST: aqui ela não teria como ser
         * testada sem subir banco.
         */
        if (!recebeOResumo(viva)) continue;

        const planoDaAssinatura = (
          Array.isArray(viva?.planos) ? viva?.planos[0] : viva?.planos
        ) as Record<string, unknown> | undefined;

        const leituraInclusaNoPlano = planoInclui(
          planoDaAssinatura?.limite_de_analises_profundas,
          planoDaAssinatura !== undefined,
        );

        empresas.push({
          id,
          nome: texto(l.nome_fantasia) ?? texto(l.razao_social) ?? "sua empresa",
          email,
          ufsAtendidas: ufs,
          preferencias: {
            scoreMinimo: numero(prefs?.score_minimo) ?? 70,
            maximoPorEnvio: numero(prefs?.maximo_por_envio) ?? 8,
          },
          leituraInclusaNoPlano,
        });
      }

      return empresas;
    },

    async oportunidadesDe(empresaId) {
      const consulta = new URLSearchParams({
        select:
          "edital_id,score,analise_id," +
          "editais(id,objeto,orgao_nome,municipio,uf,valor_estimado,encerramento_proposta,link)," +
          "analises_de_edital(profundidade)",
        empresa_id: `eq.${empresaId}`,
        situacao: "eq.nova",
        order: "score.desc.nullslast",
        limit: "100",
      });

      const linhas = await pedir(`oportunidades?${consulta}`);
      if (!Array.isArray(linhas)) return [];

      return linhas.flatMap((bruta) => {
        const l = bruta as Record<string, unknown>;
        const e = (Array.isArray(l.editais) ? l.editais[0] : l.editais) as Record<string, unknown> | undefined;
        const a = (Array.isArray(l.analises_de_edital) ? l.analises_de_edital[0] : l.analises_de_edital) as
          | Record<string, unknown>
          | undefined;

        const editalId = texto(e?.id);
        const objeto = texto(e?.objeto);
        const link = texto(e?.link);
        // Sem objeto ou sem link a linha não vira item: a primeira coisa não
        // teria o que dizer, e a segunda não teria para onde levar.
        if (!editalId || !objeto || !link) return [];

        return [{
          editalId,
          objeto,
          orgao: texto(e?.orgao_nome) ?? "órgão não informado",
          municipio: texto(e?.municipio) ?? "município não informado",
          uf: texto(e?.uf)?.toUpperCase() ?? "não informada",
          valorEstimado: numero(e?.valor_estimado),
          encerramentoProposta: texto(e?.encerramento_proposta),
          link,
          score: numero(l.score),
          /*
           * "Lido" é `documento_parcial` ou `documento_completo`, e NUNCA
           * `lista`. `lista` significa que a análise olhou a ficha do portal —
           * o mesmo que o cliente já vê sem nós. Tratar as três como iguais
           * afirmaria leitura onde não houve, que é a promessa que este produto
           * passou meses sem cumprir.
           */
          leuTexto: a?.profundidade === "documento_parcial" || a?.profundidade === "documento_completo",
        }];
      });
    },

    async jaEnviados(empresaId) {
      const consulta = new URLSearchParams({
        select: "edital_id",
        empresa_id: `eq.${empresaId}`,
      });

      const linhas = await pedir(`envios_do_resumo?${consulta}`);
      if (!Array.isArray(linhas)) return new Set();

      return new Set(
        linhas
          .map((linha) => (linha as Record<string, unknown>).edital_id)
          .filter((id): id is string => typeof id === "string"),
      );
    },

    async registrar(empresaId, editaisIds, idNoProvedor) {
      if (editaisIds.length === 0) return 0;

      /*
       * `resolution=ignore-duplicates` pela mesma razão do alerta de lead: se o
       * envio saiu e a gravação falhou no meio, rodar de novo grava o que falta
       * sem reclamar do que já está. A unicidade da tabela é o que garante que
       * "de novo" não vira "duas vezes".
       */
      await pedir(`envios_do_resumo`, {
        method: "POST",
        headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(
          editaisIds.map((editalId) => ({
            empresa_id: empresaId,
            edital_id: editalId,
            id_no_provedor: idNoProvedor,
          })),
        ),
      });

      return editaisIds.length;
    },
  };
}
