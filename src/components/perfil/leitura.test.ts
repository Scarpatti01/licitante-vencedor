import { describe, expect, it } from "vitest";
import { lerPerfilDoFormulario } from "./leitura";
import { cnpjValido } from "./validacao";
import { PERFIL_COMPLETO } from "@/lib/dominio/exemplos";

/**
 * As invariantes que não podem regredir em silêncio.
 *
 * Não é teste de renderização: é teste das três regras que, se quebrarem,
 * quebram calado — CNPJ que não é conferido de verdade, documento que passa a
 * contar como anexado por ter sido declarado, e campo vazio virando zero.
 */

const AGORA = new Date("2026-08-14T12:00:00-03:00");

function formulario(campos: Record<string, string | string[]>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) {
    for (const item of Array.isArray(valor) ? valor : [valor]) dados.append(chave, item);
  }
  return dados;
}

const MINIMO = {
  cnpj: "00.000.000/0001-91",
  razaoSocial: "EXEMPLO SERVIÇOS DE LIMPEZA LTDA",
  porte: "epp",
};

describe("cnpjValido", () => {
  it("aceita CNPJ com dígitos verificadores corretos", () => {
    expect(cnpjValido("00.000.000/0001-91")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
  });

  it("recusa dígito verificador errado e sequência repetida", () => {
    expect(cnpjValido("00000000000192")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(cnpjValido("1122233300018")).toBe(false);
  });
});

describe("lerPerfilDoFormulario", () => {
  it("aceita perfil parcial: só identificação é obrigatória", () => {
    const leitura = lerPerfilDoFormulario(formulario(MINIMO), null, "empresa-1", AGORA);
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.perfil.ufsAtendidas).toEqual([]);
    expect(leitura.perfil.palavrasChave).toEqual([]);
  });

  it("campo numérico vazio vira null, nunca zero", () => {
    const leitura = lerPerfilDoFormulario(
      formulario({ ...MINIMO, faturamentoAnual: "", ticketMinimo: "" }),
      null,
      "empresa-1",
      AGORA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.perfil.faturamentoAnual).toBeNull();
    expect(leitura.perfil.ticketMinimo).toBeNull();
  });

  it("recusa CNPJ inválido e faixa de ticket invertida", () => {
    const leitura = lerPerfilDoFormulario(
      formulario({ ...MINIMO, cnpj: "00000000000192", ticketMinimo: "900", ticketMaximo: "100" }),
      null,
      "empresa-1",
      AGORA,
    );
    expect(leitura.ok).toBe(false);
    if (leitura.ok) return;
    expect(leitura.erros.cnpj).toBeDefined();
    expect(leitura.erros.ticketMaximo).toBeDefined();
  });

  it("declarar um documento não o dá como anexado", () => {
    const leitura = lerPerfilDoFormulario(
      formulario({ ...MINIMO, documento: "fgts", "validade:fgts": "2026-11-30" }),
      null,
      "empresa-1",
      AGORA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.perfil.documentos).toEqual([
      {
        tipo: "fgts",
        descricao: null,
        validoAte: "2026-11-30",
        semValidade: false,
        arquivoAnexado: false,
      },
    ]);
  });

  it("preserva o anexo de um documento que já chegou anexado do repositório", () => {
    const leitura = lerPerfilDoFormulario(
      formulario({ ...MINIMO, documento: "certidao_federal", "validade:certidao_federal": "2027-01-31" }),
      PERFIL_COMPLETO,
      PERFIL_COMPLETO.empresaId,
      AGORA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.perfil.documentos[0].arquivoAnexado).toBe(true);
  });

  it("documento marcado sem validade e sem 'sem prazo' é erro, não documento pronto", () => {
    const leitura = lerPerfilDoFormulario(
      formulario({ ...MINIMO, documento: "fgts" }),
      null,
      "empresa-1",
      AGORA,
    );
    expect(leitura.ok).toBe(false);
    if (leitura.ok) return;
    expect(leitura.erros["validade:fgts"]).toBeDefined();
  });

  it("a empresa vem do servidor, e não do que o formulário mandar", () => {
    const leitura = lerPerfilDoFormulario(
      formulario({ ...MINIMO, empresaId: "outra-empresa" }),
      null,
      "empresa-1",
      AGORA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.perfil.empresaId).toBe("empresa-1");
  });

  it("normaliza CNAE, termos e UF; recusa o que não é código", () => {
    const bom = lerPerfilDoFormulario(
      formulario({
        ...MINIMO,
        cnaes: "8121-4/00, 8121400",
        palavrasChave: "limpeza predial,  conservação , Limpeza Predial",
        uf: ["pe", "AL"],
      }),
      null,
      "empresa-1",
      AGORA,
    );
    expect(bom.ok).toBe(true);
    if (!bom.ok) return;
    expect(bom.perfil.cnaes).toEqual(["8121400"]);
    expect(bom.perfil.palavrasChave).toEqual(["limpeza predial", "conservação"]);
    expect(bom.perfil.ufsAtendidas).toEqual(["PE", "AL"]);

    const ruim = lerPerfilDoFormulario(
      formulario({ ...MINIMO, cnaes: "812", uf: "ZZ" }),
      null,
      "empresa-1",
      AGORA,
    );
    expect(ruim.ok).toBe(false);
    if (ruim.ok) return;
    expect(ruim.erros.cnaes).toBeDefined();
    expect(ruim.erros.uf).toBeDefined();
  });
});
