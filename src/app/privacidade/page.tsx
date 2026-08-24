import type { Metadata } from "next";
import { CONTATO, SITE, IMAGENS_DE_COMPARTILHAMENTO } from "@/lib/site";
import { P, RespostaDireta, Secao, Tabela } from "@/components/Prose";
import { CabecalhoSite, Trilha } from "@/components/Navegacao";
import { RodapeSite } from "@/components/RodapeSite";

/**
 * A política de privacidade, escrita contra o código.
 *
 * ## Por que cada afirmação daqui foi conferida no repositório
 *
 * Política de privacidade é o documento onde mais se copia modelo pronto — e
 * modelo pronto descreve práticas que a empresa não tem. Isso é pior do que não
 * ter política: vira declaração falsa ao titular, que é exatamente o que a LGPD
 * pune, e contradiz a regra que rege este projeto inteiro (nunca afirmar o que
 * não foi verificado).
 *
 * Então cada afirmação abaixo saiu de uma verificação no código, e as principais
 * são estas:
 *
 * - **Campos coletados** — lidos das migrations: `leads`, `empresas`,
 *   `perfis_da_empresa`.
 * - **Ausência de rastreamento** — `grep` por gtag, Google Analytics, GTM,
 *   PostHog, Mixpanel, Hotjar, pixel do Facebook, Plausible e Umami no `src/`
 *   inteiro: nenhuma ocorrência.
 * - **Cookies** — só dois, os dois funcionais: a sessão do Supabase Auth e
 *   `lv_preferencias_de_alerta`.
 * - **O que vai para a IA** — `segmentarEdital` recebe `texto: string`, e o
 *   prompt monta a ficha a partir do `Edital`. O perfil da empresa não entra em
 *   nenhum dos dois caminhos.
 *
 * Se alguma dessas coisas mudar no código, ESTA página passa a mentir. Por isso
 * `privacidade.test.ts` prende as duas que dá para prender automaticamente: a
 * ausência de rastreadores e a ausência do perfil no caminho da IA.
 */

const TITULO = "Privacidade e proteção de dados";
const DESCRICAO =
  "Quais dados coletamos, por quê, com quem compartilhamos e como você exerce seus direitos da LGPD. Sem rastreador, sem pixel de anúncio e sem venda de dados — verificado no código, não prometido.";
const ATUALIZADO = "2026-08-15";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/privacidade/" },
  openGraph: {
    images: IMAGENS_DE_COMPARTILHAMENTO,
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE.url}/privacidade/`,
    type: "website",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE.url}/privacidade/#webpage`,
      name: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      dateModified: ATUALIZADO,
      isPartOf: { "@id": `${SITE.url}/#website` },
      publisher: { "@id": `${SITE.url}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Privacidade", item: `${SITE.url}/privacidade/` },
      ],
    },
  ],
};

export default function Privacidade() {
  return (
    <div className="min-h-screen">
      <CabecalhoSite />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Trilha atual="Privacidade" />

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Privacidade e proteção de dados
        </h1>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Atualizado em 15 de agosto de 2026 · Lei 13.709/2018 (LGPD)
        </p>

        <div className="mt-8 space-y-6">
          <RespostaDireta>
            Coletamos o mínimo para entregar o que você pediu: o e-mail para
            mandar os editais, e o perfil da empresa para saber quais editais
            mandar. <strong>Não usamos pixel de anúncio, remarketing nem
            cookie de terceiro.</strong> Medimos audiência com duas ferramentas
            sem cookie, que contam visitas e não identificam pessoas, e as duas
            estão nomeadas abaixo. Não vendemos, alugamos nem cedemos seus dados
            a ninguém. Você pode pedir acesso, correção ou
            eliminação a qualquer momento, escrevendo para {CONTATO.email}.
          </RespostaDireta>
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="controlador" titulo="Quem é o responsável">
            <P>
              O controlador dos dados, no sentido do art. 5º, VI da LGPD, é{" "}
              <strong>{CONTATO.controlador}</strong>, responsável pelo{" "}
              {SITE.name} ({SITE.url}).
            </P>
            <P>
              O mesmo endereço serve para dúvida, reclamação e pedido de titular:{" "}
              <a
                className="underline underline-offset-4"
                href={`mailto:${CONTATO.email}`}
              >
                {CONTATO.email}
              </a>
              . Um canal só, monitorado — em vez de dois, com um esquecido.
            </P>
          </Secao>

          <Secao id="coletamos" titulo="O que coletamos, e por quê">
            <P>
              A tabela é a lista completa. Ela sai direto do esquema do banco, e
              não de um modelo genérico: se um campo não está aqui, ele não
              existe no sistema.
            </P>

            <Tabela
              cabecalho={["Dado", "Quando", "Para quê", "Base legal"]}
              linhas={[
                [
                  "E-mail",
                  "Ao pedir o alerta de editais, ou ao criar conta",
                  "Enviar os editais compatíveis e permitir o acesso à conta",
                  "Execução do serviço que você pediu (art. 7º, V)",
                ],
                [
                  "Cidade ou região de interesse",
                  "No formulário de alerta",
                  "Saber quais editais interessam a você",
                  "Execução do serviço (art. 7º, V)",
                ],
                [
                  "Página de origem do cadastro",
                  "Junto do formulário",
                  "Saber qual conteúdo trouxe o cadastro, para melhorá-lo",
                  "Legítimo interesse (art. 7º, IX)",
                ],
                [
                  "CNPJ, razão social e nome fantasia",
                  "Ao cadastrar a empresa",
                  "Identificar a empresa e isolar os dados dela dos demais clientes",
                  "Execução do serviço (art. 7º, V)",
                ],
                [
                  "Perfil: porte, faturamento, CNAEs, palavras-chave, regiões, faixa de valor e modalidades",
                  "No cadastro do perfil",
                  "Decidir quais editais são compatíveis com a empresa — é o coração da triagem",
                  "Execução do serviço (art. 7º, V)",
                ],
                [
                  "Datas de cadastro, confirmação e descadastro",
                  "Automático",
                  "Provar que houve confirmação e respeitar o descadastro",
                  "Cumprimento de obrigação e defesa (art. 7º, II e VI)",
                ],
              ]}
            />

            <P>
              <strong>Não coletamos</strong> CPF, telefone, endereço, dado
              bancário, documento de identidade nem qualquer dado sensível na
              acepção do art. 5º, II. Não pedimos, não guardamos e não temos onde
              guardar — não há coluna para eles no banco.
            </P>
          </Secao>

          <Secao id="rastreamento" titulo="Medição de audiência, e o que não fazemos">
            <P>
              <strong>
                O site não tem Google Analytics, Tag Manager, pixel do Facebook,
                Hotjar, PostHog nem Mixpanel.
              </strong>{" "}
              Não é escolha de configuração que possa ser revertida sem querer: o
              código simplesmente não os contém, e um teste automatizado reprova
              a publicação se algum deles entrar.
            </P>
            <P>
              O que existe são duas ferramentas de medição de audiência, e
              preferimos nomeá-las a esconder atrás de uma frase genérica:{" "}
              <strong>Vercel Analytics</strong> e{" "}
              <strong>Ahrefs Web Analytics</strong>. Nenhuma das duas usa cookie,
              nenhuma acompanha você entre sites, e nenhuma recebe o seu e-mail
              ou o perfil da sua empresa. Elas contam quantas pessoas abriram
              cada página, de que país e por qual link chegaram. É o suficiente
              para sabermos qual conteúdo é útil, e é menos do que o seu provedor
              de internet já sabe.
            </P>
            <P>
              Não há publicidade, rede de anúncios, remarketing nem cookie de
              terceiro. Você não é o produto aqui: quem paga pelo serviço é quem
              o assina, e é por isso que medir audiência nos serve para escrever
              melhor, não para revender atenção.
            </P>

            <Tabela
              cabecalho={["Cookie", "Para quê", "Necessário?"]}
              linhas={[
                [
                  "Sessão de autenticação (Supabase Auth)",
                  "Manter você conectado entre as páginas depois do login",
                  "Sim — sem ele não existe área logada",
                ],
                [
                  "lv_preferencias_de_alerta",
                  "Lembrar suas preferências de alerta na tela de configurações",
                  "Sim — é o que guarda a sua escolha",
                ],
              ]}
            />

            <P>
              Os dois são cookies funcionais e estritamente necessários ao que
              você pediu, e por isso não há banner de consentimento pedindo
              autorização para eles. Se um dia entrar cookie de medição ou de
              anúncio, entra o banner junto — e esta seção muda antes.
            </P>
          </Secao>

          <Secao id="ia" titulo="O que a inteligência artificial recebe">
            <P>
              A leitura automática dos editais usa um modelo do Google (Gemini).
              O que é enviado a ele é <strong>o texto do edital e dos anexos
              publicados pelo órgão</strong> — documentos públicos, obtidos do
              Portal Nacional de Contratações Públicas — junto dos dados da
              publicação: objeto, órgão, município, modalidade, valor e prazo.
            </P>
            <P>
              <strong>
                O perfil da sua empresa não é enviado ao modelo, e o seu e-mail
                também não.
              </strong>{" "}
              A comparação entre o edital e o perfil acontece no nosso próprio
              servidor, com regras determinísticas, depois que a leitura volta. O
              modelo lê o edital; ele não sabe para quem.
            </P>
            <P>
              Isso não é uma promessa de intenção: é como o código está
              construído, e há teste automatizado prendendo esse comportamento
              para que uma alteração futura não o quebre em silêncio.
            </P>
          </Secao>

          <Secao id="terceiros" titulo="Com quem os dados trafegam">
            <P>
              Não vendemos, não alugamos e não cedemos dados. Os terceiros abaixo
              são fornecedores de infraestrutura — operadores, no vocabulário da
              LGPD — e cada um recebe só o necessário para a função dele.
            </P>

            <Tabela
              cabecalho={["Fornecedor", "Função", "O que ele acessa"]}
              linhas={[
                [
                  "Supabase",
                  "Banco de dados e autenticação",
                  "Todos os dados de cadastro, isolados por empresa no próprio banco",
                ],
                [
                  "Vercel",
                  "Hospedagem do site",
                  "Dados de conexão necessários para servir as páginas",
                ],
                [
                  "Resend",
                  "Envio dos e-mails",
                  "Seu e-mail e o conteúdo da mensagem enviada",
                ],
                [
                  "Google (Gemini)",
                  "Leitura automática dos editais",
                  "Somente o texto de editais públicos — nenhum dado seu",
                ],
              ]}
            />

            <P>
              Parte desses serviços processa dados fora do Brasil. A transferência
              internacional é permitida pelo art. 33 da LGPD quando necessária
              para a execução do contrato com o titular, que é o caso aqui.
            </P>
          </Secao>

          <Secao id="direitos" titulo="Seus direitos, e como exercê-los">
            <P>
              O art. 18 da LGPD te dá direito a confirmar se tratamos seus dados,
              acessá-los, corrigi-los, pedir anonimização ou eliminação, pedir
              portabilidade, saber com quem compartilhamos e revogar consentimento.
            </P>
            <P>
              Para exercer qualquer um deles, escreva para{" "}
              <a
                className="underline underline-offset-4"
                href={`mailto:${CONTATO.email}`}
              >
                {CONTATO.email}
              </a>
              . Respondemos em até 15 dias. Não cobramos por isso e não pedimos
              justificativa.
            </P>
            <P>
              Para parar de receber os e-mails não é preciso escrever: todo alerta
              traz um link de descadastro que funciona com um clique, sem login.
            </P>
          </Secao>

          <Secao id="retencao" titulo="Por quanto tempo guardamos — e uma ressalva honesta">
            <P>
              Enquanto você usa o serviço, os dados ficam. Encerrada a relação,
              eles são eliminados a pedido, e os registros que a lei manda
              preservar — a prova de que houve consentimento e descadastro —
              podem ser mantidos pelo prazo legal, na forma do art. 16.
            </P>
            <P>
              <strong>A ressalva:</strong> hoje, quando você clica em descadastrar,
              o sistema <em>marca</em> o seu cadastro como descadastrado e para de
              enviar — ele não apaga a linha automaticamente. A marca é o que
              impede que um novo cadastro acidental volte a te enviar e-mail. Se
              você quiser a <strong>eliminação</strong> dos dados, e não só a
              parada dos envios, peça pelo e-mail acima e nós apagamos.
            </P>
            <P>
              Preferimos dizer isso a escrever “seus dados são excluídos
              imediatamente” e não ser verdade.
            </P>
          </Secao>

          <Secao id="seguranca" titulo="Como os dados são protegidos">
            <P>
              O banco usa isolamento por linha (RLS) ativado por padrão: uma
              consulta só enxerga os dados da empresa a que o usuário pertence, e
              a regra é aplicada pelo banco, não pela aplicação. Isso significa
              que um erro de programação numa tela não é suficiente para vazar
              dado de um cliente para outro — a segunda barreira está embaixo.
            </P>
            <P>
              Nenhuma senha é guardada por nós: a autenticação é delegada ao
              Supabase Auth. O tráfego é todo por HTTPS.
            </P>
            <P>
              Se ainda assim houver incidente de segurança relevante, comunicamos
              os titulares afetados e a ANPD, como manda o art. 48.
            </P>
          </Secao>

          <Secao id="mudancas" titulo="Quando esta página mudar">
            <P>
              A data no topo é a da última revisão. Mudança que amplie o uso dos
              seus dados — um rastreador novo, um fornecedor novo, uma finalidade
              nova — é avisada por e-mail a quem estiver cadastrado, antes de
              entrar em vigor. Correção de redação, não.
            </P>
          </Secao>
        </div>
      </main>

      <RodapeSite />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
