import type { Artigo } from "../tipos";

/**
 * Artigo comercial do hub de "vender para o governo".
 *
 * É o artigo mais próximo do produto, e por isso o mais fácil de estragar. A
 * regra aqui é a mesma do posicionamento: critério objetivo de decisão, sem
 * afirmação sobre desfecho de certame. Quem decide é o leitor; o edital
 * prevalece.
 */
export const VALE_A_PENA_PARTICIPAR: Artigo = {
  slug: "vale-a-pena-participar-de-licitacao",
  tituloDaBusca: "Vale a pena participar de licitação?",
  titulo: "Vale a pena participar de licitação? Como decidir antes de montar a proposta",
  descricao:
    "Sete critérios objetivos para decidir se um edital merece a sua semana: objeto, região, valor, prazo, documentação e as exigências extras que mudam a conta.",
  resumo:
    "A pergunta útil não é se licitação vale a pena, e sim se este edital vale a sua semana. Objeto, região, porte, prazo até a sessão, documentação em dia e exigências extras como garantia, vistoria e amostra decidem isso antes de você abrir a planilha, e cada um deles é verificável em minutos.",
  intencao: "comercial",
  termoPrincipal: "vale a pena participar de licitação",
  guiaRelacionado: "/vender-para-o-governo/",
  publicadoEm: "2026-08-14",
  verificadoEm: "2026-08-14",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "“Vale a pena participar de licitação?” é uma pergunta que não tem resposta, porque não existe “licitação” no singular. Existe este edital, deste órgão, com este objeto, este prazo e estas exigências. A pergunta com resposta é outra: vale a pena montar proposta para este edital aqui?",
    },
    {
      tipo: "paragrafo",
      texto:
        "Vale a pena responder isso com critério porque montar proposta custa caro em algo que PME tem pouco: atenção. Ler o edital e os anexos, conferir a habilitação, levantar preço com fornecedor, montar planilha, se cadastrar no portal em que a sessão corre, participar da disputa. Numa empresa pequena isso significa o sócio parado de vender por dois ou três dias, às vezes uma semana inteira quando o objeto é complexo.",
    },
    {
      tipo: "paragrafo",
      texto:
        "O que dói não é perder a disputa. É gastar essa semana e descobrir, na véspera, que o edital exigia atestado que você não tem, garantia de proposta que você não vai recolher a tempo, ou entrega em município a quatrocentos quilômetros que inviabiliza o frete. Esse desperdício é evitável, e evitá-lo é um trabalho de dez minutos por edital, desde que se saiba o que olhar e em que ordem.",
    },
    {
      tipo: "captura",
      chamada:
        "Essa triagem começa por saber o que existe. No teste de 14 dias, sem cartão, o resumo manda nos dias úteis os editais abertos do recorte que você escolher, com objeto, órgão, valor estimado, prazo, nota de aderência e o link para o registro oficial. A partir daí a conta de vale a pena é sua, e o edital sempre prevalece.",
    },
    {
      tipo: "subtitulo",
      texto: "Os sete filtros, na ordem em que eliminam mais rápido",
    },
    {
      tipo: "paragrafo",
      texto:
        "A ordem importa. Cada filtro é mais barato de aplicar que o seguinte, e a primeira resposta negativa encerra a análise. Rodar isso de trás para frente é como formar preço antes de saber se você pode entregar.",
    },
    {
      tipo: "tabela",
      cabecalho: ["#", "Filtro", "Pergunta que você responde", "Custa"],
      linhas: [
        ["1", "Objeto", "Isto é mesmo o que eu vendo, do jeito que o termo de referência descreve?", "Dois minutos"],
        ["2", "Região e logística", "Eu entrego neste município sem que o frete coma a margem?", "Dois minutos"],
        ["3", "Porte e valor", "O tamanho do contrato cabe na minha operação e no meu caixa?", "Cinco minutos"],
        ["4", "Prazo até a sessão", "Dá tempo de preparar tudo, inclusive cadastro no portal?", "Um minuto"],
        ["5", "Habilitação", "Eu atendo às exigências, e a documentação está válida hoje?", "Dez minutos"],
        ["6", "Exigências extras", "Garantia, vistoria e amostra: quanto isso custa antes de eu ganhar algo?", "Dez minutos"],
        ["7", "Preço", "O orçamento estimado cabe no meu custo com margem?", "Horas, por isso é o último"],
      ],
    },
    {
      tipo: "subtitulo",
      texto: "Filtro 1 e 2: objeto e região são eliminatórios, não negociáveis",
    },
    {
      tipo: "paragrafo",
      texto:
        "O objeto precisa bater com o que a empresa efetivamente entrega e com o que está no contrato social. Objeto social e CNAE incompatíveis com o item disputado levam à inabilitação, e a correção na Junta Comercial leva semanas, tempo que não existe com edital publicado. Leia o termo de referência, não a ementa: é ele que descreve marca, especificação, prazo de entrega e local, e é ele que você está prometendo cumprir.",
    },
    {
      tipo: "paragrafo",
      texto:
        "A região é o filtro que empresa nova mais ignora. Um contrato de fornecimento parcelado em município distante significa entregas repetidas, e o custo de cada viagem entra na sua proposta ou sai do seu lucro. Antes de olhar preço, olhe o mapa e o cronograma de entrega.",
    },
    {
      tipo: "subtitulo",
      texto: "Filtro 3: valor versus porte, e o caixa que ninguém calcula",
    },
    {
      tipo: "paragrafo",
      texto:
        "Contrato grande demais é tão ruim quanto contrato pequeno demais. Ganhar sem poder entregar gera multa e risco de impedimento de licitar, resultado pior do que não ter participado. E há a conta que quebra empresa boa: o poder público paga depois do atesto da entrega, não da emissão da nota. Some o prazo de execução ao prazo de pagamento e pergunte se o seu capital de giro aguenta.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Para MEI e microempresa há um detalhe adicional que precisa ser somado antes, não depois: o valor anual do contrato entra no faturamento do ano. Um único contrato de execução continuada pode estourar o teto de enquadramento sozinho, e o desenquadramento tem efeito tributário que ninguém quer descobrir em dezembro. O encadeamento de porte e benefícios está no guia de [como vender para o governo](/vender-para-o-governo/).",
    },
    {
      tipo: "subtitulo",
      texto: "Filtro 4: o prazo até a sessão é menor do que parece",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 55 da Lei 14.133/2021 fixa prazos mínimos para apresentação de propostas e lances, contados da data de divulgação do edital, e eles são a régua para saber se dá tempo:",
    },
    {
      tipo: "tabela",
      cabecalho: ["Objeto e critério de julgamento", "Prazo mínimo"],
      linhas: [
        ["Bens, por menor preço ou maior desconto", "8 dias úteis"],
        ["Bens, nas demais hipóteses", "15 dias úteis"],
        ["Serviços e obras comuns, por menor preço ou maior desconto", "10 dias úteis"],
        ["Serviços e obras especiais, por menor preço ou maior desconto", "25 dias úteis"],
        ["Contratação semi-integrada e demais hipóteses de serviços e obras", "35 dias úteis"],
        ["Contratação integrada", "60 dias úteis"],
        ["Maior lance", "15 dias úteis"],
        ["Técnica e preço, melhor técnica ou conteúdo artístico", "35 dias úteis"],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "São pisos, e o edital pode conceder mais. Mas o número que importa é quantos desses dias ainda restam quando você encontra o edital, e dentro deles cabe também o cadastro no portal em que a sessão vai correr, que costuma levar dias úteis e não horas. Descobrir na véspera que o credenciamento não fica pronto a tempo é a forma mais banal de perder um certame para o qual você estava pronto. Onde cada edital é publicado e onde a disputa acontece está em [portais de licitação](/portais-de-licitacao/).",
    },
    {
      tipo: "paragrafo",
      texto:
        "Um cuidado no sentido contrário: pelo § 1º do art. 55, modificações no edital implicam nova divulgação na mesma forma da inicial e o cumprimento dos mesmos prazos, exceto quando a alteração não comprometer a formulação das propostas. Edital alterado às vezes reabre o relógio, mas confirme antes de contar com isso.",
    },
    {
      tipo: "subtitulo",
      texto: "Filtro 5: documentação em dia, hoje, não “na gaveta”",
    },
    {
      tipo: "paragrafo",
      texto:
        "Aqui a pergunta não é “eu tenho os documentos?”, e sim “eles estão válidos hoje e válidos na data provável da sessão?”. Certidão vencida no dia errado elimina empresa que ganhou no lance, e a margem de correção é estreita: o art. 64 só admite, em diligência, complementar informação sobre documento já apresentado e atualizar documento cuja validade expirou depois do recebimento das propostas. O que não foi entregue não tem conserto.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Se a barreira for o atestado de capacidade técnica, confira antes de desistir se a exigência é legal. O art. 67, § 1º, restringe a exigência de atestados às parcelas de valor individual igual ou superior a 4% do total estimado; o § 2º admite quantidades mínimas de até 50% dessas parcelas e veda limitações de tempo e de locais específicos. E o art. 69, § 2º, proíbe exigir faturamento mínimo anterior, enquanto o § 4º limita capital mínimo ou patrimônio líquido a 10% do valor estimado. Exigência fora desses limites não é obstáculo: é fundamento de impugnação, e a lista completa está em [habilitação](/habilitacao/).",
    },
    {
      tipo: "subtitulo",
      texto: "Filtro 6: as exigências extras que mudam a conta",
    },
    {
      tipo: "paragrafo",
      texto:
        "Três exigências aparecem no meio do edital e custam dinheiro antes de qualquer contrato existir. Elas não tornam o certame ruim. Só precisam entrar na decisão com o valor certo.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Exigência", "O que a lei permite", "O que isso significa para o seu caixa"],
      linhas: [
        [
          "Garantia de proposta",
          "Pode ser exigida no momento da apresentação da proposta, como requisito de pré-habilitação, limitada a 1% do valor estimado (art. 58 e § 1º)",
          "Dinheiro imobilizado antes da disputa; é devolvido em até 10 dias úteis da assinatura do contrato ou da declaração de licitação fracassada (§ 2º)",
        ],
        [
          "Garantia de execução",
          "Pode ser exigida mediante previsão no edital, de até 5% do valor inicial do contrato, majorável para até 10% se justificada pela complexidade e pelos riscos (arts. 96 e 98)",
          "Custo de contratação de seguro-garantia ou fiança, ou caução imobilizada durante toda a vigência",
        ],
        [
          "Vistoria do local",
          "Cabe quando a avaliação prévia for imprescindível, sob pena de inabilitação, mas o edital sempre deve admitir a substituição por declaração do responsável técnico (art. 63, §§ 2º e 3º)",
          "Deslocamento e diária, ou nada, se você optar pela declaração formal",
        ],
        [
          "Amostra",
          "Exigida do licitante provisoriamente vencedor, na fase de julgamento, ou depois do julgamento como condição para firmar contrato (art. 42, § 2º)",
          "Produção e logística da amostra, mas só depois de você estar na frente, não de todos os participantes",
        ],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Um detalhe do art. 58 que merece atenção antes de recolher a garantia de proposta: o § 3º determina a execução do valor integral da garantia em caso de recusa em assinar o contrato ou de não apresentação dos documentos para a contratação. Ou seja, desistir depois de vencer não é apenas constrangedor. Tem preço.",
    },
    {
      tipo: "subtitulo",
      texto: "Filtro 7: preço, e o que fazer quando o orçamento é sigiloso",
    },
    {
      tipo: "paragrafo",
      texto:
        "Só chega aqui o edital que passou pelos seis anteriores, e só aqui vale investir horas. A conta precisa embutir o que a venda privada não tem: prazo de pagamento longo, custo de manter certidões, custo da garantia quando exigida, custo de acompanhar a execução e o fiscal do contrato.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Nem sempre você verá o valor de referência. O art. 24 permite que o orçamento estimado tenha caráter sigiloso, desde que justificado, sem prejuízo da divulgação dos quantitativos e das demais informações necessárias para elaborar a proposta, e o sigilo não vale para os órgãos de controle. Há uma exceção expressa no parágrafo único: quando o critério for maior desconto, o preço estimado ou máximo aceitável consta do edital. Com orçamento sigiloso, o preço se forma pelo seu custo e pela sua margem, não por ancoragem no número do órgão.",
    },
    {
      tipo: "paragrafo",
      texto:
        "E há um piso invisível: pelo art. 59, são desclassificadas as propostas com preços inexequíveis ou que permaneçam acima do orçamento estimado, e também aquelas cuja exequibilidade não seja demonstrada quando a Administração exigir. Lance agressivo demais não custa só margem. Custa desclassificação e a obrigação de sustentar tecnicamente um preço que não se sustenta.",
    },
    {
      tipo: "subtitulo",
      texto: "Quando a resposta é “não”, e quando é “ainda não”",
    },
    {
      tipo: "paragrafo",
      texto:
        "Nem todo “não” é definitivo, e é útil separar os dois casos. Se você foi barrado por exigência que a lei não autoriza, o caminho é a impugnação, pelo art. 164, qualquer pessoa é parte legítima para impugnar o edital ou pedir esclarecimento, protocolando até três dias úteis antes da data de abertura, e a resposta é divulgada em até três dias úteis, limitada ao último dia útil anterior à abertura. Se você foi barrado por algo que é seu (CNAE errado, atestado inexistente, caixa curto), o edital não era para agora, e a resposta certa é preparar a empresa para o próximo.",
    },
    {
      tipo: "destaque",
      texto:
        "Um bom critério de triagem não existe para você participar mais. Existe para você participar do que faz sentido e parar de gastar semana no que nunca daria, que é uma economia maior do que qualquer contrato marginal.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Por fim, um lembrete que custa contratos todo mês: se você disputou e discordou do resultado, a intenção de recorrer precisa ser manifestada imediatamente, sob pena de preclusão, e só então corre o prazo de três dias úteis para as razões (art. 165, I e § 1º). Quem sai da sessão inconformado e procura orientação no dia seguinte chega com o direito já perdido. Manifeste sempre que houver dúvida razoável. Manifestar não obriga a recorrer depois.",
    },
  ],
  faq: [
    {
      pergunta: "Vale a pena participar de licitação sendo uma empresa pequena?",
      resposta:
        "Depende do edital, não do porte. Empresa pequena disputa em condição favorável em itens de menor valor, dispensas eletrônicas e certames com benefício de ME e EPP, e em condição desfavorável em objetos grandes com exigência técnica pesada. O critério útil é o mesmo para qualquer tamanho: objeto compatível, região viável, prazo suficiente, documentação válida e preço que cabe no seu custo.",
    },
    {
      pergunta: "Quanto tempo leva para montar uma proposta?",
      resposta:
        "Para um item simples de fornecimento, de meio dia a dois dias, incluindo leitura do edital, cotação e cadastro no portal. Para serviços continuados ou obras, com planilha detalhada, uma semana é realista. É justamente por isso que a triagem vem antes: dez minutos conferindo objeto, região, prazo e habilitação evitam dias gastos em edital que nunca daria.",
    },
    {
      pergunta: "Qual o valor mínimo de licitação que compensa disputar?",
      resposta:
        "Não existe número universal. Compensa o contrato cuja margem cobre o custo de participar e de executar, incluindo deslocamento, garantia quando exigida e o capital parado até o pagamento. O cálculo honesto começa somando essas linhas e comparando com a margem estimada. Contrato pequeno pode compensar mesmo com margem baixa quando gera o atestado de capacidade técnica que destrava certames maiores.",
    },
    {
      pergunta: "O edital exige garantia. Isso inviabiliza a minha participação?",
      resposta:
        "Não necessariamente, mas entra na conta. A garantia de proposta é limitada a 1% do valor estimado pelo art. 58, § 1º, e devolvida em até 10 dias úteis da assinatura do contrato ou da declaração de licitação fracassada. A garantia de execução, pelos arts. 96 e 98, pode ser de até 5% do valor inicial do contrato, majorável para até 10% quando justificada, e o contratado escolhe a modalidade entre caução, seguro-garantia, fiança bancária e título de capitalização.",
    },
    {
      pergunta: "Sou obrigado a fazer a visita técnica para participar?",
      resposta:
        "Não, quando existe a alternativa que a lei manda prever. O art. 63, § 2º, permite ao edital exigir que o licitante ateste conhecer o local, sob pena de inabilitação, assegurado o direito de vistoria prévia; e o § 3º determina que o edital sempre preveja a possibilidade de substituir a vistoria por declaração formal assinada pelo responsável técnico. Edital sem essa alternativa está fora do texto legal.",
    },
    {
      pergunta: "Descobri o edital com poucos dias de prazo. Vale tentar?",
      resposta:
        "Vale se, além de preparar a proposta, der tempo de concluir o cadastro no portal em que a sessão acontece e de emitir qualquer certidão vencida. Essas duas etapas dependem de terceiros e não aceleram. Se o prazo mínimo do art. 55 já correu quase todo, o risco não é perder a disputa, é gastar o esforço e não conseguir sequer enviar a proposta.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, art. 55 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Prazos mínimos, em dias úteis, para apresentação de propostas e lances, contados da divulgação do edital, e regra de nova divulgação quando o edital é modificado (§ 1º).",
    },
    {
      titulo: "Lei nº 14.133/2021, arts. 58, 96 e 98 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Garantia de proposta limitada a 1% do valor estimado, com devolução em até 10 dias úteis e execução integral em caso de recusa em contratar; garantia de execução de até 5% do valor inicial do contrato, majorável para até 10% quando justificada, e as modalidades à escolha do contratado.",
    },
    {
      titulo: "Lei nº 14.133/2021, arts. 42, § 2º, e 63, §§ 2º e 3º (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Amostra exigível do licitante provisoriamente vencedor ou como condição para firmar contrato; vistoria do local com direito assegurado de substituição por declaração do responsável técnico.",
    },
    {
      titulo: "Lei nº 14.133/2021, arts. 24, 59, 64, 67 e 69 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Possibilidade de orçamento estimado sigiloso e sua exceção no maior desconto; desclassificação por preço inexequível ou acima do orçamento; limites de correção documental; limites de 4%, 50% e 10% e vedação de faturamento mínimo na habilitação.",
    },
    {
      titulo: "Lei nº 14.133/2021, arts. 164 e 165 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Legitimidade e prazo de até três dias úteis antes da abertura para impugnar o edital ou pedir esclarecimento; manifestação imediata da intenção de recorrer sob pena de preclusão e prazo de três dias úteis para as razões.",
    },
    {
      titulo: "Portal Nacional de Contratações Públicas",
      url: "https://www.pncp.gov.br/",
      sustenta: "Fonte oficial de consulta aos avisos de contratação e ao inteiro teor dos editais e anexos.",
    },
  ],
  publicado: true,
};
