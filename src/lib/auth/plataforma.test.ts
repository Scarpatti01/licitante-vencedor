import { describe, expect, it } from "vitest";
import { administradoresConfigurados, ehAdministradorDaPlataforma } from "./plataforma";

describe("ehAdministradorDaPlataforma", () => {
  /*
   * O grupo que importa mais que todos os outros somados.
   *
   * Uma allowlist que trata "vazia" como "sem restrição" não protege nada, e o
   * modo de falha é silencioso: tudo funciona em desenvolvimento, e a variável
   * que não chegou ao ambiente de produção abre a lista de leads para qualquer
   * pessoa que tenha criado conta. O teste existe para que essa inversão nunca
   * passe despercebida numa refatoração.
   */
  const LISTAS_SEM_NINGUEM: Array<[string | null | undefined, string]> = [
    [undefined, "variável não definida"],
    [null, "variável nula"],
    ["", "variável vazia"],
    ["   ", "só espaços"],
    [",", "só separador"],
    [" , ; \n ", "só separadores e espaço"],
  ];

  it.each(LISTAS_SEM_NINGUEM)("nega quando a lista é %s (%s)", (lista) => {
    expect(ehAdministradorDaPlataforma("dono@exemplo.com", lista)).toBe(false);
  });

  const EMAILS_SEM_IDENTIDADE: Array<[string | null | undefined, string]> = [
    [null, "sessão sem e-mail"],
    [undefined, "campo ausente"],
    ["", "e-mail vazio"],
    ["   ", "e-mail só com espaço"],
  ];

  it.each(EMAILS_SEM_IDENTIDADE)("nega quem chega com e-mail %s (%s)", (email) => {
    // O `email` do usuário do Supabase é opcional no tipo — login por telefone
    // ou por provedor que não devolve endereço produz exatamente este caso.
    // Sem esta porta, um e-mail vazio casaria com uma entrada vazia da lista.
    expect(ehAdministradorDaPlataforma(email, "dono@exemplo.com,,")).toBe(false);
  });

  it("aceita o e-mail que está na lista", () => {
    expect(ehAdministradorDaPlataforma("dono@exemplo.com", "dono@exemplo.com")).toBe(true);
  });

  it("nega quem não está na lista", () => {
    expect(ehAdministradorDaPlataforma("outro@exemplo.com", "dono@exemplo.com")).toBe(false);
  });

  /*
   * Ninguém digita o próprio e-mail sempre com a mesma caixa, e o Supabase
   * guarda como foi digitado no cadastro. Comparar sensível a maiúsculas daria
   * 404 ao administrador legítimo na própria tela, sem mensagem que explicasse.
   */
  it.each([
    ["Dono@Exemplo.com", "dono@exemplo.com"],
    ["dono@exemplo.com", "DONO@EXEMPLO.COM"],
    ["  dono@exemplo.com  ", "dono@exemplo.com"],
  ])("casa %s contra a lista %s ignorando caixa e espaço", (email, lista) => {
    expect(ehAdministradorDaPlataforma(email, lista)).toBe(true);
  });

  it.each([
    ["a@x.com,dono@exemplo.com", "vírgula sem espaço"],
    ["a@x.com, dono@exemplo.com", "vírgula com espaço"],
    ["a@x.com; dono@exemplo.com", "ponto e vírgula"],
    ["a@x.com dono@exemplo.com", "espaço"],
    ["a@x.com\ndono@exemplo.com\n", "quebra de linha, como sai de um gerenciador de senhas"],
  ])("encontra o e-mail em lista separada por %s (%s)", (lista) => {
    expect(ehAdministradorDaPlataforma("dono@exemplo.com", lista)).toBe(true);
  });

  /*
   * Casar por prefixo ou por "contém" é o defeito clássico de allowlist escrita
   * às pressas: `dono@exemplo.com.mal` é um domínio que um atacante registra, e
   * `startsWith` o deixaria entrar.
   */
  it.each([
    "dono@exemplo.com.mal",
    "dono@exemplo.como",
    "xdono@exemplo.com",
    "dono@exemplo.co",
  ])("nega o parecido %s", (email) => {
    expect(ehAdministradorDaPlataforma(email, "dono@exemplo.com")).toBe(false);
  });
});

describe("administradoresConfigurados", () => {
  it("devolve lista vazia quando não há configuração", () => {
    expect(administradoresConfigurados(undefined)).toEqual([]);
    expect(administradoresConfigurados("")).toEqual([]);
  });

  it("normaliza para minúsculas e descarta entrada vazia", () => {
    expect(administradoresConfigurados(" A@X.com , , b@Y.com ")).toEqual([
      "a@x.com",
      "b@y.com",
    ]);
  });

  it.each([null, 42, {}, []])("devolve vazio para o que não é string: %s", (valor) => {
    expect(administradoresConfigurados(valor as string | null)).toEqual([]);
  });
});
