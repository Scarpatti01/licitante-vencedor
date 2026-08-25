import type { Metadata } from "next";
import Link from "next/link";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { P, RespostaDireta, Secao } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { CardAssinatura } from "@/components/CardAssinatura";
import { RodapeSite } from "@/components/RodapeSite";
import { ListaDeAbertos, RetratoDatado } from "@/components/abertos/ListaDeAbertos";
import { COLETADO_EM, TOTAIS, abertosNoBrasil, ufsComAbertos } from "@/lib/abertos/acervo";
import { temPaginaDeUf } from "@/lib/abertos/paginas";
import { limitarDescricao } from "@/lib/seo/resultado-de-busca";

/**
 * A listagem nacional de editais abertos.
 *
 * ## Por que ela pode existir, se a página de município recusa listar
 *
 * A recusa de lá (`/licitacoes/uf/municipio/`) nunca foi contra listar: foi
 * contra afirmar como presente um dado de dois dias. Aqui o retrato é regravado
 * a cada coleta e a página faz três coisas que aquela não podia fazer:
 *
 *   1. mostra a hora do retrato, no topo, antes de qualquer número;
 *   2. marca cada item que encerrou no relógio de quem lê (`PrazoDoEdital`);
 *   3. diz quantos encerram nas próximas 24 horas, que é a taxa de
 *      envelhecimento da própria página.
 *
 * Sem as três, isto seria a mesma promessa quebrada com outra roupa.
 */

const titulo = "Editais abertos no Brasil hoje: quantos são e quais encerram primeiro";
const descricao =
  `${TOTAIS.abertos.toLocaleString("pt-BR")} editais com proposta aberta no PNCP, ` +
  `${TOTAIS.novos.toLocaleString("pt-BR")} publicados nas últimas 24 horas. ` +
  `Atualizado a cada coleta, com a hora do retrato e o prazo de cada um.`;

export const metadata: Metadata = {
  title: titulo,
  description: limitarDescricao(descricao),
  alternates: { canonical: "/editais-abertos/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO,
    title: titulo,
    description: limitarDescricao(descricao),
    url: `${SITE.url}/editais-abertos/`,
    type: "website",
  },
};

const numero = (n: number) => n.toLocaleString("pt-BR");

export default function EditaisAbertos() {
  const ufs = ufsComAbertos();

  return (
    <>
      <CabecalhoSite />
      <Trilha atual="Editais abertos" />

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Editais abertos no Brasil
        </h1>

        <RetratoDatado coletadoEm={COLETADO_EM} />

        <RespostaDireta>
          <strong>{numero(TOTAIS.abertos)} editais</strong> estavam com proposta aberta no
          PNCP quando este retrato foi tirado. <strong>{numero(TOTAIS.novos)}</strong>{" "}
          apareceram nas últimas 24 horas, e <strong>{numero(TOTAIS.encerramEm24h)}</strong>{" "}
          encerram nas próximas 24 — cerca de {Math.round(TOTAIS.encerramEm24h / 24)} por
          hora. Por isso a lista abaixo só traz edital cujo prazo vai além da próxima
          coleta: nenhum deles vence enquanto esta página estiver no ar. Cada um
          mostra o próprio prazo, e é marcado se o horário passar no seu relógio.
        </RespostaDireta>

        <Secao id="abertos" titulo={`${abertosNoBrasil().length} editais abertos agora`}>
          <P>
            Todos com prazo que vai além da próxima coleta — nenhum deles encerra
            enquanto esta página estiver no ar. Os de prazo mais próximo vêm primeiro,
            porque são os que exigem decisão antes.
          </P>
          <ListaDeAbertos editais={abertosNoBrasil()} />
        </Secao>

        <Secao id="estados" titulo="Por estado">
          <P>
            Quantos estão abertos em cada UF, e quantos entraram nas últimas 24 horas.
          </P>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 text-right font-medium">Abertos</th>
                  <th className="py-2 pr-4 text-right font-medium">Novos em 24h</th>
                  <th className="py-2 text-right font-medium">Encerram em 24h</th>
                </tr>
              </thead>
              <tbody>
                {ufs.map((u) => (
                  <tr key={u.uf} className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="py-2 pr-4">
                      {temPaginaDeUf(u) ? (
                        <Link
                          href={`/editais-abertos/${u.uf.toLowerCase()}/`}
                          className="underline underline-offset-2"
                        >
                          {u.uf}
                        </Link>
                      ) : (
                        u.uf
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{numero(u.abertos)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{numero(u.novos)}</td>
                    <td className="py-2 text-right tabular-nums">{numero(u.encerramEm24h)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>

        <Secao id="limites" titulo="O que esta página não é">
          <P>
            Ela não é a lista completa: são quase 29 mil editais abertos, e nenhuma
            página se lê até o fim. Os {abertosNoBrasil().length} daqui são um recorte
            — e um recorte com um viés declarado, o de deixar de fora quem encerra nas
            próximas horas. Isso é de propósito: uma lista que envelhece antes de ser
            lida não serve a ninguém. Quem precisa justamente do que encerra hoje
            precisa de alerta, não de página.
          </P>
          <P>
            Ela também não substitui o PNCP. Os números vêm de lá, o link de cada
            item leva para lá, e é lá que está a versão oficial de qualquer prazo.
            Entre uma coleta e outra, o que muda no PNCP não aparece aqui — por isso
            a hora do retrato fica no topo, e não no rodapé.
          </P>
        </Secao>

        <CapturaAlerta origem="editais-abertos" />
        <CardAssinatura />
      </article>

      <RodapeSite />
    </>
  );
}
