import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { nomeDaEmpresa } from "./nome-da-empresa.ts";

/**
 * Tela de cliente chama a empresa pelo nome que o CLIENTE usa.
 *
 * ## O DEFEITO
 *
 * O painel dizia "Empresa: Imunidex" e, quatro linhas abaixo, o aviso de perfil
 * incompleto dizia "O perfil de Insect Never Conservadora e Dedetizadora LTDA.
 * está incompleto". Mesma tela, mesma empresa, dois nomes, e o leitor obrigado
 * a fazer a ligação sozinho justamente na frase que explica por que falta
 * score.
 *
 * A causa não foi discordância sobre a regra: `nomeFantasia ?? razaoSocial`
 * estava escrito em três lugares e faltava num quarto. Regra copiada é regra
 * que uma hora não é copiada.
 *
 * ## AS DUAS EXCEÇÕES, DECLARADAS
 *
 * `configuracoes/page.tsx` mostra a razão social sob o rótulo "Razão social",
 * que é a tela onde o nome jurídico É a informação pedida.
 *
 * `layout.tsx` a usa no `title` do rodapé lateral, como dica ao passar o mouse
 * sobre o nome curto. Aparece só ali, e não substitui o nome exibido.
 *
 * `FormularioDeEmpresa.tsx`, `SecoesDoPerfil.tsx` e `AssistenteDeOnboarding.tsx`
 * usam a palavra como campo de formulário ou chave de dado, que é outra coisa:
 * identificador, não texto lido.
 *
 * ## POR QUE ELA IGNORA COMENTÁRIO
 *
 * Na primeira execução esta guarda reprovou o próprio arquivo que ela acabara
 * de corrigir: o comentário da prop de `PerfilIncompleto.tsx` EXPLICA que a
 * prop se chamava `razaoSocial`, e a palavra bastava para acusar. Guarda que
 * confunde o texto sobre o defeito com o defeito reprova quem já consertou, e a
 * saída fácil disso é afrouxar a regra. É a quarta vez nesta base.
 */

const RAIZ = join(__dirname, "..", "..");

/** Onde a razão social crua é legítima, com o motivo ao lado. */
const LIBERADOS: Record<string, string> = {
  "app/(app)/configuracoes/page.tsx": "mostra sob o rótulo `Razão social`, que é o assunto da tela",
  "app/(app)/layout.tsx": "usa no `title` do rodapé lateral, como dica do nome completo",
  "components/auth/FormularioDeEmpresa.tsx": "é `name`/`id` de campo, e não texto lido",
  "components/perfil/SecoesDoPerfil.tsx": "é o formulário do perfil, com o campo rotulado `Razão social`",
  "components/perfil/AssistenteDeOnboarding.tsx": "usa a palavra como chave de campo numa lista",
};

/** O texto do arquivo sem as linhas de comentário. Ver a nota no topo. */
function semComentario(texto: string): string {
  let dentroDeBloco = false;
  return texto
    .split("\n")
    .filter((linha) => {
      const podado = linha.trim();
      if (podado.startsWith("/*") || podado.startsWith("{/*")) dentroDeBloco = true;
      const comentario = dentroDeBloco || podado.startsWith("//") || podado.startsWith("*");
      if (podado.includes("*/")) dentroDeBloco = false;
      return !comentario;
    })
    .join("\n");
}

function telas(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return telas(caminho);
    return /\.tsx$/.test(nome) && !/\.test\.tsx$/.test(nome) ? [caminho] : [];
  });
}

const suspeitos = [...telas(join(RAIZ, "app")), ...telas(join(RAIZ, "components"))]
  .map((caminho) => ({
    arquivo: caminho.slice(RAIZ.length + 1),
    texto: semComentario(readFileSync(caminho, "utf8")),
  }))
  .filter(({ texto }) => texto.includes("razaoSocial"));

describe("o nome da empresa nas telas", () => {
  it("a varredura acha telas, senão ela não guarda nada", () => {
    expect(suspeitos.length).toBeGreaterThan(0);
  });

  for (const { arquivo } of suspeitos) {
    it(`${arquivo} não usa a razão social crua`, () => {
      expect(
        Object.keys(LIBERADOS),
        `${arquivo} menciona \`razaoSocial\`. Tela de cliente chama a empresa por ` +
          `\`nomeDaEmpresa(perfil)\`: uma tela que diz "Imunidex" no topo e o nome ` +
          `jurídico no aviso obriga o leitor a descobrir sozinho que é sobre ele. ` +
          `Se este uso for legítimo, declare-o em LIBERADOS com o motivo.`,
      ).toContain(arquivo);
    });
  }
});

describe("nomeDaEmpresa", () => {
  it("prefere o nome fantasia", () => {
    expect(nomeDaEmpresa({ razaoSocial: "ACME LTDA", nomeFantasia: "Acme" })).toBe("Acme");
  });

  it("cai na razão social quando não há fantasia", () => {
    expect(nomeDaEmpresa({ razaoSocial: "ACME LTDA", nomeFantasia: null })).toBe("ACME LTDA");
  });

  it("fantasia em branco não vira nome vazio na tela", () => {
    // O cadastro aceita string vazia, e `?? ` sozinho deixaria passar: o
    // resultado seria "O perfil de  está incompleto", com um buraco no meio.
    expect(nomeDaEmpresa({ razaoSocial: "ACME LTDA", nomeFantasia: "   " })).toBe("ACME LTDA");
  });
});
