import type { Artigo } from "../tipos";

/**
 * Primeiro post do cluster de /habilitacao/, do plano de SEO de 16/10/2026.
 *
 * O guia de habilitação aparecia na posição 43 a 66 para "habilitação em
 * licitação" e tinha um post só de apoio. O atestado é a exigência técnica que
 * mais elimina empresa pequena, e a Lei 14.133 traz os limites em números
 * (4% e 50%), o que permite escrever o texto sem uma única opinião jurídica:
 * tudo aqui é o art. 67, a Súmula 263 do TCU e o art. 64, lidos no Planalto e
 * no texto oficial da súmula em 17/10/2026.
 *
 * O art. 64 lido sozinho engana: a letra veda documento novo, mas o TCU
 * (Acórdão 1211/2021-Plenário, enunciado conferido na página oficial
 * licitacoesecontratos.tcu.gov.br/5-5-habilitacao-2/ em 17/10/2026) admite o
 * documento ausente que prova condição que já existia na proposta. A primeira
 * versão deste post dizia "esbarra na vedação"; a revisão pegou. Não afirmar
 * que o pregoeiro é obrigado a aceitar em todo caso: o enunciado é de um caso
 * concreto, e órgãos fora da esfera federal podem decidir diferente.
 *
 * Dúvida não resolvida: o atestado pedido ao cliente DEPOIS da sessão. O
 * relator diz que a vedação "deve se restringir ao que o licitante não dispunha
 * materialmente no momento da licitação", o que pode exigir que o papel já
 * existisse. Por isso o texto fala em contrato executado E atestado já emitido.
 *
 * "Limitações de tempo" do § 2º lido como época da execução, leitura corrente
 * e compatível com o § 5º, que permite exigir duração mínima. A lei não usa a
 * palavra "época".
 *
 * O que NÃO está aqui, de propósito: o que um atestado "deve conter" como
 * regra. A lei não lista campos. A seção sobre pedir o atestado ao cliente é
 * prática de quem disputa, e o texto diz isso com essas palavras.
 */
export const ATESTADO_DE_CAPACIDADE_TECNICA: Artigo = {
  slug: "atestado-de-capacidade-tecnica",
  tituloDaBusca: "Atestado de capacidade técnica: o que exigem",
  titulo: "O que é atestado de capacidade técnica e o que o edital pode exigir?",
  descricao:
    "O atestado prova que sua empresa já fez algo parecido. A Lei 14.133 limita a exigência às parcelas de 4% ou mais do valor e a até 50% delas.",
  resumo:
    "O atestado de capacidade técnica é o documento em que um cliente declara que a sua empresa já executou um serviço ou fornecimento parecido com o que está sendo licitado. A Lei 14.133 deixa o edital exigi-lo, mas com limites em número: só para as parcelas que valem 4% ou mais do total, e com quantidade mínima de até metade dessas parcelas. Conhecer os limites é o que separa a exigência que você precisa cumprir da que você pode impugnar.",
  intencao: "operacional",
  termoPrincipal: "atestado de capacidade técnica",
  guiaRelacionado: "/habilitacao/",
  publicadoEm: "2026-10-17",
  verificadoEm: "2026-10-17",
  corpo: [
    {
      tipo: "paragrafo",
      texto:
        "Atestado de capacidade técnica é o documento em que um cliente, público ou privado, declara que a sua empresa já executou um serviço ou fornecimento com características semelhantes ao que está sendo licitado. Ele é a prova da qualificação técnica, uma das quatro partes da [habilitação](/habilitacao/). Sem ele, a empresa pode ter o melhor preço da disputa e ainda assim ser inabilitada.",
    },
    {
      tipo: "paragrafo",
      texto:
        "A Lei nº 14.133/2021 trata do assunto no art. 67, e a primeira coisa que ela faz é restringir. A documentação de qualificação técnica \"será restrita a\" uma lista fechada: o profissional com atestado de responsabilidade técnica, as certidões ou atestados de capacidade operacional, a indicação de pessoal e equipamento, requisitos de lei especial, o registro na entidade profissional e a declaração de conhecimento das condições locais. O edital escolhe dentro dessa lista. Exigência técnica fora dessa lista não tem base na lei.",
    },
    {
      tipo: "subtitulo",
      texto: "Técnico-profissional e técnico-operacional não são a mesma coisa",
    },
    {
      tipo: "tabela",
      cabecalho: ["Tipo", "O que prova", "Base"],
      linhas: [
        [
          "Técnico-profissional",
          "Que a empresa tem um profissional, registrado no conselho quando for o caso, que já foi responsável técnico por obra ou serviço semelhante",
          "Art. 67, I",
        ],
        [
          "Técnico-operacional",
          "Que a própria empresa já executou serviço similar, de complexidade tecnológica e operacional equivalente ou superior",
          "Art. 67, II",
        ],
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "A diferença importa na hora de montar a pasta. O inciso I olha para a pessoa: a experiência do profissional como responsável técnico. O inciso II olha para a empresa: o que ela mesma executou. E o profissional indicado no inciso I precisa participar de fato da obra ou do serviço; a lei admite substituí-lo por outro de experiência equivalente ou superior, desde que a Administração aprove (art. 67, § 6º).",
    },
    {
      tipo: "subtitulo",
      texto: "Quanto o edital pode exigir: os 4% e os 50%",
    },
    {
      tipo: "paragrafo",
      texto:
        "Aqui está o limite que mais se descumpre. Pelo art. 67, § 1º, a exigência de atestados fica restrita às parcelas de maior relevância ou valor significativo do objeto, e a própria lei define o que é isso: parcela com valor individual igual ou superior a 4% do valor total estimado da contratação. Item que vale menos que 4% do total não pode ser cobrado em atestado.",
    },
    {
      tipo: "paragrafo",
      texto:
        "O § 2º completa: dentro dessas parcelas, o edital pode exigir quantidade mínima de até 50%. Se a licitação prevê 1.000 metros de rede e essa parcela vale 4% ou mais do valor, o atestado pode ser cobrado por até 500 metros executados, não por 1.000. O mesmo parágrafo veda limitar o atestado por época ou por local: exigir que a experiência tenha sido nos últimos dois anos, ou naquele estado, contraria a lei. Não confunda com a duração mínima do serviço contínuo, logo abaixo: uma coisa é quando a experiência aconteceu, que o edital não pode amarrar; outra é por quanto tempo ela durou, que ele pode exigir até o limite do § 5º.",
    },
    {
      tipo: "destaque",
      texto:
        "Conta rápida antes de decidir se impugna: a parcela exigida em atestado vale pelo menos 4% do total estimado? A quantidade pedida passa de metade da quantidade licitada? Há exigência de época (\"nos últimos 2 anos\") ou de local amarrando a experiência? Um sim nas duas últimas, ou um não na primeira, é sinal de exigência acima do que a lei permite.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Para serviços contínuos, há uma regra própria: o edital pode exigir atestado de execução de serviço similar por um prazo mínimo, contínuo ou somando períodos, que não pode passar de 3 anos (art. 67, § 5º). E o edital pode aceitar atestado relativo a um potencial subcontratado, limitado a 25% do objeto (art. 67, § 9º).",
    },
    {
      tipo: "subtitulo",
      texto: "O que a Súmula 263 do TCU acrescenta",
    },
    {
      tipo: "paragrafo",
      texto:
        "A [Súmula 263 do TCU](/sumulas-tcu/#habilitacao), editada em 2011, ainda sob a Lei 8.666, diz que, para a capacidade técnico-operacional, é legal exigir quantitativos mínimos em obras ou serviços semelhantes, desde que limitados, ao mesmo tempo, às parcelas de maior relevância e valor significativo, e desde que a exigência guarde proporção com a dimensão e a complexidade do objeto. Ou seja: a existência do quantitativo mínimo não é ilegal. O que se contesta é o excesso, a parcela que não é relevante ou o número desproporcional.",
    },
    {
      tipo: "captura",
      chamada: "Baixe a folha de habilitação do Workbook",
      material: "folha-de-habilitacao",
    },
    {
      tipo: "subtitulo",
      texto: "Atestado que faltou ou veio incompleto: o que ainda dá para fazer",
    },
    {
      tipo: "paragrafo",
      texto:
        "Depois da entrega dos documentos, o art. 64 proíbe substituir ou apresentar documento novo, com duas exceções em diligência: complementar informação sobre documento já apresentado, para apurar fato que já existia na abertura do certame, e atualizar documento que venceu depois do recebimento das propostas. O § 1º ainda deixa a comissão sanar erro ou falha que não altere a substância do documento.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Lida ao pé da letra, a regra fecharia a porta para o atestado esquecido. O TCU não lê assim. No Acórdão 1211/2021, julgado ainda sob a lei antiga mas citando expressamente o art. 64 da nova, o Plenário decidiu que a vedação não alcança documento ausente que comprova condição que a empresa já atendia quando apresentou a proposta e que ficou de fora por equívoco ou falha: esse deve ser solicitado e avaliado pelo pregoeiro. Ou seja, se o contrato já tinha sido executado e o atestado já existia, peça a diligência; atestado emitido depois da sessão é terreno incerto. O que não se salva é a experiência que ainda não existia na data da proposta. Pelo TCU, o documento deve ser pedido e avaliado, mas quem decide no caso concreto é o agente de contratação, e, se ele negar, o caminho é o recurso. Em licitação estadual ou municipal, o tribunal de contas local pode entender diferente. Por isso a conferência tem de acontecer antes do envio.",
    },
    {
      tipo: "subtitulo",
      texto: "Como pedir o atestado ao seu cliente",
    },
    {
      tipo: "paragrafo",
      texto:
        "A lei não traz uma lista de campos obrigatórios do atestado. O que segue é prática de quem disputa, pensada para o documento servir no maior número de editais:",
    },
    {
      tipo: "passos",
      itens: [
        "Peça o atestado ao final de todo contrato executado, enquanto o gestor que acompanhou o serviço ainda está no cargo. Anos depois, ninguém lembra das quantidades.",
        "Garanta que ele identifique o contratante (nome, CNPJ, endereço e telefone de quem assina), o objeto e o período de execução.",
        "Peça as quantidades discriminadas por item, com unidade de medida. Atestado que diz só \"serviço prestado a contento\" não comprova quantitativo nenhum.",
        "Quando o objeto for de engenharia ou de profissão regulamentada, verifique se o edital exige o registro no conselho profissional competente, e providencie com antecedência.",
        "Guarde o atestado na pasta de habilitação com a data do contrato, para achar em minutos quando o edital pedir.",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Se a exigência do edital passar dos limites do art. 67, o caminho é a impugnação, com prazo de até 3 dias úteis antes da abertura. Como contar esse prazo está em [prazo para impugnar edital](/blog/prazo-para-impugnar-edital-de-licitacao/), e a lista completa da pasta está em [documentos para participar de licitação](/blog/documentos-para-participar-de-licitacao/).",
    },
    {
      tipo: "destaque",
      texto:
        "Este texto descreve o que a Lei nº 14.133/2021 e a Súmula 263 do TCU dizem sobre atestados. Se a exigência de um edital específico é excessiva, e com que fundamento contestá-la, é análise que depende do edital e do seu advogado. O edital prevalece.",
    },
  ],
  faq: [
    {
      pergunta: "O que é atestado de capacidade técnica?",
      resposta:
        "É o documento em que um cliente declara que a empresa já executou serviço ou fornecimento semelhante ao licitado. Ele comprova a qualificação técnica, prevista no art. 67 da Lei nº 14.133/2021.",
    },
    {
      pergunta: "O edital pode exigir atestado de qualquer item?",
      resposta:
        "Não. Pelo art. 67, § 1º, só das parcelas de maior relevância ou valor significativo, que a lei define como as de valor individual igual ou superior a 4% do valor total estimado da contratação.",
    },
    {
      pergunta: "Qual a quantidade máxima que o edital pode pedir no atestado?",
      resposta:
        "Até 50% das parcelas de maior relevância (art. 67, § 2º). O mesmo parágrafo veda limitar o atestado por época (quando foi executado) ou por local específico.",
    },
    {
      pergunta: "Esqueci de enviar o atestado. Posso mandar depois?",
      resposta:
        "Talvez. A letra do art. 64 veda documento novo, mas o TCU já admitiu a juntada em diligência quando o atestado prova condição que já existia na data da proposta (Acórdão 1211/2021-Plenário). Peça a diligência e não conte com ela.",
    },
    {
      pergunta: "Em serviço contínuo, o edital pode exigir quantos anos de experiência?",
      resposta:
        "Até 3 anos. O art. 67, § 5º, permite exigir atestado de execução de serviço similar por um prazo mínimo, em períodos sucessivos ou não, que não pode ser superior a 3 anos.",
    },
  ],
  fontes: [
    {
      titulo: "Lei nº 14.133/2021, art. 67 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art67",
      sustenta:
        "A lista fechada da qualificação técnica; a restrição às parcelas de 4% ou mais do valor total (§ 1º); quantidade mínima de até 50% e vedação de limitação de tempo (época) e de local (§ 2º); prazo mínimo de até 3 anos em serviços contínuos (§ 5º); substituição do profissional (§ 6º); atestado de subcontratado até 25% (§ 9º).",
    },
    {
      titulo: "Lei nº 14.133/2021, art. 64 (Planalto)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art64",
      sustenta:
        "Vedação de substituir ou apresentar documento novo após a entrega, salvo em diligência para complementação ou atualização; saneamento de erro ou falha que não altere a substância (§ 1º).",
    },
    {
      titulo: "TCU, pesquisa de súmulas (Súmula 263)",
      url: "https://pesquisa.apps.tcu.gov.br/pesquisa/sumula",
      sustenta:
        "Legalidade da exigência de quantitativos mínimos na capacidade técnico-operacional, limitada às parcelas de maior relevância e valor significativo e proporcional ao objeto.",
    },
    {
      titulo: "TCU, Licitações e Contratos: habilitação",
      url: "https://licitacoesecontratos.tcu.gov.br/5-5-habilitacao-2/",
      sustenta:
        "Enunciado do Acórdão 1211/2021-TCU-Plenário: a vedação do art. 64 não alcança documento ausente que comprova condição atendida quando a proposta foi apresentada.",
    },
  ],
  publicado: true,
};
