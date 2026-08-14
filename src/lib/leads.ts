/**
 * Captura de interessados no alerta.
 *
 * O ponto que governa este arquivo: **um formulário que aceita e-mail sem ter
 * onde guardá-lo é pior do que nenhum formulário**. O visitante acredita que se
 * cadastrou, e o lead evapora sem que ninguém saiba. Por isso a captura só se
 * apresenta como funcional quando há destino configurado; sem destino, a página
 * mostra outro caminho de contato em vez de fingir que registrou.
 *
 * O destino é uma decisão de infraestrutura ainda em aberto neste projeto — hoje
 * o site não tem banco nem serviço de e-mail. Quando houver, implementar
 * `gravarLead` é a única mudança necessária: nada mais no site sabe onde o lead
 * vai parar.
 *
 * ## Double opt-in
 *
 * Cadastrar não é mais o fim da história. Quem preenche o formulário entra na
 * lista **pendente**; a lista de verdade é a de quem clicou no link do e-mail de
 * confirmação. A razão é dupla e nenhuma das duas é burocrática:
 *
 * 1. **Qualquer um digita o e-mail de outra pessoa.** Sem confirmação, o site
 *    vira ferramenta de assinar terceiro em lista que ele não pediu — e a vítima
 *    não tem por que acreditar que foi um estranho; ela denuncia como spam.
 * 2. **Erro de digitação entra na lista e nunca sai.** `joao@gmial.com` recebe
 *    envio para sempre, contando como entrega falhada em toda campanha e
 *    derrubando a reputação do domínio para quem digitou certo.
 *
 * O que liga as duas pontas é o token: opaco, gerado no servidor, gravado junto
 * do lead, e único identificador nas duas ações públicas (confirmar e
 * descadastrar). Ele não carrega o e-mail dentro — ver `gerarToken`.
 */

export type Lead = {
  email: string;
  /** Município de interesse, texto livre — o visitante escreve como quiser. */
  cidade: string | null;
  /** De qual página veio, para saber qual LP converte. */
  origem: string;
  recebidoEm: string;
  /**
   * Token opaco que identifica este lead nas ações públicas.
   *
   * Gerado por `gerarToken` antes de gravar, e não pelo destino: o e-mail de
   * confirmação precisa do token no mesmo instante em que o lead é gravado, e
   * um destino que só devolvesse o identificador depois obrigaria a gravar
   * primeiro e completar depois — dois passos, com o lead capaz de existir sem
   * link de confirmação no intervalo.
   */
  token: string;
};

export type ResultadoCaptura =
  | {
      ok: true;
      /**
       * O token que de fato identifica o lead no destino.
       *
       * Quase sempre é o mesmo de `Lead.token`. Não é quando o e-mail já estava
       * cadastrado: o destino Supabase absorve o segundo cadastro em vez de
       * duplicar (`resolution=ignore-duplicates`), e a linha mantém o token da
       * primeira vez. Enviar o token recém-gerado nesse caso produziria um link
       * de confirmação morto justo para quem se cadastrou duas vezes — que é
       * gente interessada, não gente distraída.
       */
      token: string;
    }
  | {
      ok: false;
      motivo: "sem-destino" | "invalido" | "falha";
      /**
       * Diagnóstico curto para quem opera — nunca para o visitante.
       *
       * Existe porque "não conseguimos registrar agora" é a mensagem certa para
       * quem preencheu o formulário e a mensagem inútil para quem precisa
       * consertar. Sem isto, descobrir por que um lead não gravou vira tentativa
       * e erro contra a configuração, com um redeploy por palpite.
       *
       * Regra: descreve a FORMA do problema, nunca o segredo. Pode dizer que o
       * destino respondeu 404; não pode dizer qual é a URL nem o token.
       */
      detalhe?: string;
    };

/**
 * O que uma ação pública sobre um lead produziu.
 *
 * São quatro estados e cada um vira uma tela diferente, o que é a razão de
 * existirem separados. Achatar tudo em booleano custaria caro justamente nos
 * casos torcidos:
 *
 * - `feito-agora` — a ação valeu neste clique. É a única que manda enviar
 *   boas-vindas.
 * - `ja-estava` — o link foi clicado duas vezes, ou o cliente de e-mail
 *   pré-carregou antes da pessoa. **Não é erro**, e mostrar erro aqui faria
 *   alguém que já está confirmado achar que precisa se cadastrar de novo.
 * - `token-desconhecido` — link truncado pelo cliente de e-mail, editado à mão,
 *   ou de um cadastro que não existe mais. A tela precisa oferecer saída.
 * - `falha` — o destino não respondeu ou recusou. Nada foi decidido sobre o
 *   lead, e a tela tem de dizer isso em vez de inventar sucesso ou fracasso.
 */
export type ResultadoDaAcao =
  | { situacao: "feito-agora"; lead?: IdentificacaoDoLead }
  | { situacao: "ja-estava"; lead?: IdentificacaoDoLead }
  | { situacao: "token-desconhecido" }
  | { situacao: "falha"; detalhe?: string };

/**
 * O mínimo do lead que a ação devolve.
 *
 * Serve para montar o e-mail de boas-vindas sem uma segunda consulta, e é
 * opcional porque nem todo destino consegue devolver — planilha com script
 * antigo, por exemplo. Sem estes dados a confirmação continua valendo; só o
 * e-mail de boas-vindas deixa de sair, o que é degradação e não mentira.
 */
export type IdentificacaoDoLead = {
  email: string;
  cidade: string | null;
};

/**
 * Tamanho do token, em bytes de aleatoriedade real.
 *
 * 32 bytes = 256 bits. É mais do que a matemática exige (o alvo é ser
 * inadivinhável, e 128 bits já bastariam), e o excesso custa 43 caracteres numa
 * URL que ninguém digita à mão. O que não é aceitável é o contrário: token curto
 * num link público que confirma cadastro e cancela inscrição de terceiro.
 */
const BYTES_DO_TOKEN = 32;

/**
 * Gera o token que identifica o lead nas ações públicas.
 *
 * **Opaco de propósito.** Não é o e-mail codificado, não é um hash do e-mail,
 * não é sequencial. Se o token derivasse do endereço, qualquer pessoa que
 * soubesse o e-mail de alguém — e todo mundo sabe o e-mail de alguém —
 * conseguiria montar o link de descadastro dessa pessoa. E como o token viaja
 * em URL, ele aparece em log de servidor, em histórico de navegador e no
 * `Referer` de qualquer link clicado a partir da página: o que ele revelar,
 * revelou para todos esses lugares. Não revelando nada, não há o que vazar
 * além da própria capacidade de confirmar ou sair da lista.
 *
 * Usa a Web Crypto global (`crypto.getRandomValues`) e não `node:crypto` porque
 * este módulo também é importado pelo cliente por causa de `emailPlausivel`;
 * um import de módulo do Node no topo arrastaria a barreira de servidor para
 * qualquer componente que só quisesse validar um formato de e-mail.
 *
 * O alfabeto é base64url — sem `+`, `/` nem `=`. Base64 comum sobrevive à URL,
 * mas não sobrevive a clientes de e-mail que reescrevem link: o `+` vira espaço
 * do outro lado e o descadastro falha exatamente para quem já decidiu sair.
 */
export function gerarToken(): string {
  const bytes = new Uint8Array(BYTES_DO_TOKEN);
  crypto.getRandomValues(bytes);

  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);

  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * O valor tem forma de token?
 *
 * Existe para a tela recusar lixo sem gastar uma ida ao destino. Um `?t=` vazio,
 * o texto `undefined` que algum cliente de e-mail cola quando o link quebra, ou
 * uma tentativa de injeção não merecem uma consulta ao banco nem uma execução do
 * Apps Script — e, sem esta porta, um robô varrendo a URL de descadastro
 * consumiria a cota do script até derrubar a captura.
 *
 * A faixa é folgada porque tokens de tamanhos diferentes vão conviver: o novo
 * tem 43 caracteres, e os leads antigos da planilha recebem um UUID de 36 na
 * migração descrita em `docs/produto/captura-de-leads.md`.
 */
export function tokenPlausivel(valor: unknown): valor is string {
  return typeof valor === "string" && /^[A-Za-z0-9_-]{22,64}$/.test(valor);
}

/**
 * Validação de e-mail deliberadamente simples.
 *
 * Regex de e-mail "completa" é folclore: as que circulam rejeitam endereços
 * válidos e aceitam inválidos. O que dá para afirmar sem errar é o formato
 * grosseiro; o resto quem valida é o envio.
 */
export function emailPlausivel(valor: string): boolean {
  const v = valor.trim();
  if (v.length < 6 || v.length > 254) return false;
  if (/\s/.test(v)) return false;
  const partes = v.split("@");
  if (partes.length !== 2) return false;
  const [local, dominio] = partes;
  if (!local || !dominio) return false;
  if (!dominio.includes(".")) return false;
  if (dominio.startsWith(".") || dominio.endsWith(".") || dominio.includes("..")) return false;
  return true;
}

/**
 * Há destino configurado para os leads?
 *
 * Lido no servidor a cada chamada, e não em constante de módulo, para que
 * configurar a variável de ambiente passe a valer sem exigir novo build.
 */
export function capturaConfigurada(): boolean {
  return Boolean(process.env.LEADS_DESTINO);
}

/**
 * Grava o lead no destino configurado.
 *
 * Os destinos vivem em `leads-destinos.ts` — este arquivo continua sem saber
 * onde o lead vai parar, que era a propriedade que valia a pena preservar. O
 * contrato também não mudou: qualquer falha devolve `ok: false`, para a página
 * nunca dizer "cadastrado" sem que o registro exista de fato.
 *
 * O import é dinâmico porque `leads-destinos.ts` é `server-only`, e este módulo
 * exporta `emailPlausivel`, que é útil no cliente. Carregar estaticamente
 * arrastaria a barreira de servidor para qualquer componente que só quisesse
 * validar um e-mail.
 */
export async function gravarLead(lead: Lead): Promise<ResultadoCaptura> {
  if (!capturaConfigurada()) return { ok: false, motivo: "sem-destino" };

  const destino = await abrirDestino();

  // `LEADS_DESTINO` preenchido mas sem as credenciais do destino escolhido é
  // erro de configuração, não ausência de destino — e o visitante merece a
  // mesma mensagem honesta dos dois jeitos.
  if (!destino) return { ok: false, motivo: "sem-destino" };

  return destino.gravar(lead);
}

/**
 * Confirma o cadastro identificado pelo token.
 *
 * Chamada pela página `/confirmar/`, sem sessão e sem login: quem clica no link
 * do e-mail não está autenticado em nada, e exigir conta para confirmar
 * e-mail inverteria a ordem das coisas.
 */
export async function confirmarLead(token: unknown): Promise<ResultadoDaAcao> {
  return acaoSobreLead(token, (destino, t) => destino.confirmar(t));
}

/**
 * Tira da lista o cadastro identificado pelo token.
 *
 * Um clique, sem login, sem tela de "tem certeza?". A tentação de pedir
 * confirmação extra aqui existe e é errada: quem não consegue sair em um clique
 * clica em "isto é spam", e denúncia de spam não tira só aquela pessoa da lista
 * — ela derruba a entrega dos e-mails de todos os outros assinantes, inclusive
 * dos que querem receber. Atrito no descadastro é caro e o preço é cobrado de
 * terceiros.
 */
export async function descadastrarLead(token: unknown): Promise<ResultadoDaAcao> {
  return acaoSobreLead(token, (destino, t) => destino.descadastrar(t));
}

/**
 * O que confirmar e descadastrar têm em comum: a porta e a recusa antecipada.
 *
 * Token malformado nem chega ao destino. É o que impede que uma varredura na URL
 * pública vire carga no banco ou queima da cota diária do Apps Script.
 */
async function acaoSobreLead(
  token: unknown,
  executar: (destino: import("./leads-destinos").Destino, token: string) => Promise<ResultadoDaAcao>,
): Promise<ResultadoDaAcao> {
  if (!tokenPlausivel(token)) return { situacao: "token-desconhecido" };
  if (!capturaConfigurada()) return { situacao: "falha", detalhe: "captura sem destino configurado" };

  const destino = await abrirDestino();
  if (!destino) return { situacao: "falha", detalhe: "captura sem destino configurado" };

  return executar(destino, token);
}

/**
 * O import é dinâmico porque `leads-destinos.ts` é `server-only` — a mesma razão
 * explicada em `gravarLead`, isolada aqui para não se repetir em três lugares.
 */
async function abrirDestino() {
  const { destinoAtual } = await import("./leads-destinos");
  return destinoAtual();
}
