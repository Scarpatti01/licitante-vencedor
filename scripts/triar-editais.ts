/**
 * A segunda metade da triagem: lê perfis e editais abertos do Postgres, roda
 * `avaliarOportunidade` para cada par empresa × edital, e grava pelo
 * mapeamento já testado contra o banco em `src/lib/triagem/mapeamento.ts`.
 *
 *   node scripts/triar-editais.ts --simular      (não grava nada, imprime o que gravaria)
 *   node scripts/triar-editais.ts                (grava de verdade)
 *
 * Ver `docs/produto/roadmap.md`, seção "O próximo passo, e a armadilha dele":
 * o mapeamento já existia, conferido contra os `check` do banco; faltava este
 * processo e o caminho inverso (`src/lib/triagem/repositorio.ts`), que
 * reconstrói `PerfilDaEmpresa` a partir de quatro tabelas com teste de ida e
 * volta campo a campo — a defesa contra o erro que não derruba nada, só
 * pontua errado.
 *
 * ## O que este script NÃO faz, e por quê
 *
 * Não lê `analises_de_edital`: a tabela existe no esquema, mas nada neste
 * projeto grava nela ainda — `publicar-posts.ts` roda `analisarEdital` e usa o
 * resultado só para o texto do post, nunca para o Postgres. Todo par aqui usa
 * `analiseNaoRealizada`, e isso é uma escolha, não uma limitação escondida:
 * dos 9 critérios do score, só `documentacao` (peso 15) e `complexidade` (peso
 * 5) dependem de leitura de IA — os outros 95 de 115 pontos de peso saem do
 * que a coleta já publica. Com `COBERTURA_MINIMA = 0.5`, a triagem produz
 * score real hoje, sem esperar a leitura profunda entrar.
 *
 * Não escreve em `situacao`: o mapeamento já cuida disso (ver o header de
 * `mapeamento.ts`), e reprocessar não pode apagar o que o cliente já fez com
 * uma oportunidade.
 *
 * ## Cadência
 *
 * Roda como passo de `coletar-pncp.yml` e `coletar-pncp-paralelo.yml`, logo
 * depois de os editais do dia estarem no Postgres — sem hora própria, porque
 * lê `editaisAbertos()` direto do banco, e "acabou de coletar" já é a
 * condição mais fresca possível. Ver `docs/produto/roadmap.md`, "O próximo
 * passo, e a armadilha dele".
 */

import { analiseNaoRealizada } from "../src/lib/dominio/recomendacao.ts";
import type { Edital } from "../src/lib/fontes/tipos.ts";
import { triar, type DecisaoDeTriagem } from "../src/lib/pipeline/triagem.ts";
import { paraAvaliarDaEmpresa } from "../src/lib/pipeline/selecaoPorRecorte.ts";
import { decisaoParaLinha, oportunidadeParaLinha } from "../src/lib/triagem/mapeamento.ts";
import { abrirRepositorio } from "../src/lib/triagem/repositorio.ts";

/** Mesmo código de saída de `enviar-alertas.ts`: "falta configurar", não "quebrou". */
const SEM_CONFIGURACAO = 78;

const MOTIVO_SEM_LEITURA =
  "A leitura de IA ainda não grava em analises_de_edital — o cruzamento usa " +
  "o que a coleta publicou.";

function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}

async function main() {
  const simular = temFlag("simular");

  const repositorio = abrirRepositorio();
  if (!repositorio) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a triar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const agora = new Date();
  const [perfis, editaisAbertos, recortesPorEmpresa] = await Promise.all([
    repositorio.perfis(),
    repositorio.editaisAbertos(agora),
    repositorio.recortesPorEmpresa(),
  ]);

  console.log(
    `${perfis.length} empresa(s) com perfil completo · ${editaisAbertos.length} edital(is) com proposta aberta`,
  );

  if (perfis.length === 0 || editaisAbertos.length === 0) {
    console.log("nada para cruzar — encerrando sem gravar.");
    return;
  }

  // Uma análise vazia por edital, compartilhada entre todas as empresas: a
  // leitura de IA é a mesma para todo mundo, só o perfil muda por empresa.
  const pares = editaisAbertos.map(({ uuid, edital }) => ({
    uuid,
    edital,
    analise: analiseNaoRealizada(edital.id, MOTIVO_SEM_LEITURA),
  }));

  const linhasDeOportunidade: ReturnType<typeof oportunidadeParaLinha>[] = [];
  const porDecidir: { empresaId: string; editalUuid: string; edital: Edital; decisao: DecisaoDeTriagem }[] = [];

  let entregues = 0;
  // Quantas avaliações os recortes pouparam. Sem este número, a economia que
  // justifica o plano de R$ 59 vira fé.
  let recortadas = 0;


  for (const perfil of perfis) {
    /*
     * Empresa COM recorte avalia só o que os recortes dela deixam entrar;
     * empresa SEM recorte continua avaliando tudo que está aberto.
     *
     * A ausência de recorte não é falta de configuração: é o que os planos que
     * leem o documento fazem, cobrindo o perfil inteiro sem limite geográfico.
     * Tratar "sem recorte" como "recorte vazio" desligaria a triagem justamente
     * de quem paga mais — o tipo de defeito que passa no teste e aparece como
     * um cliente reclamando que parou de receber e-mail.
     */
    const recortes = recortesPorEmpresa.get(perfil.empresaId) ?? [];
    const daEmpresa = paraAvaliarDaEmpresa(pares, recortes, perfil);

    recortadas += pares.length - daEmpresa.length;

    const resultado = triar(
      daEmpresa.map(({ edital, analise }) => ({ edital, analise })),
      perfil,
      agora,
    );

    resultado.decisoes.forEach((decisao, i) => {
      const { uuid: editalUuid, edital } = daEmpresa[i];

      if (decisao.entregue) {
        entregues++;
        linhasDeOportunidade.push(
          oportunidadeParaLinha({
            empresaId: perfil.empresaId,
            editalId: editalUuid,
            edital,
            avaliacao: decisao.avaliacao,
            avaliadoEm: decisao.decididoEm,
          }),
        );
      }

      porDecidir.push({ empresaId: perfil.empresaId, editalUuid, edital, decisao });
    });
  }

  console.log(
    `${entregues} oportunidade(s) a gravar · ${porDecidir.length - entregues} descarte(s) explicado(s)` +
      (recortadas > 0
        ? ` · ${recortadas.toLocaleString("pt-BR")} avaliação(ões) poupada(s) pelos recortes`
        : ""),
  );

  if (simular) {
    console.log("[SIMULAÇÃO] nada foi gravado.");
    return;
  }

  // PRIMEIRO oportunidades, DEPOIS decisões: `decisoes_de_triagem.oportunidade_id`
  // só existe depois deste passo, e é opcional — uma decisão sem oportunidade
  // (descarte) grava com `null` de qualquer forma.
  const mapaDeOportunidades = await repositorio.gravarOportunidades(linhasDeOportunidade);

  const linhasDeDecisao = porDecidir.map(({ empresaId, editalUuid, decisao }) =>
    decisaoParaLinha({
      empresaId,
      editalId: editalUuid,
      decisao,
      oportunidadeId: mapaDeOportunidades.get(`${empresaId}:${editalUuid}`) ?? null,
    }),
  );

  const decisoesGravadas = await repositorio.gravarDecisoes(linhasDeDecisao);

  console.log(
    `banco: ${mapaDeOportunidades.size} oportunidade(s) gravada(s) · ${decisoesGravadas} decisão(ões) de triagem gravada(s)`,
  );
}

main().catch((e) => {
  console.error("\nfalhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
