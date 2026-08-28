import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AUTHOR, KNOWS_ABOUT, SITE, TITULO_DO_SITE } from "@/lib/site";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: TITULO_DO_SITE,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE.url,
    siteName: SITE.name,
    title: TITULO_DO_SITE,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO_DO_SITE,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    // Sem isto o Google escolhe um preview conservador e o cartão de 1200×630
    // sai como miniatura, ou não sai. É também o que habilita o card grande do
    // Discover. Só passou a fazer sentido com os `opengraph-image`: antes deles
    // não havia imagem nenhuma para exibir — o `twitter.card` logo acima
    // prometia uma desde sempre, sem nada por trás.
    googleBot: { "max-image-preview": "large", "max-snippet": -1 },
  },
  /**
   * Verificação de propriedade no Bing Webmaster Tools.
   *
   * Pelo campo `verification` do Next em vez de um `<meta>` escrito à mão: a
   * saída no `<head>` é a mesma e não depende de onde o framework monta o head.
   * `msvalidate.01` não tem atalho nomeado, então vai em `other`.
   */
  verification: {
    other: { "msvalidate.01": "9A881D27B89D4A787D22E1BAC3E5B884" },
  },
};

/**
 * Camada de entidade (Fase 3 da estratégia).
 * Um @id por entidade no site inteiro; as demais páginas referenciam por @id.
 */
const entityGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.name,
      url: `${SITE.url}/`,
      description: SITE.description,
      foundingDate: SITE.foundingYear,
      knowsAbout: [...KNOWS_ABOUT],
      areaServed: { "@type": "Country", name: "Brasil" },
      founder: { "@id": `${SITE.url}/#${AUTHOR.slug}` },
    },
    {
      "@type": "Person",
      "@id": `${SITE.url}/#${AUTHOR.slug}`,
      name: AUTHOR.name,
      jobTitle: AUTHOR.jobTitle,
      description: AUTHOR.bio,
      image: `${SITE.url}${AUTHOR.photo}`,
      knowsAbout: [...KNOWS_ABOUT],
      worksFor: { "@id": `${SITE.url}/#organization` },
      ...(AUTHOR.sameAs.length > 0 ? { sameAs: AUTHOR.sameAs } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: `${SITE.url}/`,
      name: SITE.name,
      description: SITE.description,
      inLanguage: SITE.locale,
      publisher: { "@id": `${SITE.url}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={SITE.locale}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <RegistrarServiceWorker />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entityGraph) }}
        />
        {/*
         * Sem isto o produto não tinha nenhuma visibilidade de tráfego — nem
         * Search Console, nem analytics. "Por que o blog captou só 1 lead"
         * ficava sem resposta possível: não dava para saber se o problema era
         * visita ou conversão. Web Analytics da própria Vercel, sem custo
         * adicional no plano já em uso, sem cookie e sem banner de consentimento.
         */}
        <Analytics />

        {/*
          Medição de audiência do Ahrefs.

          A chave é pública por natureza: ela vai no HTML servido a todo
          visitante, e é assim que o produto funciona. Não é segredo e não
          precisa de variável de ambiente.

          `strategy="afterInteractive"` porque medir audiência nunca deve
          disputar banda com o conteúdo. A página primeiro, a métrica depois.

          A política de privacidade declara este script pelo nome. Se ele sair
          daqui, ela precisa mudar junto, e `privacidade.test.ts` reprova quem
          esquecer.
        */}
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="+RRBB277afCA1QVOdm2UfQ"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
