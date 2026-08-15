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

export type MunicipioAgregado = {
  uf: string;
  municipio: string;
  slug: string;
  ibge: string;
  editais: number;
  valor: number;
  orgaos: number;
  modalidades: Record<string, number>;
};

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
  const completas = (agregados.cobertura?.ufsCompletas ?? []) as { uf: string }[];
  return completas.some((c) => c.uf === uf.toUpperCase());
}

/** As modalidades ordenadas, para a página não decidir isso na renderização. */
export function modalidadesOrdenadas(m: MunicipioAgregado): { nome: string; editais: number }[] {
  return Object.entries(m.modalidades)
    .map(([nome, editais]) => ({ nome, editais }))
    .sort((a, b) => b.editais - a.editais || a.nome.localeCompare(b.nome, "pt-BR"));
}
