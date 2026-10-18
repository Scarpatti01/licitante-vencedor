import type { Mensagem } from "./tipos.ts";
import { SITE } from "../site.ts";
import { DIAS_DE_TESTE } from "../assinatura/teste.ts";

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
    /**
     * O link de saída. OPCIONAL, e a exceção tem um dono só.
     *
     * A regra desta camada é que toda mensagem de LISTA carrega descadastro: é
     * o que separa uma lista de uma denúncia de spam, e denúncia derruba a
     * entrega de todos os outros assinantes.
     *
     * Mensagem transacional é outra classe. Ninguém se descadastra da própria
     * compra, e oferecer a saída ali seria pior que não oferecer: ou o link é
     * morto, porque o comprador pode nem estar em lista nenhuma e não haveria
     * token, ou ele tira da lista de alertas quem só queria fechar um e-mail de
     * entrega.
     *
     * `mensagens.guarda.test.ts` cobra o link presente em toda mensagem de
     * lista, para esta abertura não virar porta dos fundos.
     */
    descadastro?: string;
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

/**
 * Um material gratuito pedido no formulário, do jeito que o e-mail precisa dele.
 *
 * Só os textos, e não o tipo de `materiais.ts`: esta camada não sabe o que é um
 * lead nem de onde vem um material, e é bom que continue assim.
 */
export type MaterialNoEmail = {
  /** "o modelo de impugnação de edital" */
  nome: string;
  /** "o modelo de impugnação" */
  nomeCurto: string;
  /** Endereço absoluto do arquivo. Só a boas-vindas usa: a confirmação ainda não entrega. */
  url?: string;
  descricao?: string;
};

export type DadosDaConfirmacao = {
  email: string;
  /** URL de confirmação, montada por quem gera o token de confirmação. */
  linkDeConfirmacao: string;
  /** Token de descadastro, gerado fora desta camada. */
  tokenDeDescadastro: string;
  cidade?: string | null;
  urlBase?: string;
  /** Presente quando o cadastro foi para receber um material gratuito. */
  material?: MaterialNoEmail | null;
};

/*
 * Até 17/10/2026 esta mensagem prometia "os alertas de licitação" chegando
 * todo dia útil, e o alerta gratuito acabou em 25/08. Quem se cadastrava pelo
 * formulário (que oferece o convite do teste) confirmava o e-mail esperando um
 * envio diário que não vinha. Agora ela diz o que o formulário ofereceu: o
 * convite do teste, ou o material pedido.
 */
export function conteudoDeConfirmacao(dados: DadosDaConfirmacao): ConteudoDeEmail {
  if (dados.material) {
    return {
      assunto: `Confirme seu e-mail para receber ${dados.material.nomeCurto}`,
      titulo: "Falta um clique para o seu material",
      paragrafos: [
        `Você pediu ${dados.material.nome}. Ele fica disponível assim que você confirmar este endereço.`,
        "Antes disso, precisamos confirmar que este e-mail é seu.",
      ],
      acao: { rotulo: "Confirmar e baixar", url: dados.linkDeConfirmacao },
      listas: [],
      fecho: [
        "Enquanto você não clicar, não enviamos nada.",
        "Se não foi você quem pediu, é só ignorar esta mensagem: sem o clique, o endereço não entra na lista.",
      ],
      rodape: {
        cadastradoComo: dados.email,
        descadastro: urlDeDescadastro(dados.tokenDeDescadastro, dados.urlBase),
        porque: `Você recebe este e-mail porque pediu ${dados.material.nome} no ${SITE.name}.`,
        limites: LIMITES,
      },
    };
  }

  return {
    assunto: "Confirme seu e-mail para receber o convite do teste",
    titulo: "Falta um clique para o convite chegar",
    paragrafos: [
      `Você pediu o convite para testar por ${DIAS_DE_TESTE} dias o resumo com os editais ${regiaoEmTexto(dados.cidade)} publicados no Portal Nacional de Contratações Públicas. Depois que a empresa estiver cadastrada, ele chega neste endereço nos dias úteis, pela manhã.`,
      "Antes disso, precisamos confirmar que este e-mail é seu.",
    ],
    acao: { rotulo: "Confirmar meu e-mail", url: dados.linkDeConfirmacao },
    listas: [],
    fecho: [
      "Enquanto você não clicar, não enviamos nada, nem o convite.",
      "Se não foi você quem pediu, é só ignorar esta mensagem: sem o clique, o endereço não entra na lista.",
    ],
    rodape: {
      cadastradoComo: dados.email,
      descadastro: urlDeDescadastro(dados.tokenDeDescadastro, dados.urlBase),
      limites: LIMITES,
    },
  };
}

/**
 * O destino de quem comprou: a Jornada, onde estão também os dois arquivos do
 * livro. Sem `proximo`, a conta nova caía no onboarding do monitor de editais,
 * que pede empresa e CNPJ a quem só comprou um livro.
 */
export const DESTINO_DA_COMPRA = "/minha-jornada/";

/**
 * Onde o comprador cria a conta, com o e-mail já preenchido.
 *
 * O parâmetro não é conveniência de digitação. O acesso à Jornada é ligado pelo
 * E-MAIL da compra, e criar a conta com outro endereço é o jeito mais provável
 * de alguém pagar e não conseguir entrar. Levar o endereço certo no link ataca
 * exatamente esse caso.
 */
export function urlDeCriarConta(email: string, urlBase: string = SITE.url): string {
  return (
    `${urlBase}/criar-conta/?email=${encodeURIComponent(email)}` +
    `&proximo=${encodeURIComponent(DESTINO_DA_COMPRA)}`
  );
}

/** Sem codificar a barra: este endereço aparece escrito no corpo do e-mail. */
export function urlDeEntrarNaJornada(urlBase: string = SITE.url): string {
  return `${urlBase}/entrar/?proximo=${DESTINO_DA_COMPRA}`;
}

export type DadosDoConvite = {
  email: string;
  urlBase?: string;
};

/**
 * O convite que sai quando a compra na Hotmart é gravada.
 *
 * ## POR QUE ELE NÃO ENTREGA O LIVRO
 *
 * Porque a Hotmart já entrega. O comprador recebe dela um e-mail com o PDF e o
 * ePub, e repetir isso aqui faria duas coisas ruins: competiria com a mensagem
 * dela pelo mesmo clique, e deslocaria o assunto deste e-mail, que é OUTRO.
 *
 * Este aqui existe para uma coisa só: a Jornada de 12 semanas fica no site, e
 * abri-la exige uma conta. Então ele diz o que falta e leva ao lugar de fazer.
 *
 * ## POR QUE O E-MAIL APARECE ESCRITO NO CORPO
 *
 * Repetido de propósito, além de já ir no link. O acesso é reconhecido pelo
 * e-mail da compra, e quem cria conta com outro endereço não encontra nada.
 * Dizer o endereço em letra, e não só embutido num botão, é o que dá a quem
 * abriu no celular a chance de perceber antes de errar.
 *
 * ## SEM DESCADASTRO, DE PROPÓSITO
 *
 * É transacional. Ver a nota em `ConteudoDeEmail.rodape.descadastro`.
 */
export function conteudoDoConvite(dados: DadosDoConvite): ConteudoDeEmail {
  return {
    assunto: "Sua compra está confirmada. Falta abrir a Jornada",
    titulo: "Falta um passo: criar a sua conta",
    paragrafos: [
      "Sua compra do Workbook do Licitante pela Hotmart foi confirmada.",
      "O livro em PDF e em EPUB e a Jornada de 12 semanas ficam juntos na sua área do site. Crie a conta e entre: você vai direto para lá. Se pedirmos para confirmar o e-mail, confirme pelo link que chegar e entre de novo.",
      `Use este mesmo endereço, o da compra: ${dados.email}`,
    ],
    acao: { rotulo: "Criar minha conta", url: urlDeCriarConta(dados.email, dados.urlBase) },
    listas: [],
    fecho: [
      "Use exatamente este endereço. É por ele que a sua compra é reconhecida, então uma conta criada com outro e-mail não encontra o acesso.",
      `Se você já tem conta com este endereço, não precisa criar outra: entre por ${urlDeEntrarNaJornada(dados.urlBase)} e a Jornada já está liberada.`,
    ],
    rodape: {
      cadastradoComo: dados.email,
      porque: "Você recebe este e-mail porque comprou o Workbook do Licitante.",
      limites: LIMITES,
    },
  };
}

export type DadosDeBoasVindas = {
  email: string;
  tokenDeDescadastro: string;
  cidade?: string | null;
  urlBase?: string;
  /** Presente quando o cadastro foi para receber um material gratuito. */
  material?: MaterialNoEmail | null;
};

/**
 * A entrega do material, para a pessoa guardar o link.
 *
 * A página de confirmação já mostra o botão de baixar; este e-mail existe para
 * o arquivo continuar a um clique depois que a aba fechar. Ele não repete o
 * convite do teste nem o aviso sobre o fim do alerta gratuito: quem pediu um
 * modelo não pediu nenhum dos dois.
 */
function conteudoDaEntregaDoMaterial(
  dados: DadosDeBoasVindas,
  material: MaterialNoEmail & { url: string },
): ConteudoDeEmail {
  const urlBase = dados.urlBase ?? SITE.url;
  return {
    assunto: `Aqui está ${material.nomeCurto}`,
    titulo: "Seu material está pronto",
    paragrafos: [
      `E-mail confirmado. Aqui está ${material.nome}.`,
      ...(material.descricao ? [material.descricao] : []),
      `Se quiser o caminho inteiro, do primeiro cadastro ao contrato assinado, ele está no Workbook do Licitante: ${urlBase}/jornada/`,
    ],
    acao: { rotulo: "Baixar o material", url: material.url },
    listas: [],
    fecho: ["O material organiza o trabalho, mas não substitui a leitura do edital nem a análise de um advogado."],
    rodape: {
      cadastradoComo: dados.email,
      descadastro: urlDeDescadastro(dados.tokenDeDescadastro, dados.urlBase),
      porque: `Você recebe este e-mail porque pediu ${material.nome} no ${SITE.name}.`,
      limites: LIMITES,
    },
  };
}

export function conteudoDeBoasVindas(dados: DadosDeBoasVindas): ConteudoDeEmail {
  const urlBase = dados.urlBase ?? SITE.url;
  if (dados.material?.url) {
    return conteudoDaEntregaDoMaterial(dados, { ...dados.material, url: dados.material.url });
  }

  return {
    assunto: `E-mail confirmado. Seus ${DIAS_DE_TESTE} dias começam quando você quiser`,
    titulo: "Pronto. Seu e-mail está confirmado",
    paragrafos: [
      /*
       * "Plano Leve", e não "acesso completo".
       *
       * A primeira versão desta frase dizia acesso completo, e a lista logo
       * abaixo dizia que no plano Leve não abrimos o arquivo do edital. As duas
       * no mesmo e-mail: a de cima vendendo o que a de baixo negava. O teste
       * roda no Leve (`assinatura/teste.ts`), então é o Leve que a abertura tem
       * de prometer — quem experimenta o Leve e assina o Leve recebe o que viu.
       */
      `Você tem ${DIAS_DE_TESTE} dias no plano Leve, sem cartão e sem cobrança no fim. Para começar, falta cadastrar a empresa e escolher onde procurar, leva uns cinco minutos, e é o que permite a triagem comparar cada edital com o que você vende.`,
      /*
       * A cidade digitada volta aqui de propósito.
       *
       * Ela some do produto no momento em que o alerta gratuito acaba: quem
       * escolhe o recorte passa a ser o cliente, na tela de recortes. Sem esta
       * frase, a pessoa que escreveu "Caruaru" no formulário recebe um convite
       * que nunca menciona Caruaru, e a impressão é a de ter caído numa lista
       * qualquer. Dizer o que ela pediu, e dizer que agora a escolha é dela, é
       * o que liga uma coisa na outra.
       */
      `Você se cadastrou de olho nos editais ${regiaoEmTexto(dados.cidade)}. No teste, quem escolhe o recorte é você: até três, e essa região pode ser um deles.`,
      /*
       * A frase mais importante deste e-mail, e ela é a que dá má notícia.
       *
       * Até 25/08 este endereço recebia um alerta gratuito diário, para sempre.
       * Quem se cadastrou esperando aquilo precisa ler, aqui, que a promessa
       * mudou — antes de esperar por um e-mail que não vem. Descobrir pelo
       * silêncio é o caminho mais curto para uma denúncia de spam, e denúncia
       * derruba a entrega de todo mundo na lista.
       */
      "Uma mudança que você precisa saber: o alerta gratuito diário deixou de existir. Ele mandava os editais abertos de uma cidade sem filtrar pelo seu ramo, e era, na prática, uma versão pior do produto pago. Em vez de manter os dois, preferimos abrir o produto inteiro por um tempo.",
    ],
    acao: {
      rotulo: `Começar os ${DIAS_DE_TESTE} dias`,
      url: `${urlBase}/criar-conta/`,
    },
    listas: [
      {
        /*
         * Os rótulos desta lista são os MESMOS de `resumo/plano.ts`, e isso não
         * é estilo: é a promessa e a entrega usando uma palavra só. Quem lê
         * "Aderência" aqui encontra "Aderência" no primeiro e-mail, em vez de
         * ter de traduzir "nota de combinação" para o que a linha diz.
         */
        titulo: "O que chega, e quando",
        itens: [
          {
            rotulo: "Quando",
            texto:
              "nos dias úteis, pela manhã, e silêncio no dia em que não houver edital novo para você",
          },
          {
            rotulo: "Onde procurar",
            texto:
              "até três recortes: uma cidade, um estado ou o Brasil, cada um com o próprio filtro de palavras e de faixa de valor",
          },
          {
            rotulo: "Aderência",
            texto:
              "cada edital chega com uma nota de 0 a 100 sobre o quanto ele combina com o que a sua empresa vende",
          },
          {
            rotulo: "Órgão e local",
            texto: "quem abriu a licitação, e em que município e estado",
          },
          {
            /*
             * A promessa que existe para NÃO poder ser cumprida com zero.
             *
             * Boa parte dos editais do PNCP sai sem valor estimado. Escrever
             * "R$ 0,00" ali seria informação inventada em cima de ausência, e o
             * assinante descartaria oportunidade boa achando que é migalha. A
             * guarda que impede isso mora onde a linha é montada, em
             * `resumo/plano.test.ts`.
             */
            rotulo: "Valor",
            texto:
              "o valor estimado, e “não informado” quando o órgão não publica, nunca R$ 0,00 no lugar do que falta",
          },
          {
            rotulo: "Prazo",
            texto: "quanto tempo falta para a proposta encerrar",
          },
          {
            rotulo: "Edital",
            texto: "o link para a publicação oficial, que é onde a decisão é tomada",
          },
          {
            rotulo: "Painel",
            texto:
              "o histórico do que passou pelo seu perfil, e a resposta para “por que este edital não apareceu para mim?”",
          },
        ],
      },
      {
        /*
         * Mesmo lugar e mesmo peso da lista de cima, e pelo mesmo motivo de
         * sempre: quem descobre limitação depois de investir tempo pede
         * reembolso, e quem descobre antes decide com informação.
         */
        titulo: `O que o teste NÃO faz, para você não contar com isso`,
        itens: [
          {
            rotulo: "Leitura do documento",
            texto:
              "no plano Leve não abrimos o arquivo do edital. Você recebe o que o órgão publicou, cedo e filtrado; as exigências de habilitação continuam sendo leitura sua, no documento oficial",
          },
          {
            rotulo: "Garantia de resultado",
            texto:
              "nada aqui garante habilitação nem vitória, e nada substitui ler o edital inteiro antes de disputar",
          },
        ],
      },
    ],
    fecho: [
      `Ao fim dos ${DIAS_DE_TESTE} dias o acesso para, sem cobrança automática e sem cartão cadastrado. Se quiser continuar, você assina; se não quiser, não precisa fazer nada.`,
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
/** Por que esta pessoa está recebendo. A frase padrão é a do alerta. */
function porqueDoRodape(conteudo: ConteudoDeEmail): string {
  return (
    conteudo.rodape.porque ??
    `Você recebe este e-mail porque cadastrou ${conteudo.rodape.cadastradoComo} no alerta do ${SITE.name}.`
  );
}

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
  partes.push("---");
  partes.push(conteudo.rodape.limites);
  partes.push(
    conteudo.rodape.descadastro
      ? `${porqueDoRodape(conteudo)} Para não receber mais: ${conteudo.rodape.descadastro}`
      : porqueDoRodape(conteudo),
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
<p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#5b6472">${escapar(porqueDoRodape(conteudo))}${
  conteudo.rodape.descadastro
    ? ` <a href="${escapar(conteudo.rodape.descadastro)}" style="color:#5b6472">Não quero mais receber</a>.`
    : ""
}</p>
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

export function mensagemDoConvite(dados: DadosDoConvite): Mensagem {
  return mensagem(dados.email, conteudoDoConvite(dados));
}

export function mensagemDeBoasVindas(dados: DadosDeBoasVindas): Mensagem {
  return mensagem(dados.email, conteudoDeBoasVindas(dados));
}
