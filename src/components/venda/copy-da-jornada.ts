/**
 * A copy da página de venda da jornada.
 *
 * ## Por que ela mora separada da tela
 *
 * Texto de venda se reescreve muito mais vezes que layout, e misturar os dois
 * faz cada ajuste de vírgula passar por JSX. Aqui o texto é lido e revisado
 * como texto.
 *
 * ## A régua
 *
 * **Promessa de transformação, nunca descrição de funcionalidade.** Ninguém
 * compra "doze etapas com campos preenchíveis". Compra "daqui a três meses
 * minha empresa está disputando".
 *
 * **Toda promessa tem lastro.** Cada número veio da coleta própria do PNCP, com
 * data. Promessa sem lastro é o que faz este mercado ter tanto infoproduto
 * ruim, e é justamente onde está o argumento de venda.
 *
 * **A honestidade converte melhor que o entusiasmo.** A seção de quem NÃO deve
 * comprar não é modéstia: é o que torna o resto acreditável para quem já foi
 * enganado antes.
 */

export const HERO = {
  etiqueta: "Jornada de 12 semanas",
  /** Quebra de padrão, no máximo três linhas, com as palavras de destaque marcadas. */
  titulo: [
    { texto: "Pare de perder licitação por ", destaque: false },
    { texto: "papel vencido", destaque: true },
    { texto: " e por ", destaque: false },
    { texto: "edital que você nem viu", destaque: true },
    { texto: ".", destaque: false },
  ],
  subtitulo:
    "Em 12 semanas, com 4 horas por semana, a sua empresa sai do zero e disputa a primeira licitação sabendo exatamente o que está fazendo.",
  apoio:
    "O que muda não é o seu preço nem o seu produto. É ter, pela primeira vez, um processo que cabe na semana que você realmente tem.",
  microcopy: "Acesso imediato. 7 dias de garantia. Pagamento seguro.",
};

export const DESBLOQUEIA = {
  titulo: "O que você desbloqueia com a Jornada de 12 Semanas",
  intro: "Oito coisas que você não tem hoje, e vai ter até o fim.",
  cards: [
    {
      icone: "bussola",
      titulo: "A certeza de que vale a pena",
      texto: "Um veredito escrito por você, na primeira semana, sobre entrar agora ou resolver o quê antes.",
    },
    {
      icone: "calendario",
      titulo: "Nunca mais perder por documento",
      texto: "Um calendário de certidões que elimina para sempre a causa de derrota mais boba deste mercado.",
    },
    {
      icone: "lupa",
      titulo: "Enxergar os editais que são seus",
      texto: "As palavras que o comprador usa, que quase nunca são as suas, e os órgãos que compram perto de onde você entrega.",
    },
    {
      icone: "relogio",
      titulo: "Trocar a queixa por um número",
      texto: "Quantos minutos por semana a triagem custa hoje. É esse número que transforma falta de tempo em decisão.",
    },
    {
      icone: "documento",
      titulo: "Ler um edital em dez minutos",
      texto: "Decidir se vale gastar duas horas antes de gastar as duas horas, na ordem que economiza tempo.",
    },
    {
      icone: "moeda",
      titulo: "Um piso que você não fura",
      texto: "O preço abaixo do qual você não desce, com os custos que quem vem do setor privado sempre esquece.",
    },
    {
      icone: "trofeu",
      titulo: "Disputar sem tremer na sessão",
      texto: "Um roteiro do minuto zero à intenção de recurso, para a primeira vez não ser aprendida no susto.",
    },
    {
      icone: "engrenagem",
      titulo: "Um processo, não uma lembrança",
      texto: "Ao fim, algo que outra pessoa da sua equipe consegue seguir sem você do lado.",
    },
  ],
};

export const DOR = {
  titulo: "Você já esteve em um destes dois lugares",
  casos: [
    {
      titulo: "Abriu o portal uma vez",
      texto:
        "Viu centenas de editais, não reconheceu nenhum como seu, e fechou a aba com a sensação de que aquilo era para empresa grande. Nunca mais voltou.",
    },
    {
      titulo: "Disputou, perdeu, e não soube por quê",
      texto:
        "Montou a proposta, entrou na sessão, foi eliminado. Ninguém explicou direito o motivo, e ficou a impressão de que já estava tudo combinado antes.",
    },
  ],
  armadilhas: {
    titulo: "As três armadilhas em que quase todo mundo cai",
    itens: [
      {
        titulo: "Achar que é tudo combinado",
        texto: "Direcionamento existe. Tratar o mercado inteiro como combinado é a explicação confortável para não participar, e quem não participa não ganha nunca.",
      },
      {
        titulo: "Deixar a papelada para depois",
        texto: "É a parte chata, então fica por último. Aí chega o primeiro edital que importava e a certidão está vencida.",
      },
      {
        titulo: "Estrear num edital grande",
        texto: "O primeiro certame serve para aprender o sistema. Quem escolhe o contrato importante para estrear desiste do mercado por causa de um erro de operação.",
      },
    ],
  },
  virada:
    "Nenhum desses problemas é falta de capacidade. É falta de ordem. E ordem é exatamente o que se aprende em doze semanas.",
};

export const VERDADES = {
  titulo: "Três números que mudam a conversa",
  fonte: "Medido na coleta própria do Portal Nacional de Contratações Públicas, em agosto de 2026.",
  itens: [
    {
      numero: "65%",
      titulo: "do que se publica é prefeitura",
      texto:
        "O seu comprador provável não é Brasília. É a cidade ao lado, com uma compra do tamanho que a sua empresa já entrega hoje.",
    },
    {
      numero: "R$ 10 mil",
      titulo: "é o valor típico de uma dispensa",
      texto:
        "Um em cada cinco editais é dispensa, o caminho mais curto e menos disputado. É por onde quase todo fornecedor pequeno deveria começar, e quase nenhum começa.",
    },
    {
      numero: "89,8%",
      titulo: "das dispensas fecham em menos de 8 dias",
      texto:
        "É por isso que quem confere o portal de vez em quando não vê. A oportunidade nasce e morre dentro da semana em que você estava ocupado.",
    },
  ],
};

export const TRANSFORMACAO = {
  titulo: "O que muda em você, semana a semana",
  intro:
    "Você não sai de cada semana com informação. Sai com uma coisa pronta que não tinha antes.",
  marcos: [
    {
      semana: "Semana 1",
      promessa: "Você para de adivinhar se isso serve para você",
      texto:
        "É a única semana que pode dizer não, e é por isso que ela vem primeiro. Ninguém mais começa por aqui, porque a resposta pode ser não e não vende.",
    },
    {
      semana: "Semanas 2 a 4",
      promessa: "Você nunca mais é eliminado por papel",
      texto:
        "Certidões levantadas, vencimentos num calendário, cadastros feitos na ordem que funciona. A derrota mais boba do mercado deixa de existir na sua empresa.",
    },
    {
      semana: "Semanas 5 e 6",
      promessa: "Os editais que são seus começam a aparecer",
      texto:
        "Você descobre as palavras que o comprador usa e o mapa dos órgãos que compram o que você vende, perto de onde você consegue entregar.",
    },
    {
      semana: "Semana 7",
      promessa: "Você troca uma queixa por um número",
      texto:
        "Sete dias cronometrados. Sai com quantos minutos a triagem custa por semana, e é esse número que sustenta todas as decisões que vêm depois.",
    },
    {
      semana: "Semanas 8 e 9",
      promessa: "Você lê um edital sem medo e forma preço sem chute",
      texto:
        "Três editais lidos inteiros, sem disputar nenhum. E o piso calculado para um edital real, com o custo do prazo de pagamento dentro.",
    },
    {
      semana: "Semana 10",
      promessa: "Você disputa",
      texto:
        "Uma escolhida a dedo para você aprender o sistema, e não para ganhar. Valor pequeno, objeto que você já vende, prazo folgado.",
    },
    {
      semana: "Semanas 11 e 12",
      promessa: "Você sai com um processo, não com uma lembrança",
      texto:
        "Escreve a causa real do que deu errado e decide o que vale automatizar, com o número da semana 7 na mão. Disputar deixa de ser evento e vira rotina.",
    },
  ],
};

export const ANTES_E_DEPOIS = {
  titulo: "Antes e depois de doze semanas",
  linhas: [
    { antes: "Abre o portal e não reconhece nada", depois: "Sabe exatamente quais palavras procurar" },
    { antes: "Descobre o edital quando já fechou", depois: "Confere em dois dias marcados na semana" },
    { antes: "Perde por certidão vencida", depois: "Tem calendário de certidão e nunca mais perde por isso" },
    { antes: "Dá lance no impulso e ganha sem margem", depois: "Tem um piso escrito antes de a sessão abrir" },
    { antes: "Acha que é tudo combinado", depois: "Reconhece edital direcionado em dez minutos e vai para o próximo" },
    { antes: "Tudo depende de você lembrar", depois: "Tem um processo que outra pessoa consegue seguir" },
  ],
};

export const AUTOR = {
  titulo: "Quem é Leandro Scarpatti",
  cargo: "Fundador do Licitante Vencedor, especialista em Inteligência Artificial e analista de licitações",
  bullets: [
    "Acompanha diariamente as publicações do Portal Nacional de Contratações Públicas, com coleta própria nas 27 unidades da federação",
    "Escreve e assina todo o conteúdo do licitantevencedor.com.br, com data de revisão em cada guia",
    "Construiu e opera o sistema que lê edital com inteligência artificial e compara com o perfil da empresa",
    "Todo número deste material saiu da operação real, com a data ao lado, e não de estimativa",
  ],
  historia: [
    "O que me levou até aqui foi ver, todo dia, o mesmo desperdício: empresas pequenas perfeitamente capazes de entregar, perdendo oportunidade no setor público não por falta de competência, mas por falta de tempo para ler. Milhares de editais publicados por dia, quase nenhum servindo, e os poucos que servem exigindo horas de leitura para descobrir se valem a disputa.",
    "Quem tem departamento de licitações faz isso. Quem não tem, não participa. A Jornada existe para tirar essa desvantagem do caminho, e ela é a mesma ordem de passos que eu daria a um amigo dono de empresa que me perguntasse por onde começar.",
  ],
};

export const CONTEUDO = {
  titulo: "O que você está levando hoje",
  itens: [
    {
      titulo: "As 12 semanas guiadas, dentro do sistema",
      texto: "Cada uma com o que fazer, o critério de conclusão e o exercício. O progresso fica salvo e você volta de onde parou.",
    },
    {
      titulo: "O Workbook do Licitante completo",
      texto: "126 páginas em PDF, do diagnóstico honesto ao contrato assinado, incluindo obras e serviços de engenharia.",
    },
    {
      titulo: "8 folhas de trabalho para preencher e reusar",
      texto: "Habilitação, leitura de edital, contrato, registro de disputas, obra, e a conferência de dois minutos antes de enviar qualquer proposta.",
    },
    {
      titulo: "Suas respostas em PDF, quando quiser",
      texto: "Tudo o que você preencher vira um documento pronto para imprimir, levar para a reunião ou entregar a quem for cuidar disso com você.",
    },
    {
      titulo: "Glossário de 89 termos do edital",
      texto: "Para quando o documento usar uma palavra que ninguém explicou, e a leitura travar bem no ponto que decide se você disputa.",
    },
  ],
};

export const NAO_E_PARA = {
  titulo: "Para quem isto não serve",
  intro:
    "Prefiro perder a venda a devolver o dinheiro depois. Se você se reconhecer aqui, não invista agora.",
  casos: [
    "Quem precisa de faturamento neste mês. O primeiro contrato costuma vir entre o quarto e o sexto mês, e prometer diferente seria mentira.",
    "Quem está com o caixa apertado a menos de sessenta dias. O governo paga, e paga no prazo dele. Resolva o fôlego antes.",
    "Quem quer atalho. Não existe lista secreta de editais fáceis, e quem vende isso está vendendo outra coisa.",
    "Quem não tem quatro horas por semana. A jornada é curta, e ainda assim é trabalho.",
  ],
};

export const DECLARACAO = {
  titulo: "O que eu ganho com isso",
  texto: [
    "Eu opero um agregador pago de editais e ganho dinheiro se você virar assinante. Digo isso aqui, e não na última página, porque dito no fim seria confissão.",
    "A Jornada não empurra a assinatura. Ela te faz medir quanto a triagem custa hoje na sua empresa, e esse número pode dizer que vale contratar alguém, montar o seu próprio fluxo, ou continuar à mão. As alternativas ao que eu vendo estão descritas dentro do material, com os defeitos do meu lado incluídos.",
    "Se você fizer as doze semanas e nunca me pagar mensalidade nenhuma, a Jornada fez o trabalho dela.",
  ],
};

export const FAQ = [
  {
    pergunta: "Preciso ter experiência com licitação?",
    resposta:
      "Não, e a Jornada foi escrita supondo que você não tem. A semana 1 é um diagnóstico honesto sobre a sua empresa e as semanas 2 a 4 são a arrumação da casa que todo mundo pula e depois paga caro. Quem já disputa também ganha: a semana 7 costuma revelar um custo de triagem que ninguém tinha medido.",
  },
  {
    pergunta: "Serve mesmo para iniciante?",
    resposta:
      "Foi escrita para o iniciante, e por isso começa perguntando se este mercado serve para a sua empresa antes de qualquer outra coisa. O material inclui um glossário de 89 termos justamente para a leitura não travar na primeira palavra que ninguém explicou.",
  },
  {
    pergunta: "Por quanto tempo eu tenho acesso?",
    resposta:
      "Sem prazo. É pagamento único e o acesso não expira. Você pode fazer as doze semanas no seu ritmo, parar, voltar meses depois, e tudo o que você preencheu continua lá.",
  },
  {
    pergunta: "Como eu recebo o material?",
    resposta:
      "Assim que o pagamento é confirmado, o acesso é liberado na sua conta do licitantevencedor.com.br. Você entra, e as doze semanas estão lá, com o livro completo em PDF para baixar.",
  },
  {
    pergunta: "Isso é curso, mentoria ou e-book?",
    resposta:
      "É um caminho para fazer. Não tem aula em vídeo: tem o que fazer em cada semana, um critério de conclusão e um exercício que fica salvo. Foi desenhado assim de propósito, porque aula assistida vira anotação e exercício preenchido vira processo.",
  },
  {
    pergunta: "E se eu não gostar?",
    resposta:
      "Você tem 7 dias de garantia incondicional. Não precisa justificar nada: pede o reembolso e ele é feito. Prefiro devolver o seu dinheiro a ter alguém carregando um material que não serviu.",
  },
  {
    pergunta: "É garantido que eu vou ganhar uma licitação?",
    resposta:
      "Não, e desconfie de quem garantir. Licitação é disputa aberta, e um concorrente com custo menor pode ganhar de você em qualquer certame. O que a Jornada muda é a proporção: quantas você disputa, quantas você perde por motivo evitável, e quanto custa cada tentativa.",
  },
  {
    pergunta: "Por que o valor é tão acessível?",
    resposta:
      "Porque o material já estava escrito, e porque o meu negócio principal é a assinatura do sistema de triagem, não a venda deste livro. Prefiro que muita gente pequena consiga entrar neste mercado a extrair o máximo de poucos.",
  },
  {
    pergunta: "Funciona para o meu ramo?",
    resposta:
      "O governo compra quase tudo: material de escritório, alimento, uniforme, informática, manutenção, serviço técnico, obra. As doze semanas são as mesmas para qualquer ramo, e a semana 5 é justamente onde você descobre quais órgãos compram o que você vende. Obras e engenharia, que são 17,5% do que se publica, têm capítulo e folha de trabalho próprios.",
  },
  {
    pergunta: "Consigo acessar pelo celular?",
    resposta:
      "Sim. As doze semanas funcionam no navegador do celular, do tablet ou do computador, e o livro em PDF abre em qualquer aparelho. Os exercícios você pode preencher na tela ou imprimir a folha e escrever à mão.",
  },
];

export const ULTIMO_CTA = {
  titulo: "A decisão é sua",
  texto:
    "Continuar achando que licitação é para os outros, ou começar hoje com um caminho claro e doze semanas pela frente.",
  lembrete:
    "Daqui a três meses esse tempo vai ter passado de qualquer jeito. A única diferença é se a sua empresa vai estar disputando.",
};

export const DISCLAIMER = [
  "Este site não é afiliado, associado, autorizado, endossado por, nem de qualquer forma oficialmente conectado a Meta, Google, TikTok ou qualquer plataforma de anúncios. Todos os nomes de produtos, logotipos e marcas pertencem aos seus respectivos titulares.",
  "Os resultados variam de empresa para empresa e dependem de fatores fora do nosso controle, entre eles o ramo de atuação, a praça, a capacidade de entrega, a situação fiscal e o esforço aplicado. Não há promessa nem garantia de resultado em certame algum.",
  "O material tem finalidade informativa e operacional. Não constitui parecer jurídico, não substitui advogado nem contador, e a decisão de participar de uma licitação e de assinar um contrato é sempre da empresa licitante. Em qualquer divergência entre o que está no material e o que diz o edital, prevalece o edital.",
];
