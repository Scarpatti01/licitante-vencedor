import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { empresaAtual, repositorio } from "@/lib/dados";
import { Aviso, Vazio } from "@/components/oportunidades/Primitivos";
import { DocumentacaoPendente, Funil } from "@/components/oportunidades/Funil";
import {
  LinhaDaOportunidade,
  ListaDeOportunidades,
} from "@/components/oportunidades/LinhaDaOportunidade";
import {
  AvisoDePerfilIncompleto,
  lacunasDoPerfil,
} from "@/components/oportunidades/PerfilIncompleto";
import { dataHora } from "@/components/oportunidades/estilo";

/**
 * O painel responde a uma pergunta só: **o que eu preciso fazer hoje?**
 *
 * Daí a ordem da página ser funil → pendência documental → o que agir agora, e
 * daí não haver gráfico nenhum: nada aqui melhora com uma série temporal, e
 * série temporal em painel de triagem é decoração cara. O que decide vem
 * primeiro e maior; o resto é contexto do que vem primeiro.
 */

export const metadata: Metadata = {
  title: "Painel do dia",
  description: "O que precisa da sua atenção hoje nas licitações que passaram pela triagem.",
  // Área logada: não é conteúdo para busca, e o `robots.ts` do site não conhece
  // esta rota. Sem isto, uma URL de demonstração acabaria indexada.
  robots: { index: false, follow: false },
};

const QUANTAS_ACOES = 5;

export default async function PainelDoDiaPagina() {
  // Sem isto o Next pré-renderiza o painel no build — e "faltam 3 dias"
  // congelaria no dia do deploy. `connection()` diz que este render depende do
  // instante da requisição, que é literalmente o assunto da página. A lista e a
  // página do edital já são de requisição por lerem `searchParams` e `params`.
  await connection();

  const agora = new Date();
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

  const [painel, lista] = await Promise.all([
    repo.painelDoDia(empresaId, agora),
    repo.listarOportunidades(empresaId),
  ]);

  // A lista já vem ordenada por urgência e depois por score. O que sobra é
  // tirar o que não tem ação possível — arquivar um certame encerrado não é
  // trabalho de hoje, e ocupar o painel com isso é roubar espaço do que é.
  const acionaveis = lista
    .filter((o) => o.avaliacao.recomendacao.proximaAcao.tipo !== "arquivar")
    .slice(0, QUANTAS_ACOES);

  const lacunas = lacunasDoPerfil(perfil);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:space-y-10 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Painel do dia</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {painel.coletadoEm ? (
            <>Última coleta em {dataHora(painel.coletadoEm)}.</>
          ) : (
            <>Ainda não há registro de coleta para a sua empresa.</>
          )}{" "}
          Empresa: {perfil.nomeFantasia ?? perfil.razaoSocial}.
        </p>
      </header>

      {!painel.coletaCompleta ? (
        <Aviso tom="atencao" titulo="A última coleta veio incompleta">
          <p>
            Parte das fontes não respondeu, então os números abaixo são do que chegou — não do dia
            inteiro. Pode haver edital publicado hoje que ainda não está aqui. A próxima coleta
            recupera o que faltou.
          </p>
        </Aviso>
      ) : null}

      <AvisoDePerfilIncompleto lacunas={lacunas} razaoSocial={perfil.razaoSocial} />

      <section aria-labelledby="funil-do-dia" className="space-y-3">
        <h2 id="funil-do-dia" className="text-sm font-semibold tracking-tight">
          {painel.coletaCompleta ? "O dia em quatro números" : "O que chegou na coleta parcial"}
        </h2>
        <Funil painel={painel} />
        <DocumentacaoPendente quantidade={painel.documentosPendentes} />
      </section>

      <section aria-labelledby="agir-agora" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="agir-agora" className="text-lg font-semibold tracking-tight sm:text-xl">
            Merecem ação agora
          </h2>
          {lista.length > 0 ? (
            <Link
              href="/oportunidades/"
              className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Ver as {lista.length} oportunidades
              <span aria-hidden> →</span>
            </Link>
          ) : null}
        </div>

        {acionaveis.length > 0 ? (
          <ListaDeOportunidades>
            {acionaveis.map((oportunidade) => (
              <LinhaDaOportunidade
                key={oportunidade.id}
                oportunidade={oportunidade}
                agora={agora}
              />
            ))}
          </ListaDeOportunidades>
        ) : lista.length > 0 ? (
          <Vazio titulo="Nenhuma oportunidade pede ação hoje">
            <p>
              As {lista.length} oportunidades em aberto já foram triadas e nenhuma delas tem
              providência pendente para hoje — as que restam estão encerradas ou têm impedimento
              registrado para a sua empresa.
            </p>
          </Vazio>
        ) : (
          <Vazio titulo="Nada chegou para a sua empresa ainda">
            <p>
              A coleta roda uma vez por dia. Se isto se repetir amanhã, o motivo mais provável é o
              perfil estar estreito demais: poucas palavras-chave ou poucos estados atendidos
              reduzem a triagem a quase nada.
            </p>
          </Vazio>
        )}
      </section>
    </div>
  );
}
