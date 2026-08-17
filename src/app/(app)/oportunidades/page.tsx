import type { Metadata } from "next";
import Link from "next/link";
import { empresaAtual, repositorio } from "@/lib/dados";
import type { FiltroDeOportunidades, ResumoDaOportunidade } from "@/lib/dados/porta";
import type { SituacaoDaOportunidade } from "@/lib/dominio/tipos";
import { Aviso, Vazio } from "@/components/oportunidades/Primitivos";
import { Filtros, construirEndereco } from "@/components/oportunidades/Filtros";
import {
  LinhaDaOportunidade,
  ListaDeOportunidades,
} from "@/components/oportunidades/LinhaDaOportunidade";
import {
  AvisoDePerfilIncompleto,
  lacunasDoPerfil,
} from "@/components/oportunidades/PerfilIncompleto";

/**
 * A lista. O lugar onde o cliente passa a maior parte do tempo.
 *
 * Duas decisões que sustentam o resto:
 *
 * **O filtro mora na URL.** `searchParams` é assíncrono nesta versão do Next, e
 * é de propósito: ler o filtro é dado de requisição. Guardar o filtro na URL faz
 * dele algo que se compartilha com o sócio, que sobrevive ao F5 e que o botão
 * "voltar" desfaz. Também é o que permite filtrar no servidor, com a base
 * inteira, em vez de esconder linhas já enviadas ao navegador.
 *
 * **Oportunidade sem score não some e não vira zero.** Ela aparece com o rótulo
 * de indeterminada e com o motivo. A única exceção é o filtro por score mínimo,
 * que a deixa de fora porque ela não é "abaixo do mínimo", é "sem base para
 * comparar" — e a tela avisa quantas ficaram de fora por isso.
 */

export const metadata: Metadata = {
  title: "Oportunidades",
  description: "Os editais triados para o perfil da sua empresa, por urgência e aderência.",
  robots: { index: false, follow: false },
};

const SITUACOES_VALIDAS: SituacaoDaOportunidade[] = [
  "nova",
  "vista",
  "salva",
  "descartada",
  "em_preparacao",
  "participada",
  "vencida",
  "perdida",
];

const PRAZOS_VALIDOS = [3, 7, 15, 30];
const SCORES_VALIDOS = [50, 70, 85];

type Parametros = { [chave: string]: string | string[] | undefined };

/** Um parâmetro de busca pode chegar repetido (`?a=1&a=2`). Vale o primeiro. */
function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

function ehRecomendada(oportunidade: ResumoDaOportunidade): boolean {
  const nivel = oportunidade.avaliacao.recomendacao.nivel;
  return nivel === "recomendada" || nivel === "recomendada_forte";
}

export default async function OportunidadesPagina({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const parametros = await searchParams;
  const agora = new Date();

  // Nada entra no filtro sem passar por uma lista fechada: parâmetro de URL é
  // entrada do usuário, e `?score=abc` não pode virar `NaN` dentro da consulta.
  const situacaoCrua = primeiro(parametros.situacao);
  const situacao = SITUACOES_VALIDAS.includes(situacaoCrua as SituacaoDaOportunidade)
    ? (situacaoCrua as SituacaoDaOportunidade)
    : "";

  const prazoCru = Number(primeiro(parametros.prazo));
  const prazo = PRAZOS_VALIDOS.includes(prazoCru) ? prazoCru : null;

  const scoreCru = Number(primeiro(parametros.score));
  const score = SCORES_VALIDOS.includes(scoreCru) ? scoreCru : null;

  const prioridadeCrua = primeiro(parametros.prioridade);
  const prioridade =
    prioridadeCrua === "urgentes" || prioridadeCrua === "recomendadas" ? prioridadeCrua : "";

  const valoresDosFiltros = {
    situacao,
    prazo: prazo === null ? "" : String(prazo),
    score: score === null ? "" : String(score),
    prioridade,
  };
  const temFiltro = Object.values(valoresDosFiltros).some(Boolean);

  const repo = await repositorio();
  const empresaId = await empresaAtual();

  const perfil = await repo.perfil(empresaId);
  if (!perfil) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <Aviso tom="impedimento" titulo="Não encontramos o cadastro desta empresa">
          <p>
            A sessão aponta para uma empresa que não está no cadastro. Saia e entre de novo; se
            continuar, é falha nossa e não sua.
          </p>
        </Aviso>
      </div>
    );
  }

  const filtro: FiltroDeOportunidades = {};
  if (situacao) filtro.situacoes = [situacao];
  if (prazo !== null) filtro.encerrandoEmDias = prazo;
  if (score !== null) filtro.scoreMinimo = score;
  if (prioridade === "urgentes") filtro.apenasUrgentes = true;

  // "Recomendada" é conclusão do domínio, não critério da porta de dados —
  // por isso este recorte é aplicado aqui, sobre o resultado, e não inventado
  // como parâmetro de consulta que a implementação sobre Postgres teria de
  // reimplementar por conta própria.
  const aplicarRecorte = (lista: ResumoDaOportunidade[]) =>
    prioridade === "recomendadas" ? lista.filter(ehRecomendada) : lista;

  const lista = aplicarRecorte(await repo.listarOportunidades(empresaId, filtro));

  // Quantas ficaram de fora por não terem score. Sem esta conta, filtrar por
  // score esconderia silenciosamente justamente as que precisam de olho humano.
  let semScoreForaDoFiltro = 0;
  if (score !== null) {
    const semEsseFiltro = aplicarRecorte(
      await repo.listarOportunidades(empresaId, { ...filtro, scoreMinimo: undefined }),
    );
    semScoreForaDoFiltro = semEsseFiltro.filter((o) => o.avaliacao.score.valor === null).length;
  }

  const lacunas = lacunasDoPerfil(perfil);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Oportunidades</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Editais triados para o perfil de {perfil.nomeFantasia ?? perfil.razaoSocial}, ordenados
          pelo que encerra antes e, depois, pela aderência ao seu perfil.
        </p>
      </header>

      <AvisoDePerfilIncompleto lacunas={lacunas} razaoSocial={perfil.razaoSocial} />

      <section aria-label="Filtros" className="rounded-xl border p-4 sm:p-5">
        <Filtros valores={valoresDosFiltros} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3">
          <p className="text-sm text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)] tabular-nums">
              {lista.length}
            </span>{" "}
            {lista.length === 1 ? "oportunidade" : "oportunidades"}
            {temFiltro ? " com os filtros atuais" : " em aberto"}
          </p>
          {temFiltro ? (
            <Link
              href="/oportunidades/"
              className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </section>

      {semScoreForaDoFiltro > 0 ? (
        <Aviso
          tom="indeterminado"
          titulo={
            semScoreForaDoFiltro === 1
              ? "1 oportunidade sem score ficou fora deste filtro"
              : `${semScoreForaDoFiltro} oportunidades sem score ficaram fora deste filtro`
          }
        >
          <p>
            Elas não são piores que o mínimo que você pediu: não há base para pontuá-las. Filtrar
            por score as deixa de fora justamente porque tratá-las como nota baixa esconderia o que
            mais precisa de olho humano.
          </p>
          <p>
            <Link
              href={construirEndereco({ ...valoresDosFiltros, score: "" })}
              className="font-medium text-[var(--accent)] underline underline-offset-4"
            >
              Ver também as sem score
            </Link>
          </p>
        </Aviso>
      ) : null}

      {lista.length > 0 ? (
        <ListaDeOportunidades>
          {lista.map((oportunidade) => (
            <LinhaDaOportunidade key={oportunidade.id} oportunidade={oportunidade} agora={agora} />
          ))}
        </ListaDeOportunidades>
      ) : temFiltro ? (
        <Vazio
          titulo="Nenhuma oportunidade com esses filtros"
          acao={
            <Link
              href="/oportunidades/"
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
            >
              Limpar filtros
            </Link>
          }
        >
          <p>
            O recorte pedido não devolveu nada. Afrouxar o prazo ou o score mínimo costuma ser o
            caminho mais curto — a coleta do dia inteiro continua disponível sem filtro.
          </p>
        </Vazio>
      ) : (
        <Vazio titulo="Nada chegou para a sua empresa ainda">
          <p>
            A coleta roda uma vez por dia. Se isto se repetir amanhã, o motivo mais provável é o
            perfil estar estreito demais: poucas palavras-chave ou poucos estados atendidos reduzem
            a triagem a quase nada.
          </p>
        </Vazio>
      )}

      <p className="max-w-3xl text-xs leading-relaxed text-[var(--muted)]">
        Oportunidade sem score aparece na lista com o rótulo de indeterminada e o motivo, nunca como
        zero. Score é medida de aderência entre o edital e o perfil declarado — é triagem, não
        previsão de resultado, e não substitui a leitura do edital.
      </p>
    </div>
  );
}
