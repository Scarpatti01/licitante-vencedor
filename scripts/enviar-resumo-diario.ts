/**
 * Envia o resumo diário para as empresas cadastradas.
 *
 *   node --conditions=react-server scripts/enviar-resumo-diario.ts --simular
 *   node --conditions=react-server scripts/enviar-resumo-diario.ts
 *
 * ## Não é o alerta gratuito
 *
 * `enviar-alertas.ts` manda para LEADS, recortando por cidade, com a linha crua
 * do portal. Este manda para EMPRESAS, recortando pelo perfil, ordenado por
 * aderência, e dizendo de cada edital se o documento foi lido.
 *
 * Os dois existem separados de propósito. São públicos diferentes, com
 * consentimentos diferentes: o lead deu duplo opt-in num formulário público e
 * sai por um link com token; a empresa contratou e desliga o canal na tela dela.
 * Juntá-los num script só economizaria linhas e misturaria as duas regras de
 * consentimento, que é onde este tipo de sistema erra feio.
 *
 * ## E não recoleta
 *
 * Lê `oportunidades`, que a triagem já gravou. Recoletar aqui dobraria a carga
 * sobre o PNCP e — pior — poderia afirmar no e-mail coisas que o painel não
 * mostra, porque as duas leituras aconteceriam em momentos diferentes.
 */

import { abrirRepositorioDoResumo } from "../src/lib/resumo/repositorio.ts";
import { planejarResumoDiario } from "../src/lib/resumo/plano.ts";
import { emHtml, emTextoSimples } from "../src/lib/email/mensagens.ts";
import { criarProvedorResend } from "../src/lib/email/resend.ts";

/** `EX_CONFIG`. Ver o cabeçalho de `enviar-alertas.ts` para o porquê deste código. */
const SEM_CONFIGURACAO = 78;

const temFlag = (nome: string) => process.argv.includes(`--${nome}`);
const arg = (nome: string): string | undefined => {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

type Desfecho = "enviado" | "sem-novidade" | "falha-no-envio";

async function main(): Promise<void> {
  const simular = temFlag("simular");
  const agora = new Date();

  const repositorio = abrirRepositorioDoResumo();
  if (!repositorio) {
    console.log(
      "faltam credenciais do banco. Defina NEXT_PUBLIC_SUPABASE_URL e " +
        "SUPABASE_SERVICE_ROLE_KEY.\n\nNada foi enviado, e nada finge ter saído.",
    );
    process.exitCode = SEM_CONFIGURACAO;
    return;
  }

  /*
   * As praças que a coleta não alcançou hoje, passadas por parâmetro.
   *
   * Vem de `dados/parciais/classificacao.json` — o workflow lê e repassa. O
   * script NÃO abre o arquivo sozinho de propósito: assim ele roda igual à mão,
   * sem depender de um artefato baixado, e o caminho é uma decisão de quem
   * chama, não uma suposição de quem executa.
   */
  const ufsAusentes = (arg("ufs-ausentes") ?? "")
    .split(",")
    .map((uf) => uf.trim().toUpperCase())
    .filter(Boolean);

  if (ufsAusentes.length > 0) {
    console.log(`praças fora da coleta de hoje: ${ufsAusentes.join(", ")}\n`);
  }

  const empresas = await repositorio.destinatarias();
  console.log(`${empresas.length} empresa(s) com perfil, e-mail e canal ligado\n`);

  const provedor = criarProvedorResend();
  const contagem: Record<Desfecho, number> = { enviado: 0, "sem-novidade": 0, "falha-no-envio": 0 };
  let editaisEnviados = 0;

  for (const empresa of empresas) {
    const [oportunidades, jaEnviados] = await Promise.all([
      repositorio.oportunidadesDe(empresa.id),
      repositorio.jaEnviados(empresa.id),
    ]);

    const plano = planejarResumoDiario(
      {
        empresa: empresa.nome,
        email: empresa.email,
        ufsAtendidas: empresa.ufsAtendidas,
        leituraInclusaNoPlano: empresa.leituraInclusaNoPlano,
        oportunidades,
        jaEnviados,
        ufsAusentes,
        preferencias: empresa.preferencias,
      },
      agora,
    );

    if (plano.tipo === "sem-novidade") {
      // A promessa: dia sem edital novo é dia sem e-mail — inclusive quando o
      // motivo de não haver edital foi a coleta não alcançar a praça.
      console.log(`  ${empresa.nome.padEnd(28)} sem novidade`);
      contagem["sem-novidade"]++;
      continue;
    }

    if (simular) {
      console.log(`  ${empresa.nome.padEnd(28)} ${plano.editaisIds.length} edital(is) — SIMULAÇÃO`);
      for (const item of plano.conteudo.listas[0].itens) console.log(`      ${item.rotulo}`);
      for (const linha of plano.conteudo.fecho) console.log(`      · ${linha}`);
      contagem.enviado++;
      editaisEnviados += plano.editaisIds.length;
      continue;
    }

    const resultado = await provedor.enviar({
      para: empresa.email,
      assunto: plano.conteudo.assunto,
      html: emHtml(plano.conteudo),
      texto: emTextoSimples(plano.conteudo),
    });

    if (!resultado.ok) {
      console.error(`  ${empresa.nome.padEnd(28)} FALHA (${resultado.motivo}) ${resultado.detalhe ?? ""}`);
      contagem["falha-no-envio"]++;
      continue;
    }

    /*
     * Grava DEPOIS do envio, e só quando ele deu certo.
     *
     * A ordem inversa perderia editais em silêncio: marcado como enviado, o
     * edital nunca mais entra num resumo, e o cliente jamais saberia que existiu
     * algo aderente ao perfil dele naquele dia.
     */
    await repositorio.registrar(empresa.id, plano.editaisIds, resultado.id);
    console.log(`  ${empresa.nome.padEnd(28)} ${plano.editaisIds.length} edital(is) enviado(s)`);
    contagem.enviado++;
    editaisEnviados += plano.editaisIds.length;
  }

  console.log(
    `\n${contagem.enviado} enviado(s) · ${contagem["sem-novidade"]} sem novidade · ` +
      `${contagem["falha-no-envio"]} falha(s) · ${editaisEnviados} edital(is) no total`,
  );

  if (contagem["falha-no-envio"] > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
