import type { ReactNode } from "react";
import {
  type Campo,
  explicacaoDeProcedencia,
  rotuloDeProcedencia,
} from "@/lib/dominio/procedencia";
import { TOM, type Tom } from "./estilo";

/**
 * As peças pequenas que se repetem nas três telas.
 *
 * Ficam juntas porque a consistência entre elas é o que faz a interface parecer
 * um produto e não uma coleção de páginas: o mesmo selo, com o mesmo glifo e o
 * mesmo espaçamento, do painel à página do edital.
 */

/** Pílula de status: glifo + palavra. A palavra nunca é opcional. */
export function Selo({
  tom,
  children,
  tamanho = "normal",
  comGlifo = true,
}: {
  tom: Tom;
  children: ReactNode;
  tamanho?: "normal" | "pequeno";
  comGlifo?: boolean;
}) {
  const estilo = TOM[tom];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${estilo.pilula} ${
        tamanho === "pequeno" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs sm:text-[0.8125rem]"
      }`}
    >
      {comGlifo ? (
        <span aria-hidden className="text-[0.9em] leading-none">
          {estilo.glifo}
        </span>
      ) : null}
      {children}
    </span>
  );
}

/**
 * De onde veio o dado. O componente que o produto não pode ter sem.
 *
 * O texto sai inteiro de `procedencia.ts` — a redação é regra de produto, não
 * escolha de componente. "Inferido — confirme antes de decidir" precisa
 * aparecer com esse peso, e nunca com a mesma cara de "Informado no edital".
 */
export function Procedencia({
  campo,
  className = "",
  comExplicacao = true,
}: {
  campo: Campo<unknown>;
  className?: string;
  comExplicacao?: boolean;
}) {
  const rotulo = rotuloDeProcedencia(campo);
  const explicacao = explicacaoDeProcedencia(campo);

  const cor =
    campo.origem === "inferencia"
      ? TOM.atencao.texto
      : campo.origem === "desconhecido"
        ? TOM.indeterminado.texto
        : "text-[var(--muted)]";

  return (
    <p className={`text-xs leading-relaxed text-[var(--muted)] ${className}`}>
      <span className={`font-medium ${cor}`}>{rotulo}</span>
      {comExplicacao && explicacao ? (
        <>
          <span aria-hidden> · </span>
          {explicacao}
        </>
      ) : null}
    </p>
  );
}

/** Cabeçalho de seção da página do edital. */
export function Secao({
  titulo,
  descricao,
  acessorio,
  children,
  id,
}: {
  titulo: string;
  descricao?: string;
  acessorio?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{titulo}</h2>
        {acessorio}
      </div>
      {descricao ? (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{descricao}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Aviso de página: usado para coleta parcial, perfil incompleto e afins. */
export function Aviso({
  tom,
  titulo,
  children,
  acao,
}: {
  tom: Tom;
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  const estilo = TOM[tom];
  return (
    <div className={`rounded-xl p-4 sm:p-5 ${estilo.bloco} ring-1 ring-inset ring-[var(--border)]`}>
      <div className="flex gap-3">
        <span aria-hidden className={`mt-0.5 text-base leading-none ${estilo.texto}`}>
          {estilo.glifo}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${estilo.texto}`}>{titulo}</p>
          {children ? (
            <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
              {children}
            </div>
          ) : null}
          {acao ? <div className="mt-3">{acao}</div> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Estado vazio.
 *
 * Sempre com uma saída. "Nada por aqui" devolve o problema ao usuário; a tela
 * precisa dizer o que fazer para o vazio deixar de existir.
 */
export function Vazio({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="text-base font-semibold tracking-tight">{titulo}</p>
      {children ? (
        <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
          {children}
        </div>
      ) : null}
      {acao ? <div className="mt-5 flex justify-center">{acao}</div> : null}
    </div>
  );
}

/** Bloco cinza que ocupa o lugar do conteúdo enquanto ele carrega. */
export function Esqueleto({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-[var(--surface)] ring-1 ring-[var(--border)] ${className}`}
    />
  );
}
