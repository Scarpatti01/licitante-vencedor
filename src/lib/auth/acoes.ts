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
   * login sem explicação — e ela concluiria que a conta não foi criada.
   *
   * ## Por que a mensagem não diz "conta criada"
   *
   * Esta resposta é IDÊNTICA em dois casos opostos, e o Supabase faz isso de
   * propósito:
   *
   *   · e-mail novo — a conta nasce e o link de confirmação sai;
   *   · e-mail já cadastrado — nada é criado e NENHUM e-mail é enviado.
   *
   * O segundo caso não devolve erro, e não devolve por segurança: se a resposta
   * fosse diferente, qualquer um descobriria quem tem conta no site testando
   * endereços um a um. Enumeração de contas é o primeiro passo de quem monta
   * lista para phishing dirigido — protegê-la vale mais do que a clareza que se
   * ganharia dizendo "esse e-mail já existe".
   *
   * A versão anterior desta mensagem afirmava as duas coisas — "Conta criada" e
   * "o e-mail que acabamos de enviar" — e no segundo caso as duas eram falsas.
   * O custo apareceu em 17/08: alguém com conta já confirmada ficou esperando um
   * e-mail que não existia, quando bastava entrar.
   *
   * A mensagem abaixo descreve os DOIS caminhos sem revelar qual aconteceu.
   * Continua sem enumerar, e para de afirmar o que pode não ter ocorrido — que é
   * a regra que este projeto aplica ao edital, e vale igual para o próprio site.
   */
  if (!data.session) {
    return {
      erro: null,
      aviso:
        "Se este e-mail ainda não tinha conta, enviamos agora um link de confirmação — " +
        "confira a caixa de entrada e o spam. Se já tinha, o link não é reenviado: " +
        "use Entrar logo abaixo, ou recupere a senha.",
    };
  }

  redirect("/onboarding/");
}

export async function sair() {
  const supabase = await clienteDoServidor();
  await supabase?.auth.signOut();
  redirect("/");
}
