import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O cookie da empresa é PREFERÊNCIA, nunca credencial.
 *
 * Este é o teste mais importante do seletor de empresa, e o que ele guarda não
 * é uma função: é uma propriedade do código. Testar `vinculoDoUsuario` de
 * verdade exigiria simular `next/headers`, o cliente do Supabase e a sessão —
 * e o que precisa ser garantido não é o retorno, é que o valor do cookie NUNCA
 * chegue ao resto do sistema sem passar pela lista de vínculos reais.
 *
 * O risco, se isso quebrar: alguém edita o cookie para o UUID da empresa de
 * outra pessoa. A RLS continuaria barrando a leitura dos dados — então não
 * vazaria nada —, mas a interface abriria uma empresa que a pessoa não pode
 * ver e mostraria telas vazias sem dizer por quê. Num produto onde o pior erro
 * é decidir sobre um edital olhando o perfil errado, isso é grave o bastante
 * para merecer teste próprio.
 */

const AUTH = join(import.meta.dirname);

const sessao = readFileSync(join(AUTH, "sessao.ts"), "utf8");
const acao = readFileSync(join(AUTH, "empresa-ativa.ts"), "utf8");

describe("a escolha de empresa é validada, não obedecida", () => {
  it("a leitura confere o cookie contra os vínculos reais", () => {
    // O `find` sobre a lista vinda do banco é o mecanismo inteiro. Se alguém
    // "simplificar" para usar o cookie direto, o produto passa a abrir empresa
    // pelo que o cliente manda.
    const trecho = sessao.slice(sessao.indexOf("export const vinculoDoUsuario"));

    expect(trecho).toMatch(/empresas\.find\(/);
    // `[\s\S]*?` e não `[^)]*`: a primeira versão usava `[^)]*` e falhava
    // contra um código correto, porque o `)` do parâmetro da arrow fecha a
    // classe antes de chegar na comparação. Medi a forma, não a propriedade.
    expect(
      /empresas\.find\([\s\S]{0,40}?empresaId === escolhida/.test(trecho),
      "`vinculoDoUsuario` precisa procurar o valor do cookie DENTRO da lista de " +
        "vínculos reais. Usar o cookie direto abriria empresa pelo que o cliente manda.",
    ).toBe(true);
  });

  it("a leitura tem um padrão para quando não há escolha válida", () => {
    // Cookie ausente, apagado ou apontando para empresa que não é do usuário
    // caem todos no mesmo lugar: a primeira da lista. Sem isso, adulterar o
    // cookie viraria negação de serviço — a pessoa não abriria empresa nenhuma.
    expect(sessao).toMatch(/\?\?\s*empresas\[0\]/);
  });

  it("a troca recusa empresa que não é do usuário", () => {
    expect(acao).toMatch(/empresas\.some\(/);
    expect(
      acao.indexOf("empresas.some(") < acao.indexOf("cookies()"),
      "a validação precisa vir ANTES de gravar o cookie — gravar e conferir " +
        "depois deixaria a escolha inválida persistida.",
    ).toBe(true);
  });

  it("o cookie não é legível por script no navegador", () => {
    // `httpOnly` não protege o dado — ele não é secreto — mas impede que um
    // script injetado troque a empresa aberta sem o usuário perceber.
    expect(acao).toMatch(/httpOnly:\s*true/);
    expect(acao).toMatch(/sameSite:\s*"lax"/);
  });

  it("a troca revalida o LAYOUT, e não só a página", () => {
    /*
     * A empresa aberta atravessa toda a área do produto. Revalidar só a página
     * atual deixaria cabeçalho, painel e perfil servindo dados da empresa
     * anterior até alguém navegar — que é exatamente o erro que o seletor
     * existe para evitar, agora com a interface ajudando a cometê-lo.
     */
    expect(acao).toMatch(/revalidatePath\("\/",\s*"layout"\)/);
  });
});
