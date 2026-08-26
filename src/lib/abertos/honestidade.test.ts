import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  EDITAIS_NO_BRASIL,
  jaEncerrou,
  quantosEncerraram,
  sobreviveAoRetrato,
  type EditalAberto,
} from "./tipos";
import { temPaginaDeUf, MINIMO_PARA_TER_PAGINA } from "./paginas";

/**
 * As guardas da listagem de editais abertos.
 *
 * ## Por que uma listagem que antes era proibida agora existe
 *
 * `/licitacoes/uf/municipio/` recusa listar editais abertos, e a recusa está
 * documentada lá: o agregado é um retrato do instante da coleta, edital tem
 * prazo, e publicar "34 abertos em Recife" a partir de um arquivo de dois dias
 * afirma como presente o que já encerrou. Quem clica e não acha conclui, com
 * razão, que o site mente.
 *
 * A regra nunca foi "não liste". Era "não afirme presente sem poder sustentar".
 * Esta listagem sustenta, e o que sustenta são três coisas — cada uma travada
 * por um teste aqui:
 *
 *   1. a hora do retrato aparece ANTES dos números, não no rodapé;
 *   2. cada item é marcado no relógio de quem lê, não no da build;
 *   3. a página diz quantos encerram nas próximas 24 horas, que é a própria
 *      taxa de envelhecimento dela.
 *
 * Medido em 25/08: 2.924 editais encerram por dia, uns 120 por hora. Sem a
 * segunda, ao fim de um dia a página estaria errada sobre 10% do que mostra.
 */

const NACIONAL = readFileSync(join("src", "app", "editais-abertos", "page.tsx"), "utf8");
const DA_UF = readFileSync(join("src", "app", "editais-abertos", "[uf]", "page.tsx"), "utf8");
const LISTA = readFileSync(join("src", "components", "abertos", "ListaDeAbertos.tsx"), "utf8");
const PRAZO = readFileSync(join("src", "components", "PrazoDoEdital.tsx"), "utf8");

describe("a hora do retrato vem antes da promessa", () => {
  it("as duas páginas mostram quando o retrato foi tirado", () => {
    for (const [nome, fonte] of [["nacional", NACIONAL], ["por UF", DA_UF]] as const) {
      expect(fonte, `a página ${nome} parou de datar o retrato`).toContain("RetratoDatado");
    }
  });

  /**
   * Ordem importa. A validade lida depois do número já não é validade: é
   * desculpa. Quem chega quer saber se pode confiar antes de decidir se lê.
   */
  it("o retrato datado vem antes do primeiro número na página", () => {
    for (const [nome, fonte] of [["nacional", NACIONAL], ["por UF", DA_UF]] as const) {
      const datado = fonte.indexOf("<RetratoDatado");
      const resposta = fonte.indexOf("<RespostaDireta>");
      expect(datado, `${nome}: não achei o retrato datado`).toBeGreaterThan(-1);
      expect(
        datado,
        `na página ${nome} a validade aparece depois do número. Validade lida ` +
          "depois do número não é validade, é desculpa.",
      ).toBeLessThan(resposta);
    }
  });

  it("o carimbo diz que a lista envelhece entre coletas", () => {
    expect(LISTA).toContain("regravada a cada coleta");
    expect(LISTA.toLowerCase()).toContain("não aparece aqui");
  });
});

describe("o encerrado é marcado no relógio de quem lê", () => {
  /**
   * A página é estática, reconstruída uma vez por dia. "Encerrado" calculado no
   * servidor congela no instante da build: a página nasceria dizendo "aberto" e
   * continuaria dizendo isso por 24 horas, inclusive para o edital que fechou
   * às 9h.
   */
  it("o prazo é componente de cliente, com relógio próprio", () => {
    expect(PRAZO.startsWith('"use client"')).toBe(true);
    expect(PRAZO).toContain("useEffect");
    expect(PRAZO, "sem intervalo, quem deixa a aba aberta nunca vê o edital encerrar").toContain(
      "setInterval",
    );
  });

  it("a lista usa esse componente em vez de decidir na build", () => {
    expect(LISTA).toContain("PrazoDoEdital");
  });

  it("a taxa de envelhecimento é dita ao leitor", () => {
    // "2.924 encerram nas próximas 24 horas" é o número que explica por que a
    // lista precisa ser lida com a data em mente.
    for (const fonte of [NACIONAL, DA_UF]) {
      expect(fonte).toContain("encerramEm24h");
    }
  });
});

describe("jaEncerrou olha o relógio que recebeu, não o do processo", () => {
  const edital = (fim: string): EditalAberto => ({
    id: "x",
    objeto: "o",
    orgao: "org",
    uf: "CE",
    municipio: "Iguatu",
    municipioSlug: "iguatu",
    modalidade: "Pregão - Eletrônico",
    valorEstimado: null,
    publicadoEm: null,
    encerramentoProposta: fim,
    link: "https://pncp.gov.br/x",
  });

  const MEIO_DIA = new Date("2026-08-25T12:00:00-03:00");

  it("encerrado quando o prazo já passou", () => {
    expect(jaEncerrou(edital("2026-08-25T11:00:00-03:00"), MEIO_DIA)).toBe(true);
  });

  it("aberto quando ainda falta", () => {
    expect(jaEncerrou(edital("2026-08-25T13:00:00-03:00"), MEIO_DIA)).toBe(false);
  });

  it("o instante exato do fim já conta como encerrado", () => {
    // Empate vai para o lado seguro: dizer "aberto" no segundo em que fechou
    // manda alguém correr atrás do que não existe mais.
    expect(jaEncerrou(edital("2026-08-25T12:00:00-03:00"), MEIO_DIA)).toBe(true);
  });

  it("conta quantos do retrato já venceram", () => {
    const lista = [
      edital("2026-08-25T09:00:00-03:00"),
      edital("2026-08-25T11:00:00-03:00"),
      edital("2026-08-26T09:00:00-03:00"),
    ];
    expect(quantosEncerraram(lista, MEIO_DIA)).toBe(2);
  });
});

describe("UF sem amostra não vira URL vazia", () => {
  /**
   * Mesmo portão de `regioes.ts`: página de listagem sem listagem não é página,
   * é URL. E URL vazia indexada custa autoridade de domínio sem devolver nada.
   *
   * Isto também resolve o primeiro dia sozinho — o retrato semeado nasce com as
   * contagens das 27 UFs e sem amostra, então nenhuma página de estado existe
   * até a primeira coleta preencher.
   */
  const uf = (quantos: number) => ({
    uf: "CE",
    abertos: 1159,
    novos: 176,
    encerramEm24h: 176,
    editais: Array.from({ length: quantos }, (_, i) => ({ id: String(i) }) as EditalAberto),
    // O portão olha só o tamanho da amostra; o perfil está aqui porque o tipo o
    // exige desde 26/08, e vazio é o que uma UF sem editais teria de verdade.
    perfil: { porCategoria: [], porModalidade: [] },
  });

  it("sem amostra suficiente, não tem página", () => {
    expect(temPaginaDeUf(uf(0))).toBe(false);
    expect(temPaginaDeUf(uf(MINIMO_PARA_TER_PAGINA - 1))).toBe(false);
  });

  it("com amostra, tem", () => {
    expect(temPaginaDeUf(uf(MINIMO_PARA_TER_PAGINA))).toBe(true);
  });

  it("a rota por UF não gera sob demanda", () => {
    // Sem isto, uma UF barrada pelo portão renderizaria mesmo assim e o portão
    // viraria decoração — mesma razão de `/licitacoes/[uf]/[municipio]`.
    expect(DA_UF).toMatch(/export const dynamicParams = false/);
  });

  it("a listagem nacional só linka UF que tem página", () => {
    expect(NACIONAL).toContain("temPaginaDeUf");
  });
});

describe("valor ausente nunca vira zero", () => {
  it("a lista escreve 'não informado' em vez de R$ 0", () => {
    // O PNCP usa zero para "não informou" e também aceita valores baixos reais.
    // Afirmar R$ 0 inventaria um dado que a fonte não deu.
    expect(LISTA).toContain("valor não informado");
  });
});

describe("a listagem não nasce órfã", () => {
  /**
   * A lição que `sitemap.ts` documenta com todas as letras: em 16/08 os 25
   * posts do dia ficaram fora do sitemap e sem link em página nenhuma. URL
   * válida, HTTP 200, e nenhum caminho até ela. Repetir isso com a página que
   * responde a busca mais frequente do setor seria caro.
   */
  const SITEMAP = readFileSync(join("src", "app", "sitemap.ts"), "utf8");
  const RODAPE = readFileSync(join("src", "components", "RodapeSite.tsx"), "utf8");

  it("está no sitemap", () => {
    expect(SITEMAP).toContain("/editais-abertos/");
  });

  it("o sitemap datar pela coleta, não pelo build", () => {
    // Carimbar `agora` faria a página parecer atualizada a cada deploy e
    // ensinaria o rastreador a ignorar o campo — mesma razão das regionais.
    const trecho = SITEMAP.slice(SITEMAP.indexOf("/editais-abertos/"));
    expect(trecho.slice(0, 300)).toContain("COLETADO_EM");
  });

  it("tem link em página que o visitante alcança", () => {
    expect(RODAPE).toContain("/editais-abertos/");
  });

  it("o sitemap só lista UF que virou página", () => {
    expect(SITEMAP).toContain("temPaginaDeUf");
  });
});

describe("a lista não pode envelhecer antes de ser lida", () => {
  /**
   * O defeito que o dono viu, e ele era de DESENHO, não de dado.
   *
   * A primeira versão ordenava por "os que encerram primeiro" — a ordem que
   * parece óbvia, o mais urgente no topo. É a pior possível para uma página que
   * vive 24 horas: põe no topo justamente os que morrem primeiro. Nasceu boa às
   * 3h da manhã e, ao meio-dia, a lista inteira estava encerrada.
   *
   * A marcação no relógio do leitor funcionou perfeitamente. Ela mostrou a
   * verdade — e a verdade era que a lista não servia. Guarda que funciona não
   * conserta escolha errada; só denuncia.
   *
   * A régua agora é o tempo de vida da própria página.
   */
  const CINCO_DA_MANHA = new Date("2026-08-25T05:00:00-03:00");

  const comPrazo = (fim: string) => ({ encerramentoProposta: fim });

  it("quem encerra hoje não entra na lista de hoje", () => {
    expect(sobreviveAoRetrato(comPrazo("2026-08-25T11:00:00-03:00"), CINCO_DA_MANHA)).toBe(false);
  });

  it("quem encerra logo depois da próxima coleta também não entra", () => {
    // 24h depois ainda é cedo demais: se a coleta atrasar, este vence com a
    // página no ar. A margem existe para o dia em que a coleta falha.
    expect(sobreviveAoRetrato(comPrazo("2026-08-26T06:00:00-03:00"), CINCO_DA_MANHA)).toBe(false);
  });

  it("quem sobrevive à próxima coleta com folga entra", () => {
    expect(sobreviveAoRetrato(comPrazo("2026-08-26T12:00:00-03:00"), CINCO_DA_MANHA)).toBe(true);
  });

  /**
   * O teste que prova a propriedade inteira, e não um caso: TODO item do
   * retrato versionado tem de continuar aberto no fim da vida dele.
   */
  it("nenhum item do retrato publicado vence antes da próxima coleta", () => {
    const retrato = JSON.parse(readFileSync(join("dados", "abertos.json"), "utf8")) as {
      coletadoEm: string;
      abertos: { encerramentoProposta: string; objeto: string }[];
      ufs: { uf: string; editais: { encerramentoProposta: string }[] }[];
    };
    const coletadoEm = new Date(retrato.coletadoEm);

    for (const e of retrato.abertos) {
      expect(
        sobreviveAoRetrato(e, coletadoEm),
        `"${e.objeto.slice(0, 60)}" encerra em ${e.encerramentoProposta}, antes de a ` +
          "próxima coleta substituir este retrato. Ele vai aparecer encerrado para " +
          "quem abrir a página à tarde — foi exatamente esse o defeito de 25/08.",
      ).toBe(true);
    }

    for (const uf of retrato.ufs) {
      for (const e of uf.editais) {
        expect(sobreviveAoRetrato(e, coletadoEm), `${uf.uf}: item vence cedo demais`).toBe(true);
      }
    }
  });

  it("a listagem nacional tem tamanho de listagem, não de amostra", () => {
    // "Uma lista com cem, pelo menos" — o pedido foi literal, e a razão é boa:
    // uma dúzia de itens não deixa ninguém encontrar o que serve para ele.
    expect(EDITAIS_NO_BRASIL).toBeGreaterThanOrEqual(100);
  });

  it("as contagens continuam sendo de TUDO que está aberto", () => {
    // O recorte é da lista, não do número. "28.973 abertos" é verdade sobre o
    // PNCP; reduzir isso ao que coube na tela seria mentir para baixo.
    const retrato = JSON.parse(readFileSync(join("dados", "abertos.json"), "utf8")) as {
      totais: { abertos: number };
      abertos: unknown[];
    };
    expect(retrato.totais.abertos).toBeGreaterThan(retrato.abertos.length * 10);
  });
});
