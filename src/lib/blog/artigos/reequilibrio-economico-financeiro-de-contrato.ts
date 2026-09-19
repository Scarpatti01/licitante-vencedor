import type { Artigo } from "../tipos";

/**
 * O segundo artigo do hub de contratos, e o par natural do de atraso no
 * pagamento.
 *
 * POR QUE ESTE TEMA: os dois artigos com mais impressão no Search Console são
 * os dois que respondem a um direito com prazo cravado na norma, e um deles
 * (atraso no pagamento) já mora em /contratos/. Reequilíbrio é a outra metade
 * do mesmo problema de caixa: lá o órgão não paga, aqui o órgão paga o preço
 * de um ano atrás. Mesma pessoa, mesma dor, momento seguinte.
 *
 * O ÂNGULO: quase todo conteúdo do assunto trata "reequilíbrio" como uma coisa
 * só. São três, com requisitos opostos: reajuste é automático e não depende de
 * pedido, repactuação só existe para serviço com mão de obra e exige planilha,
 * revisão exige provar álea extraordinária. Pedir o instituto errado não é
 * detalhe de vocabulário: é meses de processo até o indeferimento. O texto é
 * organizado em torno dessa separação, e o prazo que fecha a porta (pedir
 * antes de prorrogar) ganha seção própria porque é o que ninguém conta.
 *
 * FONTES: o texto da Lei, lido no Planalto, mais as três páginas do portal
 * Licitações e Contratos do TCU que tratam de cada instituto separadamente.
 * O TCU é quem traz o entendimento da AGU sobre a automaticidade do reajuste,
 * que não está na Lei. Ler a Lei direto corrigiu quatro afirmações deste texto
 * que tinham sido escritas a partir do resumo do TCU: o nome legal do instituto
 * é "reajustamento em sentido estrito"; a data-base é a do orçamento estimado
 * (art. 25, §7º, e art. 92, §3º), e não uma regra difusa de anualidade; a
 * extensão ao fato da Administração vale só para obras e serviços de engenharia
 * (art. 124, §2º); e a regra de pedir antes da prorrogação mora no parágrafo
 * único do art. 131, cujo caput garante indenização por termo indenizatório.
 *
 * O LIMITE: o instituto cabível e o que cada um exige são fato verificável. Se
 * o SEU aumento de custo configura álea extraordinária, e quanto pedir, é
 * análise de planilha e de contrato, com contador e advogado.
 */
export const REEQUILIBRIO_ECONOMICO_FINANCEIRO: Artigo = {
  slug: "reequilibrio-economico-financeiro-de-contrato",
  tituloDaBusca: "Reequilíbrio econômico-financeiro: o que provar",
  titulo:
    "Reequilíbrio econômico-financeiro: reajuste, repactuação e revisão, e por que pedir o errado custa meses",
  descricao:
    "Reajuste é automático e anual. Repactuação vale para serviço com mão de obra. Revisão exige provar o fato imprevisível. Pedir o errado atrasa meses.",
  resumo:
    "O custo subiu depois da proposta e o contrato continua no preço do ano passado. A Lei 14.133/2021 tem três caminhos para isso, e eles não são sinônimos: reajuste, repactuação e revisão. Um é automático, outro só existe para serviço com dedicação de mão de obra, e o terceiro exige provar um fato imprevisível. Pedir o caminho errado não é erro de vocabulário: é o processo inteiro até o indeferimento. Este texto separa os três e diz o que cada um exige.",
  intencao: "operacional",
  termoPrincipal: "reequilíbrio econômico-financeiro",
  guiaRelacionado: "/contratos/",
  publicadoEm: "2026-09-19",
  verificadoEm: "2026-09-19",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "A proposta foi montada com o preço de insumo de dezoito meses atrás. O contrato é de execução continuada, o fornecedor reajustou, o dissídio da categoria saiu, e o que entra no caixa continua igual ao do dia da disputa. A conta que fechava com margem apertada passou a fechar no vermelho, e a pergunta é sempre a mesma: dá para pedir aumento no contrato com o governo?",
    },
    {
      tipo: "paragrafo",
      texto:
        "Dá, e o direito ao equilíbrio econômico-financeiro é o que sustenta isso. O que quase ninguém diz é que ele tem três portas diferentes no [contrato administrativo](/contratos/), com requisitos que não se parecem. Bater na porta errada custa o tempo inteiro do processo, e o tempo é o que você não tem.",
    },
    {
      tipo: "subtitulo",
      texto: "Três institutos, e eles não são sinônimos",
    },
    {
      tipo: "tabela",
      cabecalho: ["Instituto", "Corrige o quê", "Quando cabe", "Depende de pedido seu?"],
      linhas: [
        [
          "Reajustamento em sentido estrito, o que se chama de reajuste",
          "A perda inflacionária, pelo índice previsto no contrato",
          "Um ano depois da data-base, que é a do orçamento estimado",
          "Não. É automático e pode sair por simples apostila",
        ],
        [
          "Repactuação",
          "A variação real de custos, demonstrada em planilha",
          "Serviços contínuos com dedicação exclusiva ou predominância de mão de obra",
          "Sim. Depende de solicitação com planilha ou com o novo acordo coletivo",
        ],
        [
          "Revisão, também chamada de recomposição",
          "O desequilíbrio causado por um evento fora da álea normal",
          "Força maior, caso fortuito, fato do príncipe, fato imprevisível, e o fato da Administração em obras e serviços de engenharia",
          "Sim. Depende de pedido com prova documental do impacto",
        ],
      ],
    },
    {
      tipo: "captura",
      chamada:
        "Contrato desequilibrado é problema de margem, e margem se conserta em dois lugares: no contrato que já existe e no próximo que você disputa com o preço certo. No teste de 14 dias, sem cartão, o resumo manda nos dias úteis os editais abertos do seu recorte, com objeto, órgão, valor estimado e prazo, para a próxima proposta nascer com o custo de hoje.",
    },
    {
      tipo: "subtitulo",
      texto: "Reajuste: automático, anual, e sem aditivo",
    },
    {
      tipo: "paragrafo",
      texto:
        "A Lei chama de reajustamento em sentido estrito o que todo mundo chama de reajuste. O art. 6º, LVIII, define: aplicação do índice de correção monetária previsto no contrato, índice que deve retratar a variação efetiva do custo de produção, admitida a adoção de índices específicos ou setoriais. É o caminho mais simples e o mais mal compreendido, porque ele não depende de o contratado pedir. O entendimento da AGU registrado pelo TCU é que o reajuste é concedido automaticamente pelo contratante, sem necessidade de ato específico do contratado. E o art. 136, I, dispensa termo aditivo: a variação de valor para fazer face ao reajuste ou à repactuação previstos no contrato se registra por simples apostila.",
    },
    {
      tipo: "paragrafo",
      texto:
        "A data em que o relógio começa está na Lei e é obrigatória no papel. O art. 25, §7º, exige que o edital preveja índice de reajustamento com data-base vinculada à data do orçamento estimado, e o art. 92, §3º, repete a exigência como cláusula do contrato. O interregno mínimo é de um ano, pelo art. 25, §8º, e pelo art. 92, §4º, que também dizem qual critério se usa: reajustamento em sentido estrito quando não há dedicação exclusiva nem predominância de mão de obra, e repactuação quando há. A leitura do TCU acrescenta a contagem da Lei 10.192/2001, a partir da data limite para apresentação da proposta ou do orçamento a que ela se referir.",
    },
    {
      tipo: "destaque",
      texto:
        "Consequência prática que muda planilha: a data-base é a do orçamento estimado, não a da assinatura. Se entre um e outro passaram cinco meses, o primeiro reajuste não está a doze meses da assinatura, está a sete. Conferir essa data no edital antes de propor é o que separa um contrato de doze meses com um reajuste de um contrato de doze meses com nenhum.",
    },
    {
      tipo: "subtitulo",
      texto: "Repactuação: só para serviço com mão de obra, e sempre com planilha",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 6º, LIX, define repactuação como a forma de manutenção do equilíbrio usada para serviços contínuos com regime de dedicação exclusiva de mão de obra ou com predominância de mão de obra, por meio da análise da variação dos custos contratuais. Ela não corrige por índice: corrige por custo demonstrado.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Por isso o art. 135, §6º, determina que a repactuação seja precedida de solicitação do contratado, acompanhada da demonstração analítica da variação dos custos, por meio da planilha de custos e formação de preços, ou do novo acordo, convenção ou sentença normativa que a fundamenta. Pedido de repactuação sem planilha e sem o instrumento coletivo é pedido sem causa, e volta.",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 135 vincula cada parcela a uma data diferente, e é isso que decide o valor: os custos decorrentes do mercado ficam presos à data de apresentação da proposta (inciso I) e os custos de mão de obra ficam presos ao acordo, convenção ou dissídio coletivo a que a proposta esteja vinculada (inciso II). O §3º exige interregno mínimo de um ano, contado da apresentação da proposta ou da última repactuação. E o §4º permite dividir a repactuação em tantas parcelas quantas forem necessárias, justamente porque as duas anualidades vencem em datas diferentes. Um contrato pode, portanto, ter repactuação de insumos em um mês e de mão de obra em outro.",
    },
    {
      tipo: "subtitulo",
      texto: "Revisão: a álea extraordinária, e o que precisa ser provado",
    },
    {
      tipo: "paragrafo",
      texto:
        "A revisão, ou recomposição, é a porta do evento excepcional. O art. 124, II, d, prevê a alteração por acordo entre as partes para restabelecer o equilíbrio econômico-financeiro inicial do contrato em caso de força maior, caso fortuito ou fato do príncipe, ou em decorrência de fatos imprevisíveis ou previsíveis de consequências incalculáveis que inviabilizem a execução tal como pactuada, respeitada em qualquer caso a repartição objetiva de risco estabelecida no contrato. Essa última ressalva é o que o órgão lê primeiro: risco que o contrato alocou a você não vira desequilíbrio.",
    },
    {
      tipo: "paragrafo",
      texto:
        "O §2º do mesmo artigo estende a alínea d ao fato da Administração, mas só em obras e serviços de engenharia: quando a execução é obstada por atraso na conclusão de desapropriação, desocupação, servidão administrativa ou licenciamento ambiental, por circunstâncias alheias ao contratado. Já o art. 134 trata do caso mais fácil de provar, e vale para qualquer contrato: se, depois da data de apresentação da proposta, houver criação, alteração ou extinção de tributos ou encargos legais, ou superveniência de disposições legais, com comprovada repercussão sobre os preços, eles serão alterados, para mais ou para menos. Note o para menos: o reequilíbrio é uma via de mão dupla, e o órgão pode invocá-lo.",
    },
    {
      tipo: "destaque",
      texto:
        "O que reprova a maior parte dos pedidos de revisão não é a falta de direito, é a falta de prova. A orientação do TCU é que o reequilíbrio se baseie em documentação que demonstre de forma inequívoca que a alteração do custo dos insumos foi de magnitude tal que inviabiliza a execução. Nota fiscal de antes e de depois, tabela de fornecedor, índice setorial e a planilha refeita valem mais do que qualquer argumento escrito sobre o mercado.",
    },
    {
      tipo: "subtitulo",
      texto: "O prazo que ninguém conta: peça antes de prorrogar",
    },
    {
      tipo: "paragrafo",
      texto:
        "Este é o detalhe que custa dinheiro em silêncio, e ele está no parágrafo único do art. 131: o pedido de restabelecimento do equilíbrio econômico-financeiro deve ser formulado durante a vigência do contrato e antes de eventual prorrogação. Assinar o termo de prorrogação sem ter pedido é tratado como concordância com o preço vigente. A prorrogação é a porta fechando, e ela costuma chegar em um e-mail de rotina do fiscal.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Há um alívio do outro lado, no caput do mesmo artigo: a extinção do contrato não configura óbice para o reconhecimento do desequilíbrio econômico-financeiro, hipótese em que a indenização é concedida por meio de termo indenizatório. Contrato encerrado não apaga, por si só, o desequilíbrio que existiu durante a execução. O que apaga é a prorrogação aceita em silêncio.",
    },
    {
      tipo: "subtitulo",
      texto: "Como montar o pedido, em ordem",
    },
    {
      tipo: "passos",
      itens: [
        "Descubra qual é o instituto. Se o problema é inflação geral e já passou um ano, é reajuste, e ele deveria sair sem pedido. Se é serviço com mão de obra e saiu dissídio, é repactuação. Se foi um evento fora do normal, é revisão.",
        "Confira a data que inicia a contagem no edital e no contrato: data do orçamento estimado, data limite de apresentação da proposta, data-base da categoria. É ela que define se o direito já está maduro.",
        "Reúna a prova do impacto antes de escrever o pedido: planilha de custos original e refeita, notas fiscais de entrada, tabela do fornecedor, o acordo ou convenção coletiva, o ato normativo que criou ou alterou o tributo.",
        "Protocole por escrito, ainda na vigência do contrato e antes de qualquer prorrogação, indicando o dispositivo invocado e o valor pedido, item a item da planilha.",
        "Se o órgão demorar, guarde o protocolo e continue executando. Suspender a execução tem regra própria, e o [atraso no pagamento](/blog/atraso-no-pagamento-de-contrato-administrativo/) é um caso diferente deste, com prazos e efeitos próprios.",
      ],
    },
    {
      tipo: "destaque",
      texto:
        "Este texto descreve os institutos e os requisitos previstos na Lei nº 14.133/2021 e reproduzidos pelo portal do TCU. Se o aumento de custo do seu contrato configura álea extraordinária, qual o valor devido e como a planilha deve ser refeita, é análise que depende do contrato concreto, de contador e de advogado. O instituto e o requisito são fato; o número é trabalho técnico.",
    },
  ],
  faq: [
    {
      pergunta: "Qual a diferença entre reajuste, repactuação e revisão?",
      resposta:
        "Reajustamento em sentido estrito (art. 6º, LVIII) aplica o índice de correção previsto no contrato, é automático e observa o interregno de um ano. Repactuação (art. 6º, LIX, e art. 135) existe para serviços contínuos com dedicação exclusiva ou predominância de mão de obra e corrige pela variação real de custos demonstrada em planilha. Revisão, ou recomposição (art. 124, II, d), corrige o desequilíbrio causado por força maior, caso fortuito, fato do príncipe ou fato imprevisível, e exige prova documental do impacto.",
    },
    {
      pergunta: "Preciso pedir o reajuste para recebê-lo?",
      resposta:
        "Em regra não. O entendimento da AGU registrado pelo TCU é que o reajuste é concedido automaticamente pelo contratante, sem ato específico do contratado, e pode ser formalizado por simples apostilamento. A exceção é o edital que exija requerimento prévio e preveja expressamente a renúncia caso a prorrogação seja aceita sem o reajuste.",
    },
    {
      pergunta: "De quando conta o prazo de um ano para o reajuste?",
      resposta:
        "Da data-base, que o art. 25, §7º, e o art. 92, §3º, vinculam à data do orçamento estimado, e não à da assinatura do contrato. O interregno mínimo de um ano está no art. 25, §8º, e no art. 92, §4º. Na repactuação, o art. 135 vincula os custos de mercado à data de apresentação da proposta e os custos de mão de obra ao acordo, convenção ou dissídio a que a proposta esteja vinculada.",
    },
    {
      pergunta: "Posso pedir reequilíbrio depois de prorrogar o contrato?",
      resposta:
        "Pelo parágrafo único do art. 131, o pedido deve ser formulado durante a vigência e antes de eventual prorrogação. Prorrogar sem ter pedido é tratado como concordância com o preço vigente. Por outro lado, o caput do mesmo artigo estabelece que a extinção do contrato não configura óbice ao reconhecimento do desequilíbrio, caso em que a indenização sai por termo indenizatório.",
    },
    {
      pergunta: "Aumento de imposto dá direito a reequilíbrio?",
      resposta:
        "Pelo art. 134, se depois da data de apresentação da proposta houver criação, alteração ou extinção de tributos ou encargos legais, ou superveniência de disposições legais, com comprovada repercussão sobre os preços contratados, eles serão alterados, para mais ou para menos. É a hipótese mais objetiva de provar, porque o ato normativo é público e o efeito é calculável.",
    },
    {
      pergunta: "O que o órgão costuma exigir como prova?",
      resposta:
        "Documentação que demonstre de forma inequívoca que a variação do custo dos insumos foi de magnitude capaz de inviabilizar a execução como contratada. Na prática: planilha de custos original e refeita, notas fiscais de entrada antes e depois, tabelas de fornecedor, índices setoriais, e o acordo, convenção ou sentença normativa quando o custo for de mão de obra.",
    },
  ],
  fontes: [
    {
      titulo: "TCU, Licitações e Contratos: reequilíbrio econômico-financeiro (recomposição ou revisão)",
      url: "https://licitacoesecontratos.tcu.gov.br/6-2-2-1-1-reequilibrio-economico-financeiro-recomposicao-ou-revisao-2/",
      sustenta:
        "Hipóteses de revisão com base no art. 124, II, d, da Lei nº 14.133/2021 (força maior, caso fortuito, fato do príncipe, fato da Administração e fatos imprevisíveis), a alteração de preços por criação ou alteração de tributos do art. 134, a regra do art. 131 de que a extinção do contrato não impede o reconhecimento do desequilíbrio, a exigência de prova documental inequívoca e a regra de formular o pedido na vigência e antes de eventual prorrogação.",
    },
    {
      titulo: "TCU, Licitações e Contratos: reajuste em sentido estrito",
      url: "https://licitacoesecontratos.tcu.gov.br/6-2-2-1-2-reajuste-em-sentido-estrito/",
      sustenta:
        "Definição do art. 6º, LVIII, da Lei nº 14.133/2021, a regra de anualidade contada da data do orçamento estimado ou do último reajustamento, a contagem da Lei 10.192/2001 a partir da data limite de apresentação da proposta, o entendimento da AGU sobre a concessão automática do reajuste e a formalização por apostilamento.",
    },
    {
      titulo: "TCU, Licitações e Contratos: repactuação",
      url: "https://licitacoesecontratos.tcu.gov.br/6-2-2-1-3-repactuacao/",
      sustenta:
        "Definição do art. 6º, LIX, da Lei nº 14.133/2021, a restrição a serviços contínuos com dedicação exclusiva ou predominância de mão de obra, a exigência do art. 135 de planilha com demonstração analítica da variação de custos ou do novo acordo, convenção ou sentença normativa, e o interregno de um ano contado da proposta para custos de mercado e da data-base para custos de mão de obra.",
    },
    {
      titulo: "Lei nº 14.133, de 1º de abril de 2021 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
      sustenta:
        "Texto das definições do art. 6º, LVIII e LIX; do art. 25, §§ 7º e 8º, e do art. 92, §§ 3º e 4º, que vinculam a data-base à data do orçamento estimado e fixam o interregno de um ano; do art. 124, II, d, e §2º; do art. 131, caput e parágrafo único; do art. 134; do art. 135, incisos I e II e §§ 3º, 4º e 6º; e do art. 136, I.",
    },
    {
      titulo: "Portal Nacional de Contratações Públicas",
      url: "https://www.pncp.gov.br/",
      sustenta:
        "Fonte oficial de divulgação dos editais e contratos em que o índice de reajuste, a data do orçamento estimado e a alocação de riscos de cada contratação são fixados.",
    },
  ],
  publicado: true,
};
