import type { Metadata } from "next";
import Link from "next/link";
import { empresaAtual, repositorio } from "@/lib/dados";
import type { SituacaoDaOportunidade } from "@/lib/dominio/tipos";
import { Secao, Vazio } from "@/components/oportunidades/Primitivos";
import { ListaDoHistorico, LinhaDoHistorico } from "@/components/oportunidades/LinhaDoHistorico";

/**
 * Histórico de participação e resultado.
 *
 * Duas seções, não uma lista só: "em andamento" (salva, em preparação) é
 * trabalho que ainda pede uma decisão; "concluído" (participada, vencida,
 * perdida) é o que já aconteceu e não muda mais. Misturar as duas faria o
 * cliente rolar por certames fechados para achar o que ainda precisa de
 * atenção — e é essa busca, não uma lista cronológica, que esta tela existe
 * para responder.
 *
 * A página é só leitura: quem grava a situação é `AcoesDoStatus`, na página
 * do edital. Sem essa origem, `oportunidades.situacao` nunca sairia de
 * "nova" e esta tela ficaria vazia para sempre — não por falta de dado, mas
 * por falta de um jeito de o cliente registrá-lo.
 */

export const metadata: Metadata = {
  title: "Histórico",
  description: "As oportunidades em que sua empresa decidiu agir, e o que aconteceu com cada uma.",
  robots: { index: false, follow: false },
};

const EM_ANDAMENTO: SituacaoDaOportunidade[] = ["salva", "em_preparacao"];
const CONCLUIDAS: SituacaoDaOportunidade[] = ["participada", "vencida", "perdida"];

export default async function HistoricoPagina() {
  const repo = await repositorio();
  const empresaId = await empresaAtual();

  const [emAndamento, concluidas] = await Promise.all([
    repo.listarOportunidades(empresaId, { situacoes: EM_ANDAMENTO }),
    repo.listarOportunidades(empresaId, { situacoes: CONCLUIDAS }),
  ]);

  const semNada = emAndamento.length === 0 && concluidas.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Histórico</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          As oportunidades em que você decidiu agir — salvas, em preparação, e as que já terminaram.
        </p>
      </header>

      {semNada ? (
        <Vazio titulo="Nenhuma decisão registrada ainda">
          <p>
            Salvar, descartar ou marcar uma oportunidade como em preparação — direto na página do
            edital — é o que preenche esta tela.
          </p>
          <p>
            <Link
              href="/oportunidades/"
              className="font-medium text-[var(--accent)] underline underline-offset-4"
            >
              Ver as oportunidades em aberto
            </Link>
          </p>
        </Vazio>
      ) : (
        <>
          <Secao
            titulo="Em andamento"
            descricao="Salvas ou em preparação — o que ainda pede uma decisão sua."
          >
            {emAndamento.length > 0 ? (
              <ListaDoHistorico>
                {emAndamento.map((oportunidade) => (
                  <LinhaDoHistorico key={oportunidade.id} oportunidade={oportunidade} />
                ))}
              </ListaDoHistorico>
            ) : (
              <Vazio titulo="Nada em andamento agora">
                <p>Oportunidades salvas ou marcadas como em preparação aparecem aqui.</p>
              </Vazio>
            )}
          </Secao>

          <Secao
            titulo="Concluídas"
            descricao="Participadas, vencidas ou perdidas — o resultado de cada certame que chegou ao fim."
          >
            {concluidas.length > 0 ? (
              <ListaDoHistorico>
                {concluidas.map((oportunidade) => (
                  <LinhaDoHistorico key={oportunidade.id} oportunidade={oportunidade} />
                ))}
              </ListaDoHistorico>
            ) : (
              <Vazio titulo="Nenhum certame concluído ainda">
                <p>
                  Quando uma oportunidade em preparação for marcada como participada, o resultado
                  final (vencida ou perdida) aparece aqui.
                </p>
              </Vazio>
            )}
          </Secao>
        </>
      )}
    </div>
  );
}
