import { cache } from "react";
import { clienteDoServidor } from "@/lib/auth/cliente";
import { usuarioAtual } from "@/lib/auth/sessao";
import { ETAPAS, type EtapaDaJornada } from "./conteudo";

/**
 * Leitura e gravação da jornada.
 *
 * Nada aqui recebe `usuarioId` de fora. O dono do dado sai sempre de
 * `usuarioAtual()`, no servidor, pelo mesmo motivo que `acoes.ts` dos recortes
 * não aceita `empresaId` do formulário: uma action é um endpoint POST
 * alcançável sem passar pela tela, e aceitar o identificador do cliente
 * transformaria isto em "leia o caderno de quem você quiser".
 *
 * A RLS já barraria, e é justamente por isso que a segunda trava é barata:
 * quando as duas concordam, o defeito precisa vencer as duas.
 */

export type ProgressoDaEtapa = {
  etapa: string;
  concluidaEm: string | null;
};

export type RespostaDaEtapa = {
  campo: string;
  resposta: string;
};

export type EstadoDaJornada = {
  temAcesso: boolean;
  progresso: Map<string, ProgressoDaEtapa>;
  /** Quantas das doze estão concluídas. */
  concluidas: number;
  /** A primeira não concluída, que é onde o botão "continuar" leva. */
  proxima: EtapaDaJornada | null;
};

export const estadoDaJornada = cache(async (): Promise<EstadoDaJornada> => {
  const vazio: EstadoDaJornada = {
    temAcesso: false,
    progresso: new Map(),
    concluidas: 0,
    proxima: ETAPAS[0] ?? null,
  };

  const usuario = await usuarioAtual();
  if (!usuario) return vazio;

  const supabase = await clienteDoServidor();
  if (!supabase) return vazio;

  const { data: acesso, error: erroDoAcesso } = await supabase.rpc("tem_acesso_a_jornada", {
    p_usuario: usuario.id,
  });
  if (erroDoAcesso) {
    // Falha de leitura não é falta de acesso, e tratar as duas igual mandaria
    // um assinante para a página de venda por causa de um soluço de rede. O
    // chamador distingue pelo `temAcesso` falso somado ao log.
    console.error("Falha ao conferir o acesso à jornada", erroDoAcesso);
    return vazio;
  }
  if (!acesso) return vazio;

  /*
   * Registra que esta pessoa entrou, ligando a compra à conta.
   *
   * Não concede nada: o acesso já veio do e-mail, e a função acima é quem
   * decide. Isto existe para o dono conseguir distinguir, na tela de
   * administração, quem pagou e entrou de quem pagou e sumiu, que é a lista de
   * quem precisa de um empurrão.
   *
   * Falha aqui NÃO impede o uso do produto: perder o registro é chato, negar a
   * jornada a quem pagou é grave, e entre os dois a escolha é óbvia.
   */
  const { error: erroDaReivindicacao } = await supabase.rpc("reivindicar_compra_da_jornada");
  if (erroDaReivindicacao) {
    console.error("Falha ao reivindicar a compra da jornada", erroDaReivindicacao);
  }

  const { data, error } = await supabase
    .from("progresso_na_jornada")
    .select("etapa, concluida_em");
  if (error) {
    console.error("Falha ao ler o progresso da jornada", error);
    return { ...vazio, temAcesso: true };
  }

  const progresso = new Map<string, ProgressoDaEtapa>();
  for (const linha of data ?? []) {
    progresso.set(linha.etapa, { etapa: linha.etapa, concluidaEm: linha.concluida_em });
  }

  const concluidas = ETAPAS.filter((e) => progresso.get(e.codigo)?.concluidaEm).length;
  const proxima = ETAPAS.find((e) => !progresso.get(e.codigo)?.concluidaEm) ?? null;

  return { temAcesso: true, progresso, concluidas, proxima };
});

export async function respostasDaEtapa(etapa: string): Promise<Map<string, string>> {
  const usuario = await usuarioAtual();
  if (!usuario) return new Map();

  const supabase = await clienteDoServidor();
  if (!supabase) return new Map();

  const { data, error } = await supabase
    .from("respostas_da_jornada")
    .select("campo, resposta")
    .eq("etapa", etapa);

  if (error) {
    console.error("Falha ao ler as respostas da etapa", etapa, error);
    return new Map();
  }
  return new Map((data ?? []).map((l) => [l.campo, l.resposta]));
}

export async function salvarRespostas(
  etapa: string,
  respostas: RespostaDaEtapa[],
): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) throw new Error("sem sessão");

  const supabase = await clienteDoServidor();
  if (!supabase) throw new Error("autenticação não configurada");

  // Campo esvaziado é campo apagado, e não string vazia guardada para sempre.
  // Quem limpa uma resposta está exercendo o direito de eliminação na tela, e a
  // linha precisa sumir de verdade para que isso seja verdade.
  const paraApagar = respostas.filter((r) => r.resposta.trim() === "").map((r) => r.campo);
  const paraGravar = respostas.filter((r) => r.resposta.trim() !== "");

  if (paraApagar.length > 0) {
    const { error } = await supabase
      .from("respostas_da_jornada")
      .delete()
      .eq("etapa", etapa)
      .in("campo", paraApagar);
    if (error) throw error;
  }

  if (paraGravar.length > 0) {
    const { error } = await supabase.from("respostas_da_jornada").upsert(
      paraGravar.map((r) => ({
        usuario_id: usuario.id,
        etapa,
        campo: r.campo,
        resposta: r.resposta.trim(),
        atualizado_em: new Date().toISOString(),
      })),
      { onConflict: "usuario_id,etapa,campo" },
    );
    if (error) throw error;
  }

  // Abrir e escrever já é ter começado. Sem esta linha, a lista mostraria a
  // etapa como intocada enquanto a pessoa tem meia página preenchida nela.
  await registrarInicio(etapa);
}

export async function registrarInicio(etapa: string): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) throw new Error("sem sessão");

  const supabase = await clienteDoServidor();
  if (!supabase) throw new Error("autenticação não configurada");
  const { error } = await supabase
    .from("progresso_na_jornada")
    .upsert(
      { usuario_id: usuario.id, etapa, atualizado_em: new Date().toISOString() },
      { onConflict: "usuario_id,etapa", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function marcarConclusao(etapa: string, concluida: boolean): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) throw new Error("sem sessão");

  const supabase = await clienteDoServidor();
  if (!supabase) throw new Error("autenticação não configurada");
  const { error } = await supabase.from("progresso_na_jornada").upsert(
    {
      usuario_id: usuario.id,
      etapa,
      // Desmarcar é permitido de propósito: quem concluiu por engano precisa
      // conseguir voltar, e uma barra de progresso que só sobe mente.
      concluida_em: concluida ? new Date().toISOString() : null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "usuario_id,etapa" },
  );
  if (error) throw error;
}
