/**
 * O alerta diário — junta a coleta do dia, a lista de confirmados e o envio.
 *
 *   node scripts/enviar-alertas.ts --simular            (não manda nada, imprime o que mandaria)
 *   node scripts/enviar-alertas.ts                      (manda de verdade)
 *   node scripts/enviar-alertas.ts --editais dados/editais.json
 *
 * Lê o snapshot que `ingerir-pncp.ts` acabou de gravar, e não a API do PNCP.
 * Duas razões, e a segunda é a que importa: coletar de novo dobraria a carga
 * contra um serviço público que já responde 429 no limite atual, e — mais grave
 * — o alerta afirmaria coisas que o site não mostra. Um leitor que clica no
 * e-mail e não acha aquele edital na página regional conclui, com razão, que um
 * dos dois está errado.
 *
 * ## O que este script NÃO faz, e por quê
 *
 * Não decide sozinho se hoje é dia útil. Isso é do agendador: o cron do workflow
 * já roda de segunda a sexta, e replicar a regra aqui criaria dois lugares para
 * ela divergir — o clássico "mudei o cron e continuou mandando sábado".
 *
 * ## A ordem que importa
 *
 * Envia PRIMEIRO, registra DEPOIS. Se o processo morrer no meio, o pior caso é
 * um lead receber o mesmo edital duas vezes na próxima execução. A ordem
 * inversa produziria o pior caso oposto: um edital marcado como enviado que
 * nunca chegou — e ele nunca mais seria reenviado, porque a exclusão é
 * definitiva. E-mail repetido é um incômodo; silêncio permanente sobre um
 * certame é o produto falhando exatamente naquilo que ele promete fazer.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { planejarEnvio } from "../src/lib/alertas/envio.ts";
import { abrirRepositorio, type LeadParaAlerta } from "../src/lib/alertas/repositorio.ts";
import { criarProvedorResend, emHtml, emTextoSimples } from "../src/lib/email/index.ts";
import type { Edital } from "../src/lib/fontes/tipos.ts";

/**
 * Código de saída para "faltou configuração", distinto de "deu errado".
 *
 * 78 é `EX_CONFIG` do `sysexits.h` — convenção antiga o bastante para não ser
 * invenção deste projeto, e específica o bastante para o workflow decidir sem
 * interpretar texto de log.
 *
 * A distinção existe por causa de um modo de falha de gente, não de máquina.
 * Este script roda todo dia útil por agendamento; enquanto os segredos não
 * existirem, ele falharia toda manhã, sempre pelo mesmo motivo conhecido. Falha
 * diária previsível é como se ensina alguém a ignorar o X vermelho — e aí a
 * falha de VERDADE se esconde no meio das outras.
 *
 * A coleta falha alto porque algo deu errado; aqui, algo ainda não foi feito.
 * São coisas diferentes e merecem sinais diferentes: o workflow encerra limpo
 * declarando o que falta, em vez de gritar.
 *
 * Note o que NÃO mudou: sem configuração, nada é simulado e nada finge ter
 * saído. A diferença é só entre avisar e alarmar.
 */
const SEM_CONFIGURACAO = 78;

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const temFlag = (nome: string) => process.argv.includes(`--${nome}`);

/**
 * Idade máxima do snapshot, em horas.
 *
 * A coleta roda uma vez por dia; 36 horas dá folga para um dia em que ela
 * atrasou e recusa o dia em que ela não aconteceu. O modo de falha que isto
 * evita não faz barulho: com snapshot velho o alerta continua saindo, só que
 * sem os editais publicados desde então — e ninguém percebe, porque o e-mail
 * que chega parece normal. É pior que não mandar nada, que ao menos é visível.
 */
const HORAS_ANTES_DE_RECUSAR = 36;

/**
 * Erro que já vem explicado — imprime só a mensagem, sem pilha.
 *
 * A pilha é útil quando o programa quebrou por um defeito; é ruído quando ele
 * parou por uma condição prevista. E aqui a distinção é prática: a primeira
 * coisa que o dono faz, segundo o roadmap, é rodar `npm run alertas:simular` —
 * e receber trinta linhas de `ENOENT ... at async open (node:internal/...)` faz
 * parecer que o projeto está quebrado, quando falta só um arquivo que nem
 * deveria estar no repositório.
 */
class ErroDeOperacao extends Error {}

async function lerEditais(caminho: string, ignorarIdade: boolean): Promise<Edital[]> {
  let bruto: string;
  try {
    bruto = await readFile(caminho, "utf8");
  } catch (e) {
    /*
     * O snapshot é artefato de CI, não arquivo versionado: a coleta o publica a
     * cada execução e o `.gitignore` o mantém fora do repositório de propósito
     * (são megabytes que mudam todo dia). Então "não existe aqui" é o estado
     * NORMAL de um clone novo, e não um defeito — mas só quem já sabe disso
     * consegue ler um ENOENT dessa forma.
     */
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
      throw new ErroDeOperacao(
        `${caminho} não existe — e num clone novo isso é o esperado: o snapshot é ` +
          "artefato da coleta, não arquivo do repositório.\n\n" +
          "Para conseguir um:\n" +
          "  npm run pncp:ingerir -- --uf PE --dias 30     (coleta agora, grava o arquivo)\n" +
          "  gh run download --name snapshot-pncp --dir .  (baixa o da última coleta do CI)\n\n" +
          "Ou aponte para outro caminho com --editais <arquivo>.",
      );
    }
    throw e;
  }

  const snapshot = JSON.parse(bruto) as { editais?: unknown; coletadoEm?: unknown };

  if (!Array.isArray(snapshot.editais)) {
    throw new ErroDeOperacao(
      `${caminho}: sem a lista \`editais\`. É o snapshot de ingerir-pncp.ts?`,
    );
  }

  if (typeof snapshot.coletadoEm === "string") {
    const horas = (Date.now() - Date.parse(snapshot.coletadoEm)) / 3_600_000;
    if (Number.isFinite(horas) && horas > HORAS_ANTES_DE_RECUSAR) {
      const idade = `${Math.round(horas)}h (coletado em ${snapshot.coletadoEm})`;
      if (!ignorarIdade) {
        throw new ErroDeOperacao(
          `snapshot com ${idade}, acima do limite de ${HORAS_ANTES_DE_RECUSAR}h. ` +
            "A coleta de hoje falhou? Nada foi enviado. Use --ignorar-idade para mandar assim mesmo.",
        );
      }
      console.warn(`aviso: snapshot com ${idade} — enviando por --ignorar-idade`);
    }
  }

  return snapshot.editais as Edital[];
}

/** O que aconteceu com cada lead. Vira o relatório do fim. */
type Desfecho = "enviado" | "sem-novidade" | "regiao-ilegivel" | "falha-no-envio";

async function main() {
  const simular = temFlag("simular");
  const caminhoDosEditais = resolve(process.cwd(), arg("editais") ?? "dados/editais.json");

  const editais = await lerEditais(caminhoDosEditais, temFlag("ignorar-idade"));
  console.log(`${editais.length} editais no snapshot (${caminhoDosEditais})`);

  const aberto = abrirRepositorio();
  if (!aberto) {
    console.error(
      "sem NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: não há de onde ler os cadastros. Nada foi enviado.",
    );
    process.exitCode = SEM_CONFIGURACAO;
    return;
  }

  // Rebatizado depois da guarda porque `processar` é uma closure, e o
  // TypeScript não carrega o estreitamento de tipo para dentro dela.
  const repositorio = aberto;

  const provedor = criarProvedorResend();
  const destinatarios = await repositorio.destinatarios();
  console.log(`${destinatarios.length} cadastros confirmados, com cidade e sem descadastro\n`);

  const contagem: Record<Desfecho, number> = {
    enviado: 0,
    "sem-novidade": 0,
    "regiao-ilegivel": 0,
    "falha-no-envio": 0,
  };
  const ilegiveis: string[] = [];
  let editaisEnviados = 0;

  const agora = new Date();

  /**
   * Só I/O daqui para baixo. Quem decide se este lead recebe e-mail — e com
   * quais editais — é `planejarEnvio`, que é puro e testado em
   * `src/lib/alertas/envio.test.ts`.
   */
  async function processar(lead: LeadParaAlerta): Promise<Desfecho> {
    const jaEnviados = await repositorio.jaEnviados(lead.id);
    const plano = planejarEnvio(lead, editais, jaEnviados, agora);

    if (plano.tipo === "regiao-ilegivel") {
      // Não é falha silenciosa: o texto vai para o relatório do fim porque é
      // matéria-prima de produto. Um punhado de "regiao metropolitana de X"
      // repetido é o sinal de que o formulário precisa de outro campo, e esse
      // sinal só existe se alguém o imprimir.
      ilegiveis.push(plano.textoDaCidade);
      return "regiao-ilegivel";
    }

    // A promessa das boas-vindas: dia sem edital novo é dia sem e-mail.
    if (plano.tipo === "sem-novidade") return "sem-novidade";

    const { conteudo, editaisIds } = plano;

    if (simular) {
      console.log(`[simulado] ${lead.email} · ${editaisIds.length} editais · ${conteudo.assunto}`);
      for (const bloco of conteudo.listas) console.log(`           - ${bloco.titulo}`);
      editaisEnviados += editaisIds.length;
      return "enviado";
    }

    const envio = await provedor.enviar({
      para: lead.email,
      assunto: conteudo.assunto,
      html: emHtml(conteudo),
      texto: emTextoSimples(conteudo),
    });

    if (!envio.ok) {
      // Nada é registrado: os editais continuam "não enviados" e voltam na
      // próxima execução. É exatamente o que se quer de uma falha de entrega.
      console.error(`falha ao enviar para ${lead.email}: ${envio.motivo} ${envio.detalhe ?? ""}`);
      return "falha-no-envio";
    }

    const gravadas = await repositorio.registrar(lead.id, editaisIds, envio.id);
    editaisEnviados += editaisIds.length;

    if (gravadas < editaisIds.length) {
      // Só acontece se outra execução tiver gravado o mesmo par antes. Vale um
      // aviso porque significa duas execuções concorrentes — o e-mail saiu duas
      // vezes, e quem opera precisa saber disso hoje, não no mês que vem.
      console.warn(
        `${lead.email}: ${editaisIds.length} editais enviados, ${gravadas} registrados. Outra execução em paralelo?`,
      );
    }

    console.log(`enviado para ${lead.email} · ${editaisIds.length} editais`);
    return "enviado";
  }

  for (const lead of destinatarios) {
    contagem[await processar(lead)] += 1;
  }

  console.log(
    `\n${simular ? "[SIMULAÇÃO] " : ""}${contagem.enviado} e-mails · ${editaisEnviados} editais · ` +
      `${contagem["sem-novidade"]} sem novidade · ${contagem["regiao-ilegivel"]} sem região legível · ` +
      `${contagem["falha-no-envio"]} falharam`,
  );

  if (ilegiveis.length > 0) {
    console.log(`\ncidades que não deram para interpretar (${ilegiveis.length}):`);
    for (const cidade of [...new Set(ilegiveis)]) console.log(`  ${JSON.stringify(cidade)}`);
  }

  // Falha de envio é falha do run. Um cron que termina verde com metade dos
  // e-mails no chão é um cron que ninguém olha.
  if (contagem["falha-no-envio"] > 0) process.exitCode = 1;
}

main().catch((e) => {
  // Condição prevista imprime só o texto; defeito imprime a pilha inteira, que
  // é quando ela serve para alguma coisa.
  console.error(e instanceof ErroDeOperacao ? e.message : e);
  process.exit(1);
});
