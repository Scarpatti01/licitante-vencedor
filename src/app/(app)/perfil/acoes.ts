"use server";

import { refresh } from "next/cache";
import { empresaAtual, repositorio } from "@/lib/dados";
import { lerPerfilDoFormulario } from "@/components/perfil/leitura";
import type { EstadoDoFormulario } from "@/components/perfil/estado";

/**
 * Gravação do Perfil Inteligente da Empresa.
 *
 * Uma action é um endpoint POST alcançável sem passar pela tela — o guia de
 * Server Actions é explícito nisso. Então três coisas acontecem aqui e não no
 * componente:
 *
 * **A empresa vem do servidor.** `empresaAtual()` é o único lugar do sistema
 * que decide de quem é o dado da requisição. Aceitar `empresaId` do formulário
 * transformaria esta função em "escreva no cadastro de quem você quiser".
 *
 * **A validação roda de novo.** O que o navegador validou não vale nada aqui.
 *
 * **O perfil atual é relido.** Ele é a base sobre a qual o formulário é
 * mesclado — é assim que `arquivoAnexado` de um documento já anexado sobrevive
 * a uma edição feita numa tela que não sabe anexar arquivo.
 *
 * O mesmo par de funções serve o onboarding e a edição do perfil: são a mesma
 * escrita, com destinos diferentes depois dela.
 */

async function gravar(dados: FormData): Promise<EstadoDoFormulario> {
  const repo = await repositorio();
  const empresaId = await empresaAtual();
  const atual = await repo.perfil(empresaId);

  const leitura = lerPerfilDoFormulario(dados, atual, empresaId);

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
    await repo.salvarPerfil(leitura.perfil);
  } catch (erro) {
    // A falha precisa aparecer na tela com o que fazer a seguir. Engolir a
    // exceção e devolver "salvo" seria a pior resposta possível: o usuário sai
    // achando que o cadastro está lá.
    console.error("Falha ao salvar o perfil da empresa", erro);
    return {
      status: "erro",
      mensagem:
        "Não conseguimos gravar o cadastro agora. Nada foi perdido: tente enviar de novo em alguns instantes.",
      erros: {},
      salvoEm: null,
    };
  }

  return {
    status: "sucesso",
    mensagem: "Cadastro salvo.",
    erros: {},
    salvoEm: leitura.perfil.atualizadoEm,
  };
}

/**
 * Uma action só, para o onboarding e para a edição do perfil.
 *
 * Ela não decide para onde ir depois: o assistente e a tela de perfil querem
 * destinos diferentes, e um `redirect` no servidor tiraria de ambos o estado de
 * sucesso que a interface anuncia. Quem navega é o cliente, com o resultado na
 * mão.
 */
export async function salvarPerfilDaEmpresa(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const estado = await gravar(dados);

  if (estado.status !== "sucesso") return estado;

  // O cabeçalho do produto mostra a empresa ativa e o estado do perfil; sem
  // isto ele continuaria exibindo o cadastro anterior até a próxima navegação.
  // `refresh` e não `revalidateTag`: o que mudou está fora do cache de dados.
  refresh();

  return estado;
}
