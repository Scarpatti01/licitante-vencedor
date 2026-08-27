"use server";

import { refresh } from "next/cache";
import { etapaPorCodigo } from "@/lib/jornada/conteudo";
import { marcarConclusao, salvarRespostas } from "@/lib/jornada/repositorio";

export type EstadoDaEtapa = {
  status: "vazio" | "salvo" | "erro";
  mensagem: string | null;
};

/**
 * Gravação de uma etapa da jornada.
 *
 * Três disciplinas, as mesmas de `recortes/acoes.ts`, porque uma action é um
 * endpoint POST alcançável sem passar pela tela:
 *
 * **O dono do dado vem do servidor.** Nenhuma função daqui aceita
 * `usuarioId`. Quem grava é sempre `usuarioAtual()`, dentro do repositório.
 *
 * **O que veio do formulário é conferido contra o conteúdo.** A etapa e cada
 * campo precisam existir em `conteudo.ts`. Sem isso, um POST fabricado
 * gravaria campo inventado e a exportação em PDF quebraria com dado que a tela
 * nunca produziu.
 *
 * **O erro aparece na tela com o que fazer.** Dizer "salvo" quando não salvou
 * faria a pessoa fechar a aba e perder o que escreveu.
 */
export async function salvarEtapa(
  _anterior: EstadoDaEtapa,
  dados: FormData,
): Promise<EstadoDaEtapa> {
  const codigo = String(dados.get("etapa") ?? "");
  const etapa = etapaPorCodigo(codigo);

  if (!etapa) {
    return { status: "erro", mensagem: "Esta semana não existe na jornada." };
  }

  const respostas = etapa.campos.map((campo) => ({
    campo: campo.codigo,
    resposta: String(dados.get(`campo:${campo.codigo}`) ?? ""),
  }));

  const grande = respostas.find((r) => r.resposta.length > 4000);
  if (grande) {
    const rotulo = etapa.campos.find((c) => c.codigo === grande.campo)?.rotulo ?? grande.campo;
    return {
      status: "erro",
      mensagem: `Não salvamos: "${rotulo}" passou de 4.000 caracteres. Encurte e envie de novo.`,
    };
  }

  const querConcluir = dados.get("concluir") !== null;
  const querReabrir = dados.get("reabrir") !== null;

  try {
    await salvarRespostas(etapa.codigo, respostas);
    if (querConcluir) await marcarConclusao(etapa.codigo, true);
    if (querReabrir) await marcarConclusao(etapa.codigo, false);
  } catch (erro) {
    console.error("Falha ao salvar a etapa da jornada", etapa.codigo, erro);
    return {
      status: "erro",
      mensagem:
        "Não conseguimos gravar agora. O que você escreveu continua na tela: tente enviar de novo em alguns instantes.",
    };
  }

  refresh();

  return {
    status: "salvo",
    mensagem: querConcluir
      ? "Semana concluída. O progresso já está na sua jornada."
      : querReabrir
        ? "Semana reaberta."
        : "Salvo.",
  };
}
