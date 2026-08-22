import type { BlocoDeLista, ConteudoDeEmail } from "../email/mensagens.ts";
import { SITE } from "../site.ts";
import { cortar, OBJETO_NO_ROTULO } from "../email/cortar.ts";

/**
 * Quem recebe o resumo diário do cliente, e o que vai nele.
 *
 * ## O que este arquivo é, e o que ele não é
 *
 * É a decisão, e só ela: dadas as oportunidades do dia, o que já foi enviado
 * antes e quais praças a coleta não alcançou, esta função devolve "não manda
 * nada" ou "manda isto". Puro, sem banco, sem rede, sem relógio implícito.
 *
 * A separação é a mesma de `alertas/envio.ts`, e pela mesma razão: as regras
 * abaixo são promessas ao cliente, não detalhes de implementação. Promessa se
 * exercita com teste; I/O se exercita com paciência.
 *
 * ## Este NÃO é o alerta gratuito
 *
 * O alerta de lead recorta por cidade e manda a linha crua do portal. Este aqui
 * é o produto pago: recorta pelo perfil da empresa, ordena por aderência, e
 * carrega a leitura do edital quando ela existe. Um mora em `alertas/`, o outro
 * aqui, e os dois não devem convergir só porque ambos mandam e-mail.
 */

/** Quantas oportunidades cabem num resumo. */
export const OPORTUNIDADES_POR_RESUMO = 8;

/**
 * Os limites do produto, repetidos em toda mensagem.
 *
 * Diferente da frase do alerta gratuito de propósito: lá o serviço não lê nada,
 * aqui lê os de maior aderência. Repetir a frase errada seria prometer a menos
 * num canal pago — ou a mais, dependendo de qual copiássemos.
 */
export const LIMITES_DO_RESUMO =
  "Lemos os editais de maior aderência ao seu perfil, todo dia. Não garantimos habilitação, não avaliamos se você vai ganhar e não emitimos opinião jurídica.";

export type OportunidadeDoResumo = {
  /** `editais.id` — é por ele que se sabe o que já foi enviado. */
  editalId: string;
  objeto: string;
  orgao: string;
  municipio: string;
  uf: string;
  valorEstimado: number | null;
  encerramentoProposta: string | null;
  link: string;
  /** `null` quando a cobertura do score ficou abaixo do mínimo para afirmar um número. */
  score: number | null;
  /** `true` só quando a análise leu o texto do edital, e não a ficha do portal. */
  leuTexto: boolean;
};

export type DadosDoResumo = {
  empresa: string;
  email: string;
  /** Siglas em maiúsculas, como o perfil declara. */
  ufsAtendidas: readonly string[];
  oportunidades: readonly OportunidadeDoResumo[];
  /** `editais.id` já enviados a esta empresa em dias anteriores. */
  jaEnviados: ReadonlySet<string>;
  /** Praças que a coleta de hoje não alcançou. Ver `Classificacao.ufsAusentes`. */
  ufsAusentes: readonly string[];
  /**
   * O que a empresa configurou. Vem de `preferencias_de_envio`, no banco.
   *
   * Morava num cookie até 22/08, e por isso o envio não tinha como obedecer:
   * cookie fica no navegador de quem configurou, e quem envia é um job de
   * madrugada. A tela aceitava cliques que não chegavam a lugar nenhum.
   */
  preferencias: { scoreMinimo: number; maximoPorEnvio: number };
  urlDoPainel?: string;
};

export type PlanoDoResumo =
  | { tipo: "sem-novidade" }
  | { tipo: "enviar"; conteudo: ConteudoDeEmail; editaisIds: string[] };

/** Quais praças do perfil ficaram de fora hoje. Vazio quando nenhuma. */
export function pracasQueFaltaram(
  ufsAtendidas: readonly string[],
  ufsAusentes: readonly string[],
): string[] {
  const ausentes = new Set(ufsAusentes.map((uf) => uf.toUpperCase()));
  return [...new Set(ufsAtendidas.map((uf) => uf.toUpperCase()))]
    .filter((uf) => ausentes.has(uf))
    .sort();
}

const real = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function prazoEmTexto(encerramento: string | null, agora: Date): string {
  if (!encerramento) return "prazo não informado";

  const dias = Math.ceil((Date.parse(encerramento) - agora.getTime()) / 86_400_000);
  if (!Number.isFinite(dias)) return "prazo não informado";
  if (dias <= 0) return "encerra hoje";
  return dias === 1 ? "encerra amanhã" : `encerra em ${dias} dias`;
}

/**
 * Um edital, como um BLOCO — e não como uma linha.
 *
 * ## O defeito que só a renderização mostrou
 *
 * A primeira versão punha o edital inteiro num item só: o objeto no `rotulo` e
 * todos os dados no `texto`. Passou nos testes, saiu bem no texto simples, e o
 * HTML ficou ilegível.
 *
 * O motivo está no template: cada item vira uma linha de tabela de DUAS
 * colunas, e a do rótulo tem `white-space:nowrap`. Ele foi desenhado para
 * "Órgão: Prefeitura de Recife" — rótulo curto, valor à direita. Um rótulo de
 * 120 caracteres que não pode quebrar empurra a tabela para fora da tela, e o
 * valor se espreme numa coluna de três palavras por linha.
 *
 * A estrutura certa já existia e o alerta gratuito já a usava: um bloco por
 * edital, o objeto como título do bloco, e dentro dele pares curtos. Este
 * arquivo passou a fazer igual — com dois campos a mais, que são o que o
 * produto pago acrescenta.
 */
function blocoDoEdital(o: OportunidadeDoResumo, agora: Date): BlocoDeLista {
  return {
    // O objeto é o título porque é por ele que a pessoa decide se lê o resto.
    // Cortado em 120: o PNCP publica objeto com parágrafo inteiro.
    titulo: cortar(o.objeto, OBJETO_NO_ROTULO),
    itens: [
      // Primeiro, porque é o que ordena a lista e o que este produto acrescenta.
      { rotulo: "Aderência", texto: o.score === null ? "não foi possível calcular" : `${o.score} de 100` },
      { rotulo: "Órgão", texto: o.orgao },
      { rotulo: "Local", texto: `${o.municipio}/${o.uf}` },
      { rotulo: "Valor", texto: o.valorEstimado === null ? "não informado" : real(o.valorEstimado) },
      { rotulo: "Prazo", texto: prazoEmTexto(o.encerramentoProposta, agora) },
      /*
       * Nunca vira resumo de mentira: ou o documento foi lido, ou a linha diz
       * que não foi. É a promessa que este produto passou meses sem cumprir, e
       * a que não pode voltar a ser afirmada sem base.
       */
      { rotulo: "Leitura", texto: o.leuTexto ? "documento lido" : "ainda não lemos o documento" },
      // Por último e único com `url`: é a ação do bloco.
      { rotulo: "Edital", texto: "abrir a publicação oficial", url: o.link },
    ],
  };
}

/**
 * O plano de envio para uma empresa.
 *
 * ## A regra que manda em tudo
 *
 * **Dia sem edital novo é dia sem e-mail** — inclusive quando o motivo de não
 * haver edital foi a coleta não alcançar a praça. Decisão do dono, em 22/08, e
 * ela é mais cuidadosa do que parece: mandar "não conseguimos olhar a sua
 * praça hoje" num dia em que não há nada a enviar transforma um problema nosso
 * em interrupção na caixa de entrada de quem paga.
 *
 * O aviso de praça ausente PEGA CARONA. Ele só aparece num e-mail que já ia
 * sair por causa de outra praça do perfil — aí ele é contexto útil, e não
 * anúncio de falha.
 *
 * ## E o cliente não fica sabendo o motivo
 *
 * Nada de "PNCP fora do ar", nada de erro técnico. Ele lê que aquela praça não
 * entrou hoje e que virá assim que possível. O motivo é problema nosso, e
 * despejá-lo em quem contratou o serviço é transferir a nossa dificuldade para
 * a atenção dele.
 */
export function planejarResumoDiario(dados: DadosDoResumo, agora: Date = new Date()): PlanoDoResumo {
  const novas = dados.oportunidades
    .filter((o) => !dados.jaEnviados.has(o.editalId))
    .filter((o) => !o.encerramentoProposta || Date.parse(o.encerramentoProposta) > agora.getTime())
    /*
     * Score ausente NÃO passa no corte.
     *
     * `null` aqui significa "a cobertura do score ficou abaixo do mínimo para
     * afirmar um número" — e não "zero". Deixar passar seria interromper o
     * cliente com um edital sobre o qual não temos opinião formada, no e-mail
     * que ele contratou justamente para receber opinião formada. Ele continua
     * no painel, onde a ausência é declarada em vez de virar recomendação.
     */
    .filter((o) => o.score !== null && o.score >= dados.preferencias.scoreMinimo)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  // A promessa, aplicada antes de qualquer outra coisa.
  if (novas.length === 0) return { tipo: "sem-novidade" };

  const escolhidas = novas.slice(0, dados.preferencias.maximoPorEnvio);
  const excedentes = novas.length - escolhidas.length;
  const lidas = escolhidas.filter((o) => o.leuTexto).length;

  const paragrafos = [
    `${escolhidas.length === 1 ? "1 edital aderente" : `${escolhidas.length} editais aderentes`} ao perfil da ${dados.empresa} hoje${lidas > 0 ? `, ${lidas === escolhidas.length ? "todos com o documento já lido" : `${lidas} deles com o documento já lido`}` : ""}.`,
    "Isto é o resumo. A análise de cada um — exigências de habilitação, garantia, visita técnica e riscos — está no painel.",
  ];

  const fecho: string[] = [];

  if (excedentes > 0) {
    fecho.push(
      excedentes === 1
        ? "Há mais 1 edital aderente hoje. Mandamos os de maior aderência para o e-mail caber numa tela; o restante está no painel."
        : `Há mais ${excedentes} editais aderentes hoje. Mandamos os de maior aderência para o e-mail caber numa tela; o restante está no painel.`,
    );
  }

  const faltaram = pracasQueFaltaram(dados.ufsAtendidas, dados.ufsAusentes);
  if (faltaram.length > 0) {
    fecho.push(
      faltaram.length === 1
        ? `Uma observação: hoje não conseguimos incluir os editais de ${faltaram[0]}, que também está no seu perfil. Assim que entrarem, enviamos para você.`
        : `Uma observação: hoje não conseguimos incluir os editais de ${faltaram.slice(0, -1).join(", ")} e ${faltaram.at(-1)}, que também estão no seu perfil. Assim que entrarem, enviamos para você.`,
    );
  }

  fecho.push("A decisão de disputar continua sendo sua, e depende de ler o edital inteiro — inclusive os anexos. Quando o nosso resumo divergir do documento, vale o documento.");

  return {
    tipo: "enviar",
    conteudo: {
      assunto:
        escolhidas.length === 1
          ? `1 edital para a ${dados.empresa}`
          : `${escolhidas.length} editais para a ${dados.empresa}`,
      titulo: "Os editais de hoje para a sua empresa",
      paragrafos,
      // O rótulo nomeia o que há do outro lado, e não o destino: "Acessar
      // painel" é endereço; "Ver a análise" é motivo. E como o e-mail é
      // resumo, o que está lá é exatamente o que aqui não coube.
      acao: {
        rotulo: "Ver a análise no painel",
        url: dados.urlDoPainel ?? `${SITE.url}/painel/`,
      },
      // Depois das listas: o botão é complemento do que já veio, não o conteúdo.
      acaoDepoisDasListas: true,
      // Um bloco por edital, na ordem de aderência.
      listas: escolhidas.map((o) => blocoDoEdital(o, agora)),
      fecho,
      rodape: {
        cadastradoComo: dados.email,
        /*
         * O descadastro do cliente é a tela de configurações, e não um link com
         * token como no alerta gratuito. A diferença é de sujeito: o lead não
         * tem conta, então o token é a única identidade que ele possui; o
         * cliente tem, e desligar o canal é uma preferência da empresa —
         * inclusive porque pode haver mais de uma pessoa recebendo.
         *
         * Aponta para um controle que EXISTE: `preferencias_de_envio.canal_email`,
         * que o remetente lê antes de mandar qualquer coisa. Rodapé de
         * descadastro que não desliga nada é pior que rodapé nenhum.
         */
        descadastro: `${SITE.url}/configuracoes/`,
        limites: LIMITES_DO_RESUMO,
        // O cliente NÃO se cadastrou num alerta: ele tem conta e contratou.
        // A frase padrão do rodapé é a do lead, e erraria sobre a relação
        // justamente no parágrafo que existe para explicá-la.
        porque: `Você recebe este e-mail porque a ${dados.empresa} tem conta no ${SITE.name} e o resumo diário está ligado para ${dados.email}.`,
      },
    },
    editaisIds: escolhidas.map((o) => o.editalId),
  };
}
