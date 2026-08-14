import { describe, expect, it } from "vitest";
import { emHtml, emTextoSimples } from "../email/mensagens";
import { edital } from "../fontes/fixtures";
import { selecionarParaLead } from "./lead";
import { conteudoDeAlertaDiario } from "./mensagem-do-lead";
import { interpretarRegiao } from "./regiao";

const agora = new Date("2026-08-14T09:00:00-03:00");
const recife = interpretarRegiao("Recife")!;

function emRecife(id: string, dias: number, over = {}) {
  const encerra = new Date(agora);
  encerra.setDate(encerra.getDate() + dias);
  return edital({
    id,
    local: { uf: "PE", municipio: "Recife", municipioSlug: "recife", codigoIbge: "2611606" },
    encerramentoProposta: encerra.toISOString(),
    ...over,
  });
}

function montar(editais = [emRecife("e-1", 5)], regiao = recife) {
  const selecao = selecionarParaLead(editais, regiao, new Set(), undefined, agora);
  return conteudoDeAlertaDiario({
    email: "cliente@exemplo.com.br",
    tokenDeDescadastro: "TOKEN-DE-TESTE-aaaaaaaaaaaaaaaaaaaaaaa",
    regiao: regiao.original,
    selecao,
  });
}

describe("conteudoDeAlertaDiario", () => {
  it("põe contagem e região no assunto", () => {
    // "Alerta de licitação" é indistinguível do e-mail de ontem numa caixa
    // cheia. A contagem e o lugar são uma informação inteira antes do clique.
    expect(montar([emRecife("a", 3), emRecife("b", 4)]).assunto).toBe("2 editais abertos em Recife");
    expect(montar([emRecife("a", 3)]).assunto).toBe("1 edital aberto em Recife");
  });

  it("usa o texto que o visitante digitou, não o slug", () => {
    // Sem isto o assunto sairia "1 edital aberto em sao-paulo".
    const saoPaulo = interpretarRegiao("São Paulo/SP")!;
    const naCapital = edital({
      id: "sp-1",
      local: { uf: "SP", municipio: "São Paulo", municipioSlug: "sao-paulo", codigoIbge: "3550308" },
      encerramentoProposta: "2026-08-20T14:00:00-03:00",
    });

    expect(montar([naCapital], saoPaulo).assunto).toBe("1 edital aberto em São Paulo/SP");
  });

  it("traz os cinco campos que as boas-vindas prometeram", () => {
    /*
     * `conteudoDeBoasVindas` lista item a item o que vem em cada alerta. Esses
     * campos são contrato com quem confirmou o cadastro — se este teste for
     * afrouxado, o produto passa a entregar diferente do que prometeu na única
     * mensagem que a pessoa leu com atenção.
     */
    const bloco = montar().listas[0];
    expect(bloco.itens.map((i) => i.rotulo)).toEqual(["Órgão", "Local", "Valor", "Prazo", "Edital"]);
  });

  it("o link do edital é clicável no HTML e legível no texto", () => {
    const conteudo = montar();
    const link = conteudo.listas[0].itens.at(-1)!;

    expect(link.url).toBe("https://pncp.gov.br/app/editais/11097292000149/2026/1");
    expect(emHtml(conteudo)).toContain(`<a href="${link.url}"`);
    // No texto puro o cliente de e-mail já transforma endereço em link sozinho;
    // o que faltaria é o endereço aparecer.
    expect(emTextoSimples(conteudo)).toContain(link.url);
  });

  it("nunca escreve R$ 0,00 quando o órgão não publicou valor", () => {
    const conteudo = montar([emRecife("sem-valor", 5, { valorEstimado: null, valorSuspeito: false })]);
    const valor = conteudo.listas[0].itens.find((i) => i.rotulo === "Valor")!;

    expect(valor.texto).toBe("o órgão não publicou valor estimado");
    expect(emTextoSimples(conteudo)).not.toContain("R$ 0,00");
  });

  it("avisa que o valor é implausível em vez de repetir o absurdo", () => {
    const conteudo = montar([emRecife("bi", 5, { valorEstimado: 77_840_000_000, valorSuspeito: true })]);
    const valor = conteudo.listas[0].itens.find((i) => i.rotulo === "Valor")!;

    expect(valor.texto).toBe("valor publicado é implausível — confira no edital");
    expect(emTextoSimples(conteudo)).not.toContain("77.840.000.000");
  });

  it("diz quantos ficaram de fora quando corta a lista", () => {
    const editais = Array.from({ length: 8 }, (_, i) => emRecife(`e-${i}`, i + 1));
    const conteudo = montar(editais);

    expect(conteudo.fecho.join(" ")).toContain("mais 3 editais");
  });

  it("não inventa excedente quando coube tudo", () => {
    expect(montar([emRecife("a", 2)]).fecho.join(" ")).not.toContain("Havia mais");
  });

  it("repete a limitação do recorte em todo envio", () => {
    // Quem recebe há três meses já esqueceu as boas-vindas, e o recorte continua
    // sendo geográfico.
    expect(montar().fecho.join(" ")).toContain("recorte deste alerta é geográfico");
  });

  it("leva link de descadastro — é o que separa lista de denúncia de spam", () => {
    const conteudo = montar();
    expect(conteudo.rodape.descadastro).toContain("/descadastrar/?t=");
    expect(emHtml(conteudo)).toContain("Não quero mais receber");
    expect(emTextoSimples(conteudo)).toContain(conteudo.rodape.descadastro);
  });

  it("recusa seleção vazia em vez de mandar “nada por aqui”", () => {
    /*
     * A promessa das boas-vindas é que dia sem publicação é dia sem e-mail.
     * Aceitar vazio aqui daria a quem chama uma forma fácil de quebrá-la sem
     * perceber.
     */
    const vazia = selecionarParaLead([], recife, new Set(), undefined, agora);
    expect(() =>
      conteudoDeAlertaDiario({
        email: "a@b.com",
        tokenDeDescadastro: "t".repeat(30),
        regiao: "Recife",
        selecao: vazia,
      }),
    ).toThrow(/seleção vazia/i);
  });

  it("escapa o que veio do visitante antes de virar HTML", () => {
    // O e-mail e a cidade são texto de terceiro. Nenhuma camada acima valida
    // formato, e o objeto do edital vem da fonte.
    const conteudo = conteudoDeAlertaDiario({
      email: '"><script>alert(1)</script>@exemplo.com',
      tokenDeDescadastro: "t".repeat(30),
      regiao: "Recife",
      selecao: selecionarParaLead(
        [emRecife("x", 3, { objeto: "Aquisição de <script>alert(2)</script> material" })],
        recife,
        new Set(),
        undefined,
        agora,
      ),
    });

    const html = emHtml(conteudo);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("corta objeto quilométrico sem partir palavra", () => {
    const objeto = `Aquisição de ${"material hospitalar diverso ".repeat(20)}fim`;
    const conteudo = montar([emRecife("longo", 4, { objeto })]);
    const titulo = conteudo.listas[0].titulo;

    expect(titulo.length).toBeLessThanOrEqual(121);
    expect(titulo.endsWith("…")).toBe(true);

    /*
     * A propriedade é "o corte caiu numa fronteira de palavra", e ela se afirma
     * comparando com o original — não pela última letra do resultado, que é
     * sempre uma letra justamente quando o corte está CERTO.
     */
    const semReticencia = titulo.slice(0, -1);
    const normalizado = objeto.trim().replace(/\s+/g, " ");
    expect(normalizado.startsWith(semReticencia)).toBe(true);
    // O caractere seguinte no original é espaço: nenhuma palavra foi partida.
    expect(normalizado[semReticencia.length]).toBe(" ");
  });
});
