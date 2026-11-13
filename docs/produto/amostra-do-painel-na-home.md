# Amostra do painel na página inicial

Pedido do dono em 13/11/2026: mostrar a lista de oportunidades na landing page,
com uma chamada forte e um botão para a página de planos.

A seção `#amostra-do-painel` fica depois do vídeo e antes da análise real do
edital. Reproduz em HTML responsivo as três linhas da captura fornecida pelo
dono: Petrópolis, Armação dos Búzios e Nova Friburgo. Objetos foram encurtados
para a apresentação; valores, notas, prazos e próxima ação vêm da captura.

A legenda antes da prévia deixa claro que os dados não são atualizados nem
constituem uma lista de editais abertos. A amostra não lê o banco, não consulta
contas e não expõe dados de clientes. Os rótulos são apresentados como texto,
sem filtros ou ações que aparentem funcionar. O único link da seção é o CTA
“Ver planos e escolher o meu”, para `/precos/`.

Chamada: “Menos tempo procurando. Mais clareza para decidir.” O texto distingue
o painel de triagem da leitura do arquivo nos planos Empresa e Consultoria,
e informa que o teste de 14 dias usa o Leve. Notas de aderência não são
apresentadas como probabilidade de vitória. O selo “não analisado” foi mantido.

É um componente do servidor, sem JavaScript adicional, imagem pesada ou
dependência nova. As linhas se reorganizam em celulares e o botão ocupa a
largura disponível nas telas pequenas. O cenário Playwright da home verifica
a legenda, as três linhas, a ausência de rolagem horizontal, a captura da
seção e a navegação do CTA até a página de planos.
