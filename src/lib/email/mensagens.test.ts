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

  it("diz quando os alertas chegam", () => {
    for (const t of [texto, html]) {
      expect(t).toMatch(/dias úteis/i);
      expect(t).toMatch(/manhã/i);
    }
  });

  it("lista o que vem em cada alerta", () => {
    for (const t of [texto, html]) {
      expect(t).toMatch(/Objeto/);
      expect(t).toMatch(/Órgão/);
      expect(t).toMatch(/Valor/);
      expect(t).toMatch(/Prazo/);
      expect(t).toMatch(/Link oficial/);
    }
  });

  it("não converte valor ausente em zero — nem na promessa do que vai chegar", () => {
    expect(texto).toMatch(/quando o órgão não publica/i);
    expect(texto).toMatch(/nunca mostra R\$ 0,00/i);
  });

  /*
   * O teste que mais importa deste arquivo. Preferimos perder um cadastro a
   * conquistá-lo por omissão: se alguém "limpar" a boas-vindas tirando o bloco
   * do que ainda não existe, o cadastro passa a ser conquistado com o assinante
   * acreditando em um filtro que não roda.
   */
  it("declara, com todas as letras, o que ainda NÃO está no ar", () => {
    for (const t of [texto, html]) {
      expect(t).toMatch(/ainda NÃO está no ar/);
      expect(t).toMatch(/filtro fino por perfil/i);
      expect(t).toMatch(/ainda não filtramos por CNAE/i);
      expect(t).toMatch(/vai chegar edital que não serve para você/i);
      expect(t).toMatch(/leitura do edital em profundidade/i);
      expect(t).toMatch(/ainda não lemos o texto integral nem os anexos/i);
    }
  });

  it("não pede ação: quem chegou aqui já confirmou", () => {
    expect(conteudo.acao).toBeNull();
    expect(html).not.toContain("<a href=\"https://licitantevencedor.com.br/confirmar");
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
