import type { Mensagem } from "./tipos.ts";
import { SITE } from "../site.ts";

/**
 * As duas mensagens que o cadastro dispara: confirmação e boas-vindas.
 *
 * Três decisões governam este arquivo.
 *
 * **Uma estrutura, dois formatos.** Cada mensagem é montada como
 * `ConteudoDeEmail` e só depois vira HTML e texto puro. É a mesma escolha de
 * `alertas/mensagem.ts`, pelo mesmo motivo: quando HTML e texto são escritos
 * separados, um dos dois envelhece sem ninguém notar — e o que envelhece é
 * sempre o texto puro, que é justamente o que o cliente de e-mail antigo e o
 * filtro de spam leem.
 *
 * **A boas-vindas diz o que NÃO fazemos.** Filtro fino por perfil e leitura do
 * edital em profundidade não estão no ar, e a mensagem afirma isso com todas as
 * letras. Perder um cadastro por excesso de honestidade é barato; conquistá-lo
 * por omissão custa o primeiro alerta que chega fora do ramo do assinante, e aí
 * a pessoa não desconfia do filtro, desconfia do produto.
 *
 * **Descadastro em toda mensagem.** Inclusive na de confirmação — quem recebe
 * uma confirmação que não pediu precisa de uma saída que não seja o botão de
 * spam, porque denúncia de spam derruba a entrega para todos os outros
 * assinantes. O token vem por parâmetro; esta camada não o gera nem o valida.
 */

export type ItemDeLista = {
  rotulo: string;
  texto: string;
  /**
   * Quando presente, `texto` vira link para cá no HTML.
   *
   * Existe por causa do alerta diário, onde a linha mais importante do bloco é o
   * endereço da publicação oficial. Sem isto, a URL sairia como texto puro: a
   * maioria dos clientes de e-mail NÃO transforma URL em link dentro de HTML
   * (fazem isso só no corpo em texto simples), e o leitor teria de selecionar e
   * copiar o endereço para conferir o edital — atrito exatamente no clique que o
   * e-mail existe para provocar.
   */
  url?: string;
};

export type BlocoDeLista = {
  titulo: string;
  itens: ItemDeLista[];
};

export type ConteudoDeEmail = {
  assunto: string;
  titulo: string;
  /** Abertura, antes do botão. */
  paragrafos: string[];
  /** O botão. `null` quando não há nada a clicar — a boas-vindas não pede ação. */
  acao: { rotulo: string; url: string } | null;
  /**
   * Põe o botão DEPOIS das listas, e não antes.
   *
   * O padrão (antes) é o certo quando o e-mail existe PARA a ação: na
   * confirmação de cadastro, o botão é o conteúdo, e tudo o mais é moldura.
   *
   * O alerta diário é o contrário. A pessoa abriu para ver editais, e o botão
   * vende outra coisa — cadastrar a empresa. Antes da lista, ele chega como
   * anúncio na frente do que foi pedido; e, pior, a frase do `fecho` que
   * EXPLICA o que o botão promete ficaria a uma tela inteira de distância dele.
   * Promessa longe da explicação é como se escreve uma isca sem querer.
   */
  acaoDepoisDasListas?: boolean;
  listas: BlocoDeLista[];
  /** Fechamento, depois das listas. */
  fecho: string[];
  rodape: {
    /** O endereço cadastrado. Vem de quem preencheu o formulário: escapar. */
    cadastradoComo: string;
    descadastro: string;
    /** Os limites do produto, repetidos em toda mensagem. */
    limites: string;
    /**
     * Por que esta pessoa está recebendo. Omitido, usa a frase do alerta.
     *
     * Existe porque a frase padrão — "porque cadastrou X no alerta" — é
     * verdadeira para o LEAD e falsa para o cliente: ele não se cadastrou num
     * alerta, ele tem conta e contratou o serviço. Dizer a ele que se cadastrou
     * num alerta é errar sobre a relação que as duas partes têm, no único
     * parágrafo do e-mail que existe para explicar exatamente isso.
     *
     * Só apareceu ao renderizar a mensagem inteira e lê-la. Nenhum teste
     * olhava o rodapé, porque ninguém suspeitava dele.
     */
    porque?: string;
  };
};

/**
 * A frase de limites, idêntica em toda mensagem desta camada.
 *
 * Não é rodapé jurídico decorativo: é o posicionamento do produto
 * (`docs/produto/posicionamento-e-limites.md`). Fazemos triagem operacional; a
 * decisão de participar é de quem lê; e o edital prevalece sobre qualquer coisa
 * que este e-mail afirme.
 */
export const LIMITES =
  "Fazemos triagem operacional e automatizada de editais públicos. Não é parecer jurídico e não substitui a leitura do edital, que prevalece em qualquer divergência.";

/**
 * O link de saída.
 *
 * `encodeURIComponent` no token porque ele vem pronto de fora e nada aqui sabe
 * o alfabeto dele — um `+` de base64 não codificado vira espaço do outro lado, e
 * o descadastro falha para quem já decidiu sair, que é o pior momento possível
 * para o link não funcionar.
 */
export function urlDeDescadastro(token: string, urlBase: string = SITE.url): string {
  return `${urlBase}/descadastrar/?t=${encodeURIComponent(token)}`;
}

/** Onde o interesse foi registrado, em uma frase. Cidade é texto livre do visitante. */
function regiaoEmTexto(cidade: string | null | undefined): string {
  const c = cidade?.trim();
  return c ? `de ${c}` : "da sua região";
}

export type DadosDaConfirmacao = {
  email: string;
  /** URL de confirmação, montada por quem gera o token de confirmação. */
  linkDeConfirmacao: string;
  /** Token de descadastro, gerado fora desta camada. */
  tokenDeDescadastro: string;
  cidade?: string | null;
  urlBase?: string;
};

export function conteudoDeConfirmacao(dados: DadosDaConfirmacao): ConteudoDeEmail {
  return {
    assunto: "Confirme seu e-mail para receber os alertas de licitação",
    titulo: "Falta um clique para o alerta começar",
    paragrafos: [
      `Você pediu para acompanhar os editais ${regiaoEmTexto(dados.cidade)} publicados no Portal Nacional de Contratações Públicas. Eles chegam neste endereço nos dias úteis, pela manhã.`,
      "Antes disso, precisamos confirmar que este e-mail é seu.",
    ],
    acao: { rotulo: "Confirmar meu e-mail", url: dados.linkDeConfirmacao },
    listas: [],
    fecho: [
      "Enquanto você não clicar, não enviamos nada — nem o primeiro alerta.",
      "Se não foi você quem pediu, é só ignorar esta mensagem: sem o clique, o endereço não entra na lista.",
    ],
    rodape: {
      cadastradoComo: dados.email,
      descadastro: urlDeDescadastro(dados.tokenDeDescadastro, dados.urlBase),
      limites: LIMITES,
    },
  };
}

export type DadosDeBoasVindas = {
  email: string;
  tokenDeDescadastro: string;
  cidade?: string | null;
  urlBase?: string;
};

export function conteudoDeBoasVindas(dados: DadosDeBoasVindas): ConteudoDeEmail {
  return {
    assunto: "E-mail confirmado — seu alerta de licitação começa no próximo dia útil",
    titulo: "Pronto. Seu e-mail está confirmado",
    paragrafos: [
      `Os alertas com os editais ${regiaoEmTexto(dados.cidade)} chegam nos dias úteis, pela manhã. Quando não houver publicação nova para acompanhar naquele dia, você não recebe e-mail: silêncio também é resposta, e caixa de entrada cheia de “nada por aqui” só ensina a ignorar o remetente.`,
    ],
    acao: null,
    listas: [
      {
        titulo: "O que vem em cada alerta, por edital",
        itens: [
          { rotulo: "Objeto", texto: "o que o órgão quer comprar ou contratar, no texto da publicação" },
          { rotulo: "Órgão", texto: "quem abriu o certame, e em qual município" },
          {
            rotulo: "Valor",
            texto:
              "o valor estimado publicado. Quando o órgão não publica, o alerta diz que não há valor — nunca mostra R$ 0,00 no lugar",
          },
          { rotulo: "Prazo", texto: "quanto falta para o encerramento na data do envio" },
          { rotulo: "Link oficial", texto: "o endereço da publicação na fonte, para você conferir e baixar o edital" },
        ],
      },
      {
        /*
         * Este bloco existe para a pessoa não descobrir sozinha, no terceiro
         * alerta fora do ramo dela, que o recorte é grosso.
         *
         * Até 21/08 ele se chamava "o que ainda NÃO está no ar", e as duas
         * coisas listadas de fato não existiam em lugar nenhum do produto.
         * Agora existem — para quem cadastra a empresa (`triar-editais.ts` e
         * `ler-recomendados.ts`). O título mudou porque a limitação deixou de
         * ser temporal ("ainda não construímos") e passou a ser de escopo
         * ("este e-mail não faz isso"), e as duas afirmações pedem palavras
         * diferentes: a antiga viraria mentira sobre o produto, a nova
         * continua verdade sobre este alerta.
         */
        titulo: "O que este alerta gratuito NÃO faz — para você não contar com isso",
        itens: [
          {
            rotulo: "Filtro fino por perfil",
            texto:
              "aqui o recorte é geográfico. Este alerta não filtra por CNAE, por faixa de valor nem pelo histórico da sua empresa, então vai chegar edital que não serve para você",
          },
          {
            rotulo: "Leitura do edital",
            texto:
              "não lemos o texto nem os anexos dos editais deste alerta. Ele não afirma o que o edital exige de habilitação, de garantia ou de qualificação técnica — isso continua sendo leitura sua, no documento oficial",
          },
        ],
      },
    ],
    fecho: [
      "Preferimos dizer isso agora a deixar você descobrir depois. As duas coisas existem para quem cadastra a empresa: aí a triagem compara cada edital com o seu ramo, faturamento e experiência, e os de maior aderência chegam com o documento lido. O alerta gratuito continua como está, sem virar plano pago sem você pedir.",
    ],
    rodape: {
      cadastradoComo: dados.email,
      descadastro: urlDeDescadastro(dados.tokenDeDescadastro, dados.urlBase),
      limites: LIMITES,
    },
  };
}

/**
 * Escapa texto que entra no HTML do e-mail.
 *
 * Cópia deliberada da função de `alertas/mensagem.ts`, que é privada daquele
 * módulo: importar através da fronteira acoplaria a camada de e-mail à camada de
 * alertas por seis linhas de `replace`. Vale para conteúdo E para atributo — a
 * `"` é escapada e todo atributo daqui é delimitado por aspa dupla — porque o
 * e-mail do destinatário, a cidade que ele digitou e os dois tokens são texto de
 * terceiro que nenhuma camada acima valida quanto a formato.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Versão texto puro. É o que o filtro de spam lê e o que sobra sem imagens. */
export function emTextoSimples(conteudo: ConteudoDeEmail): string {
  const partes: string[] = [conteudo.titulo, ...conteudo.paragrafos];
  const acao = conteudo.acao ? `${conteudo.acao.rotulo}: ${conteudo.acao.url}` : null;

  if (acao && !conteudo.acaoDepoisDasListas) partes.push(acao);

  for (const lista of conteudo.listas) {
    // A URL vai depois do texto, e não no lugar dele: aqui o cliente de e-mail
    // JÁ transforma endereço em link sozinho, então o que falta é o rótulo
    // continuar legível para quem lê sem link nenhum.
    const itens = lista.itens
      .map((i) => `- ${i.rotulo}: ${i.texto}${i.url ? ` ${i.url}` : ""}`)
      .join("\n");
    partes.push(`${lista.titulo}\n${itens}`);
  }

  partes.push(...conteudo.fecho);
  // Depois do `fecho`, e não entre a lista e ele: é o `fecho` que explica o que
  // o botão promete, e a explicação vem antes da promessa.
  if (acao && conteudo.acaoDepoisDasListas) partes.push(acao);
  partes.push("———");
  partes.push(conteudo.rodape.limites);
  partes.push(
    `${conteudo.rodape.porque ?? `Você recebe este e-mail porque cadastrou ${conteudo.rodape.cadastradoComo} no alerta do ${SITE.name}.`} Para não receber mais: ${conteudo.rodape.descadastro}`,
  );

  return partes.join("\n\n");
}

/**
 * Versão HTML.
 *
 * Estilo em atributo `style` e tabela, sem classe e sem folha de estilo: é o que
 * sobrevive no Outlook, que descarta `<style>` e seletor de classe. Feio de ler,
 * e é o formato que chega inteiro.
 */
export function emHtml(conteudo: ConteudoDeEmail): string {
  const paragrafos = conteudo.paragrafos
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#101418">${escapar(p)}</p>`,
    )
    .join("");

  const acao = conteudo.acao
    ? `<p style="margin:22px 0"><a href="${escapar(conteudo.acao.url)}" style="display:inline-block;background:#101418;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600">${escapar(conteudo.acao.rotulo)}</a></p>
<p style="margin:0 0 14px;font-size:12px;line-height:1.6;color:#5b6472">Se o botão não abrir, copie este endereço no navegador:<br>${escapar(conteudo.acao.url)}</p>`
    : "";

  const listas = conteudo.listas
    .map((lista) => {
      const linhas = lista.itens
        .map((item) => {
          const valor = item.url
            ? `<a href="${escapar(item.url)}" style="color:#101418">${escapar(item.texto)}</a>`
            : escapar(item.texto);
          return `<tr><td style="padding:6px 12px 6px 0;font-size:14px;color:#5b6472;white-space:nowrap;vertical-align:top">${escapar(item.rotulo)}</td><td style="padding:6px 0;font-size:14px;line-height:1.5;color:#101418">${valor}</td></tr>`;
        })
        .join("");

      return `<div style="border:1px solid #e3e6ea;border-radius:10px;padding:18px 20px;margin:0 0 16px">
<p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#101418">${escapar(lista.titulo)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
${linhas}
</table>
</div>`;
    })
    .join("");

  const fecho = conteudo.fecho
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#101418">${escapar(p)}</p>`,
    )
    .join("");

  const antes = conteudo.acaoDepoisDasListas ? "" : acao;
  // Depois do `fecho`, e não entre a lista e ele — ver `acaoDepoisDasListas`.
  const depois = conteudo.acaoDepoisDasListas ? acao : "";

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff">
<p style="margin:0 0 18px;font-size:20px;line-height:1.3;font-weight:600;color:#101418">${escapar(conteudo.titulo)}</p>
${paragrafos}${antes}${listas}${fecho}${depois}
<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#5b6472">${escapar(conteudo.rodape.limites)}</p>
<p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#5b6472">${escapar(conteudo.rodape.porque ?? `Você recebe este e-mail porque cadastrou ${conteudo.rodape.cadastradoComo} no alerta do ${SITE.name}.`)} <a href="${escapar(conteudo.rodape.descadastro)}" style="color:#5b6472">Não quero mais receber</a>.</p>
</div>`;
}

/** Monta a `Mensagem` pronta para o provedor, a partir do conteúdo e do destinatário. */
function mensagem(para: string, conteudo: ConteudoDeEmail): Mensagem {
  return {
    para,
    assunto: conteudo.assunto,
    html: emHtml(conteudo),
    texto: emTextoSimples(conteudo),
  };
}

export function mensagemDeConfirmacao(dados: DadosDaConfirmacao): Mensagem {
  return mensagem(dados.email, conteudoDeConfirmacao(dados));
}

export function mensagemDeBoasVindas(dados: DadosDeBoasVindas): Mensagem {
  return mensagem(dados.email, conteudoDeBoasVindas(dados));
}
