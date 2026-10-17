import type { Artigo } from "../tipos";

/**
 * Segundo post do cluster de /habilitacao/, do plano de SEO de 16/10/2026.
 *
 * O post de documentos lista as quatro habilitações; este desce numa só, a
 * fiscal, social e trabalhista, que é onde mora a certidão que vence. Tudo
 * conferido em 17/10/2026:
 *
 * - Lei 14.133, arts. 4º, 63, III, 64, II, 68, 70, II, e 91, § 4º (Planalto).
 * - LC 123/2006, arts. 42 e 43, na redação da LC 155/2016 (Planalto). O § 2º
 *   do art. 43 ainda remete às sanções do art. 81 da Lei 8.666; o texto não
 *   repete essa remissão, só a consequência (decadência do direito).
 * - Validades: federal 180 dias (gov.br, serviço "Emitir certidão de
 *   regularidade fiscal"); CNDT 180 dias (CLT, art. 642-A, § 4º, incluído pela
 *   Lei 12.440/2011); CRF do FGTS 30 dias (Caixa, Manual de Regularidade do
 *   Empregador, v19, item 2.7.1).
 *
 * - Positiva com efeitos de negativa: CTN, art. 206 (conferido no Planalto na
 *   revisão) para tributos; CLT, art. 642-A, § 2º, para débitos trabalhistas.
 *   Não existe CRF "positivo": com pendência no FGTS, a consulta da Caixa não
 *   devolve CRF (manual v19, itens 2.5.4.1 e 2.5.5.2).
 * - Sanções: Lei 14.133, art. 155, IV e VI.
 *
 * Não confirmado, e por isso fora do texto ou dito com "pode": a validade das
 * certidões estaduais e municipais (cada ente define a sua); se toda
 * prefeitura emite pela internet; como os órgãos tratam, na prática, a ME sem
 * CRF dentro do prazo da LC 123 (não há certidão positiva para apresentar, e
 * não achei jurisprudência conferida sobre isso).
 */
export const CERTIDOES_PARA_LICITACAO: Artigo = {
  slug: "certidoes-para-licitacao",
  tituloDaBusca: "Certidões para licitação: onde tirar e validade",
  titulo: "Quais certidões preciso para participar de licitação?",
  descricao:
    "As certidões da regularidade fiscal e trabalhista, onde tirar cada uma, quanto tempo valem e o prazo extra que a ME e a EPP têm para regularizar.",
  resumo:
    "Para a habilitação fiscal, social e trabalhista, o edital costuma pedir cinco certidões: federal, estadual, municipal, FGTS e trabalhista. Três delas têm validade fixa: 180 dias a federal e a trabalhista, 30 dias a do FGTS. Microempresa e empresa de pequeno porte podem entrar na disputa com certidão positiva e têm 5 dias úteis, prorrogáveis, contados de quando forem declaradas vencedoras, para regularizar.",
  intencao: "operacional",
  termoPrincipal: "certidões para licitação",
  guiaRelacionado: "/habilitacao/",
  publicadoEm: "2026-10-17",
  verificadoEm: "2026-10-17",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "As certidões para licitação são a prova da habilitação fiscal, social e trabalhista, uma das quatro partes da [habilitação](/habilitacao/). O art. 68 da Lei nº 14.133/2021 pede regularidade perante as fazendas federal, estadual e/ou municipal do domicílio ou sede, regularidade com a Seguridade Social e o FGTS e regularidade perante a Justiça do Trabalho. O § 2º manda comprovar tudo isso \"na forma da legislação específica\", e é por isso que cada certidão sai de um órgão diferente, com uma validade diferente.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Uma boa notícia antes da lista: você não precisa mandar certidão em toda licitação que disputa. Pelo art. 63, III, os documentos de regularidade fiscal são exigidos somente depois do julgamento das propostas, e apenas do licitante mais bem classificado. A notícia ruim é que, quando o pedido chega, o prazo para enviar costuma ser curto. A certidão tem de estar pronta antes.",
    },
    {
      tipo: "subtitulo",
      texto: "As cinco certidões, onde tirar e quanto tempo valem",
    },
    {
      tipo: "tabela",
      cabecalho: ["Certidão", "Quem emite", "Validade"],
      linhas: [
        [
          "Federal: débitos relativos a tributos federais e à Dívida Ativa da União, incluindo contribuições previdenciárias",
          "Receita Federal e PGFN, em conjunto, pelo site da Receita",
          "180 dias",
        ],
        ["FGTS: Certificado de Regularidade do FGTS (CRF)", "Caixa, na consulta de regularidade do empregador", "30 dias"],
        ["Trabalhista: Certidão Negativa de Débitos Trabalhistas (CNDT)", "Tribunal Superior do Trabalho, de graça e pela internet", "180 dias"],
        ["Estadual", "Secretaria da Fazenda do seu estado", "Definida por cada estado"],
        ["Municipal", "Prefeitura da sua sede", "Definida por cada município"],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A federal é uma certidão só, emitida em conjunto pela Receita Federal e pela Procuradoria-Geral da Fazenda Nacional, e já cobre as contribuições previdenciárias, que respondem pela parte de Seguridade Social do art. 68. A CNDT certifica a empresa em relação a todos os estabelecimentos, agências e filiais, e a validade de 180 dias está na própria CLT (art. 642-A, § 4º). O CRF do FGTS vale 30 dias, segundo o manual da Caixa: é a certidão que mais vence e a que mais pega gente desprevenida.",
    },
    {
      tipo: "paragrafo",
      texto:
        "A estadual e a municipal não têm prazo único no país: cada estado e cada prefeitura define o seu, e o caminho de emissão também varia. Veja a validade impressa na própria certidão. A municipal pode ser a mais demorada de conseguir, então comece por ela.",
    },
    {
      tipo: "destaque",
      texto:
        "A certidão de falência não entra nesta lista. Ela é exigida na habilitação econômico-financeira (art. 69, II), é expedida pelo distribuidor da sede da empresa. Mas costuma ser cobrada no mesmo momento, então guarde-a na mesma pasta.",
    },
    {
      tipo: "subtitulo",
      texto: "Negativa, positiva e positiva com efeitos de negativa",
    },
    {
      tipo: "paragrafo",
      texto:
        "A certidão negativa diz que não há pendência na data da emissão. A positiva com efeitos de negativa é emitida quando há dívida, mas não vencida, em cobrança executiva com penhora, ou com a exigibilidade suspensa, por exemplo porque foi parcelada. Para tributos, ela tem os mesmos efeitos da negativa (CTN, art. 206). Na Justiça do Trabalho, a lei também é expressa: débito garantido por penhora suficiente ou com exigibilidade suspensa gera certidão positiva \"com os mesmos efeitos da CNDT\" (CLT, art. 642-A, § 2º). A positiva sem esse efeito é a que trava a habilitação, salvo o prazo da ME e da EPP, logo abaixo. O FGTS funciona diferente: não existe CRF positivo. Com pendência, a Caixa simplesmente não emite o certificado.",
    },
    {
      tipo: "captura",
      chamada: "Baixe a folha de habilitação do Workbook",
      material: "folha-de-habilitacao",
    },
    {
      tipo: "subtitulo",
      texto: "A certidão venceu no meio do certame. E agora?",
    },
    {
      tipo: "paragrafo",
      texto:
        "Depende de quando ela venceu. O art. 64, II, admite, em diligência, a atualização de documento cuja validade expirou depois da data de recebimento das propostas. Então, se a certidão estava válida no dia da proposta e venceu enquanto o certame andava, ela pode ser atualizada. Se já estava vencida no dia da proposta, essa porta não se abre. A regra prática sai daí: confira a validade contra a data limite de entrega das propostas, não contra a data de hoje.",
    },
    {
      tipo: "paragrafo",
      texto:
        "E o contrato assinado não encerra o assunto. Pelo art. 91, § 4º, antes de formalizar ou prorrogar o contrato a Administração verifica a regularidade fiscal do contratado e emite a certidão de débitos trabalhistas. Certidão vencida no dia da prorrogação também trava.",
    },
    {
      tipo: "subtitulo",
      texto: "O prazo extra da microempresa e da empresa de pequeno porte",
    },
    {
      tipo: "paragrafo",
      texto:
        "A Lei Complementar nº 123/2006 dá à ME e à EPP um tratamento próprio, que a Lei 14.133 manda aplicar no art. 4º. Pelo art. 42 da LC 123, a regularidade fiscal e trabalhista da ME e da EPP só é exigida para a assinatura do contrato. Pelo art. 43, a empresa deve apresentar toda a documentação de regularidade fiscal e trabalhista na disputa, mesmo com alguma restrição.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Havendo restrição, o § 1º do art. 43 garante 5 dias úteis, contados do momento em que a empresa é declarada vencedora, para regularizar a documentação, pagar ou parcelar o débito e emitir as certidões negativas ou positivas com efeito de negativa. O prazo pode ser prorrogado por igual período, a critério da Administração. Se a regularização não vier, o § 2º diz que a empresa perde o direito à contratação, e a Administração pode chamar os próximos colocados ou revogar a licitação. E perder o contrato não é o pior caso: a Lei 14.133 trata como infração não entregar a documentação exigida para a contratação quando convocado (art. 155, VI), o que abre caminho para sanção.",
    },
    {
      tipo: "destaque",
      texto:
        "Dois cuidados. Primeiro, o benefício não vale para tudo: o art. 4º, § 1º, da Lei 14.133 o afasta quando o valor estimado do item, ou da licitação de obra e serviço de engenharia, passa da receita bruta máxima da empresa de pequeno porte, e também quando, no ano da licitação, a empresa já tem contratos com a Administração que, somados, passam desse limite (art. 4º, § 2º). Segundo, o art. 43 manda apresentar toda a documentação de regularidade, mesmo com restrição. Apresentar com restrição é diferente de não apresentar: não conte com os 5 dias para juntar depois o que não foi enviado, e confira o que o edital diz sobre isso.",
    },
    {
      tipo: "subtitulo",
      texto: "O cadastro que poupa trabalho",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 70, II, permite substituir a documentação por registro cadastral emitido por órgão público, desde que o edital preveja. No âmbito federal, esse cadastro é o SICAF, e o caminho para entrar nele está em [portais de licitação](/portais-de-licitacao/). Cadastro não dispensa validade: certidão vencida no cadastro é certidão vencida.",
    },
    {
      tipo: "passos",
      itens: [
        "Tire as cinco certidões no mesmo dia e anote o vencimento de cada uma.",
        "Renove o CRF do FGTS a cada 30 dias, mesmo sem licitação à vista. É a que vence primeiro.",
        "Antes de cada proposta, compare o vencimento de cada certidão com a data limite de entrega das propostas.",
        "Se uma certidão sair positiva, resolva o débito antes de disputar. Sendo ME ou EPP, o prazo de 5 dias úteis existe, mas pode não ser suficiente para parcelar e emitir a nova certidão.",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A lista completa da pasta, com as outras três habilitações, está em [documentos para participar de licitação](/blog/documentos-para-participar-de-licitacao/). O documento técnico que mais elimina empresa pequena está em [atestado de capacidade técnica](/blog/atestado-de-capacidade-tecnica/).",
    },
    {
      tipo: "destaque",
      texto:
        "Prazos de validade e endereços de emissão mudam por ato de cada órgão. Antes de contar com uma certidão, confira a data impressa nela e o que o edital pede. O edital prevalece.",
    },
  ],
  faq: [
    {
      pergunta: "Quais certidões preciso para participar de licitação?",
      resposta:
        "Em regra, cinco: a federal conjunta da Receita e da PGFN, a estadual, a municipal, o CRF do FGTS e a CNDT da Justiça do Trabalho. Elas comprovam a regularidade fiscal, social e trabalhista do art. 68 da Lei nº 14.133/2021. Quem diz quais valem naquele certame é o edital.",
    },
    {
      pergunta: "Quanto tempo vale cada certidão?",
      resposta:
        "A federal e a CNDT valem 180 dias; o CRF do FGTS, 30 dias. A estadual e a municipal têm a validade definida por cada estado e município, impressa na própria certidão.",
    },
    {
      pergunta: "Preciso mandar as certidões junto com a proposta?",
      resposta:
        "Em regra, não. Pelo art. 63, II, os documentos de habilitação são exigidos só do vencedor, salvo se o edital puser a habilitação antes do julgamento; e, pelo inciso III, a regularidade fiscal é exigida, em qualquer caso, só depois do julgamento e do mais bem classificado. Mas o prazo para enviar costuma ser curto, então tenha tudo válido antes.",
    },
    {
      pergunta: "Minha certidão saiu positiva. Posso participar?",
      resposta:
        "Se for positiva com efeitos de negativa, sim: pela lei, ela tem os mesmos efeitos da negativa (CTN, art. 206; CLT, art. 642-A, § 2º). Se for positiva sem esse efeito, a ME e a EPP ainda podem disputar: apresentam a documentação, mesmo com a restrição, e têm 5 dias úteis, prorrogáveis, depois de declaradas vencedoras para regularizar (LC 123, art. 43). As demais empresas não têm esse prazo: a certidão precisa estar válida quando a documentação for exigida.",
    },
    {
      pergunta: "A certidão venceu durante a licitação. Sou inabilitado?",
      resposta:
        "Não necessariamente. Se ela venceu depois da data de recebimento das propostas, o art. 64, II, permite a atualização em diligência. Se já estava vencida nessa data, essa exceção não se aplica.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, arts. 4º, 63, 64, 68, 69, 70, 91 e 155 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art68",
      sustenta:
        "Rol da habilitação fiscal, social e trabalhista (art. 68); exigência só após o julgamento e do mais bem classificado (art. 63, III); atualização de documento vencido após as propostas (art. 64, II); registro cadastral (art. 70, II); verificação antes de assinar ou prorrogar (art. 91, § 4º); aplicação da LC 123 e seus limites (art. 4º, §§ 1º e 2º); certidão de falência (art. 69, II); infração por não entregar a documentação (art. 155, IV e VI).",
    },
    {
      titulo: "Lei Complementar nº 123/2006, arts. 42 e 43 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm",
      sustenta:
        "Regularidade fiscal e trabalhista da ME e da EPP exigida para a assinatura do contrato; apresentação mesmo com restrição; 5 dias úteis, prorrogáveis, para regularizar; decadência do direito à contratação.",
    },
    {
      titulo: "Código Tributário Nacional, art. 206 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm",
      sustenta: "A certidão positiva com efeitos de negativa tem os mesmos efeitos da certidão negativa.",
    },
    {
      titulo: "Lei nº 12.440/2011, que incluiu o art. 642-A na CLT (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12440.htm",
      sustenta:
        "CNDT gratuita e eletrônica, válida por 180 dias, abrangendo todos os estabelecimentos; positiva com os mesmos efeitos em caso de débito garantido ou suspenso.",
    },
    {
      titulo: "Gov.br, Emitir certidão de regularidade fiscal (Receita Federal e PGFN)",
      url: "https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal",
      sustenta: "Certidão conjunta federal, incluindo contribuições previdenciárias, válida por 180 dias.",
    },
    {
      titulo: "Caixa, Consulta de Regularidade do Empregador (CRF do FGTS)",
      url: "https://consulta-crf.caixa.gov.br/",
      sustenta: "Emissão do Certificado de Regularidade do FGTS.",
    },
    {
      titulo: "Caixa, Manual de Orientações Regularidade do Empregador, v19",
      url: "https://www.caixa.gov.br/Downloads/fgts-manuais-e-cartilhas-operacionais/Manual_de_Regularidade_do_Empregador_v19.pdf",
      sustenta:
        "Validade de 30 dias do CRF, contados da emissão (item 2.7.1); empregador irregular não obtém CRF (itens 2.5.4.1 e 2.5.5.2).",
    },
    {
      titulo: "TST, Certidão Negativa de Débitos Trabalhistas",
      url: "https://cndt-certidao.tst.jus.br/",
      sustenta: "Emissão gratuita da CNDT.",
    },
  ],
  publicado: true,
};
