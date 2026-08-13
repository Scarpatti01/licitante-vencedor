import type { Edital } from "./tipos";

/**
 * Um edital de referência para os testes — limpo, e limpo de propósito.
 *
 * Os valores não são inventados: saem de um registro real do piloto de
 * 2026-08-12 (município de Limoeiro/PE), com CNPJ que passa nos dígitos e
 * código IBGE que corresponde à UF. Assim, um achado que aparecer num teste é
 * o que o teste plantou, e não ruído do fixture.
 *
 * Fica em arquivo próprio, e não dentro de um `.test.ts`, para os testes de
 * cobertura, degradação e mudança compartilharem o MESMO edital base — dois
 * fixtures que divergem em silêncio produzem dois testes que testam coisas
 * diferentes achando que testam a mesma.
 */
export function edital(over: Partial<Edital> = {}): Edital {
  return {
    id: "PE-2026-000001",
    fonte: "pncp",
    idNaFonte: "PE-2026-000001",
    objeto: "Aquisição de material de expediente para a secretaria de educação",
    orgao: { cnpj: "11097292000149", nome: "MUNICIPIO DE LIMOEIRO", esfera: "municipal" },
    local: { uf: "PE", municipio: "Limoeiro", municipioSlug: "limoeiro", codigoIbge: "2608909" },
    modalidade: "Pregão - Eletrônico",
    modoDisputa: "Aberto",
    instrumento: "Edital",
    amparoLegal: null,
    registroDePrecos: false,
    valorEstimado: 500_000,
    valorEstimadoBruto: 500_000,
    valorSuspeito: false,
    aberturaProposta: "2026-08-01T09:00:00-03:00",
    encerramentoProposta: "2026-08-30T14:00:00-03:00",
    publicadoEm: "2026-08-01T09:00:00-03:00",
    situacao: "Divulgada no PNCP",
    link: "https://pncp.gov.br/app/editais/11097292000149/2026/1",
    coletadoEm: "2026-08-13T07:49:55.338Z",
    ...over,
  };
}
