import Link from "next/link";
import type { MunicipioAberto } from "@/lib/abertos/tipos";
import { RetratoDatado } from "./ListaDeAbertos";

/**
 * "Tem edital aberto aqui agora?", respondido no topo da página do município.
 *
 * ## O defeito que este bloco conserta, medido
 *
 * Search Console, 3 meses até 06/09: as páginas de município somaram 5.145
 * impressões e 45 cliques. Entre as buscas que o Google nomeia, quase todas
 * eram `licitações ribeirão preto`, `licitação mogi das cruzes`, `licitação
 * iguatu` — e TODAS com zero clique.
 *
 * Quem digita isso quer saber o que está aberto agora. A página respondia outra
 * coisa, com honestidade: um retrato datado do que já foi comprado. Ranquear
 * para uma intenção que a página recusa servir limita o clique por cima, e o
 * texto do resultado não conserta isso — as 619 páginas usam o MESMO modelo de
 * título e o CTR delas varia dez vezes só com a posição (5,26% na faixa 1-5
 * contra 0,52% na 9-10).
 *
 * ## Por que agora é honesto mostrar isto, e antes não era
 *
 * `regioes/serp.ts` proíbe prometer "editais abertos agora" no título, e
 * `abertos/honestidade.test.ts` explica por quê: o agregado é um retrato do
 * instante da coleta, e afirmar presente a partir de arquivo de dois dias é
 * dizer que está aberto o que já encerrou.
 *
 * A regra nunca foi "não mostre". Era "não afirme presente sem poder
 * sustentar". O que sustenta aqui é o mesmo que sustenta `/editais-abertos/`:
 * a hora do retrato aparece ANTES do número, e a taxa de envelhecimento da
 * própria página (quantos encerram em 24h) é dita ao leitor. Sem lista, a
 * marcação item a item no relógio de quem lê não se aplica: não há item.
 */
export function AbertosNaCidade({
  contagem,
  municipio,
  coletadoEm,
  caminhoDaUf,
}: {
  contagem: MunicipioAberto;
  municipio: string;
  coletadoEm: string;
  /** `null` quando a UF ainda não tem página de listagem própria. */
  caminhoDaUf: string | null;
}) {
  const n = (v: number) => v.toLocaleString("pt-BR");

  return (
    <section
      aria-labelledby="abertos-agora"
      className="mt-6 rounded-xl border border-neutral-300 p-5 dark:border-neutral-700"
    >
      <h2 id="abertos-agora" className="text-lg font-semibold">
        O que está aberto em {municipio} agora
      </h2>

      {/* Antes do primeiro número, e não no rodapé. Ver honestidade.test.ts. */}
      <RetratoDatado coletadoEm={coletadoEm} />

      <p className="mt-4">
        <strong>
          {n(contagem.abertos)} {contagem.abertos === 1 ? "edital" : "editais"} com proposta
          aberta
        </strong>
        {contagem.novos > 0 ? <> · {n(contagem.novos)} nas últimas 24 horas</> : null}
        {/*
         * `encerramEm24h` não é enfeite nem é opcional: é a taxa em que esta
         * caixa envelhece, e dizê-la é a terceira das três condições que
         * tornam a afirmação de presente sustentável.
         */}
        {contagem.encerramEm24h > 0 ? (
          <> · {n(contagem.encerramEm24h)} encerram nas próximas 24 horas</>
        ) : null}
      </p>

      {caminhoDaUf ? (
        <p className="mt-3 text-sm">
          <Link href={caminhoDaUf} className="underline underline-offset-4">
            Ver os editais abertos deste estado
          </Link>
        </p>
      ) : null}
    </section>
  );
}
