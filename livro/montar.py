"""Monta o PDF final em duas passagens.

A primeira passagem existe só para descobrir em que folha cada parte cai.
Sem ela o sumário teria de mentir, e um sumário que mente é pior que
nenhum. A segunda passagem já sai com os números certos, e a costura final
tira o fólio das folhas onde ele atrapalha (capa, rosto, sumário e as
aberturas de parte) e escreve os marcadores do PDF.
"""
import json, re, subprocess, sys
import pymupdf

TITULOS = ["Isto serve para a minha empresa?", "O terreno", "O funil",
           "A disputa", "Depois de ganhar", "Montar o seu processo com IA",
           "As opções, e a minha entre elas", "As folhas de trabalho",
           "As palavras do edital"]
NOMES = ["Parte 0 · Isto serve para a minha empresa?", "Parte 1 · O terreno",
         "Parte 2 · O funil", "Parte 3 · A disputa",
         "Parte 4 · Depois de ganhar", "Parte 5 · Montar o seu processo com IA",
         "Apêndice · As opções, e a minha entre elas",
         "Anexos · As folhas de trabalho",
         "Glossário · As palavras do edital"]


def conferir_remissoes():
    """Toda remissão do glossário aponta para uma seção que existe?

    Nasceu de um defeito real: ao absorver a tabela A.9 no glossário, um
    verbete continuou remetendo a ela. Remissão morta num livro de consulta é
    pior que remissão nenhuma, porque manda o leitor procurar o que não existe.
    """
    c = open('completo.html', encoding='utf-8').read().split('</style>', 1)[1]
    secoes = set(re.findall(r'class="num">([0-9A]+\.[0-9]+)', c))
    remissoes = set(re.findall(r'&sect;&nbsp;([0-9A]+\.[0-9]+)', c))
    orfas = sorted(remissoes - secoes)
    if orfas:
        sys.exit('remissões para seções que não existem: %s' % ', '.join(orfas))


def renderizar(saida):
    r = subprocess.run(['node', 'gerar-pdf.mjs', saida], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)


def aberturas(caminho):
    """Em que página está a abertura de cada parte, pelo corpo do título."""
    doc = pymupdf.open(caminho)
    mapa = {}
    for n, titulo in enumerate(TITULOS):
        for i in range(doc.page_count):
            for bloco in doc[i].get_text("dict")["blocks"]:
                for linha in bloco.get("lines", []):
                    for trecho in linha["spans"]:
                        t = trecho["text"].strip()
                        if trecho["size"] > 25 and len(t) > 5 and titulo.startswith(t[:12]):
                            mapa[n] = i + 1
            if n in mapa:
                break
        if n not in mapa:
            sys.exit(f'nao achei a abertura da parte {n}')
    return mapa, doc.page_count


USO = [0]


def escrever_sumario(mapa):
    h = open('completo.html', encoding='utf-8').read()
    # A primeira linha do sumário é a folha "Como usar este livro"; as demais
    # são as partes, na ordem em que TITULOS as declara.
    n = [-2]
    def troca(_):
        n[0] += 1
        if n[0] < 0:
            return '<span class="pag">%d</span></li>' % USO[0]
        return f'<span class="pag">{mapa[n[0]]}</span></li>'
    h, qtd = re.subn(r'<span class="pag">[^<]*</span></li>', troca, h)
    assert qtd == len(mapa) + 1, (qtd, len(mapa))
    open('completo.html', 'w', encoding='utf-8').write(h)


def pagina_com(doc, texto, erro):
    for i in range(doc.page_count):
        if texto in doc[i].get_text():
            return i + 1
    sys.exit(erro)


def pagina_do_autor(doc):
    for i in range(doc.page_count - 1, -1, -1):
        if "Leandro Scarpatti" in doc[i].get_text():
            return i + 1
    sys.exit('nao achei a pagina do autor')


def costurar(bruto, final, mapa, total):
    doc = pymupdf.open(bruto)
    if doc.page_count != total:
        sys.exit(f'a paginacao mudou entre as passagens: {total} -> {doc.page_count}')
    autor = pagina_do_autor(doc)
    uso = pagina_com(doc, "Como usar este livro", "nao achei a folha de uso")
    sumario = pagina_com(doc, "Sum\u00e1rio", "nao achei o sumario")
    sem_folio = {1, 2, uso, sumario, autor} | set(mapa.values())
    # Pintar por cima escondia o fólio e deixava o número na camada de texto,
    # onde ele reaparece em busca e em cópia. A redação apaga de verdade.
    for i in range(doc.page_count):
        if i + 1 in sem_folio:
            p = doc[i]
            p.add_redact_annot(pymupdf.Rect(0, p.rect.height - 60, p.rect.width, p.rect.height))
            p.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
    doc.set_metadata({
        "title": "Workbook do Licitante",
        "author": "Licitante Vencedor",
        "subject": "Licitações públicas do iniciante ao avançado, na era da inteligência artificial",
        "keywords": "licitação, PNCP, Lei 14.133, edital, contratação pública",
    })
    toc = [[1, "Capa", 1], [1, "Declaração de interesse", 2],
           [1, "Como usar este livro", uso], [1, "Sumário", sumario]]
    toc += [[1, NOMES[k], mapa[k]] for k in sorted(mapa)]
    toc.append([1, "Sobre o autor", autor])
    toc.append([1, "Colofão", doc.page_count])
    doc.set_toc(toc)
    doc.save(final, garbage=4, deflate=True)


conferir_remissoes()
renderizar('passo1.pdf')
mapa, total = aberturas('passo1.pdf')
USO[0] = pagina_com(pymupdf.open('passo1.pdf'), 'Como usar este livro', 'nao achei a folha de uso')
print('aberturas:', {NOMES[k].split(' · ')[0]: v for k, v in mapa.items()}, '| folhas:', total)
escrever_sumario(mapa)
renderizar('passo2.pdf')
costurar('passo2.pdf', 'workbook-do-licitante.pdf', mapa, total)
print('pronto: workbook-do-licitante.pdf')
