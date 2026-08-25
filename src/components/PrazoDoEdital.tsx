"use client";

import { useEffect, useState } from "react";

/**
 * O prazo de um edital, marcado no relógio de QUEM LÊ.
 *
 * ## Por que isto precisa ser cliente
 *
 * A listagem é estática: reconstruída uma vez por dia, na coleta. "Encerrado"
 * calculado no servidor congela no instante da build — a página nasceria
 * dizendo "aberto" e continuaria dizendo isso pelas 24 horas seguintes, mesmo
 * para o edital que fechou às 9h.
 *
 * Medido em 25/08: 2.923 editais encerram a cada 24 horas, uns 120 por hora.
 * Sem esta marcação, ao fim de um dia a página estaria errada sobre cerca de
 * 10% do que mostra — e errada em silêncio, que é o pior jeito de errar num
 * produto cujo valor é o cliente poder confiar no que lê.
 *
 * ## Por que o servidor ainda renderiza a data
 *
 * O primeiro render é igual nos dois lados, com a data e sem veredito. Isso
 * mantém o HTML válido para o Google e para quem está sem JavaScript: eles
 * recebem o prazo, que é o dado, e tiram a própria conclusão. O veredito
 * ("encerrado") entra depois da hidratação, quando existe um relógio de verdade
 * para consultar.
 *
 * Fazer diferente daria erro de hidratação — e, pior, faria o texto piscar de
 * "encerrado" para "aberto" na frente do leitor.
 */
export function PrazoDoEdital({ em, className }: { em: string; className?: string }) {
  const [encerrado, setEncerrado] = useState<boolean | null>(null);

  useEffect(() => {
    const fim = new Date(em).getTime();
    const conferir = () => setEncerrado(Date.now() >= fim);

    conferir();
    // Uma conferência por minuto: quem deixa a aba aberta a manhã inteira vê o
    // edital encerrar, em vez de continuar lendo "aberto" de quando abriu.
    const relogio = setInterval(conferir, 60_000);
    return () => clearInterval(relogio);
  }, [em]);

  const data = new Date(em);
  const quando = data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <span className={className}>
      <time dateTime={em}>{quando}</time>
      {encerrado === true && (
        <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
          encerrado
        </span>
      )}
    </span>
  );
}
