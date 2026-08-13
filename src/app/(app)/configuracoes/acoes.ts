"use server";

import { empresaAtual } from "@/lib/dados";
import type { EstadoDoFormulario } from "@/components/perfil/estado";
import { apenasDigitos } from "@/components/perfil/validacao";
import { gravarPreferencias, lerPreferencias, PADRAO } from "./preferencias";

/**
 * Gravação das preferências de alerta.
 *
 * A action valida tudo de novo, pelo mesmo motivo da action do perfil: ela é um
 * endpoint POST alcançável sem passar pela tela. E a empresa vem de
 * `empresaAtual()`, nunca do formulário.
 *
 * O intervalo aceito em cada campo é o mesmo que a leitura do cookie aceita —
 * se divergissem, uma preferência válida na gravação voltaria ao padrão na
 * leitura seguinte, e o usuário veria a configuração "não salvar".
 */

function inteiro(
  bruto: string,
  campo: string,
  rotulo: string,
  minimo: number,
  maximo: number,
  erros: Record<string, string>,
  padrao: number,
): number {
  if (bruto.trim() === "") return padrao;
  const numero = Number(bruto);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    erros[campo] = `${rotulo} precisa ser um número inteiro entre ${minimo} e ${maximo}.`;
    return padrao;
  }
  return numero;
}

export async function salvarPreferenciasDeAlerta(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const empresaId = await empresaAtual();
  const atuais = await lerPreferencias(empresaId);
  const erros: Record<string, string> = {};

  const horario = String(dados.get("horario") ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
    erros.horario = "Informe um horário válido, no formato 24 horas.";
  }

  const canalEmail = dados.get("canalEmail") !== null;
  const email = String(dados.get("email") ?? "").trim();
  if (canalEmail && email === "") {
    erros.email = "Para receber por e-mail, informe o endereço.";
  } else if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    erros.email = "Este endereço de e-mail não parece completo.";
  }

  const canalWhatsapp = dados.get("canalWhatsapp") !== null;
  const whatsapp = apenasDigitos(String(dados.get("whatsapp") ?? ""));
  if (canalWhatsapp && whatsapp === "") {
    erros.whatsapp = "Para receber por WhatsApp, informe o número com DDD.";
  } else if (whatsapp !== "" && (whatsapp.length < 10 || whatsapp.length > 13)) {
    erros.whatsapp = "Número incompleto. Use DDD + número, com ou sem o 55 na frente.";
  }

  const scoreMinimo = inteiro(
    String(dados.get("scoreMinimo") ?? ""),
    "scoreMinimo",
    "O score mínimo",
    0,
    100,
    erros,
    atuais.scoreMinimo,
  );
  const maximoPorEnvio = inteiro(
    String(dados.get("maximoPorEnvio") ?? ""),
    "maximoPorEnvio",
    "O máximo de itens por envio",
    1,
    20,
    erros,
    atuais.maximoPorEnvio,
  );

  if (Object.keys(erros).length > 0) {
    return {
      status: "erro",
      mensagem: "Não salvamos: confira os campos marcados.",
      erros,
      salvoEm: null,
    };
  }

  try {
    await gravarPreferencias(empresaId, {
      horario: horario === "" ? PADRAO.horario : horario,
      apenasDiasUteis: dados.get("apenasDiasUteis") !== null,
      canalEmail,
      email: email === "" ? null : email,
      canalWhatsapp,
      whatsapp: whatsapp === "" ? null : whatsapp,
      scoreMinimo,
      maximoPorEnvio,
      avisarPrazoDeSalvas: dados.get("avisarPrazoDeSalvas") !== null,
      enviarQuandoVazio: dados.get("enviarQuandoVazio") !== null,
    });
  } catch (erro) {
    console.error("Falha ao gravar preferências de alerta", erro);
    return {
      status: "erro",
      mensagem: "Não conseguimos guardar as preferências agora. Tente enviar de novo.",
      erros: {},
      salvoEm: null,
    };
  }

  // Não há `refresh()` aqui de propósito: gravar cookie dentro de uma Server
  // Action já faz o Next re-renderizar a rota atual na mesma resposta, de modo
  // que a tela volta com os valores que acabaram de ser guardados.
  return {
    status: "sucesso",
    mensagem: "Preferências guardadas.",
    erros: {},
    salvoEm: new Date().toISOString(),
  };
}
