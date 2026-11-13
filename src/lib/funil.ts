export const PERIODOS_DO_FUNIL = [7, 30, 90] as const;
export type PeriodoDoFunil = (typeof PERIODOS_DO_FUNIL)[number];

export const ETAPAS_DO_FUNIL = [
  { chave: "cadastros", nome: "Cadastro no site", criterio: "E-mail cadastrado no período, contado uma vez." },
  { chave: "confirmados", nome: "E-mail confirmado", criterio: "Confirmou o cadastro, mesmo que tenha saído da lista depois." },
  { chave: "contas", nome: "Conta confirmada", criterio: "Criou e confirmou uma conta com o mesmo e-mail após o cadastro." },
  { chave: "empresas", nome: "Empresa cadastrada", criterio: "Criou pelo menos uma empresa após o cadastro." },
  { chave: "configurados", nome: "Filtros configurados", criterio: "Salvou palavras-chave no perfil ou em um recorte da empresa." },
  { chave: "interacoes", nome: "Interação com edital", criterio: "Registrou uma ação em uma oportunidade da empresa." },
] as const;

export type EtapaDoFunil = (typeof ETAPAS_DO_FUNIL)[number]["chave"];
export type ResumoDoFunil = Record<EtapaDoFunil, number> & {
  dias: PeriodoDoFunil;
  desde: string;
  ate: string;
  assinaturas_ativas: number;
};

export function periodoDoFunil(valor: unknown): PeriodoDoFunil {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return PERIODOS_DO_FUNIL.includes(n as PeriodoDoFunil) ? n as PeriodoDoFunil : 30;
}

/** Resultado ausente ou incoerente não vira um painel de zeros. */
export function lerResumoDoFunil(valor: unknown): ResumoDoFunil {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Resposta do funil inválida.");
  const r = valor as Record<string, unknown>;
  const contagens = [...ETAPAS_DO_FUNIL.map((e) => e.chave), "assinaturas_ativas"];
  if (contagens.some((chave) => !Number.isSafeInteger(r[chave]) || (r[chave] as number) < 0)) {
    throw new Error("Contagens do funil incompletas.");
  }
  if (!PERIODOS_DO_FUNIL.includes(r.dias as PeriodoDoFunil) ||
      typeof r.desde !== "string" || !Number.isFinite(Date.parse(r.desde)) ||
      typeof r.ate !== "string" || !Number.isFinite(Date.parse(r.ate)) || Date.parse(r.desde) > Date.parse(r.ate)) {
    throw new Error("Período do funil inválido.");
  }
  for (let i = 1; i < ETAPAS_DO_FUNIL.length; i++) {
    if ((r[ETAPAS_DO_FUNIL[i].chave] as number) > (r[ETAPAS_DO_FUNIL[i - 1].chave] as number)) {
      throw new Error("As etapas do funil não pertencem à mesma coorte.");
    }
  }
  if ((r.assinaturas_ativas as number) > (r.contas as number)) throw new Error("Assinaturas fora da coorte.");
  return r as ResumoDoFunil;
}

export function taxaDoFunil(total: number, base: number): number | null {
  return base > 0 && total >= 0 && total <= base ? total / base : null;
}

export type DadosDoFunil = {
  cadastros: { email: string; recebidoEm: string; confirmadoEm: string | null }[];
  contas: { id: string; email: string; criadoEm: string; confirmadoEm: string | null }[];
  empresas: { id: string; usuarioId: string; criadoEm: string; configurada: boolean; interacoesPor: string[] }[];
  assinaturas: { usuarioId: string; ativa: boolean; referenciaExterna: string | null }[];
};

/** Uma pessoa com cinco empresas continua contando uma vez em cada etapa. */
export function calcularFunil(dados: DadosDoFunil, dias: PeriodoDoFunil, agora: Date): ResumoDoFunil {
  const ate = agora.getTime();
  const inicio = ate - dias * 86_400_000;
  const resumo: ResumoDoFunil = { dias, desde: new Date(inicio).toISOString(), ate: agora.toISOString(), cadastros: 0, confirmados: 0, contas: 0, empresas: 0, configurados: 0, interacoes: 0, assinaturas_ativas: 0 };
  const coorte = new Map<string, DadosDoFunil["cadastros"][number]>();
  for (const cadastro of dados.cadastros) {
    const quando = Date.parse(cadastro.recebidoEm);
    if (!Number.isFinite(quando) || quando < inicio || quando > ate) continue;
    const chave = cadastro.email.trim().toLowerCase();
    const anterior = coorte.get(chave);
    if (chave && (!anterior || quando < Date.parse(anterior.recebidoEm))) coorte.set(chave, cadastro);
  }
  for (const [email, cadastro] of coorte) {
    resumo.cadastros++;
    if (!cadastro.confirmadoEm || !Number.isFinite(Date.parse(cadastro.confirmadoEm)) || Date.parse(cadastro.confirmadoEm) > ate) continue;
    resumo.confirmados++;
    const conta = dados.contas.find((c) => c.email.trim().toLowerCase() === email && c.confirmadoEm &&
      Date.parse(c.confirmadoEm) <= ate && Date.parse(c.criadoEm) >= Date.parse(cadastro.recebidoEm) && Date.parse(c.criadoEm) <= ate);
    if (!conta) continue;
    resumo.contas++;
    if (dados.assinaturas.some((a) => a.usuarioId === conta.id && a.ativa && a.referenciaExterna?.trim())) resumo.assinaturas_ativas++;
    const empresas = dados.empresas.filter((e) => e.usuarioId === conta.id &&
      Date.parse(e.criadoEm) >= Date.parse(cadastro.recebidoEm) && Date.parse(e.criadoEm) <= ate);
    if (!empresas.length) continue;
    resumo.empresas++;
    const configuradas = empresas.filter((e) => e.configurada);
    if (!configuradas.length) continue;
    resumo.configurados++;
    if (configuradas.some((e) => e.interacoesPor.includes(conta.id))) resumo.interacoes++;
  }
  return resumo;
}
