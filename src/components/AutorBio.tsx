import Image from "next/image";
import { AUTHOR } from "@/lib/site";

/**
 * Bloco de autor com foto real.
 *
 * Rosto e nome de uma pessoa verificável são o sinal de E-E-A-T mais barato
 * que existe, e este domínio precisa deles: tem dez anos de histórico e trocou
 * de mãos em 2025, então quem avalia a página precisa saber quem assina agora.
 */
export function AutorBio({ variante = "artigo" }: { variante?: "artigo" | "home" }) {
  const naHome = variante === "home";

  return (
    <div
      className={
        naHome
          ? "flex flex-col gap-6 sm:flex-row sm:items-start"
          : "flex flex-col gap-5 rounded-lg border bg-[var(--surface)] p-6 sm:flex-row sm:items-start"
      }
    >
      <Image
        src={AUTHOR.photo}
        alt={`Retrato de ${AUTHOR.name}`}
        width={400}
        height={400}
        sizes="96px"
        className="h-24 w-24 shrink-0 rounded-full object-cover"
        priority={false}
      />
      <div>
        {naHome && (
          <h2 className="text-lg font-semibold tracking-tight">Quem assina</h2>
        )}
        <p className={naHome ? "mt-2 font-medium" : "font-medium"}>
          {AUTHOR.name}
          <span className="font-normal text-[var(--muted)]"> — {AUTHOR.jobTitle}</span>
        </p>
        <p className="mt-3 max-w-2xl leading-relaxed text-[var(--muted)]">
          {AUTHOR.bio}
        </p>
      </div>
    </div>
  );
}
