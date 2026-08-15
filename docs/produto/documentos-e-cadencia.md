# Documentos e cadência — o que foi medido, e o que se decidiu com isso

Este documento existe porque as decisões abaixo custam dinheiro e cobertura, e
foram tomadas contra **dado medido**, não contra intuição. Três das quatro
premissas iniciais estavam erradas, e só a medição mostrou isso.

Medido em 2026-08-15.

## Como medir de novo

A amostra saiu de uma coleta real: `npm run pncp:ingerir -- --uf PE --dias 20`,
que trouxe 709 editais. Sobre ela:

- **Documentos:** amostra determinística de 50 editais (passo fixo sobre a
  lista, para repetir dar o mesmo conjunto), listando os arquivos de cada um em
  `/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos`, baixando e
  medindo com `pdfjs-dist`.
- **Cadência:** os 709 editais, comparando `publicadoEm` com
  `encerramentoProposta`.

"Precisa de OCR" foi definido **operacionalmente**: é o caso em que o
`pdfjs-dist` devolve menos de 100 caracteres por página. Não é uma opinião sobre
o formato do arquivo — é o comportamento do extrator que de fato usamos, que é o
que dispara o fallback.

## O que os documentos são, de verdade

| Medida | Valor |
| --- | --- |
| Páginas por edital — média | **84,2** |
| Mediana | 73 |
| p90 | 132 |
| Máximo | 305 |
| Tamanho médio por edital | ~4 MB |
| PDFs que precisam de OCR | **1 de 81 — 1,2%** |
| Formato: PDF | 86,2% |
| Formato: **zip / docx / xlsx** | **11,7%** |
| Formato: .rar | 2,1% |
| **Editais sem nenhum PDF legível** | **9 de 50 — 18%** |

**As três premissas que caíram:**

1. **Páginas.** A estimativa de trabalho era 50 por edital; são **84**. Todo
   cálculo de preço por página feito antes estava ~68% barato demais.
2. **OCR.** A expectativa era 15–30% de digitalizados; é **1,2%**. Isso derrubou
   o principal argumento a favor de subir um worker Python com Docling, cuja
   vantagem é justamente OCR e tabela.
3. **Formato.** Ninguém tinha previsto que **18% dos editais publicam os
   documentos em `.zip`, `.docx` ou `.rar`**. Sem tratar compactado, quase um em
   cada cinco editais fica invisível para a análise — e invisível em silêncio,
   que é o modo de falha que este projeto recusa.

Ou seja: **descompactar vale 18% de cobertura, OCR vale 1,2%.** A prioridade se
inverteu em relação ao plano inicial.

## As opções de extração, e o que pesou

| Opção | Licença | Peso |
| --- | --- | --- |
| **pdf.js** (`pdfjs-dist`) | Apache-2.0 | Roda no stack que já existe. Resolve 98,8% dos PDFs. Sem OCR |
| **Docling** (IBM) | MIT | Melhor em tabela e OCR, mas é Python — segundo runtime, segundo deploy |
| Tesseract | Apache-2.0 | OCR puro; ruim em tabela, e edital é tabela |
| **PyMuPDF** | ⚠️ **AGPL-3.0** | **Descartado.** Em SaaS, AGPL obriga a abrir o código da aplicação. Licença comercial da Artifex não tem preço público (ordem de US$ 10–50 mil/ano) |
| Mistral OCR 3 | pago | US$ 2 / 1.000 páginas (US$ 1 em lote) |
| Google Document AI | pago | ~US$ 5 / 1.000 páginas |
| LlamaParse Premium | pago | ~US$ 75 / 1.000 páginas |

Custo mensal com os números medidos, considerando que o `pdfjs` cobre 98,8%:

| | Só o triado (~100/dia) | Tudo (3.128/dia) |
| --- | --- | --- |
| Páginas/mês | ~253.000 | ~7,9 milhões |
| Via pdfjs | US$ 0 | US$ 0 |
| Via OCR pago (1,2%) | **~US$ 3** | ~US$ 95 |

**A conclusão que isso força:** a escolha do serviço de OCR é irrelevante para o
custo. O que decide é quem faz o estágio 1 e quem abre os `.zip`.

### Decisão

Extração em estágios, atrás de uma porta trocável — o mesmo padrão de
`ia/provedor.ts`, que já provou valor ao permitir trocar de modelo sem reescrever
nada:

1. **`pdfjs-dist`** para PDF.
2. **`fflate`** para `.zip` e `.docx`, que é zip por dentro. Recupera os 18%.
3. **OCR pago só como fallback declarado**, para 1,2%. Enquanto não houver
   contrato, o edital é marcado como documento não legível — lacuna declarada,
   não silenciosa.
4. **`.rar`: não suportado, declarado.** Exige biblioteca de licença ruim para
   ganhar 2%.

**Worker Python fica para depois.** O Docling é melhor e a licença é limpa, mas
cobra em operação — segundo runtime, segundo lugar para quebrar de madrugada — e
o ganho dele (OCR, tabela) atende 1,2% do volume. A porta deixa essa troca barata
no dia em que o número mudar.

## Cadência: por que a coleta é diária e o download não

A janela aberta de um edital, medida nos 709:

| | Dias |
| --- | --- |
| Mediana | **14,7** |
| p25 / p75 | 12,8 / 18,0 |
| p90 | 32,2 |
| Janela ≤ 7 dias | 12,7% dos editais |

### Download incremental

Como a coleta busca "propostas abertas" e a janela mediana é de 14,7 dias, o
mesmo edital reaparece em ~15 varreduras seguidas:

- **~6,8% de cada varredura é novidade**
- **~93,2% é o mesmo dado outra vez**

Para metadados isso é aceitável: são poucos MB de JSON em 14 minutos, e a
varredura completa é o que alimenta a **detecção de mudança** — retificação de
edital é comum e mexe em prazo. Deixar de varrer para poupar 14 minutos custaria
essa capacidade.

Para documentos não é: a 4 MB por edital, baixar os 3.128 diariamente daria
**~12,5 GB por dia** para obter, em 93% dos casos, o arquivo que já temos.

**Decisão:** varredura de metadados continua diária; download de documento só
para edital **novo, ou cuja lista de documentos mudou, e que passou na
triagem**. A regra vive em `src/lib/documentos/incremental.ts`, pura e testada.

### Por que o alerta continua diário

Simulação sobre os 709 editais, comparando ver o edital na primeira varredura
diária contra vê-lo no próximo envio semanal:

| Ao ver o edital pela primeira vez | Diário | Semanal |
| --- | --- | --- |
| Dias restantes, em média | 23,5 | 20,6 |
| **Já encerrado ao chegar** | **0,0%** | **2,9%** |
| **Menos de 3 dias** — sem poder impugnar | **0,0%** | **8,6%** |
| Menos de 5 dias | 7,7% | 13,6% |

Duas consequências, e a segunda é a que decide:

**Excluir os vencidos não conserta — esconde.** Os 2,9% que encerram entre um
envio e outro não chegariam atrasados: o cliente nunca saberia que existiram.
Oportunidade perdida em silêncio é exatamente a falha que o produto existe para
eliminar.

**8,6% chegariam sem direito de impugnar.** O art. 164 da Lei 14.133 dá até 3
dias úteis antes da abertura, e o site publica um guia dizendo isso. Um em cada
doze editais chegaria já fora desse prazo.

Sobre o receio de encher a caixa de entrada: ele já está resolvido por
construção — `enviar-alertas.ts` só envia quando há edital novo compatível.
Cliente sem novidade não recebe nada. Se um dia a frequência incomodar mesmo
assim, o caminho que preserva prazo é separar **urgente/alta aderência
(imediato)** de **resumo (semanal)**, deixando a urgência ser decidida pelo
edital e não pelo calendário.

## O que ainda não foi medido

Honestidade sobre os limites desta medição:

- **Velocidade de parse do `pdfjs` não foi isolada.** Na medição, download e as
  pausas de cortesia dominaram o tempo. Irrelevante para ~100 editais/dia;
  precisa ser medido antes de extrair os 3.128.
- **A amostra é de uma UF (PE).** A fração de `.zip` pode variar entre estados;
  vale repetir em CE, que é a maior da coleta.
- **A janela aberta também é só de PE**, e prazo pode variar por região e
  modalidade.
