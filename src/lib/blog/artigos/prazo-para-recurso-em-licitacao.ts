import type { Artigo } from "../tipos";

/**
 * O irmão do artigo de impugnação, do outro lado da sessão.
 *
 * POR QUE ESTE TEMA, E NÃO OUTRO: os dois artigos que mais aparecem na busca
 * hoje (Search Console, 30 dias até 19/09) são os dois que respondem a um
 * PRAZO com número: impugnação, com 2.155 impressões, e atraso no pagamento,
 * com 1.621. Juntos valem mais impressão que todo o resto do blog somado. A
 * forma que ranqueia aqui é "direito com prazo cravado na norma", e recurso é
 * o buraco óbvio que faltava nessa forma: o Search Console mostra buscas
 * diretas por "art. 164 da lei nº 14.133/2021" e pelos parágrafos do art. 165
 * caindo em páginas que não tratam do assunto.
 *
 * O ÂNGULO: quase todo conteúdo concorrente responde "3 dias úteis" e para.
 * O prazo que de fato elimina fornecedor não é esse, é a manifestação imediata
 * da intenção de recorrer na sessão, sob pena de preclusão. Quem fecha o
 * pregão sem registrar a intenção no campo próprio do sistema perde o direito
 * antes de o prazo de 3 dias sequer começar a correr. É um erro operacional,
 * não jurídico, e é o que o texto coloca no lugar mais alto.
 *
 * FONTES: o texto dos arts. 165 a 168 foi lido no Planalto e conferido contra
 * o portal Licitações e Contratos do TCU, que os reproduz inciso por inciso; o
 * campo próprio do sistema veio do FAQ oficial do pregão eletrônico em
 * gov.br/compras. Nota operacional para quem vier depois: o WebFetch recebeu
 * 503 do Planalto, como nos artigos de impugnação e de atraso, e um `curl` com
 * user-agent de navegador recebeu 200. O 503 é filtro de cliente, não
 * indisponibilidade, e isso muda o que fazer da próxima vez.

 * A TABELA DOS DOIS REGIMES: a distinção entre o art. 165 (3 dias úteis) e os
 * arts. 166 e 167 (15 dias úteis) tem tabela própria porque é o erro caro do
 * assunto. Quem recebe uma multa e conta 3 dias perde 12 dias de prazo que
 * tinha.
 *
 * O LIMITE: prazo e cabimento são fato verificável na lei. Se vale a pena
 * recorrer no SEU caso, com que fundamento e com que efeito sobre a relação
 * com o órgão, é análise que depende do edital concreto e de advogado.
 */
export const PRAZO_PARA_RECURSO: Artigo = {
  slug: "prazo-para-recurso-em-licitacao",
  tituloDaBusca: "Prazo para recurso em licitação: 3 dias úteis",
  titulo:
    "Prazo para recurso em licitação: 3 dias úteis, e a manifestação que não espera o dia seguinte",
  descricao:
    "O recurso tem 3 dias úteis pela Lei 14.133. Contra julgamento e habilitação, a intenção de recorrer é imediata na sessão, sob pena de preclusão.",
  resumo:
    "A Lei 14.133/2021 dá 3 dias úteis para apresentar as razões de recurso. Só que, contra o julgamento das propostas e contra a habilitação, esse prazo nem começa se a intenção de recorrer não for manifestada imediatamente na sessão pública. Quem fecha o pregão sem registrar a intenção no campo próprio do sistema perde o direito ali, e descobre no dia seguinte. Este texto separa os prazos que a Lei trata como coisas diferentes e diz o que precisa acontecer em cada um.",
  intencao: "operacional",
  termoPrincipal: "prazo para recurso em licitação",
  guiaRelacionado: "/lei-14133/",
  publicadoEm: "2026-09-19",
  verificadoEm: "2026-09-19",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "A sessão acabou, o resultado saiu, e só depois você foi ler com calma a proposta do vencedor. Achou o atestado que não cobre o objeto, a planilha que não fecha, a certidão vencida no dia da abertura. A pergunta que vem em seguida costuma ser sobre prazo: quanto tempo eu tenho para recorrer? A resposta que circula por aí é 3 dias úteis, e ela está certa. O problema é que ela responde a segunda metade da pergunta.",
    },
    {
      tipo: "subtitulo",
      texto: "São dois prazos, e só um deles cabe no dia seguinte",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 165 da [Lei 14.133/2021](/lei-14133/) prevê recurso no prazo de 3 dias úteis, contado da data de intimação ou de lavratura da ata. Esse é o prazo das razões, ou seja, do documento escrito com o argumento e o pedido. Antes dele existe outro, que não se mede em dias e sim em minutos, e é ele que fecha a porta.",
    },
    {
      tipo: "destaque",
      texto:
        "Contra o julgamento das propostas e contra o ato de habilitação ou inabilitação, que são as alíneas \"b\" e \"c\" do art. 165, I, a intenção de recorrer precisa ser manifestada imediatamente, sob pena de preclusão, e a apreciação se dá em fase única. No pregão eletrônico isso acontece em campo próprio do sistema, durante a sessão pública, de forma imediata e motivada, depois de declarado o vencedor. Não é formalidade: sem essa manifestação, os 3 dias úteis não chegam a existir para você.",
    },
    {
      tipo: "captura",
      chamada:
        "Recurso perdido quase nunca é falta de argumento. É a empresa que não estava na sessão no minuto em que o vencedor foi declarado, porque descobriu o edital tarde e entrou correndo. No teste de 14 dias, sem cartão, o resumo manda nos dias úteis os editais abertos do seu recorte, com objeto, órgão, valor e prazo, para você chegar à sessão com tempo de ler a proposta dos outros.",
    },
    {
      tipo: "subtitulo",
      texto: "Contra o que cabe recurso, e o que cada ato exige",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 165, I, lista os atos recorríveis. A coluna da direita é a que muda o seu dia: em dois deles a apreciação se dá em fase única, o que torna a manifestação imediata condição de sobrevivência do direito.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Ato recorrível (art. 165, I)", "Prazo das razões", "Exige manifestação imediata?"],
      linhas: [
        ["Julgamento das propostas", "3 dias úteis", "Sim, sob pena de preclusão"],
        ["Habilitação ou inabilitação de licitante", "3 dias úteis", "Sim, sob pena de preclusão"],
        [
          "Pré-qualificação ou inscrição em registro cadastral, sua alteração ou cancelamento",
          "3 dias úteis",
          "Não",
        ],
        ["Anulação ou revogação da licitação", "3 dias úteis", "Não"],
        ["Extinção do contrato por ato unilateral", "3 dias úteis", "Não"],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "O §1º, I, também diz de onde o prazo das razões começa a correr nesses dois casos, e o detalhe importa em edital com inversão de fases: da data de intimação ou de lavratura da ata de habilitação ou inabilitação ou, quando adotada a inversão prevista no §1º do art. 17, da ata de julgamento. Contar do dia da sessão por hábito, sem olhar qual ata foi lavrada, é um jeito comum de perder o prazo inteiro.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Para os atos que não têm recurso hierárquico previsto, o inciso II do mesmo artigo abre o pedido de reconsideração, também em 3 dias úteis. O nome muda, o relógio é o mesmo.",
    },
    {
      tipo: "subtitulo",
      texto: "Contrarrazões, reconsideração e quanto tempo a decisão demora",
    },
    {
      tipo: "paragrafo",
      texto:
        "Apresentado o recurso, os demais licitantes são intimados para apresentar contrarrazões em prazo igual ao do recurso, contado da intimação pessoal ou da divulgação da interposição. Se você venceu e alguém recorreu, esse prazo é seu, e perdê-lo é entregar a discussão sem resposta.",
    },
    {
      tipo: "paragrafo",
      texto:
        "O recurso é dirigido à autoridade que praticou o ato. Ela tem 3 dias úteis para reconsiderar. Se não reconsiderar, encaminha o recurso com a própria motivação à autoridade superior, que deve decidir em até 10 dias úteis contados do recebimento dos autos. Enquanto isso não acontece, vale o art. 168: recurso e pedido de reconsideração têm efeito suspensivo do ato recorrido até que sobrevenha a decisão final. O acolhimento invalida apenas o ato insuscetível de aproveitamento, e não a licitação inteira por padrão.",
    },
    {
      tipo: "destaque",
      texto:
        "Dois direitos que costumam passar despercebidos: é assegurada ao licitante vista dos elementos indispensáveis à defesa dos seus interesses, e o prazo de contrarrazões só começa depois de encerrado o prazo do recorrente. Pedir vista da proposta e da documentação do concorrente antes de escrever as razões é o que transforma suspeita em argumento.",
    },
    {
      tipo: "subtitulo",
      texto: "Recurso contra sanção tem prazo maior, e não são 3 dias",
    },
    {
      tipo: "paragrafo",
      texto:
        "Confundir os dois regimes custa o prazo inteiro. Quando o que se discute é a punição aplicada à empresa, e não o resultado do certame, os artigos 166 e 167 valem no lugar do 165.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Situação", "O que cabe", "Prazo", "Prazo da decisão"],
      linhas: [
        [
          "Advertência, multa e impedimento de licitar e contratar",
          "Recurso (art. 166)",
          "15 dias úteis da intimação",
          "5 dias úteis para a autoridade acolher ou encaminhar, e até 20 dias úteis para a superior decidir",
        ],
        [
          "Declaração de inidoneidade para licitar ou contratar",
          "Pedido de reconsideração (art. 167)",
          "15 dias úteis da intimação",
          "Até 20 dias úteis",
        ],
        [
          "Julgamento, habilitação, anulação, revogação, extinção unilateral",
          "Recurso (art. 165, I)",
          "3 dias úteis",
          "3 dias úteis para reconsiderar, e até 10 dias úteis para a autoridade superior",
        ],
      ],
    },
    {
      tipo: "subtitulo",
      texto: "O que fazer na sessão, em ordem",
    },
    {
      tipo: "passos",
      itens: [
        "Fique na sessão até o fim. O momento em que o vencedor é declarado é o único em que a intenção de recorrer pode ser registrada, e ele não avisa com antecedência.",
        "Registre a intenção no campo próprio do sistema, de forma imediata e motivada. Motivada aqui significa dizer contra o que e por quê, em uma ou duas frases. Não é a hora do argumento completo, é a hora de não perder o direito de escrevê-lo.",
        "Peça vista dos elementos indispensáveis à defesa: proposta, planilha e documentação de habilitação do concorrente. É o que sustenta a razão que você vai apresentar.",
        "Escreva as razões dentro dos 3 dias úteis, contados da intimação ou da lavratura da ata. Aponte o dispositivo do edital ou da Lei que foi descumprido e diga qual ato deve ser invalidado.",
        "Se você é o vencedor e alguém recorreu, conte o seu prazo de contrarrazões a partir do fim do prazo do recorrente, e responda. Silêncio não é neutro nesse processo.",
        "Antes de tudo isso, confira se o problema estava no edital e não no julgamento. Vício de edital se ataca por impugnação, e o [prazo para impugnar é outro](/blog/prazo-para-impugnar-edital-de-licitacao/), bem antes da sessão.",
      ],
    },
    {
      tipo: "destaque",
      texto:
        "Este texto descreve prazos e hipóteses de cabimento previstos na Lei nº 14.133/2021. Se vale a pena recorrer no seu caso, com que fundamento, e qual o efeito disso sobre a relação com o órgão e sobre contratos em andamento, é análise que depende do edital concreto e do seu advogado. O prazo é fato; a estratégia é trabalho jurídico.",
    },
  ],
  faq: [
    {
      pergunta: "Qual o prazo para recorrer de uma licitação pela Lei 14.133?",
      resposta:
        "São 3 dias úteis para apresentar as razões, contados da data de intimação ou de lavratura da ata, conforme o art. 165, I. Contra o julgamento das propostas e contra a habilitação ou inabilitação, esse prazo só se abre se a intenção de recorrer tiver sido manifestada imediatamente na sessão, sob pena de preclusão.",
    },
    {
      pergunta: "Perdi o momento de manifestar a intenção de recorrer. Ainda dá para recorrer?",
      resposta:
        "Contra o julgamento das propostas e contra a habilitação, não. A Lei condiciona o prazo de razões à manifestação imediata e trata a ausência dela como preclusão. Para os demais atos do art. 165, I, como anulação, revogação e extinção unilateral do contrato, a manifestação imediata não é exigida e o prazo de 3 dias úteis corre da intimação.",
    },
    {
      pergunta: "Quanto tempo o órgão tem para decidir o meu recurso?",
      resposta:
        "A autoridade que praticou o ato tem 3 dias úteis para reconsiderar. Se não reconsiderar, encaminha o recurso com a própria motivação à autoridade superior, que deve decidir em até 10 dias úteis contados do recebimento dos autos. Em recurso contra sanção de advertência, multa ou impedimento, os prazos são de 5 e de até 20 dias úteis.",
    },
    {
      pergunta: "O recurso suspende a licitação?",
      resposta:
        "Pelo art. 168, o recurso e o pedido de reconsideração têm efeito suspensivo do ato ou da decisão recorrida até que sobrevenha a decisão final da autoridade competente. E o acolhimento do recurso implica invalidação apenas do ato que não puder ser aproveitado, não necessariamente de todo o certame.",
    },
    {
      pergunta: "Recurso contra multa ou impedimento tem o mesmo prazo de 3 dias?",
      resposta:
        "Não. Contra advertência, multa e impedimento de licitar e contratar, o art. 166 dá 15 dias úteis contados da intimação. Contra a declaração de inidoneidade cabe pedido de reconsideração, também em 15 dias úteis, decidido em até 20 dias úteis, conforme o art. 167.",
    },
    {
      pergunta: "Qual a diferença entre impugnar o edital e recorrer do resultado?",
      resposta:
        "A impugnação ataca o edital antes da abertura, quando o problema está na regra. O recurso ataca um ato praticado no curso do certame, como o julgamento das propostas ou a habilitação de um concorrente. São prazos e momentos diferentes, e usar um no lugar do outro costuma terminar em não conhecimento do pedido.",
    },
  ],
  fontes: [
    {
      titulo: "TCU, Licitações e Contratos: recurso e pedido de reconsideração",
      url: "https://licitacoesecontratos.tcu.gov.br/5-6-recurso-e-pedido-de-reconsideracao/",
      sustenta:
        "Reprodução dos arts. 165, 166, 167 e 168 da Lei nº 14.133/2021: prazo de 3 dias úteis para recurso e pedido de reconsideração, rol de atos recorríveis, manifestação imediata da intenção sob pena de preclusão, fase única de apreciação, prazo de contrarrazões, prazos de 3 e 10 dias úteis das autoridades, prazos de 15 e 20 dias úteis em matéria de sanção e efeito suspensivo.",
    },
    {
      titulo: "Portal de Compras do Governo Federal: perguntas frequentes do pregão eletrônico",
      url: "https://www.gov.br/compras/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes/pregao-eletronico",
      sustenta:
        "Declarado o vencedor, qualquer licitante pode, durante a sessão pública, de forma imediata e motivada, em campo próprio do sistema, manifestar a intenção de recorrer; aceita a intenção, abre-se o prazo para as razões, e os demais licitantes ficam intimados a apresentar contrarrazões em igual prazo, iniciado ao término do prazo do recorrente.",
    },
    {
      titulo: "Lei nº 14.133, de 1º de abril de 2021 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Texto dos arts. 165 a 168: o rol das alíneas \"a\" a \"e\" do inciso I, o pedido de reconsideração do inciso II, o §1º que restringe a manifestação imediata às alíneas \"b\" e \"c\" e fixa o início do prazo das razões, os §§ 2º a 5º, e os prazos de 15 e 20 dias úteis dos arts. 166 e 167 em matéria de sanção.",
    },
    {
      titulo: "Portal Nacional de Contratações Públicas",
      url: "https://www.pncp.gov.br/",
      sustenta:
        "Fonte oficial de divulgação dos editais e das atas de sessão a partir das quais os prazos de recurso são contados.",
    },
  ],
  publicado: true,
};
