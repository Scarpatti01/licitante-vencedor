import type { Metadata } from "next";
import { AUTHOR, SITE } from "@/lib/site";
import { Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { artigosDoGuia } from "@/lib/blog";

const TITULO =
  "Como vender para o governo: o caminho completo de quem nunca participou de uma licitação";
const DESCRICAO =
  "Guia prático para começar a vender ao poder público sob a Lei 14.133/2021: cadastro no SICAF e no PNCP, onde encontrar edital, benefícios de MEI, ME e EPP, formação de preço, o dia do pregão eletrônico e o recurso administrativo.";
const ATUALIZADO = "2026-08-11";

export const metadata: Metadata = {
  title: "Como vender para o governo: o guia de quem está começando",
  description: DESCRICAO,
  alternates: { canonical: "/vender-para-o-governo/" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/vender-para-o-governo/`,
    type: "article",
  },
};

const SECOES = [
  { id: "quem-pode", titulo: "Quem pode vender: da MEI à empresa de médio porte" },
  { id: "cadastro", titulo: "O cadastro: SICAF, gov.br e os portais" },
  { id: "onde", titulo: "Onde os editais aparecem" },
  { id: "escolher", titulo: "Como escolher o que disputar" },
  { id: "beneficios", titulo: "Os benefícios de ME e EPP que decidem o certame" },
  { id: "preco", titulo: "Formação de preço e o risco de inexequibilidade" },
  { id: "disputa", titulo: "O dia da disputa: como funciona o pregão eletrônico" },
  { id: "recurso", titulo: "Impugnação, intenção de recurso e recurso" },
  { id: "consorcio", titulo: "Consórcio, subcontratação e disputa por lotes" },
  { id: "primeiros-90-dias", titulo: "Um plano realista para os primeiros 90 dias" },
  { id: "erros", titulo: "Os erros que eliminam quem está começando" },
];

const FAQ = [
  {
    pergunta: "Preciso de alguma licença ou registro especial para vender ao governo?",
    resposta:
      "Não existe licença de fornecedor público. O que existe é cadastro: no âmbito federal, o SICAF, acessado pelo Compras.gov.br com conta gov.br. O que a lei exige é que a empresa tenha CNPJ ativo, objeto social compatível com o que vai fornecer, regularidade fiscal, trabalhista e previdenciária, e as qualificações técnica e econômico-financeira pedidas naquele edital específico.",
  },
  {
    pergunta: "MEI pode participar de licitação?",
    resposta:
      "Pode, e recebe o mesmo tratamento diferenciado de microempresa previsto na Lei Complementar 123/2006. O limite real não é jurídico, é operacional: o faturamento anual do MEI é bem menor que o de uma ME, e um contrato público de execução continuada pode estourar esse teto sozinho. Antes de disputar, some o valor anual estimado do contrato ao que a empresa já fatura.",
  },
  {
    pergunta: "Qual o valor mínimo para o governo ser obrigado a licitar?",
    resposta:
      "Abaixo dos limites de dispensa por valor do artigo 75 da Lei 14.133 — atualizados anualmente por decreto — o órgão pode contratar por dispensa. Isso não significa contratar quem quiser: a dispensa eletrônica também é um procedimento com aviso público e disputa de preço, e é o melhor lugar para uma empresa nova ganhar o primeiro contrato, porque a concorrência é menor e a documentação exigida é mais enxuta.",
  },
  {
    pergunta: "O que é o empate ficto de 5%?",
    resposta:
      "É a regra que considera empatada a proposta de uma ME ou EPP que seja até 5% superior à melhor proposta, quando essa melhor proposta é de empresa que não tem o benefício. Nesse caso, a ME ou EPP é convocada a cobrir o valor e passa à frente. Em modalidades que não sejam o pregão, o intervalo é de até 10%. É o benefício que mais decide certame na prática.",
  },
  {
    pergunta: "Posso participar mesmo com uma certidão vencida?",
    resposta:
      "Como ME ou EPP, sim, para as certidões de regularidade fiscal e trabalhista. A documentação é apresentada mesmo com restrição, e o prazo para regularizar corre a partir do momento em que a empresa é declarada vencedora — cinco dias úteis, prorrogáveis por igual período a critério do órgão. Não regularizar dentro do prazo faz decair o direito à contratação e pode gerar sanção. Para as demais qualificações, não há esse socorro.",
  },
  {
    pergunta: "Quanto tempo leva para receber depois de entregar?",
    resposta:
      "O prazo de pagamento é de até trinta dias contados da liquidação da despesa, isto é, do atesto de que a entrega ocorreu como devido — e não da emissão da nota fiscal. Some a isso o tempo entre a entrega e o atesto, que depende do fiscal. Para quem está começando, o cálculo prudente é considerar de 45 a 60 dias de capital de giro no primeiro contrato.",
  },
  {
    pergunta: "Preciso de advogado ou consultoria para começar?",
    resposta:
      "Para participar, não. Cadastro, leitura de edital, envio de proposta e disputa são tarefas operacionais que a própria empresa faz. Assessoria jurídica passa a fazer diferença em três situações: impugnação de edital com prazo curto, defesa em processo sancionatório e pedido de reequilíbrio econômico-financeiro com planilha. Contratar consultoria antes de ter ganhado o primeiro contrato costuma ser gasto adiantado.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE.url}/vender-para-o-governo/#article`,
      headline: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      datePublished: ATUALIZADO,
      dateModified: ATUALIZADO,
      author: { "@id": `${SITE.url}/#${AUTHOR.slug}` },
      publisher: { "@id": `${SITE.url}/#organization` },
      isPartOf: { "@id": `${SITE.url}/#website` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/vender-para-o-governo/#faq`,
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.pergunta,
        acceptedAnswer: { "@type": "Answer", text: f.resposta },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Como vender para o governo",
          item: `${SITE.url}/vender-para-o-governo/`,
        },
      ],
    },
  ],
};

export default function VenderParaOGoverno() {
  const artigos = artigosDoGuia("/vender-para-o-governo/");

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Como vender para o governo" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Como vender para o governo
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · Atualizado em 11 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            Quase todo mundo que me procura chega com a mesma pergunta mal
            formulada: “como faço para me cadastrar e começar a vender para o
            governo?”. O cadastro é a parte fácil — leva uma tarde. O que separa
            quem fatura de quem só se cadastrou é o que vem depois: escolher o
            que disputar, saber formar preço e não perder o certame por um
            detalhe processual.
          </P>
          <P>
            Este guia é a sequência inteira, na ordem em que ela acontece de
            verdade. Não tem etapa mágica nem atalho de credenciamento: o poder
            público compra por procedimento público, e o procedimento é
            aprendível.
          </P>

          <RespostaDireta>
            Para vender ao governo é preciso ter CNPJ ativo com objeto social
            compatível, cadastro de fornecedor (no âmbito federal, o SICAF, pelo
            Compras.gov.br), regularidade fiscal, trabalhista e previdenciária em
            dia, e então disputar os certames publicados no Portal Nacional de
            Contratações Públicas. Microempresas, empresas de pequeno porte e MEI
            têm tratamento diferenciado garantido pela Lei Complementar 123/2006 —
            exclusividade em itens de até R$ 80 mil, cota reservada de até 25% em
            bens divisíveis, empate ficto e prazo extra para regularizar
            certidões.
          </RespostaDireta>

          <Indice itens={SECOES} />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="quem-pode" titulo="Quem pode vender: da MEI à empresa de médio porte">
            <P>
              Não existe categoria de “empresa credenciada para o governo”.
              Qualquer pessoa jurídica regular pode disputar, e o porte não
              impede — ele muda quais benefícios você tem e quais certames fazem
              sentido para o seu tamanho.
            </P>
            <P>
              A primeira verificação é a mais barata e a mais ignorada: o objeto
              social e os CNAEs da empresa precisam abranger o que ela pretende
              fornecer. Não é formalidade. É causa recorrente de inabilitação, e
              a correção leva semanas na Junta Comercial — tempo que você não tem
              com o edital publicado.
            </P>
            <Tabela
              cabecalho={["Porte", "Faixa de faturamento anual", "O que muda na prática"]}
              linhas={[
                ["MEI", "Até R$ 81 mil", "Tem os benefícios de microempresa, mas um único contrato continuado pode estourar o teto de faturamento. Some antes de disputar"],
                ["Microempresa (ME)", "Até R$ 360 mil", "Benefícios integrais da LC 123: exclusividade, cota reservada, empate ficto e prazo para regularizar certidão"],
                ["Empresa de pequeno porte (EPP)", "Até R$ 4,8 milhões", "Mesmos benefícios da ME. É o porte que mais ganha licitação no Brasil"],
                ["Demais empresas", "Acima de R$ 4,8 milhões", "Sem tratamento diferenciado. Disputa aberta, e perde para ME e EPP em caso de empate ficto"],
              ]}
            />
            <P>
              Há um detalhe da Lei 14.133 que quase ninguém conhece e que
              elimina discussão: os benefícios da LC 123 não se aplicam ao item
              cujo valor supere o teto de enquadramento de EPP, nem a obras e
              serviços de engenharia cujo valor estimado supere esse teto. Em
              certame grande, ME e EPP disputam em condição igual a todo mundo.
            </P>
          </Secao>

          <Secao id="cadastro" titulo="O cadastro: SICAF, gov.br e os portais">
            <P>
              No âmbito federal, o cadastro de fornecedor é o SICAF, acessado
              pelo Compras.gov.br com uma conta gov.br do representante legal. O
              cadastro é gratuito e não tem intermediário obrigatório: se alguém
              cobra para “credenciar sua empresa no governo”, está cobrando por
              uma tarefa que você faz sozinho.
            </P>
            <P>
              Estados e municípios mantêm cadastros próprios, e boa parte deles
              usa portais privados. É por isso que a resposta honesta para “onde
              me cadastro?” é: depende de quem você quer vender. Comece pelo
              federal, que é o mais completo, e acrescente os portais conforme os
              editais do seu ramo aparecerem.
            </P>
            <Tabela
              cabecalho={["O que preparar", "Onde costuma pegar"]}
              linhas={[
                ["Conta gov.br do sócio ou representante, nível prata ou ouro", "Nível bronze não assina proposta em alguns fluxos. Suba o nível antes de precisar"],
                ["Contrato social atualizado e última alteração consolidada", "Alteração recente não averbada trava o cadastro"],
                ["Certidões federal, FGTS, trabalhista, estadual e municipal", "Certidão municipal é a que mais atrasa: muitas prefeituras não emitem on-line"],
                ["Declaração de enquadramento como ME ou EPP", "Sem ela, o sistema simplesmente não aplica os benefícios na disputa"],
                ["Balanço patrimonial do último exercício", "Empresa nova usa balanço de abertura. Verifique o índice de liquidez exigido no edital"],
              ]}
            />
            <P>
              Um alerta que economiza dinheiro: mantenha as certidões com alerta
              de vencimento no calendário. Perder um contrato por certidão
              vencida é o tipo de derrota que não tem recurso nem consolo, e
              acontece com empresa que estava executando bem.
            </P>
          </Secao>

          <Secao id="onde" titulo="Onde os editais aparecem">
            <P>
              Desde a Lei 14.133, a divulgação obrigatória dos avisos de
              contratação é feita no Portal Nacional de Contratações Públicas, o
              PNCP. Ele é o ponto único de publicidade — é lá que a existência do
              certame se torna oficial, mesmo quando a disputa acontece em outro
              sistema.
            </P>
            <P>
              A distinção importa e confunde muita gente: o PNCP publica, o
              portal opera. Você descobre o edital no PNCP e disputa no
              Compras.gov.br, no portal do estado ou em um portal privado, com
              cadastro próprio em cada um.
            </P>
            <P>
              O problema prático não é falta de informação, é excesso. São
              milhares de avisos por dia, com descrições irregulares, e a empresa
              pequena não tem quem leia tudo. Foi exatamente esse gargalo que me
              levou a construir o sistema de triagem que sustenta este site — ler
              o que é publicado todo dia e devolver só o que aquela empresa
              específica poderia ganhar.
            </P>
          </Secao>

          {/*
            Aqui, e não no fim: o parágrafo acima acabou de nomear a dor com
            precisão — o problema é excesso de publicação, não falta. E a seção
            seguinte entrega o filtro de quatro perguntas, que só é aplicável a
            uma lista curta. A captura fica exatamente entre o problema e o
            método, que é onde ela é útil em vez de interruptiva.

            Sem heading próprio: o `Indice` promete uma lista fechada de seções,
            e um h2 comercial faria o sumário discordar do documento.
          */}
          <section aria-label="Alerta diário de editais">
            <CapturaAlerta
              origem="guia/vender-para-o-governo#meio"
              chamada={{
                titulo: "O problema não é achar edital — é achar o seu no meio de milhares",
                texto:
                  "Todo dia útil, os editais publicados no PNCP que combinam com o que a sua empresa vende — com objeto, órgão, valor, prazo e o link para o registro oficial. As quatro perguntas da próxima seção você aplica a uma lista curta, em vez de a tudo que foi publicado.",
              }}
              textoDoBotao="Quero receber os editais do meu ramo"
            />
          </section>

          <Secao id="escolher" titulo="Como escolher o que disputar">
            <P>
              Empresa iniciante costuma cometer um de dois erros opostos:
              disputar tudo, e queimar caixa e reputação em certames que não
              tinha como cumprir; ou esperar o edital perfeito, e passar um ano
              cadastrada sem propor nada.
            </P>
            <P>
              O filtro que funciona tem quatro perguntas, nesta ordem — e a
              primeira resposta negativa encerra a análise:
            </P>
            <Tabela
              cabecalho={["Pergunta", "Por que ela vem nessa ordem"]}
              linhas={[
                ["Eu consigo entregar isso hoje, sem depender de contratar ou investir antes?", "Ganhar sem poder entregar gera multa e impedimento de licitar. É o pior resultado possível, pior que não participar"],
                ["Eu atendo à habilitação exigida neste edital?", "Atestado de capacidade técnica é a barreira mais comum para quem está começando. Sem ele, o resto é irrelevante"],
                ["O preço de referência cabe no meu custo com margem?", "Se o orçamento estimado já está abaixo do seu custo, a disputa vai piorar esse número, nunca melhorar"],
                ["Eu aguento o prazo de pagamento?", "Contrato bom com caixa curto quebra empresa. Considere de 45 a 60 dias no primeiro"],
              ]}
            />
            <P>
              Para o primeiro contrato, a recomendação que eu daria a qualquer
              empresa é começar pequeno e local: dispensas eletrônicas e itens de
              baixo valor no seu município. A concorrência é menor, a exigência
              documental é mais leve — e o contrato executado vira o atestado de
              capacidade técnica que destrava os certames maiores.
            </P>
          </Secao>

          <Secao id="beneficios" titulo="Os benefícios de ME e EPP que decidem o certame">
            <P>
              A Lei 14.133 manda aplicar os artigos 42 a 49 da Lei Complementar
              123/2006 às licitações. Na prática, isso significa quatro
              vantagens concretas — e conhecer os limites de cada uma vale mais
              do que conhecer a existência delas.
            </P>
            <Tabela
              cabecalho={["Benefício", "Como funciona", "O limite"]}
              linhas={[
                ["Exclusividade em itens de até R$ 80 mil", "O item é licitado só entre ME e EPP", "Não se aplica se não houver ao menos três fornecedores ME/EPP competitivos na região, ou se o tratamento não for vantajoso"],
                ["Cota reservada de até 25%", "Em bens de natureza divisível, uma cota do objeto é disputada só entre ME e EPP", "Depende de o objeto ser divisível de fato. Bem indivisível não comporta cota"],
                ["Empate ficto", "Proposta de ME/EPP até 5% acima da melhor é tida como empatada e pode cobrir o valor (10% fora do pregão)", "Só vale quando a melhor proposta é de empresa sem o benefício. Entre duas ME não há empate ficto"],
                ["Regularidade fiscal e trabalhista tardia", "A documentação é aceita com restrição e regularizada depois de declarada vencedora", "Cinco dias úteis, prorrogáveis por igual período. Vale só para regularidade fiscal e trabalhista, não para as demais"],
              ]}
            />
            <P>
              A cota reservada e a exclusividade geram uma discussão frequente:
              o órgão é obrigado ou pode escolher? A regra é de aplicação
              obrigatória, e a exceção precisa ser justificada nas hipóteses que
              a própria lei lista — ausência de três fornecedores competitivos,
              falta de vantagem para a administração, prejuízo ao conjunto do
              objeto. Ausência de justificativa é fundamento de impugnação.
            </P>
            <P>
              Existe ainda um teto que quase ninguém observa e que vira problema
              depois: os benefícios ficam limitados às ME e EPP que, no
              ano-calendário, ainda não somaram contratos com a administração
              acima do teto de enquadramento de EPP. O órgão exige declaração
              nesse sentido — e declarar errado é falsidade, não descuido.
            </P>
          </Secao>

          <Secao id="preco" titulo="Formação de preço e o risco de inexequibilidade">
            <P>
              Preço é onde a maioria perde dinheiro, e não por ganância — por
              omissão. A proposta pública precisa embutir custos que não existem
              na venda privada: garantia contratual quando exigida, prazo de
              pagamento longo, custo de manter certidões, e o custo do próprio
              acompanhamento do contrato.
            </P>
            <P>
              Em obras e serviços de engenharia, esses custos indiretos e a
              margem entram por meio do BDI, o percentual aplicado sobre o custo
              direto. Em fornecimento e serviços comuns o nome muda, a lógica
              não: administração, tributos, risco e lucro precisam estar dentro
              do número que você digita no lance.
            </P>
            <P>
              Do outro lado está a inexequibilidade. Em obras e serviços de
              engenharia, a Lei 14.133 presume inexequíveis as propostas cujo
              valor fique abaixo de 75% do valor orçado pela administração. É
              presunção relativa: você pode ser chamado a demonstrar que consegue
              executar, com planilha e comprovação — e demonstrar é obrigação
              sua, não do órgão.
            </P>
            <P>
              A consequência prática é dupla. Lance agressivo demais não é
              apenas margem perdida; é risco de desclassificação e de ter que
              sustentar tecnicamente um preço que não se sustenta. E se o
              concorrente venceu com preço improvável, a diligência é o
              instrumento certo para questionar — pedido feito no momento da
              disputa, não depois da homologação.
            </P>
          </Secao>

          <Secao id="disputa" titulo="O dia da disputa: como funciona o pregão eletrônico">
            <P>
              O pregão eletrônico é a modalidade em que a maior parte das
              empresas vai passar a vida. A proposta é cadastrada antes, no
              sistema, e a sessão pública abre no dia e hora marcados com a fase
              de lances.
            </P>
            <Tabela
              cabecalho={["Modo de disputa", "Como funciona", "O que exige de você"]}
              linhas={[
                ["Aberto", "Lances públicos e sucessivos por 10 minutos, prorrogados automaticamente por 2 minutos sempre que houver lance nos 2 minutos finais", "Atenção contínua e um piso de preço definido antes de a sessão começar"],
                ["Aberto e fechado", "Fase aberta de lances e, ao final, os melhores colocados enviam uma proposta fechada", "Estratégia: o último lance é uma decisão só sua, sem ver o adversário"],
                ["Fechado e aberto", "Propostas fechadas primeiro e disputa aberta entre os classificados", "Precisão na proposta inicial, porque ela define quem entra na disputa"],
              ]}
            />
            <P>
              Depois dos lances vem a ordem que a Lei 14.133 consolidou: julga-se
              a proposta primeiro e só se examina a habilitação do vencedor
              depois. Isso favorece quem está começando, porque evita a
              eliminação documental antes mesmo de o preço ser visto — mas exige
              que a documentação esteja pronta para envio imediato quando o
              pregoeiro convocar.
            </P>
            <P>
              A regra de ouro do dia da disputa é banal e quase ninguém segue:
              defina o preço-limite antes de a sessão abrir e escreva esse número
              em algum lugar. Lance dado no impulso da disputa é a origem da
              maior parte dos contratos que dão prejuízo — e desistir da proposta
              depois de vencer não é saída: é falta passível de sanção.
            </P>
          </Secao>

          <Secao id="recurso" titulo="Impugnação, intenção de recurso e recurso">
            <P>
              Existem dois momentos distintos de reclamação, com prazos
              distintos, e confundi-los é a forma mais comum de perder um direito
              que existia.
            </P>
            <P>
              Antes da sessão, o instrumento é a impugnação do edital: qualquer
              pessoa é parte legítima para impugnar, até três dias úteis antes da
              data de abertura, e a administração precisa responder dentro do
              prazo legal. Cláusula que restringe indevidamente a competição —
              exigência técnica desproporcional, direcionamento de marca,
              habilitação incompatível com o objeto — se combate aqui, não
              depois.
            </P>
            <P>
              Durante a sessão, o instrumento é o recurso, e ele tem um degrau
              anterior que elimina muita empresa: a intenção de recorrer precisa
              ser manifestada imediatamente, no próprio sistema, sob pena de
              preclusão. Manifestada a intenção, abre-se o prazo de três dias
              úteis para apresentar as razões, e igual prazo para os demais
              apresentarem contrarrazões.
            </P>
            <P>
              O detalhe que custa contratos: a manifestação é uma janela de
              minutos. Quem sai da sessão inconformado, dorme sobre o assunto e
              procura advogado no dia seguinte chega com o direito já precluso —
              e nenhuma razão jurídica, por melhor que seja, reabre o prazo.
              Manifeste sempre que houver dúvida razoável; a intenção não obriga
              a recorrer depois.
            </P>
          </Secao>

          <Secao id="consorcio" titulo="Consórcio, subcontratação e disputa por lotes">
            <P>
              Empresa pequena esbarra em edital grande demais. Há três saídas
              legítimas, e vale conhecer as três antes de desistir do certame.
            </P>
            <P>
              A primeira é o consórcio. Na Lei 14.133, a participação em
              consórcio é a regra, e a vedação é que precisa ser justificada no
              processo — ou seja, edital que proíbe consórcio sem motivar tem
              vício. Exige compromisso de constituição, empresa líder indicada e
              responsabilidade solidária entre as consorciadas, e o edital pode
              acrescer de 10% a 30% as exigências econômico-financeiras para
              consórcios, salvo quando composto integralmente por ME e EPP.
            </P>
            <P>
              A segunda é a subcontratação, quando admitida e nos limites do
              edital: você contrata parte da execução com terceiro, mas a
              responsabilidade perante a administração continua inteira sua. A
              terceira, e mais acessível, é a disputa por itens ou lotes — o
              parcelamento do objeto é a regra sempre que for tecnicamente viável
              e economicamente vantajoso, justamente para ampliar a competição.
            </P>
            <P>
              Aqui mora um dos abusos mais comuns em edital: agrupar em um único
              lote itens que não têm relação entre si e julgar pelo menor preço
              global. Isso exclui o fornecedor especializado sem ganho real de
              escala, e é objeto de impugnação com jurisprudência farta a favor
              de quem impugna.
            </P>
          </Secao>

          <Secao id="primeiros-90-dias" titulo="Um plano realista para os primeiros 90 dias">
            <Tabela
              cabecalho={["Período", "O que fazer", "Resultado esperado"]}
              linhas={[
                ["Dias 1 a 15", "Conferir objeto social e CNAEs, emitir todas as certidões, criar conta gov.br nível prata e concluir o SICAF", "Empresa apta a propor, com documentação num único lugar"],
                ["Dias 16 a 45", "Acompanhar o PNCP no seu ramo sem propor nada. Ler cinco editais inteiros, incluindo anexos e planilha", "Vocabulário do setor e noção real de preço praticado"],
                ["Dias 46 a 75", "Disputar dispensas eletrônicas e itens pequenos no seu município, com preço-limite definido antes de cada sessão", "Primeira proposta enviada e, com sorte, o primeiro contrato"],
                ["Dias 76 a 90", "Executar impecavelmente e pedir o atestado de capacidade técnica ao final", "O atestado que destrava os certames maiores"],
              ]}
            />
            <P>
              Repare que ganhar não é a meta do primeiro trimestre. A meta é
              executar um contrato pequeno com qualidade e sair dele com
              atestado — porque é o atestado, e não o cadastro, que muda o que
              você pode disputar no ano seguinte.
            </P>
          </Secao>

          <Secao id="erros" titulo="Os erros que eliminam quem está começando">
            <Tabela
              cabecalho={["Erro", "O que acontece"]}
              linhas={[
                ["Ler só o resumo do edital e ignorar os anexos", "O termo de referência e a planilha é que definem o que você está prometendo entregar"],
                ["Não manifestar intenção de recurso na hora", "Preclusão. O direito existia e se perdeu em minutos"],
                ["Dar lance sem preço-limite escrito antes da sessão", "Contrato ganho com prejuízo, e desistir depois é falta sancionável"],
                ["Deixar certidão vencer durante a execução", "Impede pagamento, prorrogação e habilitação em novos certames"],
                ["Disputar objeto fora do objeto social ou dos CNAEs", "Inabilitação certa, com o agravante de o conserto levar semanas"],
                ["Ignorar o teto anual de contratos das ME e EPP", "Declaração incorreta no certame, com risco que vai muito além da desclassificação"],
              ]}
            />
            <P>
              O fio comum entre eles é o mesmo: a licitação é um procedimento
              formal, e formalidade se vence com preparação, não com talento de
              negociação. Depois de entender o caminho, os dois passos naturais
              são o{" "}
              <a className="underline underline-offset-4" href="/lei-14133/">
                guia da Lei 14.133
              </a>{" "}
              e, quando o contrato for assinado, o guia de{" "}
              <a className="underline underline-offset-4" href="/contratos/">
                contrato administrativo
              </a>
              . Para sustentar impugnação e recurso com decisão de tribunal, veja{" "}
              <a className="underline underline-offset-4" href="/jurisprudencia/">
                jurisprudência em licitações
              </a>
              .
            </P>
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes de quem está começando">
            <Faq itens={FAQ} />
          </Secao>

          <Secao id="fontes" titulo="Fontes">
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm" target="_blank" rel="noopener">
                  Lei nº 14.133/2021 — Planalto
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm" target="_blank" rel="noopener">
                  Lei Complementar nº 123/2006 — Planalto
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.pncp.gov.br/" target="_blank" rel="noopener">
                  Portal Nacional de Contratações Públicas
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.gov.br/compras/pt-br" target="_blank" rel="noopener">
                  Compras.gov.br e SICAF
                </a>
              </li>
            </ul>
          </Secao>
        </div>

        {/*
          Os artigos que aprofundam este hub, derivados do catálogo. Lista vazia
          não renderiza nada — nem título, nem "em breve". O projeto já anunciou
          "os próximos:" seguido de nada, e o custo disso é de confiança.
        */}
        {artigos.length > 0 ? (
          <section className="mt-16 border-t pt-8">
            <h2 className="text-lg font-semibold tracking-tight">
              Artigos para quem está começando
            </h2>
            <ul className="mt-4 space-y-4">
              {artigos.map((artigo) => (
                <li key={artigo.slug}>
                  <a
                    href={`/blog/${artigo.slug}/`}
                    className="font-medium underline underline-offset-4"
                  >
                    {artigo.titulo}
                  </a>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                    {artigo.descricao}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12">
          <AutorBio />
        </div>

        <p className="mt-8 text-sm leading-relaxed text-[var(--muted)]">
          Este conteúdo tem finalidade informativa e operacional. Não constitui
          parecer jurídico — a análise de um edital concreto, a redação de
          impugnação e recurso e a defesa em processo sancionatório cabem à
          empresa e ao seu assessor jurídico. Leia o{" "}
          <a className="underline underline-offset-4" href="/aviso-legal/">
            aviso legal
          </a>
          .
        </p>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
