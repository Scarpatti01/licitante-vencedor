import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OFERTA } from "@/lib/jornada/oferta";

/**
 * O convite ao Workbook aparece em toda página aberta ao público, e página
 * nova nasce com ele.
 *
 * A primeira tentativa punha o bloco página a página. Funcionava no dia, e
 * durava até o próximo guia: quem criasse a página seguinte esqueceria o
 * bloco, e nada quebraria, porque uma página sem anúncio é uma página normal.
 *
 * Agora o padrão é o contrário. O bloco vem ligado dentro de `RodapeSite`, que
 * é exatamente a fronteira do que é público: as páginas abertas o usam, e a
 * área logada, a administração, as telas de entrar e cadastrar e a própria
 * página de venda não. Herdar o rodapé passou a ser herdar a oferta.
 *
 * Estas guardas protegem as duas metades disso: que o padrão continue ligado,
 * e que só desligue onde há motivo escrito.
 */

const APP = join(import.meta.dirname, "..", "..", "app");
const RODAPE = join(import.meta.dirname, "..", "RodapeSite.tsx");
const BLOCO = join(import.meta.dirname, "OfertaDoWorkbook.tsx");

/**
 * Quem desliga a oferta, e por quê.
 *
 * Não é gosto: em cada uma o bloco atrapalharia o que a página existe para
 * fazer, ou repetiria o que já está ali.
 */
const SEM_OFERTA: Record<string, string> = {
  "page.tsx": "a home já tem a sua própria seção do Workbook, maior que este bloco",
  "precos/page.tsx": "já é a página de preços, com a oferta inteira aberta",
  "privacidade/page.tsx": "página legal: venda no meio de política de privacidade confunde aviso com anúncio",
  "termos/page.tsx": "página legal",
  "aviso-legal/page.tsx": "página legal",
};

function paginas(dir: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...paginas(caminho));
    else if (entrada.name === "page.tsx") achados.push(caminho);
  }
  return achados;
}

const TODAS = paginas(APP).map((caminho) => ({
  caminho: caminho.slice(APP.length + 1),
  texto: readFileSync(caminho, "utf8"),
}));

/** Página aberta ao público é a que traz o rodapé do site. */
const PUBLICAS = TODAS.filter(({ texto }) => texto.includes("<RodapeSite"));

const FONTE_DO_RODAPE = readFileSync(RODAPE, "utf8");
const FONTE_DO_BLOCO = readFileSync(BLOCO, "utf8");

describe("a oferta nasce ligada em toda página pública", () => {
  it("acha as páginas para medir", () => {
    // Sem lastro, uma varredura vazia deixaria todo o resto passar por vacuidade.
    expect(PUBLICAS.length, "não achei página pública nenhuma").toBeGreaterThan(20);
  });

  it("o rodapé traz a oferta, e o padrão do parâmetro é ligado", () => {
    // O padrão é o coração da regra: é ele que faz a página nova nascer com o
    // bloco sem ninguém lembrar de nada.
    expect(FONTE_DO_RODAPE).toContain("OfertaDoWorkbook");
    expect(
      /oferta\s*=\s*true/.test(FONTE_DO_RODAPE),
      "o parâmetro `oferta` do RodapeSite deixou de vir ligado por padrão: " +
        "com o padrão desligado, toda página nova nasce sem a oferta e ninguém percebe",
    ).toBe(true);
  });

  it("só desliga quem tem motivo escrito aqui", () => {
    for (const { caminho, texto } of PUBLICAS) {
      const desliga = /<RodapeSite\s+oferta=\{false\}/.test(texto);
      if (desliga) {
        expect(
          caminho in SEM_OFERTA,
          `${caminho} desliga a oferta do Workbook sem motivo declarado. ` +
            `Se é para desligar mesmo, escreva o porquê em SEM_OFERTA nesta guarda.`,
        ).toBe(true);
      } else {
        expect(
          caminho in SEM_OFERTA,
          `${caminho} está listada em SEM_OFERTA mas não desliga a oferta`,
        ).toBe(false);
      }
    }
  });

  it("cada exceção declarada existe de verdade", () => {
    // Exceção para página que não existe mais é regra morta, e regra morta
    // esconde que a varredura deixou de cobrir alguma coisa.
    for (const caminho of Object.keys(SEM_OFERTA)) {
      expect(
        PUBLICAS.some((p) => p.caminho === caminho),
        `SEM_OFERTA lista ${caminho}, que não é mais uma página pública`,
      ).toBe(true);
    }
  });

  it("a maioria esmagadora das páginas públicas fica com a oferta", () => {
    // Se um dia as exceções virarem a regra, alguém transformou o padrão em
    // exceção sem dizer, e a intenção do pedido se perdeu.
    const com = PUBLICAS.length - Object.keys(SEM_OFERTA).length;
    expect(com).toBeGreaterThan(PUBLICAS.length * 0.7);
  });
});

describe("o bloco diz a verdade sobre a oferta", () => {
  it("acha o componente para medir", () => {
    expect(FONTE_DO_BLOCO.length).toBeGreaterThan(500);
  });

  it("tira preço e garantia de OFERTA, e não de número escrito à mão", () => {
    // O bloco aparece em vinte e poucas páginas. Preço na mão aqui vira preço
    // divergente do checkout no dia em que o dono mudar `oferta.ts`.
    expect(FONTE_DO_BLOCO).toContain("OFERTA.precoEscrito");
    expect(FONTE_DO_BLOCO).toContain("OFERTA.diasDeGarantia");
    expect(FONTE_DO_BLOCO).toContain("OFERTA.ancoragem[0].valor");

    const corpo = FONTE_DO_BLOCO.slice(FONTE_DO_BLOCO.indexOf("export function"));
    expect(
      /R\$\s*\d/.test(corpo),
      "o componente escreve um valor em reais à mão; use OFERTA",
    ).toBe(false);
  });

  it("o valor riscado é maior que o preço, senão o desconto é mentira", () => {
    expect(OFERTA.ancoragem[0].valor).toBeGreaterThan(OFERTA.preco);
  });

  it("menciona o acesso à Jornada, e não só o livro", () => {
    // O preço compra a Jornada, com o Workbook junto. Anunciar só o livro
    // venderia por menos do que a oferta é, e surpreenderia o comprador depois.
    expect(FONTE_DO_BLOCO).toContain("OFERTA.nome");
    expect(FONTE_DO_BLOCO.toLowerCase()).toContain("acesso à");
  });

  it("o botão leva para a página de venda", () => {
    expect(FONTE_DO_BLOCO).toContain('href="/jornada/"');
    expect(FONTE_DO_BLOCO).toContain("Saiba mais");
  });

  it("não promete resultado", () => {
    // Licitação é disputa aberta. Quem promete contrato promete o que não
    // depende dele.
    const promessas = [
      /garantimos?\s+(que\s+)?voc[êe]\s+(vai\s+)?(ganh|vencer|fatur)/i,
      /voc[êe]\s+vai\s+(ganhar|vencer|faturar)/i,
      /lucro\s+garantido/i,
      /resultado\s+garantido/i,
    ];
    for (const promessa of promessas) {
      expect(promessa.test(FONTE_DO_BLOCO), `o bloco promete resultado: ${promessa}`).toBe(
        false,
      );
    }
  });
});
