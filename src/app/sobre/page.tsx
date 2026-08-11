import type { Metadata } from "next";
import { AUTHOR, KNOWS_ABOUT, SITE } from "@/lib/site";
import { P, Secao } from "@/components/Prose";
import { AutorBio } from "@/components/AutorBio";

const TITULO = `Sobre o ${SITE.name}`;
const DESCRICAO =
  "Quem escreve, como o conteúdo é apurado e o que aconteceu com o acervo publicado neste domínio desde 2016.";

export const metadata: Metadata = {
  // O template do layout já acrescenta o nome do site — repetir aqui viraria
  // "Sobre o Licitante Vencedor | Licitante Vencedor".
  title: "Sobre",
  description: DESCRICAO,
  alternates: { canonical: "/sobre/" },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE.url}/sobre/`, type: "profile" },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${SITE.url}/sobre/#about`,
      name: TITULO,
      description: DESCRICAO,
      inLanguage: SITE.locale,
      isPartOf: { "@id": `${SITE.url}/#website` },
      about: { "@id": `${SITE.url}/#organization` },
      mainEntity: { "@id": `${SITE.url}/#${AUTHOR.slug}` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Sobre", item: `${SITE.url}/sobre/` },
      ],
    },
  ],
};

export default function Sobre() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <a href="/" className="text-base font-semibold tracking-tight">{SITE.name}</a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <nav aria-label="Trilha" className="text-sm text-[var(--muted)]">
          <a href="/" className="underline-offset-4 hover:underline">Início</a>
          <span aria-hidden> › </span>
          <span>Sobre</span>
        </nav>

        <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Sobre o {SITE.name}
        </h1>

        <div className="mt-8">
          <AutorBio />
        </div>

        <div className="mt-12 space-y-12">
          <Secao id="o-que-fazemos" titulo="O que este site faz">
            <P>
              O {SITE.name} existe para resolver um problema específico: empresas
              pequenas e médias perdem oportunidade no setor público não por falta
              de capacidade de entregar, mas por falta de tempo para ler.
            </P>
            <P>
              São milhares de editais publicados por dia no Portal Nacional de
              Contratações Públicas. Quase nenhum serve para a sua empresa, e os
              poucos que servem exigem uma leitura atenta de dezenas de páginas
              para descobrir se vale disputar. Quem tem departamento de licitações
              faz isso. Quem não tem, não participa.
            </P>
            <P>
              Duas frentes atacam esse problema aqui. Os guias, que explicam as
              regras do jogo em português, e a triagem diária, que separa os
              editais compatíveis com o seu perfil e entrega a leitura pronta —
              o que pedem, o que falta na sua habilitação, o prazo e o risco.
            </P>
          </Secao>

          <Secao id="quem-escreve" titulo="Quem escreve">
            <P>
              O conteúdo é escrito e assinado por {AUTHOR.name}, {AUTHOR.jobTitle.toLowerCase()}.
              Cada guia leva assinatura e data da última revisão — não há texto
              anônimo neste site.
            </P>
            <P>Os assuntos cobertos são:</P>
            <ul className="grid gap-2 text-[var(--muted)] sm:grid-cols-2">
              {KNOWS_ABOUT.map((tema) => (
                <li key={tema}>· {tema}</li>
              ))}
            </ul>
          </Secao>

          <Secao id="metodo" titulo="Como o conteúdo é apurado">
            <P>
              A regra é simples: tudo que afirma o que a lei diz vem da fonte
              oficial, e a fonte fica no rodapé do texto para você conferir. Lei e
              decreto vêm do Planalto; decisão de tribunal de contas vem do portal
              do próprio tribunal; dado de contratação vem do PNCP.
            </P>
            <P>
              Nada aqui é parecer jurídico, e o site não substitui advogado. A
              diferença de propósito é deliberada: o objetivo é que você entenda a
              regra bem o suficiente para decidir se participa, o que perguntar ao
              seu jurídico e quando vale contratar um.
            </P>
            <P>
              Quando um guia é revisado, a data no topo muda. Conteúdo sobre
              licitação envelhece rápido — a transição da Lei 8.666 para a Lei
              14.133 deixou a internet cheia de texto que continua correto na
              lógica e errado na referência legal.
            </P>
          </Secao>

          <Secao id="historia" titulo="O acervo publicado aqui desde 2016">
            <P>
              Este domínio tem história anterior, e vale explicá-la — em especial
              para quem chegou por um link antigo e encontrou outra página.
            </P>
            <P>
              De {SITE.foundingYear} a 2025, o {SITE.name} foi um blog sobre
              licitações e contratações públicas mantido por outro autor, o
              advogado Rodrigo Soares de Azevedo, com centenas de artigos, além de
              seções de jurisprudência, súmulas do TCU e legislação. O site saiu do
              ar em 2025 e o domínio foi adquirido em 2026.
            </P>
            <P>
              A aquisição foi do domínio, não do conteúdo. Os direitos sobre os
              textos originais seguem com o autor que os escreveu, e por isso
              nenhum deles foi republicado aqui — nem será. O que preservamos foi o
              endereço: quem tinha um link para um artigo antigo chega hoje ao guia
              novo sobre o mesmo assunto, escrito do zero e atualizado para a Lei
              14.133/2021.
            </P>
            <P>
              É um trabalho em andamento. Os guias vão sendo publicados por tema, e
              a cada publicação mais endereços antigos voltam a levar a algum lugar
              útil. O que já está no ar e o que vem a seguir estão listados na{" "}
              <a className="underline underline-offset-4" href="/blog/">
                página de guias
              </a>
              .
            </P>
          </Secao>

          <Secao id="contato" titulo="Contato">
            <P>
              O canal de contato sob o novo domínio está sendo configurado e será
              publicado aqui. Até lá, correções e sugestões sobre qualquer guia são
              bem-vindas e serão respondidas por quem assina o texto.
            </P>
          </Secao>
        </div>

        <p className="mt-12 text-sm leading-relaxed text-[var(--muted)]">
          Conteúdo informativo e operacional sobre licitações e contratos
          administrativos. Não constitui parecer jurídico — a decisão de
          participar de um certame e a análise de um contrato concreto são sempre
          da empresa licitante.
        </p>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
