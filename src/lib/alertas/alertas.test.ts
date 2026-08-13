import { describe, expect, it } from "vitest";
import { PREFERENCIAS_PADRAO, selecionarParaAlerta } from "./selecao";
import { emHtml, emTextoSimples, montarMensagem } from "./mensagem";
import { RepositorioDeDemonstracao, EMPRESA_DE_DEMONSTRACAO } from "../dados/demonstracao";
import type { ResumoDaOportunidade } from "../dados/porta";

const AGORA = new Date("2026-08-14T12:00:00-03:00");

async function oportunidades(): Promise<ResumoDaOportunidade[]> {
  const repo = new RepositorioDeDemonstracao();
  return repo.listarOportunidades(EMPRESA_DE_DEMONSTRACAO, {});
}

describe("selecionarParaAlerta", () => {
  it("não alerta sobre edital com prazo encerrado", async () => {
    const selecao = selecionarParaAlerta(await oportunidades(), PREFERENCIAS_PADRAO, AGORA);
    expect(selecao.itens.some((i) => i.oportunidade.id === "EXEMPLO-ENCERRADO")).toBe(false);
  });

  it("não alerta sobre o que não pôde ser pontuado", async () => {
    const todas = await oportunidades();
    const semScore = todas.filter((o) => o.avaliacao.score.valor === null);
    const selecao = selecionarParaAlerta(todas, PREFERENCIAS_PADRAO, AGORA);
    for (const o of semScore) {
      expect(selecao.itens.some((i) => i.oportunidade.id === o.id)).toBe(false);
    }
  });

  it("não alerta sobre o que tem impedimento", async () => {
    const selecao = selecionarParaAlerta(await oportunidades(), PREFERENCIAS_PADRAO, AGORA);
    for (const item of selecao.itens) {
      expect(item.oportunidade.avaliacao.recomendacao.nivel).not.toBe("nao_recomendada");
    }
  });

  it("respeita o teto por envio e conta o que ficou de fora", async () => {
    const todas = await oportunidades();
    const selecao = selecionarParaAlerta(todas, { ...PREFERENCIAS_PADRAO, maximoPorEnvio: 1 }, AGORA);
    expect(selecao.itens).toHaveLength(1);
    expect(selecao.descartadas).toBe(todas.length - 1);
  });

  it("prazo curto de oportunidade já salva vem antes de tudo", async () => {
    const todas = await oportunidades();
    const salva = todas.find((o) => o.id === "EXEMPLO-URGENTE")!;
    const comSalva = todas.map((o) =>
      o.id === salva.id ? { ...o, situacao: "salva" as const } : o,
    );
    const selecao = selecionarParaAlerta(comSalva, PREFERENCIAS_PADRAO, AGORA);
    expect(selecao.itens[0].motivo).toBe("salva_com_prazo_curto");
  });

  it("silêncio é resultado válido: sem nada relevante, não há itens", () => {
    const selecao = selecionarParaAlerta([], PREFERENCIAS_PADRAO, AGORA);
    expect(selecao.vazio).toBe(true);
    expect(selecao.itens).toHaveLength(0);
  });
});

describe("montarMensagem", () => {
  it("não manda o edital inteiro — só os campos de decisão", async () => {
    const selecao = selecionarParaAlerta(await oportunidades(), PREFERENCIAS_PADRAO, AGORA);
    const mensagem = montarMensagem(selecao, AGORA);
    for (const bloco of mensagem.blocos) {
      expect(bloco.objeto.length).toBeGreaterThan(0);
      expect(bloco.proximaAcao.length).toBeGreaterThan(0);
      expect(bloco.link).toContain("/oportunidades/");
    }
  });

  it("valor ausente é dito, nunca vira R$ 0,00", async () => {
    const todas = await oportunidades();
    const semValor = todas.find((o) => o.id === "EXEMPLO-SEM-VALOR");
    if (!semValor) return;
    const mensagem = montarMensagem(
      { itens: [{ oportunidade: semValor, motivo: "alta_aderencia", prioridade: 1 }], descartadas: 0, vazio: false },
      AGORA,
    );
    expect(mensagem.blocos[0].valor).toContain("não publicou");
    expect(mensagem.blocos[0].valor).not.toContain("0,00");
  });

  it("diz quantas publicações foram avaliadas e descartadas", async () => {
    const selecao = selecionarParaAlerta(await oportunidades(), { ...PREFERENCIAS_PADRAO, maximoPorEnvio: 1 }, AGORA);
    expect(montarMensagem(selecao, AGORA).rodape).toMatch(/foram avaliadas e não entraram/);
  });

  it("o rodapé sempre nega parecer jurídico e afirma que o edital prevalece", async () => {
    const mensagem = montarMensagem(selecionarParaAlerta(await oportunidades(), PREFERENCIAS_PADRAO, AGORA), AGORA);
    expect(mensagem.rodape).toMatch(/não é parecer jurídico/i);
    expect(mensagem.rodape).toMatch(/prevalece/i);
  });

  it("nunca promete vitória, em nenhum dos dois canais", async () => {
    const mensagem = montarMensagem(selecionarParaAlerta(await oportunidades(), PREFERENCIAS_PADRAO, AGORA), AGORA);
    const proibido = /chance de (vit[óo]ria|ganhar)|garantimos|garantia de vit[óo]ria|voc[êe] vai ganhar/i;
    expect(emTextoSimples(mensagem)).not.toMatch(proibido);
    expect(emHtml(mensagem)).not.toMatch(proibido);
  });

  it("escapa HTML vindo do objeto do edital", async () => {
    const todas = await oportunidades();
    const injetado = {
      ...todas[0],
      edital: { ...todas[0].edital, objeto: 'Limpeza <script>alert("x")</script> & conservação' },
    };
    const html = emHtml(
      montarMensagem({ itens: [{ oportunidade: injetado, motivo: "alta_aderencia", prioridade: 1 }], descartadas: 0, vazio: false }, AGORA),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  // O `id` da oportunidade vira o href do botão do e-mail, e para o PNCP ele é
  // o `numeroControlePNCP` — texto de terceiro que nenhuma camada valida
  // (`ContratacaoPncp` é `type`, não schema; `ehUtilizavel` só confere se o
  // campo é truthy). Sem escape, uma aspa nesse campo fecha o atributo `href` e
  // o resto vira marcação no e-mail de todo assinante que receber o edital.
  it("escapa o link, que carrega identificador vindo da fonte", async () => {
    const todas = await oportunidades();
    const injetado = { ...todas[0], id: 'X" onmouseover="alert(1)' };
    const html = emHtml(
      montarMensagem({ itens: [{ oportunidade: injetado, motivo: "alta_aderencia", prioridade: 1 }], descartadas: 0, vazio: false }, AGORA),
    );
    // Sem escape o resultado é
    // `<a href="https://.../oportunidades/X" onmouseover="alert(1)/" style=...>`:
    // a aspa fechou o href e o que sobrou virou atributo de evento.
    // A aspa CRUA é o que importa: escapada, `onmouseover=&quot;` é texto
    // dentro do href e não atributo.
    expect(html).not.toMatch(/onmouseover="/);
    expect(html).toContain("/oportunidades/X&quot; onmouseover=&quot;alert(1)/");
  });
});
