# Posicionamento, limites e tratamento de dados

Documento curto de propósito. Ele existe para que qualquer pessoa — ou agente —
que escreva texto, prompt ou tela neste produto saiba o que pode e o que não
pode ser afirmado. As regras abaixo têm teste automatizado onde é possível
testar, e revisão obrigatória onde não é.

## 1. O que o Licitante Vencedor é

Triagem automatizada de editais públicos, com resumo, classificação de aderência
ao perfil da empresa, checklist operacional de documentação e indicação da
próxima ação.

## 2. O que ele não é, e nunca deve parecer ser

Não é parecer jurídico. Não é análise jurídica definitiva. Não substitui
advogado nem contador. Não garante habilitação e não garante vitória.

Frases proibidas em qualquer superfície do produto — interface, e-mail,
WhatsApp, prompt de IA, material de venda:

- "chance de vitória", "probabilidade de ganhar", "você vai ganhar";
- "garantimos", "garantia de habilitação", "aprovação garantida";
- "parecer", "análise jurídica", "conforme a lei você deve";
- qualquer número percentual sobre desfecho de certame.

O teste em `src/lib/alertas/alertas.test.ts` cobre os dois canais de mensagem.
Ele não substitui a revisão de texto de tela — cobre o caminho automatizado, que
é o que escala sem ninguém olhar.

Em qualquer divergência entre o que o produto mostra e o que o edital diz,
**prevalece o edital**. Essa frase aparece no rodapé de todo alerta e precisa
aparecer na página de cada oportunidade.

## 3. A regra da procedência

Está implementada em `src/lib/dominio/procedencia.ts` e é a espinha do
posicionamento. Todo dado que sustenta decisão carrega de onde veio:

| Origem | Significado | Como a interface trata |
| --- | --- | --- |
| `edital` | Está escrito na fonte oficial, com evidência | Pode ser afirmado |
| `perfil` | A empresa declarou | Afirmado como declaração dela, não como fato verificado |
| `inferencia` | Deduzimos, com raciocínio | Sempre com aviso de conferir |
| `desconhecido` | Não foi possível determinar, com motivo | Nunca vira 0, "—" ou `false` |

Consequência prática que atravessa o produto: **ausência de informação nunca é
convertida em afirmação negativa**. Um edital publicado sem valor estimado não é
"pouco aderente"; é um edital cujo valor não sabemos. O motor de score tira o
critério da conta em vez de zerá-lo, e declara a cobertura resultante.

## 4. Documento cadastrado não é documento válido

O checklist tem quatro estados, e não dois, porque a diferença entre "a empresa
declarou que tem" e "está anexado e dentro da validade" é exatamente a diferença
que elimina fornecedor na sessão. O produto nunca afirma validade a partir de
cadastro — ver `src/lib/dominio/checklist.ts`.

## 5. Dados pessoais e empresariais (LGPD)

O que o produto trata, hoje:

- dados de identificação da empresa (CNPJ, razão social, porte, faturamento);
- dados de contato de quem opera a conta (e-mail, telefone para alerta);
- documentos de habilitação enviados pela empresa, que podem conter dado
  pessoal de sócios e responsáveis técnicos;
- registro de uso do produto (o que foi visto, salvo, descartado).

Princípios adotados na arquitetura, não como promessa mas como implementação:

**Minimização.** O onboarding pede o que o motor de recomendação usa, e a razão
de cada campo é exibida ao usuário. Campo que não alimenta nenhuma decisão não
entra no formulário.

**Finalidade.** Dado de empresa é usado para triagem daquela empresa. O uso
agregado para melhorar o produto (o flywheel) só pode acontecer sobre dado de
edital — que é público — e sobre estatística sem identificação de cliente.

**Isolamento.** Nenhuma empresa acessa dado de outra. Está implementado em duas
camadas independentes: a porta de dados exige `empresaId` em toda leitura
(`src/lib/dados/porta.ts`) e o banco tem RLS negando por padrão. Uma camada é a
rede da outra.

**Rastro.** Toda decisão de triagem fica registrada com data, critério e versão
da análise (`src/lib/pipeline/triagem.ts`). Serve ao cliente que pergunta por
que não recebeu um edital, e serve à auditoria.

**Retenção e exclusão.** Decidido em 20/08, implementado em
`src/lib/lgpd/`. Duas trilhas com prazos diferentes, porque respondem a
perguntas diferentes:

- **Carência após cancelamento** (`retencao.ts`): documento de habilitação
  (arquivo + linha) some sozinho 30 dias depois de `assinaturas.encerrada_em`
  — varredura em `scripts/lgpd-purgar-documentos-cancelados.ts`. O histórico
  de triagem não segue este prazo: continua respondendo "por que este edital
  não apareceu" mesmo depois do cancelamento.
- **Pedido explícito de exclusão** (`exclusao.ts`, LGPD art. 18, IX): some
  documento, atestado, perfil declarado e histórico de triagem daquela
  empresa — `scripts/lgpd-excluir-empresa.ts`. O que fica, sob a exceção do
  art. 16, IV (uso exclusivo do controlador): `acoes_na_oportunidade` e
  `eventos_de_auditoria`, que já nasceram sem policy de DELETE para ninguém.

## 6. Onde a IA pode e não pode opinar

A camada de IA extrai e estrutura o que está no documento. Ela não decide se a
empresa deve participar — quem faz isso é o motor determinístico de score, que é
auditável linha a linha e não muda de resposta entre duas execuções.

Extração sem evidência é descartada: se o modelo afirma que o edital exige
garantia mas não devolve o trecho que sustenta, o campo vira `desconhecido`. É
mais caro em recall e é a única postura defensável quando o erro custa uma
habilitação.
