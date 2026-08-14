"use server";

import { redirect } from "next/navigation";
import { clienteDoServidor } from "./cliente";
import { MINIMO_DA_SENHA, type EstadoDaEntrada } from "./estado";
import { destinoSeguro } from "./rotas";

/**
 * Entrar, criar conta e sair.
 *
 * Server Actions são endpoints POST alcançáveis sem passar pela tela — então
 * tudo que importa é validado aqui, e nada é confiado ao que o navegador
 * checou.
 *
 * ## A mensagem de erro é deliberadamente pobre
 *
 * "E-mail ou senha incorretos" nunca vira "este e-mail não está cadastrado".
 * A segunda é mais gentil e transforma o formulário num verificador de
 * cadastro: quem quiser saber se alguém é cliente daqui descobre testando
 * endereços. Isso vale mais para este produto do que para a média — a lista de
 * clientes de uma empresa de licitação é informação comercial de concorrente.
 */

const texto = (v: FormDataEntryValue | null, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function entrar(
  _anterior: EstadoDaEntrada,
  dados: FormData,
): Promise<EstadoDaEntrada> {
  const supabase = await clienteDoServidor();
  if (!supabase) {
    return { erro: "A entrada ainda não está disponível. Tente mais tarde.", aviso: null };
  }

  const email = texto(dados.get("email"), 254);
  const senha = texto(dados.get("senha"), 200);

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha.", aviso: null };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    // Ver o cabeçalho: a mensagem não distingue "senha errada" de "não existe".
    return { erro: "E-mail ou senha incorretos.", aviso: null };
  }

  // `redirect` lança por dentro — nada depois dele executa. Fica FORA do
  // try/catch de qualquer chamada por isso: um `catch` genérico engoliria o
  // redirecionamento e a tela ficaria parada anunciando sucesso.
  redirect(destinoSeguro(dados.get("proximo")));
}

export async function criarConta(
  _anterior: EstadoDaEntrada,
  dados: FormData,
): Promise<EstadoDaEntrada> {
  const supabase = await clienteDoServidor();
  if (!supabase) {
    return { erro: "A criação de conta ainda não está disponível.", aviso: null };
  }

  const email = texto(dados.get("email"), 254);
  const senha = texto(dados.get("senha"), 200);

  if (!email.includes("@")) return { erro: "Confira o e-mail.", aviso: null };
  if (senha.length < MINIMO_DA_SENHA) {
    return { erro: `A senha precisa de pelo menos ${MINIMO_DA_SENHA} caracteres.`, aviso: null };
  }

  const { data, error } = await supabase.auth.signUp({ email, password: senha });

  if (error) {
    return { erro: "Não conseguimos criar a conta agora. Tente mais tarde.", aviso: null };
  }

  /*
   * Projeto com confirmação de e-mail ligada devolve usuário SEM sessão. Mandar
   * essa pessoa para o painel a jogaria contra o proxy, que a devolveria para o
   * login sem explicação — ela acharia que a conta não foi criada e tentaria de
   * novo, agora recebendo "e-mail já cadastrado".
   */
  if (!data.session) {
    return {
      erro: null,
      aviso: "Conta criada. Confirme o e-mail que acabamos de enviar para entrar.",
    };
  }

  redirect("/onboarding/");
}

export async function sair() {
  const supabase = await clienteDoServidor();
  await supabase?.auth.signOut();
  redirect("/");
}
