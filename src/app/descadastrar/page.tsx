import type { Metadata } from "next";
import { Detalhe, TelaDeAviso } from "@/components/TelaDeAviso";
import { descadastrarLead } from "@/lib/leads";

/**
 * A saída da lista, em um clique.
 *
 * ## O que esta página deliberadamente NÃO faz
 *
 * Não pede login. Não pede o e-mail de novo. Não mostra "tem certeza?". Não
 * oferece "quer receber menos em vez de sair?". Cada um desses passos parece
 * defender a lista e faz o contrário: quem não consegue sair em um clique clica
 * em "isto é spam", e a denúncia não tira só aquela pessoa — ela derruba a
 * reputação do domínio e com ela a entrega para todos os outros assinantes,
 * inclusive os que querem receber. O custo do atrito aqui é cobrado de terceiros
 * que não fizeram nada.
 *
 * Por isso o descadastro acontece na abertura da página, antes de qualquer
 * interação. Se o clique chegou, a pessoa sai.
 *
 * ## O varredor de link
 *
 * Vale o mesmo comentário de `/confirmar/`: cliente de e-mail corporativo abre
 * os links da mensagem sozinho, e aqui isso significa descadastrar quem não
 * pediu. É o lado errado em que errar — e é o certo. Um assinante removido sem
 * querer pode se cadastrar de novo em dez segundos; um assinante que não
 * conseguiu sair vira denúncia de spam, e essa não tem desfazer.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sair da lista",
  /* Mesma razão de `/confirmar/`: URL que só existe dentro de um e-mail e que,
   * sem token, não tem nada a mostrar a quem chega da busca. */
  robots: { index: false, follow: false },
};

export default async function Descadastrar({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  // `searchParams` é `Promise` nesta versão do Next — ver
  // `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`.
  // O parâmetro é `t`, a mesma forma que `urlDeDescadastro` monta no rodapé de
  // todo e-mail; mudar um sem o outro quebra o link de quem já recebeu mensagem.
  const { t } = await searchParams;
  const resultado = await descadastrarLead(typeof t === "string" ? t : undefined);

  if (resultado.situacao === "feito-agora" || resultado.situacao === "ja-estava") {
    /*
     * Os dois estados mostram a mesma tela, e isso não é preguiça.
     *
     * Para quem clicou, o fato que importa é idêntico — "você não recebe mais" —
     * e distinguir "acabamos de tirar" de "você já não estava" só serviria para
     * fazer alguém que clicou duas vezes duvidar se saiu mesmo. A diferença
     * interessa a quem opera, e para esse público ela está no log e na coluna
     * `descadastrado_em`.
     */
    return (
      <TelaDeAviso
        titulo="Pronto. Você não recebe mais nossos e-mails."
        caminhos={[
          { href: "/", rotulo: "Ir para a página inicial", principal: true },
          { href: "/blog/", rotulo: "Ler os guias sem se cadastrar" },
        ]}
      >
        <p>
          O endereço foi retirado da lista de alertas agora. Não é preciso fazer
          mais nada, e não vamos pedir para você reconsiderar.
        </p>
        <Detalhe>
          Os guias e os artigos continuam abertos, sem cadastro. Se um dia quiser
          voltar, o formulário está em qualquer um deles — e se recebeu este
          e-mail sem ter pedido, o contato em{" "}
          <a className="underline underline-offset-4" href="/sobre/">
            sobre
          </a>{" "}
          é o caminho para nos contar como isso aconteceu.
        </Detalhe>
      </TelaDeAviso>
    );
  }

  if (resultado.situacao === "token-desconhecido") {
    return (
      <TelaDeAviso
        titulo="Não encontramos um cadastro para este link."
        caminhos={[
          { href: "/sobre/", rotulo: "Falar com a gente", principal: true },
          { href: "/", rotulo: "Ir para a página inicial" },
        ]}
      >
        <p>
          Ou o endereço foi cortado pelo cliente de e-mail antes do fim, ou este
          cadastro já não existe. Nos dois casos,{" "}
          <strong>o resultado prático é o mesmo: não há lista de onde sair</strong>{" "}
          por este link.
        </p>
        <Detalhe>
          Se você continua recebendo nossos e-mails, não use o botão de spam —
          escreva pelo contato em{" "}
          <a className="underline underline-offset-4" href="/sobre/">
            sobre
          </a>{" "}
          com o endereço que recebe as mensagens, e a remoção é feita à mão no
          mesmo dia.
        </Detalhe>
      </TelaDeAviso>
    );
  }

  return (
    <TelaDeAviso
      titulo="Não conseguimos processar sua saída agora."
      caminhos={[
        { href: "/sobre/", rotulo: "Falar com a gente", principal: true },
        { href: "/", rotulo: "Ir para a página inicial" },
      ]}
    >
      <p>
        A falha é nossa. Seu link continua valendo:{" "}
        <strong>recarregue esta página</strong> ou clique de novo no link do
        e-mail daqui a alguns minutos.
      </p>
      <Detalhe>
        Se preferir não depender disso, escreva pelo contato em{" "}
        <a className="underline underline-offset-4" href="/sobre/">
          sobre
        </a>{" "}
        e a remoção é feita à mão. Pedir para sair e não conseguir é problema
        nosso para resolver, não seu para insistir.
      </Detalhe>
    </TelaDeAviso>
  );
}
