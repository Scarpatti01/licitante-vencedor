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

Se o Chromium estiver fora do lugar padrão, aponte a variável em vez de editar
o arquivo:

```
CHROMIUM_EXECUTAVEL=/opt/pw-browsers/chromium python3 montar.py
```

Sem a variável, o Playwright usa o navegador que ele mesmo instalou, que é o
caso do runner do GitHub. O caminho já esteve fixo dentro de `gerar-pdf.mjs`, e
a primeira publicação do livro falhou por causa disso.

### Conferido

A geração a partir desta pasta foi comparada com o PDF original: 126 páginas,
15 marcadores, e o texto extraído com o mesmo hash. A fonte aqui reproduz o
livro, e não é uma cópia aproximada dele.

## Como gerar o EPUB

```
cd livro
python3 gerar-epub.py
python3 conferir-epub.py
```

Sai `workbook-do-licitante.epub`, 319 KB, do mesmo `completo.html` que gera o
PDF. Não existe um segundo arquivo de conteúdo: um texto escrito duas vezes é um
texto que envelhece em metades diferentes.

Ele abre no Apple Books, no Google Play Livros, no Kobo, e chega ao Kindle pelo
"Enviar para Kindle" da Amazon, que aceita EPUB.

Não precisa de nada instalado além do Python.

### Por que o EPUB, se já existe o PDF

Porque são leituras diferentes. O PDF é fiel à página impressa e serve para
imprimir e preencher à mão. No celular ele obriga a dar zoom e arrastar. O EPUB
reflui: a pessoa escolhe o tamanho da letra, usa modo noturno, grifa, e continua
de onde parou em outro aparelho.

### O que muda do livro para o e-book

O gerador transforma, e cada transformação existe por um motivo medido:

| O que muda | Por quê |
|---|---|
| Fontes e a foto saem do base64 e viram arquivo | Base64 custa um terço a mais e alguns leitores ignoram fonte embutida em CSS |
| `var(--cor)` vira o valor literal | Leitor antigo ignora custom property em silêncio, e o livro perde a cor |
| `clamp()` vira o valor mínimo | Onde não é suportado, a regra inteira cai e o tamanho volta ao padrão |
| `text-align:justify` sai | Leitor sem dicionário de português justifica sem hifenizar e abre rios de espaço em branco. A decisão volta para o leitor, que já a oferece nas preferências |
| `hyphens` ganha `-epub-hyphens` ao lado | É esse o nome que o Apple Books e o Kobo leem |
| `min-width` da tabela sai | Na tela a tabela rola de lado dentro de `.rolagem`; no e-book não existe rolagem horizontal, então ou encolhe ou vaza |
| `flex` e `grid` viram `block` | O suporte é irregular, e os filhos inline que ficavam colados foram corrigidos um a um, medidos na renderização |
| O sumário troca número de página por link | Num texto que reflui não existe "página 91" |
| `§ 4.5` vira link para a seção | No papel obriga a folhear; aqui é um toque. É a única coisa que o e-book faz melhor que o PDF |

### Conferido

`conferir-epub.py` mede o arquivo pronto, não confia no gerador: envelope na
ordem que a norma exige, todo XHTML bem formado, manifesto e zip batendo, nenhum
`data:` sobrando, os 214 links internos chegando a algum lugar, as 112 seções
alcançáveis pelo índice, e **nenhuma palavra da fonte faltando no e-book**.

Reprovou como devia quando quebrei o arquivo de propósito de três jeitos:
comprimindo o `mimetype`, apontando uma remissão para uma seção inexistente, e
cortando metade de um capítulo.

O que ele não faz é abrir o livro no Apple Books, no Kobo e no Kindle. Isso
continua sendo teste manual, porque esses leitores não existem aqui.

Renderizado em 320, 420 e 768 pixels de largura, nos dez documentos: nada vaza
para fora da página e nada se sobrepõe.

## O que cada arquivo é

| Arquivo | O que faz |
|---|---|
| `completo.html` | O livro inteiro, com o estilo de tela embutido |
| `estilo-tela.css` | A identidade Minimalista Premium, cópia legível do que está no HTML |
| `impressao.css` | A diagramação para papel: A4, quebras, duas colunas do glossário |
| `montar.py` | As duas passagens, a costura e a guarda de remissões |
| `gerar-pdf.mjs` | Uma passagem só, chamada pelo `montar.py` |
| `fontes/embutidas.css` | Playfair Display e Lato como data URI |
| `gerar-epub.py` | O mesmo livro como EPUB 3, para ler no celular e no Kindle |
| `conferir-epub.py` | Mede o EPUB pronto: envelope, XML, links, e o texto inteiro |

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

## O PDF e o EPUB não estão aqui

São artefatos de saída, e serão servidos a quem comprou a partir de um balde
privado, com link assinado. Guardar o binário em git só faria o repositório
crescer a cada revisão de vírgula.
