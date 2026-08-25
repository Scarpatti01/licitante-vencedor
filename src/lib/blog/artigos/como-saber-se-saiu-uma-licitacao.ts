import type { Artigo } from "../tipos";

/**
 * Artigo operacional do hub de portais.
 *
 * A tese que sustenta o texto é a distinção do art. 174 entre divulgação
 * (obrigatória e centralizada no PNCP) e realização (facultativa) — é ela que
 * explica por que "olhar um portal só" não descobre tudo, e é fato já conferido
 * no texto oficial ao escrever `/portais-de-licitacao/`.
 */
export const COMO_SABER_SE_SAIU_UMA_LICITACAO: Artigo = {
  slug: "como-saber-se-saiu-uma-licitacao",
  titulo: "Como saber se saiu uma licitação do seu ramo",
  descricao:
    "PNCP, portais estaduais e Diário Oficial: os caminhos reais para descobrir que saiu um edital do seu ramo, o que cada um cobre e quanto custa em tempo.",
  resumo:
    "Todo edital regido pela Lei 14.133 tem que ser divulgado no PNCP. É lá que a busca começa, e é o único lugar com o inteiro teor. Mas a divulgação centralizada não elimina os portais próprios nem o Diário Oficial, e é essa diferença que faz quem olha um site só perder certame do próprio ramo.",
  intencao: "operacional",
  termoPrincipal: "como saber se saiu uma licitação",
  guiaRelacionado: "/portais-de-licitacao/",
  publicadoEm: "2026-08-14",
  verificadoEm: "2026-08-14",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "A pergunta chega quase sempre depois do prejuízo: a empresa descobre, por conversa de corredor ou por um cliente, que a prefeitura vizinha comprou exatamente o que ela vende, e a sessão foi na semana passada. Não faltou capacidade nem preço. Faltou ficar sabendo.",
    },
    {
      tipo: "paragrafo",
      texto:
        "A boa notícia é que a informação é pública e obrigatória. A má é que ela é publicada num lugar e disputada em outro, e essa separação está escrita na lei. Não é desorganização de ninguém.",
    },
    {
      tipo: "subtitulo",
      texto: "A regra que explica por que um portal só não basta",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 174 da Lei 14.133/2021 criou o Portal Nacional de Contratações Públicas com duas finalidades, e o contraste entre elas é tudo: o inciso I fala em divulgação centralizada e **obrigatória** dos atos exigidos pela lei; o inciso II, em realização **facultativa** das contratações pelos órgãos e entidades de todos os entes federativos.",
    },
    {
      tipo: "destaque",
      texto:
        "Divulgar no PNCP é obrigação. Disputar no PNCP é opção. Por isso o aviso aparece num endereço só e a sessão acontece espalhada em dezenas de sistemas diferentes.",
    },
    {
      tipo: "paragrafo",
      texto:
        "A publicidade do edital tem regra própria e reforça a mesma lógica. Pelo art. 54, a publicidade se dá pela divulgação e manutenção do inteiro teor do ato convocatório e de seus anexos no PNCP; o § 1º acrescenta que, sem prejuízo disso, é obrigatória a publicação de extrato do edital no Diário Oficial do ente e em jornal diário de grande circulação. Repare na diferença de conteúdo: no PNCP vai o inteiro teor, no Diário Oficial vai o extrato. Quem acompanha licitação por Diário Oficial está lendo resumo, e resumo não tem termo de referência, planilha nem exigência de habilitação.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Na prática isso significa que descobrir o edital e disputar o edital são duas tarefas separadas, com ferramentas diferentes. E a primeira, feita à mão, consome uma hora por dia de alguém que não tem uma hora por dia sobrando: abrir o PNCP, repetir a busca por três ou quatro palavras, abrir o portal do estado, abrir o site de duas prefeituras, conferir o Diário Oficial, e ainda assim depender de o objeto ter sido descrito com a mesma palavra que você digitou. É um trabalho que não termina, não escala e falha justamente na semana em que a empresa está ocupada entregando.",
    },
    {
      tipo: "captura",
      chamada:
        "Se o seu problema é ficar sabendo tarde, dá para resolver a parte mais penosa sem cartão: são 14 dias de teste. O serviço varre o PNCP nos dias úteis e manda por e-mail os editais abertos do recorte que você escolher, com a data da sessão e o prazo que ainda resta. A decisão de disputar continua sendo sua, e o edital sempre prevalece.",
    },
    {
      tipo: "subtitulo",
      texto: "Os quatro caminhos, e o que cada um custa",
    },
    {
      tipo: "tabela",
      cabecalho: ["Caminho", "O que ele cobre bem", "Onde ele falha", "Custo em tempo"],
      linhas: [
        [
          "PNCP",
          "Existência oficial do certame e inteiro teor do edital e anexos",
          "Não ordena por relevância: entrega tudo o que foi publicado, sem filtrar pelo seu perfil",
          "Minutos por busca, mas várias buscas por dia para cobrir o vocabulário do seu ramo",
        ],
        [
          "Portal onde a disputa acontece",
          "Avisos e andamento dos certames daquele sistema, com cadastro e lance",
          "Cobre só os órgãos que usam aquele sistema, e há dezenas de sistemas no país",
          "Um login e uma rotina de conferência por portal",
        ],
        [
          "Diário Oficial do ente",
          "Confirmação formal da publicação e das alterações",
          "Traz extrato, não o inteiro teor; a leitura diária é lenta e sem filtro por objeto",
          "Alto para o retorno: é o canal mais trabalhoso de acompanhar à mão",
        ],
        [
          "Site do órgão comprador",
          "Órgãos específicos que você já atende ou quer atender",
          "Não serve para descobrir comprador novo, só para vigiar quem você já conhece",
          "Baixo por órgão, insustentável quando são quinze municípios",
        ],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A leitura correta dessa tabela não é escolher um caminho. É entender que o PNCP resolve o problema de saber que o certame existe, e os demais resolvem o problema de participar dele. Como localizar o sistema em que cada disputa corre está detalhado no guia de [portais de licitação](/portais-de-licitacao/), com a ordem de checagem que resolve a maioria dos casos.",
    },
    {
      tipo: "subtitulo",
      texto: "O buraco que quase ninguém conhece: municípios pequenos",
    },
    {
      tipo: "paragrafo",
      texto:
        "Existe uma exceção prevista na própria lei, e ela é decisiva para quem vende no interior. O art. 176 deu aos municípios com até 20 mil habitantes o prazo de seis anos, contado da publicação da lei, para cumprir as regras de divulgação em sítio eletrônico oficial, entre outros requisitos. E o parágrafo único diz o que fazer nesse meio-tempo: enquanto não adotarem o PNCP, esses municípios devem publicar em diário oficial as informações que a lei manda divulgar em sítio eletrônico, admitida a publicação de extrato, e disponibilizar a versão física dos documentos nas repartições, sem cobrança além do custo de reprodução.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Traduzindo para a sua rotina: se o seu mercado são cidades pequenas, monitorar apenas o PNCP pode deixar de fora exatamente os compradores mais acessíveis para uma PME. Para esses, o diário oficial do município e o contato direto com o setor de compras continuam valendo. Vale checar caso a caso se aquela prefeitura já publica no PNCP. Muitas já publicam, mesmo dentro do prazo de transição.",
    },
    {
      tipo: "subtitulo",
      texto: "Por que a busca por palavra-chave engana",
    },
    {
      tipo: "paragrafo",
      texto:
        "Este é o erro mais caro de quem faz o acompanhamento à mão, e não tem nada a ver com a lei. O objeto do edital é escrito pelo servidor que redigiu o termo de referência, com o vocabulário dele. Quem procura por “merenda escolar” não encontra “aquisição de gêneros alimentícios para a alimentação escolar”. Quem procura por “uniforme” não encontra “confecção de vestuário profissional”. Quem vende manutenção predial não encontra “serviços de conservação e pequenos reparos em prédios públicos”.",
    },
    {
      tipo: "paragrafo",
      texto:
        "A saída manual é montar uma lista de sinônimos do seu ramo, os termos técnicos, os genéricos, os do catálogo de materiais e serviços, e repetir todos eles, todo dia, em cada fonte. Funciona. É só caro em atenção humana, e é a primeira coisa que a empresa deixa de fazer quando a semana aperta.",
    },
    {
      tipo: "subtitulo",
      texto: "Quanto tempo você tem depois que o edital sai",
    },
    {
      tipo: "paragrafo",
      texto:
        "Descobrir cedo importa porque o relógio é curto e ele conta em dias úteis. O art. 55 fixa os prazos mínimos para apresentação de propostas e lances, contados da data de divulgação do edital:",
    },
    {
      tipo: "tabela",
      cabecalho: ["Objeto e critério de julgamento", "Prazo mínimo"],
      linhas: [
        ["Bens, por menor preço ou maior desconto", "8 dias úteis"],
        ["Bens, nas demais hipóteses", "15 dias úteis"],
        [
          "Serviços comuns e obras e serviços comuns de engenharia, por menor preço ou maior desconto",
          "10 dias úteis",
        ],
        [
          "Serviços especiais e obras e serviços especiais de engenharia, por menor preço ou maior desconto",
          "25 dias úteis",
        ],
        ["Contratação integrada", "60 dias úteis"],
        ["Contratação semi-integrada e demais hipóteses de serviços e obras", "35 dias úteis"],
        ["Maior lance", "15 dias úteis"],
        ["Técnica e preço, melhor técnica ou conteúdo artístico", "35 dias úteis"],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Oito dias úteis é o piso mais comum para quem vende produto, e é menos do que parece. Dentro deles cabem: ler o edital inteiro com anexos, conferir a habilitação exigida, emitir certidão que esteja vencida, fazer o cadastro no portal em que a sessão vai correr e formar preço. Descobrir o edital no quinto dia útil não deixa margem para nenhum imprevisto. É por isso que a diferença entre saber no dia da publicação e saber na véspera raramente é uma diferença de esforço. É uma diferença de resultado.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Duas observações que evitam susto. O § 1º do art. 55 determina que modificações no edital impliquem nova divulgação na mesma forma da inicial, com o cumprimento dos mesmos prazos, exceto quando a alteração não comprometer a formulação das propostas. Ou seja, edital alterado costuma reabrir prazo, mas não conte com isso sem conferir. E, pelo art. 164, o pedido de esclarecimento e a impugnação têm que ser protocolados até três dias úteis antes da abertura do certame: se você achou o edital tarde, essa porta pode já estar fechada.",
    },
    {
      tipo: "subtitulo",
      texto: "Uma rotina que funciona sem virar emprego",
    },
    {
      tipo: "passos",
      itens: [
        "Escreva a lista de termos do seu ramo: o nome técnico, o nome popular, o nome de catálogo e os dois ou três jeitos errados de escrever. Essa lista é o seu ativo de busca.",
        "Defina o raio geográfico real de atendimento, em municípios, e não em estados. É ele que decide o que você consegue entregar sem estourar o custo de frete e deslocamento.",
        "Comece pelo PNCP todo dia, no mesmo horário, buscando por objeto e por município. É a única fonte com o inteiro teor.",
        "Para cada edital de interesse, localize no próprio registro o link do sistema de origem e confira se você já tem cadastro nele. Cadastro novo leva dias, e o prazo da proposta corre junto.",
        "Complemente com o diário oficial dos municípios pequenos do seu raio, que podem ainda não publicar no PNCP.",
        "Registre o que você descartou e por quê. Em dois meses esse registro mostra qual filtro está te fazendo perder edital bom, e qual está te salvando de edital ruim.",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Quando essa rotina passa de meia hora por dia, ela deixa de ser barata. Aí a pergunta muda de “como eu acompanho tudo isso” para “o que eu faço com o que encontrei”, e a resposta começa em [como vender para o governo](/vender-para-o-governo/), com o cadastro e a escolha do que disputar, e passa por [habilitação](/habilitacao/), que é onde a maior parte das empresas perde contrato que já tinha ganhado no preço.",
    },
  ],
  faq: [
    {
      pergunta: "Existe um site único onde todas as licitações aparecem?",
      resposta:
        "Para os certames regidos pela Lei 14.133, o PNCP é o ponto obrigatório de divulgação: o art. 174, I, fala em divulgação centralizada e obrigatória dos atos exigidos pela lei. Mas ele não é o site único de disputa: o inciso II prevê a realização das contratações nele como faculdade, e a maioria dos órgãos conduz a sessão no sistema que já usa. Há ainda a transição do art. 176 para municípios com até 20 mil habitantes.",
    },
    {
      pergunta: "Preciso pagar para ver os editais?",
      resposta:
        "Não para consultar. O PNCP é público e o inteiro teor do edital e dos anexos fica lá, por força do art. 54. O que pode ter custo é a plataforma privada em que a disputa acontece, conforme as condições daquele portal, e ferramentas de monitoramento que fazem a triagem por você. Consultar a fonte oficial é sempre gratuito.",
    },
    {
      pergunta: "Dá para receber aviso por e-mail quando sair edital do meu ramo?",
      resposta:
        "Dá, e é o formato que mais funciona para PME, porque inverte o esforço: em vez de você ir buscar, o edital compatível chega. O que muda entre as opções é a qualidade do filtro. Busca só por palavra-chave perde objeto descrito com outro vocabulário. Nenhum aviso substitui a leitura do edital antes de propor.",
    },
    {
      pergunta: "O Diário Oficial serve para acompanhar licitação?",
      resposta:
        "Serve como confirmação, não como fonte de trabalho. O § 1º do art. 54 obriga a publicação de extrato do edital no Diário Oficial do ente e em jornal diário de grande circulação, enquanto o inteiro teor fica no PNCP. Quem lê só o extrato não vê termo de referência, planilha nem exigências de habilitação, que é justamente onde se decide se vale disputar.",
    },
    {
      pergunta: "Achei o edital no PNCP, mas não sei onde é a sessão. O que faço?",
      resposta:
        "Procure primeiro o link para o sistema de origem no próprio registro do PNCP. Não havendo, o edital indica o endereço da sessão em cláusula específica, normalmente junto de data e hora. Em último caso, cabe pedido de esclarecimento ao órgão, que, pelo art. 164, precisa ser protocolado até três dias úteis antes da abertura.",
    },
    {
      pergunta: "Quanto tempo tenho entre a publicação e a sessão?",
      resposta:
        "Depende do objeto e do critério de julgamento. O art. 55 fixa mínimos em dias úteis: 8 para bens por menor preço ou maior desconto, 15 para bens nas demais hipóteses, 10 para serviços e obras comuns por menor preço ou maior desconto, 25 para os especiais, 35 para técnica e preço e para a contratação semi-integrada, e 60 para a contratação integrada. São pisos: o edital pode conceder mais.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, art. 174 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Criação do PNCP com divulgação centralizada e obrigatória (inciso I) e realização facultativa das contratações (inciso II). É a distinção que explica por que um portal só não cobre o mercado.",
    },
    {
      titulo: "Lei nº 14.133/2021, art. 54 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Inteiro teor do edital e anexos no PNCP; obrigatoriedade de extrato no Diário Oficial do ente e em jornal de grande circulação (§ 1º).",
    },
    {
      titulo: "Lei nº 14.133/2021, art. 55 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Prazos mínimos, em dias úteis, para apresentação de propostas e lances, contados da divulgação do edital, e a regra de nova divulgação em caso de modificação (§ 1º).",
    },
    {
      titulo: "Lei nº 14.133/2021, arts. 164 e 176 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Prazo de até três dias úteis antes da abertura para impugnação e pedido de esclarecimento (art. 164) e regime de transição de divulgação para municípios com até 20 mil habitantes (art. 176).",
    },
    {
      titulo: "Portal Nacional de Contratações Públicas",
      url: "https://www.pncp.gov.br/",
      sustenta: "Fonte oficial de consulta aos avisos de contratação e ao inteiro teor dos editais.",
    },
    {
      titulo: "Compras.gov.br e SICAF",
      url: "https://www.gov.br/compras/pt-br",
      sustenta: "Sistema de condução dos certames federais e cadastro de fornecedor no âmbito federal.",
    },
  ],
  publicado: true,
};
