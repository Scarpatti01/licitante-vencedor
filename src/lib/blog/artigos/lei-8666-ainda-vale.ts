import type { Artigo } from "../tipos";

/**
 * Sexto post do plano de SEO de 16/10/2026, apoio de /lei-14133/.
 *
 * O hub já responde "a 8.666 ainda vale?" numa FAQ de duas frases. O post
 * desce no que a FAQ não cabe: o contrato antigo em vigor, o contrato de
 * licitação que optou pela lei antiga na transição, os crimes que mudaram de
 * lugar e as súmulas do TCU escritas sob a 8.666.
 *
 * Conferido em 17/10/2026 no texto da Lei 14.133 no Planalto: art. 178 (crimes
 * no Código Penal, arts. 337-E e seguintes), art. 190 (contrato assinado antes
 * da vigência), art. 191 e parágrafo único (opção pela lei antiga, vedada a
 * combinação), art. 193, I e II (revogações; inciso II na redação da LC
 * 198/2023: 30 de dezembro de 2023), art. 194 (vigência na publicação).
 *
 * Não confirmado, e por isso fora do texto: o tratamento de processo iniciado
 * antes de 30/12/2023 e publicado depois. A redação da MP 1.167/2023 trazia
 * condições para isso (edital publicado até 29/12/2023), com vigência
 * encerrada, e o Acórdão TCU 507/2023-Plenário teria tratado do ponto (visto
 * só em transcrição de terceiro); o texto não arrisca a regra.
 *
 * PNCP: o art. 176 dá aos municípios de até 20 mil habitantes 6 anos da
 * publicação para cumprir a divulgação eletrônica; por isso "a regra", não
 * "todo edital".
 */
export const LEI_8666_AINDA_VALE: Artigo = {
  slug: "lei-8666-ainda-vale",
  tituloDaBusca: "Lei 8.666 ainda vale? O que mudou em 2023",
  titulo: "A Lei 8.666 ainda vale? O que a revogação mudou para contratos e licitações",
  descricao:
    "A Lei 8.666 foi revogada em 30/12/2023, mas ainda rege contratos assinados antes da Lei 14.133 e os de licitações que optaram por ela.",
  resumo:
    "Para licitação nova, não. A Lei 8.666/1993, a Lei do Pregão e o RDC foram revogados em 30 de dezembro de 2023, e desde então vale só a Lei 14.133. Mas a lei antiga continua regendo dois casos: o contrato assinado antes de a Lei 14.133 entrar em vigor e o contrato de licitação que optou expressamente pela lei antiga até aquela data, durante toda a vigência dele.",
  intencao: "informacional",
  termoPrincipal: "lei 8.666 ainda vale",
  guiaRelacionado: "/lei-14133/",
  publicadoEm: "2026-10-17",
  verificadoEm: "2026-10-17",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "A Lei 8.666 ainda vale para contratos antigos, mas não para licitações novas. A [Lei nº 14.133/2021](/lei-14133/) entrou em vigor na data da publicação, em 1º de abril de 2021 (art. 194), e conviveu com as leis antigas por um período de transição. Esse período acabou em 30 de dezembro de 2023, quando foram revogadas a Lei 8.666/1993, a Lei do Pregão (10.520/2002) e a parte de licitações do RDC (arts. 1º a 47-A da Lei 12.462/2011), pelo art. 193, II, na redação da Lei Complementar 198/2023.",
    },
    {
      tipo: "subtitulo",
      texto: "As datas que importam",
    },
    {
      tipo: "tabela",
      cabecalho: ["Data", "O que aconteceu", "Base"],
      linhas: [
        ["1º/4/2021", "A Lei 14.133 entra em vigor, e os crimes da 8.666 (arts. 89 a 108) são revogados", "Arts. 193, I, e 194"],
        ["1º/4/2021 até a revogação", "Transição: o órgão podia escolher licitar ou contratar diretamente pela lei nova ou pelas antigas, dizendo isso no edital ou no instrumento", "Art. 191"],
        ["30/12/2023", "Revogação da Lei 8.666, da Lei do Pregão e dos arts. 1º a 47-A do RDC", "Art. 193, II (LC 198/2023)"],
      ],
    },
    {
      tipo: "subtitulo",
      texto: "Quando a 8.666 ainda manda",
    },
    {
      tipo: "paragrafo",
      texto:
        "Há dois casos, e os dois são sobre contrato, não sobre licitação nova.",
    },
    {
      tipo: "lista",
      itens: [
        "Contrato assinado antes de 1º de abril de 2021: continua regido pelas regras da legislação revogada (art. 190).",
        "Contrato de licitação que, durante a transição, optou pela lei antiga: o edital tinha de dizer a opção expressamente, e o contrato fica regido pelas regras da lei antiga durante toda a vigência (art. 191, parágrafo único).",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Na prática, quem executa um contrato desses deve olhar para a lei antiga nas questões do próprio contrato, como alteração, reajuste e prorrogação, porque é ela que rege o contrato (arts. 190 e 191, parágrafo único). E o art. 191 vedou misturar as duas leis no mesmo processo: escolhida uma, ela vale inteira.",
    },
    {
      tipo: "destaque",
      texto:
        "Para saber qual lei rege o seu contrato, abra o edital ou o próprio contrato. Na transição, a opção tinha de estar escrita no edital ou no instrumento de contratação direta. Se o documento cita a 8.666 ou a 10.520 como fundamento, é por ela que o contrato se guia.",
    },
    {
      tipo: "subtitulo",
      texto: "Quando a 8.666 não vale mais",
    },
    {
      tipo: "paragrafo",
      texto:
        "Toda licitação e toda contratação direta nova seguem a Lei 14.133. Isso inclui as modalidades: o pregão, que vinha da Lei 10.520, hoje é modalidade da própria Lei 14.133, e a tomada de preços e o convite, da 8.666, deixaram de existir. As regras de prazo, de impugnação, de recurso e de habilitação também são as da lei nova. O resumo do que mudou está no guia da [Lei 14.133](/lei-14133/#o-que-mudou).",
    },
    {
      tipo: "paragrafo",
      texto:
        "Os crimes mudaram de lugar antes de tudo. Os arts. 89 a 108 da 8.666 foram revogados já na publicação da Lei 14.133, que levou os crimes em licitações e contratos para o Código Penal, nos arts. 337-E e seguintes (art. 178).",
    },
    {
      tipo: "subtitulo",
      texto: "E as súmulas do TCU escritas sob a 8.666?",
    },
    {
      tipo: "paragrafo",
      texto:
        "Muitas súmulas do TCU citam artigos da 8.666, e isso não as torna inúteis: o entendimento vale enquanto a lei nova disser a mesma coisa. Mas é preciso conferir caso a caso. A Súmula 275, por exemplo, tratava capital, patrimônio líquido e garantia como alternativas não cumulativas, e a Lei 14.133 não repetiu essa regra. A Súmula 39 exigia natureza singular para a notória especialização, palavra que o art. 74, III, da lei nova não traz. As duas leituras estão em [súmulas do TCU](/sumulas-tcu/) e em [dispensa e inexigibilidade](/blog/dispensa-e-inexigibilidade/).",
    },
    {
      tipo: "captura",
      chamada:
        "Desde 2024, todo edital novo segue a Lei 14.133, e a regra é publicá-lo no PNCP (art. 54). No teste de 14 dias, sem cartão, o resumo manda nos dias úteis os editais abertos do recorte que você indicar, com prazo e link para o registro oficial.",
    },
    {
      tipo: "destaque",
      texto:
        "Este texto resume as regras de transição da Lei 14.133 (arts. 190 a 194). Qual lei rege um contrato específico, e o que ela permite nele, depende do edital e do contrato, e é análise para fazer com o seu advogado.",
    },
  ],
  faq: [
    {
      pergunta: "A Lei 8.666 ainda vale?",
      resposta:
        "Para licitação nova, não: ela foi revogada em 30 de dezembro de 2023 (art. 193, II, da Lei 14.133, na redação da LC 198/2023). Mas continua regendo contratos assinados antes de 1º de abril de 2021 e os contratos de licitações que optaram expressamente por ela durante a transição.",
    },
    {
      pergunta: "Quando a Lei 8.666 foi revogada?",
      resposta:
        "Os crimes (arts. 89 a 108) em 1º de abril de 2021, na publicação da Lei 14.133. O restante da lei, junto com a Lei do Pregão e a parte de licitações do RDC, em 30 de dezembro de 2023.",
    },
    {
      pergunta: "Meu contrato foi assinado pela 8.666. Qual lei vale para ele?",
      resposta:
        "A 8.666. O contrato assinado antes da vigência da Lei 14.133 segue a legislação revogada (art. 190), e o de licitação que optou pela lei antiga segue as regras dela durante toda a vigência (art. 191, parágrafo único).",
    },
    {
      pergunta: "Ainda existe tomada de preços e convite?",
      resposta:
        "Não em licitação nova. Essas modalidades eram da Lei 8.666, que foi revogada. A Lei 14.133 tem pregão, concorrência, concurso, leilão e diálogo competitivo.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, arts. 178 e 190 a 194 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art190",
      sustenta:
        "Crimes no Código Penal (art. 178); contrato anterior regido pela lei revogada (art. 190); opção pela lei antiga na transição e vedação da combinação (art. 191); revogações e datas (art. 193, na redação da LC 198/2023); vigência (art. 194).",
    },
    {
      titulo: "Lei Complementar nº 198/2023 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp198.htm",
      sustenta: "Fixou em 30 de dezembro de 2023 a revogação da Lei 8.666, da Lei 10.520 e dos arts. 1º a 47-A da Lei 12.462.",
    },
  ],
  publicado: true,
};
