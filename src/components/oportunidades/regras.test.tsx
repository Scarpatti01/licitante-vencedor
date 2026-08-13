import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RepositorioDeDemonstracao } from "@/lib/dados/demonstracao";
import { PERFIL_INCOMPLETO, PERFIL_DOCUMENTACAO_RUIM } from "@/lib/dominio/exemplos";
import { LinhaDaOportunidade, ListaDeOportunidades } from "./LinhaDaOportunidade";
import { AvisoDePerfilIncompleto, lacunasDoPerfil } from "./PerfilIncompleto";
import { ScoreDetalhado } from "./Score";
import { Checklist } from "./Checklist";

/**
 * As regras de produto que a interface não pode violar, presas em teste.
 *
 * Não é teste de aparência — margem e cor mudam e devem poder mudar. É teste
 * das promessas que, se quebrarem, quebram o produto: score nulo nunca vira
 * zero, o motivo da ausência sempre aparece, o perfil incompleto é dito campo a
 * campo e o checklist mostra os quatro estados em palavra, não só em cor. Todas
 * são fáceis de desfazer sem perceber numa refatoração de layout.
 */

test("linha sem score mostra rótulo indeterminado e o motivo, nunca zero", async () => {
  const repo = new RepositorioDeDemonstracao();
  const lista = await repo.listarOportunidades(PERFIL_INCOMPLETO.empresaId);
  const semScore = lista.filter((o) => o.avaliacao.score.valor === null);
  expect(semScore.length).toBeGreaterThan(0);

  const html = renderToStaticMarkup(
    <ListaDeOportunidades>
      {semScore.map((o) => (
        <LinhaDaOportunidade key={o.id} oportunidade={o} agora={new Date()} />
      ))}
    </ListaDeOportunidades>,
  );

  expect(html).toContain("Sem score");
  expect(html).toContain("Faltam informações demais para pontuar com honestidade");
  expect(html).not.toContain("0/100");
  expect(html).toContain("Completar o perfil da empresa");
});

test("score detalhado sem valor mostra o motivo no lugar do número", async () => {
  const repo = new RepositorioDeDemonstracao();
  const lista = await repo.listarOportunidades(PERFIL_INCOMPLETO.empresaId);
  const html = renderToStaticMarkup(<ScoreDetalhado score={lista[0].avaliacao.score} />);
  expect(html).toContain("Sem score");
  expect(html).toContain("Faltam informações demais");
  expect(html).not.toContain(">0<");
});

test("perfil incompleto lista exatamente o que falta", () => {
  const lacunas = lacunasDoPerfil(PERFIL_INCOMPLETO);
  const html = renderToStaticMarkup(
    <AvisoDePerfilIncompleto lacunas={lacunas} razaoSocial={PERFIL_INCOMPLETO.razaoSocial} />,
  );
  expect(lacunas.map((l) => l.chave)).toEqual([
    "palavrasChave",
    "ufsAtendidas",
    "ticket",
    "faturamentoAnual",
    "documentos",
    "atestados",
  ]);
  expect(html).toContain("Palavras-chave");
  expect(html).toContain("Atestados de capacidade técnica");
});

test("checklist mostra os quatro estados com palavra, não só cor", async () => {
  const repo = new RepositorioDeDemonstracao();
  const lista = await repo.listarOportunidades(PERFIL_DOCUMENTACAO_RUIM.empresaId);
  const html = renderToStaticMarkup(<Checklist checklist={lista[0].avaliacao.checklist} />);
  for (const rotulo of ["Disponível", "Conferir", "Ausente", "Não identificado"]) {
    expect(html).toContain(rotulo);
  }
  expect(html).toContain("Este checklist ainda não foi extraído deste edital");
});
