import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { confirmarLead, descadastrarLead, gerarToken, tokenPlausivel } from "./leads";

/**
 * O token e a porta de entrada das ações públicas.
 *
 * Este arquivo guarda duas propriedades que, se quebrarem, quebram em silêncio:
 * o token não pode revelar nada sobre o lead, e token malformado não pode virar
 * carga no destino.
 */

const ambienteOriginal = { ...process.env };

beforeEach(() => {
  process.env.LEADS_DESTINO = "webhook";
  process.env.LEADS_WEBHOOK_URL = "https://exemplo.test/exec?token=segredo";
});

afterEach(() => {
  process.env = { ...ambienteOriginal };
  vi.restoreAllMocks();
});

describe("gerarToken", () => {
  /*
   * A propriedade que importa é "o token não pode ser derivado do lead", e ela
   * já esteve testada de um jeito que falhava sozinho.
   *
   * A versão anterior decodificava o token e afirmava que os bytes não continham
   * `@`. Só que os bytes são 32 valores aleatórios, e `@` é o byte 0x40 como
   * qualquer outro: a chance de ao menos um dos 32 sair 0x40 é
   * `1 - (255/256)^32`, quase 12%. O teste reprovava em torno de uma execução a
   * cada oito — sem nada ter mudado no código. Teste que falha por sorte ensina
   * a rodar de novo até passar, e é assim que uma falha de verdade passa
   * despercebida no meio.
   *
   * O que restou testa a mesma garantia pela estrutura, e não por amostragem:
   * a função não recebe parâmetro nenhum. Não há e-mail a vazar porque não há
   * e-mail a ver — `btoa(email)` no lugar do gerador não compilaria sem mudar
   * a assinatura, e é a assinatura que este teste prende.
   */
  it("é opaco por construção: não recebe dado do lead", () => {
    expect(gerarToken).toHaveLength(0);
    expect(gerarToken()).not.toContain("@");
  });

  it("usa alfabeto que sobrevive a URL e a cliente de e-mail", () => {
    // Sem `+`, `/` nem `=`: o `+` de base64 comum vira espaço do outro lado e o
    // link de descadastro morre justo para quem já decidiu sair.
    for (let i = 0; i < 200; i++) expect(gerarToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("não repete", () => {
    const quantidade = 5_000;
    const vistos = new Set(Array.from({ length: quantidade }, () => gerarToken()));
    expect(vistos.size).toBe(quantidade);
  });

  it("o que ele gera passa na validação de forma", () => {
    // As duas funções precisam concordar; se divergirem, todo cadastro novo
    // nasce com um link que a própria porta recusa.
    expect(tokenPlausivel(gerarToken())).toBe(true);
  });
});

describe("tokenPlausivel", () => {
  it.each([
    ["", "vazio"],
    ["undefined", "o texto que cliente de e-mail cola quando o link quebra"],
    ["curto", "curto demais para ser inadivinhável"],
    ["a".repeat(65), "longo demais para ter vindo daqui"],
    ["token com espaço aqui dentro!!", "com espaço"],
    ["' or 1=1 --", "tentativa de injeção"],
  ])("recusa %j (%s)", (valor) => {
    expect(tokenPlausivel(valor)).toBe(false);
  });

  it.each([null, undefined, 42, {}, []])("recusa o que nem é texto: %j", (valor) => {
    expect(tokenPlausivel(valor)).toBe(false);
  });

  it("aceita o UUID que os leads antigos da planilha recebem na migração", () => {
    expect(tokenPlausivel("3f2b9c1e-7a45-4d18-9c0b-2e6f8a1d5b73")).toBe(true);
  });
});

describe("ações públicas com token malformado", () => {
  it("não gastam uma ida ao destino", async () => {
    // Não é economia: é o que impede uma varredura na URL pública de queimar a
    // cota diária do Apps Script e derrubar a captura junto.
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);

    expect(await confirmarLead("")).toEqual({ situacao: "token-desconhecido" });
    expect(await descadastrarLead(undefined)).toEqual({ situacao: "token-desconhecido" });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("sem destino configurado, a ação é falha e não link inválido", async () => {
    // A diferença é a tela: "link inválido" manda a pessoa se cadastrar de novo,
    // e mandar isso quando o problema é nosso faz ela repetir um caminho que
    // também não vai funcionar.
    delete process.env.LEADS_DESTINO;
    expect((await confirmarLead(gerarToken())).situacao).toBe("falha");
  });
});
