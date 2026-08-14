# Revisão da coleta

> **Correção retroativa.** O bloco de cobertura deste relatório foi regerado.
> A versão publicada originalmente afirmava que as 6 UFs solicitadas "não estão
> representadas nos números abaixo" — mas PE e AL foram interrompidas DEPOIS de
> entregar editais, e são justamente as duas únicas representadas nos 150. O
> defeito estava na cobertura, que só tinha dois estados (coletada / falhou) e
> classificava UF interrompida como falha total; ver `src/lib/fontes/cobertura.ts`.
> Os números não mudaram: são os mesmos de `dados/agregados.json`, medidos na
> coleta. O que mudou foi a declaração sobre eles.

```
Revisão dos dados — 150 editais coletados em 2026-08-13T07:49:55.338Z.

ATENÇÃO — cobertura incompleta. Das 6 UFs solicitadas, 0 foram coletadas por inteiro, 2 ficaram parciais e 4 não trouxeram nada.

  Parciais (o que entrou ANTES da interrupção está nos números abaixo; o restante da UF, não):
    PE: 100 editais coletados, interrompida — The operation was aborted due to timeout
    AL: 50 editais coletados, interrompida — The operation was aborted due to timeout
  Sem coleta (nenhum edital; NÃO estão representadas nos números abaixo):
    PB: The operation was aborted due to timeout
    RN: PNCP respondeu 500
    CE: PNCP respondeu 500
    SE: The operation was aborted due to timeout

  Os 150 editais revisados vêm de PE, AL.

Nenhuma incoerência encontrada nas verificações aplicadas: prazo, correspondência entre UF e código IBGE, dígitos do CNPJ, descrição do objeto e plausibilidade do valor.
89% dos editais têm valor estimado informado pelo órgão; nos demais o campo veio vazio na fonte e nenhum valor foi estimado por nós.
```
