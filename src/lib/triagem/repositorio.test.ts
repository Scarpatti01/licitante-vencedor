import { describe, expect, it } from "vitest";
import { PERFIL_COMPLETO, PERFIL_INCOMPLETO } from "../dominio/exemplos.ts";
import type { PerfilDaEmpresa } from "../dominio/tipos.ts";
import { edital } from "../fontes/fixtures.ts";
import { paraLinha as editalParaLinha } from "../editais/gravar.ts";
import { editalDaLinha, perfilDaLinha } from "./repositorio.ts";

/**
 * O teste de ida e volta que `docs/produto/roadmap.md` cobra antes de confiar
 * na leitura.
 *
 * A armadilha nomeada lá: um campo trocado na reconstrução do perfil não
 * derruba nada — produz um score plausível e errado. `ticketMaximo` lido como
 * `ticketMinimo` faz o critério de valor pontuar ao contrário, e revisão de
 * código não pega esse tipo de troca porque os dois campos são do mesmo tipo.
 * Só igualdade campo a campo, contra um fixture com valores DISTINTOS em cada
 * par do mesmo tipo (`PERFIL_COMPLETO` já é assim: ticketMinimo ≠ ticketMaximo,
 * cnpj ≠ razaoSocial ≠ nomeFantasia), pega a troca.
 */

/** A linha que as quatro tabelas do perfil produziriam para `PERFIL_COMPLETO`. */
function linhaDoPerfil(perfil: PerfilDaEmpresa, empresaId: string) {
  return {
    id: empresaId,
    cnpj: perfil.cnpj,
    razao_social: perfil.razaoSocial,
    nome_fantasia: perfil.nomeFantasia,
    perfis_da_empresa: {
      porte: perfil.porte,
      // `numeric` chega como string no PostgREST — testando a conversão nos
      // dois sentidos, não só passando o número já pronto.
      faturamento_anual: perfil.faturamentoAnual === null ? null : String(perfil.faturamentoAnual.toFixed(2)),
      cnaes: perfil.cnaes,
      palavras_chave: perfil.palavrasChave,
      palavras_excluidas: perfil.palavrasExcluidas,
      ufs_atendidas: perfil.ufsAtendidas,
      municipios_prioritarios: perfil.municipiosPrioritarios,
      ticket_minimo: perfil.ticketMinimo === null ? null : String(perfil.ticketMinimo.toFixed(2)),
      ticket_maximo: perfil.ticketMaximo === null ? null : String(perfil.ticketMaximo.toFixed(2)),
      modalidades_aceitas: perfil.modalidadesAceitas,
      atualizado_em: perfil.atualizadoEm,
    },
    documentos_da_empresa: perfil.documentos.map((d) => ({
      tipo: d.tipo,
      descricao: d.descricao,
      valido_ate: d.validoAte,
      sem_validade: d.semValidade,
      arquivo_anexado: d.arquivoAnexado,
    })),
    atestados: perfil.atestados.map((a) => ({
      objeto: a.objeto,
      valor: a.valor === null ? null : String(a.valor.toFixed(2)),
      orgao: a.orgao,
      ano: a.ano,
    })),
  };
}

describe("perfilDaLinha — ida e volta", () => {
  it("reconstrói PERFIL_COMPLETO campo a campo, sem trocar nenhum", () => {
    const linha = linhaDoPerfil(PERFIL_COMPLETO, "11111111-1111-1111-1111-111111111111");
    expect(perfilDaLinha(linha)).toEqual({
      ...PERFIL_COMPLETO,
      empresaId: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("reconstrói PERFIL_INCOMPLETO — o caso com nulos em quase todo campo opcional", () => {
    // O caso feliz sozinho não prova nada sobre `null`: `faturamentoAnual`,
    // `ticketMinimo`/`ticketMaximo` e os arrays vazios de PERFIL_INCOMPLETO são
    // exatamente onde `numero()` e os `?? []` podem devolver a coisa errada.
    const linha = linhaDoPerfil(PERFIL_INCOMPLETO, "22222222-2222-2222-2222-222222222222");
    expect(perfilDaLinha(linha)).toEqual({
      ...PERFIL_INCOMPLETO,
      empresaId: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("perfis_da_empresa como objeto (1:1) e como array de um item (1:N) leem igual", () => {
    // PostgREST devolve os dois formatos dependendo de como a relação foi
    // declarada na consulta. `primeira()` existe para isto não importar.
    const linha = linhaDoPerfil(PERFIL_COMPLETO, "11111111-1111-1111-1111-111111111111");
    const comoArray = { ...linha, perfis_da_empresa: [linha.perfis_da_empresa] };
    expect(perfilDaLinha(comoArray)).toEqual(perfilDaLinha(linha));
  });

  it("sem perfis_da_empresa, devolve null em vez de forçar um perfil vazio", () => {
    const linha = linhaDoPerfil(PERFIL_COMPLETO, "11111111-1111-1111-1111-111111111111");
    expect(perfilDaLinha({ ...linha, perfis_da_empresa: null })).toBeNull();
  });

  it("documentos e atestados ausentes viram lista vazia, não erro", () => {
    const linha = linhaDoPerfil(PERFIL_COMPLETO, "11111111-1111-1111-1111-111111111111");
    const semListas = perfilDaLinha({ ...linha, documentos_da_empresa: null, atestados: null });
    expect(semListas?.documentos).toEqual([]);
    expect(semListas?.atestados).toEqual([]);
  });
});

describe("editalDaLinha — ida e volta", () => {
  /**
   * Usa `paraLinha` (a direção contrária, já testada em `editais/gravar.test.ts`)
   * como origem da linha, em vez de escrever uma linha à mão: assim o teste
   * também acusa se as duas direções divergirem sobre o nome ou o formato de
   * uma coluna, que é justamente o tipo de troca que não aparece revisando os
   * dois arquivos separadamente.
   */
  it("reconstrói um edital limpo campo a campo", () => {
    const original = edital();
    const linha = { ...editalParaLinha(original), id: "33333333-3333-3333-3333-333333333333" };
    expect(editalDaLinha(linha)).toEqual(original);
  });

  it("numeric chegando como string reconstrói o mesmo valor", () => {
    const original = edital({ valorEstimado: 480_000.5, valorEstimadoBruto: 480_000.5 });
    const linha = {
      ...editalParaLinha(original),
      id: "33333333-3333-3333-3333-333333333333",
      valor_estimado: "480000.50",
      valor_estimado_bruto: "480000.50",
    };
    expect(editalDaLinha(linha).valorEstimado).toBe(480_000.5);
    expect(editalDaLinha(linha).valorEstimadoBruto).toBe(480_000.5);
  });

  it("orgao_cnpj nulo (CNPJ que não passou no check da coluna) volta como string vazia", () => {
    const original = edital();
    const linha = {
      ...editalParaLinha(original),
      id: "33333333-3333-3333-3333-333333333333",
      orgao_cnpj: null,
    };
    expect(editalDaLinha(linha).orgao.cnpj).toBe("");
  });
});
