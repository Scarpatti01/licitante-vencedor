"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthWeakPasswordError } from "@supabase/supabase-js";
import { clienteDoServidor } from "./cliente";
import { MINIMO_DA_SENHA, mensagemDeSenhaRecusada, type EstadoDaEntrada } from "./estado";
import { destinoSeguro } from "./rotas";
import { dentroDoLimite, identificarChamador } from "../limite-de-taxa";

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

/**
 * Dez tentativas por 5 minutos e por IP.
 *
 * `/api/alerta` já tinha essa trava; `entrar` e `criarConta` — os dois outros
 * Server Actions públicos deste arquivo — não tinham nenhuma, e são exatamente
 * onde falta mais: força bruta de senha e criação de conta em volume. O número
 * cobre alguém errando a senha algumas vezes com folga e ainda assim encarece
 * um ataque scriptado. Mesma limitação de sempre: em memória, por instância —
 * ver o comentário em `limite-de-taxa.ts`.
 */
const LIMITE_DE_AUTENTICACAO = { maximo: 10, janelaSegundos: 300 };

async function dentroDoLimiteDeAutenticacao(prefixo: string): Promise<boolean> {
  const chamador = identificarChamador(await headers());
  return dentroDoLimite(`${prefixo}:${chamador}`, LIMITE_DE_AUTENTICACAO).permitido;
}

export async function entrar(
  _anterior: EstadoDaEntrada,
  dados: FormData,
): Promise<EstadoDaEntrada> {
  const supabase = await clienteDoServidor();
  if (!supabase) {
    return { erro: "A entrada ainda não está disponível. Tente mais tarde.", aviso: null };
  }

  if (!(await dentroDoLimiteDeAutenticacao("entrar"))) {
    return { erro: "Muitas tentativas seguidas. Aguarde alguns minutos.", aviso: null };
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

  if (!(await dentroDoLimiteDeAutenticacao("criar-conta"))) {
    return { erro: "Muitas tentativas seguidas. Aguarde alguns minutos.", aviso: null };
  }

  const email = texto(dados.get("email"), 254);
  const senha = texto(dados.get("senha"), 200);

  if (!email.includes("@")) return { erro: "Confira o e-mail.", aviso: null };
  if (senha.length < MINIMO_DA_SENHA) {
    return { erro: `A senha precisa de pelo menos ${MINIMO_DA_SENHA} caracteres.`, aviso: null };
  }

  const { data, error } = await supabase.auth.signUp({ email, password: senha });

  if (error) {
    /*
     * Senha recusada por fraca precisa ser dita, e as demais falhas não.
     *
     * Antes, TODO erro daqui virava "tente mais tarde" — e enquanto a única
     * recusa possível era falha de infraestrutura, isso estava certo: quem lê
     * não pode fazer nada além de esperar.
     *
     * Ligar a proteção contra senha vazada muda o mundo em que essa frase vale.
     * A recusa passa a ser sobre algo que SÓ a pessoa pode resolver, e mandá-la
     * esperar a faz tentar a mesma senha de novo, para sempre, sem nunca
     * descobrir por quê. A proteção existe para evitar conta invadida; sem esta
     * mensagem ela evitaria a conta inteira.
     *
     * `reasons` vem do próprio Supabase e distingue os três casos. `pwned` é o
     * que importa aqui, e a mensagem dele diz a única coisa que a pessoa
     * precisa saber: o problema não é a nossa regra, é que aquela senha já está
     * em poder de terceiros.
     *
     * Isto NÃO enfraquece a defesa contra enumeração de contas descrita abaixo:
     * e-mail já cadastrado não chega neste ramo — o Supabase devolve sucesso
     * sem erro, de propósito. O que se distingue aqui é a senha, que quem envia
     * já conhece.
     */
    if (isAuthWeakPasswordError(error)) {
      return { erro: mensagemDeSenhaRecusada(error.reasons), aviso: null };
    }

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
