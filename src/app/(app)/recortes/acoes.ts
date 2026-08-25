"use server";

import { refresh } from "next/cache";
import { empresaAtual, repositorio } from "@/lib/dados";
import { lerRecortesDoFormulario } from "@/components/recortes/leitura";
import type { EstadoDoFormulario } from "@/components/perfil/estado";

/**
 * Gravação dos recortes de abrangência.
 *
 * Uma action é um endpoint POST alcançável sem passar pela tela, então as três
 * disciplinas de `perfil/acoes.ts` valem igual aqui:
 *
 * **A empresa vem do servidor.** `empresaAtual()` é o único lugar que decide de
 * quem é o dado da requisição. Aceitar `empresaId` do formulário transformaria
 * esta função em "configure o alerta de quem você quiser".
 *
 * **A validação roda de novo.** O botão "acrescentar" some no terceiro recorte,
 * e isso não vale nada aqui: `lerRecortesDoFormulario` confere o limite sobre o
 * que foi lido, e a função do banco confere de novo sobre o array recebido.
 *
 * **O erro aparece na tela com o que fazer.** Engolir a exceção e devolver
 * "salvo" faria o cliente sair achando que configurou o alerta que ele não
 * configurou, e descobrir no silêncio da manhã seguinte.
 */
export async function salvarRecortes(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const leitura = lerRecortesDoFormulario(dados);

  if (!leitura.ok) {
    const quantos = Object.keys(leitura.erros).length;
    return {
      status: "erro",
      mensagem:
        quantos === 1
          ? "Não salvamos: um campo precisa de correção."
          : `Não salvamos: ${quantos} campos precisam de correção.`,
      erros: leitura.erros,
      salvoEm: null,
    };
  }

  try {
    const repo = await repositorio();
    const empresaId = await empresaAtual();
    await repo.salvarRecortes(empresaId, leitura.recortes);
  } catch (erro) {
    console.error("Falha ao salvar os recortes da empresa", erro);
    return {
      status: "erro",
      mensagem:
        "Não conseguimos gravar agora. Os recortes que já estavam salvos continuam valendo: tente enviar de novo em alguns instantes.",
      erros: {},
      salvoEm: null,
    };
  }

  refresh();

  return {
    status: "sucesso",
    mensagem:
      leitura.recortes.length === 0
        ? "Recortes apagados. Sem recorte, você não recebe alerta."
        : "Salvo. A próxima coleta já usa estes recortes.",
    erros: {},
    salvoEm: new Date().toISOString(),
  };
}
