import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * O alerta gratuito diário acabou, e não pode voltar por descuido.
 *
 * ## A decisão
 *
 * 25/08, do dono: o alerta gratuito entregava, de graça e para sempre, o
 * essencial do que o plano Leve cobra — os editais abertos de uma cidade, todo
 * dia útil. Não era um produto de entrada, era o produto pago com o preço
 * apagado. No lugar dele entraram catorze dias de teste do produto de verdade.
 *
 * ## Por que o workflow continua no repositório
 *
 * Porque ele é a máquina que já provou funcionar contra esta base: dedupe,
 * double opt-in, descadastro, recusa de snapshot velho. Apagar o arquivo
 * jogaria fora um ano de lições para reescrevê-las se o alerta voltar em outra
 * forma — semanal, ou como amostra de campanha. Ele fica inteiro e disparável
 * à mão; o que ele NÃO tem é agendamento.
 *
 * ## Por que isto precisa de guarda
 *
 * Porque o jeito de religar o alerta gratuito é acrescentar quatro linhas de
 * `schedule`, e essas quatro linhas parecem manutenção. Quem as escrever vai
 * achar que está consertando um workflow que "esqueceram" de agendar. Esta
 * guarda transforma esse acidente em teste vermelho com o motivo escrito.
 *
 * Religar de propósito continua possível, e é o que tem de ser: apaga-se este
 * arquivo junto, e aí a decisão está tomada por alguém, e não por distração.
 */

const CAMINHO = new URL("../../.github/workflows/enviar-alertas.yml", import.meta.url);
const WORKFLOW = readFileSync(CAMINHO, "utf8");

/** O YAML sem os comentários — o cabeçalho fala de `cron` o tempo todo. */
const CORPO = WORKFLOW.split("\n")
  .map((linha) => (linha.trimStart().startsWith("#") ? "" : linha))
  .join("\n");

describe("o alerta gratuito não tem agendamento", () => {
  it("não há `schedule` no gatilho", () => {
    expect(CORPO).not.toMatch(/^\s*schedule\s*:/m);
  });

  it("não há `cron` nenhum", () => {
    // Separado do anterior de propósito: `schedule` some numa refatoração e o
    // `cron` fica órfão logo abaixo, ou o contrário. As duas perguntas custam
    // uma linha cada.
    expect(CORPO).not.toMatch(/\bcron\s*:/);
  });

  it("o comentário explica que a ausência é decisão, e diz qual era o cron", () => {
    /*
     * Sem esta parte, a guarda protegeria um silêncio. Daqui a seis meses
     * ninguém lembra por que o workflow não roda, e "vou agendar isso" é a
     * conclusão natural de quem lê um arquivo completo e parado.
     *
     * O cron antigo fica escrito porque voltar atrás tem de ser barato: se a
     * decisão mudar, é copiar a linha de volta, e não redescobrir que horas
     * eram "a manhã" prometida no e-mail.
     */
    expect(WORKFLOW).toMatch(/SEM AGENDAMENTO/);
    expect(WORKFLOW).toMatch(/o alerta gratuito diário acabou/i);
    expect(WORKFLOW).toMatch(/10 10 \* \* 1-5/);
  });

  it("continua disparável à mão", () => {
    // A alternativa seria apagar o workflow. Ele fica porque é a máquina que já
    // provou funcionar — com dedupe, double opt-in e descadastro.
    expect(CORPO).toMatch(/^\s*workflow_dispatch\s*:/m);
  });
});

/**
 * A segunda metade da guarda: o TEXTO que o visitante lê.
 *
 * Tirar o `cron` interrompe o envio. Não interrompe a promessa: em 25/08 havia
 * dezoito lugares dizendo "todo dia útil, de graça" — nove guias, seis artigos
 * publicados, a home, a página de preços e uma landing page inteira. Cada um
 * escrito num dia diferente, com palavras ligeiramente diferentes.
 *
 * Um texto sobrevivente não é um detalhe de copy: é uma oferta pública de dar
 * de graça, para sempre, o que passou a custar R$ 59 por mês. Quem chegar por
 * ele e assinar depois descobre que pagou pelo que a página prometeu sem
 * cobrar, e a conversa que vem a seguir é sobre publicidade enganosa, não sobre
 * produto.
 */
describe("nenhuma página promete o alerta gratuito", () => {
  /** Todo `.ts`/`.tsx` de página, componente e artigo. Testes ficam de fora. */
  function arquivosDeTexto(raiz: string): string[] {
    const achados: string[] = [];
    for (const nome of readdirSync(raiz)) {
      const caminho = join(raiz, nome);
      if (statSync(caminho).isDirectory()) {
        achados.push(...arquivosDeTexto(caminho));
      } else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) {
        achados.push(caminho);
      }
    }
    return achados;
  }

  /*
   * Só o que o visitante lê. Comentário de código FALA do alerta gratuito o
   * tempo todo, e tem de falar: é assim que a próxima pessoa descobre por que a
   * oferta mudou. A guarda que proibisse a palavra apagaria a memória junto com
   * a promessa.
   */
  function semComentarios(fonte: string): string {
    return fonte
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ");
  }

  const ARQUIVOS = [
    ...arquivosDeTexto("src/app"),
    ...arquivosDeTexto("src/components"),
    ...arquivosDeTexto("src/lib/blog/artigos"),
  ];

  it("olha um conjunto de arquivos que não é vazio", () => {
    // Sem isto, um erro de caminho faria a guarda passar sobre lista vazia —
    // verde por não ter olhado nada, que é o pior jeito de passar.
    expect(ARQUIVOS.length).toBeGreaterThan(30);
  });

  /*
   * A frase que ANUNCIA o fim é permitida, e precisa ser.
   *
   * `/alerta-de-licitacao/` tem uma pergunta no FAQ que diz, com todas as
   * letras, "havia um alerta gratuito diário; acabou em 25 de agosto". Uma
   * guarda que proibisse a expressão obrigaria a página a não explicar o que
   * mudou — e quem chega por um link antigo, ou pela memória, merece a
   * explicação em vez do silêncio.
   *
   * Por isso a conferência é por FRASE, e não por arquivo: a frase que cita o
   * alerta gratuito precisa dizer, ali mesmo, que ele terminou.
   */
  const ANUNCIA_O_FIM = /acabou|deixou de existir|não existe mais|terminou|encerr/i;

  /** Quebra grosseira em frases. Ponto final, interrogação, quebra de linha. */
  function frases(texto: string): string[] {
    return texto.split(/(?<=[.?!])\s+|\n/);
  }

  const PROIBIDO: [RegExp, string][] = [
    [/alerta\s+(gratuito|grátis)/i, "chama o produto de alerta gratuito"],
    [/alerta\s+é\s+gratuito/i, "afirma que o alerta é gratuito"],
    [/de\s+graça,?\s+(sem\s+cartão|para\s+sempre)/i, "promete de graça sem prazo"],
    [/grátis\s*(,|\s)+\s*sem\s+cartão/i, "promete grátis, sem cartão"],
  ];

  for (const [padrao, motivo] of PROIBIDO) {
    it(`nenhum texto ${motivo}`, () => {
      const culpados = ARQUIVOS.filter((caminho) =>
        frases(semComentarios(readFileSync(caminho, "utf8"))).some(
          (frase) => padrao.test(frase) && !ANUNCIA_O_FIM.test(frase),
        ),
      );

      expect(
        culpados,
        `A oferta é ${"14"} dias de teste, sem cartão, e o acesso para sozinho. ` +
          `Estes arquivos ainda prometem o alerta gratuito, que acabou em 25/08:\n\n` +
          culpados.map((c) => `  ${c}`).join("\n"),
      ).toEqual([]);
    });
  }
});
