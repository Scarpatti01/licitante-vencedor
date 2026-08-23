import type { Metadata } from "next";
import { AUTHOR, SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { Faq, Indice, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";
import { artigosDoGuia } from "@/lib/blog";

const TITULO =
  "Contrato administrativo: o que muda para a sua empresa depois que a licitação acaba";
const DESCRICAO =
  "Guia prático do contrato administrativo na Lei 14.133/2021 para fornecedores: prazo e prorrogação, aditivos de 25%, reajuste, repactuação e reequilíbrio, garantia, pagamento em ordem cronológica, extinção e sanções.";
const ATUALIZADO = "2026-08-11";

export const metadata: Metadata = {
  title: "Contrato administrativo: o guia do fornecedor",
  description: DESCRICAO,
  alternates: { canonical: "/contratos/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO, title: TITULO, description: DESCRICAO, url: `${SITE.url}/contratos/`, type: "article" },
};

const SECOES = [
  { id: "o-que-e", titulo: "O que é um contrato administrativo" },
  { id: "prerrogativas", titulo: "As prerrogativas da administração" },
  { id: "prazo", titulo: "Prazo, prorrogação e o fim do contrato eterno" },
  { id: "aditivos", titulo: "Aditivos: os limites de 25% e 50%" },
  { id: "precos", titulo: "Reajuste, repactuação e reequilíbrio" },
  { id: "garantia", titulo: "Garantia contratual" },
  { id: "pagamento", titulo: "Pagamento, ordem cronológica e retenções" },
  { id: "fiscalizacao", titulo: "Quem manda no contrato: gestor e fiscal" },
  { id: "extincao", titulo: "Extinção, inadimplência e o direito de parar" },
  { id: "sancoes", titulo: "Sanções: da advertência à inidoneidade" },
  { id: "erros", titulo: "Cinco erros que custam caro na execução" },
];

const FAQ = [
  {
    pergunta: "A administração pode alterar o contrato sem eu concordar?",
    resposta:
      "Pode, dentro de limites. A alteração unilateral serve para adequar o objeto quando há modificação do projeto ou das especificações, e para acréscimos ou supressões de até 25% do valor inicial atualizado, e de 50% para acréscimos em reforma de edifício ou de equipamento. Fora desse intervalo, e para qualquer mudança de cláusula econômico-financeira, é preciso acordo entre as partes.",
  },
  {
    pergunta: "Qual a diferença entre reajuste, repactuação e reequilíbrio?",
    resposta:
      "Reajuste corrige o preço por um índice previsto em contrato, depois de um ano. Repactuação vale para serviços contínuos com dedicação exclusiva de mão de obra e acompanha o custo real da folha, normalmente a partir da data-base da convenção coletiva. Reequilíbrio é a exceção: só entra quando um evento imprevisível quebra a equação econômica do contrato, e depende de você demonstrar o impacto com planilha.",
  },
  {
    pergunta: "Posso parar de executar se o órgão não pagar?",
    resposta:
      "Não imediatamente. A lei permite ao contratado optar pela suspensão da execução quando o atraso dos pagamentos passa de dois meses, contados da emissão da nota fiscal. Antes disso, parar é inadimplemento seu, e abre caminho para multa e impedimento de licitar. O caminho correto é notificar formalmente, protocolar e manter tudo documentado.",
  },
  {
    pergunta: "Quanto o órgão pode exigir de garantia contratual?",
    resposta:
      "Como regra, até 5% do valor inicial do contrato, percentual que pode ser majorado para até 10% mediante justificativa técnica sobre a complexidade e os riscos. Em obras e serviços de engenharia de grande vulto, a lei admite seguro-garantia com cláusula de retomada em percentual bem maior. Você escolhe a modalidade: caução em dinheiro ou títulos, seguro-garantia ou fiança bancária.",
  },
  {
    pergunta: "Contrato de serviço contínuo pode durar quantos anos?",
    resposta:
      "Serviços e fornecimentos contínuos podem ser contratados por até 5 anos e prorrogados sucessivamente, respeitada a vigência máxima de 10 anos. Isso mudou a lógica de precificação: um contrato que pode durar uma década não se ganha com margem negativa esperando recompor depois.",
  },
  {
    pergunta: "O que é ordem cronológica de pagamento?",
    resposta:
      "É a regra que obriga o órgão a pagar seguindo a ordem de exigibilidade dos créditos, dentro de cada fonte de recurso e por categoria de contrato, bens, locações, serviços e obras. Ela existe justamente para impedir que um fornecedor passe na frente do outro. Se você é preterido, a ordem cronológica é o fundamento da sua reclamação, e a lista é pública.",
  },
  {
    pergunta: "Contrato emergencial ainda é de 180 dias?",
    resposta:
      "Não. Essa era a regra da Lei 8.666. Na Lei 14.133, a contratação direta por emergência ou calamidade alcança as parcelas que possam ser concluídas em até um ano, contado da ocorrência da emergência, vedadas a prorrogação e a recontratação. Muito conteúdo antigo sobre o prazo de 180 dias circula desatualizado.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE.url}/contratos/#article`,
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
      "@id": `${SITE.url}/contratos/#faq`,
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
        { "@type": "ListItem", position: 2, name: "Contratos", item: `${SITE.url}/contratos/` },
      ],
    },
  ],
};

export default function Contratos() {
  const artigos = artigosDoGuia("/contratos/");

  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Contratos" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Contrato administrativo: o que muda depois que a licitação acaba
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Por {AUTHOR.name} · Atualizado em 11 de agosto de 2026
        </p>

        <div className="mt-8 space-y-6">
          <P>
            Ganhar a licitação é a parte que todo mundo comemora. O prejuízo,
            quando aparece, quase nunca nasce ali. Nasce nos doze, trinta e seis
            ou sessenta meses seguintes, dentro de um contrato que a empresa
            assinou sem ler com a mesma atenção que dedicou à proposta.
          </P>
          <P>
            O contrato administrativo não funciona como o contrato que a sua
            empresa assina com um cliente privado. Ele tem regras próprias, e a
            maior parte delas existe antes de qualquer negociação: estão na lei, e
            valem mesmo que o texto assinado não as repita.
          </P>

          <RespostaDireta>
            Contrato administrativo é o vínculo firmado entre a administração
            pública e o particular para execução de obra, serviço, compra ou
            locação, regido pela Lei 14.133/2021. Ele se distingue do contrato
            privado porque a administração mantém prerrogativas próprias. Alterar
            unilateralmente dentro de limites, fiscalizar, aplicar sanções e
            extinguir por interesse público, sempre com a contrapartida de
            preservar o equilíbrio econômico-financeiro pactuado.
          </RespostaDireta>

          <Indice itens={SECOES} />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="o-que-e" titulo="O que é um contrato administrativo">
            <P>
              Um contrato entre duas empresas privadas parte da igualdade: nenhuma
              das partes pode mudar o combinado sozinha. No contrato
              administrativo, essa simetria não existe, e não por abuso. Existe
              porque de um lado está um interesse público que não pode parar
              quando o fornecedor some, quebra ou deixa de entregar.
            </P>
            <P>
              A contrapartida dessa desigualdade é o que a lei chama de equilíbrio
              econômico-financeiro. A administração pode mexer no contrato, mas
              não pode piorar a sua equação: se ela altera o objeto, tem que
              recompor. É esse par, prerrogativa de um lado, equilíbrio do outro
, que sustenta todo o resto deste guia.
            </P>
            <P>
              Na prática, isso significa que as suas duas obrigações mais
              importantes durante a execução são operacionais, não jurídicas:
              entregar conforme o pactuado e documentar tudo. A empresa que
              registra ocorrência por escrito ganha discussões que a empresa que
              resolveu no telefone perde.
            </P>
          </Secao>

          <Secao id="prerrogativas" titulo="As prerrogativas da administração">
            <P>
              O artigo 104 da Lei 14.133 lista o que o órgão pode fazer sem
              depender do seu aceite. Vale conhecer a lista inteira, porque cada
              item tem um limite:
            </P>
            <Tabela
              cabecalho={["Prerrogativa", "O limite que protege você"]}
              linhas={[
                ["Alterar unilateralmente o contrato", "Só cláusulas de objeto e quantidade, dentro dos percentuais legais, e sempre com recomposição do equilíbrio econômico-financeiro"],
                ["Extinguir o contrato", "Por interesse público justificado. Extinção sem culpa sua gera direito a indenização pelo que foi executado e pelo que você já investiu"],
                ["Fiscalizar a execução", "Fiscalizar não é comandar a sua equipe. A subordinação dos seus empregados continua sendo sua"],
                ["Aplicar sanções", "Só depois de processo com contraditório e ampla defesa, com dosimetria proporcional à falta"],
                ["Ocupar provisoriamente bens e pessoal", "Hipótese excepcional, para não interromper serviço essencial, e não dispensa a devida compensação"],
              ]}
            />
            <P>
              Repare no padrão: nenhuma prerrogativa é ilimitada, e quase todas
              param no mesmo lugar. O equilíbrio econômico-financeiro e o devido
              processo. Quando um fiscal diz que “a administração pode”, a
              pergunta certa não é se pode, e sim até onde.
            </P>
          </Secao>

          <Secao id="prazo" titulo="Prazo, prorrogação e o fim do contrato eterno">
            <P>
              A duração é o ponto em que a Lei 14.133 mais mudou a vida de quem
              presta serviço continuado. A regra antiga era prorrogar de ano em
              ano até o teto de sessenta meses. A regra atual permite contratar
              serviços e fornecimentos contínuos por até cinco anos de uma vez, com
              prorrogações sucessivas respeitada a vigência máxima de dez anos.
            </P>
            <Tabela
              cabecalho={["Tipo de contrato", "Duração", "Efeito prático na proposta"]}
              linhas={[
                ["Regra geral", "Vinculada ao crédito orçamentário do exercício", "Contrato de execução rápida, sem expectativa de continuidade"],
                ["Serviços e fornecimentos contínuos", "Até 5 anos, prorrogáveis até o limite de 10", "Muda a conta: diluição de investimento inicial em prazo maior, mas exposição maior a variação de custo"],
                ["Contratos que geram receita ou de eficiência", "Prazos mais longos, ampliados quando há investimento do contratado", "Exige projeção de retorno, não apenas preço de entrada"],
              ]}
            />
            <P>
              O erro que vejo com frequência é tratar prorrogação como direito
              adquirido. Não é. A prorrogação depende de o órgão demonstrar que a
              contratação continua vantajosa e de você continuar habilitado, com
              certidões válidas e sem sanção impeditiva. Empresa que deixa a
              regularidade fiscal vencer no mês da renovação perde o contrato sem
              nunca ter executado mal.
            </P>
            <P>
              O outro erro é precificar cinco anos com a margem de doze meses.
              Contrato longo sem cláusula de reajuste clara é um problema que se
              descobre no segundo ano, quando o custo já subiu e o preço não.
            </P>
          </Secao>

          <Secao id="aditivos" titulo="Aditivos: os limites de 25% e 50%">
            <P>
              Termo aditivo é o instrumento que formaliza a mudança. E existe uma
              confusão que aparece em quase toda discussão sobre o tema: os
              percentuais valem sobre o valor inicial atualizado do contrato, não
              sobre o saldo que resta executar.
            </P>
            <Tabela
              cabecalho={["Situação", "Limite", "Você é obrigado a aceitar?"]}
              linhas={[
                ["Acréscimo em obra, serviço ou compra", "25% do valor inicial atualizado", "Sim, dentro do limite e nas mesmas condições contratuais"],
                ["Acréscimo em reforma de edifício ou equipamento", "50% do valor inicial atualizado", "Sim, dentro do limite"],
                ["Supressão", "25% do valor inicial atualizado", "Sim. Acima disso, só por acordo entre as partes"],
                ["Alteração qualitativa do objeto", "Sem percentual próprio, mas não pode desnaturar o objeto licitado", "Depende. Mudança que transforma o objeto contratado em outro fere a licitação que você venceu"],
              ]}
            />
            <P>
              A alteração qualitativa é a mais delicada das quatro. Ela é legítima
              quando a solução técnica precisa mudar para o objeto funcionar, e
              indevida quando serve para entregar, por aditivo, algo que nunca foi
              licitado. A pergunta prática: se o edital tivesse descrito o objeto
              como ele está ficando, outras empresas teriam participado? Se a
              resposta é sim, o aditivo tem problema.
            </P>
            <P>
              Vale registrar uma armadilha operacional que não aparece na lei:
              começar a executar o acréscimo antes de o aditivo estar assinado. É
              comum o fiscal pedir a mais “que o aditivo sai depois”. Se não sair,
              você executou de graça, e cobrar depois vira pedido de indenização
              por enriquecimento sem causa, um caminho longo e incerto. Nenhuma
              quantidade a mais sem documento.
            </P>
            <P>
              Alteração combinada verbalmente não existe para efeito de pagamento.
              O contrato administrativo é formal, e o que sustenta o seu crédito é
              o papel, não a boa relação com o fiscal, que, aliás, pode ser
              trocado no mês seguinte.
            </P>
          </Secao>

          <Secao id="precos" titulo="Reajuste, repactuação e reequilíbrio">
            <P>
              Estes três institutos são tratados como sinônimos na conversa do dia
              a dia e não são. Pedir o instrumento errado é a razão mais comum de
              indeferimento. O órgão nega, e a empresa conclui que “não tem
              direito”, quando na verdade pediu pela porta errada.
            </P>
            <Tabela
              cabecalho={["Instituto", "Quando cabe", "O que você precisa apresentar"]}
              linhas={[
                ["Reajuste em sentido estrito", "Passado um ano, para corrigir a inflação do período pelo índice previsto no contrato", "Praticamente nada além do cálculo pelo índice pactuado. É quase automático"],
                ["Repactuação", "Serviços contínuos com dedicação exclusiva de mão de obra, quando o custo da folha muda", "Planilha de custos demonstrando a variação, normalmente a partir da nova convenção coletiva"],
                ["Reequilíbrio econômico-financeiro", "Evento imprevisível, ou previsível de consequências incalculáveis, que quebra a equação do contrato", "Prova do fato, prova do impacto e nexo entre os dois. É o mais difícil dos três"],
              ]}
            />
            <P>
              Duas regras práticas evitam a maior parte das perdas. A primeira: o
              interregno mínimo de um ano vale para reajuste e repactuação, e
              conta da data-base. Não da assinatura, quando a data-base é a da
              convenção coletiva. A segunda: peça antes de assinar a prorrogação.
            </P>
            <P>
              Essa segunda regra merece destaque porque é a que mais dói. Se você
              assina o termo de prorrogação sem ressalvar o reajuste a que já
              tinha direito, o entendimento consolidado é de que houve preclusão.
              você abriu mão. Não é injustiça, é consequência de ter concordado com
              a continuidade nas condições anteriores. Uma linha de ressalva no
              termo preserva o pedido.
            </P>
            <P>
              No reequilíbrio, o erro típico é pedir com base na notícia. Alta do
              dólar, do combustível ou do insumo não sustenta pedido sozinha: é
              preciso mostrar a planilha que embasou a proposta, a planilha atual e
              a diferença atribuível ao evento. Sem os três, o pedido não tem como
              ser deferido, por mais real que a alta tenha sido.
            </P>
          </Secao>

          {/*
            Depois de reajuste e preclusão, que é onde a dor de "o prazo passou
            batido" fica nítida. A chamada precisa começar dizendo o que o
            produto NÃO faz: ele não vigia a data-base do seu contrato, isso é
            calendário interno. Prometer o contrário aqui geraria cancelamento no
            primeiro envio. O que ele cobre de verdade é o outro lado do mesmo
            calendário — o certame que substitui o contrato em fim de vigência.

            Sem heading próprio: o `Indice` promete uma lista fechada de seções,
            e um h2 comercial faria o sumário discordar do documento.
          */}
          <section aria-label="Alerta diário de editais">
            <CapturaAlerta
              origem="guia/contratos#meio"
              chamada={{
                titulo: "Contrato que está acabando volta como edital, e costuma pegar o fornecedor de surpresa",
                texto:
                  "Não acompanhamos o seu contrato: data-base, ressalva e prorrogação são calendário interno da sua empresa. O que chega, todo dia útil, são os editais publicados no PNCP que combinam com o que você vende, inclusive o certame que vai substituir um contrato em fim de vigência, com prazo e link para o registro oficial.",
              }}
              textoDoBotao="Quero receber os editais do meu ramo"
            />
          </section>

          <Secao id="garantia" titulo="Garantia contratual">
            <P>
              A garantia é exigível quando o edital previu, e a escolha da
              modalidade é sua, não do órgão. O percentual usual é de até 5% do
              valor inicial, podendo chegar a 10% mediante justificativa técnica
              sobre complexidade e riscos. Em obras e serviços de engenharia de
              grande vulto, a lei admite seguro-garantia com cláusula de retomada,
              em percentual bem superior. O instrumento que permite à seguradora
              assumir a obra em caso de inadimplemento.
            </P>
            <Tabela
              cabecalho={["Modalidade", "Custo típico", "Quando faz sentido"]}
              linhas={[
                ["Caução em dinheiro", "Custo de oportunidade do capital parado", "Contratos pequenos e curtos, quando o valor imobilizado é irrelevante"],
                ["Títulos da dívida pública", "Baixo, mas com exigências formais de emissão e registro", "Pouco usada, sobrevive em casos específicos"],
                ["Seguro-garantia", "Prêmio sobre o valor garantido", "Padrão de mercado. Não imobiliza capital e é o único que comporta cláusula de retomada"],
                ["Fiança bancária", "Tarifa do banco, e costuma consumir limite de crédito", "Quando já existe relacionamento bancário com limite ocioso"],
              ]}
            />
            <P>
              O ponto que passa despercebido: garantia não é dinheiro perdido, é
              custo financeiro que precisa estar dentro da proposta. Empresa que
              não precificou o prêmio do seguro nem o limite de crédito consumido
              pela fiança descobre o custo depois de já ter dado o lance final.
            </P>
            <P>
              Cuidado também com a vigência. Contrato prorrogado exige garantia
              prorrogada, e apólice vencida no meio da execução é descumprimento
              contratual, com multa própria, independentemente de o serviço estar
              impecável.
            </P>
          </Secao>

          <Secao id="pagamento" titulo="Pagamento, ordem cronológica e retenções">
            <P>
              O pagamento deve ocorrer no prazo de até trinta dias contados da
              liquidação da despesa, que é o momento em que o órgão atesta que a
              entrega ocorreu como devido. A contagem, portanto, não começa na
              emissão da nota, e sim no atesto. Nota emitida sem entrega atestada
              não faz o relógio andar.
            </P>
            <P>
              Sobre esse prazo incide a ordem cronológica de exigibilidade: dentro
              de cada fonte de recursos, o órgão segue a ordem dos créditos por
              categoria, fornecimento de bens, locações, prestação de serviços e
              realização de obras. A finalidade é impedir favorecimento. E como a
              relação é pública, dá para conferir se você foi preterido.
            </P>
            <P>
              Em serviços com dedicação exclusiva de mão de obra existe ainda a
              retenção de valores para garantir obrigações trabalhistas, com
              depósito em conta vinculada e liberação condicionada à comprovação
              do pagamento aos empregados. Não é confisco, é garantia, mas afeta
              o seu fluxo de caixa e precisa estar na planilha desde a proposta.
            </P>
            <P>
              Se o atraso passar de dois meses, contados da emissão da nota
              fiscal, a lei permite ao contratado optar pela suspensão da
              execução. Antes disso, parar por conta própria inverte os papéis: o
              inadimplente passa a ser você. O procedimento correto é notificar
              formalmente, protocolar com número, e só então exercer a opção.
            </P>
          </Secao>

          <Secao id="fiscalizacao" titulo="Quem manda no contrato: gestor e fiscal">
            <P>
              A execução é acompanhada por representantes designados pela
              administração, e a distinção entre os papéis evita muito
              desentendimento. O gestor cuida da vida do contrato, prazos,
              aditivos, prorrogação, sanções. O fiscal acompanha a execução no dia
              a dia e registra o que acontece.
            </P>
            <P>
              A consequência prática é simples: promessa de fiscal não vale como
              alteração contratual. Ele registra, informa e propõe; quem decide
              sobre a vida do contrato é o gestor, e o que muda o contrato é o
              termo aditivo assinado por quem tem competência para assinar.
            </P>
            <P>
              Há um limite que protege a sua empresa e costuma ser esquecido: em
              serviços com mão de obra alocada, a fiscalização não pode se
              transformar em comando direto dos seus empregados. Fiscal que
              distribui tarefa, controla ponto e concede folga cria elementos de
              pessoalidade e subordinação, problema que volta como passivo
              trabalhista, e cuja prova, nesse caso, joga a favor da sua defesa.
            </P>
          </Secao>

          <Secao id="extincao" titulo="Extinção, inadimplência e o direito de parar">
            <P>
              A Lei 14.133 usa “extinção” onde a lei anterior falava em rescisão,
              e organiza as hipóteses de forma mais clara. Ela pode se dar por ato
              unilateral da administração, por acordo entre as partes ou por
              decisão judicial ou arbitral.
            </P>
            <Tabela
              cabecalho={["Causa", "Quem provoca", "Efeito para você"]}
              linhas={[
                ["Inadimplemento do contratado", "Administração, por ato unilateral", "Extinção com culpa: perda da garantia, multa e possível impedimento de licitar"],
                ["Interesse público justificado", "Administração", "Extinção sem culpa: direito ao pagamento do executado e à indenização do que foi comprovadamente investido"],
                ["Atraso de pagamento superior a 2 meses", "Contratado", "Direito de optar pela suspensão da execução, e de pleitear a extinção"],
                ["Caso fortuito ou força maior", "Qualquer das partes", "Extinção sem culpa, com acerto de contas do que foi executado"],
              ]}
            />
            <P>
              Em qualquer das hipóteses, o que decide a disputa é o registro. Data
              de cada ocorrência, protocolo de cada notificação, cópia de cada
              comunicação com o gestor. Empresa que chega ao processo com
              cronologia documentada discute em condição completamente diferente
              da que chega com versão oral dos fatos.
            </P>
          </Secao>

          <Secao id="sancoes" titulo="Sanções: da advertência à inidoneidade">
            <P>
              As sanções vão da advertência à declaração de inidoneidade, e a
              diferença entre elas não é de grau apenas. É de sobrevivência da
              empresa no mercado público.
            </P>
            <Tabela
              cabecalho={["Sanção", "Alcance", "Duração"]}
              linhas={[
                ["Advertência", "Registro da falta, sem efeito impeditivo", "não se aplica"],
                ["Multa", "Percentual previsto no edital e no contrato", "não se aplica"],
                ["Impedimento de licitar e contratar", "Alcança o ente federativo que aplicou", "Até 3 anos"],
                ["Declaração de inidoneidade", "Alcança toda a administração pública", "De 3 a 6 anos"],
              ]}
            />
            <P>
              Nenhuma delas pode ser aplicada sem processo, contraditório e ampla
              defesa, com decisão motivada e dosimetria proporcional à falta.
              Multa aplicada por e-mail do fiscal, sem processo, é nula, e               contestar no prazo é obrigação sua, porque sanção não impugnada se
              consolida e passa a aparecer na sua consulta de habilitação.
            </P>
            <P>
              Um efeito colateral que pega muita empresa desprevenida: sanção
              registrada impede a prorrogação de outros contratos e a habilitação
              em novos certames. O prejuízo raramente fica confinado ao contrato
              em que a falta ocorreu.
            </P>
          </Secao>

          <Secao id="erros" titulo="Cinco erros que custam caro na execução">
            <Tabela
              cabecalho={["Erro", "O que acontece"]}
              linhas={[
                ["Executar acréscimo antes do aditivo assinado", "Trabalho entregue sem cobertura contratual, e cobrança que vira pedido de indenização"],
                ["Assinar prorrogação sem ressalvar o reajuste devido", "Preclusão: o direito existia e foi abandonado na assinatura"],
                ["Deixar certidão ou garantia vencer durante a vigência", "Prorrogação negada e multa por descumprimento, mesmo com execução impecável"],
                ["Parar a execução por falta de pagamento antes do prazo legal", "Inverte a inadimplência: quem para vira o inadimplente"],
                ["Tratar por telefone o que precisa de protocolo", "Sem registro, a versão do órgão prevalece no processo administrativo"],
              ]}
            />
            <P>
              Os cinco têm a mesma raiz: o contrato administrativo é formal, e
              formalidade é a única prova que sobrevive à troca de gestor, de
              fiscal e de governo. Se você ainda não leu o comparativo entre as
              duas leis, comece pelo{" "}
              <a className="underline underline-offset-4" href="/lei-14133/">
                guia da Lei 14.133
              </a>
              . Para entender como os tribunais interpretam essas cláusulas na
              prática, veja o guia de{" "}
              <a className="underline underline-offset-4" href="/jurisprudencia/">
                jurisprudência em licitações
              </a>
              .
            </P>
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes sobre contrato administrativo">
            <Faq itens={FAQ} />
          </Secao>

          <Secao id="fontes" titulo="Fontes">
            <ul className="space-y-2 text-[var(--muted)]">
              <li>
                <a className="underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm" target="_blank" rel="noopener">
                  Lei nº 14.133/2021 (Planalto)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://portal.tcu.gov.br/jurisprudencia/" target="_blank" rel="noopener">
                  Jurisprudência do Tribunal de Contas da União
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="https://www.pncp.gov.br/" target="_blank" rel="noopener">
                  Portal Nacional de Contratações Públicas
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
              Artigos sobre execução de contrato
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
          parecer jurídico, a análise de um contrato concreto, a redação de
          pedidos de reequilíbrio e a defesa em processo sancionatório cabem à
          empresa contratada e ao seu assessor jurídico. Leia o{" "}
          <a className="underline underline-offset-4" href="/aviso-legal/">
            aviso legal
          </a>
          .
        </p>
      </main>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
