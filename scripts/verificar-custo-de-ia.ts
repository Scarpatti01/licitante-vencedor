/**
 * Soma o custo de IA do mês corrente e avisa os administradores da plataforma
 * quando passar do teto — o mecanismo que faltava, descrito em
 * `docs/produto/roadmap.md`: "custo.ts registra e estima custo por execução,
 * mas não soma o mês nem avisa ninguém."
 *
 *   node scripts/verificar-custo-de-ia.ts --simular   (não manda nem grava, só imprime)
 *   node scripts/verificar-custo-de-ia.ts              (manda e grava, se estourou)
 *
 * ## Nunca um interruptor
 *
 * Decisão de 20/08 (roadmap): ultrapassar o teto gera alerta para revisão com
 * dado real, nunca interrompe a análise sozinho. Este script só lê e avisa —
 * não tem, e não deveria ter, como impedir a próxima execução de IA.
 *
 * ## Por que só manda e-mail quando `estourou`
 *
 * `avaliarContraOTeto` também devolve `sem_preco_conferido`, quando alguma
 * execução do mês não tinha preço em `PRECOS_POR_MODELO` — hoje, o estado
 * normal, porque a tabela nasce vazia de propósito (ver `custo.ts`). Mandar
 * e-mail todo dia dizendo "não sei se passou do teto" ensinaria quem lê a
 * ignorar o remetente, e é exatamente esse hábito que faria o aviso real —
 * o dia em que `estourou` de verdade — passar despercebido. O resumo sempre
 * aparece no log do workflow; só o e-mail é reservado para a certeza.
 *
 * ## Uma vez por mês
 *
 * `avisos_de_custo_de_ia` guarda que o mês já foi avisado. Sem isso, todo dia
 * de execução acima do teto mandaria um e-mail novo — a mesma doença que
 * `envios_de_alerta` existe para evitar do outro lado do produto.
 */

import { abrirRepositorioDeIA } from "../src/lib/ia/repositorio.ts";
import { avaliarContraOTeto, resumirMes } from "../src/lib/ia/tetoDeCusto.ts";
import { conteudoDoAvisoDeCusto } from "../src/lib/ia/mensagemDeCusto.ts";
import { criarProvedorResend } from "../src/lib/email/index.ts";
import { administradoresConfigurados } from "../src/lib/auth/plataforma.ts";

/** Mesmo código de `enviar-alertas.ts`: "falta configurar", não "quebrou". */
const SEM_CONFIGURACAO = 78;

const temFlag = (nome: string) => process.argv.includes(`--${nome}`);

function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function main() {
  const simular = temFlag("simular");
  const agora = new Date();

  const repositorio = abrirRepositorioDeIA();
  if (!repositorio) {
    console.log("sem NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados — nada a verificar.");
    process.exit(SEM_CONFIGURACAO);
    return;
  }

  const mes = agora.toISOString().slice(0, 7);
  const linhas = await repositorio.linhasDoMes(agora);
  const resumo = resumirMes(mes, linhas);
  const veredito = avaliarContraOTeto(resumo);

  console.log(`${mes}: ${resumo.execucoes} execução(ões) de IA, ${resumo.falhas} falha(s)`);
  for (const [modelo, r] of Object.entries(resumo.porModelo)) {
    console.log(`  ${modelo}: ${r.execucoes} execução(ões) · ${(r.tokensDeEntrada + r.tokensDeSaida).toLocaleString("pt-BR")} tokens`);
  }

  if (veredito.situacao === "dentro_do_teto") {
    console.log(`dentro do teto: ${emReais(veredito.totalEmCentavosBrl)} (preço conferido em todas as execuções)`);
    return;
  }

  if (veredito.situacao === "sem_preco_conferido") {
    console.log(
      `sem preço conferido em PRECOS_POR_MODELO para ${resumo.execucoesSemPreco} execução(ões) — ` +
        `piso conhecido: ${emReais(veredito.pisoEmCentavosBrl)}. Não é possível confirmar o teto; nenhum e-mail enviado.`,
    );
    return;
  }

  // A partir daqui, `veredito.situacao === "estourou"`.
  console.log(`ESTOUROU: ${emReais(veredito.totalEmCentavosBrl)} acima do teto configurado`);

  const jaAvisado = await repositorio.avisoJaEnviadoNoMes(agora);
  if (jaAvisado) {
    console.log(`${mes} já foi avisado antes — nenhum e-mail novo.`);
    return;
  }

  const admins = administradoresConfigurados(process.env.ADMINS_DA_PLATAFORMA);
  if (admins.length === 0) {
    console.log("ADMINS_DA_PLATAFORMA não configurado — estourou, mas não há para quem mandar.");
    return;
  }

  const conteudo = conteudoDoAvisoDeCusto(resumo, veredito.totalEmCentavosBrl);

  if (simular) {
    console.log(`[SIMULAÇÃO] mandaria "${conteudo.assunto}" para: ${admins.join(", ")}`);
    console.log("[SIMULAÇÃO] nada foi gravado.");
    return;
  }

  const provedor = criarProvedorResend();
  let falhas = 0;
  for (const admin of admins) {
    const envio = await provedor.enviar({ para: admin, assunto: conteudo.assunto, html: conteudo.html, texto: conteudo.texto });
    if (envio.ok) {
      console.log(`enviado para ${admin}`);
    } else {
      falhas++;
      console.error(`falha ao enviar para ${admin}: ${envio.motivo} ${envio.detalhe ?? ""}`);
    }
  }

  if (falhas === admins.length) {
    // Ninguém recebeu o aviso — não registra. Um estouro real que não avisou
    // ninguém deve tentar de novo amanhã, não ser dado como resolvido.
    console.error("nenhum e-mail saiu — não gravado, tenta de novo na próxima execução.");
    process.exitCode = 1;
    return;
  }

  const gravado = await repositorio.registrarAviso(agora, resumo, veredito.totalEmCentavosBrl);
  if (!gravado) {
    console.warn(`${mes}: aviso já estava gravado (outra execução em paralelo?), mas o e-mail saiu de novo.`);
  }

  if (falhas > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
