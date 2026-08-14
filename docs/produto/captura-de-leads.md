# Ligando a captura de leads numa planilha

O blog captura o e-mail; este documento é o outro lado do fio. Enquanto
`LEADS_DESTINO` não existir, a rota `/api/alerta/` responde 503 e a página diz ao
visitante que o cadastro não está aberto — que é honesto e não capta ninguém.

O destino escolhido para começar é uma **planilha do Google com um Apps Script na
frente**. Três razões: não entra fornecedor novo na conta, não custa nada, e a
planilha é o formato em que o dono do negócio realmente olha lead. Quando o
Postgres existir, trocar para `LEADS_DESTINO=supabase` é uma variável de
ambiente — nenhuma linha de código muda.

## A planilha

Já criada: **Licitante Vencedor — Leads do site**, com o cabeçalho na primeira
linha:

| Recebido em (Brasília) | Timestamp ISO | E-mail | Cidade de interesse | Origem | Página | Posição da captura |
| --- | --- | --- | --- | --- | --- | --- |

`Página` e `Posição` saem da quebra de `Origem` (`blog/como-saber-se-saiu-uma-licitacao#captura-4`
vira `blog/como-saber-se-saiu-uma-licitacao` + `captura-4`). É o que permite
responder, sem planilha dinâmica, duas perguntas que decidem onde investir em
conteúdo: **qual texto traz cadastro** e **se a captura do meio converte mais que
a do fim**.

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
 */
const TOKEN = 'COLE_AQUI_UM_SEGREDO_LONGO';

function doPost(e) {
  if (!e || e.parameter.token !== TOKEN) {
    return ContentService.createTextOutput('nao autorizado').setMimeType(
      ContentService.MimeType.TEXT,
    );
  }

  var lead;
  try {
    lead = JSON.parse(e.postData.contents);
  } catch (erro) {
    return ContentService.createTextOutput('corpo invalido').setMimeType(
      ContentService.MimeType.TEXT,
    );
  }

  if (!lead.email) {
    return ContentService.createTextOutput('sem email').setMimeType(
      ContentService.MimeType.TEXT,
    );
  }

  // Dois visitantes cadastrando no mesmo segundo escreveriam na mesma linha sem
  // isto, e um dos dois leads sumiria sem deixar rastro.
  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var origem = String(lead.origem || 'desconhecida');
    var partes = origem.split('#');

    aba.appendRow([
      Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
      lead.recebidoEm || '',
      lead.email,
      lead.cidade || '',
      origem,
      partes[0],
      partes[1] || '',
    ]);
  } finally {
    trava.releaseLock();
  }

  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
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

## As variáveis na Vercel

**Project → Settings → Environment Variables**, marcadas para *Production*,
*Preview* e *Development*:

```
LEADS_DESTINO      = webhook
LEADS_WEBHOOK_URL  = https://script.google.com/macros/s/AKfy…/exec?token=SEU_SEGREDO
```

O token vai **na URL**, pelo motivo explicado no comentário do script. Isso torna
`LEADS_WEBHOOK_URL` um segredo: ela não pode aparecer em log, em issue nem em
captura de tela.

Depois de salvar, é preciso **redeploy** para as variáveis valerem. O código lê
`LEADS_DESTINO` a cada requisição (e não em constante de módulo) justamente para
mudanças de configuração não exigirem build — mas a Vercel só injeta a variável
em deploys criados depois dela existir.

## Como conferir que funcionou

Abra qualquer artigo ou guia, preencha o formulário e veja a linha aparecer na
planilha. Se algo estiver errado, o site **não** diz "cadastrado":

| O que o visitante vê | O que aconteceu |
| --- | --- |
| "O cadastro ainda não está aberto" | `LEADS_DESTINO` ausente, ou `webhook` sem `LEADS_WEBHOOK_URL` |
| "Não conseguimos registrar agora" | o webhook respondeu erro ou não respondeu — token errado, implantação antiga, script com erro |
| "Muitas tentativas seguidas" | limite de 5 por minuto por origem |
| Confirmação de cadastro | a linha está na planilha |

### Testando o webhook direto, sem passar pelo site

Vale conferir o endpoint isolado antes de mexer na Vercel — separa o problema em
metade do tempo:

```bash
curl -sS -L "https://script.google.com/macros/s/…/exec?token=SEU_TOKEN" \
  -H 'content-type: application/json' \
  --data '{"email":"teste@exemplo.com","cidade":"TESTE","origem":"teste/manual"}'
```

Não use `-X POST`. O `/exec` responde `302` para outro domínio, e o `-X` força o
método também no redirecionamento — o destino só aceita GET e devolve um `405`
enganoso, que parece defeito da implantação e não é. Sem o `-X`, o `curl` troca
para GET no salto sozinho, que é exatamente o que o `fetch` do site faz.

| Resposta | Significado |
| --- | --- |
| `ok` | gravou; confira a linha na planilha |
| `nao autorizado` | o `TOKEN` do script não é o que está na URL — ou o código novo não foi implantado |
| `sem email` | token certo, corpo sem o campo `email` |
| `401` + HTML de login | acesso não está em "Qualquer pessoa" |

O log do servidor na Vercel traz o status devolvido pelo webhook em caso de
falha. O visitante nunca vê esse detalhe, de propósito.

## Limites conhecidos deste arranjo

**A planilha não deduplica.** O destino Supabase tem `unique (email)`; aqui, o
mesmo e-mail cadastrando duas vezes vira duas linhas. Para poucos leads isso é
irrelevante e resolver na planilha é trivial.

**Apps Script tem cota diária** de execuções e de tempo. Para o volume de um
site que começa, sobra. Se o volume crescer a ponto de esbarrar nela, o problema
é bom e a resposta é o Postgres, não um script maior.

**Não há confirmação de e-mail (double opt-in).** Quem digitar o e-mail de
outra pessoa consegue cadastrá-la. Antes de começar a enviar de verdade, isso
precisa existir — está no roadmap junto do provedor de envio.

**O lead capturado não recebe nada ainda.** Não há provedor de e-mail
configurado. Enquanto não houver, alguém precisa olhar a planilha — e responder
manualmente vale muito mais do que parece: lead capturado e não respondido
esfria em dias.
