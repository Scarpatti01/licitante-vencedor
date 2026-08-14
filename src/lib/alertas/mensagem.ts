import type { ItemSelecionado, SelecaoDeAlerta } from "./selecao";
import { emReais, prazoEmTexto } from "./formato";
import { diasAteEncerrar } from "../pncp/normaliza";
import { SITE } from "../site";

/**
 * O texto do alerta.
 *
 * Duas regras vêm do produto e não são estilo:
 *
 * **Nunca mandar o edital inteiro.** O alerta é uma decisão de abrir ou não
 * abrir, e ele cabe em uma tela de celular. Objeto, valor, órgão, local, prazo,
 * score, por que recomendamos, o que está pendente, e um link.
 *
 * **Nunca prometer o que não sabemos.** Nada de "chance de vitória". Onde o
 * dado falta, o texto diz que falta — inclusive no valor, que é o campo em que
 * a tentação de preencher com zero é maior.
 *
 * O mesmo conteúdo sai em texto puro (WhatsApp) e em HTML (e-mail) a partir da
 * mesma estrutura, para os dois canais nunca divergirem no que afirmam.
 */

export type BlocoDeOportunidade = {
  destaque: string;
  objeto: string;
  valor: string;
  orgao: string;
  local: string;
  prazo: string;
  score: string;
  porqueRecomendamos: string[];
  pendencias: string[];
  proximaAcao: string;
  link: string;
};

export type MensagemDeAlerta = {
  assunto: string;
  blocos: BlocoDeOportunidade[];
  /** Linha final honesta sobre o que ficou de fora e sobre os limites do serviço. */
  rodape: string;
};

const DESTAQUE: Record<ItemSelecionado["motivo"], string> = {
  alta_aderencia: "OPORTUNIDADE RECOMENDADA",
  prazo_acabando: "RECOMENDADA — PRAZO CURTO",
  salva_com_prazo_curto: "VOCÊ SALVOU E O PRAZO ESTÁ ACABANDO",
};

export function montarBloco(item: ItemSelecionado, agora: Date, urlBase = SITE.url): BlocoDeOportunidade {
  const { edital, avaliacao } = item.oportunidade;
  const { score, checklist, recomendacao } = avaliacao;

  const pendencias = checklist.itens
    .filter((i) => i.obrigatorio && (i.status === "ausente" || i.status === "verificar"))
    .map((i) => i.nome);

  return {
    destaque: DESTAQUE[item.motivo],
    objeto: edital.objeto,
    valor: emReais(edital.valorEstimado, edital.valorSuspeito),
    orgao: edital.orgao.nome,
    local: `${edital.local.municipio}/${edital.local.uf}`,
    prazo: prazoEmTexto(diasAteEncerrar(edital, agora)),
    score:
      score.valor === null
        ? "sem pontuação — faltam informações"
        : `${score.valor}/100 (${score.faixa})`,
    // Só os positivos entram no "por que recomendamos": é a justificativa da
    // recomendação, não um resumo da avaliação. As atenções vão em pendências.
    porqueRecomendamos: recomendacao.justificativa.positivos,
    pendencias:
      pendencias.length > 0
        ? pendencias
        : checklist.derivadoDoDocumento
          ? []
          : ["o texto do edital ainda não foi lido — as exigências não foram conferidas"],
    proximaAcao: recomendacao.proximaAcao.titulo,
    link: `${urlBase}/oportunidades/${item.oportunidade.id}/`,
  };
}

export function montarMensagem(
  selecao: SelecaoDeAlerta,
  agora: Date = new Date(),
  urlBase = SITE.url,
): MensagemDeAlerta {
  const blocos = selecao.itens.map((item) => montarBloco(item, agora, urlBase));

  const assunto =
    blocos.length === 0
      ? "Nenhuma licitação exigiu sua atenção hoje"
      : blocos.length === 1
        ? `1 licitação para você hoje — ${blocos[0].local}`
        : `${blocos.length} licitações para você hoje`;

  const partes: string[] = [];
  if (selecao.descartadas > 0) {
    partes.push(
      `Outras ${selecao.descartadas} publicações foram avaliadas e não entraram: fora do seu perfil, fora da sua região ou com prazo encerrado.`,
    );
  }
  // Este parágrafo não é jurídico decorativo — é o posicionamento do produto.
  // Fazemos triagem e checklist operacional; quem decide participar é o cliente,
  // e o edital prevalece sobre qualquer coisa que este e-mail diga.
  partes.push(
    "Fazemos triagem automatizada e checklist operacional. Não é parecer jurídico e não substitui a leitura do edital, que prevalece em qualquer divergência.",
  );

  return { assunto, blocos, rodape: partes.join(" ") };
}

/** Versão para WhatsApp e para qualquer canal de texto puro. */
export function emTextoSimples(mensagem: MensagemDeAlerta): string {
  if (mensagem.blocos.length === 0) {
    return `${mensagem.assunto}\n\n${mensagem.rodape}`;
  }

  const blocos = mensagem.blocos.map((b) => {
    const linhas = [
      `*${b.destaque}*`,
      `*Objeto:* ${b.objeto}`,
      `*Valor:* ${b.valor}`,
      `*Órgão:* ${b.orgao}`,
      `*Local:* ${b.local}`,
      `*Prazo:* ${b.prazo}`,
      `*Aderência:* ${b.score}`,
    ];
    if (b.porqueRecomendamos.length) {
      linhas.push(`*Por que recomendamos:* ${b.porqueRecomendamos.join(" ")}`);
    }
    if (b.pendencias.length) {
      linhas.push(`*Pendências:* ${b.pendencias.join("; ")}`);
    }
    linhas.push(`*Próxima ação:* ${b.proximaAcao}`);
    linhas.push(`👉 ${b.link}`);
    return linhas.join("\n");
  });

  return `${mensagem.assunto}\n\n${blocos.join("\n\n———\n\n")}\n\n${mensagem.rodape}`;
}

/**
 * Escapa texto que vai para HTML de e-mail. Objeto de edital tem `&` e `<`.
 *
 * Vale para conteúdo E para atributo: `"` é escapado, e todo atributo deste
 * arquivo é delimitado por aspa dupla. O `link` passa por aqui pelo mesmo
 * motivo que o objeto — ele carrega o id da oportunidade, que para o PNCP é o
 * `numeroControlePNCP`, texto de terceiro sem validação de formato em nenhuma
 * camada.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Versão HTML.
 *
 * Estilo em atributo `style` e tabela de largura fixa porque cliente de e-mail
 * ignora folha de estilo e classe: o que sobrevive no Outlook é isto. Feio de
 * ler, e é o formato que funciona.
 */
export function emHtml(mensagem: MensagemDeAlerta): string {
  const blocos = mensagem.blocos
    .map((b) => {
      const linha = (rotulo: string, valor: string) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#5b6472;font-size:13px;white-space:nowrap;vertical-align:top">${rotulo}</td><td style="padding:4px 0;font-size:14px;color:#101418">${escapar(valor)}</td></tr>`;

      const listas = [
        b.porqueRecomendamos.length
          ? `<p style="margin:12px 0 4px;font-size:13px;color:#5b6472">Por que recomendamos</p><ul style="margin:0;padding-left:18px;font-size:14px;color:#101418">${b.porqueRecomendamos.map((p) => `<li style="margin:2px 0">${escapar(p)}</li>`).join("")}</ul>`
          : "",
        b.pendencias.length
          ? `<p style="margin:12px 0 4px;font-size:13px;color:#5b6472">Pendências</p><ul style="margin:0;padding-left:18px;font-size:14px;color:#101418">${b.pendencias.map((p) => `<li style="margin:2px 0">${escapar(p)}</li>`).join("")}</ul>`
          : "",
      ].join("");

      return `<div style="border:1px solid #e3e6ea;border-radius:10px;padding:20px;margin-bottom:16px">
<p style="margin:0 0 10px;font-size:11px;letter-spacing:.08em;font-weight:600;color:#0a6b4a">${escapar(b.destaque)}</p>
<p style="margin:0 0 14px;font-size:16px;line-height:1.4;font-weight:600;color:#101418">${escapar(b.objeto)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
${linha("Valor", b.valor)}${linha("Órgão", b.orgao)}${linha("Local", b.local)}${linha("Prazo", b.prazo)}${linha("Aderência", b.score)}
</table>
${listas}
<p style="margin:18px 0 0"><a href="${escapar(b.link)}" style="display:inline-block;background:#101418;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${escapar(b.proximaAcao)}</a></p>
</div>`;
    })
    .join("");

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
<p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#101418">${escapar(mensagem.assunto)}</p>
${blocos}
<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#5b6472">${escapar(mensagem.rodape)}</p>
</div>`;
}
