import { describe, expect, it } from "vitest";

import {
  conteudoDeBoasVindas,
  conteudoDeConfirmacao,
  conteudoDoConvite,
  emHtml,
  emTextoSimples,
  urlDeCriarConta,
} from "./mensagens.ts";

/**
 * O descadastro é opcional no TIPO, e obrigatório em toda mensagem de lista.
 *
 * ## POR QUE ESTA GUARDA NASCEU
 *
 * `rodape.descadastro` era obrigatório, e passou a ser opcional em 09/09 para o
 * convite de compra, que é transacional: ninguém se descadastra da própria
 * compra, e o comprador pode nem estar em lista nenhuma, então não haveria
 * token para gerar o link.
 *
 * Abrir a exceção no tipo abre a exceção para TODAS as mensagens, inclusive as
 * de lista, onde o link é o que separa uma lista de uma denúncia de spam. E
 * denúncia de spam não pune só a mensagem: derruba a entrega dos e-mails de
 * todos os outros assinantes, inclusive os que querem receber.
 *
 * Então o que o tipo deixou de exigir, esta guarda exige. Ela lista as
 * mensagens de lista pelo nome, de propósito: quem acrescentar uma quarta
 * decide conscientemente de que lado ela fica.
 */

const DE_LISTA = [
  {
    nome: "confirmação",
    conteudo: conteudoDeConfirmacao({
      email: "quem@exemplo.com",
      linkDeConfirmacao: "https://exemplo.com/confirmar/?t=abc",
      tokenDeDescadastro: "tok",
    }),
  },
  {
    nome: "boas-vindas",
    conteudo: conteudoDeBoasVindas({ email: "quem@exemplo.com", tokenDeDescadastro: "tok" }),
  },
];

describe("mensagem de lista", () => {
  for (const { nome, conteudo } of DE_LISTA) {
    it(`${nome} carrega o link de descadastro nos dois formatos`, () => {
      expect(
        conteudo.rodape.descadastro,
        "mensagem de lista sem saída é o caminho mais curto para a denúncia de " +
          "spam, e a denúncia derruba a entrega de todos os outros assinantes.",
      ).toBeTruthy();

      expect(emTextoSimples(conteudo)).toContain(conteudo.rodape.descadastro);
      expect(emHtml(conteudo)).toContain(conteudo.rodape.descadastro);
    });
  }
});

describe("convite de compra", () => {
  const conteudo = conteudoDoConvite({ email: "comprou@exemplo.com" });

  it("não oferece descadastro, porque não é lista", () => {
    expect(conteudo.rodape.descadastro).toBeUndefined();
    expect(emTextoSimples(conteudo)).not.toContain("Para não receber mais");
    expect(emHtml(conteudo)).not.toContain("Não quero mais receber");
  });

  it("sem descadastro, o rodapé ainda diz por que a pessoa recebeu", () => {
    // A frase padrão fala em cadastro no alerta, e seria falsa aqui. Some junto
    // com o link, e o comprador ficaria sem saber de onde veio a mensagem.
    for (const formato of [emTextoSimples(conteudo), emHtml(conteudo)]) {
      expect(formato).toContain("porque comprou o Workbook do Licitante");
    }
  });

  it("leva o e-mail no link e escrito no corpo", () => {
    /*
     * Os dois, e não só o link. Criar a conta com outro endereço é o jeito mais
     * provável de alguém pagar e não conseguir entrar, e quem abre no celular
     * não vê para onde o botão aponta.
     */
    const texto = emTextoSimples(conteudo);
    expect(texto).toContain(urlDeCriarConta("comprou@exemplo.com"));
    expect(
      texto.replace(urlDeCriarConta("comprou@exemplo.com"), ""),
      "o endereço precisa aparecer em letra, fora do link, senão quem abre no " +
        "celular só descobre que errou depois de criar a conta.",
    ).toContain("comprou@exemplo.com");
  });

  it("não repete a entrega do livro, que é da Hotmart", () => {
    // Competir com o e-mail dela pelo mesmo clique deslocaria o assunto deste,
    // que é a Jornada precisar de conta.
    expect(conteudo.acao?.url).toContain("/criar-conta/");
    expect(emTextoSimples(conteudo)).toContain("Hotmart");
  });

  it("escapa o e-mail no link, senão um endereço com `&` quebra a URL", () => {
    const url = urlDeCriarConta("a+b&c@exemplo.com");
    expect(url).toContain("a%2Bb%26c%40exemplo.com");
  });
});
