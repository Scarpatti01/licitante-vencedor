# Ligando a captura de leads

O blog captura o e-mail; este documento é o outro lado do fio. Enquanto
`LEADS_DESTINO` não existir, a rota `/api/alerta/` responde 503 e a página diz ao
visitante que o cadastro não está aberto — que é honesto e não capta ninguém.

> **O que está em produção hoje: `LEADS_DESTINO=supabase`.** A captura grava na
> tabela `leads` do Postgres. A planilha do Google continua existindo, com o
> histórico intacto, mas **não recebe mais nada**.

O arranjo com planilha veio primeiro e está documentado aqui embaixo por inteiro
— ele continua sendo um caminho válido para quem for começar sem banco, e a
[lição que fez a gente sair dele](#por-que-a-planilha-deixou-de-ser-o-destino)
vale mais que o script.

**Os dois destinos falam o mesmo contrato**, definido em `src/lib/leads-destinos.ts`:
gravar, confirmar, descadastrar. Trocar de um para o outro é mudar uma variável
de ambiente; nenhuma linha de código muda.

**Este documento descreve a versão com double opt-in.** Preencher o formulário
não põe ninguém na lista: põe na fila de pendentes, e quem entra de fato é quem
clica no link do e-mail de confirmação.

## O destino em produção: Postgres

Projeto Supabase **Licitante Vencedor**, região `sa-east-1` (São Paulo, perto de
quem usa o site). A tabela nasce da migração
`supabase/migrations/20260814110000_leads_do_site.sql`, e o que ela garante é o
que a planilha não garantia:

| Garantia | Como |
| --- | --- |
| Um e-mail, uma linha | `unique (email)` |
| Token inadivinhável e único | `unique (token)` + `check` de formato |
| Busca por token em tempo constante | índice da unicidade, não varredura |
| Ninguém lê a tabela pelo navegador | RLS ligada **sem nenhuma policy**: nega tudo para `anon` e `authenticated`; só a `service_role`, no servidor, entra |
| A lista de envio é o caminho barato | índice parcial `leads_confirmados` — mandar para quem não confirmou é também o caminho caro |

As três variáveis na Vercel:

```
LEADS_DESTINO             = supabase
NEXT_PUBLIC_SUPABASE_URL  = https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY = <chave de serviço>          # Sensitive
```

`SUPABASE_SERVICE_ROLE_KEY` ignora RLS: ela é a chave que abre a tabela inteira e
nunca pode sair do servidor. `src/lib/leads-destinos.ts` é `server-only`
justamente para o compilador recusar um import dela no cliente.

E a quarta, que não é do destino mas sem a qual a lista não anda:
`RESEND_API_KEY`. Sem ela o lead é gravado e o link de confirmação nunca sai — o
site diz isso ao visitante em vez de fingir que o e-mail está a caminho.

### Consultando os leads

Não há tela de administração ainda. As duas consultas que respondem quase tudo:

```sql
-- quem de fato está na lista
select email, cidade, origem, confirmado_em from leads
where confirmado_em is not null and descadastrado_em is null
order by confirmado_em desc;

-- qual conteúdo converte
select origem, count(*) as cadastros, count(confirmado_em) as confirmados
from leads group by origem order by cadastros desc;
```

## A planilha (o arranjo anterior)

> A partir daqui o documento descreve o destino `webhook`, que **não está mais em
> uso em produção**. Está mantido porque o caminho continua no código, porque a
> planilha guarda o histórico dos primeiros cadastros, e porque quem for repetir
> este arranjo em outro projeto precisa das armadilhas listadas no fim.

Já criada: **Licitante Vencedor — Leads do site**. O cabeçalho tinha sete
colunas; o double opt-in acrescentou três, nas posições **H**, **I** e **J**:

| A | B | C | D | E | F | G | H | I | J |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recebido em (Brasília) | Timestamp ISO | E-mail | Cidade de interesse | Origem | Página | Posição da captura | Token | Confirmado em | Descadastrado em |

`Página` e `Posição` saem da quebra de `Origem` (`blog/como-saber-se-saiu-uma-licitacao#captura-4`
vira `blog/como-saber-se-saiu-uma-licitacao` + `captura-4`). É o que permite
responder, sem planilha dinâmica, duas perguntas que decidem onde investir em
conteúdo: **qual texto traz cadastro** e **se a captura do meio converte mais que
a do fim**.

`Token`, `Confirmado em` e `Descadastrado em` são o double opt-in. **A regra que
governa a planilha inteira, e a única que importa na hora de enviar:**

> Só recebe e-mail quem tem `Confirmado em` preenchido **e** `Descadastrado em`
> vazio. Toda linha fora desse recorte é gente que não confirmou (pode ser
> endereço de terceiro, pode ser erro de digitação) ou gente que pediu para sair.

A ordem das colunas é contrato: o script grava por posição. Inserir uma coluna no
meio quebra a gravação em silêncio — colunas novas vão para o fim, depois de `J`.

## O Apps Script

Na planilha: **Extensões → Apps Script**, apague o conteúdo e cole o código
abaixo. Ele é a única peça que precisa de ação manual — a API do Apps Script não
permite publicar um app da web por integração.

```javascript
/**
 * Recebe os leads do site do Licitante Vencedor e grava na planilha.
 *
 * Publicado como app da web com acesso "qualquer pessoa", porque a rota do site
 * chama sem estar autenticada no Google. Isso torna a URL alcançável por quem a
 * descobrir, e é por isso que existe o TOKEN: sem ele, qualquer um enche a
 * planilha de lixo e envenena a única métrica que diz qual conteúdo converte.
 *
 * O token viaja na QUERY STRING, e não em cabeçalho, porque app da web do Apps
 * Script não expõe os cabeçalhos da requisição ao `doPost`. Não é elegante; é o
 * que a plataforma permite. A URL inteira, com token, é segredo e mora só na
 * variável de ambiente da Vercel.
 *
 * ATENÇÃO: o TOKEN acima é o segredo do webhook, um só, do site inteiro. Não
 * confundir com a coluna `Token` da planilha, que é um valor POR LEAD e serve
 * para identificar quem clicou no link de confirmação ou de descadastro. São
 * coisas diferentes com o mesmo nome, e trocá-las abriria o webhook para
 * qualquer um que tivesse recebido um e-mail nosso.
 */
const TOKEN = 'COLE_AQUI_UM_SEGREDO_LONGO';

/** As colunas, 1-based, na ordem do cabeçalho. Mexer aqui exige mexer na planilha. */
const COL = {
  RECEBIDO: 1,
  ISO: 2,
  EMAIL: 3,
  CIDADE: 4,
  ORIGEM: 5,
  PAGINA: 6,
  POSICAO: 7,
  TOKEN: 8,
  CONFIRMADO: 9,
  DESCADASTRADO: 10,
};

function doPost(e) {
  if (!e || e.parameter.token !== TOKEN) return texto_('nao autorizado');

  var corpo;
  try {
    corpo = JSON.parse(e.postData.contents);
  } catch (erro) {
    return texto_('corpo invalido');
  }

  // Sem `acao`, é cadastro. O padrão preserva o formato antigo de chamada e faz
  // uma coisa de cada vez na hora de migrar.
  var acao = corpo.acao || 'cadastrar';

  /*
   * A trava cobre as TRÊS ações, e não só a gravação.
   *
   * Dois visitantes cadastrando no mesmo segundo escreveriam na mesma linha sem
   * ela, e um dos dois leads sumiria sem deixar rastro. Confirmar e descadastrar
   * são "ler, decidir, escrever", que é pior: dois cliques simultâneos no mesmo
   * link poderiam sobrescrever a data de consentimento um do outro.
   */
  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    if (acao === 'cadastrar') return cadastrar_(corpo);
    if (acao === 'confirmar') return carimbar_(corpo.token, COL.CONFIRMADO);
    if (acao === 'descadastrar') return carimbar_(corpo.token, COL.DESCADASTRADO);
    return texto_('acao desconhecida');
  } finally {
    trava.releaseLock();
  }
}

/** Grava o lead. Nasce PENDENTE: `Confirmado em` só é preenchido pelo clique no e-mail. */
function cadastrar_(lead) {
  if (!lead.email) return texto_('sem email');
  // Lead sem token é lead que nunca vai conseguir confirmar nem sair da lista.
  // Recusar agora é melhor do que descobrir isso quando alguém pedir para sair.
  if (!lead.token) return texto_('sem token');

  var origem = String(lead.origem || 'desconhecida');
  var partes = origem.split('#');

  aba_().appendRow([
    agora_(),
    lead.recebidoEm || '',
    lead.email,
    lead.cidade || '',
    origem,
    partes[0],
    partes[1] || '',
    lead.token,
    '', // Confirmado em
    '', // Descadastrado em
  ]);

  return texto_('ok');
}

/**
 * Carimba a data numa coluna, uma vez só, na linha do token.
 *
 * Responde JSON — e não texto puro como o cadastro — porque o site precisa
 * distinguir quatro desfechos e ainda receber o e-mail e a cidade da linha, que
 * é o que permite mandar as boas-vindas sem uma segunda chamada.
 *
 * `ja-estava` NÃO é erro: o mesmo link é clicado duas vezes com frequência, e
 * vários antivírus corporativos abrem todo link da mensagem antes de entregá-la.
 * Sobrescrever a data original nesses casos apagaria o registro de quando o
 * consentimento foi de fato dado.
 */
function carimbar_(token, coluna) {
  var aba = aba_();
  var linha = linhaDoToken_(aba, String(token || ''));
  if (!linha) return json_({ situacao: 'token-desconhecido' });

  var email = String(aba.getRange(linha, COL.EMAIL).getValue());
  var cidade = String(aba.getRange(linha, COL.CIDADE).getValue());
  var jaEstava = String(aba.getRange(linha, coluna).getValue()).trim() !== '';

  if (!jaEstava) aba.getRange(linha, coluna).setValue(agora_());

  /*
   * Descadastro vale para a PESSOA, não para a linha.
   *
   * A planilha não deduplica: quem se cadastrou duas vezes tem duas linhas, com
   * tokens diferentes. Marcar só a linha do link usado deixaria a outra ativa —
   * a pessoa clicaria em "não quero mais receber", continuaria recebendo, e da
   * segunda vez usaria o botão de spam. Essa denúncia não tira só ela da lista:
   * derruba a entrega para todos os outros assinantes.
   */
  if (coluna === COL.DESCADASTRADO) descadastrarTudoDe_(aba, email);

  return json_({ situacao: jaEstava ? 'ja-estava' : 'feito-agora', email: email, cidade: cidade });
}

/** A linha do token, ou 0. Varredura simples: para o volume de um site que começa, sobra. */
function linhaDoToken_(aba, token) {
  if (!token) return 0;
  var ultima = aba.getLastRow();
  if (ultima < 2) return 0;

  var tokens = aba.getRange(2, COL.TOKEN, ultima - 1, 1).getValues();
  for (var i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]) === token) return i + 2; // +2: linha 1 é cabeçalho
  }
  return 0;
}

/** Marca como descadastradas TODAS as linhas do mesmo e-mail que ainda estejam ativas. */
function descadastrarTudoDe_(aba, email) {
  var alvo = String(email || '').trim().toLowerCase();
  var ultima = aba.getLastRow();
  if (!alvo || ultima < 2) return;

  var quantidade = ultima - 1;
  var emails = aba.getRange(2, COL.EMAIL, quantidade, 1).getValues();
  var intervalo = aba.getRange(2, COL.DESCADASTRADO, quantidade, 1);
  var saidas = intervalo.getValues();
  var carimbo = agora_();
  var mudou = false;

  for (var i = 0; i < quantidade; i++) {
    var mesmo = String(emails[i][0]).trim().toLowerCase() === alvo;
    if (mesmo && String(saidas[i][0]).trim() === '') {
      saidas[i][0] = carimbo;
      mudou = true;
    }
  }

  if (mudou) intervalo.setValues(saidas);
}

function aba_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function agora_() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
}

function texto_(t) {
  return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.TEXT);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Rode UMA vez, à mão, para dar token aos leads capturados ANTES do double opt-in.
 *
 * No editor do Apps Script: escolha `darTokenAosLeadsAntigos` na lista de
 * funções e clique em **Executar**. Sem isto, as linhas antigas ficam com a
 * coluna `Token` vazia e ninguém consegue confirmar nem sair por link.
 *
 * Isto NÃO confirma ninguém — de propósito. Ver "O que fazer com os leads
 * antigos", mais abaixo.
 */
function darTokenAosLeadsAntigos() {
  var aba = aba_();
  var ultima = aba.getLastRow();
  if (ultima < 2) return;

  var intervalo = aba.getRange(2, COL.TOKEN, ultima - 1, 1);
  var tokens = intervalo.getValues();
  for (var i = 0; i < tokens.length; i++) {
    // `getUuid` tem 122 bits de aleatoriedade e o formato passa na validação do
    // site (`tokenPlausivel`, em `src/lib/leads.ts`).
    if (String(tokens[i][0]).trim() === '') tokens[i][0] = Utilities.getUuid();
  }
  intervalo.setValues(tokens);
}
```

Troque `COLE_AQUI_UM_SEGREDO_LONGO` por um segredo de verdade (30+ caracteres
aleatórios), salve, e publique:

**Implantar → Nova implantação → Tipo: App da Web**
- *Executar como*: **Eu** — é o que dá ao script permissão de escrever na planilha.
- *Quem pode acessar*: **Qualquer pessoa**. Atenção: *"Qualquer pessoa com uma
  Conta do Google"* **não serve** — a Vercel chama o endereço sem estar logada em
  conta nenhuma, e a chamada morre num `401` antes de chegar ao script.

O Google pede autorização na primeira vez e mostra um aviso de app não
verificado — é o seu próprio script, siga em **Avançado → Acessar**.

Copie a URL gerada. Ela termina em `/exec`.

> **Salvar o código não publica o código.** A implantação fica presa a uma
> *versão* congelada: você edita o script, salva, e o endereço continua servindo
> o código antigo. Toda vez que mexer no arquivo — inclusive para trocar o
> `TOKEN` — repita **Implantar → Gerenciar implantações → ✏️ → Versão: Nova
> versão → Implantar**.
>
> Use **Gerenciar implantações** e não **Nova implantação**: editar a existente
> preserva a URL, enquanto criar outra gera um endereço novo e obriga a atualizar
> a variável na Vercel.

## Migrando a planilha que já está no ar

A captura está funcionando em produção com sete colunas e o script antigo. Estes
cinco passos, **nesta ordem**, ligam o double opt-in sem perder nenhum lead. Leva
uns dez minutos.

**1. Crie as três colunas novas.** Na planilha, escreva nas células `H1`, `I1` e
`J1`, exatamente: `Token`, `Confirmado em`, `Descadastrado em`. Não insira coluna
no meio: o script grava por posição, e um deslocamento faria o e-mail cair na
coluna da cidade sem nenhum erro aparecer.

**2. Substitua o código.** Extensões → Apps Script, apague tudo, cole o código
desta página. Recoloque o seu `TOKEN` — o segredo do webhook, o mesmo que está na
URL da Vercel. Salve.

**3. Publique.** **Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão
→ Implantar**. Salvar não publica; sem este passo o endereço continua servindo o
código antigo, e o site vai reclamar (com razão) que o destino não sabe
confirmar.

**4. Dê token aos leads antigos.** No editor, escolha `darTokenAosLeadsAntigos`
na lista de funções e clique em **Executar**. Ele preenche a coluna `Token` das
linhas que estão vazias e não toca em mais nada.

**5. Confira.** Cadastre-se pelo site com um e-mail seu. Deve aparecer uma linha
nova com `Token` preenchido e `Confirmado em` **vazio**, e um e-mail de
confirmação deve chegar. Clique no link: a coluna `Confirmado em` ganha a data.
Clique no link de descadastro do rodapé: `Descadastrado em` ganha a data.

### O que fazer com os leads antigos

Aqui não há resposta técnica, e é bom que se diga com todas as letras: **os leads
capturados antes desta mudança nunca confirmaram**. O passo 4 dá a eles um token,
o que os torna capazes de confirmar e de sair — não os torna confirmados. A
coluna `Confirmado em` deles continua vazia de propósito, e a regra de envio
("só quem tem `Confirmado em`") os deixa de fora.

São três caminhos, em ordem de recomendação:

1. **Mandar um único e-mail de confirmação para cada um**, explicando que ele se
   cadastrou no site em tal data (a coluna `Recebido em` tem a data) e pedindo o
   clique. Quem clicar entra na lista limpo. Quem não clicar, sai. É o caminho
   correto e o que custa: parte da lista não volta.
2. **Responder à mão**, um a um, se forem poucos. Lead capturado e não respondido
   esfria em dias — e uma conversa vale mais que um cadastro.
3. **Apagar.** Se a lista for pequena e antiga, a opção honesta é aceitar que ela
   não vale o risco.

O que **não** é opção é passar a enviar para eles como se tivessem confirmado.
Foi exatamente para não fazer isso que o double opt-in existe.

## As variáveis na Vercel (destino planilha)

**Project → Settings → Environment Variables**, marcadas para *Production*,
*Preview* e *Development*:

```
LEADS_DESTINO      = webhook
LEADS_WEBHOOK_URL  = https://script.google.com/macros/s/AKfy…/exec?token=SEU_SEGREDO
```

Uma lição de operação que custou caro: **`LEADS_DESTINO` não deve ser marcada
como *Sensitive***. Ela não é segredo — o valor é a palavra `supabase` ou
`webhook` —, e marcá-la assim esconde justamente o campo que você vai precisar
conferir quando a captura estiver gravando no lugar errado. `LEADS_WEBHOOK_URL`
e a chave de serviço, essas sim, são segredo.

O token vai **na URL**, pelo motivo explicado no comentário do script. Isso torna
`LEADS_WEBHOOK_URL` um segredo: ela não pode aparecer em log, em issue nem em
captura de tela.

Estas duas fazem a captura gravar. **O double opt-in precisa de uma terceira**, a
do provedor de e-mail (`RESEND_API_KEY`, ver `src/lib/email/`): sem ela o lead é
gravado, mas o link de confirmação nunca sai e ninguém entra na lista. O site diz
isso ao visitante em vez de fingir que o e-mail está a caminho.

Depois de salvar, é preciso **redeploy** para as variáveis valerem. O código lê
`LEADS_DESTINO` a cada requisição (e não em constante de módulo) justamente para
mudanças de configuração não exigirem build — mas a Vercel só injeta a variável
em deploys criados depois dela existir.

## Como conferir que funcionou

Abra qualquer artigo ou guia, preencha o formulário e veja a linha aparecer no
destino — a tabela `leads` hoje, a planilha no arranjo antigo. Se algo estiver
errado, o site **não** diz "cadastrado":

| O que o visitante vê | O que aconteceu |
| --- | --- |
| "O cadastro ainda não está aberto" | `LEADS_DESTINO` ausente; ou `supabase` sem a URL/chave; ou `webhook` sem `LEADS_WEBHOOK_URL` |
| "Não conseguimos registrar agora" | o destino respondeu erro ou não respondeu — no webhook: token errado, implantação antiga, script com erro |
| "Muitas tentativas seguidas" | limite de 5 por minuto por origem |
| "Falta um clique" | a linha está gravada **e** o e-mail de confirmação saiu |
| "Recebemos seu cadastro, mas o e-mail de confirmação não saiu" | a linha está gravada e o provedor de e-mail falhou ou não está configurado |

**O 503 e o 500 dizem coisas diferentes de propósito.** 503 é configuração
ausente — ninguém foi gravado e ninguém deveria ter sido. 500 é destino
configurado que falhou. Confundir os dois faz procurar bug onde falta variável.

A última linha é a que costuma assustar e não deveria: ela significa que o lead
está salvo e que o site **não** mentiu para o visitante. O motivo aparece no log
da Vercel (`[alerta] lead gravado mas confirmação não enviada`).

### Conferindo a confirmação e o descadastro

Depois de cadastrar, o e-mail traz dois links, e vale clicar nos dois num
endereço de teste:

| O que fazer | O que a tela deve dizer | O que o destino deve mostrar |
| --- | --- | --- |
| Clicar em "Confirmar meu e-mail" | "E-mail confirmado" | `confirmado_em` com data |
| Clicar no mesmo link de novo | "Este e-mail já estava confirmado" | a data **não** muda |
| Editar o `?t=` para um valor inventado | "Não encontramos um cadastro para este link" | nada muda |
| Clicar em "Não quero mais receber" | "Você não recebe mais nossos e-mails" | `descadastrado_em` com data (na planilha, em **todas** as linhas daquele e-mail) |

Este é exatamente o roteiro que foi rodado contra produção depois da troca para o
Postgres, e os seis passos passaram — inclusive o segundo clique preservando a
data original do consentimento.

Se o segundo clique zerar ou reescrever a data, a implantação publicada é a
antiga — o script novo nunca sobrescreve carimbo existente.

### Testando o webhook direto, sem passar pelo site

Vale conferir o endpoint isolado antes de mexer na Vercel — separa o problema em
metade do tempo:

```bash
URL="https://script.google.com/macros/s/…/exec?token=SEU_TOKEN"

# 1. cadastrar
curl -sS -L "$URL" -H 'content-type: application/json' \
  --data '{"acao":"cadastrar","email":"teste@exemplo.com","cidade":"TESTE","origem":"teste/manual","token":"token-de-teste-com-mais-de-22-chars"}'

# 2. confirmar (duas vezes: a segunda deve dizer "ja-estava")
curl -sS -L "$URL" -H 'content-type: application/json' \
  --data '{"acao":"confirmar","token":"token-de-teste-com-mais-de-22-chars"}'

# 3. descadastrar
curl -sS -L "$URL" -H 'content-type: application/json' \
  --data '{"acao":"descadastrar","token":"token-de-teste-com-mais-de-22-chars"}'
```

Não use `-X POST`. O `/exec` responde `302` para outro domínio, e o `-X` força o
método também no redirecionamento — o destino só aceita GET e devolve um `405`
enganoso, que parece defeito da implantação e não é. Sem o `-X`, o `curl` troca
para GET no salto sozinho, que é exatamente o que o `fetch` do site faz.

| Resposta | Significado |
| --- | --- |
| `ok` | gravou; confira a linha na planilha |
| `{"situacao":"feito-agora",…}` | confirmou (ou descadastrou) neste momento |
| `{"situacao":"ja-estava",…}` | o carimbo já existia; a data original foi preservada |
| `{"situacao":"token-desconhecido"}` | nenhuma linha tem esse token na coluna `Token` |
| `nao autorizado` | o `TOKEN` do script não é o que está na URL — ou o código novo não foi implantado |
| `sem email` / `sem token` | token certo, corpo incompleto |
| `acao desconhecida` | `acao` fora de `cadastrar`/`confirmar`/`descadastrar` |
| `401` + HTML de login | acesso não está em "Qualquer pessoa" |

**O sintoma de implantação antiga**: uma chamada com `acao: "confirmar"` responde
`ok` em vez de JSON. O script velho não conhece `acao`, trata tudo como cadastro
e grava uma linha de lixo. O site reconhece esse `ok` como falha justamente para
não dizer "confirmado" sobre nada — mas quem conserta é o passo 3 da migração.

O log do servidor na Vercel traz o status devolvido pelo webhook em caso de
falha. O visitante nunca vê esse detalhe, de propósito.

## Por que a planilha deixou de ser o destino

Não foi por limite de volume, e vale registrar o motivo real: **o Apps Script tem
um passo de publicação que não avisa quando é esquecido, e nenhuma API para
automatizá-lo.**

O que aconteceu na prática, na ordem:

1. O código novo foi colado no editor e salvo. A função de migração foi executada
   com sucesso — prova de que o código novo estava lá.
2. Mas o app da web continuou servindo a **versão anterior**. Salvar não publica;
   publicar exige *Implantar → Gerenciar implantações → ✏️ → Nova versão*.
3. O sintoma não foi um erro. Foi um `201` do site, o lead na planilha e a coluna
   `Token` **vazia** — e a confirmação falhando depois, longe da causa.

Três diagnósticos e dois redeploys depois, a conclusão foi que o problema não era
o script: era um passo manual, invisível quando esquecido, num sistema que
nenhuma ferramenta do projeto consegue inspecionar. Toda depuração dependia de
alguém olhar uma tela e descrever o que via.

O Postgres não é melhor por ser Postgres. É melhor porque o estado dele é
**legível por quem está consertando**: dá para ver a linha, o token e o carimbo
sem pedir print para ninguém. Quando a captura falhou de novo depois da troca, a
causa apareceu numa consulta de dez segundos.

A lição, que vale além deste caso: **prefira o componente cujo estado você
consegue ler, e não o que é mais fácil de montar.** Facilidade de montagem se
paga uma vez; opacidade se paga em toda falha.

## Limites conhecidos do arranjo com planilha

**A planilha não deduplica.** O destino Supabase tem `unique (email)`; aqui, o
mesmo e-mail cadastrando duas vezes vira duas linhas, cada uma com seu token.
O descadastro contorna isso marcando todas as linhas do mesmo endereço — mas a
confirmação não: confirmar por um link deixa a outra linha pendente. Na prática
não atrapalha (uma linha confirmada já basta para a pessoa estar na lista), e é
mais um motivo para o envio ser feito com a planilha **deduplicada por e-mail**.

**A busca por token é uma varredura da coluna.** Cada confirmação lê a coluna
`Token` inteira. Com milhares de linhas isso começa a doer, e a resposta é o
Postgres — que tem índice único por token — e não um script mais esperto.

**Apps Script tem cota diária** de execuções e de tempo. Ela agora é gasta por
três operações e não uma: cadastrar, confirmar e descadastrar. Para o volume de
um site que começa, ainda sobra.

**O double opt-in depende do provedor de e-mail.** Sem `RESEND_API_KEY`, o lead é
gravado e a tela diz, com todas as letras, que a confirmação **não** foi enviada
— e ninguém confirma, porque ninguém recebe o link. A captura continua
funcionando; a lista é que não anda. Enquanto for assim, alguém precisa olhar a
planilha e responder à mão, o que vale mais do que parece: lead capturado e não
respondido esfria em dias.

**Quem se descadastrou e volta a se cadastrar ganha uma linha nova.** No Supabase
o cadastro antigo é reaberto com token novo; aqui a linha antiga fica marcada
como descadastrada e a nova nasce pendente. É o comportamento certo (ela precisa
confirmar de novo), mas quem for enviar precisa lembrar da regra: **dedup por
e-mail, ficando com a linha mais recente**.
