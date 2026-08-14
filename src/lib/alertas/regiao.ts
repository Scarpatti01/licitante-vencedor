import { slugDeMunicipio } from "../pncp/normaliza.ts";

/**
 * O que o visitante digitou, virando um filtro que dá para aplicar.
 *
 * O formulário pede a cidade num campo de texto livre, e isso foi decisão de
 * conversão, não descuido: um `<select>` com 5.570 municípios derruba cadastro
 * de quem está no celular, e nenhuma lista fecha o caso de quem quer "a região".
 * A conta dessa decisão é paga aqui — alguém tem de transformar `"recife/pe"`,
 * `"São Paulo - SP"` e `"regiao metropolitana"` em algo comparável com
 * `Edital.local`.
 *
 * ## A regra que governa o arquivo: na dúvida, não mandar
 *
 * Um alerta de licitação errado não é neutro. Quem recebe edital de outro estado
 * conclui, corretamente, que o filtro não funciona — e o segundo e-mail já não é
 * lido. O produto morre por excesso de zelo em mandar, não por falta.
 *
 * Por isso `interpretarRegiao` devolve `null` quando não consegue afirmar o
 * município, e `null` NÃO vira "manda tudo": vira "não manda nada e registra o
 * texto para alguém olhar". Isso é o oposto do default confortável, e é
 * deliberado. `"regiao metropolitana de recife"` casaria com Recife por
 * coincidência de texto, mas quem escreveu isso quer as cidades ao redor
 * também, e entregar só a capital é responder outra pergunta.
 *
 * ## Por que não geocodificar
 *
 * A tentação é bater o texto contra a tabela do IBGE e resolver tudo. Não
 * resolve: `"Santa Luzia"` é município em oito estados, e sem UF a tabela
 * devolve oito respostas. A UF, quando o visitante escreve, resolve mais do que
 * qualquer dicionário — e quando ele não escreve, nenhum dicionário inventa.
 */

export type Regiao = {
  /** Slug do município, comparável com `Edital.local.municipioSlug`. */
  municipioSlug: string;
  /** Sigla da UF em maiúsculas, quando o visitante informou. */
  uf: string | null;
  /** O texto original, para relatório e para suporte. Nunca usado em comparação. */
  original: string;
  /**
   * Como a região aparece para o leitor — no assunto do e-mail, inclusive.
   *
   * Existe porque `original` é o que a pessoa digitou, e o que ela digita é
   * `"recife/pe"`. Isso está certo no cadastro e fica errado na linha de
   * assunto: `"2 editais abertos em recife/pe"` lê como defeito do sistema,
   * justamente no texto de maior visibilidade do produto inteiro.
   *
   * Não é `toUpperCase` nem title-case ingênuo. `"SAO PAULO"` tem de virar
   * `"São Paulo"` e não `"Sao Paulo"` — mas isso exigiria um dicionário de
   * acentos, então o que se faz aqui é o possível sem inventar: normalizar a
   * caixa preservando o que a pessoa acentuou, manter os conectivos minúsculos
   * (`"Santa Bárbara d'Oeste"`, e não `"Santa Bárbara D'Oeste"`) e deixar a UF
   * em maiúsculas.
   */
  rotulo: string;
};

/**
 * As 27 siglas. Lista fechada porque o conjunto é fechado desde 1988 — e porque
 * aceitar qualquer par de letras faria `"Cabo Frio - RJ"` funcionar e
 * `"Bar do Zé - SP"` também, transformando qualquer sufixo de duas letras em UF.
 */
const UFS = new Set([
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]);

/**
 * Palavras que denunciam que o visitante NÃO quer um município só.
 *
 * A assimetria que governa esta lista, e que ela já errou uma vez:
 *
 *   **Falso negativo** (deixar passar um pedido amplo) — a pessoa pede a região
 *   e recebe só a capital. Ruim, e visível: ela responde reclamando.
 *
 *   **Falso positivo** (recusar um município de verdade) — o lead confirmado
 *   NUNCA recebe nada. Não aparece como erro em lugar nenhum, porque a recusa é
 *   exatamente o comportamento projetado. É silêncio permanente.
 *
 * O segundo é muito pior, então a lista é conservadora de propósito. Descoberto
 * rodando o casador contra os 63 municípios da coleta real de 2026-08-13:
 * `"grande "` derrubava **Mata Grande/AL** — e derrubaria **Campo Grande/MS** e
 * **Rio Grande/RS** pelo mesmo motivo. `"vale do"` derrubaria **Vale do
 * Paraíso/RO** e **Vale do Sol/RS**, que também são municípios.
 */
const AMPLOS_EM_QUALQUER_LUGAR = [
  "regiao", "região", "metropolitan", "entorno", "proximidade", "redondeza",
  "estado de", "estado do", "todo ", "toda ", "todos ", "todas ",
  // Com "de" obrigatório: "interior de São Paulo" é pedido amplo, e nenhum
  // município se chama assim. "Interior" solto poderia ser parte de um nome.
  "interior de", "litoral de", "sul de", "norte de", "leste de", "oeste de",
];

/**
 * Amplos APENAS quando abrem o texto.
 *
 * "Grande São Paulo" é região; "Campo Grande" é município. A diferença é a
 * posição, e só ela. `"vale do"` NÃO entra aqui: "Vale do Itajaí" é região e
 * "Vale do Paraíso" é município, os dois começando igual — não há como separar
 * pelo texto, e na dúvida vale a regra de cima, que prefere errar mandando a
 * recusar um município real.
 */
const AMPLOS_NO_COMECO = ["grande "];

/**
 * Separadores entre cidade e UF. `/` e `-` são o que as pessoas escrevem;
 * a vírgula aparece quando o campo foi colado de outro lugar.
 *
 * O `-` é o caso torto: `"Mogi-Guaçu"` tem hífen dentro do nome. Por isso ele só
 * conta como separador quando o que vem DEPOIS é uma UF válida — e é essa
 * exigência, e não a ordem dos separadores, que impede quebrar nome hifenizado.
 */
const SEPARADORES = /[\/,\-–—]/;

function ehPedidoAmplo(texto: string): boolean {
  const t = texto.toLocaleLowerCase("pt-BR");
  if (AMPLOS_EM_QUALQUER_LUGAR.some((marca) => t.includes(marca))) return true;
  return AMPLOS_NO_COMECO.some((marca) => t.startsWith(marca));
}

/**
 * Interpreta o texto livre do formulário.
 *
 * Devolve `null` sempre que não der para afirmar um município — texto vazio,
 * pedido amplo, ou sobra que não vira slug. Ver o cabeçalho para o porquê de
 * `null` não significar "sem filtro".
 */
export function interpretarRegiao(cidade: string | null | undefined): Regiao | null {
  const original = cidade?.trim();
  if (!original) return null;
  if (ehPedidoAmplo(original)) return null;

  // Um texto longo demais não é nome de cidade: é frase. O maior município do
  // país tem 32 caracteres ("Santa Bárbara do Monte Verde"), e 60 dá folga para
  // "cidade - UF" sem deixar passar um parágrafo.
  if (original.length > 60) return null;

  const partes = original.split(SEPARADORES).map((p) => p.trim()).filter(Boolean);

  let uf: string | null = null;
  let nome = original;

  if (partes.length >= 2) {
    const ultima = partes[partes.length - 1].toUpperCase();
    if (UFS.has(ultima)) {
      uf = ultima;
      // O nome é tudo menos a UF, rejuntado: `"Mogi - Guaçu - SP"` vira
      // `"Mogi Guaçu"`, e não `"Mogi"`.
      nome = partes.slice(0, -1).join(" ");
    }
  }

  const municipioSlug = slugDeMunicipio(nome);
  if (!municipioSlug) return null;

  // Um slug de uma letra só ("a", "x") não identifica município nenhum e casaria
  // por acidente se alguém digitasse uma tecla no campo.
  if (municipioSlug.length < 2) return null;

  const nomeExibido = comCaixaDeNomeProprio(nome);

  return {
    municipioSlug,
    uf,
    original,
    rotulo: uf ? `${nomeExibido}/${uf}` : nomeExibido,
  };
}

/**
 * Conectivos que ficam minúsculos no meio de nome próprio.
 *
 * "Mogi das Cruzes", não "Mogi Das Cruzes". No começo do nome eles sobem —
 * existe "Do Carmo" como primeira palavra —, e é por isso que a posição entra
 * na decisão em vez de a lista sozinha.
 */
const CONECTIVOS = new Set(["de", "do", "da", "dos", "das", "e"]);

/**
 * Caixa de nome próprio, preservando o que o visitante acentuou.
 *
 * Passa por hífen e apóstrofo também: "mogi-guaçu" vira "Mogi-Guaçu", e
 * "santa bárbara d'oeste" vira "Santa Bárbara d'Oeste". Sem tratar o hífen, o
 * resultado seria "Mogi-guaçu" — pior que não ter mexido.
 */
function comCaixaDeNomeProprio(nome: string): string {
  return nome
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((palavra, indice) => {
      const minuscula = palavra.toLocaleLowerCase("pt-BR");
      if (indice > 0 && CONECTIVOS.has(minuscula)) return minuscula;

      /*
       * `d'Oeste` precisa de regra própria, e a descoberta foi por teste: a
       * regra geral capitaliza início de palavra, então ela produzia
       * `D'Oeste`. O `d` elidido é o conectivo "de" com a vogal comida — ele
       * segue a regra dos conectivos, não a das palavras. O IBGE registra
       * "Santa Bárbara d'Oeste" exatamente assim.
       */
      if (indice > 0 && /^d['’]/u.test(minuscula)) {
        return minuscula.replace(
          /^(d['’])(\p{L})/u,
          (_, prefixo: string, letra: string) => `${prefixo}${letra.toLocaleUpperCase("pt-BR")}`,
        );
      }

      // Início de palavra e depois de hífen: "Mogi-Guaçu", e não "Mogi-guaçu".
      return minuscula.replace(
        /(^|[-'’])(\p{L})/gu,
        (_, antes: string, letra: string) => `${antes}${letra.toLocaleUpperCase("pt-BR")}`,
      );
    })
    .join(" ");
}

/**
 * O local do edital casa com a região pedida?
 *
 * A comparação é por slug, e não pelo texto: `"São Paulo"` e `"SAO PAULO"` são o
 * mesmo lugar, e o PNCP publica os dois jeitos.
 *
 * **Quando o visitante informou UF, ela é eliminatória.** É o que evita o erro
 * mais caro deste produto: `"Santa Luzia"` existe em oito estados, e mandar o
 * edital de Santa Luzia do Pará para quem pediu Santa Luzia de Minas é o tipo de
 * acerto de texto que destrói a confiança no filtro. Sem UF informada, o
 * casamento é só por nome — e aí o risco é assumido por quem não quis
 * especificar, o que é diferente de ser imposto a ele.
 */
export function localCasaComRegiao(
  local: { municipioSlug: string; uf: string },
  regiao: Regiao,
): boolean {
  if (local.municipioSlug !== regiao.municipioSlug) return false;
  if (regiao.uf && local.uf.toUpperCase() !== regiao.uf) return false;
  return true;
}
