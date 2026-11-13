# Search Console: correções e limites da apuração de 13/11/2026

## Fonte e alcance

Dois exports do proprietário: Coverage-2026-11-13 e Merchant listings-Issue-2026-11-13.
O último ponto de cobertura é 09/11: 1.817 indexadas e 317 não indexadas.
Os motivos são 119 respostas 404, 33 redirecionamentos, 6 outros 4xx,
2 noindex, 138 detectadas sem indexação e 19 rastreadas sem indexação.
O export agregado NÃO contém os exemplos de URL desses motivos. Não é possível
declarar os 119 ou os seis resolvidos sem cruzar a lista detalhada do Google.

O relatório de produto identifica `/jornada/`, Workbook do Licitante, com
`returnMethod` ausente em `offers.hasMerchantReturnPolicy`, rastreado em 01/11.

## Apuração pública antes da mudança

- Todas as 1.979 URLs do sitemap responderam HTTP 200, sem mudar de URL.
- Verificação completa de status com HEAD; GET e leitura de canonical, robots e
  links em 87 páginas: páginas não municipais e amostra distribuída de municípios
  e notícias. Nenhuma das páginas lidas tinha noindex ou canonical divergente.
  Isso não é uma inspeção do Googlebot nem comprovação de indexação.
- Os três destinos internos adicionais encontrados nessa amostra responderam 200:
  privacidade, termos e entrar.
- Os 339 endereços do mapa legado chegaram a páginas 200.
- As sete remoções em `gone.json` retornaram o 410 intencional. Preservadas.
  Não é possível afirmar que sejam os seis 4xx do relatório sem os exemplos.
- Há 136 notícias válidas no acervo. Nove municípios usados em suas trilhas
  estruturadas não têm página publicada e responderam 404: Jacuípe/AL,
  Lençóis/BA, Arneiroz/CE, Granjeiro/CE, Mulungu/CE,
  Governador Eugênio Barros/MA, Água Preta/PE, Calçado/PE e
  Brasilândia do Tocantins/TO. Não sabemos se estão entre os 119 do Google.

## Correções

1. Trilha de notícia só referencia município quando sua página existe. Inclui
   o histórico público e usa posições consecutivas em ambos os casos.
2. `/editais-publicados/` expõe links HTML de todas as notícias válidas,
   do mais recente ao mais antigo, incluindo as de municípios sem página.
   Acesso pelo blog, rodapé público e notícias. Avisa que é acervo histórico,
   preserva datas e aponta à fonte de abertos, sem apresentar prazo vencido como oportunidade atual.
3. Sitemap inclui esse histórico com a data da última notícia. Páginas sem
   data editorial verificável não recebem a data de cada build. Municípios
   usam o mais recente entre agregado, abertos presentes e notícias locais.
   Nenhuma notícia antiga foi apagada, redirecionada em massa ou posta em noindex.
4. Workbook mantém Product, imagem, preço, disponibilidade e oferta. A garantia
   real de sete dias e a entrega digital são texto da oferta, também visíveis
   na página. Removidos os blocos opcionais de frete e devolução logística.
   Não há envio físico; `ReturnByMail` significa correio, não e-mail. Não
   usamos `KeepProduct`: embora exista no Schema.org atual, não consta entre
   os valores documentados pelo Google para essa propriedade da oferta.
   O Google pode recomendar `shippingDetails`/`hasMerchantReturnPolicy` como
   campos opcionais ausentes. Não prometer zero avisos nem inventar logística
   para eliminá-los. Nenhuma condição comercial foi alterada.

## Verificação e próximo cruzamento

Guardas de trilha conferem todo o acervo contra as URLs públicas do sitemap.
Guardas de sitemap verificam unicidade, ausência de área privada/redirects/410,
datas estáveis entre builds e atualização de conteúdo municipal.
Playwright percorre blog, histórico e uma notícia sem página municipal nas
larguras móveis já usadas pelo CI, conferindo links, trilha e largura da tela.

Para fechar os itens específicos de cobertura, exportar a tabela de URLs de
CADA motivo dentro do Search Console, não só o resumo agregado. Priorizar 4xx e
404, depois detectadas/rastreadas; conferir redirecionamentos e noindex por último.
O acesso à UI do Search Console não esteve disponível nesta sessão.
Após correção por URL, usar Inspeção de URL e Validar correção quando aplicável.
Rastreamento e indexação são decisões do Google; não ocorrem no instante do deploy.

## Referências técnicas

- https://support.google.com/webmasters/answer/7440203?hl=pt-BR
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- https://schema.org/ReturnMethodEnumeration
- https://schema.org/ReturnByMail
