"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buscarPracas, type PracaBuscavel } from "@/lib/busca-de-pracas";

/**
 * O campo de busca do cabeçalho.
 *
 * ## Por que a lista chega por rede, e não por propriedade
 *
 * Ela chegava por propriedade, e a decisão estava certa quando foi tomada: o
 * comentário que estava aqui falava em "~96 linhas". Importar `regioes.ts` num
 * componente de cliente arrastaria `dados/agregados.json` inteiro para o bundle,
 * então o servidor mandava só as linhas que a busca usa.
 *
 * A cobertura cresceu e ninguém remediu. Em 20/09/2026 eram 1246 praças, 147 KB
 * — 21 vezes o que o desenho supunha. Como este componente mora em
 * `Navegacao.tsx`, que é o menu de toda página, a lista ia em todo documento do
 * site E em toda resposta de prefetch de rota.
 *
 * Abrir a home baixava 1703 KB, e 1096 KB eram esta lista, seis vezes: uma no
 * documento e uma em cada um dos cinco prefetches. Sessenta e quatro por cento
 * do peso da primeira tela era a mesma lista de cidades, repetida.
 *
 * Agora ela vem de `/pracas.json` na primeira vez que alguém demonstra
 * interesse no campo, e o navegador guarda. Quem nunca usa a busca — que é a
 * maioria de quem cai numa página pela busca do Google — não baixa nada.
 *
 * ## Quando a busca dispara
 *
 * No foco E no ponteiro entrando no campo, não na primeira tecla. Entre passar
 * o mouse e digitar a segunda letra existem centenas de milissegundos, e é
 * neles que os ~45 KB comprimidos chegam. Esperar a tecla faria a primeira
 * busca de cada visita parecer travada.
 *
 * O `carregando` só aparece se a pessoa digitar antes de a lista chegar. Em
 * rede boa ninguém vê; em rede ruim é a diferença entre "está vindo" e "esta
 * busca está quebrada".
 *
 * ## Por que combobox e não `<datalist>`
 *
 * `<datalist>` é uma linha de HTML e resolveria a sugestão, mas não resolve o
 * que a busca precisa fazer: escolher um item aqui é NAVEGAR para outra página.
 * O `<datalist>` não expõe qual opção foi escolhida de forma confiável entre
 * navegadores, o que obrigaria a casar o texto de volta contra a lista e a
 * adivinhar em caso de nomes parecidos. Com um listbox próprio, cada sugestão é
 * um `<Link>` de verdade — clicável, abrível em nova aba, e visível para quem
 * navega por teclado ou leitor de tela.
 *
 * ## O vazio que explica
 *
 * A busca cobre as praças MEDIDAS, não os 5.570 municípios do país. Quem digitar
 * "Campinas" não vai achar nada, e devolver um vazio mudo faria essa pessoa
 * concluir que o site está quebrado — quando a resposta certa é "esta praça
 * ainda não foi medida". O estado vazio diz isso, e oferece o alerta, que é o
 * caminho para quem quer justamente uma praça que ainda não cobrimos.
 */

type Props = {
  /** Estreita o campo onde o cabeçalho é apertado. */
  className?: string;
};

/**
 * A promessa da busca, guardada no módulo.
 *
 * A home renderiza DOIS campos de busca: um no cabeçalho dela e outro no menu.
 * Com o estado só dentro do componente, passar o mouse por um e depois pelo
 * outro baixaria o arquivo duas vezes. Guardada aqui, a segunda chamada pega a
 * mesma promessa.
 *
 * Fica `null` de novo se a busca falhar, para uma queda de rede momentânea não
 * condenar a busca pelo resto da visita.
 */
let pedido: Promise<PracaBuscavel[]> | null = null;

function carregarPracas(): Promise<PracaBuscavel[]> {
  pedido ??= fetch("/pracas.json")
    .then((r) => {
      if (!r.ok) throw new Error(`pracas.json respondeu ${r.status}`);
      return r.json() as Promise<PracaBuscavel[]>;
    })
    .catch((erro) => {
      pedido = null;
      throw erro;
    });
  return pedido;
}

export function BuscaDePracas({ className = "" }: Props) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [pracas, setPracas] = useState<PracaBuscavel[] | null>(null);
  const [falhou, setFalhou] = useState(false);

  /*
   * Chamado no foco e no ponteiro entrando. Idempotente: `carregarPracas`
   * devolve a mesma promessa, então repetir não custa requisição.
   */
  function pedirLista() {
    if (pracas) return;
    carregarPracas().then(
      (lista) => {
        setPracas(lista);
        setFalhou(false);
      },
      () => setFalhou(true),
    );
  }
  const router = useRouter();
  const idBase = useId();
  const idDaLista = `${idBase}-lista`;
  const caixa = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => buscarPracas(pracas ?? [], texto), [pracas, texto]);

  const digitou = texto.trim().length > 0;
  const mostrarPainel = aberto && digitou;

  function fechar() {
    setAberto(false);
    setAtivo(0);
  }

  function irPara(indice: number) {
    const alvo = resultados[indice];
    if (!alvo) return;
    fechar();
    setTexto("");
    router.push(alvo.href);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      fechar();
      return;
    }

    /*
     * Enter sem nenhum resultado NÃO faz nada, de propósito. A alternativa
     * óbvia — mandar para o primeiro item de qualquer jeito — levaria quem
     * digitou "Campinas" para a página de outra cidade, que é pior que não
     * navegar: o visitante lê o nome errado e não percebe.
     */
    if (evento.key === "Enter") {
      if (resultados.length > 0) {
        evento.preventDefault();
        irPara(ativo);
      }
      return;
    }

    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;

    evento.preventDefault();
    if (resultados.length === 0) return;

    setAberto(true);
    // Circular nas duas pontas: da última desce para a primeira e da primeira
    // sobe para a última, que é o que o teclado faz em qualquer menu nativo.
    setAtivo((atual) => {
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      return (atual + passo + resultados.length) % resultados.length;
    });
  }

  return (
    <div
      ref={caixa}
      className={`relative ${className}`}
      /*
       * `onBlur` no CONTÊINER, e não no input: o clique numa sugestão tira o foco
       * do campo, e fechar no blur do input desmontaria o link antes de o clique
       * completar. `relatedTarget` diz para onde o foco foi — se foi para dentro
       * desta caixa, o painel fica.
       */
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) fechar();
      }}
    >
      <input
        type="search"
        role="combobox"
        aria-expanded={mostrarPainel}
        aria-controls={idDaLista}
        aria-autocomplete="list"
        aria-activedescendant={
          mostrarPainel && resultados.length > 0 ? `${idBase}-op-${ativo}` : undefined
        }
        aria-label="Buscar praça por cidade ou estado"
        placeholder="Cidade ou estado"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
          setAtivo(0);
        }}
        onFocus={() => {
          setAberto(true);
          pedirLista();
        }}
        onPointerEnter={pedirLista}
        onKeyDown={aoTeclar}
        /*
          `text-[var(--foreground)]` é o conserto de um defeito que a nota de
          acessibilidade quase esconde.

          O campo não declarava cor de texto e herdava a do cabeçalho da home,
          que é escuro e escreve em claro — só que o próprio campo pinta o fundo
          com `--surface`, que é claro. Resultado medido no navegador: texto em
          `#cad5e2` sobre `#f5f7fa`, contraste de 1,38:1 contra os 4,5:1 que a
          WCAG pede.

          O que torna isso pior que um número ruim: o PLACEHOLDER tinha cor
          própria e aparecia normal. O campo parecia certo até alguém digitar, e
          aí o que foi digitado sumia. Ninguém reporta um defeito assim — a
          pessoa acha que o site não funciona e vai embora.
        */
        className="w-full rounded-md border bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
      />

      {mostrarPainel ? (
        <div className="absolute right-0 z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-[var(--background)] shadow-lg">
          {falhou ? (
            /*
             * A busca depende de rede agora, e rede falha. Sem esta linha, o
             * campo devolveria "nenhuma praça com esse nome" para QUALQUER
             * busca: uma resposta que soa definitiva e está errada. Dizer o que
             * aconteceu, e dar o caminho que não depende da lista, é o que
             * separa uma falha honesta de um site que parece mentir.
             */
            <div className="px-3 py-3 text-sm text-[var(--muted)]">
              <p>Não consegui carregar a lista de praças.</p>
              <p className="mt-2">
                Tente de novo em instantes, ou{" "}
                <Link
                  href="/portais-de-licitacao/#pracas"
                  onClick={fechar}
                  className="underline underline-offset-4"
                >
                  veja todas as praças
                </Link>
                .
              </p>
            </div>
          ) : pracas === null ? (
            /*
             * Só aparece para quem digita antes de a lista chegar. Em rede boa
             * ninguém vê; em rede ruim é a diferença entre "está vindo" e "esta
             * busca está quebrada".
             */
            <p className="px-3 py-3 text-sm text-[var(--muted)]">Carregando as praças…</p>
          ) : resultados.length > 0 ? (
            <ul id={idDaLista} role="listbox" aria-label="Praças encontradas">
              {resultados.map((praca, i) => (
                <li key={praca.href} role="option" aria-selected={i === ativo}>
                  <Link
                    href={praca.href}
                    onClick={() => {
                      fechar();
                      setTexto("");
                    }}
                    onMouseEnter={() => setAtivo(i)}
                    className={`block px-3 py-2 text-sm ${
                      i === ativo ? "bg-[var(--accent-soft)]" : ""
                    }`}
                  >
                    {praca.nome}{" "}
                    <span className="text-[var(--muted)]">({praca.uf})</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            /*
             * O vazio precisa dizer o que aconteceu. Cobrimos 96 praças, não o
             * país inteiro — sem esta frase, quem procura a própria cidade e não
             * a encontra conclui que a busca está quebrada, e não que aquela
             * praça ainda não foi medida.
             */
            <div className="px-3 py-3 text-sm text-[var(--muted)]">
              <p>Nenhuma praça medida com esse nome.</p>
              <p className="mt-2">
                A busca cobre as {pracas.length} praças que já têm dado suficiente
                para uma página.{" "}
                <Link
                  href="/portais-de-licitacao/#pracas"
                  onClick={fechar}
                  className="underline underline-offset-4"
                >
                  Ver todas
                </Link>
                .
              </p>
            </div>
          )}

          {resultados.length > 0 ? (
            <div className="border-t px-3 py-2 text-xs text-[var(--muted)]">
              <Link
                href="/portais-de-licitacao/#pracas"
                onClick={fechar}
                className="underline underline-offset-4"
              >
                Ver todas as {pracas?.length ?? 0} praças
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
