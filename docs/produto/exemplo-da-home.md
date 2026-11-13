# Exemplo da página inicial

Em 13/11/2026, o dono pediu um exemplo com mais informações. A seleção anterior
escolhia a leitura integral mais recente. Isso trouxe a dispensa da Câmara de
Coimbra, com garantia, vistoria e amostras sem resposta.

O exemplo editorial agora é a concorrência 001/2026, processo 226/2026, para a
reforma do CMEI Odália Maria Nunes, em Brasilândia do Tocantins/TO. Registro PNCP:
`30793166000173-1-000006/2026`. O valor estimado na publicação foi R$ 409.072,49.
Permanece identificado como histórico, com prazo original encerrado.

A seleção é fixa por ID. Exige resposta e evidência nos cinco campos principais,
documento lido, exigências de habilitação e pontos de atenção. Se a referência
ficar indisponível ou perder esses dados, a seção não inventa um substituto.

## Conferência da fonte

[PDF pesquisável do edital no portal oficial do município](https://transparencia.brasilandiadotocantins.to.gov.br/downloads/1/b6b2676067260211a69740d14ad67bfa19ce01a7d2d254a7c66e89ab603908d6_1786638128.pdf).
Baixado e conferido em 13/11/2026, 93 páginas. Páginas contadas desde a capa:

| Informação | Local no PDF |
| --- | --- |
| Menor preço global | Página 1 |
| Garantia da proposta de 1% e contratual de 5% | Página 9, itens 6.1 e 6.2 |
| Execução em até 120 dias | Página 18, item 18.2 |
| Vistoria facultativa | Página 32, item 6.3 |
| Amostras de materiais durante a execução, para fiscalização | Página 33, item 7.1.1 |
| Índices contábeis e capital mínimo alternativo de 10% | Páginas 39 e 40 |

Corrigido no post do acervo apenas o booleano `visitaTecnicaExigida`: era `true`,
apesar de a evidência já dizer “facultativa”. Agora é `false`, em acordo com a
cláusula e com a exigência individual, que já tinha `obrigatoria: false`.
O conteúdo histórico restante e a data original da análise foram conservados.

A análise automática original é parcial. Esse aviso continua aparecendo ao abrir
a leitura. A conferência editorial das três cláusulas destacadas não altera essa
classificação nem transforma o material em parecer jurídico. As amostras são da
fase de execução, não de envio da proposta. Os cartões da home deixam isso claro
e ligam diretamente às páginas do PDF.

## Verificação

`npm run tipos`, ESLint, testes da demonstração, acervo e voz do texto. O CI roda
a suíte completa, build e os 24 cenários móveis; o cenário da home agora também
recusa campos sem resposta no exemplo expandido.
