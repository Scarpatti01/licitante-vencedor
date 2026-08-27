/**
 * As doze semanas da jornada, tiradas do Workbook do Licitante.
 *
 * ## Por que o conteúdo mora em código
 *
 * Porque ele é texto de livro, e texto de livro se revisa em pull request, com
 * diff legível e histórico. Numa tabela, uma correção de vírgula vira um UPDATE
 * sem rastro e um erro de digitação chega ao cliente sem ninguém ver.
 *
 * O banco guarda o que é do usuário: progresso e resposta. Nada do que é nosso.
 *
 * ## O código da etapa é contrato com o banco
 *
 * `progresso_na_jornada.etapa` e `respostas_da_jornada.etapa` gravam estes
 * códigos, e a migração trava o formato. `campo.codigo` idem. Renomear qualquer
 * um deles órfã os dados que já existem, e por isso `conteudo.guarda.test.ts`
 * confere formato e unicidade a cada build.
 *
 * ## Por que doze semanas e não catorze dias
 *
 * As etapas têm dependência real entre si: não dá para ler edital antes de
 * levantar certidão, e não dá para decidir o que automatizar antes de
 * cronometrar a triagem à mão. Comprimir o calendário criaria uma promessa que
 * a Parte 0 do próprio livro desmente.
 */

export type CampoDaEtapa = {
  /** Estável: é chave em `respostas_da_jornada`. Nunca renomear. */
  codigo: string;
  rotulo: string;
  /** `longo` vira textarea; o resto é uma linha. */
  formato: "curto" | "longo";
  ajuda?: string;
};

export type EtapaDaJornada = {
  /** Estável: é chave em `progresso_na_jornada`. Nunca renomear. */
  codigo: string;
  semana: number;
  titulo: string;
  /** A frase que aparece no cartão da lista. */
  resumo: string;
  /** O que a pessoa faz nesta semana, em prosa. */
  texto: string[];
  /** Como ela sabe que terminou. Vira o rótulo do botão de conclusão. */
  criterio: string;
  /** A seção do livro que trata isto a fundo. */
  noLivro: string;
  campos: CampoDaEtapa[];
};

export const ETAPAS: readonly EtapaDaJornada[] = [
  {
    codigo: "semana-01",
    semana: 1,
    titulo: "O diagnóstico honesto",
    resumo: "Descobrir se este mercado serve para a sua empresa agora.",
    noLivro: "Parte 0, seções 0.1 a 0.7",
    texto: [
      "Quase nenhum material sobre licitação começa por aqui, porque a resposta pode ser não, e não vende. Começar por aqui custa uma tarde. Descobrir depois de uma sanção custa a empresa.",
      "Três perguntas decidem: o governo compra do seu ramo, você aguenta o prazo de pagamento, e você entrega o maior lote que pretende disputar. Responda com o que é verdade hoje, e não com o que você pretende construir.",
    ],
    criterio: "Tenho um veredito escrito, com nota, e ele é meu.",
    campos: [
      { codigo: "orgaos-que-compram", formato: "curto", rotulo: "Órgãos que eu alcanço e compram o que eu vendo" },
      { codigo: "folego", formato: "curto", rotulo: "Quantos dias eu aguento entre pagar fornecedor e receber", ajuda: "Se for menos de 60, resolva o fôlego antes de disputar." },
      { codigo: "maior-entrega", formato: "curto", rotulo: "O maior contrato que eu entrego sem depender de tudo dar certo" },
      { codigo: "veredito", formato: "longo", rotulo: "Meu veredito: eu entro agora, ou resolvo o quê antes?" },
    ],
  },
  {
    codigo: "semana-02",
    semana: 2,
    titulo: "O calendário das certidões",
    resumo: "Levantar todas, e saber qual vence primeiro.",
    noLivro: "Seção 0.4 e Folha A",
    texto: [
      "A causa mais comum de derrota de empresa iniciante não é preço: é documento. E a armadilha não é a certidão que falta, é a que vence entre o envio da proposta e a fase de habilitação.",
      "Federal costuma valer 180 dias, FGTS 30, trabalhista 180, e as estaduais e municipais variam. Isso significa que existe sempre alguma perto do vencimento. Uma empresa que disputa toda semana precisa de rotina de renovação, não de corrida a cada edital.",
    ],
    criterio: "Sei qual certidão vence primeiro e em que dia eu vou renovar.",
    campos: [
      { codigo: "vence-primeiro", formato: "curto", rotulo: "A certidão que vence primeiro, e a data" },
      { codigo: "quem-renova", formato: "curto", rotulo: "Quem renova, e em que dia da semana" },
      { codigo: "pendencias", formato: "longo", rotulo: "O que está pendente e impede emitir alguma delas hoje" },
    ],
  },
  {
    codigo: "semana-03",
    semana: 3,
    titulo: "Regularizar e falar com o contador",
    resumo: "Índices contábeis e pendências, antes que eles apareçam numa sessão.",
    noLivro: "Seções 0.4 e 0.12",
    texto: [
      "Muitos editais exigem índices de liquidez e solvência calculados a partir do balanço. Uma empresa lucrativa pode reprovar neles por causa de como o passivo está classificado, e isso se corrige com o contador antes, nunca depois.",
      "É a conversa de uma hora com maior retorno de toda a jornada: índice reprovado inabilita em todos os certames ao mesmo tempo, e leva um exercício inteiro para corrigir.",
    ],
    criterio: "Sei se os meus índices passam, e o que muda isso se não passarem.",
    campos: [
      { codigo: "indices", formato: "curto", rotulo: "Meus índices passam nas exigências típicas?" },
      { codigo: "balanco", formato: "curto", rotulo: "Balanço do último exercício está fechado e assinado?" },
      { codigo: "acao-contabil", formato: "longo", rotulo: "O que o contador disse que precisa mudar, e até quando" },
    ],
  },
  {
    codigo: "semana-04",
    semana: 4,
    titulo: "Cadastros, na ordem que funciona",
    resumo: "gov.br, SICAF e os portais das suas praças.",
    noLivro: "Seção 1.12",
    texto: [
      "A ordem importa e leva de uma a três semanas quando a documentação está limpa: conta gov.br do representante, depois SICAF, depois os portais das suas praças, e por último o cadastro do órgão específico quando houver.",
      "Os acessos ficam vinculados a uma pessoa física. Se ela sair da empresa, os acessos saem junto. Decida quem é, tenha um segundo representante habilitado, e trate a troca dessa pessoa como procedimento e não como imprevisto.",
    ],
    criterio: "SICAF ativo, e os portais das praças que eu já sei que vou disputar.",
    campos: [
      { codigo: "sicaf", formato: "curto", rotulo: "SICAF: situação e data" },
      { codigo: "portais", formato: "curto", rotulo: "Portais em que eu já estou cadastrado" },
      { codigo: "segundo-acesso", formato: "curto", rotulo: "Quem é o segundo representante habilitado" },
    ],
  },
  {
    codigo: "semana-05",
    semana: 5,
    titulo: "O mapa das suas praças",
    resumo: "Quais órgãos, em quais cidades, compram o que você vende.",
    noLivro: "Seções 1.7 e 2.15",
    texto: [
      "A esfera municipal responde por 65% das publicações. Para uma empresa pequena isso é a melhor notícia do livro: o comprador típico é uma prefeitura, e prefeitura compra em escala que cabe no seu tamanho.",
      "Mercado pulverizado favorece produto padronizado e muitos compradores pequenos; mercado concentrado favorece relação com poucos órgãos grandes. As duas estratégias funcionam, e escolher a errada para a sua praça custa meses.",
    ],
    criterio: "Tenho uma lista de órgãos por cidade, e sei por que cada um entrou.",
    campos: [
      { codigo: "ufs", formato: "curto", rotulo: "Unidades da federação em que eu entrego sem inventar logística" },
      { codigo: "orgaos", formato: "longo", rotulo: "Órgãos que eu já sei que compram o que eu vendo" },
      { codigo: "praca-nova", formato: "curto", rotulo: "A praça vizinha que eu vou avaliar, uma por vez" },
    ],
  },
  {
    codigo: "semana-06",
    semana: 6,
    titulo: "A lista de termos",
    resumo: "As palavras que o comprador usa, e não as que você usa.",
    noLivro: "Seções 2.4 e 2.12",
    texto: [
      "Escreva o nome do que você vende do jeito que você chama, do jeito que o cliente chama e do jeito que o concorrente anuncia. Já são três, e elas raramente coincidem.",
      "Depois vá buscar as palavras do comprador em editais que serviriam, em contratos antigos seus e no objeto pelo qual concorrentes venceram. Inclua plural, acento, sigla e o erro de digitação comum, porque objeto de edital é digitado por pessoa com pressa.",
      "Metade do ganho está na lista negativa. Anote as exclusões junto com a razão de cada uma, porque daqui a seis meses você não vai lembrar por que excluiu aquilo.",
    ],
    criterio: "A lista tem pelo menos quinze termos, e as exclusões têm motivo escrito.",
    campos: [
      { codigo: "termos", formato: "longo", rotulo: "Meus termos, um por linha" },
      { codigo: "exclusoes", formato: "longo", rotulo: "Minhas exclusões, com o motivo de cada uma" },
    ],
  },
  {
    codigo: "semana-07",
    semana: 7,
    titulo: "Sete dias cronometrados",
    resumo: "Medir a triagem à mão, antes de comprar qualquer ferramenta.",
    noLivro: "Seções 2.6 e 5.11",
    texto: [
      "Esta é a semana que sustenta todas as decisões seguintes. Confira o portal como você conferiria de verdade, e cronometre. Todo dia, sem arredondar para baixo.",
      "O número de minutos por semana é o que transforma 'isso toma muito tempo' numa decisão de negócio. Sem ele, qualquer compra de ferramenta é fé, e qualquer medição depois não tem com o que ser comparada.",
    ],
    criterio: "Tenho um número de minutos por semana, e não uma impressão.",
    campos: [
      { codigo: "minutos", formato: "curto", rotulo: "Minutos por semana que a triagem consome hoje", ajuda: "Some os sete dias. É este número que você vai comparar daqui a três meses." },
      { codigo: "falsos-positivos", formato: "curto", rotulo: "De cada dez que eu abri, quantos não eram meus" },
      { codigo: "pior-dia", formato: "longo", rotulo: "O que mais me atrapalhou nesta semana" },
    ],
  },
  {
    codigo: "semana-08",
    semana: 8,
    titulo: "Ler três editais inteiros",
    resumo: "Sem disputar nenhum. É treino, e treino não tem prazo.",
    noLivro: "Seções 1.9, 1.17 e Folha B",
    texto: [
      "Leia na ordem que economiza tempo, que não é a ordem do documento: objeto, data, valor e julgamento, exigência de atestado, e só então o termo de referência.",
      "A qualificação técnica vem antes do termo de referência de propósito. Ela é a cláusula que mais elimina empresa pequena, e ela não se resolve com esforço: ou você tem o atestado, ou não tem.",
      "No termo de referência, quatro coisas respondem por quase todo o risco: especificação, prazo de entrega, número de locais e penalidades.",
    ],
    criterio: "Três editais lidos, com a Folha B preenchida em cada um.",
    campos: [
      { codigo: "edital-1", formato: "longo", rotulo: "Edital 1: órgão, objeto e por que eu disputaria ou não" },
      { codigo: "edital-2", formato: "longo", rotulo: "Edital 2: idem" },
      { codigo: "edital-3", formato: "longo", rotulo: "Edital 3: idem" },
      { codigo: "surpresa", formato: "curto", rotulo: "O que me surpreendeu nos três" },
    ],
  },
  {
    codigo: "semana-09",
    semana: 9,
    titulo: "Formar preço e escrever o piso",
    resumo: "O número abaixo do qual você não desce, em papel.",
    noLivro: "Seções 3.6, 4.19 e Exercício 3.B",
    texto: [
      "A maior parte das derrotas caras não é perder: é ganhar por um preço que não fecha. Como a proposta não se altera para cima depois de aberta, o cálculo precisa estar certo antes.",
      "Entram no piso quatro custos que quem vem do mercado privado esquece: o custo financeiro do prazo de recebimento, a garantia contratual quando exigida, a entrega pulverizada e o reajuste ao longo da vigência.",
    ],
    criterio: "Tenho um piso calculado para um edital real, com os quatro custos dentro.",
    campos: [
      { codigo: "edital-alvo", formato: "curto", rotulo: "O edital para o qual eu calculei" },
      { codigo: "piso", formato: "curto", rotulo: "Meu piso, em reais" },
      { codigo: "se-furar", formato: "longo", rotulo: "Se o lance do concorrente furar o meu piso, o que eu faço" },
    ],
  },
  {
    codigo: "semana-10",
    semana: 10,
    titulo: "A primeira disputa",
    resumo: "Escolhida para aprender o sistema, não para ganhar.",
    noLivro: "Seções 0.11, 3.5 e 3.16",
    texto: [
      "Escolha valor pequeno, objeto que você já vende hoje, entrega perto, prazo confortável e sem exigência de atestado que você não cumpra. O custo dessa escolha é a margem de um contrato; o custo de estrear num edital grande é desistir do mercado por um erro de operação.",
      "Entre trinta minutos antes do horário, com a proposta enviada e conferida. Guarde a confirmação do sistema, não a intenção. E saiba, antes de começar, em que campo se manifesta intenção de recurso: a janela dura minutos.",
    ],
    criterio: "Disputei, com o piso ao lado da tela e o roteiro aberto.",
    campos: [
      { codigo: "certame", formato: "curto", rotulo: "Órgão e número do certame" },
      { codigo: "resultado", formato: "curto", rotulo: "Resultado, e o preço do vencedor" },
      { codigo: "onde-travei", formato: "longo", rotulo: "Onde eu travei durante a sessão" },
    ],
  },
  {
    codigo: "semana-11",
    semana: 11,
    titulo: "Escrever o que deu errado",
    resumo: "Sem justificativa. A justificativa é o que impede corrigir.",
    noLivro: "Seções 3.14 e 3.18",
    texto: [
      "Separe a causa: você perdeu de preço, ou perdeu de operação? Preço é decisão estratégica, e talvez a resposta certa seja parar de disputar aquele objeto. Operação é defeito corrigível, e é quase sempre um destes três: especificação, calendário de certidão, ou disciplina no lance.",
      "Anote o preço do vencedor. Ele é público, e depois de dez certames do mesmo tipo você passa a formar preço com referência em vez de estimativa.",
    ],
    criterio: "Sei a causa real, escrita em uma frase, sem atenuante.",
    campos: [
      { codigo: "causa", formato: "curto", rotulo: "A causa real, em uma frase" },
      { codigo: "tipo", formato: "curto", rotulo: "Foi preço ou foi operação?" },
      { codigo: "mudanca", formato: "longo", rotulo: "A única coisa que eu vou mudar por causa disso" },
    ],
  },
  {
    codigo: "semana-12",
    semana: 12,
    titulo: "Decidir o que automatizar",
    resumo: "Com o número da semana 7 na mão, e não sem ele.",
    noLivro: "Parte 5, seções 5.9 e 5.13",
    texto: [
      "As quatro saídas são: não fazer nada, construir em casa, assinar um serviço, ou contratar uma pessoa. Todas ficam mais baratas depois da medição, inclusive a de contratar alguém, porque você passa a saber para o que está contratando.",
      "Não automatize o que você ainda não sabe fazer à mão, nem decisão com consequência irreversível, nem o que muda toda semana. E não automatize para economizar dinheiro: o custo de leitura por edital é de centavos. A automação aqui compra atenção e alcance.",
      "O teste antes de automatizar qualquer passo: escreva o passo numa frase, e diga na mesma frase como você vai saber que ele falhou hoje. Se a resposta for 'aí eu não fico sabendo', o passo não está pronto.",
    ],
    criterio: "Escolhi uma saída, e sei como vou saber que ela falhou.",
    campos: [
      { codigo: "saida", formato: "curto", rotulo: "A saída que eu escolhi" },
      { codigo: "porque", formato: "longo", rotulo: "Por quê, usando o número de minutos da semana 7" },
      { codigo: "como-sei-que-falhou", formato: "longo", rotulo: "Como eu vou saber que ela falhou hoje" },
    ],
  },
] as const;

export const TOTAL_DE_ETAPAS = ETAPAS.length;

export function etapaPorCodigo(codigo: string): EtapaDaJornada | undefined {
  return ETAPAS.find((e) => e.codigo === codigo);
}

export function etapaPorSemana(semana: number): EtapaDaJornada | undefined {
  return ETAPAS.find((e) => e.semana === semana);
}
