import { DISPENSA_POR_VALOR, REAJUSTE_VIGENTE, emReais } from "../../dominio/limites-legais";
import type { Artigo } from "../tipos";

/**
 * Terceiro post do plano de SEO de 16/10/2026, apoio de /limites/.
 *
 * Fontes conferidas em 17/10/2026:
 * - Lei 14.133, art. 75, I, II, §§ 1º, 2º e 3º (Planalto).
 * - IN SEGES/ME nº 67/2021, atualizada, na página oficial do Compras.gov.br:
 *   âmbito (arts. 1º e 2º), hipóteses (art. 4º), prazo mínimo de 3 dias úteis
 *   (art. 6º, parágrafo único), divulgação (art. 7º), proposta e declarações
 *   (art. 8º), valor final mínimo sigiloso e lances automáticos (art. 9º),
 *   desconexão por conta do fornecedor (art. 10), disputa de 6 a 10 horas
 *   (art. 11), lances (art. 12), julgamento (art. 15), negociação (arts. 16 e
 *   17), habilitação pelo SICAF (art. 19), habilitação reduzida (art. 20),
 *   proposta seguinte (art. 21), hipóteses além do valor (art. 4º).
 *
 * Os valores do art. 75 saem de `limites-legais.ts`, nunca em prosa: a guarda
 * de `limites-legais.test.ts` morde cifra escrita perto do art. 75.
 *
 * A IN ainda chama o sistema de "Comprasnet 4.0"; o texto usa o nome atual,
 * Compras.gov.br, e diz isso. Não confirmado, e por isso fora do texto: como
 * cada estado e município regula a própria dispensa eletrônica quando não usa
 * recurso federal (há relatos de disputa de 15 ou 30 minutos e de modo
 * fechado, sem fonte oficial conferida); se o Compras.gov.br oferece dispensa
 * sem disputa de lances; se o SICAF é requisito formal para enviar proposta.
 * O texto diz só que pode ser diferente. Fora de propósito: a exceção do
 * art. 75, § 7º, cujo valor atualizado não está em `limites-legais.ts`.
 */
const OBRAS = emReais(DISPENSA_POR_VALOR.obrasEEngenharia);
const COMPRAS = emReais(DISPENSA_POR_VALOR.comprasEServicos);
const ANO = REAJUSTE_VIGENTE.ano;
const ATO = REAJUSTE_VIGENTE.decreto;

export const DISPENSA_ELETRONICA: Artigo = {
  slug: "dispensa-eletronica",
  tituloDaBusca: "Dispensa eletrônica: como participar e prazos",
  titulo: "O que é dispensa eletrônica e como participar?",
  descricao:
    "Dispensa eletrônica é a compra sem licitação feita por sistema: aviso de no mínimo 3 dias úteis e, na regra federal, disputa de lances. Prazos e valores.",
  resumo:
    "Dispensa eletrônica é a contratação direta, sem licitação, feita por sistema: o órgão publica um aviso, os fornecedores têm no mínimo 3 dias úteis para mandar proposta e, na regra federal, disputam lances por 6 a 10 horas. Na esfera federal, a regra está na Instrução Normativa SEGES/ME nº 67/2021, e a compra por valor tem teto fixado todo ano.",
  intencao: "operacional",
  termoPrincipal: "dispensa eletrônica",
  guiaRelacionado: "/limites/",
  publicadoEm: "2026-10-17",
  verificadoEm: "2026-10-17",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "Dispensa eletrônica é a contratação sem licitação feita por meio de sistema. A Lei nº 14.133/2021 permite que o órgão compre sem licitar em várias hipóteses do art. 75, e a mais conhecida é a compra de pequeno valor. Mesmo sem licitação, o órgão não escolhe o fornecedor a dedo: publica um aviso, recebe propostas e, na regra federal, faz uma disputa de lances. Para quem vende, é a porta de entrada mais curta para o governo.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Na esfera federal, o procedimento está na Instrução Normativa SEGES/ME nº 67/2021. Ela vale para a Administração federal direta, autárquica e fundacional, e também para estados e municípios quando gastam recurso da União vindo de transferência voluntária. Fora disso, estado e município podem ter regra própria, e é o aviso de contratação direta que traz as regras daquela compra.",
    },
    {
      tipo: "subtitulo",
      texto: `Os valores de ${ANO}`,
    },
    {
      tipo: "tabela",
      cabecalho: ["Hipótese", `Limite em ${ANO}`, "Base"],
      linhas: [
        ["Obras, serviços de engenharia e manutenção de veículos", `Abaixo de ${OBRAS}`, "Art. 75, I"],
        ["Outros serviços e compras", `Abaixo de ${COMPRAS}`, "Art. 75, II"],
      ],
    },
    {
      tipo: "paragrafo",
      texto: `Os valores são atualizados todo ano; os de ${ANO} são do ${ATO}. O limite não é por compra: pelo art. 75, § 1º, conta o total gasto no exercício pela mesma unidade gestora com objetos da mesma natureza, ou seja, do mesmo ramo de atividade. Consórcio público e autarquia ou fundação qualificada como agência executiva têm o limite dobrado (§ 2º). O detalhe de cada caso está em [limites de dispensa](/limites/).`,
    },
    {
      tipo: "subtitulo",
      texto: "O aviso e o prazo de 3 dias úteis",
    },
    {
      tipo: "paragrafo",
      texto:
        "A lei diz que a dispensa por valor será \"preferencialmente\" precedida de aviso em sítio eletrônico oficial, por no mínimo 3 dias úteis, pedindo propostas adicionais de eventuais interessados (art. 75, § 3º). \"Preferencialmente\" quer dizer que a lei não obriga em todo caso. Na esfera federal, a IN 67 transforma isso em regra do procedimento: o prazo entre a divulgação do aviso e a abertura da disputa não pode ser inferior a 3 dias úteis (art. 6º, parágrafo único). E a IN usa o mesmo rito também para outras hipóteses do art. 75, quando cabível, com o mesmo prazo mínimo (art. 4º).",
    },
    {
      tipo: "paragrafo",
      texto:
        "O aviso sai no Compras.gov.br, que a IN ainda chama de Comprasnet 4.0, e no Portal Nacional de Contratações Públicas, o PNCP. E é enviado por e-mail aos fornecedores cadastrados no SICAF na linha de fornecimento correspondente (art. 7º). Daí um conselho prático: cadastre no SICAF as linhas de fornecimento que você atende de verdade. É por elas que o aviso chega até você. O passo a passo do cadastro está em [portais de licitação](/portais-de-licitacao/).",
    },
    {
      tipo: "destaque",
      texto:
        "Três dias úteis passam rápido. A proposta vai até a data e a hora marcadas para a abertura (art. 8º); depois disso, não entra mais. Quem só descobre a dispensa perto desse horário tem pouco tempo para montar a proposta e conferir as declarações. Acompanhar o PNCP todo dia, ou receber o aviso pelo SICAF, é o que faz a diferença aqui.",
    },
    {
      tipo: "subtitulo",
      texto: "Como funciona a disputa",
    },
    {
      tipo: "passos",
      itens: [
        "Proposta: até a data e a hora marcadas, você manda pelo sistema a descrição do que oferece, a marca quando for o caso e o preço, e preenche as declarações exigidas, como a de ME ou EPP e a de inexistência de fato impeditivo (art. 8º).",
        "Valor mínimo: ao cadastrar a proposta, você pode informar o menor valor que aceita. O sistema dá lances automáticos por você até esse valor, que é sigiloso para os concorrentes e para o órgão que compra e só fica acessível aos órgãos de controle (art. 9º). Você pode alterá-lo durante a disputa, desde que ele não fique acima de um lance que você mesmo já registrou.",
        "Lances: na hora marcada, o sistema abre a disputa sozinho, por no mínimo 6 e no máximo 10 horas (art. 11). Cada lance seu tem de ser menor que o seu último, respeitado o intervalo mínimo fixado no aviso, e o empate fica com quem registrou primeiro (art. 12).",
        "Julgamento: encerrados os lances, o órgão confere se a proposta mais bem classificada atende ao objeto e cabe no preço (art. 15). Se ficar acima do preço máximo, pode negociar com o primeiro e, se ele for desclassificado por continuar acima do preço, com os seguintes (arts. 16 e 17).",
        "Habilitação: só o mais bem classificado é habilitado, com os documentos da Lei 14.133 conferidos no SICAF (art. 19). Se ele não atender, o órgão passa ao seguinte (art. 21).",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A IN deixa por sua conta acompanhar o sistema durante a disputa: quem perde o negócio por não ver uma mensagem ou por cair a conexão arca com isso (art. 10). Nas contratações para entrega imediata (até 30 dias da ordem de fornecimento), nas de valor abaixo de um quarto do limite para compras em geral e nas de produto para pesquisa e desenvolvimento, a empresa só precisa comprovar regularidade fiscal federal, social e trabalhista; a pessoa física, a quitação com a Fazenda Federal (art. 20). As certidões de cada uma estão em [certidões para licitação](/blog/certidoes-para-licitacao/).",
    },
    {
      tipo: "captura",
      chamada: "Baixe a folha de habilitação do Workbook",
      material: "folha-de-habilitacao",
    },
    {
      tipo: "subtitulo",
      texto: "Dispensa eletrônica não é pregão",
    },
    {
      tipo: "paragrafo",
      texto:
        "A semelhança com o pregão eletrônico engana. A dispensa é contratação direta: não é licitação, só cabe nas hipóteses do art. 75 e segue o aviso de contratação direta, não um edital de pregão. O prazo também é mais curto: 3 dias úteis de aviso, contra os prazos mínimos de divulgação do edital que o art. 55 fixa para as licitações. Para quem vende, o efeito prático é que a dispensa decide rápido, para valores menores, e premia quem já está cadastrado e atento.",
    },
    {
      tipo: "destaque",
      texto:
        "Este texto resume a Lei 14.133 e a IN SEGES/ME nº 67/2021, que regula a dispensa eletrônica federal. Estados e municípios podem ter regulamento próprio. Antes de mandar proposta, leia o aviso de contratação direta: é ele que traz o prazo, o horário e as condições daquela compra.",
    },
  ],
  faq: [
    {
      pergunta: "O que é dispensa eletrônica?",
      resposta:
        "É a contratação direta, sem licitação, feita por sistema eletrônico, nas hipóteses do art. 75 da Lei nº 14.133/2021. O órgão publica um aviso, recebe propostas e, na regra federal, faz uma disputa de lances antes de contratar.",
    },
    {
      pergunta: "Qual o prazo da dispensa eletrônica?",
      resposta:
        "Na esfera federal, pelo menos 3 dias úteis entre a divulgação do aviso e a abertura da disputa (IN SEGES/ME nº 67/2021, art. 6º, parágrafo único). A disputa de lances dura de 6 a 10 horas (art. 11).",
    },
    {
      pergunta: `Qual o valor máximo da dispensa em ${ANO}?`,
      resposta: `Abaixo de ${OBRAS} para obras, serviços de engenharia e manutenção de veículos, e abaixo de ${COMPRAS} para os demais serviços e compras, somando o que a unidade gasta no ano com objetos do mesmo ramo.`,
    },
    {
      pergunta: "Onde encontro os avisos de dispensa eletrônica?",
      resposta:
        "No Compras.gov.br e no PNCP. Quem é cadastrado no SICAF recebe o aviso por e-mail na linha de fornecimento correspondente (IN 67, art. 7º).",
    },
    {
      pergunta: "Preciso de SICAF para participar?",
      resposta:
        "Na dispensa eletrônica federal, a habilitação do vencedor é conferida no SICAF ou em sistema semelhante do estado ou município (IN 67, art. 19), e é pelo SICAF que o aviso chega por e-mail. Na prática, o cadastro é o primeiro passo.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, art. 75 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art75",
      sustenta:
        "Hipóteses de dispensa por valor (I e II), soma no exercício por unidade gestora e ramo de atividade (§ 1º), limite dobrado (§ 2º) e aviso preferencial de 3 dias úteis (§ 3º).",
    },
    {
      titulo: `${ATO} (Planalto)`,
      url: REAJUSTE_VIGENTE.url,
      sustenta: `Valores atualizados dos limites do art. 75 para ${ANO}.`,
    },
    {
      titulo: "Instrução Normativa SEGES/ME nº 67/2021, atualizada (Compras.gov.br)",
      url: "https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-67-de-8-de-julho-de-2021",
      sustenta:
        "Âmbito de aplicação, prazo mínimo de 3 dias úteis, divulgação no sistema e no PNCP, declarações, valor mínimo sigiloso, disputa de 6 a 10 horas, negociação, habilitação no SICAF e habilitação reduzida.",
    },
  ],
  publicado: true,
};
