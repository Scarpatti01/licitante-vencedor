"""Confere o PDF do livro antes de ele virar produto pago.

Roda no `publicar-livro.yml`, ANTES do envio ao balde: reprovar aqui deixa
no lugar o mestre anterior, que já estava bom, em vez de publicar um livro
quebrado por cima dele.

A conferência de fontes existe porque o resto das conferências não a
alcança. Um livro inteiro composto na fonte errada tem as 126 páginas, os
15 marcadores, o título na capa e a faixa do carimbo livre: passa por tudo
o que se media antes e chega ao comprador com outra tipografia. Foi assim
que se descobriu que a máquina de desenvolvimento e o runner resolvem as
fontes de maneira diferente.
"""

import sys

import pymupdf

ARQUIVO = "workbook-do-licitante.pdf"

# As fontes do livro. Qualquer coisa fora desta lista que carregue texto é
# substituição do sistema, e substituição é a fonte errada na página.
DA_CASA = ("Lato", "Playfair")

# Fontes que o Linux põe no lugar quando a pedida não resolve. Não é lista
# de proibidas para valer como prova: a regra é "só as da casa", e estes
# nomes entram só para a mensagem de erro saber dizer o que apareceu.
CONHECIDAS_DO_SISTEMA = ("DejaVu", "Liberation", "Nimbus", "FreeSerif", "FreeSans", "Noto")


def familia(nome: str) -> str:
    """`FAAAAA+Lato-Regular` vira `Lato-Regular`."""
    return nome.split("+", 1)[-1]


def da_casa(nome: str) -> bool:
    return any(m.lower() in nome.lower() for m in DA_CASA)


def eh_type3(nome: str) -> bool:
    # O Chromium desenha assim a fonte que não conseguiu embutir inteira. O
    # desenho sai certo; o que se perde é a busca e a cópia do texto.
    return nome.startswith("Type3")


def main() -> None:
    documento = pymupdf.open(ARQUIVO)
    problemas = []

    if documento.page_count < 120:
        problemas.append(f"só {documento.page_count} páginas; o livro tem 126")
    if len(documento.get_toc()) < 10:
        problemas.append(f"só {len(documento.get_toc())} marcadores de navegação")

    inicio = "".join(documento[n].get_text() for n in range(min(8, documento.page_count)))
    if "Workbook do Licitante" not in inicio:
        problemas.append("não achei o título nas primeiras páginas")

    # A faixa do carimbo precisa continuar livre: o servidor escreve o nome do
    # comprador ali, e o dia em que a diagramação descer até essa altura o
    # carimbo passa a sair por cima do texto, sem ninguém perceber.
    for n in (12, 40, 80, 120):
        if n >= documento.page_count:
            continue
        blocos = [b for b in documento[n].get_text("blocks") if b[4].strip()]
        corpo = [b for b in blocos if b[3] < 810]
        if corpo and max(b[3] for b in corpo) > 792:
            fundo = max(b[3] for b in corpo)
            problemas.append(
                f"página {n + 1}: o texto desce até y={fundo:.0f} e invade a faixa do carimbo"
            )

    # Quantos caracteres cada fonte compõe, no livro inteiro. Contar caractere,
    # e não página, é o que separa "o livro está na fonte errada" de "um
    # símbolo solto caiu na reserva".
    por_fonte: dict[str, int] = {}
    onde: dict[str, str] = {}
    for n in range(documento.page_count):
        for bloco in documento[n].get_text("dict")["blocks"]:
            for linha in bloco.get("lines", []):
                for trecho in linha["spans"]:
                    texto = trecho["text"].strip()
                    if not texto:
                        continue
                    nome = familia(trecho["font"])
                    por_fonte[nome] = por_fonte.get(nome, 0) + len(texto)
                    onde.setdefault(nome, f"p.{n + 1}: {texto[:40]!r}")

    if not por_fonte:
        problemas.append("não achei texto nenhum para medir a fonte")

    intrusas = {
        nome: quantos
        for nome, quantos in por_fonte.items()
        if not da_casa(nome) and not eh_type3(nome)
    }
    if intrusas:
        detalhe = "; ".join(
            f"{nome} em {quantos} caracteres ({onde[nome]})"
            for nome, quantos in sorted(intrusas.items(), key=lambda p: -p[1])
        )
        do_sistema = [n for n in intrusas if any(s in n for s in CONHECIDAS_DO_SISTEMA)]
        recado = (
            f"fonte que não é do livro compondo texto: {detalhe}. "
            f"O livro é composto em Lato e Playfair Display, embutidas na fonte "
            f"versionada. Fonte de fora quer dizer que a pedida não resolveu e o "
            f"sistema pôs outra no lugar, e a página sai com a tipografia errada"
        )
        if do_sistema:
            recado += f". {', '.join(sorted(do_sistema))} é substituição do sistema"
        problemas.append(recado)

    da_casa_com_texto = {n: q for n, q in por_fonte.items() if da_casa(n)}
    if not da_casa_com_texto:
        problemas.append("nenhuma fonte do livro compõe texto: a fonte versionada não foi aplicada")

    print("fontes que compõem o livro:")
    for nome, quantos in sorted(por_fonte.items(), key=lambda p: -p[1]):
        marca = "  " if da_casa(nome) or eh_type3(nome) else "! "
        print(f"  {marca}{nome:34} {quantos:>7} caracteres")

    if problemas:
        sys.exit("PDF reprovado: " + "; ".join(problemas))

    print(
        f"\nPDF aprovado: {documento.page_count} páginas, "
        f"{len(documento.get_toc())} marcadores, "
        f"{len(da_casa_com_texto)} fontes do livro"
    )


if __name__ == "__main__":
    main()
