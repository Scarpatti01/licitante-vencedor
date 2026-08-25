import { describe, expect, it } from "vitest";
import { contarPalavras, validarArtigo, type Artigo } from "../tipos";
import { GUIAS_PUBLICADOS } from "../../guias";
import { ATRASO_NO_PAGAMENTO } from "./atraso-no-pagamento-de-contrato-administrativo";
import { COMO_SABER_SE_SAIU_UMA_LICITACAO } from "./como-saber-se-saiu-uma-licitacao";
import { DOCUMENTOS_PARA_PARTICIPAR } from "./documentos-para-participar-de-licitacao";
import { PRAZO_PARA_IMPUGNAR_EDITAL } from "./prazo-para-impugnar-edital-de-licitacao";
import { QUANTAS_LICITACOES_POR_DIA } from "./quantas-licitacoes-sao-publicadas-por-dia";
import { VALE_A_PENA_PARTICIPAR } from "./vale-a-pena-participar-de-licitacao";

/**
 * A barreira de publicação do blog.
 *
 * `validarArtigo` é a regra; este arquivo é o que impede que ela seja apenas
 * uma recomendação. Cada artigo entra aqui no dia em que é escrito — artigo que
 * não está nesta lista não tem nada garantindo que ele seja publicável.
 *
 * `PRAZO_PARA_IMPUGNAR_EDITAL` faltava aqui até 21/08, apesar de publicado —
 * achado ao acrescentar `ATRASO_NO_PAGAMENTO`. Um artigo fora desta lista passa
 * para produção sem nenhuma das garantias abaixo o ter examinado.
 */
const ARTIGOS: readonly Artigo[] = [
  ATRASO_NO_PAGAMENTO,
  COMO_SABER_SE_SAIU_UMA_LICITACAO,
  DOCUMENTOS_PARA_PARTICIPAR,
  PRAZO_PARA_IMPUGNAR_EDITAL,
  QUANTAS_LICITACOES_POR_DIA,
  VALE_A_PENA_PARTICIPAR,
];

/** O mínimo editorial deste blog, acima do mínimo técnico de `validarArtigo`. */
const PALAVRAS_MINIMAS = 900;

describe.each(ARTIGOS.map((artigo) => [artigo.slug, artigo] as const))("%s", (_slug, artigo) => {
  it("passa em validarArtigo sem nenhum problema", () => {
    const problemas = validarArtigo(artigo);
    // A mensagem lista tudo de uma vez: corrigir um problema por execução de
    // teste é o que faz autor desistir de rodar o teste.
    expect(problemas, `problemas encontrados:\n- ${problemas.join("\n- ")}`).toEqual([]);
  });

  it(`tem ao menos ${PALAVRAS_MINIMAS} palavras de conteúdo`, () => {
    expect(contarPalavras(artigo)).toBeGreaterThanOrEqual(PALAVRAS_MINIMAS);
  });

  it("tem FAQ com 4 a 6 perguntas, que é a faixa que vira rich result sem inchar a página", () => {
    expect(artigo.faq.length).toBeGreaterThanOrEqual(4);
    expect(artigo.faq.length).toBeLessThanOrEqual(6);
  });

  it("aponta para um hub existente e linka esse hub dentro do texto", () => {
    // Deriva de `guias.ts`, e não de uma lista escrita à mão aqui — foi
    // justamente uma lista à mão, esquecida ao publicar o artigo de
    // impugnação, que deixou `/lei-14133/` fora da checagem por uma semana.
    const hubs = GUIAS_PUBLICADOS.map((g) => g.href);
    expect(hubs).toContain(artigo.guiaRelacionado);

    const paragrafos = artigo.corpo
      .filter((bloco) => bloco.tipo === "paragrafo")
      .map((bloco) => bloco.texto)
      .join("\n");
    expect(paragrafos).toContain(`](${artigo.guiaRelacionado})`);
  });

  it("posiciona a captura no meio do texto, não no fim", () => {
    const indice = artigo.corpo.findIndex((bloco) => bloco.tipo === "captura");
    expect(indice).toBeGreaterThanOrEqual(0);
    // Depois da dor e antes do fecho: captura no último terço é rodapé com
    // outro nome, e rodapé o leitor não alcança.
    expect(indice).toBeLessThan(artigo.corpo.length / 2);
  });

  it("publica com as datas preenchidas no formato ISO", () => {
    expect(artigo.publicado).toBe(true);
    expect(artigo.publicadoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(artigo.verificadoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("cita apenas fontes oficiais, e diz o que cada uma sustenta", () => {
    for (const fonte of artigo.fontes) {
      expect(fonte.sustenta.length).toBeGreaterThan(0);
      // Qualquer subdomínio de gov.br, não uma lista fechada de domínios — era
      // essa lista fechada que já não cobria licitacoesecontratos.tcu.gov.br,
      // fonte do próprio artigo de impugnação, sem que nenhum teste notasse.
      expect(fonte.url).toMatch(/^https:\/\/([a-z0-9-]+\.)*gov\.br\//);
    }
  });
});

describe("catálogo", () => {
  it("não tem slug repetido", () => {
    const slugs = ARTIGOS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("não tem termo principal repetido — dois artigos disputando o mesmo termo se canibalizam", () => {
    const termos = ARTIGOS.map((a) => a.termoPrincipal.toLowerCase());
    expect(new Set(termos).size).toBe(termos.length);
  });
});
