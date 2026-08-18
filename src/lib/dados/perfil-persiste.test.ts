import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RepositorioDeDemonstracao, EMPRESA_DE_DEMONSTRACAO, ehDemonstracao } from "./demonstracao";
import { RepositorioSupabase } from "./supabase";
import { PERFIL_COMPLETO } from "../dominio/exemplos";
import type { PerfilDaEmpresa } from "../dominio/tipos";

/**
 * O cadastro da empresa é gravado, e continua gravado.
 *
 * ## O defeito
 *
 * Reportado assim: **"depois que eu preencho tudo e avanço, a tela seguinte diz
 * que eu não preenchi os campos"**. Nenhuma das três suspeitas óbvias era o
 * caso — os `name` batiam, os botões de navegação eram `type="button"`, e as
 * seções escondidas com `hidden` enviam normalmente.
 *
 * O que havia era isto: `repositorio()` devolvia SEMPRE o repositório de
 * demonstração, um `Map` dentro de uma instância criada por `cache()` do React
 * — que nasce e morre com a requisição. A gravação era aceita, respondia
 * "Cadastro salvo", e a próxima requisição relia `null`. Em produção,
 * `perfis_da_empresa` tinha zero linhas com o produto no ar e `empresas` já com
 * o tenant criado.
 *
 * O que transformou "não salvou" em "diz que não preenchi" foi o React 19:
 * `<form action={fn}>` reseta o formulário a cada envio — `requestFormReset` é
 * agendado em `startHostTransition` antes mesmo de a ação rodar. Todo campo
 * voltava ao `defaultValue`, que vinha de um perfil eternamente nulo, e o envio
 * seguinte saía sem CNPJ, sem razão social e sem porte. A validação recusava,
 * corretamente, campos que o usuário tinha preenchido e a tela tinha apagado.
 *
 * ## Por que nada pegou
 *
 * Tipos, lint, 764 testes e o build estavam todos verdes, e continuariam: o
 * defeito não era um erro em nenhuma camada, era uma camada AUSENTE. A porta de
 * dados tinha uma implementação só, e ela era a de demonstração. Daí a forma
 * dos testes abaixo — eles cobram COMPORTAMENTO da implementação sobre
 * Postgres, e não a existência de um arquivo.
 */

const FONTE_DO_INDEX = readFileSync(join("src", "lib", "dados", "index.ts"), "utf8");
const MIGRACAO = readFileSync(
  join("supabase", "migrations", "20260817120000_salvar_perfil_da_empresa.sql"),
  "utf8",
);
const FONTE_DO_SUPABASE = readFileSync(join("src", "lib", "dados", "supabase.ts"), "utf8");

/** Cliente Supabase de mentira, com o mínimo que a implementação usa. */
function clienteFalso(opcoes: {
  linha?: Record<string, unknown> | null;
  erroDaLeitura?: { message: string } | null;
  erroDaRpc?: { message: string } | null;
}) {
  const chamadas: { rpc: { nome: string; argumentos: Record<string, unknown> }[] } = { rpc: [] };

  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    maybeSingle: async () => ({
      data: opcoes.linha ?? null,
      error: opcoes.erroDaLeitura ?? null,
    }),
  };

  const cliente = {
    from: () => consulta,
    rpc: async (nome: string, argumentos: Record<string, unknown>) => {
      chamadas.rpc.push({ nome, argumentos });
      return { data: null, error: opcoes.erroDaRpc ?? null };
    },
  };

  // O tipo real do cliente é enorme e nada dele importa aqui; o que importa é
  // que a implementação chame `rpc` com o nome e o corpo certos.
  return { cliente: cliente as never, chamadas };
}

const EMPRESA_REAL = "e0728737-d84e-4980-b575-60f24e2ea7f8";

const PERFIL: PerfilDaEmpresa = {
  ...PERFIL_COMPLETO,
  empresaId: EMPRESA_REAL,
};

describe("a porta de dados tem uma implementação que persiste", () => {
  /**
   * A guarda direta contra a volta do defeito.
   *
   * Enquanto `repositorio()` puder devolver a demonstração sem olhar para a
   * configuração, o produto inteiro volta a gravar em memória.
   */
  it("`repositorio()` escolhe o Postgres quando há configuração", () => {
    // O CORPO da função, não o arquivo: um `import` de `RepositorioSupabase`
    // deixado para trás satisfaria uma busca no arquivo inteiro enquanto a
    // função voltava a devolver a demonstração — foi o que aconteceu ao testar
    // esta guarda contra o defeito real.
    const corpo = FONTE_DO_INDEX.slice(
      FONTE_DO_INDEX.indexOf("export const repositorio"),
      FONTE_DO_INDEX.indexOf("export const empresaAtual"),
    );

    expect(
      /new RepositorioSupabase\(/.test(corpo),
      "`repositorio()` voltou a não construir a implementação sobre Postgres. " +
        "Com só a de demonstração disponível, o onboarding grava num Map que " +
        "morre com a requisição — e o usuário é devolvido à primeira etapa em " +
        "branco, com a mensagem de que não preencheu os campos obrigatórios.",
    ).toBe(true);

    // A demonstração continua sendo a resposta certa SEM configuração; o que
    // não pode voltar é ela ser a resposta única.
    expect(corpo).toMatch(/if\s*\(!supabase\)\s*return new RepositorioDeDemonstracao\(\)/);
  });

  it("a gravação chama a função que grava as quatro tabelas numa transação", async () => {
    const { cliente, chamadas } = clienteFalso({});
    await new RepositorioSupabase(cliente).salvarPerfil(PERFIL);

    expect(chamadas.rpc).toHaveLength(1);
    expect(chamadas.rpc[0].nome).toBe("salvar_perfil_da_empresa");
    expect(chamadas.rpc[0].argumentos.p_empresa_id).toBe(EMPRESA_REAL);
  });

  /** O nome da função é um contrato entre dois arquivos que ninguém compila junto. */
  it("o nome chamado é o nome criado na migração", () => {
    const chamado = FONTE_DO_SUPABASE.match(/\.rpc\(\s*"([^"]+)"/)?.[1];
    expect(chamado).toBeTruthy();
    expect(
      MIGRACAO.includes(`create or replace function public.${chamado}(`),
      `\`supabase.ts\` chama \`${chamado}\`, que a migração não cria. Um erro ` +
        `deste tipo não aparece em tipo nem em build: só em produção, como ` +
        `"não conseguimos gravar o cadastro agora".`,
    ).toBe(true);
  });

  /**
   * `arquivoAnexado` é derivado de `caminho_no_storage` por coluna gerada,
   * porque "declaração não é anexo" precisa ser impossível de violar — e não
   * apenas combinado. Mandá-lo daqui reabriria a porta que a coluna fechou.
   */
  it("a gravação não oferece ao cliente a chance de afirmar que anexou arquivo", async () => {
    const { cliente, chamadas } = clienteFalso({});
    await new RepositorioSupabase(cliente).salvarPerfil({
      ...PERFIL,
      documentos: [
        { tipo: "fgts", descricao: null, validoAte: "2026-12-31", semValidade: false, arquivoAnexado: true },
      ],
    });

    const corpo = JSON.stringify(chamadas.rpc[0].argumentos.p_perfil);
    expect(corpo).not.toMatch(/arquivoAnexado/);
    expect(MIGRACAO).not.toMatch(/insert into public\.documentos_da_empresa[\s\S]{0,300}arquivo_anexado/);
  });

  /**
   * Falha de gravação LANÇA. `acoes.ts` captura e devolve "não conseguimos
   * gravar" para a tela — o único desfecho aceitável é o usuário saber. Engolir
   * aqui produziria "Cadastro salvo" sobre um cadastro que não existe, que é
   * exatamente o defeito que este arquivo existe para não deixar voltar.
   */
  it("gravação que falha não passa por salva", async () => {
    const { cliente } = clienteFalso({ erroDaRpc: { message: "permission denied" } });
    await expect(new RepositorioSupabase(cliente).salvarPerfil(PERFIL)).rejects.toThrow(
      /permission denied/,
    );
  });

  /**
   * A leitura faz o oposto, e de propósito: o layout do produto lê o perfil em
   * toda página, e lançar ali derrubaria a área logada inteira por uma
   * indisponibilidade momentânea do banco. "Não consegui ler" e "ainda não
   * existe" levam ao mesmo lugar seguro — cadastro não iniciado.
   */
  it("leitura que falha devolve `null` em vez de derrubar a página", async () => {
    const { cliente } = clienteFalso({ erroDaLeitura: { message: "timeout" } });
    expect(await new RepositorioSupabase(cliente).perfil(EMPRESA_REAL)).toBeNull();
  });
});

describe("o que o Postgres devolve vira o tipo do domínio sem perder sentido", () => {
  const LINHA = {
    cnpj: "07462953000110",
    razao_social: "Never Conservadora e Dedetizadora LTDA.",
    nome_fantasia: "Imunidex",
    perfis_da_empresa: {
      porte: "me",
      faturamento_anual: "480000.50",
      cnaes: ["8122200"],
      palavras_chave: ["dedetizacao"],
      palavras_excluidas: [],
      ufs_atendidas: ["RJ"],
      municipios_prioritarios: ["3304557"],
      ticket_minimo: "5000.00",
      ticket_maximo: null,
      modalidades_aceitas: ["pregao_eletronico"],
      atualizado_em: "2026-08-17T12:00:00.000Z",
    },
    documentos_da_empresa: [
      {
        tipo: "fgts",
        descricao: null,
        valido_ate: "2026-12-31",
        sem_validade: false,
        arquivo_anexado: false,
      },
    ],
    atestados: [{ objeto: "Dedetização de escolas", valor: "82000.00", orgao: "SME-RJ", ano: 2025 }],
  };

  /**
   * `numeric` chega como STRING no PostgREST — a biblioteca prefere entregar o
   * texto exato a arredondar em silêncio, porque `numeric` guarda mais precisão
   * do que um `double` de JavaScript representa. Sem a conversão, `ticketMinimo`
   * seria `"5000.00"` e toda comparação de faixa do motor de score passaria a
   * comparar texto.
   */
  it("`numeric` vira número, e ausente continua ausente", async () => {
    const { cliente } = clienteFalso({ linha: LINHA });
    const perfil = await new RepositorioSupabase(cliente).perfil(EMPRESA_REAL);

    expect(perfil?.faturamentoAnual).toBe(480000.5);
    expect(perfil?.ticketMinimo).toBe(5000);
    // Regra 2 de `leitura.ts`, valendo na volta: não informado não vira zero, ou
    // o motor passaria a tratar "não quis dizer" como fato declarado.
    expect(perfil?.ticketMaximo).toBeNull();
  });

  it("identidade e listas chegam montadas", async () => {
    const { cliente } = clienteFalso({ linha: LINHA });
    const perfil = await new RepositorioSupabase(cliente).perfil(EMPRESA_REAL);

    expect(perfil?.cnpj).toBe("07462953000110");
    expect(perfil?.razaoSocial).toBe("Never Conservadora e Dedetizadora LTDA.");
    expect(perfil?.documentos).toEqual([
      {
        tipo: "fgts",
        descricao: null,
        validoAte: "2026-12-31",
        semValidade: false,
        arquivoAnexado: false,
      },
    ]);
    expect(perfil?.atestados[0]).toEqual({
      objeto: "Dedetização de escolas",
      valor: 82000,
      orgao: "SME-RJ",
      ano: 2025,
    });
  });

  /**
   * Empresa criada e onboarding não feito é um estado normal, não um erro:
   * `perfil()` responde `null`, e o layout mostra "Cadastro não iniciado".
   */
  it("empresa sem perfil devolve `null`, e não um perfil pela metade", async () => {
    const { cliente } = clienteFalso({ linha: { ...LINHA, perfis_da_empresa: null } });
    expect(await new RepositorioSupabase(cliente).perfil(EMPRESA_REAL)).toBeNull();
  });

  /**
   * E é exatamente aí que a identidade importa: sem ela, quem acabou de criar a
   * empresa reencontra CNPJ e razão social em branco na primeira etapa do
   * assistente — os dois campos que `/cadastrar-empresa/` pediu dois cliques
   * antes.
   */
  it("sem perfil, a identidade da empresa ainda responde", async () => {
    const { cliente } = clienteFalso({
      linha: { cnpj: "07462953000110", razao_social: "Never", nome_fantasia: null },
    });
    expect(await new RepositorioSupabase(cliente).identidade(EMPRESA_REAL)).toEqual({
      cnpj: "07462953000110",
      razaoSocial: "Never",
      nomeFantasia: null,
    });
  });
});

describe("a empresa de demonstração continua na demonstração", () => {
  /**
   * O visitante sem conta cai em `EMPRESA_DE_DEMONSTRACAO`, cujo id nem uuid é.
   * Consultar Postgres por ele devolveria nada e apagaria o produto justamente
   * para quem está decidindo se cria conta.
   */
  it("id `EXEMPLO-` não vai ao banco", async () => {
    const { cliente, chamadas } = clienteFalso({ linha: null });
    const repo = new RepositorioSupabase(cliente);

    const perfil = await repo.perfil(EMPRESA_DE_DEMONSTRACAO);
    expect(perfil?.empresaId).toBe(EMPRESA_DE_DEMONSTRACAO);

    await repo.salvarPerfil({ ...PERFIL_COMPLETO, razaoSocial: "Mexida" });
    expect(chamadas.rpc, "a empresa de exemplo não pode escrever no Postgres").toHaveLength(0);
  });

  it("`EMPRESA_DE_DEMONSTRACAO` carrega o prefixo que a separa de um tenant real", () => {
    // Se o id de exemplo deixar de começar em `EXEMPLO-`, o desvio acima para de
    // acontecer e a demonstração passa a consultar — e a escrever — no banco.
    expect(EMPRESA_DE_DEMONSTRACAO.startsWith("EXEMPLO-")).toBe(true);
  });
});

describe("a faixa de aviso continua dizendo a verdade", () => {
  /**
   * Desde que a triagem por perfil existe (18/08), `RepositorioSupabase` serve
   * as duas coisas: o visitante sem conta continua na empresa de demonstração,
   * com editais `EXEMPLO-` e a faixa de aviso; o tenant com CNPJ real vê
   * `oportunidades` de verdade — mesmo vazias, quando a triagem não achou nada
   * — e a faixa não pode mais aparecer para ele. Um `instanceof
   * RepositorioDeDemonstracao` responderia igual para os dois, que é
   * exatamente o que `oportunidadesSimuladas` virou método (por empresa) para
   * evitar.
   */
  it("o aviso continua para a empresa de demonstração, some para o tenant real", () => {
    const { cliente } = clienteFalso({});
    const supabase = new RepositorioSupabase(cliente);

    expect(ehDemonstracao(supabase, EMPRESA_DE_DEMONSTRACAO)).toBe(true);
    expect(ehDemonstracao(supabase, EMPRESA_REAL)).toBe(false);
    expect(ehDemonstracao(new RepositorioDeDemonstracao(), EMPRESA_REAL)).toBe(true);
  });

  /** E o texto do aviso precisa distinguir os dois casos que hoje convivem. */
  it("só o tenant real recebe a frase de que o cadastro fica", () => {
    const { cliente } = clienteFalso({});
    const supabase = new RepositorioSupabase(cliente);

    expect(supabase.cadastroPersiste(EMPRESA_REAL)).toBe(true);
    expect(supabase.cadastroPersiste(EMPRESA_DE_DEMONSTRACAO)).toBe(false);
    expect(new RepositorioDeDemonstracao().cadastroPersiste()).toBe(false);
  });
});

describe("o que precisa mudar quando o upload de arquivo entrar", () => {
  /**
   * A gravação apaga e reinsere os atestados, porque atestado não tem chave
   * natural — dois contratos iguais no mesmo órgão e ano são duas linhas
   * legítimas e indistinguíveis. O preço é perder `atestados.documento_id`, o
   * vínculo com o PDF.
   *
   * Hoje o preço é zero: nada preenche `caminho_no_storage`, então não existe
   * PDF para vincular. No dia em que existir, apagar e reinserir passa a
   * desligar o anexo de todo atestado a cada salvamento do perfil — e o usuário
   * descobre isso ao abrir a habilitação, não ao salvar.
   *
   * Este teste é o alarme: ele quebra no commit que ligar o upload.
   */
  it("enquanto nada anexa arquivo, apagar e reinserir atestado não custa nada", () => {
    const fontes = [
      "src/lib/dados/supabase.ts",
      "src/components/perfil/leitura.ts",
      "supabase/migrations/20260817120000_salvar_perfil_da_empresa.sql",
    ].map((caminho) => readFileSync(caminho, "utf8"));

    const alguemEscreve = fontes.some((f) => /caminho_no_storage\s*(=|,)/.test(f));

    expect(
      alguemEscreve,
      "alguém passou a escrever `caminho_no_storage` — ou seja, o upload de " +
        "documento entrou. A partir daí, `salvar_perfil_da_empresa` NÃO pode " +
        "mais apagar e reinserir `atestados`: cada salvamento do perfil " +
        "desligaria o PDF de todo atestado, e o usuário só descobriria na " +
        "habilitação. Troque por reconciliação e atualize este teste.",
    ).toBe(false);
  });
});
