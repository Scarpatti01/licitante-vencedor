#!/usr/bin/env python3
"""Monta o EPUB 3 do Workbook a partir do mesmo completo.html que gera o PDF.

Por que existe: o PDF é fiel à página impressa e ruim de ler no celular, que é
onde a maior parte das pessoas vai ler. O EPUB dá letra ajustável, modo noturno,
marcação e continuidade entre aparelhos, e abre no Apple Books, no Google Play
Livros, no Kobo e no Kindle (pelo "Enviar para Kindle", que aceita EPUB).

A fonte é uma só. Nada aqui é escrito à mão duas vezes: o texto, o CSS e as
fontes saem todos de completo.html, e o que muda é só o que o leitor de e-book
não suporta. Um segundo arquivo de conteúdo seria um arquivo que envelhece.

Uso:  python3 gerar-epub.py
"""

import base64
import hashlib
import os
import re
import sys
import zipfile
from html.entities import html5
from xml.etree import ElementTree

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTE = os.path.join(AQUI, 'completo.html')
SAIDA = os.path.join(AQUI, 'workbook-do-licitante.epub')

TITULO = 'Workbook do Licitante'
SUBTITULO = ('Licitações públicas do iniciante ao avançado, '
             'na era da inteligência artificial')
AUTOR = 'Leandro Scarpatti'
EDITORA = 'Licitante Vencedor'
IDIOMA = 'pt-BR'
# Identificador estável: o mesmo livro reeditado continua sendo o mesmo livro
# para o leitor, que assim mantém marcação e posição de leitura.
URN = 'urn:uuid:6f1c0f3a-9a1e-5b7a-9c2d-4f8b71e0a3d5'


# ---------------------------------------------------------------- utilidades

def falhar(mensagem):
    sys.exit('gerar-epub: %s' % mensagem)


def ler_livro():
    if not os.path.exists(FONTE):
        falhar('não achei %s' % FONTE)
    inteiro = open(FONTE, encoding='utf-8').read()
    if '<style>' not in inteiro or '</style>' not in inteiro:
        falhar('completo.html não tem o bloco <style> de onde sai o CSS')
    css, corpo = inteiro.split('<style>', 1)[1].split('</style>', 1)
    return css, corpo


# ------------------------------------------------------- fontes e imagens

def extrair_embutidos(css, corpo):
    """Tira os data: URI de dentro do CSS e do HTML e devolve arquivos de verdade.

    Base64 custa um terço a mais de bytes e alguns leitores engasgam com fonte
    embutida em CSS. Como arquivo, o leitor faz o que sabe fazer.
    """
    arquivos = {}

    def guardar(dados, extensao, pasta):
        nome = '%s/%s.%s' % (pasta, hashlib.sha1(dados).hexdigest()[:12], extensao)
        arquivos[nome] = dados
        return nome

    def trocar_fonte(m):
        formato, b64 = m.group(1), m.group(2)
        extensao = {'woff2': 'woff2', 'woff': 'woff', 'ttf': 'ttf', 'otf': 'otf'}.get(formato)
        if extensao is None:
            falhar('formato de fonte que eu não sei nomear: %s' % formato)
        return "url('../%s')" % guardar(base64.b64decode(b64), extensao, 'fontes')

    css = re.sub(r"url\(data:font/([a-z0-9+]+);base64,([A-Za-z0-9+/=]+)\)", trocar_fonte, css)

    def trocar_imagem(m):
        tipo, b64 = m.group(1), m.group(2)
        extensao = {'jpeg': 'jpg', 'jpg': 'jpg', 'png': 'png', 'gif': 'gif', 'webp': 'webp'}.get(tipo)
        if extensao is None:
            falhar('formato de imagem que eu não sei nomear: %s' % tipo)
        return 'src="../%s"' % guardar(base64.b64decode(b64), extensao, 'imagens')

    corpo = re.sub(r'src="data:image/([a-z]+);base64,([A-Za-z0-9+/=]+)"', trocar_imagem, corpo)
    return css, corpo, arquivos


# ----------------------------------------------------------------- o CSS

def resolver_variaveis(css):
    """Troca var(--x) pelo valor literal.

    Leitor de e-book antigo, e o conversor da Amazon, ignoram custom properties
    em silêncio: o texto sai preto no branco padrão e o livro perde o desenho.
    Resolver aqui custa nada e não some com nada.
    """
    raiz = re.search(r':root\s*\{([^}]*)\}', css)
    if not raiz:
        falhar('não achei o bloco :root com as cores do livro')
    valores = dict(re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', raiz.group(1)))
    if not valores:
        falhar(':root existe mas não declara nenhuma variável')

    for _ in range(5):  # variável que aponta para variável
        antes = css
        css = re.sub(r'var\((--[\w-]+)\)', lambda m: valores.get(m.group(1), m.group(0)).strip(), css)
        if css == antes:
            break
    restantes = re.findall(r'var\((--[\w-]+)\)', css)
    if restantes:
        falhar('sobraram variáveis sem valor: %s' % ', '.join(sorted(set(restantes))))
    return css


def desmontar_clamp(css):
    """clamp(a,b,c) vira a: no celular, que é o alvo, o mínimo é o que valeria.

    clamp e unidades de viewport dependem de uma janela que o leitor de e-book
    não expõe do mesmo jeito; onde não é suportado, a declaração inteira cai e
    o tamanho volta ao padrão do leitor.
    """
    def trocar(m):
        return m.group(1).split(',')[0].strip()
    for _ in range(3):
        css = re.sub(r'clamp\(([^()]*)\)', trocar, css)
    return css


def adaptar_para_leitor(css):
    css = resolver_variaveis(css)
    css = desmontar_clamp(css)

    # A moldura de "folha branca sobre creme" é cenário de navegador. Quem
    # desenha a página no e-book é o leitor. Sobra uma folga pequena, porque
    # nem todo leitor reserva margem e texto encostado na borda parece defeito.
    css = re.sub(r'\.pagina\s*\{[^}]*\}',
                 """.pagina { margin:0; padding:0 0.9em; background:#FFFFFF; }""", css)
    css = re.sub(r'@media\s*\(min-width:48rem\)\s*\{\s*\.pagina\s*\{[^}]*\}\s*\}', '', css)

    # -epub-hyphens é o nome que o Apple Books e o Kobo leem; sem ele, os dois
    # ignoram a hifenização mesmo tendo dicionário de português.
    css = re.sub(r'(\s)hyphens:\s*(auto|none);', r'\1-epub-hyphens:\2; hyphens:\2;', css)

    # Quem alinha o texto é o leitor. O livro impresso justifica, e no papel
    # funciona porque a hifenização é garantida. No e-book não é: leitor sem
    # dicionário de português justifica sem hifenizar e abre rios de espaço em
    # branco numa linha de quarenta caracteres. Não dá para testar daqui cada
    # leitor, então a decisão volta para ele, que já a oferece nas preferências.
    css = re.sub(r'\s*text-align:\s*justify;', '', css)

    # Flex e grid são irregulares nos leitores; onde o arranjo é essencial o
    # livro já usa tabela. Aqui vale mais empilhar do que arriscar sobreposição.
    css = css.replace('display:flex', 'display:block')
    css = css.replace('display:grid', 'display:block')

    css += """

/* ---- ajustes que só existem no e-book ---- */
/* O leitor manda no corpo do texto: fixar tamanho aqui tira do usuário o
   controle da letra, que é a razão de existir deste formato. */
body { font-size:1em; margin:0; background:#FFFFFF; }
img { max-width:100%; height:auto; }
/* Na tela, tabela larga rola de lado dentro de .rolagem. No e-book não existe
   rolagem horizontal: ou a tabela encolhe, ou ela vaza para fora da página.
   O min-width que serve ao navegador precisa sair aqui. */
table { width:100%; min-width:0; table-layout:fixed; word-wrap:break-word; font-size:0.86em; }
td, th { overflow-wrap:break-word; }
.rolagem { overflow-x:visible; }
/* Trocar flex por bloco (acima) deixa filhos inline colados na mesma linha.
   Estes são os que ficaram: medidos na renderização, não adivinhados. */
.exercicio > header .cod, .exercicio > header .nome { display:block; }
.exercicio > header .cod { margin-bottom:0.15em; }
.ornamento span, .monograma { display:block; }
/* Evita começar uma seção na última linha da tela. */
h1, h2, h3, h4 { page-break-after:avoid; break-after:avoid; }
h2 { page-break-before:always; break-before:page; }
.cabeca h2 { page-break-before:avoid; break-before:auto; }
.sumario a { text-decoration:none; color:#38342E; }
.sumario .pag { display:none; }
"""
    return css


# --------------------------------------------------------------- o corpo

# As cinco que o XML conhece de nascença. Todas as outras precisam virar
# referência numérica antes de o documento ser lido como XML.
DO_XML = {'amp', 'lt', 'gt', 'quot', 'apos'}


def numerica(nome):
    """`&atilde;` vira `&#227;`, para qualquer entidade nomeada do HTML.

    Antes isto era uma tabela escrita à mão, e ela cobria só as entidades que o
    livro usava no dia em que foi escrita. Bastou trocar o selo da capa para
    "Primeira edi&ccedil;&atilde;o" e a publicação parar: `&ccedil;` estava na
    tabela, `&atilde;` não. O portão acusou certo, mas o defeito não devia ser
    possível.

    Agora a tradução sai da tabela do próprio HTML5, que o Python traz pronta.
    Entidade nova no livro não exige tocar aqui.
    """
    char = html5.get(nome + ';') or html5.get(nome)
    if char is None:
        return None
    return ''.join('&#%d;' % ord(c) for c in char)


def xhtmlizar(html):
    """HTML solto vira XHTML bem formado, que é o que o EPUB exige."""
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)

    def trocar(m):
        nome = m.group(1)
        if nome in DO_XML:
            return m.group(0)
        convertida = numerica(nome)
        return convertida if convertida is not None else m.group(0)

    html = re.sub(r'&([a-zA-Z][a-zA-Z0-9]*);', trocar, html)
    # Tags vazias precisam se fechar.
    html = re.sub(r'<(br|hr|img|col|source)\b([^>]*?)\s*/?>', r'<\1\2 />', html)
    # Qualquer entidade nomeada que tenha escapado viraria XML inválido.
    sobrando = set(re.findall(r'&([a-zA-Z][a-zA-Z0-9]*);', html)) - DO_XML
    if sobrando:
        falhar('entidades que nem o XML nem o HTML5 conhecem: %s. '
               'Confira se não é erro de digitação no livro.'
               % ', '.join(sorted(sobrando)))
    return html


def identificador_da_secao(numero):
    return 's-' + numero.replace('.', '-')


def marcar_ancoras(html):
    """Dá id a cada seção numerada, para o sumário e o índice poderem apontar.

    O livro nasceu para papel e se referencia por número de página, que num
    texto que reflui não quer dizer nada.
    """
    achados = []

    def marcar(m):
        numero = m.group(2)
        achados.append(numero)
        return '<div class="secao" id="%s">%s<span class="num">%s</span>' % (
            identificador_da_secao(numero), m.group(1), numero)

    html = re.sub(r'<div class="secao">(\s*<h3>\s*)<span class="num">([0-9A]+\.[0-9]+)</span>',
                  marcar, html)
    return html, achados


def ligar_remissoes(html, onde):
    """Transforma "§ 4.5" em link para a seção 4.5.

    No papel a remissão obriga a folhear. Aqui ela é um toque, e é uma das
    poucas coisas que o e-book faz melhor que o PDF. Uma remissão que aponte
    para seção inexistente é erro: montar.py já guarda isso no livro, e aqui a
    conta tem de fechar de novo, porque o destino agora é um arquivo.
    """
    achadas = [0]
    ligadas = [0]

    def ligar(m):
        achadas[0] += 1
        numero = m.group(1)
        destino = onde.get(numero)
        if not destino:
            return m.group(0)
        ligadas[0] += 1
        return '<a href="%s#%s">&sect;&nbsp;%s</a>' % (
            destino, identificador_da_secao(numero), numero)

    html = re.sub(r'&sect;&nbsp;([0-9A]+\.[0-9]+)', ligar, html)
    return html, achadas[0], ligadas[0]


def partir_em_capitulos(corpo):
    """Fatia o corpo em: abertura + uma parte por <div class="parte">."""
    marcas = [m.start() for m in re.finditer(r'\n\s*<div class="parte">', corpo)]
    if len(marcas) < 2:
        falhar('esperava várias partes e achei %d' % len(marcas))

    abertura = corpo[:marcas[0]]
    # A abertura ainda carrega o <div class="pagina"> que envolve o livro todo.
    abertura = re.sub(r'^\s*<div class="pagina"[^>]*>', '', abertura).strip()

    capitulos = []
    for i, inicio in enumerate(marcas):
        fim = marcas[i + 1] if i + 1 < len(marcas) else len(corpo)
        trecho = corpo[inicio:fim]
        if i + 1 == len(marcas):
            # O último pedaço traz o </div> da .pagina junto.
            trecho = re.sub(r'</div>\s*$', '', trecho.rstrip(), count=1)
        capitulos.append(trecho.strip())
    return abertura, capitulos


def titulo_curto(html):
    """Só o <h2> da parte, que é a forma como o sumário se refere a ela."""
    m = re.search(r'<h2>(.*?)</h2>', html, re.S)
    return texto_simples(m.group(1)) if m else ''


def titulo_da_parte(html):
    etiqueta = re.search(r'<div class="etiqueta">(.*?)</div>', html, re.S)
    titulo = re.search(r'<h2>(.*?)</h2>', html, re.S)
    def limpo(m):
        if not m:
            return ''
        t = re.sub(r'<[^>]+>', '', m.group(1))
        t = t.replace('&middot;', '·').replace('&nbsp;', ' ').replace('&sect;', '§')
        return re.sub(r'\s+', ' ', t).strip()
    a, b = limpo(etiqueta), limpo(titulo)
    return ('%s: %s' % (a, b)) if a and b else (b or a or 'Parte')


def texto_simples(html):
    limpo = re.sub(r'<[^>]+>', '', html)
    for nomeada, char in (('&nbsp;', ' '), ('&middot;', '·'), ('&sect;', '§')):
        limpo = limpo.replace(nomeada, char)
    return re.sub(r'\s+', ' ', limpo).strip()


def religar_sumario(html, destino_por_titulo):
    """Troca o número de página do sumário por um link de verdade.

    Num livro que reflui, "página 91" é informação falsa: não existe página 91.
    O CSS esconde a coluna e aqui o item vira navegação.

    A ligação é feita pelo título, e não pela posição na lista. Casar por posição
    passaria a apontar para o capítulo errado no dia em que alguém inserisse uma
    parte no meio, e apontaria calado.
    """
    if 'class="sumario"' not in html:
        return html, 0

    ligados = [0]

    def ligar(m):
        titulo = texto_simples(m.group(1))
        destino = destino_por_titulo.get(titulo)
        if not destino:
            return m.group(0)
        ligados[0] += 1
        return '<span class="t"><a href="%s">%s</a></span>' % (destino, m.group(1))

    html = re.sub(r'<span class="t">(.*?)</span>', ligar, html, flags=re.S)
    return html, ligados[0]


# ------------------------------------------------------------- montagem

MOLDE = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="%(idioma)s" lang="%(idioma)s">
<head>
  <meta charset="utf-8" />
  <title>%(titulo)s</title>
  <link rel="stylesheet" type="text/css" href="../estilo/livro.css" />
</head>
<body>
<div class="pagina">
%(corpo)s
</div>
</body>
</html>
"""


def documento(titulo, corpo):
    return MOLDE % {'idioma': IDIOMA, 'titulo': titulo, 'corpo': corpo}


def conferir_xml(nome, texto):
    try:
        ElementTree.fromstring(texto)
    except ElementTree.ParseError as erro:
        falhar('%s não é XML válido: %s' % (nome, erro))


def montar_nav(capitulos, secoes):
    itens = []
    for arquivo, titulo, numeros in capitulos:
        filhos = ''
        if numeros:
            linhas = '\n'.join(
                '          <li><a href="%s#%s">%s %s</a></li>'
                % (arquivo, identificador_da_secao(n), n, secoes[n]['titulo'])
                for n in numeros)
            filhos = '\n        <ol>\n%s\n        </ol>\n      ' % linhas
        itens.append('      <li><a href="%s">%s</a>%s</li>' % (arquivo, titulo, filhos))
    corpo = """  <nav epub:type="toc" id="toc">
    <h1>Sumário</h1>
    <ol>
%s
    </ol>
  </nav>
  <nav epub:type="landmarks" hidden="hidden">
    <ol>
      <li><a epub:type="bodymatter" href="%s">Começo do livro</a></li>
    </ol>
  </nav>""" % ('\n'.join(itens), capitulos[0][0])
    return documento('Sumário', corpo)


def montar_ncx(capitulos):
    pontos = '\n'.join(
        """    <navPoint id="np-%d" playOrder="%d">
      <navLabel><text>%s</text></navLabel>
      <content src="texto/%s" />
    </navPoint>""" % (i + 1, i + 1, titulo.replace('&', '&amp;'), arquivo)
        for i, (arquivo, titulo, _) in enumerate(capitulos))
    return """<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="%s">
  <head>
    <meta name="dtb:uid" content="%s" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle><text>%s</text></docTitle>
  <navMap>
%s
  </navMap>
</ncx>
""" % (IDIOMA, URN, TITULO, pontos)


TIPOS = {'.xhtml': 'application/xhtml+xml', '.css': 'text/css', '.woff2': 'font/woff2',
         '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
         '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
         '.webp': 'image/webp', '.ncx': 'application/x-dtbncx+xml'}


def montar_opf(capitulos, embutidos, modificado, capa):
    itens = ['    <item id="nav" href="texto/nav.xhtml" media-type="application/xhtml+xml" properties="nav" />',
             '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />',
             '    <item id="css" href="estilo/livro.css" media-type="text/css" />']
    for i, (arquivo, _, _) in enumerate(capitulos):
        itens.append('    <item id="c%d" href="texto/%s" media-type="application/xhtml+xml" />' % (i, arquivo))
    for n, nome in enumerate(sorted(embutidos)):
        extensao = os.path.splitext(nome)[1]
        tipo = TIPOS.get(extensao)
        if tipo is None:
            falhar('não sei o media-type de %s' % nome)
        propriedades = ' properties="cover-image"' if nome == capa else ''
        itens.append('    <item id="e%d" href="%s" media-type="%s"%s />' % (n, nome, tipo, propriedades))

    espinha = '\n'.join('    <itemref idref="c%d" />' % i for i in range(len(capitulos)))
    return """<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="%(idioma)s">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">%(urn)s</dc:identifier>
    <dc:title id="t1">%(titulo)s</dc:title>
    <meta refines="#t1" property="title-type">main</meta>
    <dc:title id="t2">%(subtitulo)s</dc:title>
    <meta refines="#t2" property="title-type">subtitle</meta>
    <dc:creator id="a1">%(autor)s</dc:creator>
    <meta refines="#a1" property="role" scheme="marc:relators">aut</meta>
    <dc:publisher>%(editora)s</dc:publisher>
    <dc:language>%(idioma)s</dc:language>
    <dc:rights>Todos os direitos reservados.</dc:rights>
    <meta property="dcterms:modified">%(modificado)s</meta>
  </metadata>
  <manifest>
%(itens)s
  </manifest>
  <spine toc="ncx">
%(espinha)s
  </spine>
</package>
""" % {'idioma': IDIOMA, 'urn': URN, 'titulo': TITULO, 'subtitulo': SUBTITULO,
       'autor': AUTOR, 'editora': EDITORA, 'modificado': modificado,
       'itens': '\n'.join(itens), 'espinha': espinha}


CONTAINER = """<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
"""


def escrever_epub(pecas, binarios):
    if os.path.exists(SAIDA):
        os.remove(SAIDA)
    with zipfile.ZipFile(SAIDA, 'w', zipfile.ZIP_DEFLATED) as z:
        # A norma exige o mimetype primeiro e sem compressão, senão alguns
        # leitores recusam o arquivo antes de olhar o conteúdo.
        z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', zipfile.ZIP_STORED)
        z.writestr('META-INF/container.xml', CONTAINER)
        for caminho, texto in pecas.items():
            z.writestr(caminho, texto)
        for nome, dados in binarios.items():
            z.writestr('OEBPS/' + nome, dados)


def main():
    modificado = os.environ.get('DATA_DO_EPUB', '2026-08-27T00:00:00Z')
    css, corpo = ler_livro()
    css, corpo, binarios = extrair_embutidos(css, corpo)
    css = adaptar_para_leitor(css)

    corpo, _ = marcar_ancoras(corpo)
    abertura, brutos = partir_em_capitulos(corpo)
    # O primeiro item do sumário aponta para dentro da própria abertura.
    abertura = abertura.replace('<h2>Como usar este livro</h2>',
                                '<h2 id="como-usar">Como usar este livro</h2>', 1)

    # Índice de seções, para o sumário e o nav apontarem para o arquivo certo.
    secoes = {}
    capitulos = []
    for i, bruto in enumerate(brutos):
        arquivo = 'parte-%02d.xhtml' % i
        numeros = []
        for numero, titulo in re.findall(
                r'id="s-[^"]+"[^>]*>\s*<h3>\s*<span class="num">([0-9A]+\.[0-9]+)</span>(.*?)</h3>',
                bruto, re.S):
            limpo = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', titulo)).strip()
            secoes[numero] = {'arquivo': arquivo, 'titulo': limpo}
            numeros.append(numero)
        capitulos.append((arquivo, titulo_da_parte(bruto), numeros))

    onde = {n: dados['arquivo'] for n, dados in secoes.items()}

    # O sumário lista as partes pelo título; é por ele que os itens se ligam.
    destinos = {titulo_curto(bruto): arquivo
                for (arquivo, _, _), bruto in zip(capitulos, brutos)}
    destinos['Como usar este livro'] = 'abertura.xhtml#como-usar'
    abertura, ligados = religar_sumario(abertura, destinos)
    itens = abertura.count('<span class="t">')
    if ligados < itens:
        falhar('o sumário tem %d itens e só %d viraram link. '
               'Um item sem destino leva a lugar nenhum no e-book.' % (itens, ligados))

    pecas = {}
    todos = [('abertura.xhtml', 'Abertura', [])] + capitulos
    conteudos = [abertura] + brutos
    remissoes = ligadas = 0
    for (arquivo, titulo, _), bruto in zip(todos, conteudos):
        bruto, achadas, feitas = ligar_remissoes(bruto, onde)
        remissoes += achadas
        ligadas += feitas
        texto = documento(titulo, xhtmlizar(bruto))
        conferir_xml(arquivo, texto)
        pecas['OEBPS/texto/' + arquivo] = texto
    if ligadas < remissoes:
        falhar('%d remissões e só %d viraram link: as outras apontam para '
               'seções que não existem.' % (remissoes, ligadas))

    nav = montar_nav(todos, secoes)
    conferir_xml('nav.xhtml', nav)
    pecas['OEBPS/texto/nav.xhtml'] = nav

    ncx = montar_ncx(todos)
    conferir_xml('toc.ncx', ncx)
    pecas['OEBPS/toc.ncx'] = ncx

    capa = next((n for n in binarios if n.startswith('imagens/')), None)
    opf = montar_opf(todos, binarios, modificado, capa)
    conferir_xml('content.opf', opf)
    pecas['OEBPS/content.opf'] = opf
    pecas['OEBPS/estilo/livro.css'] = css

    escrever_epub(pecas, binarios)

    tamanho = os.path.getsize(SAIDA) / 1024
    print('%s' % os.path.basename(SAIDA))
    print('  %d documentos, %d seções indexadas, %d remissões ligadas, '
          '%d arquivos embutidos, %.0f KB'
          % (len(todos), len(secoes), ligadas, len(binarios), tamanho))


if __name__ == '__main__':
    main()
