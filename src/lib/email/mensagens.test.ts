import { describe, expect, it } from "vitest";
import {
  conteudoDeBoasVindas,
  conteudoDeConfirmacao,
  emHtml,
  emTextoSimples,
  mensagemDeBoasVindas,
  mensagemDeConfirmacao,
  urlDeDescadastro,
  type ConteudoDeEmail,
} from "./mensagens";
import { SITE } from "../site";
import { DIAS_DE_TESTE } from "../assinatura/teste";

const CONFIRMACAO = {
  email: "compras@fornecedora.com.br",
  linkDeConfirmacao: `${SITE.url}/confirmar/?t=abc123`,
  tokenDeDescadastro: "des-123",
  cidade: "Recife",
};

const BOAS_VINDAS = {
  email: "compras@fornecedora.com.br",
  tokenDeDescadastro: "des-123",
  cidade: "Recife",
};

/** As duas mensagens, nos dois formatos. É o universo que as regras cobrem. */
function todosOsTextos(): { nome: string; texto: string }[] {
  const conteudos: [string, ConteudoDeEmail][] = [
    ["confirmação", conteudoDeConfirmacao(CONFIRMACAO)],
    ["boas-vindas", conteudoDeBoasVindas(BOAS_VINDAS)],
  ];
  return conteudos.flatMap(([nome, c]) => [
    { nome: `${nome} (texto)`, texto: emTextoSimples(c) },
    { nome: `${nome} (html)`, texto: emHtml(c) },
  ]);
}

describe("promessa de resultado", () => {
  /*
   * A lista vem de `docs/produto/posicionamento-e-limites.md` e do briefing:
   * são as frases que transformam triagem em aposta. O teste é a rede que pega
   * a reescrita bem-intencionada de copy meses depois, quando ninguém lembrar
   * que a regra existe.
   */
  const PROIBIDO =
    /chance de (vit[óo]ria|ganhar)|probabilidade de ganhar|voc[êe] vai ganhar|garantimos|garantia de (vit[óo]ria|habilita[çc][ãa]o)|aprova[çc][ãa]o garantida|n[ãa]o perca (mais )?(nenhuma|mais uma) licita[çc][ãa]o|an[áa]lise jur[íi]dica/i;

  for (const { nome, texto } of todosOsTextos()) {
    it(`não promete resultado em ${nome}`, () => {
      expect(texto).not.toMatch(PROIBIDO);
    });
  }
});

describe("rodapé", () => {
  for (const { nome, texto } of todosOsTextos()) {
    it(`${nome} carrega link de descadastro`, () => {
      expect(texto).toContain(`${SITE.url}/descadastrar/?t=des-123`);
    });

    it(`${nome} repete os limites do produto`, () => {
      expect(texto).toMatch(/triagem operacional/i);
      expect(texto).toMatch(/não é parecer jurídico/i);
      expect(texto).toMatch(/prevalece/i);
    });

    it(`${nome} diz qual endereço está cadastrado`, () => {
      expect(texto).toContain("compras@fornecedora.com.br");
    });
  }

  it("codifica o token na URL — token não é texto seguro por natureza", () => {
    expect(urlDeDescadastro("a+b/c=")).toBe(`${SITE.url}/descadastrar/?t=a%2Bb%2Fc%3D`);
  });

  it("aceita outra base, para ambiente de teste não mandar link de produção", () => {
    expect(urlDeDescadastro("x", "https://previa.exemplo")).toBe(
      "https://previa.exemplo/descadastrar/?t=x",
    );
  });
});

describe("confirmação (double opt-in)", () => {
  it("traz o link de confirmação recebido por parâmetro, no botão e em texto", () => {
    const c = conteudoDeConfirmacao(CONFIRMACAO);
    expect(c.acao?.url).toBe(CONFIRMACAO.linkDeConfirmacao);
    expect(emTextoSimples(c)).toContain(CONFIRMACAO.linkDeConfirmacao);
    expect(emHtml(c)).toContain(`href="${CONFIRMACAO.linkDeConfirmacao}"`);
  });

  it("diz o que a pessoa vai receber, e quando", () => {
    const texto = emTextoSimples(conteudoDeConfirmacao(CONFIRMACAO));
    expect(texto).toMatch(/editais de Recife/i);
    expect(texto).toMatch(/dias úteis/i);
    expect(texto).toMatch(/manhã/i);
  });

  it("avisa que sem clicar não chega nada", () => {
    for (const t of [
      emTextoSimples(conteudoDeConfirmacao(CONFIRMACAO)),
      emHtml(conteudoDeConfirmacao(CONFIRMACAO)),
    ]) {
      expect(t).toMatch(/enquanto você não clicar, não enviamos nada/i);
      expect(t).toMatch(/não foi você quem pediu/i);
    }
  });

  it("é curta: não carrega as listas da boas-vindas", () => {
    expect(conteudoDeConfirmacao(CONFIRMACAO).listas).toHaveLength(0);
  });

  it("sem cidade, fala da região em vez de inventar um município", () => {
    const texto = emTextoSimples(conteudoDeConfirmacao({ ...CONFIRMACAO, cidade: null }));
    expect(texto).toMatch(/da sua região/i);
    expect(texto).not.toContain("de null");
  });
});

describe("boas-vindas", () => {
  const conteudo = conteudoDeBoasVindas(BOAS_VINDAS);
  const texto = emTextoSimples(conteudo);
  const html = emHtml(conteudo);

  /*
   * As guardas deste bloco mudaram de assunto em 25/08, e nenhuma foi apagada.
   *
   * O e-mail deixou de ser "bem-vindo ao alerta gratuito diário" e virou
   * "comece o teste de catorze dias". Cada uma destas guardava uma lição sobre
   * o que um e-mail de boas-vindas deve ao leitor, e as lições não mudaram com
   * a mudança da oferta: dizer quando chega, dizer o que chega, não inventar
   * número onde falta dado, e declarar o que o produto NÃO faz. O que mudou foi
   * o produto sobre o qual elas falam.
   *
   * Apagar em bloco teria sido mais rápido, e teria perdido o motivo de cada
   * uma existir.
   */
  it("diz quando o resumo chega", () => {
    for (const t of [texto, html]) {
      expect(t).toMatch(/dias úteis/i);
      expect(t).toMatch(/manhã/i);
      // A regra que mais gera dúvida no suporte: dia sem edital é dia sem
      // e-mail, e quem não sabe disso acha que o produto quebrou.
      expect(t).toMatch(/silêncio no dia em que não houver edital novo/i);
    }
  });

  it("lista o que vem em cada edital, com os rótulos que o resumo usa", () => {
    /*
     * Os rótulos são conferidos contra `resumo/plano.ts`, e não digitados aqui
     * de memória: prometer "nota de combinação" e entregar "Aderência" obriga o
     * leitor a traduzir, e a tradução é onde ele desiste. Se alguém renomear um
     * rótulo lá, esta guarda cobra a promessa aqui.
     */
    for (const t of [texto, html]) {
      expect(t).toMatch(/Aderência/);
      expect(t).toMatch(/Órgão/);
      expect(t).toMatch(/Valor/);
      expect(t).toMatch(/Prazo/);
      expect(t).toMatch(/Edital/);
    }
  });

  it("não converte valor ausente em zero — nem na promessa do que vai chegar", () => {
    /*
     * A lição sobrevive à troca de produto, e ela é a mais cara deste arquivo:
     * boa parte dos editais do PNCP sai sem valor estimado, e "R$ 0,00" no
     * lugar do que falta faz o assinante descartar oportunidade boa achando que
     * é migalha.
     *
     * A guarda no lugar onde a linha é MONTADA está em `resumo/plano.test.ts`.
     * Ela não existia até hoje: a única cobrança do princípio vivia nos testes
     * do alerta gratuito, que é justamente o que acabou.
     */
    for (const t of [texto, html]) {
      expect(t).toMatch(/quando o órgão não publica/i);
      expect(t).toMatch(/nunca R\$ 0,00/i);
    }
  });

  /*
   * O teste que mais importa deste arquivo. Preferimos perder um cadastro a
   * conquistá-lo por omissão: se alguém "limpar" a boas-vindas tirando o bloco
   * do que este alerta não faz, o cadastro passa a ser conquistado com o
   * assinante acreditando em um filtro que não roda para ele.
   */
  it("declara, com todas as letras, o que o teste NÃO faz", () => {
    /*
     * A redação mudou duas vezes, e o que ela guarda nunca mudou.
     *
     * Em 21/08, de "o que ainda NÃO está no ar" para "o que este alerta
     * gratuito NÃO faz". Em 25/08, para "o que o teste NÃO faz", quando o
     * alerta gratuito acabou. Em todas as versões a divulgação é a mesma:
     * preferimos perder um cadastro a conquistá-lo por omissão. Quem descobre a
     * limitação depois de investir tempo pede reembolso; quem descobre antes
     * decide com informação.
     */
    for (const t of [texto, html]) {
      expect(t).toMatch(/NÃO faz/);
      expect(t).toMatch(/leitura do documento/i);
      expect(t).toMatch(/não abrimos o arquivo do edital/i);
      expect(t).toMatch(/garantia de resultado/i);
    }
  });

  it("o teste NUNCA promete a leitura do documento", () => {
    /*
     * Esta guarda inverteu de sentido, e ficou mais dura.
     *
     * Antes: o alerta gratuito não lê, mas quem cadastra a empresa recebe o
     * documento lido — as duas frases tinham de conviver. Agora o teste roda no
     * plano Leve (`assinatura/teste.ts`), que também não lê. Prometer leitura
     * em qualquer canto deste e-mail seria vender por catorze dias um produto
     * que some no dia em que a assinatura de R$ 59 começa.
     *
     * Por isso a afirmação virou negativa: não é mais "diga as duas coisas", é
     * "não diga a primeira". Guarda de ausência é frágil por natureza, e por
     * isso ela vem acompanhada da positiva acima, que exige a negação escrita.
     */
    for (const t of [texto, html]) {
      expect(t).not.toMatch(/chegam com o documento lido/i);
      expect(t).not.toMatch(/lemos o edital/i);
      expect(t).not.toMatch(/acesso completo/i);
    }
  });

  it("pede uma ação, e é a única — a inversão de 25/08", () => {
    /*
     * Aqui havia `expect(conteudo.acao).toBeNull()`, com o comentário "quem
     * chegou aqui já confirmou". Estava certo enquanto a confirmação do e-mail
     * era o fim do caminho: o alerta passava a chegar sozinho, e um botão seria
     * anúncio no lugar de uma boa notícia.
     *
     * Com o alerta gratuito extinto, a confirmação virou meio do caminho. Não
     * há nada para receber até a empresa existir, e um e-mail que não diz para
     * onde ir deixa a pessoa esperando um resumo que nunca vem. A inversão é
     * deliberada, e fica escrita para não parecer descuido de quem passar aqui
     * depois.
     */
    expect(conteudo.acao).not.toBeNull();
    expect(conteudo.acao?.url).toContain("/criar-conta/");
    expect(conteudo.acao?.rotulo).toMatch(new RegExp(`${DIAS_DE_TESTE}`));

    // Uma só. Duas chamadas competindo dividem o clique e nenhuma ganha.
    const botoes = html.match(/<a [^>]*background/g) ?? [];
    expect(botoes).toHaveLength(1);
  });
});

describe("HTML e texto saem da mesma estrutura", () => {
  it("o assunto é um só", () => {
    const c = conteudoDeBoasVindas(BOAS_VINDAS);
    const m = mensagemDeBoasVindas(BOAS_VINDAS);
    expect(m.assunto).toBe(c.assunto);
    expect(m.html).toBe(emHtml(c));
    expect(m.texto).toBe(emTextoSimples(c));
    expect(m.para).toBe(BOAS_VINDAS.email);
  });

  it("todo item de lista aparece nos dois formatos", () => {
    const c = conteudoDeBoasVindas(BOAS_VINDAS);
    const texto = emTextoSimples(c);
    const html = emHtml(c);
    for (const lista of c.listas) {
      for (const item of lista.itens) {
        expect(texto).toContain(item.rotulo);
        expect(html).toContain(item.rotulo);
      }
    }
  });

  it("a confirmação também", () => {
    const c = conteudoDeConfirmacao(CONFIRMACAO);
    const m = mensagemDeConfirmacao(CONFIRMACAO);
    expect(m.assunto).toBe(c.assunto);
    expect(m.html).toBe(emHtml(c));
    expect(m.texto).toBe(emTextoSimples(c));
    expect(m.para).toBe(CONFIRMACAO.email);
  });
});

describe("HTML de e-mail", () => {
  /*
   * Mesmo precedente de `alertas/alertas.test.ts`: o e-mail e a cidade vêm de um
   * formulário público, e nenhuma camada acima valida o formato deles. Sem
   * escape, o que a pessoa digitar vira marcação na caixa de entrada dela — e o
   * conteúdo é reenviado por quem encaminha o e-mail.
   */
  it("escapa o e-mail do destinatário", () => {
    const html = emHtml(
      conteudoDeBoasVindas({ ...BOAS_VINDAS, email: 'x<script>alert("1")</script>@e.com' }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapa a cidade que o visitante digitou", () => {
    const html = emHtml(conteudoDeBoasVindas({ ...BOAS_VINDAS, cidade: "Recife & <b>região</b>" }));
    expect(html).not.toContain("<b>região</b>");
    expect(html).toContain("&amp;");
    expect(html).toContain("&lt;b&gt;");
  });

  // Aspa crua no href fecha o atributo e o que sobra vira atributo de evento.
  // Vale para os dois tokens: nenhum deles é gerado aqui.
  it("escapa os links, que carregam token vindo de fora", () => {
    const html = emHtml(
      conteudoDeConfirmacao({
        ...CONFIRMACAO,
        linkDeConfirmacao: 'https://x/?t=a" onmouseover="alert(1)',
        tokenDeDescadastro: 'a" onmouseover="alert(1)',
      }),
    );
    expect(html).not.toMatch(/onmouseover="/);
    expect(html).toContain("&quot; onmouseover=&quot;alert(1)");
  });

  it("não usa classe nem folha de estilo — o Outlook descarta as duas", () => {
    for (const { nome, texto } of todosOsTextos().filter((t) => t.nome.includes("html"))) {
      expect(texto, nome).not.toContain("<style");
      expect(texto, nome).not.toMatch(/\sclass=/);
      expect(texto, nome).toContain('style="');
    }
  });
});
