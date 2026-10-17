import type { Artigo } from "../tipos";

/**
 * Quinto post do plano de SEO de 16/10/2026, apoio de /jurisprudencia/.
 *
 * Fontes conferidas em 17/10/2026:
 * - Lei 14.133 no Planalto: art. 9º, I, "a" a "c"; art. 41, I; art. 67,
 *   §§ 1º, 2º e 5º; art. 69, §§ 2º, 4º e 5º; arts. 42, 70, 87, 164, 165
 *   e 170.
 * - Súmulas 263, 270, 272, 274 e 275 do TCU, no texto já publicado em
 *   /sumulas-tcu/.
 * - Acórdãos com enunciado na página oficial do TCU
 *   licitacoesecontratos.tcu.gov.br/5-5-habilitacao-2/: 1622/2025-Plenário
 *   (registro cadastral como condição de habilitação; rol taxativo dos arts.
 *   66 a 69) e 966/2022-Plenário (laudos e certificados de qualidade fora da
 *   habilitação, julgado sob a Lei 8.666).
 *
 * Revisão: a Lei 14.133 não proíbe cumular capital mínimo com garantia (a
 * Súmula 275 interpretava o art. 31 da Lei 8.666); há tribunais de contas que
 * admitem a cumulação (TCE-MG, visto só em trecho de busca, não citado). O
 * texto trata a súmula como argumento, não como vedação.
 *
 * O texto não diz que alguma cláusula "é ilegal" em abstrato. Mostra o
 * dispositivo e o enunciado, e deixa a conclusão sobre o edital concreto para
 * quem o lê com o advogado.
 */
export const EXIGENCIA_ABUSIVA_EM_EDITAL: Artigo = {
  slug: "exigencia-abusiva-em-edital",
  tituloDaBusca: "Exigência abusiva em edital: como reconhecer",
  titulo: "Como saber se uma exigência do edital é abusiva?",
  descricao:
    "Os casos de exigência que restringe a competição, o que a Lei 14.133 e o TCU dizem sobre cada um e quando impugnar ou só pedir esclarecimento.",
  resumo:
    "Exigência abusiva é a que restringe a competição sem base na lei ou sem relação com o objeto. A Lei 14.133 proíbe isso no art. 9º e traz limites em número para atestado e capital, e o TCU tem súmulas e acórdãos sobre os casos mais comuns: marca, atestado em excesso, cadastro prévio e certificado na habilitação. O remédio é a impugnação, até 3 dias úteis antes da abertura.",
  intencao: "operacional",
  termoPrincipal: "exigência abusiva em edital",
  guiaRelacionado: "/jurisprudencia/",
  publicadoEm: "2026-10-17",
  verificadoEm: "2026-10-17",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "Exigência abusiva em edital é a cláusula que afasta concorrentes sem que a lei a autorize ou sem que o objeto precise dela. A Lei nº 14.133/2021 dá o critério no art. 9º: salvo os casos previstos em lei, o agente público não pode admitir, prever, incluir ou tolerar situações que comprometam, restrinjam ou frustrem o caráter competitivo da licitação, que estabeleçam preferências ou distinções pela naturalidade, sede ou domicílio dos licitantes, ou que sejam impertinentes ou irrelevantes para o objeto do contrato.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Na habilitação, há um segundo critério, mais objetivo. O TCU entende que os requisitos de habilitação dos arts. 66 a 69 formam um rol taxativo: o que não está lá não pode ser exigido como condição para habilitar (Acórdão 1622/2025-Plenário). A pergunta certa diante de uma cláusula estranha é, então, \"em que artigo isso está?\". Além dos arts. 66 a 69, a lei prevê na habilitação algumas declarações e a vistoria do art. 63, e os requisitos de lei especial do art. 67, IV.",
    },
    {
      tipo: "subtitulo",
      texto: "Os casos mais comuns, e o que diz cada fonte",
    },
    {
      tipo: "tabela",
      cabecalho: ["Exigência", "O limite", "Fonte"],
      linhas: [
        [
          "Marca específica",
          "Só excepcionalmente e com justificativa formal: padronização, compatibilidade com o que já existe, marca ou modelo vendido por mais de um fornecedor que seja o único capaz de atender, ou marca como mera referência",
          "Lei 14.133, art. 41, I; Súmula 270 (justificativa prévia)",
        ],
        [
          "Atestado de item pequeno ou de quantidade cheia",
          "Só das parcelas de 4% ou mais do valor total estimado, e com quantidade mínima de até 50% delas",
          "Lei 14.133, art. 67, §§ 1º e 2º; Súmula 263",
        ],
        [
          "Atestado limitado por época ou local (\"últimos 2 anos\", \"no estado X\")",
          "Vedadas as limitações de tempo e de locais específicos. Em serviço contínuo, a duração mínima da experiência pode ser exigida, até 3 anos",
          "Lei 14.133, art. 67, §§ 2º e 5º",
        ],
        [
          "Faturamento mínimo",
          "Vedado, assim como índices de rentabilidade ou lucratividade",
          "Lei 14.133, art. 69, § 2º",
        ],
        [
          "Capital ou patrimônio líquido mínimo",
          "Só em compras para entrega futura e em obras e serviços, e até 10% do valor estimado",
          "Lei 14.133, art. 69, § 4º",
        ],
        [
          "Índice contábil fora do comum",
          "Vedados índices e valores não usualmente adotados",
          "Lei 14.133, art. 69, § 5º",
        ],
        [
          "Estrutura antes do contrato (sede local, frota, equipe)",
          "Vedado exigir custo que só seria necessário depois de assinado o contrato. O edital pode pedir a indicação de pessoal, instalações e aparelhamento disponíveis, não a sua contratação prévia",
          "Súmula 272; Lei 14.133, arts. 9º, I, \"b\" (sede), e 67, III",
        ],
        [
          "Cadastro prévio (SICAF ou registro do órgão)",
          "Não pode ser condição de habilitação. Exceção: licitação restrita a cadastrados, que deve aceitar quem se cadastrar até o prazo das propostas",
          "Súmula 274; Acórdão 1622/2025-Plenário; Lei 14.133, art. 87, §§ 3º e 4º",
        ],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Dois cuidados ao usar a tabela. Primeiro, sobre capital: a Súmula 275, editada sob a Lei 8.666, tratava capital social mínimo, patrimônio líquido mínimo e garantias como alternativas, \"de forma não cumulativa\". A Lei 14.133 fala em capital ou patrimônio líquido até 10% e não repete a regra da não cumulação. É argumento possível, não vedação expressa. Segundo, a Súmula 263 não proíbe o quantitativo mínimo: ela o admite, limitado às parcelas relevantes e proporcional ao objeto. O que se contesta é o excesso, e o argumento é aritmético. A conta está em [atestado de capacidade técnica](/blog/atestado-de-capacidade-tecnica/).",
    },
    {
      tipo: "subtitulo",
      texto: "O que o TCU já decidiu",
    },
    {
      tipo: "paragrafo",
      texto:
        "No Acórdão 1622/2025, o Plenário do TCU considerou irregular exigir registro cadastral emitido por órgão público como condição de habilitação, porque ele não está no rol taxativo dos arts. 66 a 69 da Lei 14.133. O registro cadastral pode substituir documentos quando o edital prevê (art. 70, II), mas é facultativo. É a mesma linha da Súmula 274, que veda exigir inscrição prévia no SICAF.",
    },
    {
      tipo: "paragrafo",
      texto:
        "No Acórdão 966/2022, julgado ainda sob a Lei 8.666, o Plenário considerou ilegal exigir na habilitação laudos, testes ou certificados de qualidade dos produtos, por não estarem no rol da habilitação técnica. Admitiu a exigência na fase de julgamento das propostas, se prevista no edital, só do primeiro colocado e com prazo suficiente para obter o documento. A Lei 14.133 segue a mesma lógica: a certificação de qualidade do produto entra como condição de aceitação da proposta (art. 42, § 1º), e a amostra ou prova de conceito, quando exigida no julgamento, só do licitante provisoriamente vencedor (art. 41, II e parágrafo único).",
    },
    {
      tipo: "paragrafo",
      texto:
        "Estas são duas decisões entre muitas. A coleção completa, organizada por tema, está em [jurisprudência do TCU](/jurisprudencia/) e em [súmulas do TCU](/sumulas-tcu/).",
    },
    {
      tipo: "captura",
      chamada: "Baixe o modelo de impugnação de edital",
      material: "modelo-de-impugnacao",
    },
    {
      tipo: "subtitulo",
      texto: "Impugnar ou pedir esclarecimento?",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 164 dá as duas ferramentas a qualquer pessoa, com o mesmo prazo: protocolar até 3 dias úteis antes da abertura do certame. A resposta tem de sair em até 3 dias úteis, limitada ao último dia útil antes da abertura. A escolha entre uma e outra depende do que você tem nas mãos.",
    },
    {
      tipo: "lista",
      itens: [
        "Peça esclarecimento quando a cláusula é ambígua e uma leitura dela seria legal. A resposta é divulgada em sítio eletrônico oficial (art. 164, parágrafo único), fica à vista de todos e às vezes resolve sem conflito.",
        "Impugne quando a cláusula, lida como está escrita, contraria a lei, citando também a súmula do TCU que a interpreta, se houver. Aponte o item do edital, o dispositivo violado e o efeito concreto: quantas empresas ficam de fora, que custo desnecessário a exigência cria.",
        "Não deixe para a sessão. Passado o prazo do art. 164, a impugnação fica fora de tempo. Restam a representação ao tribunal de contas ou ao controle interno (art. 170, § 4º), o recurso se você for inabilitado (art. 165, I, \"c\") e a via judicial: caminhos mais lentos e sem garantia de suspender o certame.",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Como contar o prazo de 3 dias úteis sem errar está em [prazo para impugnar edital](/blog/prazo-para-impugnar-edital-de-licitacao/). E a lista dos documentos que o edital pode pedir, e só esses, está no guia de [habilitação](/habilitacao/).",
    },
    {
      tipo: "destaque",
      texto:
        "Este texto reúne o que a Lei 14.133 e o TCU dizem sobre exigências comuns. Se a cláusula de um edital específico é abusiva depende do objeto e da justificativa no processo, e é análise para fazer com o seu advogado. Súmula e acórdão do TCU orientam a esfera federal; em licitação estadual ou municipal, confira também o entendimento do tribunal de contas local.",
    },
  ],
  faq: [
    {
      pergunta: "O que é exigência abusiva em edital?",
      resposta:
        "É a cláusula que restringe a competição sem base na lei ou sem relação com o objeto. O art. 9º, I, da Lei nº 14.133/2021 proíbe situações que restrinjam o caráter competitivo, que favoreçam a sede do licitante ou que sejam impertinentes para o objeto.",
    },
    {
      pergunta: "O edital pode exigir marca?",
      resposta:
        "Só excepcionalmente e com justificativa formal, nas hipóteses do art. 41, I: padronização, compatibilidade com plataformas já adotadas, marca ou modelo vendido por mais de um fornecedor que seja o único capaz de atender, ou marca como referência. A Súmula 270 do TCU também exige justificativa prévia.",
    },
    {
      pergunta: "O edital pode exigir capital social mínimo e garantia ao mesmo tempo?",
      resposta:
        "A Lei 14.133 limita capital ou patrimônio líquido mínimo a 10% do valor estimado, em compras para entrega futura e em obras e serviços (art. 69, § 4º), e não proíbe expressamente somar garantia. A Súmula 275 do TCU, editada sob a Lei 8.666, tratava essas exigências como não cumulativas, e pode servir de argumento, não de vedação.",
    },
    {
      pergunta: "O edital pode exigir cadastro no SICAF para habilitar?",
      resposta:
        "Como condição de habilitação, não. A Súmula 274 do TCU veda exigir inscrição prévia no SICAF, e o Acórdão 1622/2025-Plenário considerou irregular exigir registro cadastral para habilitar. A exceção é a licitação restrita a cadastrados (art. 87, § 3º), que deve aceitar quem se cadastrar dentro do prazo das propostas.",
    },
    {
      pergunta: "Qual o prazo para impugnar uma exigência abusiva?",
      resposta:
        "Até 3 dias úteis antes da data de abertura do certame (art. 164 da Lei nº 14.133/2021). O mesmo prazo vale para o pedido de esclarecimento.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, arts. 9º, 41, 42, 63, 67, 69, 70, 87, 164, 165 e 170 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art9",
      sustenta:
        "Vedação a cláusulas restritivas (art. 9º, I); marca e amostra (art. 41); certificação de qualidade (art. 42, § 1º); limites do atestado e indicação de pessoal (art. 67, III, §§ 1º, 2º e 5º); faturamento, capital e índices (art. 69, §§ 2º, 4º e 5º); registro cadastral (arts. 70, II, e 87); impugnação e esclarecimento (art. 164); recurso (art. 165); representação (art. 170, § 4º).",
    },
    {
      titulo: "TCU, Licitações e Contratos: habilitação (Acórdãos 1622/2025 e 966/2022-Plenário)",
      url: "https://licitacoesecontratos.tcu.gov.br/5-5-habilitacao-2/",
      sustenta:
        "Rol taxativo da habilitação e irregularidade do registro cadastral como condição; laudos e certificados de qualidade fora da habilitação.",
    },
    {
      titulo: "TCU, pesquisa de súmulas (Súmulas 263, 270, 272, 274 e 275)",
      url: "https://pesquisa.apps.tcu.gov.br/pesquisa/sumula",
      sustenta:
        "Quantitativo mínimo proporcional; marca com justificativa; custos anteriores ao contrato; SICAF prévio; capital, patrimônio e garantia como alternativas, sob a Lei 8.666.",
    },
  ],
  publicado: true,
};
