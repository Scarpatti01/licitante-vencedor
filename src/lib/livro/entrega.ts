import "server-only";

/**
 * De onde sai o livro que o comprador baixa.
 *
 * O balde `livro` é privado e não tem política nenhuma de leitura, então nem o
 * navegador nem uma chave pública chegam ao arquivo. Quem lê é este módulo, com
 * a credencial de serviço, e só depois de o chamador ter conferido a compra.
 *
 * O ARQUIVO NÃO É ENTREGUE POR URL ASSINADA, e a escolha é deliberada. Uma URL
 * assinada continua valendo pelo prazo dela mesmo que o acesso seja revogado no
 * minuto seguinte, e ainda obrigaria a guardar uma cópia carimbada por
 * comprador, que envelhece quando o livro é revisado. Entregar pela rota, com o
 * carimbo aplicado na hora, custa um pouco de processamento e dá três coisas
 * melhores: a compra é conferida a cada download, o carimbo é sempre do dono da
 * sessão, e o arquivo é sempre a edição atual.
 */

export const BALDE = "livro";

export const MESTRES = {
  pdf: {
    caminho: "mestre/workbook-do-licitante.pdf",
    tipo: "application/pdf",
    nomeParaBaixar: "Workbook do Licitante.pdf",
  },
  epub: {
    caminho: "mestre/workbook-do-licitante.epub",
    tipo: "application/epub+zip",
    nomeParaBaixar: "Workbook do Licitante.epub",
  },
} as const;

export type Formato = keyof typeof MESTRES;

export function ehFormato(bruto: string): bruto is Formato {
  return Object.hasOwn(MESTRES, bruto);
}

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

/**
 * Baixa o mestre do balde privado, ou devolve `null` sem credencial.
 *
 * `null` em vez de exceção segue a escolha de `alertas/repositorio.ts`: o
 * chamador precisa distinguir "não configurado" de "quebrou", porque a
 * mensagem que a pessoa vê é diferente nos dois casos.
 */
export async function baixarMestre(formato: Formato): Promise<Uint8Array | null> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;

  const endereco = `${url}/storage/v1/object/${BALDE}/${MESTRES[formato].caminho}`;
  const resposta = await fetch(endereco, {
    headers: { apikey: chave, authorization: `Bearer ${chave}` },
    // O livro muda raramente e é grande: deixar o Next guardar isto na memória
    // do processo entre requisições faria a função inchar sem ganho real.
    cache: "no-store",
  });

  if (!resposta.ok) {
    console.error(
      "Falha ao ler o mestre do livro no balde",
      formato,
      resposta.status,
      await resposta.text().catch(() => ""),
    );
    return null;
  }
  return new Uint8Array(await resposta.arrayBuffer());
}

/**
 * O nome do arquivo como ele chega ao computador da pessoa.
 *
 * `filename*` em UTF-8 porque o título tem espaço e acento; `filename` simples
 * fica de reserva para navegador antigo, e por isso vai sem acento.
 */
export function cabecalhoDeDownload(formato: Formato): string {
  const nome = MESTRES[formato].nomeParaBaixar;
  const simples = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `attachment; filename="${simples}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}
