"use client";

import { useEffect, useRef } from "react";

/**
 * A chuva de caracteres do hero.
 *
 * ## O que ela é, e o que ela deliberadamente não é
 *
 * É **decoração**, e por isso três coisas valem como regra:
 *
 * 1. **O texto do hero não depende dela.** O título, o número e os botões são
 *    renderizados no servidor e ficam legíveis mesmo que este componente nunca
 *    monte — sem JavaScript, com JavaScript bloqueado, ou num navegador que não
 *    tenha canvas. O que se perde é o enfeite, não a mensagem.
 * 2. **`aria-hidden`.** Um leitor de tela não tem nada a ganhar com "0 1 A 7 F 3"
 *    caindo em loop, e tem tudo a perder se isso for anunciado.
 * 3. **Para quem pediu menos movimento, ela não roda.** `prefers-reduced-motion`
 *    não é preferência estética: animação contínua em tela cheia dispara enxaqueca
 *    e sintoma vestibular em quem tem essa sensibilidade. Nesse caso a tela fica
 *    no gradiente estático, que é bonito o bastante.
 *
 * ## Por que canvas, e não CSS ou GIF
 *
 * O efeito precisa de dezenas de colunas com posições independentes. Em DOM,
 * seriam centenas de elementos animados — trabalho de layout a 60 quadros por
 * segundo, que é o caminho conhecido para travar a rolagem num celular. Um GIF
 * ou vídeo custaria centenas de KB antes do primeiro pixel útil e competiria com
 * o LCP justamente na primeira dobra.
 *
 * Canvas desenha num buffer só, não toca no layout da página, e o custo é de
 * pintura — que é onde ele é barato.
 *
 * ## O que cai
 *
 * Dígitos e letras, e não katakana como no filme: o produto lê número de edital,
 * CNPJ, valor e prazo. O alfabeto que cai é o mesmo que aparece num documento de
 * licitação, e isso faz a decoração dizer algo sobre o produto em vez de citar
 * um filme.
 */

/** Dígitos e maiúsculas — o alfabeto de um número de edital. */
const ALFABETO = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Corpo da fonte, em px. Define também a largura da coluna. */
const CORPO = 16;

/**
 * Quadros por segundo.
 *
 * Vinte, e não sessenta. A chuva do Matrix é feita de saltos discretos, não de
 * movimento contínuo — a 60 fps ela fica *pior*, além de gastar três vezes mais
 * bateria. Limitar aqui é o que mantém o efeito bonito e o celular frio.
 */
const QUADROS_POR_SEGUNDO = 20;

export function ChuvaDeDados({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const contexto = canvas.getContext("2d");
    if (!contexto) return;

    const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (menosMovimento.matches) return;

    let colunas: number[] = [];
    let largura = 0;
    let altura = 0;

    /*
     * O canvas tem DOIS tamanhos: o de CSS (o espaço que ele ocupa) e o de
     * buffer (quantos pixels ele realmente tem). Sem multiplicar pelo
     * `devicePixelRatio`, o buffer sai com um terço dos pixels da tela num
     * celular moderno e o texto aparece borrado — o defeito clássico de canvas
     * em tela retina.
     */
    function medir() {
      if (!canvas || !contexto) return;
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      const caixa = canvas.getBoundingClientRect();

      largura = caixa.width;
      altura = caixa.height;
      canvas.width = Math.floor(largura * escala);
      canvas.height = Math.floor(altura * escala);
      contexto.setTransform(escala, 0, 0, escala, 0, 0);
      contexto.font = `${CORPO}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      contexto.textBaseline = "top";

      const quantas = Math.ceil(largura / CORPO);
      // Cada coluna começa numa altura própria, e acima da tela: sem isso, todas
      // largam da primeira linha ao mesmo tempo e o primeiro segundo vira uma
      // faixa sólida atravessando o hero.
      colunas = Array.from({ length: quantas }, () => Math.random() * -altura);
    }

    let anterior = 0;
    let animacao = 0;
    const intervalo = 1000 / QUADROS_POR_SEGUNDO;

    function desenhar(agora: number) {
      animacao = requestAnimationFrame(desenhar);
      if (agora - anterior < intervalo) return;
      anterior = agora;
      if (!contexto) return;

      /*
       * O rastro que faz o efeito.
       *
       * Em vez de apagar a tela, pinta-se um véu quase transparente da cor do
       * fundo por cima do quadro anterior. Cada caractere vai escurecendo a cada
       * passagem em vez de sumir, e é daí que sai a cauda que se apaga.
       */
      contexto.fillStyle = "rgba(3, 8, 20, 0.14)";
      contexto.fillRect(0, 0, largura, altura);

      for (let i = 0; i < colunas.length; i++) {
        const caractere = ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
        const x = i * CORPO;
        const y = colunas[i];

        // A cabeça da coluna é quase branca e o corpo é ciano. É esse contraste
        // que dá a sensação de brilho, e não um `shadowBlur` — que custaria caro
        // e derrubaria os quadros.
        contexto.fillStyle = "#dbf4ff";
        contexto.fillText(caractere, x, y);

        contexto.fillStyle = "rgba(56, 189, 248, 0.85)";
        contexto.fillText(
          ALFABETO[Math.floor(Math.random() * ALFABETO.length)],
          x,
          y - CORPO,
        );

        // Passou do fim: reinicia acima da tela, com sorteio, para as colunas
        // não sincronizarem num pente depois de alguns segundos.
        colunas[i] = y > altura && Math.random() > 0.975 ? -CORPO * 2 : y + CORPO;
      }
    }

    medir();
    animacao = requestAnimationFrame(desenhar);

    const aoRedimensionar = () => medir();
    window.addEventListener("resize", aoRedimensionar);

    /*
     * Parar quando a aba sai de vista.
     *
     * `requestAnimationFrame` já é pausado pelo navegador em aba oculta, mas o
     * listener explícito cobre o caso de a página ficar visível numa janela sem
     * foco. Animação rodando fora de vista é bateria queimada por nada.
     */
    const aoTrocarDeAba = () => {
      cancelAnimationFrame(animacao);
      if (!document.hidden) animacao = requestAnimationFrame(desenhar);
    };
    document.addEventListener("visibilitychange", aoTrocarDeAba);

    return () => {
      cancelAnimationFrame(animacao);
      window.removeEventListener("resize", aoRedimensionar);
      document.removeEventListener("visibilitychange", aoTrocarDeAba);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
