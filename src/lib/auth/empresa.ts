"use server";

import { redirect } from "next/navigation";
import { cnpjValido } from "@/components/perfil/validacao";
import { clienteDoServidor } from "./cliente";
import type { EstadoDaEmpresa } from "./estado";

/**
 * Cadastro da empresa — o passo que transforma "tenho conta" em "tenho tenant".
 *
 * A escrita inteira acontece dentro de `criar_empresa_com_dono`, no banco, e
 * não aqui. O motivo está na migração: as policies impedem, corretamente, que
 * alguém se insira numa empresa, e por isso o primeiro membro precisa de uma
 * função `security definer`. Fazer os dois inserts daqui exigiria abrir uma
 * policy de INSERT em `membros_da_empresa` — e essa policy seria, na prática,
 * "adicione-se à empresa que você quiser".
 *
 * Como consequência, este arquivo é fino de propósito: valida o que dá para
 * validar sem ida ao banco, chama a função e traduz erro de Postgres em frase
 * de gente.
 */

/** Só os dígitos. A máscara é da interface; o banco quer 14 números. */
const soDigitos = (v: unknown): string =>
  typeof v === "string" ? v.replace(/[^0-9]/g, "") : "";

const texto = (v: FormDataEntryValue | null, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/*
 * `cnpjValido` vem de `components/perfil/validacao`, e não de uma cópia daqui.
 *
 * Cheguei a escrever a duplicata "porque aquele módulo é de componente" — e
 * estava errado: ele não é `"use client"`, importa só um tipo, e já tem teste.
 * Duas implementações do mesmo algoritmo é o começo de duas respostas
 * diferentes para o mesmo CNPJ.
 *
 * Validar aqui, e não só no formulário, porque uma Server Action é alcançável
 * sem passar pela tela. Sem isto, um dígito trocado vira empresa cadastrada com
 * CNPJ que não existe, e ninguém descobre até haver documento e histórico
 * pendurados nela.
 */

export async function criarEmpresa(
  _anterior: EstadoDaEmpresa,
  dados: FormData,
): Promise<EstadoDaEmpresa> {
  const supabase = await clienteDoServidor();
  if (!supabase) return { erro: "O cadastro ainda não está disponível." };

  const cnpj = soDigitos(dados.get("cnpj"));
  const razaoSocial = texto(dados.get("razaoSocial"), 200);
  const nomeFantasia = texto(dados.get("nomeFantasia"), 200);

  if (!cnpjValido(cnpj)) {
    return { erro: "CNPJ inválido. Confira os números." };
  }
  if (razaoSocial.length < 2) {
    return { erro: "Informe a razão social." };
  }

  const { error } = await supabase.rpc("criar_empresa_com_dono", {
    p_cnpj: cnpj,
    p_razao_social: razaoSocial,
    p_nome_fantasia: nomeFantasia || null,
  });

  if (error) {
    /*
     * `23505` é violação de unicidade — o CNPJ já está cadastrado.
     *
     * A mensagem revela que aquele CNPJ existe aqui, e essa é uma escolha
     * consciente com um custo real: alguém pode descobrir, testando, que uma
     * empresa é cliente. Optei por dizer mesmo assim, porque a alternativa
     * trava a pessoa certa. O caso comum não é bisbilhotice, é o segundo sócio
     * cadastrando a mesma empresa — e "não conseguimos cadastrar" o deixaria
     * tentando de novo para sempre, sem descobrir que o caminho é o convite.
     *
     * É o oposto da decisão tomada na tela de login, e de propósito: lá, quem
     * não tem a senha não tem o que fazer com a informação; aqui, quem está
     * bloqueado precisa saber para onde ir.
     */
    if (error.code === "23505") {
      return {
        erro:
          "Este CNPJ já está cadastrado. Se a sua empresa já usa o Licitante Vencedor, peça um convite a quem administra a conta.",
      };
    }
    if (error.code === "28000") {
      return { erro: "Sua sessão expirou. Entre de novo." };
    }
    return { erro: "Não conseguimos cadastrar a empresa agora. Tente mais tarde." };
  }

  // Empresa criada: o vínculo existe e `empresaAtual()` já resolve para ela na
  // próxima requisição. O onboarding continua, agora na parte do perfil.
  redirect("/onboarding/");
}
