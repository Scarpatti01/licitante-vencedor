import type { Artigo } from "../tipos";

/**
 * Artigo operacional do hub de habilitação.
 *
 * Os limites citados (4%, 50%, 10%, vedação de faturamento mínimo, art. 64)
 * são os mesmos já conferidos no texto oficial ao escrever `/habilitacao/`.
 * Aqui eles entram pelo outro lado: não "o que o edital não pode pedir", e sim
 * "o que eu preciso ter, e por que ter não basta".
 */
export const DOCUMENTOS_PARA_PARTICIPAR: Artigo = {
  slug: "documentos-para-participar-de-licitacao",
  titulo: "Documentos para participar de licitação: a lista por fase",
  descricao:
    "A documentação exigida em cada fase da licitação, o que mais desclassifica fornecedor e por que ter o documento não é o mesmo que estar habilitado.",
  resumo:
    "A Lei 14.133 divide a habilitação em jurídica, técnica, fiscal/social/trabalhista e econômico-financeira, e em regra só o licitante vencedor apresenta os documentos. O que elimina empresa quase nunca é a falta do documento em si: é a validade vencida no dia errado, o atestado sem quantitativo e o item que simplesmente não foi anexado.",
  intencao: "operacional",
  termoPrincipal: "documentos para participar de licitação",
  guiaRelacionado: "/habilitacao/",
  publicadoEm: "2026-08-14",
  verificadoEm: "2026-08-14",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "Quase toda empresa que perde na habilitação tinha o documento. Tinha a certidão, tinha o balanço, tinha o atestado. O que não tinha era o documento válido, no formato certo, dentro do envelope, no dia da sessão. Essa distinção é a diferença entre estar cadastrado e estar habilitado, e é onde a maior parte dos contratos escapa de quem já tinha ganhado no preço.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Este texto é a lista real, por fase, com o que costuma travar em cada item. Ele não substitui a leitura do edital: quem define as condições de habilitação é o edital, e é ele que prevalece em qualquer divergência.",
    },
    {
      tipo: "subtitulo",
      texto: "As quatro habilitações, e o que cada uma prova",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 62 da Lei 14.133/2021 define a habilitação como a fase em que se verifica o conjunto de informações e documentos necessários e suficientes para demonstrar a capacidade do licitante de realizar o objeto, dividida em jurídica, técnica, fiscal/social/trabalhista e econômico-financeira. Guarde as palavras “necessários e suficientes”: elas são o fundamento de quase toda impugnação de exigência abusiva.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Habilitação", "Documentos típicos", "Onde mais trava"],
      linhas: [
        [
          "Jurídica",
          "Ato constitutivo, contrato social com a última alteração consolidada, documento do representante legal, procuração quando houver",
          "Alteração recente não averbada; objeto social que não cobre o item disputado",
        ],
        [
          "Técnica",
          "Atestados de capacidade técnica, registro em conselho profissional quando for o caso, indicação de equipe e aparelhamento",
          "Atestado genérico, sem quantitativos discriminados, que não comprova o que o edital pede",
        ],
        [
          "Fiscal, social e trabalhista",
          "CNPJ, inscrição estadual e/ou municipal, certidões federal, estadual e municipal, FGTS, CNDT e a declaração sobre trabalho de menores",
          "Certidão municipal, que é a mais lenta de emitir e a menos monitorada",
        ],
        [
          "Econômico-financeira",
          "Balanço patrimonial e demonstrações contábeis, certidão negativa de falência, índices previstos no edital",
          "Balanço sem registro; índice do edital calculado errado na própria planilha da empresa",
        ],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Os itens da habilitação fiscal, social e trabalhista estão listados no art. 68: inscrição no CNPJ, inscrição no cadastro de contribuintes estadual e/ou municipal quando houver, regularidade perante as fazendas federal, estadual e/ou municipal, regularidade relativa à Seguridade Social e ao FGTS, regularidade perante a Justiça do Trabalho e o cumprimento do inciso XXXIII do art. 7º da Constituição, que trata da proibição de trabalho a menores. Já a habilitação jurídica, pelo art. 66, limita-se à comprovação da existência jurídica da pessoa e, quando cabível, da autorização para o exercício da atividade a ser contratada, nada além disso.",
    },
    {
      tipo: "subtitulo",
      texto: "Quem entrega o quê, e quando",
    },
    {
      tipo: "paragrafo",
      texto:
        "Esta é a mudança que mais alivia a rotina de quem disputa muito, e ainda pega gente de surpresa. Pelo art. 63, II, os documentos de habilitação são exigidos apenas do licitante vencedor. A exceção é o edital que inverte as fases e coloca a habilitação antes do julgamento. E o inciso III é mais forte ainda: os documentos de regularidade fiscal são exigidos, em qualquer caso, somente depois do julgamento das propostas e apenas do licitante mais bem classificado.",
    },
    {
      tipo: "paragrafo",
      texto:
        "O efeito prático é bom e perigoso ao mesmo tempo. Bom porque você não monta dossiê para cada certame que disputa. Perigoso porque cria a ilusão de que dá para resolver a documentação depois, e não dá: entre ser declarado vencedor e ter que enviar tudo há um intervalo curto, medido em horas em muitos pregões. Ninguém emite certidão municipal em duas horas, e a empresa que ganhou no lance perde o contrato por um PDF que estava vencido desde a semana anterior.",
    },
    {
      tipo: "captura",
      chamada:
        "Enquanto você organiza a papelada, vale começar a acompanhar o que está sendo publicado. O alerta gratuito manda, todo dia útil, os editais abertos da cidade que você indicar, com prazo e link para o registro oficial. Conferir cada um contra os seus documentos continua sendo trabalho seu, mas pelo menos o certame não passa sem você ver.",
    },
    {
      tipo: "subtitulo",
      texto: "Entregou com erro: o que ainda dá para corrigir",
    },
    {
      tipo: "paragrafo",
      texto:
        "Aqui a lei tem um contorno nítido, e vale decorar. O art. 64 diz que, após a entrega dos documentos para habilitação, não se permite substituição nem apresentação de novos documentos, salvo em diligência para duas coisas: complementar informações sobre documentos já apresentados, desde que necessária para apurar fatos existentes à época da abertura do certame; e atualizar documentos cuja validade tenha expirado depois da data de recebimento das propostas. O § 1º ainda permite à comissão sanar erros ou falhas que não alterem a substância dos documentos e sua validade jurídica, por despacho fundamentado e acessível a todos.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Situação real", "Tem conserto?", "Fundamento"],
      linhas: [
        ["A certidão venceu depois da entrega das propostas", "Sim, cabe atualização", "Art. 64, II"],
        [
          "O documento foi entregue, mas faltou detalhar informação que já existia",
          "Sim, cabe complementação em diligência",
          "Art. 64, I",
        ],
        ["Erro de soma ou de digitação que não muda a substância", "Sim, a comissão pode sanar", "Art. 64, § 1º"],
        ["O documento simplesmente não foi anexado", "Não, seria apresentação de documento novo", "Art. 64, caput"],
        [
          "A certidão já estava vencida na data de recebimento das propostas",
          "Não, o inciso II fala em validade expirada depois dessa data",
          "Art. 64, II",
        ],
      ],
    },
    {
      tipo: "destaque",
      texto:
        "A linha divisória é uma frase: complementar o que existe, sim; suprir o que faltou, não. É por isso que a conferência antes de enviar vale mais do que qualquer argumento depois.",
    },
    {
      tipo: "subtitulo",
      texto: "O que o edital não pode exigir de você",
    },
    {
      tipo: "paragrafo",
      texto:
        "Metade das empresas que se acham inaptas foi eliminada por exigência que a lei não autoriza. Antes de concluir que você não atende, confira estes limites, todos com número fechado no texto legal.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Limite", "O que a lei estabelece", "Dispositivo"],
      linhas: [
        [
          "Atestado só sobre parcela relevante",
          "A exigência de atestados é restrita às parcelas de maior relevância ou valor significativo, assim consideradas as de valor individual igual ou superior a 4% do valor total estimado",
          "Art. 67, § 1º",
        ],
        [
          "Teto de 50% na quantidade",
          "Admite-se exigir atestados com quantidades mínimas de até 50% dessas parcelas",
          "Art. 67, § 2º",
        ],
        [
          "Sem restrição de tempo nem de região",
          "São vedadas limitações de tempo e de locais específicos relativas aos atestados",
          "Art. 67, § 2º",
        ],
        [
          "Faturamento mínimo é vedado",
          "É vedada a exigência de valores mínimos de faturamento anterior e de índices de rentabilidade ou lucratividade",
          "Art. 69, § 2º",
        ],
        [
          "Capital ou patrimônio líquido de até 10%",
          "Nas compras para entrega futura e na execução de obras e serviços, pode-se exigir capital mínimo ou patrimônio líquido de até 10% do valor estimado",
          "Art. 69, § 4º",
        ],
        [
          "Empresa nova apresenta um exercício",
          "As demonstrações contábeis limitam-se ao último exercício quando a pessoa jurídica foi constituída há menos de 2 anos",
          "Art. 69, § 6º",
        ],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A terceira linha é a mais fácil de atacar, porque a vedação está escrita com todas as letras: cláusula que só aceita experiência “nos últimos três anos” ou “no Estado de X” contraria o § 2º do art. 67. A quarta é a mais desrespeitada. Exigir faturamento mínimo é a forma clássica de excluir empresa pequena mantendo aparência de critério técnico. O detalhamento de cada uma, com o texto integral dos dispositivos, está no guia de [habilitação](/habilitacao/).",
    },
    {
      tipo: "subtitulo",
      texto: "Empresa nova, cadastro e substituição de documento",
    },
    {
      tipo: "paragrafo",
      texto:
        "Três regras aliviam a vida de quem está começando e raramente aparecem em conversa de balcão. O art. 65, § 1º, autoriza as empresas criadas no exercício financeiro da licitação a substituir os demonstrativos contábeis pelo balanço de abertura, atendidas as demais exigências. O art. 70, II, permite que a documentação seja substituída por registro cadastral emitido por órgão ou entidade pública, desde que previsto no edital e feito em obediência à lei. É o que faz o SICAF economizar papel repetido em muitos certames. E o inciso I do mesmo artigo admite a apresentação em original, por cópia ou por outro meio expressamente admitido pela Administração.",
    },
    {
      tipo: "subtitulo",
      texto: "Vistoria: você pode não ir",
    },
    {
      tipo: "paragrafo",
      texto:
        "Muita empresa desiste de edital por causa da visita técnica, achando que é obrigatória e inviável quando a obra fica a trezentos quilômetros. O art. 63, § 2º, permite ao edital exigir, sob pena de inabilitação, que o licitante ateste conhecer o local e as condições da obra ou serviço, quando a avaliação prévia for imprescindível, assegurado a ele o direito de fazer vistoria prévia. Mas o § 3º é categórico: o edital sempre deverá prever a possibilidade de substituição da vistoria por declaração formal assinada pelo responsável técnico do licitante, atestando conhecimento pleno das condições. Edital que não oferece essa alternativa está fora do texto da lei.",
    },
    {
      tipo: "subtitulo",
      texto: "A rotina que evita a derrota documental",
    },
    {
      tipo: "passos",
      itens: [
        "Monte uma pasta única, digital, com todos os documentos em PDF legível e nomeados por tipo e data de validade. Documento espalhado em três computadores é documento que não existe às 14h de uma sessão.",
        "Coloque alerta de vencimento de cada certidão no calendário, com trinta dias de antecedência. A municipal é a que mais atrasa e a que menos gente monitora.",
        "Confira objeto social e CNAE contra o item que você quer disputar antes de qualquer coisa. Correção na Junta Comercial leva semanas, e o prazo do edital não espera.",
        "Peça atestado ao final de todo contrato executado, com quantitativos discriminados e dados do contratante. Atestado genérico não comprova o que o edital pede.",
        "Rode os índices contábeis exigidos no edital na sua própria planilha antes de enviar o balanço. Descobrir na sessão que o índice não fecha não tem correção.",
        "Ao ler o edital, procure primeiro os limites: 4% e 50% nos atestados, 10% no capital, vedação de faturamento mínimo, alternativa à vistoria. É a leitura que mais vira contrato.",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Se a exigência que te elimina for ilegal, o caminho é a impugnação, e ela tem prazo: até três dias úteis antes da data de abertura do certame, pelo art. 164. Por isso descobrir o edital cedo importa tanto quanto ter a papelada em dia; os caminhos para isso estão em [portais de licitação](/portais-de-licitacao/). E, se você ainda não fez o primeiro certame, o encadeamento completo, cadastro, escolha do que disputar, preço e disputa. Está em [como vender para o governo](/vender-para-o-governo/).",
    },
  ],
  faq: [
    {
      pergunta: "Quais documentos preciso ter para participar de licitação?",
      resposta:
        "Os de habilitação jurídica (ato constitutivo e contrato social atualizado), técnica (atestados de capacidade técnica e registros profissionais quando for o caso), fiscal, social e trabalhista (CNPJ, inscrições, certidões federal, estadual, municipal, FGTS e CNDT) e econômico-financeira (balanço patrimonial e certidão negativa de falência). A lista exata de cada certame é a do edital: o art. 65 diz que as condições de habilitação serão nele definidas.",
    },
    {
      pergunta: "Preciso enviar todos os documentos junto com a proposta?",
      resposta:
        "Em regra, não. O art. 63, II, exige a apresentação dos documentos de habilitação apenas do licitante vencedor, salvo quando o edital inverte as fases e coloca a habilitação antes do julgamento. E o inciso III determina que a regularidade fiscal seja exigida, em qualquer caso, somente depois do julgamento e apenas do mais bem classificado.",
    },
    {
      pergunta: "Minha certidão vence no dia da sessão. Sou desclassificado?",
      resposta:
        "Depende de quando ela vence em relação à entrega dos documentos. O art. 64, II, admite, em diligência, a atualização de documentos cuja validade tenha expirado após a data de recebimento das propostas. Documento que já estava vencido antes disso não se encaixa nessa hipótese. A conduta segura é simples: renove antes, não conte com a diligência.",
    },
    {
      pergunta: "Esqueci de anexar um documento. Posso mandar depois?",
      resposta:
        "Não. O caput do art. 64 proíbe substituir ou apresentar documentos novos após a entrega, e as duas exceções são complementação de informação sobre documento já apresentado e atualização de validade expirada depois do recebimento das propostas. Documento que não foi anexado não se encaixa em nenhuma delas.",
    },
    {
      pergunta: "O edital exige atestado do volume total do contrato. Isso é legal?",
      resposta:
        "Não. O art. 67, § 2º, admite exigir quantidades mínimas de até 50% das parcelas de maior relevância, e essas parcelas, pelo § 1º, são apenas as de valor individual igual ou superior a 4% do total estimado. Exigir o volume integral extrapola o texto legal e é matéria de impugnação, protocolada até três dias úteis antes da abertura.",
    },
    {
      pergunta: "Minha empresa foi aberta este ano. Posso participar?",
      resposta:
        "Pode. O art. 65, § 1º, autoriza as empresas criadas no exercício financeiro da licitação a substituir os demonstrativos contábeis pelo balanço de abertura, e o art. 69, § 6º, limita os documentos contábeis ao último exercício quando a pessoa jurídica tem menos de dois anos. Edital que exige dois exercícios sem essas ressalvas elimina empresa nova sem base na lei.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, arts. 62, 63, 66 e 68 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Divisão da habilitação em quatro espécies, momento e sujeito da apresentação dos documentos, limites da habilitação jurídica e rol da habilitação fiscal, social e trabalhista.",
    },
    {
      titulo: "Lei nº 14.133/2021, arts. 64, 65 e 70 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Regra da vedação de documento novo e as exceções em diligência; balanço de abertura para empresa criada no exercício; substituição da documentação por registro cadastral.",
    },
    {
      titulo: "Lei nº 14.133/2021, arts. 67 e 69 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Limite de 4% para parcelas de maior relevância, teto de 50% nas quantidades e vedação de limitações de tempo e local nos atestados; vedação de faturamento mínimo e teto de 10% para capital ou patrimônio líquido.",
    },
    {
      titulo: "Lei nº 14.133/2021, arts. 63, §§ 2º e 3º, e 164 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Exigência de conhecimento do local com direito a vistoria prévia e obrigatoriedade de prever a substituição por declaração do responsável técnico; prazo de impugnação de até três dias úteis antes da abertura.",
    },
    {
      titulo: "Compras.gov.br e SICAF",
      url: "https://www.gov.br/compras/pt-br",
      sustenta: "Cadastro federal de fornecedores, que serve de registro cadastral quando o edital assim prevê.",
    },
  ],
  publicado: true,
};
