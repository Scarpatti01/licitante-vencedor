import type { Metadata } from "next";
import { after } from "next/server";
import { Detalhe, TelaDeAviso } from "@/components/TelaDeAviso";
import { confirmarLead, type IdentificacaoDoLead } from "@/lib/leads";
import { enviarBoasVindas } from "@/lib/leads-emails";

/**
 * O segundo passo do double opt-in: a pessoa clicou no link do e-mail.
 *
 * ## Por que a confirmação acontece num GET
 *
 * A teoria diz que GET não deve mudar estado, e a teoria está certa. O que a
 * teoria não resolve é que o único gesto disponível dentro de um e-mail é
 * clicar num link — e link é GET. As alternativas são piores: uma página com
 * botão "confirmar" transforma um clique em dois e derruba a taxa de
 * confirmação, que é exatamente a métrica que decide se a lista existe.
 *
 * O preço conhecido é o antivírus corporativo que abre todo link da mensagem
 * antes de entregá-la, confirmando por conta própria. É aceito, e não escondido:
 * o consentimento continua tendo carimbo (`confirmado_em`) e origem
 * registrados, e a saída em um clique está no rodapé de toda mensagem. Um
 * varredor não gera denúncia de spam; uma lista sem confirmação nenhuma, sim.
 *
 * ## `searchParams` é assíncrono
 *
 * Nesta versão do Next ele é uma `Promise` (ver `page.js` em
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`).
 * Lê-lo é uma API de tempo de requisição: a página passa a renderizar sob
 * demanda, que é o que se quer aqui — o resultado depende do token e não pode
 * ser pré-renderizado nem guardado em cache.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmação de cadastro",
  /*
   * `noindex` porque esta URL só existe dentro de um e-mail e só faz sentido com
   * um token. Indexada, ela apareceria na busca como "Confirmação de cadastro" e
   * levaria quem clicasse a uma tela de link inválido — resultado ruim para
   * quem procura e sinal ruim para o site. `follow: false` completa: não há nada
   * de valor a rastrear a partir daqui.
   */
  robots: { index: false, follow: false },
};

export default async function Confirmar({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  const { t } = await searchParams;
  const resultado = await confirmarLead(typeof t === "string" ? t : undefined);

  if (resultado.situacao === "feito-agora") {
    /*
     * Boas-vindas é consequência da confirmação, não condição dela.
     *
     * Por isso vai em `after`: a confirmação JÁ está registrada quando esta
     * linha roda, e segurar a tela por meio segundo esperando o provedor de
     * e-mail pagaria latência com a única coisa que a pessoa veio buscar aqui —
     * a resposta de que deu certo. Se o envio falhar, a confirmação continua
     * valendo e a tela continua verdadeira; o que não pode é a página quebrar
     * por causa de um e-mail, daí o resultado ser inspecionado e registrado,
     * nunca lançado.
     */
    const token = typeof t === "string" ? t : "";
    after(() => avisarBoasVindas(resultado.lead, token));

    return (
      <TelaDeAviso
        titulo="E-mail confirmado. O alerta começa no próximo dia útil."
        caminhos={[
          { href: "/blog/", rotulo: "Ler os guias enquanto isso", principal: true },
          { href: "/como-funciona/", rotulo: "Como funciona o alerta" },
        ]}
      >
        <p>
          Pronto. A partir de agora você recebe, nos dias úteis pela manhã, os
          editais publicados no Portal Nacional de Contratações Públicas para a
          região que você indicou.
        </p>
        <Detalhe>
          Quando não houver publicação nova naquele dia, você não recebe e-mail.
          Silêncio também é resposta — caixa de entrada cheia de “nada por aqui”
          só ensina a ignorar o remetente. E o link para sair da lista está no
          rodapé de toda mensagem, sempre a um clique.
        </Detalhe>
      </TelaDeAviso>
    );
  }

  if (resultado.situacao === "ja-estava") {
    return (
      <TelaDeAviso
        titulo="Este e-mail já estava confirmado."
        caminhos={[
          { href: "/blog/", rotulo: "Ler os guias", principal: true },
          { href: "/como-funciona/", rotulo: "Como funciona o alerta" },
        ]}
      >
        <p>
          Nada a fazer: você já está na lista e continua recebendo os editais nos
          dias úteis. Clicar duas vezes no link não cadastra duas vezes nem
          reinicia nada.
        </p>
        <Detalhe>
          Se os alertas não estão chegando, procure na caixa de spam e marque o
          remetente como confiável. Se ainda assim não aparecerem, fale com a
          gente pelo contato em <a className="underline underline-offset-4" href="/sobre/">sobre</a>.
        </Detalhe>
      </TelaDeAviso>
    );
  }

  if (resultado.situacao === "token-desconhecido") {
    return (
      <TelaDeAviso
        titulo="Este link de confirmação não vale mais."
        caminhos={[
          { href: "/alerta-de-licitacao/", rotulo: "Cadastrar de novo", principal: true },
          { href: "/sobre/", rotulo: "Falar com a gente" },
        ]}
      >
        <p>
          Não encontramos nenhum cadastro para este link. Costuma ser uma de três
          coisas: o endereço foi cortado pelo cliente de e-mail antes do fim, o
          cadastro foi cancelado depois, ou o link é de uma tentativa antiga.
        </p>
        <Detalhe>
          O caminho mais rápido é se cadastrar de novo — leva o mesmo tempo que
          descobrir qual das três foi, e um novo e-mail de confirmação chega em
          seguida.
        </Detalhe>
      </TelaDeAviso>
    );
  }

  return (
    <TelaDeAviso
      titulo="Não conseguimos confirmar agora."
      caminhos={[
        { href: "/sobre/", rotulo: "Falar com a gente", principal: true },
        { href: "/blog/", rotulo: "Voltar aos guias" },
      ]}
    >
      <p>
        A falha é nossa, não do seu link. Ele continua valendo:{" "}
        <strong>tente de novo daqui a alguns minutos</strong> clicando no mesmo
        botão do e-mail.
      </p>
      <Detalhe>
        Seu cadastro não foi perdido e nada foi decidido sobre ele — só não
        conseguimos registrar a confirmação neste momento. Se insistir e não
        funcionar, o contato está em{" "}
        <a className="underline underline-offset-4" href="/sobre/">
          sobre
        </a>{" "}
        e a confirmação pode ser feita à mão.
      </Detalhe>
    </TelaDeAviso>
  );
}

/**
 * Manda as boas-vindas, se der para saber a quem.
 *
 * O destino nem sempre devolve o e-mail da linha — planilha com script antigo,
 * por exemplo. Sem endereço não há mensagem, e isso é degradação silenciosa
 * aceitável (a confirmação valeu; só o primeiro e-mail não sai) desde que fique
 * no log de quem opera.
 */
async function avisarBoasVindas(lead: IdentificacaoDoLead | undefined, token: string) {
  if (!lead?.email) {
    console.error("[confirmar] confirmado sem identificar o lead — boas-vindas não enviadas");
    return;
  }

  const envio = await enviarBoasVindas({ email: lead.email, cidade: lead.cidade, token });
  if (!envio.ok) {
    console.error("[confirmar] boas-vindas não enviadas", envio.motivo, envio.detalhe);
  }
}
