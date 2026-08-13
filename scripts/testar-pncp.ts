/**
 * Testes do pipeline do PNCP.  Rodar:  npm run pncp:testar
 *
 * Determinístico de propósito: nada aqui toca a rede. A API do PNCP saiu do ar
 * durante o desenvolvimento, e teste que depende de fonte instável some
 * exatamente quando é mais necessário.
 */
import { auditar, cnpjValido, relatorioEmTexto } from "../src/lib/pncp/auditoria.ts";
import type { Edital } from "../src/lib/fontes/tipos.ts";
import { classificarUf, resumirCobertura } from "../src/lib/fontes/cobertura.ts";
import { slugDeMunicipio, comFusoDeBrasilia } from "../src/lib/pncp/normaliza.ts";

let falhas = 0;
const ok = (nome: string, real: unknown, esperado: unknown) => {
  const bom = JSON.stringify(real) === JSON.stringify(esperado);
  if (!bom) { falhas++; console.log(`XX ${nome}\n   esperado ${JSON.stringify(esperado)}\n   recebido ${JSON.stringify(real)}`); }
  else console.log(`OK  ${nome}`);
};

const REF = "2026-08-12T12:00:00.000Z";
const base = (over: Partial<Edital> = {}): Edital => ({
  id: "id-" + Math.random().toString(36).slice(2, 8),
  fonte: "pncp",
  idNaFonte: "id-na-fonte",
  objeto: "Aquisição de material de expediente para a secretaria",
  orgao: { cnpj: "11097292000149", nome: "MUNICIPIO DE LIMOEIRO", esfera: "municipal" },
  local: { uf: "PE", municipio: "Limoeiro", municipioSlug: "limoeiro", codigoIbge: "2608909" },
  modalidade: "Pregão - Eletrônico", modoDisputa: "Aberto", instrumento: "Edital",
  amparoLegal: null, registroDePrecos: false,
  valorEstimado: 500_000, valorEstimadoBruto: 500_000, valorSuspeito: false,
  aberturaProposta: "2026-08-01T09:00:00-03:00", encerramentoProposta: "2026-08-30T14:00:00-03:00",
  publicadoEm: "2026-08-01T09:00:00-03:00", situacao: "Divulgada no PNCP",
  link: "https://pncp.gov.br/app/editais/11097292000149/2026/1", coletadoEm: REF,
  ...over,
});

console.log("=== CNPJ: aritmetica, sem julgamento ===");
ok("CNPJ real valido", cnpjValido("11097292000149"), true);
ok("digito trocado invalida", cnpjValido("11097292000148"), false);
ok("todos iguais invalida", cnpjValido("11111111111111"), false);
ok("tamanho errado invalida", cnpjValido("110972920001"), false);

console.log("\n=== base limpa nao inventa achado ===");
const limpo = auditar(Array.from({ length: 60 }, () => base()), REF);
ok("60 registros validos = 0 achados", limpo.achados.length, 0);
ok("relatorio diz que esta limpo", relatorioEmTexto(limpo).includes("Nenhuma incoerência"), true);

console.log("\n=== cada regra dispara no caso certo ===");
const invertido = auditar([base({ aberturaProposta: "2026-08-30T09:00:00-03:00", encerramentoProposta: "2026-08-01T14:00:00-03:00" })], REF);
// Encerramento anterior a abertura E anterior a referencia dispara as duas
// regras, e esta certo: sao dois defeitos distintos no mesmo registro.
ok("prazo invertido", invertido.achados.map(a => a.regra).sort(), ["prazo-invertido","prazo-vencido"]);

const vencido = auditar([base({ encerramentoProposta: "2026-08-01T14:00:00-03:00" })], REF);
ok("prazo vencido", vencido.achados.map(a => a.regra), ["prazo-vencido"]);

const ufErrada = auditar([base({ local: { uf: "SP", municipio: "Limoeiro", municipioSlug: "limoeiro", codigoIbge: "2608909" } })], REF);
ok("UF divergente do IBGE", ufErrada.achados.map(a => a.regra), ["uf-divergente-do-ibge"]);
ok("aponta a UF do prefixo", ufErrada.achados[0].hipotese?.includes("PE"), true);

const cnpjRuim = auditar([base({ orgao: { cnpj: "11097292000148", nome: "X", esfera: "municipal" } })], REF);
ok("CNPJ invalido", cnpjRuim.achados.map(a => a.regra), ["cnpj-invalido"]);

const objCurto = auditar([base({ objeto: "COPA E COZINHA" })], REF);
ok("objeto insuficiente", objCurto.achados.map(a => a.regra), ["objeto-insuficiente"]);

console.log("\n=== valor implausivel: a parte que NAO pode inventar ===");
// 40 registros de referencia entre 100k e 1M, mais um outlier de 5 bilhoes.
const conjunto = Array.from({ length: 40 }, (_, i) => base({ valorEstimado: 100_000 + i * 22_500, valorEstimadoBruto: 100_000 + i * 22_500 }));
conjunto.push(base({ valorEstimado: 5_000_000_000, valorEstimadoBruto: 5_000_000_000, valorSuspeito: true }));
const comOutlier = auditar(conjunto, REF);
const achado = comOutlier.achados.find(a => a.regra === "valor-implausivel")!;
ok("marca valor implausivel", Boolean(achado), true);
ok("gravidade e suspeita, nao erro", achado.gravidade, "suspeita");
ok("evidencia traz o valor declarado", achado.evidencia.includes("5.000.000.000,00"), true);
ok("hipotese existe", Boolean(achado.hipotese), true);
ok("declara que e hipotese, nao confirmacao", /hipótese|Não é possível determinar|Nenhuma correção/i.test(achado.hipotese!), true);

console.log("   sem candidato:", achado.hipotese!.slice(0, 120) + "...");

// Distribuicao exponencial: a janela [p50, max] passa de 10x, entao mais de uma
// potencia de dez cabe dentro dela e o revisor precisa recusar escolher.
const amplo = Array.from({ length: 40 }, (_, i) => {
  const v = Math.round(10 ** (3 + i / 10));
  return base({ valorEstimado: v, valorEstimadoBruto: v });
});
amplo.push(base({ valorEstimado: 8_000_000_000, valorEstimadoBruto: 8_000_000_000, valorSuspeito: true }));
const ambiguo = auditar(amplo, REF).achados.find(a => a.regra === "valor-implausivel")!;
console.log("   ambiguo:", ambiguo.hipotese!.slice(0, 175) + "...");
ok("recusa decidir quando ha ambiguidade", /Não é possível determinar|Nenhuma correção/.test(ambiguo.hipotese!), true);
ok("nunca afirma 'o valor correto e' como fato", /o valor correto é/i.test(ambiguo.hipotese!), false);

// Janela estreita (menos de 10x entre p50 e max): so uma potencia de dez cabe.
const estreito = Array.from({ length: 40 }, (_, i) => {
  const v = Math.round(200_000 + i * 20_000);
  return base({ valorEstimado: v, valorEstimadoBruto: v });
});
estreito.push(base({ valorEstimado: 700_000_000, valorEstimadoBruto: 700_000_000, valorSuspeito: true }));
const unico = auditar(estreito, REF).achados.find(a => a.regra === "valor-implausivel")!;
console.log("   candidato unico:", unico.hipotese!.slice(0, 175) + "...");
ok("nomeia o candidato quando so um cabe", /Dividido por/.test(unico.hipotese!), true);
ok("mesmo assim rotula como hipotese", /hipótese derivada|não confirmação/i.test(unico.hipotese!), true);

console.log("\n=== cobertura parcial e declarada antes dos numeros ===");
// Os tres estados por UF: completa, parcial (entregou antes de parar) e falha.
// A cobertura detalhada tem suite propria em src/lib/fontes/cobertura.test.ts.
const cob = resumirCobertura(["PE","PB","CE"], [
  classificarUf({ uf: "PE", editais: 100, motivo: "timeout" }),
  classificarUf({ uf: "PB", editais: 40 }),
  classificarUf({ uf: "CE", editais: 0, motivo: "503" }),
]);
const rel = relatorioEmTexto(limpo, cob);
ok("avisa cobertura incompleta", rel.includes("cobertura incompleta"), true);
ok("nomeia a UF que faltou", rel.includes("CE: 503"), true);
ok("declara a UF parcial com o que entrou", rel.includes("PE: 100 editais coletados"), true);
ok("aviso vem antes dos achados", rel.indexOf("cobertura incompleta") < rel.indexOf("editais têm valor"), true);


console.log("\n=== normalizacao: fuso, slug e valor ===");
{
  ok("slug tira acento", slugDeMunicipio("São Paulo"), "sao-paulo");
  ok("slug tira cedilha", slugDeMunicipio("Açu"), "acu");
  ok("slug com varias palavras", slugDeMunicipio("Brejo da Madre de Deus"), "brejo-da-madre-de-deus");
  ok("anexa fuso de Brasilia", comFusoDeBrasilia("2026-08-12T14:00:00"), "2026-08-12T14:00:00-03:00");
  ok("14h Brasilia = 17h UTC", new Date(comFusoDeBrasilia("2026-08-12T14:00:00")!).toISOString(), "2026-08-12T17:00:00.000Z");
  ok("data invalida vira null", comFusoDeBrasilia("nao e data"), null);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : "\ntodos passaram");
process.exit(falhas ? 1 : 0);
