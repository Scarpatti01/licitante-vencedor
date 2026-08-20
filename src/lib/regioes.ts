/**
 * As páginas regionais, e o portão que decide quais existem.
 *
 * O agregado por município é versionado pela coleta desde o começo, e a tentação
 * óbvia é transformar cada linha dele numa página. Os números do dia em que este
 * arquivo nasceu explicam por que isso seria um erro: de 63 municípios no
 * agregado, **37 tinham exatamente um edital** e apenas 3 tinham cinco ou mais.
 * Publicar os 63 produziria 60 páginas quase vazias, quase idênticas entre si —
 * a versão em miniatura das "centenas de páginas rasas" que o roadmap recusa, e
 * que cobrariam o preço no domínio inteiro, não só nelas.
 *
 * Conteúdo raso e repetido não é neutro: ele dilui a autoridade que os nove
 * guias construíram, e o custo cai sobre as páginas que convertem.
 *
 * ## O portão
 *
 * Uma página existe quando há dado que a sustente. Dois critérios, e os dois
 * precisam passar:
 *
 * `MINIMO_DE_EDITAIS` — volume. Um edital não é um retrato do município; é uma
 *   coincidência da janela coletada.
 * `MINIMO_DE_ORGAOS` — variedade. Seis editais do mesmo órgão descrevem aquele
 *   órgão, não o município. É o critério que separa "aqui há um mercado" de
 *   "aqui houve uma compra".
 *
 * O efeito é que a funcionalidade se auto-regula: com a cobertura de hoje ela
 * publica pouca coisa, e conforme a coleta melhora as páginas aparecem sozinhas,
 * sem ninguém decidir de novo.
 *
 * ## O que estas páginas NÃO são
 *
 * Não são listagem de editais abertos. O agregado é um retrato do instante da
 * coleta, e edital tem prazo: publicar "34 editais abertos em Recife" a partir
 * de um arquivo de dois dias atrás seria afirmar como presente o que já pode ter
 * encerrado. A página descreve o MERCADO — quanto se compra, por quais
 * modalidades, quantos órgãos — e diz a data da medição em toda afirmação.
 */

import agregados from "../../dados/agregados.json" with { type: "json" };
import { normalizarParaBusca } from "./busca-de-pracas";
import type { MunicipioAgregado } from "./pncp/agregarPorMunicipio.ts";

export type { MunicipioAgregado };

/**
 * Volume mínimo para um município virar página.
 *
 * Cinco é o menor número em que a página consegue dizer algo que o visitante
 * não conseguiria olhando um edital: distribuição por modalidade, faixa de
 * valor, quantos órgãos compram. Abaixo disso o texto viraria preenchimento em
 * volta de um número.
 */
export const MINIMO_DE_EDITAIS = 5;

/**
 * Órgãos distintos mínimos.
 *
 * Existe porque volume sozinho engana: um município com seis editais de uma
 * prefeitura só descreve aquela prefeitura. Dois órgãos diferentes já mostram
 * que há mais de uma porta de entrada, que é a informação que interessa a quem
 * decide onde vender.
 */
export const MINIMO_DE_ORGAOS = 2;

/** Quando o agregado foi medido. Toda afirmação de página cita isto. */
export const MEDIDO_EM: string = agregados.coletadoEm;

/**
 * Normaliza o agregado na carga, em vez de confiar no formato.
 *
 * O TypeScript infere tipos literais de um `import` de JSON, e como cada
 * município tem um conjunto diferente de modalidades, o tipo inferido é uma
 * união em que as chaves ausentes valem `undefined` — incompatível com
 * `Record<string, number>`. Um `as unknown as` calaria o compilador e é o que
 * seria fácil fazer aqui.
 *
 * A normalização custa poucas linhas e paga por si: o arquivo é gerado por um
 * script que roda contra uma API pública instável, e uma linha truncada viraria
 * página com `NaN` no lugar do valor. Entrada malformada é descartada, no mesmo
 * espírito de `leads-painel.ts` — o que não dá para exibir com honestidade não é
 * exibido.
 */
function normalizar(bruto: unknown): MunicipioAgregado[] {
  if (!Array.isArray(bruto)) return [];

  return bruto.flatMap((linha) => {
    const m = linha as Record<string, unknown>;
    const textos = ["uf", "municipio", "slug", "ibge"] as const;
    if (textos.some((c) => typeof m[c] !== "string" || !m[c])) return [];

    const numeros = ["editais", "valor", "orgaos"] as const;
    if (numeros.some((c) => typeof m[c] !== "number" || !Number.isFinite(m[c]))) return [];

    const modalidades: Record<string, number> = {};
    if (m.modalidades && typeof m.modalidades === "object") {
      for (const [nome, qtd] of Object.entries(m.modalidades as Record<string, unknown>)) {
        if (typeof qtd === "number" && Number.isFinite(qtd)) modalidades[nome] = qtd;
      }
    }

    // Ausente em todo agregado gerado antes desta coluna existir — `{}`, e
    // não descarte do município: o resto da página continua tendo o que
    // mostrar, só a seção de compradores nomeados fica de fora até a
    // próxima coleta regravar o arquivo com o campo novo.
    const compradores: Record<string, { nome: string; editais: number }> = {};
    if (m.compradores && typeof m.compradores === "object") {
      for (const [cnpj, valor] of Object.entries(m.compradores as Record<string, unknown>)) {
        const c = valor as Record<string, unknown>;
        if (typeof c?.nome === "string" && c.nome && typeof c?.editais === "number" && Number.isFinite(c.editais)) {
          compradores[cnpj] = { nome: c.nome, editais: c.editais };
        }
      }
    }

    return [
      {
        uf: m.uf as string,
        municipio: m.municipio as string,
        slug: m.slug as string,
        ibge: m.ibge as string,
        editais: m.editais as number,
        valor: m.valor as number,
        orgaos: m.orgaos as number,
        modalidades,
        compradores,
      },
    ];
  });
}

const TODOS: readonly MunicipioAgregado[] = normalizar(agregados.municipios);

/**
 * O município tem lastro para uma página própria?
 *
 * Separado da filtragem para o teste poder exercitar as bordas sem depender do
 * conteúdo do agregado versionado, que muda a cada coleta.
 */
export function temLastro(m: Pick<MunicipioAgregado, "editais" | "orgaos">): boolean {
  return m.editais >= MINIMO_DE_EDITAIS && m.orgaos >= MINIMO_DE_ORGAOS;
}

/**
 * Os municípios publicáveis, do maior para o menor.
 *
 * Ordem estável — volume e, no empate, nome — para a lista não embaralhar entre
 * builds e fazer parecer que algo mudou quando nada mudou.
 */
export function municipiosPublicaveis(): MunicipioAgregado[] {
  return TODOS.filter(temLastro).sort(
    (a, b) => b.editais - a.editais || a.municipio.localeCompare(b.municipio, "pt-BR"),
  );
}

export function municipioPorSlug(uf: string, slug: string): MunicipioAgregado | null {
  const alvoUf = uf.toUpperCase();
  return (
    municipiosPublicaveis().find((m) => m.uf === alvoUf && m.slug === slug) ?? null
  );
}

/** `/licitacoes/pe/recife/` — UF em minúscula, como todo endereço do site. */
export function caminhoDoMunicipio(m: Pick<MunicipioAgregado, "uf" | "slug">): string {
  return `/licitacoes/${m.uf.toLowerCase()}/${m.slug}/`;
}

/**
 * A UF deste município foi coletada por inteiro?
 *
 * A resposta vai para a página, e não fica só no relatório interno: um mercado
 * medido a partir de coleta parcial é um mercado subestimado, e quem lê tem
 * direito de saber disso antes de concluir que a cidade compra pouco.
 */
export function ufFoiCompleta(uf: string): boolean {
  return estadoDaUf(uf) === "completa";
}

/**
 * O estado de coleta de uma UF, lido de `cobertura.porUf`.
 *
 * **Lê `porUf`, e não `ufsCompletas`, de propósito.** As duas listas descrevem a
 * mesma coisa e têm formatos DIFERENTES no mesmo arquivo: `ufsCompletas` é um
 * array de strings (`["PE","AL"]`) enquanto `ufsParciais` é um array de objetos
 * (`[{uf:"PB",estado:"parcial",…}]`). A primeira versão disto assumia objetos
 * nos dois e teria respondido `false` para toda UF — fazendo cada página
 * declarar "esta UF não foi coletada por inteiro" mesmo quando foi. O
 * compilador pegou, porque o agregado anterior tinha a lista vazia e a nova
 * não.
 *
 * `porUf` cobre todas as UFs solicitadas com um formato só, e é o campo que a
 * própria coleta usa para classificar. Depender dele elimina a chance de as
 * duas leituras discordarem.
 */
export function estadoDaUf(uf: string): "completa" | "parcial" | "falha" | "desconhecida" {
  const alvo = uf.toUpperCase();
  const linhas = (agregados.cobertura?.porUf ?? []) as { uf?: unknown; estado?: unknown }[];

  for (const linha of linhas) {
    if (linha.uf !== alvo) continue;
    return linha.estado === "completa" || linha.estado === "parcial" || linha.estado === "falha"
      ? linha.estado
      : "desconhecida";
  }

  return "desconhecida";
}

/** As modalidades ordenadas, para a página não decidir isso na renderização. */
export function modalidadesOrdenadas(m: MunicipioAgregado): { nome: string; editais: number }[] {
  return Object.entries(m.modalidades)
    .map(([nome, editais]) => ({ nome, editais }))
    .sort((a, b) => b.editais - a.editais || a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Os maiores compradores do município, do maior para o menor volume.
 *
 * `limite = 5`: o suficiente para a página dizer algo específico sem virar
 * lista de todo órgão que comprou uma vez. Município com menos compradores
 * que o limite devolve todos — o portão em `temLastro` já garante pelo menos
 * `MINIMO_DE_ORGAOS`.
 *
 * Vazio para todo agregado gerado antes de `compradores` existir no arquivo —
 * a página trata isso como "sem esta seção", não como erro.
 */
export function principaisCompradores(
  m: MunicipioAgregado,
  limite = 5,
): { nome: string; editais: number }[] {
  return Object.values(m.compradores)
    .sort((a, b) => b.editais - a.editais || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite);
}

/**
 * As 27 UFs por extenso.
 *
 * Existe para dois usos que precisam concordar: o rótulo do acordeão ("Ceará",
 * não "CE") e a busca por estado — quem digita "pernambuco" espera as praças de
 * PE, e quem digita "PE" espera exatamente a mesma coisa.
 *
 * Lista fechada e completa, e não só as UFs coletadas hoje, para o dia em que a
 * cobertura crescer não deixar uma praça com rótulo faltando. É a mesma razão de
 * `alertas/regiao.ts` fechar a lista dele: o conjunto não muda desde 1988.
 */
export const NOME_DA_UF: Readonly<Record<string, string>> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina",
  SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

/** O nome por extenso, ou a própria sigla quando ela não for reconhecida. */
export function nomeDaUf(uf: string): string {
  return NOME_DA_UF[uf.toUpperCase()] ?? uf.toUpperCase();
}

export type GrupoDeUf = {
  uf: string;
  /** "Ceará". */
  nome: string;
  municipios: MunicipioAgregado[];
  /** Soma das contratações do grupo. */
  editais: number;
};

/**
 * As praças agrupadas por UF, para o acordeão.
 *
 * **Soma contratações e NÃO soma órgãos, de propósito.** Cada contratação
 * pertence a um município só, então somá-las é aritmética honesta. Órgãos, não:
 * uma secretaria estadual que compra em três municípios aparece nas três linhas,
 * e o total diria "138 órgãos compradores no Ceará" quando o número real é menor
 * e desconhecido. Preferimos não afirmar a afirmar inflado — o mesmo critério
 * que mantém `orgaos` visível por município, onde ele é exato.
 *
 * Ordem por volume, e nome no empate, para a lista não embaralhar entre builds.
 */
export function pracasPorUf(municipios: MunicipioAgregado[] = municipiosPublicaveis()): GrupoDeUf[] {
  const grupos = new Map<string, MunicipioAgregado[]>();

  for (const m of municipios) {
    const atual = grupos.get(m.uf);
    if (atual) atual.push(m);
    else grupos.set(m.uf, [m]);
  }

  return [...grupos.entries()]
    .map(([uf, lista]) => ({
      uf,
      nome: nomeDaUf(uf),
      municipios: lista,
      editais: lista.reduce((soma, m) => soma + m.editais, 0),
    }))
    .sort((a, b) => b.editais - a.editais || a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Uma praça reduzida ao que a busca precisa.
 *
 * O recorte não é economia de digitação: este módulo carrega
 * `dados/agregados.json`, que tem ~100 KB e 576 municípios. Um componente de
 * cliente que importasse `regioes.ts` levaria o arquivo INTEIRO para o
 * navegador, porque a normalização roda no topo do módulo e nenhum tree-shaking
 * a remove.
 *
 * Por isso quem monta a lista é o servidor, e o cliente recebe só estas linhas —
 * 96 hoje, ~7 KB. O casador vive em `busca-de-pracas.ts`, que não importa dado
 * nenhum e por isso pode ser importado dos dois lados.
 */
export type PracaParaBusca = {
  nome: string;
  uf: string;
  href: string;
  /**
   * O texto contra o qual o casador compara, já sem acento e em minúscula:
   * `"fortaleza ce ceara"`. Normalizado aqui, no servidor, uma vez por build —
   * e não 96 vezes a cada tecla digitada no navegador.
   */
  busca: string;
};

export function pracasParaBusca(): PracaParaBusca[] {
  return municipiosPublicaveis().map((m) => ({
    nome: m.municipio,
    uf: m.uf,
    href: caminhoDoMunicipio(m),
    busca: normalizarParaBusca(`${m.municipio} ${m.uf} ${nomeDaUf(m.uf)}`),
  }));
}

/** O que o hero afirma, lido da última coleta versionada. */
export type NumerosDaColeta = {
  /** Editais varridos na última coleta boa. */
  editais: number;
  /** Quantas UFs foram varridas por inteiro ou em parte. */
  ufs: number;
  /** As siglas, para quem quiser conferir quais. */
  siglas: string[];
  /**
   * Como dizer a abrangência em português, sem exagerar.
   *
   * Vira "todo o Brasil" **sozinho** no dia em que as 27 forem varridas. Até lá
   * diz o número real de estados, porque a diferença entre "6 estados" e "todo o
   * Brasil" é a diferença entre uma afirmação verificável e uma propaganda que o
   * primeiro visitante do Sul desmente sozinho.
   */
  abrangencia: string;
  /** ISO do instante da coleta. */
  medidoEm: string;
};

/**
 * Os números que a home exibe.
 *
 * ## Por que o hero lê daqui, e não de um número escrito à mão
 *
 * Um número chumbado no JSX é verdade no dia em que foi escrito e mentira em
 * todos os outros. A coleta roda diariamente e commita o agregado; o hero
 * acompanha sem ninguém lembrar de atualizá-lo — que é exatamente o tipo de
 * lembrança que ninguém tem.
 *
 * Isto já evitou um erro concreto: o número pedido para o hero era "3.128
 * editais em todo o Brasil", e a coleta do dia trouxe 3.444 em 6 UFs. As duas
 * metades estavam erradas, e nenhuma teria sido percebida depois de publicada.
 */
export function numerosDaColeta(): NumerosDaColeta {
  const linhas = (agregados.cobertura?.porUf ?? []) as { uf?: unknown; editais?: unknown }[];

  const siglas: string[] = [];
  let editais = 0;

  for (const linha of linhas) {
    if (typeof linha.uf === "string") siglas.push(linha.uf);
    if (typeof linha.editais === "number" && Number.isFinite(linha.editais)) {
      editais += linha.editais;
    }
  }

  const ufs = siglas.length;

  return {
    editais,
    ufs,
    siglas,
    // 27 unidades federativas: 26 estados e o Distrito Federal.
    abrangencia: ufs >= 27 ? "em todo o Brasil" : `em ${ufs} ${ufs === 1 ? "estado" : "estados"}`,
    medidoEm: MEDIDO_EM,
  };
}
