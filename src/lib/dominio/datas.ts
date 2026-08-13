/**
 * Formatação de data e hora do produto.
 *
 * Existe por um defeito real, encontrado na revisão das telas: a evidência do
 * critério de prazo mostrava "15/09/2026, 17:00" enquanto a ficha do mesmo
 * edital, na mesma página, mostrava "14:00". Nenhuma das duas estava mentindo
 * sobre o instante — `toLocaleString("pt-BR")` sem `timeZone` usa o fuso do
 * processo, e na Vercel o processo roda em UTC. Três horas de diferença no
 * único dado que o cliente não pode errar.
 *
 * O fuso é fixado aqui, e nenhum outro lugar do código deve formatar data de
 * edital. Prazo de licitação é sempre horário de Brasília: é o que está no
 * edital, é o que o pregoeiro usa, e é o que o cliente confere no relógio dele.
 *
 * `America/Sao_Paulo` em vez do offset fixo `-03:00` de propósito. O Brasil
 * extinguiu o horário de verão em 2019, então hoje os dois dão o mesmo
 * resultado — mas se ele voltar, o identificador da IANA acompanha e o offset
 * cravado passaria a errar por uma hora sem ninguém perceber.
 */

const FUSO = "America/Sao_Paulo";

export function dataEHoraDeBrasilia(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dataDeBrasilia(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
