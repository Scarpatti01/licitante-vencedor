# O Workbook do Licitante

A fonte do livro que a Jornada de 12 Semanas entrega: 126 páginas A4, 31.304
palavras, 112 seções, 25 exercícios e folhas de trabalho, 89 verbetes de
glossário.

## Por que isto mora no repositório da aplicação

Porque o livro **é** o produto, e produto sem fonte versionada é produto que se
perde. Esta pasta nasceu no dia em que o PDF existia apenas num diretório
temporário de sessão, que já havia reiniciado uma vez. O arquivo estava a um
reinício de distância de sumir junto com a linha que o gera.

Não é código da aplicação e nada em `src/` importa daqui. É a fonte de um
artefato, guardada onde o resto do produto é guardado.

## Como gerar o PDF

```
cd livro
python3 montar.py
```

Sai `workbook-do-licitante.pdf`. O script roda em **duas passagens** de
propósito: a primeira existe só para descobrir em que folha cada parte cai, e a
segunda já sai com esses números no sumário. Sem isso o sumário teria de chutar,
e sumário que chuta é pior que sumário nenhum.

Depois das duas passagens ele ainda costura o arquivo: apaga o fólio das folhas
de abertura (capa, rosto, sumário, as aberturas de parte e a página do autor),
escreve os marcadores de navegação e os metadados.

### O que precisa estar instalado

`pymupdf` (`pip install pymupdf`) e `playwright` com um Chromium.

**Playwright não é dependência da aplicação**, e nem deve ser: o site não abre
navegador para nada. Ele é ferramenta de quem gera o livro. Como `montar.py`
chama `gerar-pdf.mjs`, que faz `import { chromium } from "playwright"`, o pacote
precisa ser resolvível a partir desta pasta. Um `npm install playwright` aqui
dentro resolve, e o `.gitignore` já ignora o `node_modules/` que isso cria.

Se o Chromium estiver fora do lugar padrão, ajuste `executablePath` em
`gerar-pdf.mjs`.

### Conferido

A geração a partir desta pasta foi comparada com o PDF original: 126 páginas,
15 marcadores, e o texto extraído com o mesmo hash. A fonte aqui reproduz o
livro, e não é uma cópia aproximada dele.

## O que cada arquivo é

| Arquivo | O que faz |
|---|---|
| `completo.html` | O livro inteiro, com o estilo de tela embutido |
| `estilo-tela.css` | A identidade Minimalista Premium, cópia legível do que está no HTML |
| `impressao.css` | A diagramação para papel: A4, quebras, duas colunas do glossário |
| `montar.py` | As duas passagens, a costura e a guarda de remissões |
| `gerar-pdf.mjs` | Uma passagem só, chamada pelo `montar.py` |
| `fontes/embutidas.css` | Playfair Display e Lato como data URI |

## As fontes viajam dentro do arquivo

`completo.html` carrega Playfair Display e Lato por **dois caminhos**: o link do
Google Fonts, que serve o navegador, e as mesmas faces embutidas como data URI,
que servem a geração do PDF.

Existe por um defeito real. Quando as fontes ficaram só em `data:`, o PDF saía
certo e o visualizador que autoriza `fonts.googleapis.com` explicitamente
bloqueava a fonte embutida: na tela do leitor, Playfair virava Times e a
identidade evaporava sem nada no CSS ter mudado. Com os dois caminhos, o que
falhar é coberto pelo outro.

## A guarda que roda antes de cada geração

`montar.py` confere que **toda remissão do glossário aponta para uma seção que
existe**. Nasceu de um defeito: ao absorver a tabela A.9 no glossário, um
verbete continuou remetendo a ela. Remissão morta num livro de consulta é pior
que remissão nenhuma, porque manda o leitor procurar o que não existe.

## O PDF não está aqui

É artefato de saída, e ele será servido a quem comprou a partir de um balde
privado, com link assinado. Guardar o binário em git só faria o repositório
crescer a cada revisão de vírgula.
