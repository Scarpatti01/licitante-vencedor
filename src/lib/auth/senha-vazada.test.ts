import { describe, expect, it, vi } from "vitest";
import { contagemNaResposta, partirOHash, senhaFoiVazada } from "./senha-vazada";

/**
 * A consulta ao Pwned Passwords, exercitada sem tocar na rede.
 *
 * `senhaFoiVazada` recebe o `fetch` por parâmetro exatamente para isto: os
 * casos que importam aqui são os RUINS — serviço fora, resposta truncada,
 * padding — e nenhum deles se provoca de propósito contra o serviço real.
 */

/** Uma resposta como o serviço devolve: `SUFIXO:CONTAGEM`, uma por linha. */
function respostaCom(linhas: string[]): Response {
  return new Response(linhas.join("\r\n"), { status: 200 });
}

const SENHA_CONHECIDA = "password";
const SUFIXO_DELA = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

describe("a senha nunca sai daqui", () => {
  it("parte o hash no ponto que o protocolo define", () => {
    const { prefixo, sufixo } = partirOHash(SENHA_CONHECIDA);

    // SHA-1 de "password", conferido com node:crypto. Fixo de propósito: se
    // alguém trocar o algoritmo ou o recorte, o serviço passaria a responder
    // sobre OUTRA senha e nada mais falharia.
    expect(prefixo).toBe("5BAA6");
    expect(sufixo).toBe(SUFIXO_DELA);
    expect(prefixo).toHaveLength(5);
  });

  it("envia só o prefixo — a senha e o hash inteiro ficam aqui", async () => {
    /*
     * A senha deste teste NÃO pode ser "password".
     *
     * A primeira versão usava, e o teste falhou por um motivo que não é
     * defeito: o endereço do serviço é `api.pwnedpasswords.com`, e a palavra
     * "password" aparece dentro dele. A asserção "a URL não contém a senha"
     * acusava a própria URL.
     *
     * Uma senha que não é subsequência do endereço mede o que se quer medir.
     */
    const senha = "Jacaranda-Sem-Pressa-77";
    const sufixoDela = "EC2247041759EF6E346A6BE58B83CB0C28B";

    const buscar = vi.fn<typeof fetch>().mockResolvedValue(respostaCom([`${sufixoDela}:9`]));
    await senhaFoiVazada(senha, buscar as unknown as typeof fetch);

    const url = String(buscar.mock.calls[0][0]);

    expect(url).toContain("A9632");
    expect(url).not.toContain(senha);
    expect(url).not.toContain(sufixoDela);
  });
});

describe("a leitura da resposta", () => {
  it("reconhece a senha vazada", () => {
    expect(contagemNaResposta(`${SUFIXO_DELA}:12345`, SUFIXO_DELA)).toBe(12345);
  });

  it("ignora o padding, que vem com contagem zero", () => {
    // O caso traiçoeiro: pedimos `Add-Padding: true`, e o serviço mistura
    // sufixos FALSOS com contagem 0. Tratar "está na lista" como "vazada"
    // recusaria senha boa — raramente, sem reproduzir, e sem ninguém entender.
    const corpo = [`AAAA000000000000000000000000000000:3`, `${SUFIXO_DELA}:0`].join("\r\n");

    expect(contagemNaResposta(corpo, SUFIXO_DELA)).toBe(0);
  });

  it("devolve zero quando o sufixo não está na lista", () => {
    expect(contagemNaResposta("BBBB:7", SUFIXO_DELA)).toBe(0);
  });

  it("não quebra com linha malformada", () => {
    expect(contagemNaResposta("lixo\n\n:::\n", SUFIXO_DELA)).toBe(0);
  });
});

describe("o que acontece quando o serviço falha", () => {
  it("deixa passar quando a rede cai", async () => {
    // Falha ABERTA. Recusar cadastro porque um terceiro está fora do ar
    // transforma a indisponibilidade deles na nossa, e a pessoa leria que a
    // senha é ruim quando o problema é a nossa rede.
    const buscar = vi.fn(async () => {
      throw new Error("fetch failed");
    });

    await expect(senhaFoiVazada(SENHA_CONHECIDA, buscar as unknown as typeof fetch)).resolves.toBe(
      false,
    );
  });

  it("deixa passar quando o serviço responde erro", async () => {
    const buscar = vi.fn(async () => new Response("nope", { status: 503 }));

    await expect(senhaFoiVazada(SENHA_CONHECIDA, buscar as unknown as typeof fetch)).resolves.toBe(
      false,
    );
  });

  it("recusa quando o serviço confirma o vazamento", async () => {
    const buscar = vi.fn(async () => respostaCom([`${SUFIXO_DELA}:1128261`]));

    await expect(senhaFoiVazada(SENHA_CONHECIDA, buscar as unknown as typeof fetch)).resolves.toBe(
      true,
    );
  });

  it("pede o padding, que é o que esconde o tamanho real da resposta", async () => {
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(respostaCom([]));
    await senhaFoiVazada(SENHA_CONHECIDA, buscar as unknown as typeof fetch);

    const [, opcoes] = buscar.mock.calls[0];
    const cabecalhos = opcoes?.headers as Record<string, string>;

    expect(cabecalhos["Add-Padding"]).toBe("true");
    expect(opcoes?.signal).toBeDefined();
  });
});
