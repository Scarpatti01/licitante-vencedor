import Image from "next/image";

/**
 * A faixa de procedência do rodapé: de onde vêm os dados, sob qual lei, e o que
 * lê os editais.
 *
 * ## O card que este NÃO é
 *
 * A referência que originou esta faixa trazia seis logos sob o título
 * "integrado, seguro e em conformidade com": gov.br, PNCP, ChatGPT, Oracle
 * Cloud, "Blockchain Custody" e Claude Code. Quatro eram falsos. A IA aqui é o
 * Gemini e não há uma linha de OpenAI no projeto; a hospedagem é Vercel e não
 * há Oracle em lugar nenhum; blockchain não existe no produto; e Claude Code é
 * a ferramenta com que o código é escrito, não uma integração do sistema.
 *
 * Vale mais que uma correção de fato. Quem compra isto participa de licitação:
 * lida com atesto, habilitação e fiscalização o dia inteiro, e confere o que
 * lê. Um selo que não se sustenta, quando cai, leva junto o que o site diz de
 * verdade. Fora que anunciar integração inexistente é publicidade enganosa
 * pelo art. 37 do CDC, e as marcas eram de terceiros, sem licença.
 *
 * ## Por que cada selo aqui se sustenta
 *
 * `selos-sao-verdade.test.ts` confere item por item contra o próprio código, e
 * é ele que impede a faixa de voltar a crescer com o que soa bem:
 *
 *   gov.br e PNCP  a coleta lê `pncp.gov.br` todo dia; é a fonte real.
 *   Lei 14.133     é a norma dos certames publicados, e o site tem o guia.
 *   LGPD           existe política de privacidade e rotina de retenção que
 *                  apaga decisão vencida, não só uma promessa em texto.
 *   Gemini         `lib/ia/loteGemini.ts` chama a API do Google.
 *
 * O Cloudflare fica de fora POR ENQUANTO, e a distinção importa: ele já é a
 * autoridade de DNS do domínio, mas o proxy está desligado, então a resposta
 * sai da Vercel sem passar por ele. Selo de segurança para proteção que não
 * está no caminho do tráfego seria o mesmo erro em versão menor. Quando a
 * nuvem laranja for ligada, junto do Stripe, ele entra aqui como mais um item
 * desta lista.
 *
 * ## A forma
 *
 * Cada selo leva uma linha dizendo o que ele é. Logo solto obriga o leitor a
 * adivinhar a relação, e é justamente o vazio onde o card original enfiou
 * "conformidade". Dito com todas as letras, o selo passa a informar em vez de
 * insinuar, e ainda leva para o guia da lei e para a política de privacidade,
 * que são páginas que a gente quer que sejam lidas.
 */

type Selo = {
  nome: string;
  /** O que ele é, em uma linha. Sem isto o logo insinua sem afirmar. */
  papel: string;
  href: string;
  /** `true` quando o destino é outro site, para abrir em nova aba. */
  externo?: boolean;
  marca?: {
    src: string;
    largura: number;
    altura: number;
    /**
     * O arquivo já escreve o nome da marca?
     *
     * O gov.br é um logotipo: a imagem É a palavra. O Gemini é um símbolo, a
     * estrelinha, que sozinha não se identifica para quem não convive com ela.
     * Sem esta distinção o rodapé mostrava um brilho azul sem legenda alguma.
     */
    contemNome?: boolean;
  };
};

const SELOS: Selo[] = [
  {
    nome: "gov.br",
    papel: "Dados abertos do governo federal",
    href: "https://www.gov.br/pncp/pt-br",
    externo: true,
    marca: {
      src: "/marcas/govbr.png",
      largura: 111,
      altura: 40,
      contemNome: true,
    },
  },
  {
    nome: "PNCP",
    papel: "Portal Nacional de Contratações Públicas, a fonte dos editais",
    href: "https://www.pncp.gov.br/",
    externo: true,
  },
  {
    nome: "Lei 14.133/2021",
    papel: "A norma que rege os certames publicados aqui",
    href: "/lei-14133/",
  },
  {
    nome: "LGPD",
    papel: "Política de privacidade e exclusão dos seus dados",
    href: "/privacidade/",
  },
  {
    nome: "Google Gemini",
    papel: "A inteligência artificial que lê os editais",
    href: "https://ai.google.dev/",
    externo: true,
    marca: { src: "/marcas/gemini.svg", largura: 28, altura: 28 },
  },
];

function Nome({ children }: { children: string }) {
  return (
    <span className="text-sm leading-none font-semibold whitespace-nowrap text-[var(--foreground)]">
      {children}
    </span>
  );
}

/**
 * A marca de um selo: logotipo, símbolo com nome ao lado, ou só o nome.
 *
 * Os três casos existem porque as marcas são de naturezas diferentes, e tratar
 * todas igual quebra alguma delas. PNCP, a lei e a LGPD não têm logo para
 * exibir: são nome de portal e de norma. Redesenhar um logotipo de memória
 * sairia torto e usaria marca de terceiro sem licença; citar o nome é exato e
 * não pede permissão de ninguém.
 */
function Marca({ selo }: { selo: Selo }) {
  if (!selo.marca) return <Nome>{selo.nome}</Nome>;

  const imagem = (
    <Image
      src={selo.marca.src}
      alt={selo.marca.contemNome ? selo.nome : ""}
      width={selo.marca.largura}
      height={selo.marca.altura}
      // Altura fixa e largura automática: o gov.br é deitado e o Gemini é
      // quadrado, e travar a largura esmagaria um dos dois.
      className="h-5 w-auto"
      unoptimized
    />
  );

  if (selo.marca.contemNome) {
    /*
     * Logotipo colorido ganha superfície clara no tema escuro.
     *
     * O manual do gov.br publica a versão colorida para fundo claro, e não há
     * variante negativa no tema do portal (conferido em 26/08: os caminhos de
     * negativa respondem 404). Sobre o azul-escuro do site, o azul do logotipo
     * quase some.
     *
     * Repintar marca de terceiro não é opção, porque descaracteriza o
     * logotipo. Dar a ele o fundo para o qual foi desenhado é o que o próprio
     * manual pede. No tema claro a regra não faz nada: o fundo já é branco.
     */
    return (
      <span className="dark:rounded dark:bg-white dark:px-1.5 dark:py-1">
        {imagem}
      </span>
    );
  }

  /*
   * Símbolo precisa do nome ao lado.
   *
   * A estrelinha do Gemini sozinha é um brilho azul qualquer para quem não
   * convive com ela, e foi assim que a faixa saiu na primeira montagem. O
   * `alt` da imagem fica vazio de propósito: o nome ao lado já é o texto que o
   * leitor de tela anuncia, e repetir viraria eco.
   */
  return (
    <span className="flex items-center gap-1.5">
      {imagem}
      <Nome>{selo.nome}</Nome>
    </span>
  );
}

export function SelosDeConfianca() {
  return (
    <section
      aria-labelledby="procedencia"
      className="mt-10 border-t pt-8"
    >
      <h2
        id="procedencia"
        className="text-xs font-semibold tracking-wide uppercase"
      >
        Fonte oficial, base legal e tecnologia
      </h2>

      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
        {SELOS.map((selo) => (
          <li key={selo.nome}>
            <a
              href={selo.href}
              {...(selo.externo
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="group block"
            >
              {/*
                Altura fixa na linha da marca, e não `items-center` solto: os
                logotipos têm alturas diferentes, e sem a régua as frases de
                baixo começavam em alturas diferentes em cada coluna.
              */}
              <span className="flex h-5 items-center">
                <Marca selo={selo} />
              </span>
              <span className="mt-2 block text-xs leading-snug group-hover:text-[var(--foreground)]">
                {selo.papel}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
