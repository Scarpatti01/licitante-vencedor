import type { ResumoMensalDeCusto } from "./tetoDeCusto.ts";
import { TETO_MENSAL_EM_CENTAVOS_BRL } from "./tetoDeCusto.ts";

/**
 * O texto do aviso de estouro — só chamado quando `avaliarContraOTeto` já
 * decidiu `estourou`. Este arquivo não decide SE avisa, só COMO.
 *
 * Sem link de descadastro, ao contrário do resto de `email/`: isto não é lista
 * de assinante, é alerta operacional para quem administra a plataforma
 * (`ADMINS_DA_PLATAFORMA`). Não há "sair da lista" — se um dia isso for
 * indesejado, a resposta é desligar o workflow, não um link no rodapé.
 */

export type ConteudoDoAvisoDeCusto = { assunto: string; html: string; texto: string };

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function linhasPorModelo(resumo: ResumoMensalDeCusto): string[] {
  return Object.entries(resumo.porModelo)
    .sort((a, b) => b[1].execucoes - a[1].execucoes)
    .map(
      ([modelo, r]) =>
        `${modelo}: ${r.execucoes} execução(ões), ${(r.tokensDeEntrada + r.tokensDeSaida).toLocaleString("pt-BR")} tokens`,
    );
}

export function conteudoDoAvisoDeCusto(
  resumo: ResumoMensalDeCusto,
  totalEmCentavosBrl: number,
): ConteudoDoAvisoDeCusto {
  const mesPorExtenso = new Date(`${resumo.mes}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const teto = emReais(TETO_MENSAL_EM_CENTAVOS_BRL);
  const total = emReais(totalEmCentavosBrl);
  const porModelo = linhasPorModelo(resumo);
  const semPreco =
    resumo.execucoesSemPreco > 0
      ? `${resumo.execucoesSemPreco} execução(ões) deste mês não entraram nesta conta por falta de preço conferido — o total real pode ser maior.`
      : null;

  const assunto = `Custo de IA passou de ${teto} em ${mesPorExtenso}`;

  const paragrafos = [
    `O gasto estimado com IA em ${mesPorExtenso} chegou a ${total}, acima do teto operacional de ${teto} combinado.`,
    "Isto é um alerta, não um corte: a análise continua rodando normalmente. A decisão de revisar o teto, o plano de preços ou o volume de leitura é sua, com o dado abaixo.",
    `${resumo.execucoes} execução(ões) de IA neste mês, ${resumo.falhas} com falha.`,
    ...(semPreco ? [semPreco] : []),
    /*
     * A procedência do número, no corpo do aviso e não numa nota de rodapé.
     *
     * Até 25/08 não havia preço nenhum cadastrado e o aviso dizia honestamente
     * que não sabia. Agora há — conferido na página pública do fornecedor, com
     * data e URL. Isso é menos que a fatura: a fatura inclui imposto, câmbio do
     * dia da cobrança e eventual crédito promocional.
     *
     * Quem lê um valor em reais num e-mail assume "foi isto que saiu da conta".
     * Não avisar aqui seria deixar a suposição errada de pé — e é exatamente o
     * tipo de silêncio que o produto inteiro existe para não praticar.
     */
    "Os valores são ESTIMATIVA, calculada com o preço publicado pelo fornecedor " +
      "(ver PRECOS_POR_MODELO) e um câmbio de referência. A fatura real pode " +
      "diferir: ela inclui imposto, o câmbio do dia da cobrança e eventual crédito.",
  ];

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#101418">
<p style="margin:0 0 20px;font-size:18px;font-weight:600">${escapar(assunto)}</p>
${paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.6">${escapar(p)}</p>`).join("\n")}
${
  porModelo.length > 0
    ? `<p style="margin:20px 0 6px;font-size:13px;color:#5b6472">Por modelo</p><ul style="margin:0;padding-left:18px;font-size:14px">${porModelo.map((l) => `<li style="margin:2px 0">${escapar(l)}</li>`).join("")}</ul>`
    : ""
}
<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#5b6472">Gerado por scripts/verificar-custo-de-ia.ts, a partir de execucoes_de_ia.</p>
</div>`.trim();

  const texto = [
    assunto,
    "",
    ...paragrafos,
    ...(porModelo.length > 0 ? ["", "Por modelo:", ...porModelo.map((l) => `- ${l}`)] : []),
    "",
    "Gerado por scripts/verificar-custo-de-ia.ts, a partir de execucoes_de_ia.",
  ].join("\n");

  return { assunto, html, texto };
}
