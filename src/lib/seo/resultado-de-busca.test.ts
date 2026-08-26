import { describe, expect, it } from "vitest";

import {
  conferirDescricao,
  conferirTitulo,
  promessaDoTitulo,
  limitarDescricao,
  TETO_DA_DESCRICAO,
  TETO_DO_TITULO,
  ORCAMENTO_DO_TITULO,
  SUFIXO_DA_MARCA,
  tituloRenderizado,
} from "./resultado-de-busca.ts";

const regras = (falhas: { regra: string }[]) => falhas.map((f) => f.regra);

describe("promessaDoTitulo", () => {
  it("devolve o trecho depois dos dois pontos", () => {
    expect(promessaDoTitulo("Contrato administrativo: o guia do fornecedor")).toBe(
      "o guia do fornecedor",
    );
  });

  it("devolve null quando não há dois pontos", () => {
    expect(promessaDoTitulo("Guias e artigos sobre licitações públicas")).toBeNull();
  });

  it("corta no PRIMEIRO dois pontos, não no último", () => {
    // "Lei 14.133/2021: modalidades: o que muda" tem dois. A promessa é o que
    // vem logo depois do primeiro, que é onde o olho vai.
    expect(promessaDoTitulo("Lei 14.133/2021: modalidades: o que muda")).toBe(
      "modalidades: o que muda",
    );
  });
});

describe("conferirTitulo", () => {
  /*
   * As amostras deste arquivo encolheram em 26/08, junto com os títulos reais.
   *
   * A régua passou a medir o título COM a marca que o layout acrescenta, e o
   * orçamento do título cru caiu de 70 para 49. Estas duas amostras eram cópias
   * de títulos de páginas de verdade, e as páginas foram encurtadas na mesma
   * mudança: manter aqui a versão longa seria testar contra um site que não
   * existe mais.
   */
  it("aprova um título que responde", () => {
    expect(
      conferirTitulo("Contrato administrativo: prazo, aditivo e sanções"),
    ).toEqual([]);
  });

  it("reprova método logo depois dos dois pontos", () => {
    expect(regras(conferirTitulo("Contrato administrativo: o guia do fornecedor"))).toContain(
      "metodo-na-promessa",
    );
  });

  it("reprova com ou sem artigo antes da palavra de método", () => {
    // "o guia do fornecedor" e "guia do fornecedor" são o mesmo defeito.
    expect(regras(conferirTitulo("X: guia do fornecedor"))).toContain("metodo-na-promessa");
    expect(regras(conferirTitulo("X: o guia do fornecedor"))).toContain("metodo-na-promessa");
  });

  it("NÃO reprova palavra de método fora do lugar da promessa", () => {
    // Esta é a regra que impede a guarda de virar chatice. "Guias e artigos
    // sobre licitações públicas" é o nome honesto de uma página de índice: a
    // página É uma lista de guias. Reprovar isso seria a régua atrapalhando.
    expect(conferirTitulo("Guias e artigos sobre licitações públicas")).toEqual([]);
    // E "guia" no meio da promessa também não é o defeito: o defeito é ela
    // ABRIR com formato.
    expect(conferirTitulo("Portais de licitação: onde o edital sai")).toEqual(
      [],
    );
  });

  it("reprova a marca repetida, que o template já acrescenta", () => {
    expect(regras(conferirTitulo("Criar conta | Licitante Vencedor"))).toContain(
      "marca-duplicada",
    );
  });

  it("reprova título acima do teto", () => {
    const longo = "Jurisprudência em licitações: como as decisões do TCU e dos tribunais definem o que é exigível de você";
    expect(longo.length).toBeGreaterThan(TETO_DO_TITULO);
    expect(regras(conferirTitulo(longo))).toContain("longo-demais");
  });

  it("junta as falhas em vez de parar na primeira", () => {
    // Quem está consertando quer a lista inteira de uma vez.
    const ruim = `Lei 14.133/2021: o guia da Nova Lei de Licitações para quem vende ao governo federal | Licitante Vencedor`;
    expect(regras(conferirTitulo(ruim)).sort()).toEqual([
      "longo-demais",
      "marca-duplicada",
      "metodo-na-promessa",
    ]);
  });

  it("reprova título vazio", () => {
    expect(regras(conferirTitulo("   "))).toEqual(["vazio"]);
  });
});

describe("conferirDescricao", () => {
  it("aprova uma descrição que abre pela resposta e cabe no corte", () => {
    expect(
      conferirDescricao(
        "Prazo e prorrogação, aditivo de 25%, reajuste, repactuação, reequilíbrio, garantia, pagamento em ordem cronológica e sanções na Lei 14.133.",
      ),
    ).toEqual([]);
  });

  it("reprova descrição que abre por formato", () => {
    expect(
      regras(
        conferirDescricao(
          "Guia prático do contrato administrativo na Lei 14.133/2021 para fornecedores.",
        ),
      ),
    ).toContain("metodo-na-abertura");
  });

  it("reprova descrição que o Google vai truncar", () => {
    const longa = "x".repeat(TETO_DA_DESCRICAO + 1);
    expect(regras(conferirDescricao(longa))).toContain("longa-demais");
  });

  it("aceita exatamente no teto", () => {
    // O limite é onde corta, não onde começa a incomodar: 155 passa, 156 não.
    expect(conferirDescricao("x".repeat(TETO_DA_DESCRICAO))).toEqual([]);
  });

  it("reprova descrição vazia", () => {
    expect(regras(conferirDescricao(""))).toEqual(["vazio"]);
  });
});

describe("limitarDescricao", () => {
  it("devolve intacto o que já cabe", () => {
    const cabe = "Prazo, aditivo de 25%, reajuste e sanções na Lei 14.133.";
    expect(limitarDescricao(cabe)).toBe(cabe);
  });

  it("corta na fronteira de palavra, nunca no meio dela", () => {
    const longa = `${"palavra ".repeat(30)}fim`;
    const cortada = limitarDescricao(longa);
    expect(cortada.length).toBeLessThanOrEqual(TETO_DA_DESCRICAO);
    // O defeito que isto substitui era `.slice(0, 160)`, que devolvia "palav".
    expect(cortada.endsWith("palavra")).toBe(true);
  });

  it("não deixa a frase pendurada em vírgula ou dois pontos", () => {
    const longa = `${"item, ".repeat(40)}fim`;
    expect(limitarDescricao(longa)).not.toMatch(/[,;:]$/u);
  });

  it("não acrescenta reticências, porque o Google põe as dele", () => {
    expect(limitarDescricao("x ".repeat(200))).not.toContain("…");
    expect(limitarDescricao("x ".repeat(200))).not.toContain("...");
  });

  it("corta seco quando não há espaço nenhum, em vez de estourar o teto", () => {
    // Uma URL gigante colada na descrição. Devolver inteiro seria estourar em
    // silêncio, que é justamente o que a régua existe para impedir.
    const semEspaco = "a".repeat(300);
    expect(limitarDescricao(semEspaco).length).toBe(TETO_DA_DESCRICAO);
  });

  it("o resultado sempre passa na própria régua de tamanho", () => {
    for (const bruto of ["curta", "y ".repeat(500), "z".repeat(400), " espaços   demais  "]) {
      expect(limitarDescricao(bruto).length).toBeLessThanOrEqual(TETO_DA_DESCRICAO);
    }
  });
});

describe("a régua mede o título COM a marca, que é como ele chega à busca", () => {
  /*
   * A guarda que existe por causa de 1.026 páginas.
   *
   * Esta régua nasceu comparando 70 com o título CRU. O layout acrescenta
   * ` | Licitante Vencedor` depois, e ninguém tinha descontado: um título de 55
   * passava e chegava ao Google com 76. O relatório do Ahrefs de 26/08 contou
   * 1.028 páginas com título longo, de 1.071 analisadas. Nenhum teste tinha
   * reclamado, porque todos mediam a string errada.
   *
   * Se alguém voltar a medir o cru, o site inteiro volta a estourar em silêncio.
   */
  it("o orçamento do cru é o teto menos a marca", () => {
    expect(ORCAMENTO_DO_TITULO).toBe(TETO_DO_TITULO - SUFIXO_DA_MARCA.length);
    expect(ORCAMENTO_DO_TITULO).toBe(49);
  });

  it("reprova o título que só estoura DEPOIS da marca", () => {
    /*
     * O caso exato que passava antes: 59 caracteres crus, 80 renderizados. É o
     * título que `/alerta-de-licitacao/` tinha até 26/08.
     */
    const cru = "Alerta de licitação: os editais da sua cidade no seu e-mail";
    expect(cru.length).toBeLessThanOrEqual(TETO_DO_TITULO);
    expect(cru.length).toBeGreaterThan(ORCAMENTO_DO_TITULO);

    const falhas = conferirTitulo(cru);
    expect(falhas.map((f) => f.regra)).toContain("longo-demais");
  });

  it("a explicação diz os dois números, para o conserto ser óbvio", () => {
    // "80 caracteres" sozinho manda cortar 10; o que precisa cortar são 10 do
    // CRU, e o autor não vê a marca em lugar nenhum do arquivo dele.
    const [falha] = conferirTitulo("Alerta de licitação: os editais da sua cidade no seu e-mail");
    expect(falha.explicacao).toContain("80");
    expect(falha.explicacao).toContain("59");
    expect(falha.explicacao).toContain(String(ORCAMENTO_DO_TITULO));
  });

  it("quem já traz a marca não ganha outra na conta", () => {
    // Senão a mensagem acusaria um tamanho que não corresponde a página nenhuma,
    // e a falha de marca duplicada já é reportada à parte.
    const comMarca = "Página qualquer | Licitante Vencedor";
    expect(tituloRenderizado(comMarca)).toBe(comMarca);
  });
});
