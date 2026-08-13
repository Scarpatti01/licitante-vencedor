import { Fragment, type ReactNode } from "react";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import type { BlocoDeConteudo } from "@/lib/blog/tipos";

/**
 * Renderiza o corpo de um artigo.
 *
 * O texto dos parágrafos aceita duas marcações, e só duas: `[rótulo](/destino/)`
 * e `**negrito**`. A tentação de aceitar Markdown inteiro é grande e foi
 * recusada — traria uma dependência, um sanitizador e uma superfície de erro
 * inteira para resolver um problema que dois padrões resolvem.
 *
 * O link importa mais do que parece: a malha interna entre artigo e hub é
 * metade do trabalho de SEO, e escrevê-la dentro da frase (onde o leitor já
 * está) converte muito melhor do que uma lista de "veja também" no rodapé.
 *
 * Nada aqui monta HTML por string: os nós são construídos como elementos e o
 * React escapa o conteúdo. O texto do artigo é nosso, mas essa disciplina é o
 * que permite, depois, aceitar texto que não seja.
 */

const PADRAO = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

export function textoRico(texto: string): ReactNode[] {
  const nos: ReactNode[] = [];
  let ultimo = 0;
  let chave = 0;

  for (const achado of texto.matchAll(PADRAO)) {
    const inicio = achado.index;
    if (inicio > ultimo) nos.push(texto.slice(ultimo, inicio));

    const [bruto, rotulo, destino, negrito] = achado;
    if (negrito !== undefined) {
      nos.push(
        <strong key={chave++} className="font-semibold">
          {negrito}
        </strong>,
      );
    } else {
      // Destino externo abre em nova aba e leva `rel`; interno, não. A regra é
      // uma só e fica aqui, para nenhum artigo precisar lembrar dela.
      const externo = /^https?:\/\//.test(destino);
      nos.push(
        <a
          key={chave++}
          href={destino}
          className="underline underline-offset-4"
          {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {rotulo}
        </a>,
      );
    }
    ultimo = inicio + bruto.length;
  }

  if (ultimo < texto.length) nos.push(texto.slice(ultimo));
  return nos;
}

export function Corpo({ blocos, origem }: { blocos: BlocoDeConteudo[]; origem: string }) {
  return (
    <div className="mt-10 space-y-6">
      {blocos.map((bloco, i) => (
        <Fragment key={i}>{renderizar(bloco, origem, i)}</Fragment>
      ))}
    </div>
  );
}

function renderizar(bloco: BlocoDeConteudo, origem: string, indice: number) {
  switch (bloco.tipo) {
    case "subtitulo":
      return (
        <h2
          id={ancora(bloco.texto)}
          className="scroll-mt-24 pt-6 text-2xl font-semibold tracking-tight"
        >
          {bloco.texto}
        </h2>
      );

    case "paragrafo":
      return <p className="leading-relaxed">{textoRico(bloco.texto)}</p>;

    case "destaque":
      return (
        <p className="rounded-lg border-l-4 border-l-[var(--accent)] bg-[var(--surface)] p-5 leading-relaxed">
          {textoRico(bloco.texto)}
        </p>
      );

    case "lista":
      return (
        <ul className="ml-5 list-disc space-y-2">
          {bloco.itens.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {textoRico(item)}
            </li>
          ))}
        </ul>
      );

    case "passos":
      return (
        <ol className="ml-5 list-decimal space-y-2">
          {bloco.itens.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {textoRico(item)}
            </li>
          ))}
        </ol>
      );

    case "tabela":
      return (
        // A tabela rola dentro do próprio contêiner. Sem isto, uma tabela de
        // quatro colunas empurra a largura da página inteira no celular — e
        // metade do tráfego orgânico deste assunto é celular.
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr>
                {bloco.cabecalho.map((celula, i) => (
                  <th key={i} className="border-b py-2 pr-4 text-left font-semibold">
                    {celula}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloco.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((celula, j) => (
                    <td key={j} className="border-b py-2 pr-4 align-top leading-relaxed">
                      {textoRico(celula)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "captura":
      return (
        <div className="py-4">
          <CapturaAlerta
            // A origem carrega a posição além do artigo: saber que a captura do
            // meio converte cinco vezes mais que a do fim é o tipo de coisa que
            // muda o formato de todos os textos seguintes.
            origem={`${origem}#captura-${indice}`}
            chamada={{ titulo: bloco.chamada, texto: TEXTO_DA_CAPTURA }}
            textoDoBotao="Quero receber os editais do meu ramo"
          />
        </div>
      );
  }
}

/**
 * O texto de apoio da captura é o mesmo em todo artigo, e a chamada é que muda.
 *
 * A promessa aqui precisa ser exatamente o que o produto entrega hoje. Prometer
 * a análise completa do edital, que ainda depende de leitura do documento,
 * geraria cancelamento no primeiro envio.
 */
const TEXTO_DA_CAPTURA =
  "Todo dia útil, os editais publicados no PNCP que combinam com o que a sua empresa vende — com objeto, órgão, valor, prazo e o link direto para o registro oficial. Sem garimpar portal.";

export function ancora(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
