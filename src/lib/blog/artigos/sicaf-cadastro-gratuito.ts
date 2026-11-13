import type { Artigo } from "../tipos";

const PORTAL = "https://www.gov.br/compras/pt-br/sistemas/conheca-o-compras/sicaf-digital/sicaf-digital";
const SERVICO = "https://www.gov.br/pt-br/servicos/cadastrar-se-como-fornecedor-da-administracao-publica";
const ACESSO = "https://www3.comprasnet.gov.br/sicaf-web/index.jsf";
const NORMA = "https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-no-3-de-26-de-abril-de-2018";
const ALERTA = "https://www.gov.br/compras/pt-br/acesso-a-informacao/comunicados/2026/no-38-26-alerta-nao-realize-pagamentos-para-cadastro-no-sicaf";

/** Pesquisa e critérios editoriais em docs/conteudo/pesquisa-sicaf-2026-11-13.md. */
export const SICAF_CADASTRO_GRATUITO: Artigo = {
  slug: "sicaf-cadastro-gratuito",
  titulo: "SICAF: o que é e como fazer o cadastro gratuito",
  tituloDaBusca: "SICAF: cadastro gratuito, passo a passo",
  descricao: "O cadastro no SICAF é gratuito. Veja o acesso oficial, o passo a passo, os seis níveis e o que conferir antes de participar de uma licitação.",
  resumo: "O SICAF é o cadastro de fornecedores usado pelos órgãos que utilizam o SIASG. O registro é gratuito e pode ser feito online, pelo próprio fornecedor ou por seu representante. O primeiro cuidado é entrar no endereço oficial. O segundo é entender que conseguir acessar o sistema não significa estar com todos os documentos prontos para uma licitação.",
  intencao: "operacional",
  termoPrincipal: "SICAF",
  guiaRelacionado: "/vender-para-o-governo/",
  publicadoEm: "2026-11-13",
  verificadoEm: "2026-11-13",
  corpo: [
    {
      tipo: "paragrafo",
      texto: "Você encontra um edital do seu ramo, começa a preparar a proposta e esbarra em uma sigla: SICAF. Antes de pagar alguém ou anexar documentos sem saber para quê, separe três tarefas: criar o acesso, concluir o cadastro e conferir a habilitação exigida naquele edital. Elas se relacionam, mas uma não resolve automaticamente as outras.",
    },
    { tipo: "subtitulo", texto: "O que é o SICAF e para que serve" },
    {
      tipo: "paragrafo",
      texto: `SICAF significa Sistema de Cadastramento Unificado de Fornecedores. Segundo o [Portal de Compras do Governo Federal](${PORTAL}), ele permite o cadastramento de fornecedores de materiais e serviços para a Administração Pública federal direta, autárquica e fundacional, no âmbito do SISG. A inscrição vale perante os órgãos e entidades que utilizam o SIASG. Isso não significa que um único cadastro sirva para qualquer plataforma de disputa do país.`,
    },
    {
      tipo: "tabela",
      cabecalho: ["Sistema", "Função", "O que fazer nele"],
      linhas: [
        ["SICAF", "Cadastro do fornecedor", "Credenciar a empresa e manter os dados e documentos cadastrais."],
        ["Compras.gov.br", "Ambiente de compras públicas", "Acessar os procedimentos realizados nesse sistema, enviar propostas e acompanhar a disputa."],
        ["PNCP", "Divulgação das contratações", "Localizar publicações e documentos e conferir o sistema indicado para participar."],
      ],
    },
    {
      tipo: "paragrafo",
      texto: "O caminho completo está no guia de [como vender para o governo](/vender-para-o-governo/). O cadastro é uma etapa desse caminho. Encontrar a compra no PNCP não dispensa conferir onde a proposta deve ser enviada: o aviso ou edital pode apontar outro ambiente. Veja também a comparação entre os [portais de licitação](/portais-de-licitacao/).",
    },
    { tipo: "subtitulo", texto: "O cadastro no SICAF é pago?" },
    {
      tipo: "paragrafo",
      texto: `**O cadastro no SICAF é gratuito.** A [página oficial do serviço](${SERVICO}) informa a gratuidade. Em 2026, o Ministério da Gestão voltou a publicar um [alerta sobre cobranças indevidas](${ALERTA}). Encontrar um anúncio ou uma página com a sigla SICAF não transforma aquela empresa em canal oficial do governo.`,
    },
    {
      tipo: "paragrafo",
      texto: "Se você optar por contratar uma assessoria particular, trate o orçamento como um serviço privado e confira o que está sendo contratado. Essa cobrança não é uma taxa pública obrigatória para obter o cadastro. O mesmo cuidado vale para uma mensagem que peça pagamento para renovar ou liberar o registro: confirme a situação diretamente no sistema oficial antes de concluir que existe uma pendência.",
    },
    { tipo: "subtitulo", texto: "O que separar antes de começar" },
    {
      tipo: "lista",
      itens: [
        "Acesso gov.br da pessoa que fará o procedimento, respeitando sua autorização para representar a empresa.",
        "CNPJ e dados atuais da empresa, para conferir o que o sistema recuperar das bases oficiais.",
        "Documentos digitais legíveis, organizados por assunto e com as validades identificadas.",
        "O edital que você pretende disputar, se já houver um, para comparar o cadastro com as exigências daquela contratação.",
      ],
    },
    {
      tipo: "paragrafo",
      texto: `No acesso conferido em novembro de 2026, a [tela oficial do SICAF](${ACESSO}) informa a possibilidade de usar selo de confiabilidade prata, além de certificado digital ou certificado em nuvem. A descrição do serviço orienta conta gov.br prata ou superior. Confira sua forma de acesso antes do prazo da proposta; não presuma que precisará comprar um certificado só para iniciar o cadastro.`,
    },
    {
      tipo: "captura",
      chamada: "Organize os documentos antes de entrar no sistema",
      material: "folha-de-habilitacao",
    },
    { tipo: "subtitulo", texto: "Como fazer o cadastro no SICAF: passo a passo" },
    {
      tipo: "passos",
      itens: [
        `Comece pela [página oficial do serviço de cadastramento](${SERVICO}) ou pelo Portal de Compras do Governo Federal. Use o link oficial para abrir o SICAF.`,
        "Selecione o acesso de fornecedor brasileiro, quando for o seu caso, e entre com a identificação aceita pelo sistema.",
        "Na área de Credenciamento, informe o CNPJ e confira os dados da empresa e do responsável. Não avance sem entender qual pessoa jurídica está sendo cadastrada.",
        "Preencha os campos necessários, revise e conclua o credenciamento. A página do serviço identifica a ação de conclusão como Credenciar.",
        "Confira os demais níveis de cadastramento e inclua os documentos que correspondam à situação da empresa e às exigências aplicáveis.",
        "Consulte o resultado e as pendências antes de preparar a proposta. Guarde o comprovante ou registro que o sistema disponibilizar.",
      ],
    },
    {
      tipo: "paragrafo",
      texto: "Essas etapas são um roteiro de conferência, não uma promessa de cadastro concluído em poucos minutos. Se um documento estiver vencido, ilegível ou divergente da base oficial, você terá uma tarefa anterior à disputa. Os nomes e a posição dos menus podem mudar; use os manuais disponíveis no portal oficial para acompanhar a tela que estiver em uso.",
    },
    { tipo: "subtitulo", texto: "Os seis níveis do SICAF" },
    {
      tipo: "paragrafo",
      texto: `A [Instrução Normativa nº 3/2018, art. 6º](${NORMA}), organiza o cadastro em seis níveis. A tabela ajuda a separar os assuntos; não é uma lista universal de documentos obrigatórios para toda empresa ou contratação. A documentação precisa acompanhar a natureza da empresa, as regras aplicáveis e o edital.`,
    },
    {
      tipo: "tabela",
      cabecalho: ["Nível", "Assunto", "O que conferir"],
      linhas: [
        ["I", "Credenciamento", "Identificação do fornecedor e do responsável pelo cadastro."],
        ["II", "Habilitação jurídica", "Documentos de constituição e representação da empresa."],
        ["III", "Regularidade fiscal federal e trabalhista", "Situação perante os órgãos responsáveis pelas certidões federais e trabalhistas."],
        ["IV", "Regularidade fiscal estadual, distrital e municipal", "Documentos locais e situação tributária aplicável ao fornecedor."],
        ["V", "Qualificação técnica", "Registro profissional quando exigível. Os atestados pedidos no edital precisam de conferência própria."],
        ["VI", "Qualificação econômico-financeira", "Balanço e demais documentos econômico-financeiros exigíveis no caso concreto."],
      ],
    },
    {
      tipo: "paragrafo",
      texto: "O credenciamento é o nível básico de participação no ambiente de compras, nos termos do art. 9º da IN nº 3/2018. Isso é diferente de comprovar todas as condições de [habilitação](/habilitacao/). Antes de disputar, transforme as exigências do edital em uma lista e compare cada item com o que está válido no cadastro e com o que deverá ser apresentado no procedimento.",
    },
    { tipo: "subtitulo", texto: "Cadastro ativo não significa documentação válida" },
    {
      tipo: "paragrafo",
      texto: "O art. 18 da IN nº 3/2018 prevê validade de um ano para o registro e sua renovação, com manutenção cadastral automática quando CPF e CNPJ estiverem válidos na Receita Federal. A mesma regra ressalva os documentos com vigência própria. Certidões, FGTS, balanço e demais demonstrações não ganham um novo prazo só porque o cadastro continuou ativo.",
    },
    {
      tipo: "destaque",
      texto: "Antes da proposta, confira duas coisas separadamente: a situação do cadastro e a validade dos documentos. Um comprovante de registro não substitui essa revisão.",
    },
    {
      tipo: "paragrafo",
      texto: "Exemplo de conferência: uma empresa conclui o credenciamento e encontra uma compra compatível com seu serviço. Ao revisar o edital, percebe que precisa apresentar uma certidão cuja validade terminou. O acesso ao sistema continua funcionando, mas a empresa ainda precisa resolver o documento. O problema aparece antes da disputa quando existe uma lista de controle; aparece durante a habilitação quando o cadastro é tratado como assunto encerrado.",
    },
    {
      tipo: "paragrafo",
      texto: "A consulta federal e trabalhista pode aproveitar o compartilhamento de informações dos órgãos emissores, previsto no art. 11 da IN nº 3/2018. Mesmo assim, confira o resultado. Para organizar essa revisão, veja [quais certidões são usadas em licitação](/blog/certidoes-para-licitacao/) e a [lista de documentos por fase](/blog/documentos-para-participar-de-licitacao/).",
    },
    { tipo: "subtitulo", texto: "Como resolver dados divergentes ou pendências" },
    {
      tipo: "paragrafo",
      texto: "Comece identificando a origem da informação. A página oficial do serviço explica que os dados inseridos manualmente podem ser alterados pelo fornecedor. Já informações recebidas de bases oficiais, como Receita Federal, precisam ser corrigidas no órgão de origem. Reenviar o mesmo arquivo ou tentar editar um campo bloqueado não resolve uma divergência que nasceu fora do SICAF.",
    },
    {
      tipo: "lista",
      itens: [
        "Leia a mensagem da pendência e identifique o nível afetado.",
        "Compare os dados com o documento original e com a base do órgão emissor.",
        "Corrija o cadastro ou o documento no local adequado e confira novamente o resultado no SICAF.",
        "Se a situação continuar sem explicação, use os canais de atendimento publicados no Portal de Compras. Registre a solicitação e guarde o protocolo.",
      ],
    },
    { tipo: "subtitulo", texto: "Checklist antes de participar de uma compra" },
    {
      tipo: "lista",
      itens: [
        "O fornecedor e o representante corretos estão identificados no sistema.",
        "Você consegue acessar o ambiente em que a proposta será enviada.",
        "Os documentos exigidos no edital foram localizados, conferidos e organizados.",
        "Validades, exigências técnicas e condições econômico-financeiras foram verificadas separadamente.",
        "Data, horário, anexos e eventuais alterações do edital foram conferidos na publicação oficial.",
        "O preço considera o serviço ou produto completo, os custos e as condições de entrega.",
      ],
    },
    {
      tipo: "paragrafo",
      texto: "Depois do cadastro, a próxima tarefa é escolher o que disputar. Use os [editais abertos](/editais-abertos/) para começar a busca e confira cada publicação na fonte oficial. Se quiser receber alertas e organizar a triagem pelo perfil da sua empresa, [compare os planos do Licitante Vencedor](/precos/). O serviço ajuda a acompanhar oportunidades; não faz o cadastro no SICAF em seu lugar.",
    },
  ],
  faq: [
    { pergunta: "O SICAF é gratuito?", resposta: "Sim. O cadastro oficial no SICAF é gratuito. Uma assessoria privada pode cobrar pelo trabalho que você decidir contratar, mas essa cobrança não é uma taxa pública obrigatória de cadastramento." },
    { pergunta: "Preciso de certificado digital para acessar o SICAF?", resposta: "Na consulta feita em 13/11/2026, a tela oficial informa acesso com selo de confiabilidade prata, além de certificado digital ou certificado em nuvem. A página do serviço orienta conta gov.br prata ou superior. Confira a forma de acesso aceita antes de contratar um certificado." },
    { pergunta: "O cadastro no SICAF serve para toda licitação?", resposta: "Ele vale perante os órgãos e entidades que utilizam o SIASG. Não é um cadastro universal para qualquer portal de disputa. Confira no aviso ou edital o ambiente de participação e as exigências daquela contratação." },
    { pergunta: "O SICAF tem validade de um ano?", resposta: "A IN nº 3/2018 prevê validade anual do registro e manutenção automática quando CPF e CNPJ estiverem válidos na Receita Federal. Isso não renova certidões nem documentos com prazos próprios, que precisam continuar atualizados." },
    { pergunta: "Como consultar o Certificado de Registro Cadastral, o CRC?", resposta: "A página inicial do SICAF oferece a consulta pública ao Certificado de Registro Cadastral. Confira o fornecedor identificado e a situação apresentada. O CRC não elimina a conferência das exigências e dos documentos da licitação." },
    { pergunta: "Terminei o nível I. Já estou habilitado em qualquer compra?", resposta: "Não. O nível I é o credenciamento básico. A habilitação depende das exigências aplicáveis à contratação e da documentação da empresa. Compare os documentos solicitados no edital com os níveis do cadastro e com os arquivos que deverão ser apresentados no procedimento." },
  ],
  fontes: [
    { titulo: "Portal de Compras: SICAF Digital", url: PORTAL, sustenta: "Finalidade do cadastro e abrangência entre os órgãos que utilizam o SIASG." },
    { titulo: "Gov.br: cadastrar-se como fornecedor da Administração Pública", url: SERVICO, sustenta: "Gratuidade, etapas, credenciamento, acesso e correção dos dados cadastrais." },
    { titulo: "SICAF: página oficial de acesso e consultas públicas", url: ACESSO, sustenta: "Formas de acesso informadas no sistema e consulta ao CRC, conferidas em 13/11/2026." },
    { titulo: "IN nº 3/2018, texto atualizado no Portal de Compras", url: NORMA, sustenta: "Níveis do cadastro, atualização dos dados, compartilhamento de informações, CRC e validade do registro e dos documentos." },
    { titulo: "MGI: Comunicado nº 38/26 sobre cobranças de cadastro no SICAF", url: ALERTA, sustenta: "Alerta oficial publicado em 2026 sobre cobranças indevidas relacionadas ao Sicaf Digital." },
    { titulo: "Portal de Compras: guia para fornecedores", url: "https://www.gov.br/compras/pt-br/fornecedor/guia-para-fornecedores.pdf", sustenta: "Separação entre conta gov.br, credenciamento no SICAF e participação pelo Compras.gov.br." },
    { titulo: "Portal Nacional de Contratações Públicas", url: "https://www.gov.br/pncp/pt-br", sustenta: "Função de divulgação das informações e documentos das contratações públicas." },
  ],
  publicado: true,
};
