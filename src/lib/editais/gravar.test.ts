import { describe, expect, it } from "vitest";
import { edital } from "../fontes/fixtures";
import { paraLinha } from "./gravar";

/**
 * O mapeamento entre o `Edital` do projeto e a linha da tabela.
 *
 * Cada caso aqui corresponde a um `check` da coluna: um mapeamento que os
 * ignora não falha no teste, falha no lote inteiro em produção — e leva junto
 * os 499 editais que estavam certos.
 */
describe("paraLinha", () => {
  it("leva o id canônico para a coluna certa", () => {
    // `id` do projeto vira `id_canonico`; a PK da tabela é um uuid que a fonte
    // não conhece.
    const linha = paraLinha(edital({ id: "PE-2026-000001" }));
    expect(linha.id_canonico).toBe("PE-2026-000001");
    expect(linha).not.toHaveProperty("id");
  });

  it("calcula o hash em vez de esperar que venha pronto", () => {
    // `Edital` não carrega hash: ele é derivado, e derivado que viaja diverge.
    expect(paraLinha(edital())).toHaveProperty("hash_de_conteudo");
    expect(paraLinha(edital()).hash_de_conteudo).toMatch(/^[0-9a-f]{64}$/);
  });

  it("recusa CNPJ que não passa no check da coluna", () => {
    // `orgao_cnpj text check (orgao_cnpj ~ '^[0-9]{14}$')`. Um CNPJ com máscara
    // ou vazio derrubaria o lote.
    expect(paraLinha(edital({ orgao: { cnpj: "11.097.292/0001-49", nome: "X", esfera: "municipal" } })).orgao_cnpj).toBeNull();
    expect(paraLinha(edital({ orgao: { cnpj: "", nome: "X", esfera: "municipal" } })).orgao_cnpj).toBeNull();
    expect(paraLinha(edital()).orgao_cnpj).toBe("11097292000149");
  });

  it("nunca manda valor que viole `valor_estimado > 0`", () => {
    // `Edital` já converte o zero do PNCP em null, mas um negativo vindo da
    // fonte derrubaria o lote por causa de um registro.
    expect(paraLinha(edital({ valorEstimado: 0 })).valor_estimado).toBeNull();
    expect(paraLinha(edital({ valorEstimado: -5 })).valor_estimado).toBeNull();
    expect(paraLinha(edital({ valorEstimado: 1 })).valor_estimado).toBe(1);
  });

  it("preserva o valor bruto mesmo quando o estimado é descartado", () => {
    // É o que permite auditar depois o que a fonte de fato publicou.
    const linha = paraLinha(edital({ valorEstimado: null, valorEstimadoBruto: 0 }));
    expect(linha.valor_estimado).toBeNull();
    expect(linha.valor_estimado_bruto).toBe(0);
  });

  it("normaliza a UF para maiúsculas", () => {
    // `uf text check (uf ~ '^[A-Z]{2}$')`.
    const linha = paraLinha(
      edital({ local: { uf: "pe", municipio: "Recife", municipioSlug: "recife", codigoIbge: "2611606" } }),
    );
    expect(linha.uf).toBe("PE");
  });

  it("dá modalidade padrão quando a fonte não informou", () => {
    // A coluna é `not null default 'Não informada'`, e mandar string vazia
    // passaria pelo not-null gravando um vazio que a tela mostraria como buraco.
    expect(paraLinha(edital({ modalidade: "" })).modalidade).toBe("Não informada");
  });

  it("não manda `atualizado_em` — a trigger cuida dele", () => {
    // Mandar daqui competiria com `marcar_atualizacao`, e um dos dois perderia
    // em silêncio.
    expect(paraLinha(edital())).not.toHaveProperty("atualizado_em");
    expect(paraLinha(edital())).not.toHaveProperty("criado_em");
  });
});
