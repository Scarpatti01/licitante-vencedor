import { DISPENSA_POR_VALOR, REAJUSTE_VIGENTE, emReais } from "../../dominio/limites-legais";
import type { Artigo } from "../tipos";

/**
 * Quarto post do plano de SEO de 16/10/2026, apoio de /lei-14133/.
 *
 * Fontes conferidas em 17/10/2026 no texto da Lei 14.133 no Planalto: arts.
 * 72 (instrução da contratação direta e divulgação), 73 (responsabilidade
 * solidária), 74 (inexigibilidade, incisos e §§ 1º a 5º), 75 (dispensa,
 * incisos I, II, III e VIII) e 79 (credenciamento). Súmula 39 do TCU no texto
 * já publicado em /sumulas-tcu/.
 *
 * Os valores do art. 75 saem de `limites-legais.ts`, nunca em prosa.
 *
 *
 * Cuidado com a Súmula 39: ela foi escrita sob o art. 25, II, da Lei 8.666 e
 * exige "natureza singular". O art. 74, III, da Lei 14.133 não repete a
 * palavra, e o Manual de Licitações e Contratos do TCU (5.10.1.3) diz que a
 * nova lei "suprimiu a singularidade do objeto". Manual é orientação, não
 * acórdão; não achei acórdão posterior à 14.133 sobre o ponto.
 *
 * Inciso VIII do art. 75: o STF, na ADI 6890, deu interpretação conforme à
 * vedação de recontratação. Tese conferida no Informativo STF 1149.
 *
 * Taxatividade do art. 75 e caráter exemplificativo do art. 74: Manual do
 * TCU, seções 5.10.2 e 5.10.1.
 *
 * A captura não fala de contratação direta: o resumo consulta só o que está
 * com proposta aberta no PNCP, o que não inclui a inexigibilidade.
 */
const OBRAS = emReais(DISPENSA_POR_VALOR.obrasEEngenharia);
const COMPRAS = emReais(DISPENSA_POR_VALOR.comprasEServicos);
const ANO = REAJUSTE_VIGENTE.ano;

export const DISPENSA_E_INEXIGIBILIDADE: Artigo = {
  slug: "dispensa-e-inexigibilidade",
  tituloDaBusca: "Dispensa e inexigibilidade: qual a diferença",
  titulo: "Qual a diferença entre dispensa e inexigibilidade de licitação?",
  descricao:
    "Na dispensa, a licitação seria possível, mas a lei deixa não fazer. Na inexigibilidade, não há como competir. As principais hipóteses, lado a lado.",
  resumo:
    "Dispensa e inexigibilidade são as duas formas de contratação direta da Lei 14.133. Na dispensa (art. 75), a competição seria possível, mas a lei autoriza não licitar, como na compra de pequeno valor ou na emergência. Na inexigibilidade (art. 74), a competição é inviável, como no fornecedor exclusivo. Nas duas, o órgão precisa justificar a escolha e o preço.",
  intencao: "informacional",
  termoPrincipal: "dispensa e inexigibilidade",
  guiaRelacionado: "/lei-14133/",
  publicadoEm: "2026-10-17",
  verificadoEm: "2026-10-17",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "A diferença cabe numa frase: na dispensa, dava para licitar, mas a lei deixa não licitar; na inexigibilidade, não dá para licitar, porque não há competição possível. As duas são contratação direta, a exceção à regra de que o poder público compra por licitação, e a [Lei nº 14.133/2021](/lei-14133/) trata de cada uma num artigo próprio.",
    },
    {
      tipo: "subtitulo",
      texto: "Dispensa: a lei permite não licitar (art. 75)",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 75 diz quando a licitação \"é dispensável\". A lista é fechada, como diz o próprio manual do TCU, e nessas hipóteses a competição em geral seria possível: o legislador decidiu que licitar não compensa ou não dá tempo. As hipóteses que mais aparecem para quem vende são estas:",
    },
    {
      tipo: "lista",
      itens: [
        `Pequeno valor (incisos I e II): em ${ANO}, abaixo de ${OBRAS} para obras, serviços de engenharia e manutenção de veículos, e abaixo de ${COMPRAS} para outros serviços e compras, somando o que a unidade gasta no ano com objetos do mesmo ramo. Os detalhes estão em [limites de dispensa](/limites/).`,
        "Licitação deserta ou fracassada (inciso III): quando, numa licitação feita há menos de 1 ano, não apareceram interessados, não houve proposta válida ou os preços ficaram manifestamente acima do mercado, e a contratação mantém todas as condições daquele edital.",
        "Emergência ou calamidade pública (inciso VIII): quando a urgência ameaça a continuidade de serviço público ou a segurança de pessoas e bens, só para o necessário ao atendimento da situação e para parcelas que possam ser concluídas em até 1 ano da ocorrência. A lei veda a prorrogação e a recontratação da empresa com base nesse inciso; o STF (ADI 6890) decidiu que a vedação vale para a recontratação pela mesma emergência além de 1 ano, e que a empresa pode disputar a licitação que vier depois e ser contratada em outra emergência.",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Para o fornecedor, a dispensa por valor é a mais acessível: a lei manda que ela seja, preferencialmente, precedida de aviso em sítio oficial por no mínimo 3 dias úteis (art. 75, § 3º), e na esfera federal ela corre como [dispensa eletrônica](/blog/dispensa-eletronica/), com aviso obrigatório e disputa de lances.",
    },
    {
      tipo: "subtitulo",
      texto: "Inexigibilidade: não há como competir (art. 74)",
    },
    {
      tipo: "paragrafo",
      texto:
        "O art. 74 diz que a licitação é inexigível \"quando inviável a competição\", e dá exemplos com a expressão \"em especial\". Por isso a lista do art. 74 não é fechada como a do art. 75: o que define a inexigibilidade é a inviabilidade de competir, e os incisos são os casos típicos.",
    },
    {
      tipo: "lista",
      itens: [
        "Fornecedor exclusivo (inciso I): material, equipamento, gênero ou serviço que só um produtor, empresa ou representante comercial exclusivo fornece. O órgão tem de provar a exclusividade com atestado, contrato, declaração do fabricante ou outro documento idôneo, e a lei veda a preferência por marca (§ 1º).",
        "Profissional do setor artístico (inciso II): consagrado pela crítica ou pelo público, contratado direto ou por empresário exclusivo. Empresário com representação só para um evento ou local não serve (§ 2º).",
        "Serviço técnico especializado de natureza predominantemente intelectual, com profissional ou empresa de notória especialização (inciso III): estudos e projetos, pareceres, assessorias, auditorias, treinamento e os demais listados nas alíneas \"a\" a \"h\". A inexigibilidade é vedada para publicidade e divulgação, e o serviço não pode ser subcontratado nem executado por profissionais diferentes dos que justificaram a inexigibilidade (§ 4º).",
        "Credenciamento (inciso IV): chamamento público em que a Administração convoca interessados para, cumpridos os requisitos, se credenciarem e executarem o objeto quando convocados (art. 6º, XLIII), nas hipóteses do art. 79, por exemplo contratações simultâneas em condições padronizadas.",
        "Imóvel cujas instalações e localização tornem necessária a escolha (inciso V), com avaliação prévia, certificação de que não há imóvel público disponível e justificativa da singularidade (§ 5º).",
      ],
    },
    {
      tipo: "subtitulo",
      texto: "Lado a lado",
    },
    {
      tipo: "tabela",
      cabecalho: ["", "Dispensa", "Inexigibilidade"],
      linhas: [
        ["Artigo", "Art. 75", "Art. 74"],
        ["Competição", "Possível, mas a lei autoriza não licitar", "Inviável"],
        ["Lista de hipóteses", "Fechada", "Exemplificativa (\"em especial\")"],
        ["Exemplo típico", "Compra de pequeno valor; emergência", "Fornecedor exclusivo; notória especialização"],
        ["Instrução do processo", "Art. 72", "Art. 72"],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "O que as duas têm em comum é o processo. Pelo art. 72, toda contratação direta precisa ser instruída com a formalização da demanda, a estimativa de despesa, os pareceres quando for o caso, a compatibilidade com a previsão orçamentária, a comprovação de que o contratado tem habilitação e qualificação mínimas, a razão da escolha do contratado, a justificativa de preço e a autorização da autoridade competente. O ato que autoriza a contratação, ou o extrato do contrato, tem de ser divulgado em sítio eletrônico oficial (parágrafo único).",
    },
    {
      tipo: "subtitulo",
      texto: "O que muda para quem vende",
    },
    {
      tipo: "paragrafo",
      texto:
        "Se você é o fornecedor exclusivo ou tem notória especialização, a inexigibilidade é uma porta para vender sem disputa, mas o órgão vai pedir a prova: o atestado de exclusividade, no inciso I, ou o histórico que demonstre a especialização, no inciso III. Se você é o concorrente que ficou de fora, o art. 72 é o seu ponto de partida: o ato que autoriza a contratação, ou o extrato do contrato, tem de estar publicado em sítio oficial. A razão da escolha e a justificativa de preço estão no processo (incisos VI e VII), e é nele que se vê se a hipótese foi bem aplicada.",
    },
    {
      tipo: "paragrafo",
      texto:
        "E a contratação direta indevida tem custo para os dois lados. Pelo art. 73, quando ela acontece com dolo, fraude ou erro grosseiro, o contratado e o agente público respondem solidariamente pelo dano ao erário. Participar de uma dispensa mal enquadrada, sabendo ou devendo saber, não é risco só do órgão.",
    },
    {
      tipo: "destaque",
      texto:
        "Sobre notória especialização, um alerta. A [Súmula 39 do TCU](/sumulas-tcu/#direta) exige serviço de \"natureza singular\" para a inexigibilidade, mas foi escrita sob o art. 25, II, da Lei 8.666. O art. 74, III, da Lei 14.133 não repete essa palavra, e o manual de licitações do próprio TCU diz que a nova lei suprimiu a singularidade como requisito. O mesmo manual ressalva que objeto usual ou rotineiro não justifica inexigibilidade. Antes de basear um pedido, ou uma contestação, nesse ponto, confira com um advogado como o tribunal de contas que fiscaliza aquele órgão tem decidido.",
    },
    {
      tipo: "captura",
      chamada:
        "Quem vende para o governo ganha mais disputando do que esperando contratação direta. No teste de 14 dias, sem cartão, o resumo manda nos dias úteis os editais abertos do recorte que você indicar, com prazo e link para o registro oficial.",
    },
    {
      tipo: "destaque",
      texto:
        "Este texto resume os arts. 72 a 75 da Lei nº 14.133/2021. Se uma contratação direta específica foi bem enquadrada é análise do caso concreto, que depende do processo e do seu advogado.",
    },
  ],
  faq: [
    {
      pergunta: "Qual a diferença entre dispensa e inexigibilidade?",
      resposta:
        "Na dispensa (art. 75 da Lei nº 14.133/2021), a competição seria possível, mas a lei autoriza não licitar. Na inexigibilidade (art. 74), a competição é inviável, como no fornecedor exclusivo.",
    },
    {
      pergunta: "A lista de dispensa é fechada?",
      resposta:
        "Sim. O art. 75 lista as hipóteses em que a licitação é dispensável, e fora delas não há licitação dispensável. Já o art. 74 usa \"em especial\", então a inexigibilidade pode ocorrer em outros casos de competição inviável.",
    },
    {
      pergunta: `Qual o valor da dispensa de licitação em ${ANO}?`,
      resposta: `Abaixo de ${OBRAS} para obras, serviços de engenharia e manutenção de veículos, e abaixo de ${COMPRAS} para os demais serviços e compras (art. 75, I e II, com os valores atualizados).`,
    },
    {
      pergunta: "Como o órgão prova que o fornecedor é exclusivo?",
      resposta:
        "Com atestado de exclusividade, contrato de exclusividade, declaração do fabricante ou outro documento idôneo, e sem preferência por marca (art. 74, § 1º).",
    },
    {
      pergunta: "Contratação direta precisa ser publicada?",
      resposta:
        "Sim. O ato que autoriza a contratação direta, ou o extrato do contrato, tem de ser divulgado e mantido em sítio eletrônico oficial (art. 72, parágrafo único).",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, arts. 6º, 72 a 75 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art72",
      sustenta:
        "Conceito de credenciamento (art. 6º, XLIII); instrução e divulgação da contratação direta (art. 72); responsabilidade solidária (art. 73); inexigibilidade e seus requisitos (art. 74); hipóteses de dispensa (art. 75).",
    },
    {
      titulo: "Lei nº 14.133/2021, art. 79 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art79",
      sustenta: "Hipóteses de credenciamento.",
    },
    {
      titulo: `${REAJUSTE_VIGENTE.decreto} (Planalto)`,
      url: REAJUSTE_VIGENTE.url,
      sustenta: `Valores atualizados dos limites de dispensa para ${ANO}.`,
    },
    {
      titulo: "STF, Informativo 1149 (ADI 6890)",
      url: "https://www.stf.jus.br/arquivo/informativo/documento/informativo1149.htm",
      sustenta:
        "A vedação de recontratação do art. 75, VIII, vale para a mesma emergência além de 1 ano e não impede nova licitação ou contratação por outro fundamento.",
    },
    {
      titulo: "TCU, Licitações e Contratos: dispensa de licitação (5.10.2)",
      url: "https://licitacoesecontratos.tcu.gov.br/5-10-2-dispensa-de-licitacao/",
      sustenta: "O rol do art. 75 é taxativo.",
    },
    {
      titulo: "TCU, Licitações e Contratos: inexigibilidade (5.10.1 e 5.10.1.3)",
      url: "https://licitacoesecontratos.tcu.gov.br/5-10-1-inexigibilidade-de-licitacao/",
      sustenta:
        "O rol do art. 74 é exemplificativo; a Lei 14.133 suprimiu a singularidade do objeto como requisito da notória especialização.",
    },
    {
      titulo: "TCU, Súmula 39",
      url: "https://pesquisa.apps.tcu.gov.br/documento/sumula/*/NUMERO%253A39/DTRELEVANCIA%2520desc/0/sinonimos%253Dtrue",
      sustenta: "Exigência de natureza singular para a inexigibilidade por notória especialização, sob a Lei 8.666.",
    },
  ],
  publicado: true,
};
