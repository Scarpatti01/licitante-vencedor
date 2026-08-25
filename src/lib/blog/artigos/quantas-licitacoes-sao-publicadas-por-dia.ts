import type { Artigo } from "../tipos";

/**
 * O primeiro artigo deste blog feito de DADO PRÓPRIO, e não de norma.
 *
 * ## Por que ele existe
 *
 * Os quatro artigos anteriores explicam regra — prazo de impugnação, documentos
 * de habilitação, atraso de pagamento. São úteis e são necessários para a
 * malha, mas competem com mil sites que explicam a mesma regra, porque a regra
 * é pública e igual para todo mundo.
 *
 * Este compete com ninguém. A coleta diária do PNCP produz, como subproduto, um
 * retrato do mercado de licitações que não está publicado em lugar nenhum: quem
 * publica, onde, quanto vale e quanto tempo o fornecedor tem para reagir. Era
 * dado que só servia ao produto; passa a servir também de conteúdo.
 *
 * ## A honestidade metodológica é o produto aqui
 *
 * Um artigo de dado vale pelo que ele declara sobre a própria medição. Por isso
 * a janela (17 a 22 de agosto de 2026) aparece no resumo, no corpo e no FAQ, e
 * por isso o texto diz o que NÃO dá para concluir. Publicar "o mercado de
 * licitações movimenta X" a partir de uma semana seria exatamente o tipo de
 * número inventado que o resto do site se recusa a produzir.
 *
 * Os números vieram de consulta direta à tabela `editais`, sobre publicações
 * com `publicado_em` na janela. Nenhum deles é estimativa.
 */
export const QUANTAS_LICITACOES_POR_DIA: Artigo = {
  slug: "quantas-licitacoes-sao-publicadas-por-dia",
  titulo: "Quantas licitações são publicadas por dia no Brasil? Medimos uma semana inteira",
  descricao:
    "Em uma semana de agosto de 2026 foram 13.397 editais no PNCP. Onde ficam, quanto valem e quanto tempo a sua empresa tem para responder.",
  resumo:
    "Entre 17 e 22 de agosto de 2026 foram publicados 13.397 editais no Portal Nacional de Contratações Públicas, vindos de 27 unidades da federação. Um dia útil comum tem cerca de 2.700 publicações; o sábado tem 37. A mediana de valor é R$ 129.603 e a mediana de prazo até o encerramento é de 14 dias, mas quase um terço dos editais dá menos de oito. Este texto abre esses números por estado, por modalidade e por faixa de valor, e explica por que o total quase nunca é o que interessa.",
  intencao: "informacional",
  termoPrincipal: "quantas licitações são publicadas por dia no Brasil",
  guiaRelacionado: "/vender-para-o-governo/",
  publicadoEm: "2026-08-25",
  verificadoEm: "2026-08-23",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "Quem começa a vender para o governo faz essa pergunta em algum momento, quase sempre em voz baixa: o mercado é grande mesmo, ou é conversa de quem vende curso? A resposta honesta exige medir, e medir exige coletar. Nós coletamos o Portal Nacional de Contratações Públicas todo dia, nas 27 unidades da federação, porque é isso que o produto faz. Este texto abre uma semana inteira dessa coleta, e serve de pano de fundo para quem está começando a [vender para o governo](/vender-para-o-governo/).",
    },
    {
      tipo: "subtitulo",
      texto: "O que foi medido, e o que estes números não dizem",
    },
    {
      tipo: "paragrafo",
      texto:
        "A janela é de 17 a 22 de agosto de 2026, uma semana fechada de segunda a sábado, e o recorte é a data de publicação do edital. São 13.397 editais, de 6.982 órgãos diferentes. A fonte é o PNCP, que é o repositório oficial das contratações públicas brasileiras. Não é amostra nossa nem estimativa de mercado.",
    },
    {
      tipo: "destaque",
      texto:
        "O que estes números NÃO permitem concluir: quanto o Estado brasileiro gasta, nem o tamanho do mercado em reais. Uma semana não é um ano, edital publicado não é contrato assinado, e valor estimado não é valor homologado. Quem apresentar uma conta dessas a partir de uma semana está inventando, e é bom desconfiar.",
    },
    {
      tipo: "subtitulo",
      texto: "Um dia útil tem 2.700 editais. O sábado tem 37",
    },
    {
      tipo: "paragrafo",
      texto:
        "O primeiro achado é o mais simples e o mais fácil de esquecer: licitação é fenômeno de dia útil, e a queda no fim de semana não é gradual, é um despenhadeiro.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Dia", "Editais publicados"],
      linhas: [
        ["Segunda, 17/08", "2.322"],
        ["Terça, 18/08", "2.892"],
        ["Quarta, 19/08", "2.748"],
        ["Quinta, 20/08", "2.713"],
        ["Sexta, 21/08", "2.685"],
        ["Sábado, 22/08", "37"],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A média de dia útil fica em torno de 2.672 publicações. No sábado seguinte à janela, um domingo, foi publicado um único edital no país inteiro. Para quem organiza a rotina comercial, isso tem uma consequência prática: não existe motivo para conferir portal no fim de semana, e existe um motivo forte para conferir na segunda de manhã, que é quando o acumulado de sexta ainda está em cima da mesa.",
    },
    {
      tipo: "subtitulo",
      texto: "Quase um terço dá menos de oito dias",
    },
    {
      tipo: "paragrafo",
      texto:
        "Entre a publicação e o encerramento das propostas, a mediana da semana foi de 14 dias. Mas a média engana: 3.945 editais (29,4% do total) encerraram em menos de oito dias contados da publicação. Quem confere portal uma vez por semana perde estruturalmente essa fatia, e não perde por falta de capacidade técnica: perde por não ter ficado sabendo a tempo de montar a proposta.",
    },
    {
      tipo: "captura",
      chamada:
        "Se quase um terço dos editais dá menos de oito dias, a diferença entre disputar e não disputar costuma ser a data em que você ficou sabendo. O Licitante Vencedor varre o PNCP nos dias úteis nas 27 unidades da federação e manda por e-mail os editais que combinam com o perfil da sua empresa. Dá para experimentar por 14 dias, sem cartão, no recorte que você escolher.",
    },
    {
      tipo: "subtitulo",
      texto: "Seis em cada dez editais são de prefeitura",
    },
    {
      tipo: "paragrafo",
      texto:
        "A imagem popular da licitação é a do contrato federal grande. O dado desmente: 62,1% das publicações da semana vieram da esfera municipal, contra 21,9% estadual e 11,9% federal. O mercado está espalhado por milhares de prefeituras, não concentrado em Brasília.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Estado", "Editais", "Participação"],
      linhas: [
        ["São Paulo", "2.472", "18,5%"],
        ["Minas Gerais", "1.524", "11,4%"],
        ["Paraná", "1.230", "9,2%"],
        ["Rio Grande do Sul", "1.079", "8,1%"],
        ["Bahia", "1.003", "7,5%"],
        ["Ceará", "769", "5,7%"],
        ["Rio de Janeiro", "760", "5,7%"],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "O ranking esconde uma diferença que muda a estratégia comercial: quantos municípios distintos estão por trás desses editais. Minas Gerais publica menos que São Paulo, mas espalhado por 491 municípios contra 373. É o estado mais pulverizado do país. O Rio de Janeiro é o extremo oposto: 760 editais saindo de apenas 64 municípios. Uma empresa que atua no interior de Minas disputa em um mercado com muito mais compradores distintos, e cada um com o seu jeito de publicar.",
    },
    {
      tipo: "subtitulo",
      texto: "O presencial acabou, e quase ninguém avisou",
    },
    {
      tipo: "paragrafo",
      texto:
        "Pregão eletrônico responde por 57,4% das publicações e concorrência eletrônica por mais 9,0%. Somadas, as modalidades presenciais, pregão e concorrência, não chegam a 1,6%. Na prática, disputar licitação hoje é uma atividade de escritório, e a empresa que ainda organiza a operação em torno de deslocamento está resolvendo um problema que praticamente deixou de existir. Onde cada disputa acontece é outra história, e ela está nos [portais de licitação](/portais-de-licitacao/).",
    },
    {
      tipo: "subtitulo",
      texto: "Metade do mercado vale menos de R$ 200 mil",
    },
    {
      tipo: "tabela",
      cabecalho: ["Faixa de valor estimado", "Editais", "Participação"],
      linhas: [
        ["Até R$ 50 mil", "4.297", "32,1%"],
        ["R$ 50 mil a R$ 200 mil", "2.264", "16,9%"],
        ["R$ 200 mil a R$ 1 milhão", "2.751", "20,5%"],
        ["R$ 1 milhão a R$ 5 milhões", "1.631", "12,2%"],
        ["Acima de R$ 5 milhões", "704", "5,3%"],
        ["Sem valor publicado", "1.750", "13,1%"],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A mediana de valor estimado da semana é R$ 129.603. Metade dos editais com valor publicado está abaixo disso. O primeiro quartil fica em R$ 18.267 e o terceiro em R$ 678.761. Ou seja, o miolo do mercado é composto de contratos pequenos e médios, e não das obras de milhões que aparecem no noticiário.",
    },
    {
      tipo: "paragrafo",
      texto:
        "A diferença entre as modalidades explica boa parte disso. A dispensa, que é 30,2% de tudo que foi publicado, tem mediana de R$ 9.528 e 99% dos casos abaixo de R$ 200 mil. O pregão tem mediana de R$ 314.555. A concorrência, de R$ 806.941. São três mercados diferentes convivendo no mesmo portal, e uma empresa que ignora a dispensa está ignorando quase um terço das oportunidades, que são pequenas, mas têm concorrência menor e processo mais curto. As modalidades e seus limites estão na [Lei 14.133](/lei-14133/).",
    },
    {
      tipo: "destaque",
      texto:
        "13,1% dos editais da semana não publicaram valor estimado. Isso não é falha da coleta: é campo que veio vazio na origem. Para o fornecedor, significa que em um a cada oito casos não dá para filtrar por faixa de valor sem abrir o documento.",
    },
    {
      tipo: "subtitulo",
      texto: "O número que interessa não é 13.397",
    },
    {
      tipo: "paragrafo",
      texto:
        "Chegamos ao ponto que motivou este levantamento. Treze mil editais numa semana parece um oceano de oportunidade, e é exatamente esse número que faz muita empresa desistir antes de começar: ninguém consegue ler treze mil de nada.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Só que 13.397 não é o mercado de ninguém. Em um teste que fizemos com o perfil de uma empresa real de controle de pragas urbanas, sobre 1.169 editais publicados em um único dia, 22 tinham objeto compatível com o que ela vende. Menos de 2%. Todo o resto estava no estado dela, com prazo bom, na modalidade que ela disputa, e não era o negócio dela.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Essa é a forma correta de ler os números deste artigo. O volume nacional serve para dizer que o mercado existe e que ele é diário. O número que decide a sua rotina é outro: quantos, dentro desse volume, são efetivamente do seu ramo, no seu raio de atuação e na sua faixa de valor. Para a maioria das empresas especializadas, esse número cabe numa mão, e é justamente por caber numa mão que dá para tratar cada um deles com seriedade, em vez de garimpar portal.",
    },
    {
      tipo: "subtitulo",
      texto: "O que fazer com isso na prática",
    },
    {
      tipo: "passos",
      itens: [
        "Escreva o que a sua empresa vende em palavras que apareceriam no objeto de um edital. Não em CNAE, e não em jargão interno. É esse vocabulário que separa os seus 2% do resto.",
        "Defina o raio real de atuação, incluindo o custo de deslocamento. Estado inteiro raramente é verdade para PME de serviço.",
        "Não descarte a dispensa por causa do valor: são 30% das publicações, com processo mais curto e concorrência menor.",
        "Trate o prazo como filtro de viabilidade, não como detalhe. Quase um terço dos editais exige decisão em menos de oito dias.",
        "Confira o portal na segunda de manhã, se for conferir manualmente. É quando o acumulado da sexta ainda está disponível.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Quantas licitações são publicadas por dia no Brasil?",
      resposta:
        "Na semana de 17 a 22 de agosto de 2026, um dia útil teve em média cerca de 2.672 editais publicados no PNCP, com 13.397 no total da semana. No sábado foram 37, e no domingo seguinte, apenas 1. O volume é fortemente concentrado em dias úteis.",
    },
    {
      pergunta: "Qual o valor médio de uma licitação?",
      resposta:
        "A mediana do valor estimado na semana medida foi de R$ 129.603, com primeiro quartil em R$ 18.267 e terceiro em R$ 678.761. A mediana varia muito por modalidade: R$ 9.528 na dispensa, R$ 314.555 no pregão e R$ 806.941 na concorrência.",
    },
    {
      pergunta: "A maioria das licitações é federal?",
      resposta:
        "Não. Na semana medida, 62,1% das publicações vieram de órgãos municipais, 21,9% de estaduais e 11,9% de federais. O mercado está distribuído por milhares de prefeituras.",
    },
    {
      pergunta: "Ainda existe licitação presencial?",
      resposta:
        "Quase não. Pregão presencial e concorrência presencial somaram menos de 1,6% das publicações da semana. Mais de 98% do que foi publicado é eletrônico.",
    },
    {
      pergunta: "Quanto tempo eu tenho para responder a um edital?",
      resposta:
        "A mediana entre publicação e encerramento das propostas foi de 14 dias na semana medida. Mas 29,4% dos editais encerraram em menos de oito dias, o que torna a data em que você fica sabendo tão determinante quanto a sua capacidade de executar o objeto.",
    },
    {
      pergunta: "Todo edital informa o valor estimado?",
      resposta:
        "Não. Na semana medida, 13,1% dos editais não trouxeram valor estimado publicado. É campo vazio na origem, e significa que em um a cada oito casos não é possível filtrar por faixa de valor sem abrir o documento.",
    },
  ],
  fontes: [
    {
      titulo: "Portal Nacional de Contratações Públicas (PNCP)",
      url: "https://pncp.gov.br/",
      sustenta:
        "Origem de todos os editais medidos. É o repositório oficial das contratações públicas brasileiras, previsto na Lei 14.133/2021.",
    },
    {
      titulo: "Lei 14.133/2021, a Nova Lei de Licitações e Contratos",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Institui o PNCP como sítio oficial de divulgação centralizada das contratações públicas e define as modalidades citadas neste texto, incluindo a dispensa.",
    },
    {
      titulo: "Portal de Compras do Governo Federal",
      url: "https://www.gov.br/compras/pt-br",
      sustenta:
        "Referência sobre o funcionamento das contratações federais e sobre a migração das modalidades para o formato eletrônico.",
    },
  ],
  publicado: true,
};
