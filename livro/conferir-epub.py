#!/usr/bin/env python3
"""Confere o EPUB gerado antes de ele sair para um cliente.

Não é validador de norma: é a lista do que já quebrou, ou quase quebrou, ao
montar este livro. Cada conferência aqui existe porque uma delas pegou um
defeito de verdade, e todas medem o arquivo pronto em vez de confiar no
gerador que acabou de escrevê-lo.

O que ele NÃO faz: abrir o livro no Apple Books, no Kobo e no Kindle. Isso é
teste manual, e continua sendo, porque não tenho esses leitores aqui.

Uso:  python3 conferir-epub.py
"""

import html as H
import os
import re
import sys
import zipfile
from xml.etree import ElementTree

AQUI = os.path.dirname(os.path.abspath(__file__))
EPUB = os.path.join(AQUI, 'workbook-do-licitante.epub')
LIVRO = os.path.join(AQUI, 'completo.html')

falhas = []
notas = []


def exigir(condicao, queixa):
    if condicao:
        return True
    falhas.append(queixa)
    return False


def contar(rotulo, valor):
    notas.append('%-34s %s' % (rotulo + ':', valor))


def palavras(marcacao):
    limpo = re.sub(r'<[^>]+>', ' ', marcacao)
    return H.unescape(limpo).split()


def main():
    if not os.path.exists(EPUB):
        sys.exit('conferir-epub: não achei %s. Rode gerar-epub.py antes.' % EPUB)

    z = zipfile.ZipFile(EPUB)
    nomes = set(z.namelist())

    # ---- 1. o envelope ------------------------------------------------
    # Fora desta ordem, leitor recusa o arquivo sem nem olhar o conteúdo.
    primeiro = z.infolist()[0]
    exigir(primeiro.filename == 'mimetype',
           'o primeiro item do zip é %s, tinha de ser mimetype' % primeiro.filename)
    exigir(primeiro.compress_type == zipfile.ZIP_STORED,
           'mimetype está comprimido; a norma exige armazenado sem compressão')
    exigir(z.read('mimetype') == b'application/epub+zip',
           'mimetype com conteúdo errado')
    exigir('META-INF/container.xml' in nomes, 'falta META-INF/container.xml')

    # ---- 2. XML bem formado -------------------------------------------
    # XHTML quebrado é a falha mais comum ao converter HTML escrito à mão, e
    # o leitor costuma mostrar página em branco em vez de erro.
    for nome in sorted(n for n in nomes if n.endswith(('.xhtml', '.opf', '.ncx', '.xml'))):
        try:
            ElementTree.fromstring(z.read(nome))
        except ElementTree.ParseError as erro:
            falhas.append('%s não é XML válido: %s' % (nome, erro))

    # ---- 3. manifesto e arquivos batem --------------------------------
    opf = z.read('OEBPS/content.opf').decode()
    hrefs = re.findall(r'<item [^>]*href="([^"]+)"', opf)
    ausentes = [h for h in hrefs if 'OEBPS/' + h not in nomes]
    exigir(not ausentes, 'o manifesto cita arquivos que não existem: %s' % ausentes)

    declarados = {'OEBPS/' + h for h in hrefs} | {
        'mimetype', 'META-INF/container.xml', 'OEBPS/content.opf'}
    orfaos = sorted(nomes - declarados)
    exigir(not orfaos, 'arquivos no zip fora do manifesto (leitor pode ignorar): %s' % orfaos)

    ids = set(re.findall(r'<item id="([^"]+)"', opf))
    soltos = [i for i in re.findall(r'idref="([^"]+)"', opf) if i not in ids]
    exigir(not soltos, 'a espinha aponta para itens que não estão no manifesto: %s' % soltos)

    exigir('properties="nav"' in opf, 'nenhum item declarado como nav: o EPUB 3 exige um')
    exigir('<dc:language>' in opf, 'falta dc:language')
    exigir('dcterms:modified' in opf, 'falta a data de modificação, exigida no EPUB 3')

    # ---- 4. nada de data: URI sobrando --------------------------------
    # Fonte em base64 dentro do CSS incha o arquivo e alguns leitores ignoram.
    sobrando = sum(z.read(n).count(b'data:') for n in nomes
                   if n.endswith(('.xhtml', '.css', '.opf')))
    exigir(sobrando == 0, 'sobraram %d data: URI; deviam ter virado arquivo' % sobrando)

    # ---- 5. o CSS pede o que existe ------------------------------------
    css = z.read('OEBPS/estilo/livro.css').decode()
    pedidas = set(re.findall(r"url\('\.\./([^']+)'\)", css))
    exigir(all('OEBPS/' + p in nomes for p in pedidas),
           'o CSS pede arquivos que não estão no pacote')
    exigir(not re.search(r'var\(--', css),
           'sobrou var(--...) no CSS: leitor antigo ignora e o livro perde a cor')
    exigir('clamp(' not in css,
           'sobrou clamp() no CSS: onde não é suportado, a regra inteira cai')
    exigir('-epub-hyphens' in css,
           'falta -epub-hyphens, que é o nome que Apple Books e Kobo leem')

    # ---- 6. todo link interno chega em algum lugar ---------------------
    # Um href quebrado não dá erro visível: o toque simplesmente não faz nada.
    quebrados = []
    for nome in sorted(n for n in nomes if n.endswith('.xhtml')):
        doc = z.read(nome).decode()
        for alvo in re.findall(r'<a [^>]*href="([^"]+)"', doc):
            if alvo.startswith(('http://', 'https://', 'mailto:')):
                continue
            arquivo, _, ancora = alvo.partition('#')
            caminho = ('OEBPS/texto/' + arquivo) if arquivo else nome
            if caminho not in nomes:
                quebrados.append('%s -> %s' % (nome, alvo))
            elif ancora and ('id="%s"' % ancora) not in z.read(caminho).decode():
                quebrados.append('%s -> %s' % (nome, alvo))
    exigir(not quebrados, 'links internos sem destino: %s' % quebrados[:6])
    contar('links internos conferidos', sum(
        len(re.findall(r'<a [^>]*href="', z.read(n).decode()))
        for n in nomes if n.endswith('.xhtml')))

    # ---- 7. o livro inteiro entrou -------------------------------------
    # O corte em capítulos é por posição no arquivo: um erro de índice cortaria
    # texto fora sem avisar ninguém.
    fonte = open(LIVRO, encoding='utf-8').read().split('</style>', 1)[1]
    docs = sorted(n for n in nomes if n.endswith('.xhtml') and 'nav' not in n)
    montado = ' '.join(z.read(n).decode() for n in docs)

    for rotulo, padrao in (('seções numeradas', r'class="num">[0-9A]+\.[0-9]+'),
                           ('verbetes do glossário', r'class="verbete"'),
                           ('exercícios', r'class="exercicio"')):
        na_fonte = len(re.findall(padrao, fonte))
        no_epub = len(re.findall(padrao, montado))
        exigir(no_epub == na_fonte,
               '%s: %d na fonte e %d no EPUB' % (rotulo, na_fonte, no_epub))
        contar(rotulo, no_epub)

    # A comparação é por conjunto de palavras: o EPUB tem a mais os <title> que
    # cada documento ganha, e não pode ter nenhuma a menos.
    perdidas = set(palavras(fonte)) - set(palavras(montado))
    exigir(not perdidas,
           'palavras que existiam na fonte e sumiram no EPUB: %s' % sorted(perdidas)[:12])
    contar('palavras no livro', len(palavras(montado)))

    # ---- 8. toda seção é alcançável ------------------------------------
    nav = z.read('OEBPS/texto/nav.xhtml').decode()
    numeros = set(re.findall(r'class="num">([0-9A]+\.[0-9]+)', montado))
    no_indice = set(re.findall(r'#s-([0-9A]+-[0-9]+)"', nav))
    faltando = sorted(n for n in numeros if n.replace('.', '-') not in no_indice)
    exigir(not faltando, 'seções fora do índice, inalcançáveis pela navegação: %s' % faltando[:8])
    contar('seções no índice', len(no_indice))

    # ---- 9. o sumário não fala em página -------------------------------
    # Num texto que reflui, "página 91" é informação falsa.
    abertura = z.read('OEBPS/texto/abertura.xhtml').decode()
    if 'class="sumario"' in abertura:
        soltos = re.findall(r'<span class="t">(?!<a)', abertura)
        exigir(not soltos, '%d itens do sumário não viraram link' % len(soltos))
        exigir('.sumario .pag { display:none; }' in css or 'display:none' in css,
               'o número de página do sumário continua visível')

    # ---- relatório -----------------------------------------------------
    print('%s  (%.0f KB)' % (os.path.basename(EPUB), os.path.getsize(EPUB) / 1024))
    for n in notas:
        print('  ' + n)
    if falhas:
        print('\nREPROVADO:')
        for f in falhas:
            print('  * %s' % f)
        sys.exit(1)
    print('\naprovado em %d conferências' % (len(notas) + 9))


if __name__ == '__main__':
    main()
