import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Nenhum teste avalia oportunidade com o relógio de hoje.
 *
 * ## O defeito, medido
 *
 * Em 19/09/2026 três testes reprovaram sem ninguém ter tocado no produto:
 * dois em `alertas.test.ts` e um em `regras.test.tsx`. A regra que eles vigiam
 * não mudou; o calendário mudou.
 *
 * `listarOportunidades` e `painelDoDia` recebem o instante da avaliação, e o
 * padrão dos dois é `new Date()`. Chamados sem data, medem os exemplos contra
 * HOJE. Os exemplos têm prazo absoluto (o mais longo encerrava em 15/09/2026),
 * então a lista foi encolhendo dia a dia até voltar vazia, e as asserções
 * caíram junto.
 *
 * `alertas.test.ts` era o caso mais claro: prendia o instante das ASSERÇÕES em
 * `AGORA` (14/08/2026) e deixava o dos DADOS no relógio real. Dois relógios no
 * mesmo teste, um deles andando.
 *
 * ## Por que uma guarda, e não só o conserto
 *
 * Teste que muda de resultado com o calendário é pior que teste ausente: além
 * de reprovar sozinho, ele pode voltar a APROVAR sozinho, e aí passa a dar aval
 * a um comportamento que ninguém conferiu. Os três foram consertados um a um; o
 * padrão de chamada que os produziu continua disponível, e o próximo teste a
 * usá-lo só vai avisar semanas depois, num dia em que ninguém relaciona as duas
 * coisas.
 *
 * A guarda cobra instante explícito. Não é estilo: é a diferença entre um teste
 * que mede uma regra e um que mede a data em que rodou.
 *
 * ## O que mudou quando o argumento virou obrigatório
 *
 * `porta.ts` tirou o `?` de `agora` nos dois métodos, e o compilador passou a
 * cobrar o argumento em toda chamada, de teste e de produção. Isso não torna
 * esta guarda redundante, e vale dizer por quê: o compilador exige que alguém
 * DECIDA, e aceita `new Date()` como decisão. Em produção essa é a resposta
 * certa; em teste é o defeito de volta, com uma linha a mais.
 *
 * Os dois se completam. O compilador impede a chamada distraída em qualquer
 * lugar; esta guarda impede a chamada deliberada no único lugar onde ela não
 * serve.
 */

const METODOS = ["listarOportunidades", "painelDoDia"];

/**
 * Chamadas isentas, uma a uma e com o motivo.
 *
 * Só entraria aqui o que não afirma nada que dependa do tempo. Está vazia
 * desde que o instante virou argumento obrigatório na porta: a única isenção
 * que existiu era um teste de delegação que não lia o resultado, e agora ele
 * precisa passar um instante como todo mundo.
 *
 * Fica declarada, e vazia, porque o caso pode voltar a existir. "Este não
 * precisa" é a frase que devolve o defeito à base, então quando voltar vai
 * voltar com o motivo escrito ao lado.
 */
const ISENTAS: { arquivo: string; trecho: string; porque: string }[] = [];

function arquivosDeTeste(raiz: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(raiz)) {
    const caminho = join(raiz, nome);
    if (statSync(caminho).isDirectory()) achados.push(...arquivosDeTeste(caminho));
    else if (/\.test\.tsx?$/.test(nome)) achados.push(caminho);
  }
  return achados;
}

/**
 * O trecho entre os parênteses da chamada, com os aninhados respeitados.
 *
 * Regex não serve: `listarOportunidades(empresa, { situacoes: X }, AGORA)` tem
 * chave e vírgula dentro, e a chamada real quebra em várias linhas. Contar
 * parênteses é o que responde onde ela termina.
 */
function argumentosDe(fonte: string, inicio: number): string {
  let profundidade = 0;
  for (let i = inicio; i < fonte.length; i++) {
    if (fonte[i] === "(") profundidade++;
    else if (fonte[i] === ")") {
      profundidade--;
      if (profundidade === 0) return fonte.slice(inicio + 1, i);
    }
  }
  return fonte.slice(inicio);
}

describe("teste não avalia oportunidade com o relógio de hoje", () => {
  /*
   * A guarda não varre a si mesma.
   *
   * Na primeira execução ela reprovou por causa da PRÓPRIA lista de isenções,
   * que escreve a chamada como literal para poder isentá-la. Tirar comentário
   * da varredura não resolveria: aqui o texto é código, não comentário.
   *
   * É a sétima vez que uma guarda desta base encontra o texto que a justifica.
   * Nas seis anteriores a saída foi ignorar comentário; nesta é ignorar o
   * arquivo, porque um arquivo que descreve chamadas proibidas vai sempre
   * conter chamadas proibidas.
   */
  const arquivos = arquivosDeTeste("src").filter(
    (c) => !c.endsWith("relogio-nos-testes.guarda.test.ts"),
  );

  it("acha arquivos de teste para varrer", () => {
    // Sem isto, uma varredura que não encontra nada passa como se estivesse tudo
    // certo. O lastro é a única diferença entre uma guarda e um teste vazio.
    expect(arquivos.length).toBeGreaterThan(100);
  });

  it("acha as chamadas que a guarda existe para vigiar", () => {
    const total = arquivos.reduce((soma, caminho) => {
      const fonte = readFileSync(caminho, "utf8");
      return soma + METODOS.reduce((s, m) => s + fonte.split(`${m}(`).length - 1, 0);
    }, 0);

    expect(total).toBeGreaterThan(5);
  });

  it("toda chamada passa um instante explícito", () => {
    const culpadas: string[] = [];

    for (const caminho of arquivos) {
      // Comentário fora da varredura: este próprio arquivo cita os métodos para
      // explicar por que não devem ser chamados assim. É a sétima vez que uma
      // guarda desta base encontraria o comentário que a justifica.
      const fonte = readFileSync(caminho, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

      for (const metodo of METODOS) {
        let de = fonte.indexOf(`${metodo}(`);
        while (de !== -1) {
          const abre = de + metodo.length;
          const args = argumentosDe(fonte, abre);
          const chamada = `${metodo}(${args.replace(/\s+/g, " ").trim()})`;

          const temInstante = /\bAGORA\b/.test(args);
          const isenta = ISENTAS.some(
            (i) => caminho.replaceAll("\\", "/") === i.arquivo && chamada.startsWith(i.trecho.slice(0, -1)),
          );

          if (!temInstante && !isenta) culpadas.push(`${caminho}: ${chamada.slice(0, 90)}`);

          de = fonte.indexOf(`${metodo}(`, abre);
        }
      }
    }

    expect(
      culpadas,
      `chamada sem instante explícito:\n${culpadas.join("\n")}\n\n` +
        `Passe AGORA (ou outra data fixa) como último argumento. O padrão do ` +
        `método é new Date(), e com ele o teste mede os exemplos contra HOJE: ` +
        `os prazos deles são absolutos, então o teste reprova sozinho quando a ` +
        `data passa, e volta a aprovar sozinho se alguém mexer nos exemplos. ` +
        `Foi assim que três testes caíram em 19/09/2026.`,
    ).toEqual([]);
  });
});
