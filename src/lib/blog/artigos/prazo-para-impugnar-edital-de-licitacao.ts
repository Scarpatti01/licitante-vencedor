import type { Artigo } from "../tipos";

/**
 * Artigo operacional do hub da Lei 14.133 — o primeiro dele.
 *
 * Escolhido por um motivo que não é volume de busca: o prazo do art. 164 corre
 * PARA TRÁS, a partir da abertura do certame. Quem encontra o edital dois dias
 * antes da sessão já perdeu o direito de impugnar sem ter feito nada errado —
 * só chegou tarde. É a dor que o produto resolve, dita pela própria norma, sem
 * precisar de nenhuma promessa sobre desfecho.
 *
 * O risco deste texto é virar consultoria jurídica, que é justamente o que o
 * `posicionamento-e-limites.md` proíbe. A linha adotada: prazos e ritos são
 * fato verificável na lei e estão aqui; se cabe impugnar o SEU caso, e com que
 * fundamento, é análise que depende do edital e de advogado. O texto diz isso
 * com essas palavras, em vez de insinuar o contrário pelo silêncio.
 *
 * Conferido contra o portal Licitações e Contratos do TCU, que reproduz o texto
 * legal — o Planalto respondeu 503 nas tentativas de verificação, e citar sem
 * ler não é uma opção neste repositório.
 */
export const PRAZO_PARA_IMPUGNAR_EDITAL: Artigo = {
  slug: "prazo-para-impugnar-edital-de-licitacao",
  titulo: "Prazo para impugnar edital de licitação: 3 dias úteis, contados para trás",
  descricao:
    "O prazo do art. 164 da Lei 14.133 corre a partir da abertura do certame, não da publicação. Como contar, o que difere de esclarecimento e de recurso.",
  resumo:
    "Qualquer pessoa pode impugnar um edital ou pedir esclarecimento, mas o pedido precisa ser protocolado até 3 dias úteis antes da abertura do certame — um prazo que corre de trás para frente. Quem acha o edital na véspera não perde por mérito: perde por calendário. Impugnação, esclarecimento e recurso são três coisas distintas, com momentos e efeitos diferentes.",
  intencao: "operacional",
  termoPrincipal: "prazo para impugnar edital",
  guiaRelacionado: "/lei-14133/",
  publicadoEm: "2026-08-14",
  verificadoEm: "2026-08-14",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "Quase todo prazo com que uma empresa lida corre para frente: você recebe uma notificação e conta os dias a partir dali. O prazo para impugnar edital de licitação funciona ao contrário, e é essa inversão que faz muita gente perdê-lo sem perceber. Ele não conta da publicação do edital — conta da data de abertura do certame, para trás.",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 164 da [Lei nº 14.133/2021](/lei-14133/) diz que qualquer pessoa é parte legítima para impugnar edital por irregularidade na aplicação da Lei, ou para solicitar esclarecimento sobre seus termos, devendo protocolar o pedido até 3 (três) dias úteis antes da data de abertura do certame. Repare em duas coisas. “Qualquer pessoa”: não é preciso já estar cadastrado, nem ter comprado edital, nem ser o prejudicado direto. E “antes da abertura”: passada essa marca, aquela porta fechou — o que sobra são outros instrumentos, com outro alcance.",
    },
    {
      tipo: "destaque",
      texto:
        "Três dias úteis não são três dias. Numa sessão marcada para uma terça-feira, o último dia para protocolar é a quarta-feira anterior. Se houver feriado no meio, é a terça. Encontrar o edital na sexta é encontrar tarde demais — e nada no edital avisa isso.",
    },
    {
      tipo: "paragrafo",
      texto:
        "É aqui que o problema deixa de ser jurídico e vira operacional. Uma exigência restritiva num edital normalmente não é descoberta lendo o aviso: ela aparece no meio do termo de referência ou num anexo, quando alguém senta para montar a proposta. E sentar para montar a proposta é o que uma PME faz depois de decidir que vale a pena participar — decisão que costuma acontecer poucos dias antes da sessão, porque antes disso o edital nem tinha sido notado.",
    },
    {
      tipo: "captura",
      chamada:
        "O Licitante Vencedor existe para encurtar essa distância: todo dia útil ele lê os editais publicados, compara com o perfil da sua empresa e manda os que fazem sentido, com o prazo em destaque e o que o edital exige já separado. Descobrir a exigência estranha no dia da publicação, e não na véspera da sessão, é o que mantém a impugnação como uma opção sua em vez de uma opção vencida. Quem decide se impugna, e com que fundamento, continua sendo você — o edital sempre prevalece.",
    },
    {
      tipo: "subtitulo",
      texto: "Impugnação, esclarecimento e recurso não são a mesma coisa",
    },
    {
      tipo: "paragrafo",
      texto:
        "Os três aparecem misturados em conversa de corredor e são instrumentos diferentes, com momentos e finalidades próprias. Confundi-los custa caro: usar o nome errado no protocolo pode fazer o pedido ser recebido como outra coisa, e o instrumento certo já ter vencido quando alguém perceber.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Instrumento", "Serve para", "Quando", "Base"],
      linhas: [
        [
          "Pedido de esclarecimento",
          "Entender um termo ambíguo do edital, sem alegar irregularidade",
          "Até 3 dias úteis antes da abertura",
          "Art. 164",
        ],
        [
          "Impugnação",
          "Apontar irregularidade na aplicação da Lei e pedir correção do edital",
          "Até 3 dias úteis antes da abertura",
          "Art. 164",
        ],
        [
          "Recurso",
          "Atacar uma decisão já tomada — habilitação, julgamento, anulação, revogação",
          "Depois da decisão, com intenção manifestada na hora",
          "Art. 165",
        ],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A Administração tem até 3 dias úteis para responder à impugnação ou ao esclarecimento, limitado ao último dia útil anterior à data da abertura do certame. Ou seja: a resposta precisa chegar antes da sessão, não durante nem depois. Esse limite é o que impede que o pedido seja respondido quando já não adianta.",
    },
    {
      tipo: "subtitulo",
      texto: "Como protocolar, na prática",
    },
    {
      tipo: "passos",
      itens: [
        "Confirme a data e a hora de abertura no próprio edital e no aviso publicado — é dela que o prazo é contado para trás. Os [portais de licitação](/portais-de-licitacao/) trazem essa data no aviso, mas o edital é que prevalece.",
        "Conte 3 dias úteis retroativos, excluindo o dia da abertura e pulando feriados do ente que licita, que nem sempre coincidem com os da sua cidade.",
        "Localize no edital o meio de protocolo. A própria Lei manda o edital informar como impugnar e pedir esclarecimento, inclusive por meio eletrônico.",
        "Escreva apontando o dispositivo do edital e por que ele contraria a Lei, com o pedido claro ao final: correção, supressão ou republicação.",
        "Guarde o comprovante com data e hora. Sem ele, discutir tempestividade depois é discutir sem prova.",
        "Acompanhe a resposta e verifique se o edital foi alterado — alteração que afete a formulação das propostas obriga a nova divulgação e reabertura do prazo.",
      ],
    },
    {
      tipo: "subtitulo",
      texto: "E se o prazo já passou?",
    },
    {
      tipo: "paragrafo",
      texto:
        "Perder o prazo do art. 164 não encerra tudo, mas muda o terreno. A fase recursal do art. 165 cabe contra decisões — ato que defira ou indefira pré-qualificação ou inscrição em registro cadastral, julgamento das propostas, ato de [habilitação](/habilitacao/) ou inabilitação, anulação ou revogação da licitação, e extinção contratual por ato unilateral. Nos casos de julgamento das propostas e de habilitação ou inabilitação, a intenção de recorrer precisa ser manifestada imediatamente, sob pena de preclusão: quem fica calado na sessão não recorre depois.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Manifestada a intenção, o prazo para as razões é de 3 dias úteis, contado da intimação ou da lavratura da ata. Os demais licitantes podem apresentar contrarrazões em 3 dias úteis. A autoridade que proferiu a decisão tem 3 dias úteis para reconsiderar ou encaminhar o recurso, e a autoridade superior decide em até 10 dias úteis contados do recebimento dos autos.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Vale também lembrar do óbvio que costuma ser esquecido: irregularidade em edital pode ser levada ao controle externo e ao Ministério Público a qualquer tempo, e isso independe de prazo processual. O que se perde com o vencimento do art. 164 é a via rápida de corrigir o edital antes da sessão — que é justamente a que resolve o problema a tempo de você participar.",
    },
    {
      tipo: "destaque",
      texto:
        "Este texto descreve prazos e ritos previstos na Lei nº 14.133/2021. Se cabe impugnar o seu caso, com que fundamento e com que redação, é análise que depende do edital concreto e do seu advogado. Prazo é fato; tese é trabalho jurídico.",
    },
  ],
  faq: [
    {
      pergunta: "Qual o prazo para impugnar um edital de licitação?",
      resposta:
        "Até 3 dias úteis antes da data de abertura do certame, conforme o art. 164 da Lei nº 14.133/2021. O prazo é contado retroativamente a partir da abertura, e não da publicação do edital.",
    },
    {
      pergunta: "Preciso estar cadastrado ou ser licitante para impugnar?",
      resposta:
        "Não. O art. 164 diz que qualquer pessoa é parte legítima para impugnar o edital por irregularidade na aplicação da Lei ou para pedir esclarecimento sobre seus termos.",
    },
    {
      pergunta: "Em quanto tempo a Administração precisa responder?",
      resposta:
        "Em até 3 dias úteis, limitado ao último dia útil anterior à data da abertura do certame. A resposta tem de sair antes da sessão.",
    },
    {
      pergunta: "Qual a diferença entre impugnação e pedido de esclarecimento?",
      resposta:
        "A impugnação aponta irregularidade na aplicação da Lei e pede correção do edital. O pedido de esclarecimento apenas busca elucidar um termo ambíguo, sem alegar ilegalidade. Os dois têm o mesmo prazo do art. 164.",
    },
    {
      pergunta: "Perdi o prazo de impugnação. Ainda posso fazer alguma coisa?",
      resposta:
        "A via do art. 164 fecha, mas decisões tomadas no certame podem ser atacadas por recurso na forma do art. 165 — com intenção manifestada imediatamente nos casos de julgamento das propostas e de habilitação ou inabilitação, sob pena de preclusão. Representação a órgão de controle não depende desse prazo.",
    },
    {
      pergunta: "Se o edital for alterado depois da impugnação, o prazo da proposta recomeça?",
      resposta:
        "Quando a alteração afeta a formulação das propostas, o edital precisa ser divulgado novamente e o prazo inicial é reaberto. Alteração que não afeta a formulação das propostas não obriga à reabertura.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, art. 164 — Planalto",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Legitimidade de qualquer pessoa para impugnar o edital ou pedir esclarecimento e prazo de até 3 dias úteis antes da abertura do certame; dever da Administração de responder em até 3 dias úteis, limitado ao último dia útil anterior à abertura.",
    },
    {
      titulo: "Lei nº 14.133/2021, art. 165 — Planalto",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Hipóteses de recurso; manifestação imediata da intenção de recorrer sob pena de preclusão no julgamento das propostas e na habilitação ou inabilitação; prazos de 3 dias úteis para razões e contrarrazões, 3 dias úteis para juízo de reconsideração e 10 dias úteis para a decisão da autoridade superior.",
    },
    {
      titulo: "TCU — Licitações e Contratos: impugnação e pedidos de esclarecimento",
      url: "https://licitacoesecontratos.tcu.gov.br/5-1-1-impugnacao-e-pedidos-de-esclarecimento/",
      sustenta:
        "Reprodução do art. 164 e da regra de contagem em dias úteis de expediente administrativo, com exclusão do dia inicial e inclusão do dia do vencimento. É a fonte contra a qual este texto foi conferido.",
    },
    {
      titulo: "TCU — Licitações e Contratos: recurso e pedido de reconsideração",
      url: "https://licitacoesecontratos.tcu.gov.br/5-6-recurso-e-pedido-de-reconsideracao/",
      sustenta:
        "Reprodução das hipóteses e dos prazos recursais do art. 165, incluindo a preclusão pela não manifestação imediata da intenção de recorrer.",
    },
    {
      titulo: "Portal Nacional de Contratações Públicas",
      url: "https://www.pncp.gov.br/",
      sustenta:
        "Fonte oficial de divulgação dos avisos de contratação e do inteiro teor de editais e anexos, onde a data de abertura do certame é verificada.",
    },
  ],
  publicado: true,
};
