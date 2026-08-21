import type { Metadata } from "next";
import { SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { Faq, P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";
import { CapturaAlerta } from "@/components/CapturaAlerta";

const TITULO = "Como funciona: do edital publicado ao seu e-mail";
const DESCRICAO =
  "As quatro etapas entre um órgão publicar um edital no PNCP e ele chegar filtrado no seu e-mail: coleta diária, revisão automática dos dados, filtro pelo seu perfil e entrega. Com o que já está no ar e o que ainda não está.";
const ATUALIZADO = "2026-08-12";

export const metadata: Metadata = {
  title: "Como funciona o alerta de licitações",
  description: DESCRICAO,
  alternates: { canonical: "/como-funciona/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO, title: TITULO, description: DESCRICAO, url: `${SITE.url}/como-funciona/`, type: "website" },
};

const FAQ = [
  {
    pergunta: "Com que frequência os dados são atualizados?",
    resposta:
      "A coleta roda uma vez por dia, de madrugada, e o alerta sai pela manhã nos dias úteis. Edital publicado durante o dia entra na coleta seguinte — por isso o alerta traz o prazo de encerramento em destaque, para você julgar a urgência.",
  },
  {
    pergunta: "Vocês leem o edital para mim?",
    resposta:
      "No alerta gratuito, não: ele traz objeto, órgão, valor, prazo e o link direto para o registro oficial, para a decisão de abrir ser rápida. Com a empresa cadastrada, sim — mas não todos. Todo dia lemos os de maior aderência ao seu perfil, e é neles que aparecem as exigências de habilitação, a garantia, a visita técnica e os riscos extraídos do texto. Nos demais, o que você vê é o que o órgão publicou, e a tela diz explicitamente qual é o caso. Nem a leitura substitui ler o edital inteiro antes de disputar: quando o nosso resumo divergir do documento, vale o documento.",
  },
  {
    pergunta: "Como vocês sabem que um edital é do meu ramo?",
    resposta:
      "Pelo que você declara no cadastro: cidade, atividade e faixa de valor que faz sentido para o seu porte. O filtro trabalha sobre o objeto declarado pelo órgão — e como a descrição varia muito entre órgãos, o alerta erra mais para o lado de mostrar do que de esconder.",
  },
  {
    pergunta: "E se o dado estiver errado na origem?",
    resposta:
      "Acontece, e não escondemos. Toda coleta passa por verificações automáticas de consistência, e o que não bate é sinalizado junto do edital em vez de ser repassado como se fosse fato. O que não conseguimos determinar, dizemos que não conseguimos.",
  },
  {
    pergunta: "Preciso instalar alguma coisa?",
    resposta:
      "Não. Tudo chega por e-mail. Não há software para instalar, nem painel obrigatório para acessar todo dia — a ideia é justamente eliminar mais um site do seu dia.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE.url}/como-funciona/#webpage`,
      name: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      dateModified: ATUALIZADO,
      isPartOf: { "@id": `${SITE.url}/#website` },
      publisher: { "@id": `${SITE.url}/#organization` },
    },
    {
      "@type": "HowTo",
      "@id": `${SITE.url}/como-funciona/#howto`,
      name: "Como um edital chega até você",
      description:
        "Etapas entre a publicação de um edital no Portal Nacional de Contratações Públicas e a chegada dele, filtrado, no e-mail do fornecedor.",
      step: [
        { "@type": "HowToStep", position: 1, name: "Coleta diária", text: "Os editais com propostas abertas são coletados da API pública do PNCP, uma vez por dia." },
        { "@type": "HowToStep", position: 2, name: "Revisão automática", text: "Cada lote passa por verificações de consistência antes de ser usado, e as inconsistências encontradas são sinalizadas." },
        { "@type": "HowToStep", position: 3, name: "Filtro pelo seu perfil", text: "Os editais são filtrados pela cidade, pela atividade e pela faixa de valor declaradas no cadastro." },
        { "@type": "HowToStep", position: 4, name: "Entrega por e-mail", text: "O resultado chega por e-mail nos dias úteis, com objeto, órgão, valor, prazo e link para o registro oficial." },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE.url}/como-funciona/#faq`,
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
        { "@type": "ListItem", position: 2, name: "Como funciona", item: `${SITE.url}/como-funciona/` },
      ],
    },
  ],
};

export default function ComoFunciona() {
  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Como funciona" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Como funciona
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">
          O caminho entre um órgão publicar um edital e ele chegar filtrado no
          seu e-mail — incluindo o que ainda não está pronto.
        </p>

        <div className="mt-8 space-y-6">
          <RespostaDireta>
            São quatro etapas: coleta diária na base oficial, revisão automática
            dos dados, filtro pelo seu perfil e entrega por e-mail nos dias
            úteis. A parte que costuma faltar em serviços parecidos é a segunda —
            e é a que decide se o que chega até você merece confiança.
          </RespostaDireta>
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="etapa-1" titulo="1. Coleta: uma fonte só, a oficial">
            <P>
              Todo edital tem que ser publicado no Portal Nacional de
              Contratações Públicas — a divulgação ali é obrigatória para
              qualquer órgão, em qualquer estado ou município. É de lá que
              coletamos, uma vez por dia, de madrugada.
            </P>
            <P>
              Não raspamos sites de prefeitura nem dependemos de portal privado.
              A coleta usa a API pública do PNCP, com ritmo controlado para não
              sobrecarregar um serviço público. Na última execução foram{" "}
              <strong>3.312 editais abertos</strong>, em{" "}
              <strong>639 municípios</strong> de seis estados.
            </P>
            <P>
              Isso importa por um motivo concreto: a disputa acontece espalhada
              em dezenas de sistemas — medimos 54 deles numa única amostra — mas
              a <em>publicação</em> é centralizada. Acompanhar a fonte
              centralizada é o que torna a cobertura possível.
            </P>
          </Secao>

          <Secao id="etapa-2" titulo="2. Revisão: o dado passa por conferência antes de ser usado">
            <P>
              Esta é a etapa que quase ninguém tem, e a razão dela é simples:
              base pública tem erro. Não por má-fé, mas porque milhares de
              servidores preenchem formulário todo dia.
            </P>
            <Tabela
              cabecalho={["O que é conferido", "Exemplo do que pega"]}
              linhas={[
                ["Coerência de prazo", "Encerramento registrado antes da abertura"],
                ["Prazo ainda válido", "Edital devolvido como aberto com prazo já vencido"],
                ["UF x código do município", "Cadastro com estado que não corresponde ao código IBGE"],
                ["CNPJ do órgão", "Número que não passa na verificação dos dígitos"],
                ["Descrição do objeto", "Texto curto demais para dizer o que está sendo comprado"],
                ["Plausibilidade do valor", "Valor que destoa de todos os outros da mesma modalidade"],
              ]}
            />
            <P>
              O último caso é o mais ilustrativo. Na primeira coleta apareceu um
              pregão de mobiliário declarado a{" "}
              <strong>R$ 77,84 bilhões</strong> — sozinho, 88% do total de seis
              estados. É erro de digitação na origem, e sem tratamento ele
              contaminaria qualquer soma que exibíssemos.
            </P>
            <RespostaDireta>
              A regra é não inventar. O edital continua aparecendo, com aviso de
              que o valor parece incoerente, e fica fora de qualquer total. Onde
              existe hipótese de correção derivável do próprio dado, ela é
              apresentada como hipótese. Quando mais de uma cabe — como nesse
              caso —, dizemos que não é possível determinar qual é a certa.
            </RespostaDireta>
            <P>
              O método completo, com as limitações conhecidas, está em{" "}
              <a className="underline underline-offset-4" href="/metodologia/">
                metodologia
              </a>
              .
            </P>
          </Secao>

          <Secao id="etapa-3" titulo="3. Filtro: o que é seu, e só o que é seu">
            <P>
              De 3.312 editais abertos, a esmagadora maioria não interessa a
              você. O filtro trabalha sobre três coisas que você declara no
              cadastro:
            </P>
            <Tabela
              cabecalho={["Critério", "Por quê"]}
              linhas={[
                ["Cidade ou região", "Define o que é logisticamente viável para a sua operação"],
                ["Atividade da empresa", "Cruza o que você fornece com o objeto declarado pelo órgão"],
                ["Faixa de valor", "Evita mostrar contrato grande demais ou pequeno demais para o seu porte"],
              ]}
            />
            <P>
              Uma escolha deliberada: o filtro erra para o lado de mostrar. A
              descrição do objeto varia muito entre órgãos — o mesmo item vira
              “aquisição de gêneros alimentícios” num edital e “merenda escolar”
              noutro. Um filtro apertado demais esconde contrato que você
              ganharia, e esse erro custa mais caro que ver uma linha a mais.
            </P>
          </Secao>

          <Secao id="etapa-4" titulo="4. Entrega: no e-mail, nos dias úteis">
            <P>
              O resultado chega por e-mail pela manhã. Cada linha traz o
              objeto, o órgão comprador, o valor estimado, quantos dias faltam
              para encerrar e o link direto para o registro oficial no PNCP.
            </P>
            <P>
              Quando o órgão não informou o valor, o e-mail diz isso — em vez de
              exibir zero como se fosse preço. Quando a revisão sinalizou algo, o
              aviso vem junto da linha, não escondido em nota de rodapé.
            </P>
            <P>
              Sem painel obrigatório, sem app para instalar. A proposta é
              eliminar sites do seu dia, não acrescentar mais um.
            </P>
          </Secao>

          <Secao id="exemplo" titulo="Um edital de verdade, passo a passo">
            <P>
              Para sair do abstrato, um caso real da coleta de 12 de agosto de
              2026. Nada aqui é inventado para ilustrar — é um registro público,
              e o link no fim leva ao original.
            </P>
            <Tabela
              cabecalho={["Etapa", "O que aconteceu com este edital"]}
              linhas={[
                ["Publicação", "A Prefeitura de Serra Talhada (PE) publicou no PNCP um pregão eletrônico para hospedagem com alimentação"],
                ["1 · Coleta", "Entrou na coleta da madrugada, junto com outros 3.311 editais abertos"],
                ["2 · Revisão", "Passou nas seis verificações: prazo coerente, código IBGE 2613909 compatível com PE, CNPJ válido, objeto descritivo, valor plausível"],
                ["3 · Filtro", "Chegaria a quem declarou Serra Talhada ou região, atividade de hotelaria ou alimentação, e faixa de valor compatível com R$ 255 mil"],
                ["4 · Entrega", "No e-mail: objeto, órgão, R$ 255.058,40, prazo encerrando em 13/08 às 7h, e o link direto"],
              ]}
            />
            <P>
              Repare no que a etapa 4 entrega de útil: o fornecedor de hotelaria
              de Serra Talhada descobre em uma linha que existe um contrato de
              R$ 255 mil no ramo dele, na cidade dele, com prazo fechando — sem
              ter aberto nenhum portal. Se ele conferisse os sistemas uma vez por
              semana, teria boa chance de ver isso depois de encerrado.
            </P>
            <P>
              O registro original está{" "}
              <a className="underline underline-offset-4" href="https://pncp.gov.br/app/editais/10282945000105/2026/84" target="_blank" rel="noopener">
                no PNCP
              </a>
              . É sempre assim: o alerta leva você à fonte, não substitui a
              fonte.
            </P>
          </Secao>

          <Secao id="falhas" titulo="Quando a fonte falha — porque ela falha">
            <P>
              O PNCP é um serviço público e sai do ar como qualquer outro. Não é
              hipótese: no dia em que a coleta entrou em operação, ele ficou
              indisponível duas vezes em poucas horas, com timeouts e erros de
              servidor. Um sistema que ignora isso entrega dado velho fingindo
              que é novo.
            </P>
            <Tabela
              cabecalho={["Situação", "O que a coleta faz"]}
              linhas={[
                ["Uma requisição falha", "Tenta de novo, com espera crescente, em vez de desistir na primeira"],
                ["O serviço limita o ritmo", "Reduz a cadência e espera o tempo necessário — nunca insiste a ponto de ser bloqueado"],
                ["Um estado inteiro não responde", "Os demais continuam, e a cobertura incompleta é declarada no relatório"],
                ["Nada pôde ser coletado", "Nenhum dado novo é publicado; o relatório registra a falha, com o motivo de cada estado"],
              ]}
            />
            <P>
              A escolha por trás disso: cobertura parcial anunciada é utilizável;
              coleta perdida em silêncio, não. Se num dia faltar um estado, o
              relatório daquele dia diz qual faltou e por quê — e você sabe que
              os números daquele dia não representam a região inteira.
            </P>
            <P>
              O mesmo vale para o ritmo da coleta. Ela é sequencial e com pausa
              entre requisições de propósito: martelar a API de um órgão público
              para ganhar alguns minutos seria transferir custo para um serviço
              que todo mundo usa, inclusive os concorrentes que dependem dele.
            </P>
          </Secao>

          <Secao id="estado" titulo="O que já está no ar, e o que ainda não está">
            <P>
              Esta seção existe porque prefiro perder um cadastro a conquistá-lo
              por omissão.
            </P>
            <Tabela
              cabecalho={["Etapa", "Estado hoje"]}
              linhas={[
                ["Coleta diária do PNCP", "No ar, automatizada, com execução diária agendada"],
                ["Revisão automática dos dados", "No ar, rodando a cada coleta"],
                ["Cobertura geográfica", "Seis estados: PE, PB, AL, RN, CE e SE"],
                ["Filtro por perfil", "Em construção"],
                ["Envio automático do e-mail", "Em construção — os primeiros envios serão feitos à mão"],
                ["Planos pagos", "Ainda não abertos"],
              ]}
            />
            <P>
              O motor de dados existe e funciona. O que está sendo montado é a
              camada de entrega. Enquanto ela não está pronta, o cadastro não
              está aberto — e o formulário desta página diz isso em vez de
              guardar o seu e-mail sem ter como cumprir a promessa.
            </P>
            <div className="mt-2">
              <CapturaAlerta origem="/como-funciona/" />
            </div>
          </Secao>

          <Secao id="nao-faz" titulo="O que este serviço não faz">
            <P>
              Ele não lê o edital por você na etapa gratuita, não garante
              habilitação, não avalia se você tem chance de ganhar e não emite
              opinião jurídica. Organiza, confere e entrega — a decisão de
              disputar é sua, e depende de ler o edital inteiro.
            </P>
            <P>
              O que cada exigência significa está nos guias:{" "}
              <a className="underline underline-offset-4" href="/habilitacao/">
                habilitação
              </a>
              ,{" "}
              <a className="underline underline-offset-4" href="/lei-14133/">
                Lei 14.133
              </a>{" "}
              e{" "}
              <a className="underline underline-offset-4" href="/vender-para-o-governo/">
                como vender para o governo
              </a>
              . Os limites do serviço estão no{" "}
              <a className="underline underline-offset-4" href="/aviso-legal/">
                aviso legal
              </a>
              .
            </P>
          </Secao>

          <Secao id="faq" titulo="Perguntas frequentes">
            <Faq itens={FAQ} />
          </Secao>
        </div>

        <p className="mt-12 text-sm leading-relaxed text-[var(--muted)]">
          Os dados vêm do Portal Nacional de Contratações Públicas. Em qualquer
          divergência, prevalece o edital.
        </p>
      </main>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
