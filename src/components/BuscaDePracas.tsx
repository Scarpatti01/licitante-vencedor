"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buscarPracas, type PracaBuscavel } from "@/lib/busca-de-pracas";

/**
 * O campo de busca do cabeçalho.
 *
 * ## Por que a lista chega por propriedade
 *
 * Este é um componente de cliente, e importar `regioes.ts` aqui arrastaria
 * `dados/agregados.json` — 100 KB, 576 municípios — para o bundle do navegador
 * em toda página do site. Quem monta a lista é o servidor, que já tem o arquivo
 * carregado, e manda só as ~96 linhas que a busca usa. O motivo completo está em
 * `pracasParaBusca`.
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
  pracas: PracaBuscavel[];
  /** Estreita o campo onde o cabeçalho é apertado. */
  className?: string;
};

export function BuscaDePracas({ pracas, className = "" }: Props) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const router = useRouter();
  const idBase = useId();
  const idDaLista = `${idBase}-lista`;
  const caixa = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => buscarPracas(pracas, texto), [pracas, texto]);

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
        onFocus={() => setAberto(true)}
        onKeyDown={aoTeclar}
        className="w-full rounded-md border bg-[var(--surface)] px-3 py-1.5 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
      />

      {mostrarPainel ? (
        <div className="absolute right-0 z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-[var(--background)] shadow-lg">
          {resultados.length > 0 ? (
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
                Ver todas as {pracas.length} praças
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
