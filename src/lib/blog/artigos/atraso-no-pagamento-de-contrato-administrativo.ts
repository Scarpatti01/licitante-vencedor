import type { Artigo } from "../tipos";

/**
 * Primeiro artigo do hub de contratos — que até aqui não tinha nenhum.
 *
 * Escolhido pela mesma lógica do artigo de impugnação: a dor é ditada pela
 * própria norma, não por uma promessa deste texto sobre o que vai acontecer.
 * Diferente dos outros três artigos, que ficam antes ou durante a disputa,
 * este fica DEPOIS — a empresa já venceu, já executou, e o problema é o órgão
 * não pagar. É o momento em que "vender para o governo" deixa de ser teórico
 * e vira fluxo de caixa parado.
 *
 * O risco de virar consultoria jurídica é o mesmo de sempre, e a linha
 * adotada também: os prazos e os direitos do art. 137/138 são fato verificável
 * na lei; se cabe suspender ou extinguir O SEU contrato, com que fundamento e
 * que efeito sobre garantia e eventual multa, é análise que depende do
 * contrato concreto e de advogado.
 *
 * Conferido contra o portal Licitações e Contratos do TCU — o Planalto
 * respondeu 503 nas tentativas de verificação (mesmo problema documentado no
 * artigo de impugnação), e citar sem ler não é uma opção neste repositório.
 * As citações de art. 137 e 138 vêm reproduzidas literalmente naquele portal,
 * inciso por inciso — não é paráfrase de segunda mão.
 */
export const ATRASO_NO_PAGAMENTO: Artigo = {
  slug: "atraso-no-pagamento-de-contrato-administrativo",
  titulo: "Atraso no pagamento de contrato administrativo: o que a Lei 14.133 garante",
  descricao:
    "Atraso superior a 2 meses no pagamento dá ao contratado o direito de suspender a execução ou pedir a extinção do contrato, com indenização.",
  resumo:
    "A Lei 14.133/2021 não fixa um prazo único de pagamento — quem define isso é o edital e o contrato, na fase de planejamento. Mas ela é clara sobre o que acontece quando o órgão atrasa demais: passados 2 meses da nota fiscal sem pagamento, o contratado tem o direito de suspender a execução do contrato ou pedir a extinção dele, com direito a indenização. Este texto reúne os artigos que sustentam isso e o que fazer antes de chegar lá.",
  intencao: "operacional",
  termoPrincipal: "atraso no pagamento de contrato administrativo",
  guiaRelacionado: "/contratos/",
  publicadoEm: "2026-08-21",
  verificadoEm: "2026-08-21",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "Ganhar a licitação e executar o contrato deveria ser a parte fácil. Na prática, para muita PME o momento mais tenso não é a sessão de disputa — é a nota fiscal emitida, o serviço entregue, e o pagamento que não cai. Diferente de um cliente privado que atrasa, aqui o devedor é o próprio Estado, e a primeira dúvida costuma ser: isso é normal, ou já dá para fazer alguma coisa?",
    },
    {
      tipo: "subtitulo",
      texto: "A Lei não fixa um prazo único — quem fixa é o SEU contrato",
    },
    {
      tipo: "paragrafo",
      texto:
        "A [Lei 14.133/2021](/lei-14133/) rompeu com a antiga regra de prazo fixo da Lei 8.666/93 e não estabelece, ela mesma, um número de dias válido para todo [contrato administrativo](/contratos/) do país. O que ela manda é que o prazo seja razoável e fixado durante a fase de planejamento da contratação — ou seja, ele está no edital e no contrato específicos que você assinou, e é ali que precisa ser conferido primeiro, antes de qualquer conta feita de memória.",
    },
    {
      tipo: "destaque",
      texto:
        "Exemplo real, não regra universal: para os órgãos da administração pública federal direta, autárquica e fundacional do Poder Executivo, a Instrução Normativa Seges/ME nº 77/2022 limita o prazo a 10 dias úteis para a Administração liquidar a despesa a partir do recebimento da nota fiscal, mais 10 dias úteis para efetivar o pagamento depois de liquidada — cerca de 20 dias úteis, na ponta. Isso vale para aquela esfera específica; estados, municípios e autarquias podem ter prazo diferente, definido em regulamento ou no próprio instrumento.",
    },
    {
      tipo: "captura",
      chamada:
        "Enquanto o pagamento de um contrato está travado, parar de disputar novas oportunidades é o pior momento para isso — é exatamente quando o caixa mais precisa de outra frente. O Licitante Vencedor continua lendo os editais publicados todo dia útil e mandando os que combinam com o perfil da sua empresa, para o funil não parar enquanto você resolve o contrato em atraso.",
    },
    {
      tipo: "subtitulo",
      texto: "Quando o atraso vira direito de suspender ou encerrar o contrato",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 137 da Lei 14.133/2021 lista as hipóteses em que uma falha da Administração dá ao contratado o direito de pedir a extinção do contrato — e o atraso no pagamento é uma delas, com um número exato de dias.",
    },
    {
      tipo: "tabela",
      cabecalho: ["Hipótese (art. 137, §2º)", "O que configura"],
      linhas: [
        [
          "Inciso IV — a que mais interessa aqui",
          "Atraso superior a 2 (dois) meses, contado da emissão da nota fiscal, dos pagamentos ou de parcelas de pagamentos devidos pela Administração",
        ],
        [
          "Inciso II",
          "Suspensão de execução do contrato, por ordem escrita da Administração, por prazo superior a 3 (três) meses",
        ],
        [
          "Inciso III",
          "Suspensões repetidas que somem 90 (noventa) dias úteis",
        ],
        [
          "Inciso I",
          "Supressão de obras, serviços ou compras que altere o valor inicial do contrato além do limite do art. 125",
        ],
        [
          "Inciso V",
          "Não liberação de área, local ou objeto necessário à execução, nos prazos contratuais",
        ],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "O §3º do mesmo artigo faz duas ressalvas importantes. A primeira (inciso I) é que essas hipóteses não valem em caso de calamidade pública, grave perturbação da ordem interna ou guerra, nem quando o próprio contratado tiver dado causa ao problema. A segunda (inciso II) é a que mais importa na prática: diante de qualquer uma dessas hipóteses, o contratado não é obrigado a já pedir o fim do contrato — ele pode optar por suspender o cumprimento das obrigações assumidas até a situação se normalizar, com direito ao restabelecimento do equilíbrio econômico-financeiro do contrato quando a execução voltar.",
    },
    {
      tipo: "destaque",
      texto:
        "Na prática: passados os 2 meses sem receber, você tem duas portas, não uma só. Pedir a extinção do contrato é uma delas. Suspender a execução até a Administração pagar — sem romper o contrato — é a outra, e costuma ser a mais usada por quem quer manter a relação e voltar a executar assim que o pagamento normalizar.",
    },
    {
      tipo: "subtitulo",
      texto: "Se a extinção acontecer por culpa da Administração, o que você recebe",
    },
    {
      tipo: "paragrafo",
      texto:
        "Quando a extinção do contrato se dá por culpa exclusiva da Administração, o art. 138, §2º, garante ao contratado o ressarcimento pelos prejuízos regularmente comprovados que tiver sofrido, além do direito a três coisas específicas: devolução da garantia contratual, pagamento do que já era devido pela execução até a data da extinção, e pagamento do custo da desmobilização. Nenhuma dessas parcelas depende de acordo com o órgão — são direito do contratado nessa hipótese.",
    },
    {
      tipo: "subtitulo",
      texto: "Antes de suspender ou pedir extinção: o caminho recomendável",
    },
    {
      tipo: "passos",
      itens: [
        "Confira o prazo de pagamento definido no SEU edital e contrato — é ele que vale, não uma regra genérica. Se o instrumento for omisso, o prazo tem de ser razoável, mas 'razoável' é discussão que se resolve melhor com o número do seu contrato em mãos.",
        "Reúna as datas: emissão da nota fiscal ou instrumento de cobrança equivalente, protocolo, e qualquer confirmação de recebimento pelo órgão. É a partir da emissão da nota fiscal que a Lei conta o prazo de 2 meses do art. 137, §2º, IV.",
        "Notifique o órgão formalmente antes de qualquer medida — por escrito, cobrando o pagamento e registrando o atraso. Boa parte dos casos se resolve nesta etapa, sem precisar de suspensão ou extinção.",
        "Se o atraso passar de 2 meses, avalie com o contrato em mãos (e, idealmente, com o seu advogado) se compensa suspender a execução — mantendo o vínculo e o direito ao reequilíbrio — ou pedir a extinção, com o ressarcimento do art. 138.",
        "Documente cada etapa. Suspender execução sem lastro formal, ou sem cumprir os requisitos da Lei, pode ser lido como inadimplemento SEU — o que inverteria a posição de quem está certo na disputa.",
      ],
    },
    {
      tipo: "destaque",
      texto:
        "Este texto descreve direitos e prazos previstos na Lei nº 14.133/2021. Se suspender a execução ou pedir a extinção é a melhor decisão para o SEU contrato, e com que efeito sobre multa, garantia e relação futura com o órgão, é análise que depende do contrato concreto e do seu advogado. O prazo e o direito são fato; a estratégia é trabalho jurídico.",
    },
  ],
  faq: [
    {
      pergunta: "Depois de quanto tempo de atraso eu posso suspender ou encerrar o contrato administrativo?",
      resposta:
        "Após 2 (dois) meses contados da emissão da nota fiscal, sem que a Administração tenha pago, o art. 137, §2º, IV, da Lei 14.133/2021 dá ao contratado o direito de pedir a extinção do contrato. O §3º, II, do mesmo artigo permite, alternativamente, suspender o cumprimento das obrigações até a situação se normalizar, sem romper o contrato.",
    },
    {
      pergunta: "A Lei 14.133 fixa um prazo máximo de dias para o órgão pagar?",
      resposta:
        "Não um prazo único nacional. A Lei manda que o prazo seja razoável e definido na fase de planejamento da contratação, ou seja, no edital e no contrato específicos. Cada ente ou órgão pode regulamentar prazos próprios — a administração pública federal direta, por exemplo, usa 10 dias úteis para liquidar mais 10 dias úteis para pagar, pela IN Seges/ME 77/2022.",
    },
    {
      pergunta: "Se eu suspender a execução, perco o direito ao contrato?",
      resposta:
        "Não necessariamente. O art. 137, §3º, II, trata a suspensão como uma opção do contratado até a situação se normalizar, com direito ao restabelecimento do equilíbrio econômico-financeiro do contrato — diferente de pedir a extinção, que encerra o vínculo.",
    },
    {
      pergunta: "O que eu recebo se o contrato for extinto por culpa da Administração?",
      resposta:
        "Pelo art. 138, §2º, o contratado é ressarcido pelos prejuízos regularmente comprovados e tem direito à devolução da garantia contratual, ao pagamento do que já era devido pela execução até a data da extinção, e ao pagamento do custo da desmobilização.",
    },
    {
      pergunta: "Esses direitos valem em qualquer situação de atraso?",
      resposta:
        "Não. O art. 137, §3º, I, exclui expressamente os casos de calamidade pública, grave perturbação da ordem interna ou guerra, e também quando o próprio contratado tiver praticado, participado ou contribuído para o problema.",
    },
  ],
  fontes: [
    {
      titulo: "TCU — Licitações e Contratos: pagamento",
      url: "https://licitacoesecontratos.tcu.gov.br/6-1-7-pagamento/",
      sustenta:
        "A Lei 14.133/2021 não fixa prazo único de pagamento — determina prazo razoável definido na fase de planejamento; reprodução da regra federal de 10 + 10 dias úteis da IN Seges/ME 77/2022 e da regra de extinção por atraso superior a 2 meses da nota fiscal.",
    },
    {
      titulo: "TCU — Licitações e Contratos: inadimplemento por culpa da Administração",
      url: "https://licitacoesecontratos.tcu.gov.br/6-4-3-3-inadimplemento-por-culpa-da-administracao/",
      sustenta:
        "Reprodução literal dos incisos I a V do art. 137, §2º, dos incisos I e II do §3º, e do §2º do art. 138 da Lei nº 14.133/2021 — hipóteses de extinção por culpa da Administração, direito de suspensão e ressarcimento devido.",
    },
    {
      titulo: "Portal Nacional de Contratações Públicas",
      url: "https://www.pncp.gov.br/",
      sustenta:
        "Fonte oficial de divulgação dos contratos e dos instrumentos convocatórios em que o prazo de pagamento específico de cada contratação é fixado.",
    },
  ],
  publicado: true,
};
