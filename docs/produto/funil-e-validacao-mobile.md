# Funil de ativação e validação em telas pequenas

## Onde consultar

`/administracao/funil/`, usando uma conta incluída em `ADMINS_DA_PLATAFORMA`.
A mesma proteção é verificada no layout e na página. A rota não é indexável.
Escolha os últimos 7, 30 ou 90 dias. Cada etapa conta a mesma coorte de e-mails
cadastrados nesse período, uma vez por pessoa: cadastro, confirmação, conta
confirmada, criação da empresa, palavras-chave salvas e ação em oportunidade.
Contas anteriores ao cadastro ou com outro e-mail não são atribuídas à coorte.

As assinaturas ativas com referência externa ficam separadas: alguém pode
assinar antes de interagir com uma oportunidade. Status ativo não é apuração de
receita recebida. Testes não entram nessa contagem.

Visitas e páginas de entrada continuam no Web Analytics já instalado. Não
associamos visitantes anônimos a contas. As taxas do painel começam no cadastro,
incluem pedidos de materiais e não representam uma taxa individual de visita
para venda. Filtros e assinaturas refletem o estado atual dos registros.

## Dados e limites

O servidor usa as APIs administrativas existentes e devolve somente totais ao
componente da tela. Não acrescenta cookies, eventos de navegação, tabelas,
funções privilegiadas ou permissões no banco. A credencial de serviço nunca é
enviada ao navegador. A consulta de contas só ocorre quando há cadastros
confirmados e aproveita apenas ID, e-mail e datas necessários à atribuição.

Consultas são paginadas, com teto de 2.000 linhas por leitura. Se o teto for
atingido, a tela informa falha e não calcula percentuais sobre uma base parcial.
Erro, ausência de configuração e zero conversões são estados distintos.
Ausência de denominador aparece como "Sem base".

## Validação móvel

`npm run build` e depois `npm run test:mobile`.
Instale o navegador com `npx playwright install --with-deps chromium`.

O CI executa 24 cenários em Chromium: larguras 320, 360, 390 e 430 pixels,
nos temas claro e escuro. Os cenários verificam rolagem horizontal da página,
busca e fechamento das sugestões, abertura da análise, rolagem da comparação
de planos e validação/erro do formulário. A captura de e-mail é interceptada:
nenhum cadastro nem e-mail real é criado nos testes.

As capturas ficam no artefato `validacao-mobile` da execução do GitHub Actions,
junto do relatório Playwright. É emulação de navegador, não teste em aparelhos
físicos nem certificação de comportamento no Safari nativo.

Uma inspeção inicial também renderizou offline o HTML e CSS públicos em
56 combinações de página, largura, tema e análise aberta, sem rolagem indevida.
Essa inspeção não substitui os cenários com JavaScript executados pelo CI.
