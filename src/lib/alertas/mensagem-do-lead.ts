import type { BlocoDeLista, ConteudoDeEmail } from "../email/mensagens.ts";
import { LIMITES, urlDeDescadastro } from "../email/mensagens.ts";
import { emReais, prazoEmTexto } from "./formato.ts";
import type { ItemDoAlertaDeLead, SelecaoParaLead } from "./lead.ts";
import { SITE } from "../site.ts";

/**
 * O texto do alerta diário do lead.
 *
 * Mora em `alertas/` e não em `email/` porque quem sabe o que é um edital é esta
 * camada; a de e-mail sabe renderizar `ConteudoDeEmail` e nada mais. É a mesma
 * divisão que já existia entre `email/mensagens.ts` e `leads-emails.ts`, e
 * mantê-la é o que permite trocar o gerador de HTML sem tocar no que o alerta
 * afirma — e mudar o que o alerta afirma sem mexer em HTML.
 *
 * Reusar `ConteudoDeEmail` traz de graça as três coisas que um e-mail de lista
 * não pode perder e que se perdem justamente quando alguém escreve "só mais um
 * template": o rodapé de limites, a frase de por que a pessoa está recebendo, e
 * o link de descadastro. Um alerta diário sem link de saída é o caminho mais
 * curto para uma denúncia de spam, e denúncia de spam derruba a entrega de todo
 * mundo na lista, não só de quem denunciou.
 *
 * ## O bloco por edital repete o que as boas-vindas prometeram
 *
 * `conteudoDeBoasVindas` lista, item a item, o que vem em cada alerta: objeto,
 * órgão, valor, prazo e link oficial. Esses cinco campos, nessa ordem, são
 * contrato com quem confirmou o cadastro — não sugestão de layout. Mexer aqui
 * sem mexer lá faz o produto entregar diferente do que ele prometeu na única
 * mensagem que a pessoa leu com atenção.
 */

export type DadosDoAlertaDiario = {
  email: string;
  /** Token de descadastro. Esta camada não o gera nem o valida. */
  tokenDeDescadastro: string;
  /** Como o visitante escreveu a cidade. Aparece no assunto e na abertura. */
  regiao: string;
  selecao: SelecaoParaLead;
  urlBase?: string;
};

/**
 * O assunto.
 *
 * Traz a contagem e a região porque é o que decide a abertura numa caixa de
 * entrada cheia: "Alerta de licitação" é indistinguível do e-mail de ontem, e
 * "3 editais abertos em Recife" é uma informação inteira antes do clique.
 *
 * A contagem é a dos itens que estão NO e-mail, e nunca o total da região. Dizer
 * "23 editais" e mostrar 5 é a forma mais rápida de o assunto virar isca — e o
 * excedente tem lugar próprio no fecho, onde não promete o que o corpo não
 * entrega.
 */
function assunto(quantidade: number, regiao: string): string {
  return quantidade === 1
    ? `1 edital aberto em ${regiao}`
    : `${quantidade} editais abertos em ${regiao}`;
}

/** Um edital, nos cinco campos que as boas-vindas prometeram. */
function bloco(item: ItemDoAlertaDeLead): BlocoDeLista {
  const { edital, diasParaEncerrar } = item;

  return {
    // O objeto é o título do bloco porque é por ele que a pessoa decide se lê o
    // resto. Cortado em 120 caracteres: o PNCP publica objeto com parágrafo
    // inteiro, e um título de seis linhas empurra os outros editais para fora
    // da primeira tela.
    titulo: cortar(edital.objeto, 120),
    itens: [
      { rotulo: "Órgão", texto: edital.orgao.nome },
      { rotulo: "Local", texto: `${edital.local.municipio}/${edital.local.uf}` },
      { rotulo: "Valor", texto: emReais(edital.valorEstimado, edital.valorSuspeito) },
      { rotulo: "Prazo", texto: prazoEmTexto(diasParaEncerrar) },
      // O link vai por último e é o único item com `url`: é a ação do bloco.
      { rotulo: "Edital", texto: "abrir a publicação oficial", url: edital.link },
    ],
  };
}

/**
 * Corta preservando palavra, com reticência.
 *
 * Cortar no meio da palavra faz um objeto de licitação virar outra coisa
 * ("aquisição de material hospit…"), e o leitor perde justamente o substantivo
 * que diria se aquilo é do ramo dele.
 */
function cortar(texto: string, maximo: number): string {
  const limpo = texto.trim().replace(/\s+/g, " ");
  if (limpo.length <= maximo) return limpo;

  const pedaco = limpo.slice(0, maximo);
  const ultimoEspaco = pedaco.lastIndexOf(" ");
  // Sem espaço nenhum na janela é palavra única gigante (URL colada no objeto,
  // por exemplo): aí corta seco mesmo, porque não há palavra a preservar.
  return `${(ultimoEspaco > maximo * 0.6 ? pedaco.slice(0, ultimoEspaco) : pedaco).trimEnd()}…`;
}

/**
 * Monta o conteúdo do alerta diário.
 *
 * **Não trata o caso vazio, e isso é deliberado.** Quem chama tem de checar
 * `selecao.vazio` e simplesmente não enviar — a promessa feita nas boas-vindas é
 * que dia sem publicação nova é dia sem e-mail. Aceitar seleção vazia aqui e
 * produzir um "nada por aqui hoje" seria dar a quem chama uma forma fácil de
 * quebrar essa promessa sem perceber; por isso a função lança.
 */
export function conteudoDeAlertaDiario(dados: DadosDoAlertaDiario): ConteudoDeEmail {
  const { itens, excedentes } = dados.selecao;

  if (itens.length === 0) {
    throw new Error(
      "conteudoDeAlertaDiario: seleção vazia. Dia sem edital novo é dia sem e-mail — confira `selecao.vazio` antes de montar a mensagem.",
    );
  }

  const fecho: string[] = [];

  if (excedentes > 0) {
    fecho.push(
      excedentes === 1
        ? `Havia mais 1 edital aberto em ${dados.regiao} hoje. Mandamos os ${itens.length} com prazo mais curto para o e-mail caber numa tela; o restante entra nos próximos envios.`
        : `Havia mais ${excedentes} editais abertos em ${dados.regiao} hoje. Mandamos os ${itens.length} com prazo mais curto para o e-mail caber numa tela; o restante entra nos próximos envios.`,
    );
  }

  // Repetido em todo envio, e não só no primeiro: quem recebe o alerta há três
  // meses já esqueceu o que leu nas boas-vindas, e o recorte continua sendo
  // geográfico. É mais barato repetir a limitação do que descobrir que alguém
  // deixou de ler um edital achando que nós teríamos avisado se servisse.
  //
  // A segunda frase é nova: nomeia o que já é real hoje (score por CNAE,
  // faturamento e experiência — tudo em `dominio/score.ts`, sem precisar de
  // leitura do texto) para o botão abaixo não ser um link solto sem contexto.
  // Não menciona leitura de propósito: ela ainda não está no ar (ver o bloco
  // "o que ainda não está no ar" em `conteudoDeBoasVindas`), e prometer aqui o
  // que aquele e-mail já disse que falta seria desmentir a própria mensagem
  // anterior.
  fecho.push(
    "O recorte deste alerta é geográfico: são os editais publicados na região que você cadastrou, sem filtro por ramo de atividade nem leitura do texto do edital. Confira sempre o documento oficial antes de decidir participar.",
  );
  fecho.push(
    "Cadastrando sua empresa, o corte deixa de ser só a cidade: comparamos cada edital com o seu ramo, faturamento e experiência, e o que passa nesse filtro aparece no seu painel com uma pontuação de aderência.",
  );

  return {
    assunto: assunto(itens.length, dados.regiao),
    titulo: assunto(itens.length, dados.regiao),
    paragrafos: [
      itens.length === 1
        ? `Um edital foi publicado em ${dados.regiao} e está com propostas abertas. Os dados abaixo são os da publicação oficial no Portal Nacional de Contratações Públicas.`
        : `Estes editais estão com propostas abertas em ${dados.regiao}, ordenados pelo prazo mais curto. Os dados são os da publicação oficial no Portal Nacional de Contratações Públicas.`,
    ],
    /*
     * Agora tem botão. A razão original de não ter ("um alerta com vários
     * editais não tem UMA ação") continua valendo para os editais em si —
     * por isso o botão não escolhe um deles, e o link de cada bloco continua
     * sendo a ação daquele item. Este é um botão de outra categoria: sai do
     * e-mail, não aponta pra edital nenhum, cumpre o que `conteudoDeBoasVindas`
     * já prometeu ("quando [filtro fino] entrar no ar, você recebe um
     * aviso") ao dar o caminho pra quem já quer aquele filtro agora, sem
     * esperar aviso nenhum.
     */
    acao: {
      rotulo: "Filtrar pelo meu ramo de atuação",
      url: `${dados.urlBase ?? SITE.url}/criar-conta/`,
    },
    listas: itens.map(bloco),
    fecho,
    rodape: {
      cadastradoComo: dados.email,
      descadastro: urlDeDescadastro(dados.tokenDeDescadastro, dados.urlBase),
      limites: LIMITES,
    },
  };
}
