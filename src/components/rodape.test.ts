import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Toda página pública precisa de rodapé, e este teste é o motivo de isso
 * continuar valendo.
 *
 * O rodapé existia numa página só — a home — e as outras vinte e seis terminavam
 * sem aviso legal, sem contato e sem saída. Ninguém decidiu isso: cada página
 * nova nasceu copiando a anterior, e a anterior não tinha.
 *
 * É o mesmo modo de falha que o comentário de `Navegacao.tsx` já descrevia sobre
 * o cabeçalho, e que custou catorze ocorrências de lint antes de alguém
 * centralizar. Só que aqui o custo não é lint: é a página legal ficar
 * inalcançável de onde o visitante está.
 *
 * O ideal seria um layout compartilhado, e não uma linha repetida em cada
 * página. Enquanto as páginas não estiverem sob um grupo de rota comum, este
 * teste faz o papel: a próxima página que nascer sem rodapé não passa no CI.
 */

/**
 * Páginas que legitimamente NÃO têm rodapé, com o motivo.
 *
 * A lista é curta de propósito. Cada entrada é uma decisão, não uma pendência —
 * se ela crescer sem justificativa, o teste perdeu a função.
 */
const SEM_RODAPE: Record<string, string> = {
  "entrar":
    "Tela de acesso: foco único, sem navegação que distraia de um formulário de duas linhas.",
  "criar-conta":
    "Mesma razão de /entrar/ — e ela traz os links de termos e privacidade no próprio aceite.",
  "cadastrar-empresa":
    "Passo do onboarding de quem já está logado; a saída é o fluxo, não o site.",
  "confirmar":
    "Aterrissagem de link de e-mail, com uma mensagem só.",
  "descadastrar":
    "Aterrissagem de descadastro: quem chega aqui quer sair, não navegar.",
};

function paginasPublicas(): { rota: string; arquivo: string }[] {
  const achados: { rota: string; arquivo: string }[] = [];

  (function andar(dir: string, rota: string) {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      if (entrada.isDirectory()) {
        // Grupos de rota `(app)` não entram na URL; a área logada tem layout
        // próprio e não usa este rodapé.
        const parte = entrada.name.startsWith("(") ? "" : `/${entrada.name}`;
        andar(join(dir, entrada.name), rota + parte);
      } else if (entrada.name === "page.tsx") {
        achados.push({ rota: rota || "/", arquivo: join(dir, entrada.name) });
      }
    }
  })(join("src", "app"), "");

  return achados.filter(
    (p) => !p.arquivo.includes("administracao") && !p.arquivo.includes(`(app)`),
  );
}

describe("rodapé em toda página pública", () => {
  const paginas = paginasPublicas();

  it("encontra as páginas públicas", () => {
    // Guarda contra o teste virar vacuamente verde se a varredura quebrar.
    expect(paginas.length).toBeGreaterThan(20);
  });

  it.each(paginas.map((p) => [p.rota, p.arquivo]))(
    "%s tem rodapé",
    (rota, arquivo) => {
      const isento = Object.keys(SEM_RODAPE).find((chave) => rota.includes(chave));
      const fonte = readFileSync(arquivo, "utf8");

      if (isento) {
        // A isenção também é conferida: se a página ganhar rodapé, a lista está
        // desatualizada e o comentário dela deixou de valer.
        expect(
          fonte.includes("RodapeSite"),
          `${rota} está na lista de isentas ("${SEM_RODAPE[isento]}") mas ganhou ` +
            `rodapé. Tire-a da lista.`,
        ).toBe(false);
        return;
      }

      expect(
        fonte.includes("<RodapeSite />"),
        `${rota} não tem rodapé. Toda página pública precisa de um: é por ele ` +
          `que se chega a privacidade, termos, aviso legal e contato. Se a ` +
          `ausência for deliberada, declare em SEM_RODAPE com o motivo.`,
      ).toBe(true);
    },
  );
});

describe("o rodapé leva às páginas que a lei exige", () => {
  const rodape = readFileSync(join("src", "components", "RodapeSite.tsx"), "utf8");

  it.each(["/privacidade/", "/termos/", "/aviso-legal/", "/sobre/"])(
    "aponta para %s",
    (destino) => {
      expect(rodape).toContain(destino);
    },
  );

  it("cada destino do rodapé é uma página que existe", () => {
    // `href: "/x/"` nos objetos de dados E `href="/x/"` no JSX — o rodapé usa as
    // duas formas, e a primeira versão deste teste só via a segunda, achando
    // zero destino e passando por acidente até o `toBeGreaterThan` reclamar.
    const destinos = [...rodape.matchAll(/href[=:]\s*"(\/[a-z0-9/#-]*)"/g)].map((m) => m[1]);
    expect(destinos.length).toBeGreaterThan(5);

    const rotas = new Set(paginasPublicas().map((p) => p.rota + "/"));

    const quebrados = destinos.filter((d) => {
      const semAncora = d.split("#")[0];
      return !rotas.has(semAncora) && !rotas.has(semAncora + "/");
    });

    // Link quebrado no rodapé aparece em TODA página do site de uma vez.
    expect(quebrados, `destinos sem página: ${quebrados.join(", ")}`).toEqual([]);
  });
});
