import { describe, expect, it, vi } from "vitest";

import { REMETENTE_PADRAO, remetente } from "./tipos.ts";
import { CONTATO, SITE } from "../site.ts";

/**
 * O remetente é o canal que o site publica, e mora no nosso domínio.
 *
 * ## AS DUAS REGRAS, E POR QUE NENHUMA ERA COBRADA
 *
 * A primeira já estava escrita como comentário desde que a camada nasceu:
 * remetente nunca pode ser `@gmail.com`, porque além de não autenticar por
 * SPF/DKIM o Gmail rejeita quem se passa por ele, e o e-mail não chega. Regra
 * em comentário não reprova ninguém.
 *
 * A segunda nasceu em 09/09. O remetente era `alertas@`, literal, e o site
 * publica `CONTATO.email` como o canal para falar com a gente, inclusive para
 * pedido de titular de dados. Eram dois endereços diferentes, e quem
 * respondesse um e-mail nosso escrevia para uma caixa que ninguém prometeu ler.
 *
 * Agora o remetente É o contato publicado, e esta guarda é o que impede os dois
 * de voltarem a divergir: quem trocar um sem o outro reprova aqui.
 *
 * ## O QUE ELA NÃO ALCANÇA
 *
 * `EMAIL_REMETENTE` é lido em tempo de execução, e nenhum teste vê o ambiente
 * de produção. O que dá para cobrar é que a variável, QUANDO existe, é
 * respeitada, e que na ausência dela o padrão é são. Conferido em 09/09 no
 * próprio Resend: o `From` real dos e-mails entregues era exatamente
 * `REMETENTE_PADRAO`, ou seja, não há sobreposição em produção.
 */

const PROVEDORES_LIVRES = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "uol.com.br"];

function enderecoDe(remetenteCompleto: string): string {
  const casado = remetenteCompleto.match(/<([^>]+)>/);
  return (casado ? casado[1] : remetenteCompleto).trim().toLowerCase();
}

describe("o remetente padrão", () => {
  it("é o mesmo canal que o site publica", () => {
    expect(
      enderecoDe(REMETENTE_PADRAO),
      "quem responder um e-mail nosso tem de cair na caixa que o rodapé, a " +
        "privacidade e os termos anunciam. Dois endereços é a chance de alguém " +
        "trocar um e esquecer o outro.",
    ).toBe(CONTATO.email.toLowerCase());
  });

  it("mora no domínio do site, e nunca num provedor gratuito", () => {
    const dominio = enderecoDe(REMETENTE_PADRAO).split("@")[1];

    expect(
      PROVEDORES_LIVRES,
      "remetente em provedor gratuito não autentica por SPF/DKIM, e o próprio " +
        "provedor rejeita quem se passa por ele: o e-mail não chega.",
    ).not.toContain(dominio);

    expect(dominio).toBe(new URL(SITE.url).hostname.replace(/^www\./, ""));
  });

  it("leva o nome do site antes do endereço", () => {
    // Sem nome, o cliente de e-mail mostra o endereço cru na caixa de entrada.
    expect(REMETENTE_PADRAO).toBe(`${SITE.name} <${CONTATO.email}>`);
  });
});

describe("EMAIL_REMETENTE", () => {
  it("sobrepõe o padrão quando existe", () => {
    vi.stubEnv("EMAIL_REMETENTE", "Outro <outro@licitantevencedor.com.br>");
    expect(remetente()).toBe("Outro <outro@licitantevencedor.com.br>");
    vi.unstubAllEnvs();
  });

  it("vazio ou só espaço cai no padrão, e não manda e-mail sem remetente", () => {
    vi.stubEnv("EMAIL_REMETENTE", "   ");
    expect(remetente()).toBe(REMETENTE_PADRAO);
    vi.unstubAllEnvs();
  });
});
