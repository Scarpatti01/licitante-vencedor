/**
 * A régua do título que vai para o resultado de busca.
 *
 * ## O que foi medido, e que obrigou este arquivo a existir
 *
 * Nos primeiros 28 dias do site (exportação do Search Console de 25/08):
 * 2.291 impressões, 17 cliques, CTR de 0,74%. E o site NÃO tem problema de
 * posição — 211 páginas estão entre a 4ª e a 10ª colocação, e 90% das nossas
 * impressões vêm da primeira página do Google. Aplicando uma curva de CTR por
 * posição sobre exatamente essas mesmas impressões, o esperado seriam 70
 * cliques. Estamos deixando uns 53 cliques por mês na mesa sem que falte
 * ranqueamento.
 *
 * Dentro disso, as páginas de guia somaram 183 impressões e **zero** clique.
 * Nenhum. E o motivo estava no título: `/contratos/` chegava na busca como
 * "Contrato administrativo: o guia do fornecedor". Quem digita "aditivo
 * contrato administrativo" lê as primeiras palavras e decide; "o guia do
 * fornecedor" gasta metade do espaço dizendo o FORMATO do texto, não a
 * resposta. É o mesmo defeito que `regioes/serp.ts` já tinha diagnosticado e
 * corrigido para a página de município, e que ninguém tinha percebido que
 * também morava aqui.
 *
 * ## O defeito estrutural que apareceu junto
 *
 * Catorze páginas declaravam `const TITULO = "..."` e depois passavam OUTRA
 * string para `metadata.title`. O `openGraph` usava o `TITULO`, a busca usava
 * o outro. Duas verdades sobre a mesma página, e a que ia para o Google era
 * sempre a mais fraca, porque era a que ninguém tinha escolhido de propósito:
 * ela nasceu como rascunho e ficou.
 *
 * Por isso a guarda de `titulos-das-paginas.test.ts` cobra título único. Não é
 * preferência de estilo: é impedir que a página tenha um título que ninguém
 * decidiu.
 *
 * ## O que esta régua NÃO tenta fazer
 *
 * Ela não julga se o título é bom. Nenhum teste sabe se "prazo, aditivo de 25%,
 * reajuste e sanções" responde melhor que "o guia do fornecedor" — isso é
 * julgamento de quem escreve. O que dá para mecanizar é o contrário: reprovar
 * as formas que já sabemos que falham. Uma guarda que só reprova o erro
 * conhecido é honesta sobre o próprio alcance.
 */

/** O sufixo que `app/layout.tsx` gruda em todo título, via `title.template`. */
export const SUFIXO_DA_MARCA = " | Licitante Vencedor";


/**
 * Quantos caracteres do título o Google costuma exibir antes de cortar.
 *
 * O limite real é de pixels (uns 580 no desktop, menos no celular), não de
 * caracteres, então isto é aproximação. Serve para uma coisa só: garantir que a
 * RESPOSTA caiba antes do corte. O sufixo da marca ser cortado não é problema —
 * ele é a parte descartável, e é por isso que ele fica no fim.
 */
export const CARACTERES_EXIBIDOS = 60;

/**
 * O teto do título da própria página, sem o sufixo.
 *
 * Um pouco acima de `CARACTERES_EXIBIDOS` de propósito: uma cauda de dez
 * caracteres que se perde no corte não custa nada, e às vezes é o que permite
 * fechar a frase para quem lê o título inteiro na aba do navegador. O que não
 * pode é o título ser tão longo que a resposta caia depois do corte.
 */
export const TETO_DO_TITULO = 70;

/**
 * O teto do título COMO ELE CHEGA À BUSCA, com a marca já grudada.
 *
 * ## A correção de 26/08, e ela invalidou o número de todo mundo
 *
 * Esta régua nasceu medindo o título CRU e comparando com 70. O layout acrescenta
 * `SUFIXO_DA_MARCA` depois, e ninguém tinha descontado isso: um título de 55
 * caracteres passava na guarda e chegava ao Google com 76.
 *
 * O relatório do Ahrefs de 26/08 mostrou o tamanho do estrago: **1.028 páginas
 * com título longo demais**, de 1.071 analisadas. Reproduzi na build e achei
 * 1.026. Nenhum teste tinha reclamado, porque todos mediam a string errada.
 *
 * Agora a conferência é sobre o título renderizado, e o orçamento do título cru
 * passa a ser o que sobra: 49 caracteres. É apertado de propósito. O Google
 * exibe uns 60, então tudo que passa disso é espaço que o leitor não vê.
 */
export const ORCAMENTO_DO_TITULO = TETO_DO_TITULO - SUFIXO_DA_MARCA.length;

/**
 * O título como o buscador vai mostrá-lo.
 *
 * Existe para a régua medir a mesma coisa que o leitor lê. Quem já traz a marca
 * no texto não ganha outra: `conferirTitulo` reprova esse caso à parte, e somar
 * de novo aqui daria um número que não corresponde a página nenhuma.
 */
export function tituloRenderizado(titulo: string): string {
  const limpo = titulo.trim();
  return limpo.includes(SUFIXO_DA_MARCA.trim()) ? limpo : limpo + SUFIXO_DA_MARCA;
}

/**
 * As palavras que descrevem o FORMATO do texto em vez do seu conteúdo.
 *
 * Nenhuma delas é proibida no título inteiro: "Guias e artigos sobre licitações
 * públicas" é o nome honesto de uma página de índice, e reprovar isso seria a
 * guarda atrapalhando em vez de proteger. O que a régua proíbe é uma coisa mais
 * estreita e mais danosa: ocupar com formato o espaço logo depois dos dois
 * pontos, que é onde o leitor procura a resposta.
 */
export const PALAVRAS_DE_METODO = [
  "guia",
  "guias",
  "tudo sobre",
  "tudo o que",
  "entenda",
  "saiba",
  "conheça",
  "descubra",
  "panorama",
  "visão geral",
  "introdução",
  "retrato",
  "o que você precisa saber",
] as const;

/**
 * Quantos caracteres da descrição o Google costuma exibir.
 *
 * Também é aproximação de pixels, e também serve para uma coisa só: a frase
 * precisa TERMINAR antes do corte. Medido em 25/08, quinze das dezesseis
 * páginas com descrição própria passavam disto — iam de 160 a 229 caracteres —,
 * então o resumo de quase todo o site aparecia truncado no meio de uma
 * enumeração. Uma descrição cortada não é só feia: ela cobra do leitor a decisão
 * de clicar sem ter terminado de ler o motivo.
 *
 * O tipo `Artigo` do blog já trazia "até ~155 caracteres" como comentário, e o
 * blog obedecia. As páginas de guia não tinham a regra escrita em lugar nenhum
 * e, sem régua, todas cresceram. É o argumento de sempre aqui: regra que mora em
 * comentário só vale para quem leu o comentário.
 */
export const TETO_DA_DESCRICAO = 155;

export type FalhaDeTitulo = {
  regra: "vazio" | "marca-duplicada" | "longo-demais" | "metodo-na-promessa";
  /** Uma frase que diz o que fazer, não só o que está errado. */
  explicacao: string;
};

export type FalhaDeDescricao = {
  regra: "vazio" | "longa-demais" | "metodo-na-abertura";
  explicacao: string;
};

/** O trecho depois dos primeiros dois pontos: a "promessa" do título. */
export function promessaDoTitulo(titulo: string): string | null {
  const corte = titulo.indexOf(":");
  if (corte === -1) return null;
  return titulo.slice(corte + 1).trim();
}

function comecaComMetodo(promessa: string): string | null {
  // "o guia do fornecedor" e "guia do fornecedor" são o mesmo defeito; o artigo
  // na frente não muda nada para quem lê.
  const limpa = promessa
    .toLowerCase()
    .replace(/^(o|a|os|as|um|uma)\s+/u, "")
    .trim();

  for (const palavra of PALAVRAS_DE_METODO) {
    if (limpa === palavra || limpa.startsWith(`${palavra} `)) return palavra;
  }
  return null;
}

/**
 * Confere um título contra a régua. Devolve lista vazia quando ele passa.
 *
 * Devolve TODAS as falhas, e não só a primeira: quem está consertando um título
 * quer ver de uma vez tudo que precisa mudar, em vez de descobrir o segundo
 * problema depois de rodar o teste de novo.
 */
export function conferirTitulo(titulo: string): FalhaDeTitulo[] {
  const falhas: FalhaDeTitulo[] = [];
  const limpo = titulo.trim();

  if (limpo.length === 0) {
    return [{ regra: "vazio", explicacao: "título vazio: a página não tem nome na busca." }];
  }

  if (limpo.includes(SUFIXO_DA_MARCA.trim())) {
    falhas.push({
      regra: "marca-duplicada",
      explicacao:
        `o título já traz "${SUFIXO_DA_MARCA.trim()}", e o layout grava esse sufixo de novo. ` +
        "O resultado na busca sai com a marca repetida. Tire daqui e deixe o template pôr.",
    });
  }

  /*
   * Medido COM a marca, que é como a página chega à busca.
   *
   * Media sem, até 26/08, e por isso aprovou 1.026 títulos longos demais. O erro
   * não era o número 70: era comparar 70 com uma string que ninguém lê.
   */
  const renderizado = tituloRenderizado(limpo);
  if (renderizado.length > TETO_DO_TITULO) {
    falhas.push({
      regra: "longo-demais",
      explicacao:
        `${renderizado.length} caracteres com "${SUFIXO_DA_MARCA.trim()}" que o layout acrescenta ` +
        `(${limpo.length} sem), e o Google exibe uns ${CARACTERES_EXIBIDOS}. ` +
        `O título cru cabe em ${ORCAMENTO_DO_TITULO} caracteres, e este tem ${limpo.length}.`,
    });
  }

  const promessa = promessaDoTitulo(limpo);
  if (promessa !== null) {
    const palavra = comecaComMetodo(promessa);
    if (palavra !== null) {
      falhas.push({
        regra: "metodo-na-promessa",
        explicacao:
          `depois dos dois pontos vem "${palavra}", que descreve o formato do texto e não o que ` +
          "o leitor vai saber. Esse é o espaço da resposta: ponha ali o número, o prazo ou o " +
          "limite concreto que a página entrega.",
      });
    }
  }

  return falhas;
}

/**
 * Confere uma descrição contra a régua. Devolve lista vazia quando ela passa.
 *
 * A descrição é julgada pela abertura, e não pelo texto inteiro, pelo mesmo
 * motivo do título: o leitor decide nas primeiras palavras. `/contratos/` abria
 * com "Guia prático do contrato administrativo na Lei 14.133/2021 para
 * fornecedores:" e só depois dizia "prazo e prorrogação, aditivos de 25%" — as
 * onze primeiras palavras eram formato, e a resposta chegava quando o olho já
 * tinha passado.
 */
export function conferirDescricao(descricao: string): FalhaDeDescricao[] {
  const falhas: FalhaDeDescricao[] = [];
  const limpa = descricao.trim();

  if (limpa.length === 0) {
    return [
      { regra: "vazio", explicacao: "descrição vazia: o Google inventa o resumo no lugar." },
    ];
  }

  if (limpa.length > TETO_DA_DESCRICAO) {
    falhas.push({
      regra: "longa-demais",
      explicacao:
        `${limpa.length} caracteres, e o Google corta em uns ${TETO_DA_DESCRICAO}. ` +
        "Do jeito que está, o resumo aparece truncado no meio da frase.",
    });
  }

  const palavra = comecaComMetodo(limpa);
  if (palavra !== null) {
    falhas.push({
      regra: "metodo-na-abertura",
      explicacao:
        `abre com "${palavra}", que descreve o formato do texto. As primeiras palavras são ` +
        "as únicas garantidas de serem lidas: comece pelo que a página responde.",
    });
  }

  return falhas;
}

/**
 * Corta uma descrição montada em tempo de execução, sem partir palavra.
 *
 * ## Por que isto existe, além do bom senso
 *
 * A guarda de `resultado-de-busca.guarda.test.ts` lê o arquivo-fonte, então ela
 * só enxerga descrição escrita como literal. Duas páginas montam a sua a partir
 * de dado — `/precos/` interpola a mensalidade, `/editais-abertos/` interpola a
 * contagem do retrato — e passavam despercebidas pela régua. As duas estavam
 * fora do teto quando isto foi escrito: a de preços com 162 caracteres, e a de
 * editais abertos fazendo `.slice(0, 160)`, que corta no meio da palavra.
 *
 * Fechar esse furo com mais regex sobre o fonte seria perseguir uma expressão
 * que nunca cobre o caso seguinte. Em vez disso, quem monta descrição passa por
 * aqui, e a guarda cobra a passagem. O corte deixa de ser problema de disciplina
 * e vira propriedade do código.
 *
 * Corta na última fronteira de palavra e não acrescenta reticências: o Google
 * põe as dele quando corta, e duas reticências seguidas ficam piores que uma.
 */
export function limitarDescricao(texto: string, teto = TETO_DA_DESCRICAO): string {
  const limpo = texto.trim().replace(/\s+/gu, " ");
  if (limpo.length <= teto) return limpo;

  const cortado = limpo.slice(0, teto);
  const ultimoEspaco = cortado.lastIndexOf(" ");

  // Sem espaço nenhum no trecho (uma URL gigante, um nome sem espaços), cortar
  // seco é melhor que devolver o texto inteiro e estourar o teto em silêncio.
  const base = ultimoEspaco > 0 ? cortado.slice(0, ultimoEspaco) : cortado;

  // Terminar em vírgula ou dois pontos deixa a frase pendurada; o ponto final
  // que já estiver ali fica.
  return base.replace(/[\s,;:—-]+$/u, "");
}
