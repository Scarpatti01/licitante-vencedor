import "server-only";
import { createClient } from "@supabase/supabase-js";
import { calcularFunil, lerResumoDoFunil, type DadosDoFunil, type PeriodoDoFunil, type ResumoDoFunil } from "./funil";

const TAMANHO_DA_PAGINA = 200;
const MAXIMO_DE_PAGINAS = 10;

/** Leitura administrativa existente. Não cria funções nem muda privilégios. */
export async function consultarFunil(dias: PeriodoDoFunil): Promise<ResumoDoFunil | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !chave) return null;
  const agora = new Date();
  const desde = new Date(agora.getTime() - dias * 86_400_000).toISOString();
  const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

  async function linhas(tabela: string, colunas: string, filtros: Record<string, string> = {}, ordem = "id.asc") {
    const todas: Record<string, unknown>[] = [];
    for (let pagina = 0; pagina < MAXIMO_DE_PAGINAS; pagina++) {
      const consulta = new URLSearchParams({ select: colunas, order: ordem, limit: String(TAMANHO_DA_PAGINA), offset: String(pagina * TAMANHO_DA_PAGINA), ...filtros });
      const resposta = await fetch(`${url}/rest/v1/${tabela}?${consulta}`, {
        headers: { apikey: chave!, authorization: `Bearer ${chave}` }, cache: "no-store", signal: AbortSignal.timeout(10_000),
      });
      if (!resposta.ok) throw new Error(`Leitura do funil indisponível (HTTP ${resposta.status}).`);
      const lote: unknown = await resposta.json();
      if (!Array.isArray(lote) || lote.some((r) => !r || typeof r !== "object")) throw new Error("Resposta de leitura inválida.");
      todas.push(...lote);
      if (lote.length < TAMANHO_DA_PAGINA) return todas;
    }
    throw new Error("Limite de leitura atingido. O painel não apresenta contagens parciais.");
  }
  const registros = await linhas("leads", "email,recebido_em,confirmado_em", { recebido_em: `gte.${desde}` }, "recebido_em.asc,id.asc");
  const dados: DadosDoFunil = { cadastros: registros.map((r) => ({ email: String(r.email), recebidoEm: String(r.recebido_em), confirmadoEm: r.confirmado_em as string | null })), contas: [], empresas: [], assinaturas: [] };
  const entrada = calcularFunil(dados, dias, agora);
  if (!entrada.confirmados) return lerResumoDoFunil(entrada);
  const emails = new Set(dados.cadastros.filter((c) => c.confirmadoEm).map((c) => c.email.trim().toLowerCase()));
  let terminou = false;
  for (let pagina = 1; pagina <= MAXIMO_DE_PAGINAS; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: TAMANHO_DA_PAGINA });
    if (error) throw new Error("A leitura administrativa das contas falhou.");
    for (const u of data.users) {
      if (u.email && emails.has(u.email.trim().toLowerCase())) dados.contas.push({ id: u.id, email: u.email, criadoEm: u.created_at, confirmadoEm: u.email_confirmed_at ?? null });
    }
    if (data.users.length < TAMANHO_DA_PAGINA) { terminou = true; break; }
  }
  if (!terminou) throw new Error("Limite de leitura das contas atingido.");
  const ids = dados.contas.map((c) => c.id);
  if (!ids.length) return lerResumoDoFunil(calcularFunil(dados, dias, agora));
  // Lotes curtos mantêm a URL abaixo dos limites de intermediários HTTP.
  for (let inicio = 0; inicio < ids.length; inicio += 50) {
    const filtro = `in.(${ids.slice(inicio, inicio + 50).join(",")})`;
    const [empresas, assinaturas] = await Promise.all([
      linhas("empresas", "id,criado_por,criado_em", { criado_por: filtro }),
      linhas("assinaturas", "titular_id,status,referencia_externa", { titular_id: filtro }),
    ]);
    dados.assinaturas.push(...assinaturas.map((a) => ({ usuarioId: String(a.titular_id), ativa: a.status === "ativa", referenciaExterna: a.referencia_externa as string | null })));
    for (let grupo = 0; grupo < empresas.length; grupo += 50) {
      const lote = empresas.slice(grupo, grupo + 50);
      const dasEmpresas = `in.(${lote.map((e) => e.id).join(",")})`;
      const [perfis, recortes, acoes] = await Promise.all([
        linhas("perfis_da_empresa", "empresa_id,palavras_chave", { empresa_id: dasEmpresas }, "empresa_id.asc"),
        linhas("recortes_da_empresa", "empresa_id,palavras_chave", { empresa_id: dasEmpresas }),
        linhas("acoes_na_oportunidade", "empresa_id,feita_por", { empresa_id: dasEmpresas, situacao: "neq.nova", criado_em: `gte.${desde}` }),
      ]);
      for (const e of lote) dados.empresas.push({ id: String(e.id), usuarioId: String(e.criado_por), criadoEm: String(e.criado_em),
        configurada: [...perfis, ...recortes].some((p) => p.empresa_id === e.id && Array.isArray(p.palavras_chave) && p.palavras_chave.length > 0),
        interacoesPor: acoes.filter((a) => a.empresa_id === e.id).map((a) => String(a.feita_por)),
      });
    }
  }
  return lerResumoDoFunil(calcularFunil(dados, dias, agora));
}
