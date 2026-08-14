import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DESTINO_PADRAO,
  ROTAS_DE_ENTRADA,
  ROTAS_DO_PRODUTO,
  destinoSeguro,
  sobPrefixo,
} from "./rotas";

describe("destinoSeguro", () => {
  /*
   * O redirecionador aberto é o defeito mais fácil de introduzir numa tela de
   * login e um dos mais caros: o link de phishing começa no domínio verdadeiro,
   * então a vítima confere o endereço, vê o site certo, e é levada para outro.
   */
  it.each([
    ["https://exemplo.mal", "URL absoluta"],
    ["http://exemplo.mal", "URL absoluta sem TLS"],
    ["//exemplo.mal", "absoluta sem protocolo — o navegador completa sozinho"],
    ["/\\exemplo.mal", "barra invertida, normalizada para barra por vários navegadores"],
    ["javascript:alert(1)", "esquema executável"],
    ["/painel/\nLocation: https://exemplo.mal", "quebra de linha para injetar cabeçalho"],
    ["exemplo.mal", "sem barra inicial"],
    ["", "vazio"],
  ])("recusa %s (%s)", (entrada) => {
    expect(destinoSeguro(entrada)).toBe(DESTINO_PADRAO);
  });

  it.each([null, undefined, 42, {}, []])("recusa o que não é string: %s", (entrada) => {
    // O valor vem de `searchParams` e de `FormData`, onde nada garante o tipo.
    expect(destinoSeguro(entrada)).toBe(DESTINO_PADRAO);
  });

  it.each([
    "/painel/",
    "/oportunidades/",
    "/oportunidades/PE-2026-000001/",
    "/perfil/?secao=documentos",
  ])("aceita caminho interno: %s", (entrada) => {
    expect(destinoSeguro(entrada)).toBe(entrada);
  });
});

describe("sobPrefixo", () => {
  it("casa a própria rota e o que está abaixo dela", () => {
    expect(sobPrefixo("/painel", ROTAS_DO_PRODUTO)).toBe(true);
    expect(sobPrefixo("/painel/", ROTAS_DO_PRODUTO)).toBe(true);
    expect(sobPrefixo("/oportunidades/PE-2026-1", ROTAS_DO_PRODUTO)).toBe(true);
  });

  it("não casa por prefixo de texto", () => {
    /*
     * `startsWith("/perfil")` sozinho pegaria isto. A rota não existe hoje — e é
     * justamente por isso que o teste existe: no dia em que existir, ela passaria
     * a exigir login sem ninguém entender por quê.
     */
    expect(sobPrefixo("/perfilamento-de-editais", ROTAS_DO_PRODUTO)).toBe(false);
    expect(sobPrefixo("/painelistas", ROTAS_DO_PRODUTO)).toBe(false);
  });

  it("deixa passar o que é público", () => {
    for (const publica of ["/", "/blog/", "/como-funciona/", "/alerta-de-licitacao/"]) {
      expect(sobPrefixo(publica, ROTAS_DO_PRODUTO)).toBe(false);
    }
  });

  it("as telas de acesso são reconhecidas", () => {
    expect(sobPrefixo("/entrar", ROTAS_DE_ENTRADA)).toBe(true);
    expect(sobPrefixo("/criar-conta/", ROTAS_DE_ENTRADA)).toBe(true);
    expect(sobPrefixo("/entrada-de-servico", ROTAS_DE_ENTRADA)).toBe(false);
  });

  it("nenhuma rota do produto é pública por engano", () => {
    // Guarda contra alguém acrescentar uma rota à lista errada.
    for (const rota of ROTAS_DO_PRODUTO) {
      expect(sobPrefixo(rota, ROTAS_DE_ENTRADA)).toBe(false);
    }
  });
});

describe("estrutura de rotas", () => {
  /*
   * Guarda contra um laço de redirecionamento que já esteve escrito.
   *
   * O layout de `(app)` manda para `/cadastrar-empresa` quem tem conta e não
   * tem empresa. Se essa página morasse dentro do grupo, ela executaria o mesmo
   * layout, seria mandada para si mesma, e o navegador desistiria com
   * ERR_TOO_MANY_REDIRECTS.
   *
   * O defeito só aparece com um usuário logado SEM empresa — um estado que não
   * existe em nenhum teste de unidade e que ninguém encontra clicando pelo site
   * já cadastrado. Por isso a garantia é estrutural: mover o arquivo de volta
   * reprova aqui, em vez de reprovar no primeiro cliente que criar conta.
   */
  it("cadastrar-empresa vive fora do grupo (app)", () => {
    expect(existsSync("src/app/cadastrar-empresa/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/cadastrar-empresa/page.tsx")).toBe(false);
  });
});
