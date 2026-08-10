import { ImageResponse } from "next/og";
import { BRAND, OG_SIZE } from "@/lib/brand";
import { SITE } from "@/lib/site";

/**
 * O cartão que aparece quando alguém compartilha uma página no WhatsApp, no
 * LinkedIn ou no X — e a imagem que o Google pode exibir como preview grande.
 *
 * Gerado em vez de mantido como arquivo: página nova nasce com cartão, sem
 * ninguém precisar abrir editor de imagem. Fica na convenção
 * `opengraph-image` do Next, e NÃO numa rota `/api/...`, de propósito: o
 * `robots.ts` deste projeto bloqueia `/api/`, então um cartão servido de lá
 * nasceria incrawlável pelo Google — exatamente o defeito que o projeto irmão
 * (linguaflow) levou semanas para descobrir. Aqui a imagem é servida do
 * endereço da própria página e o problema não existe.
 *
 * Sem fonte customizada: carregar uma exigiria buscar o arquivo em build, e o
 * ambiente tem rede restrita. A elegância vem da escala tipográfica, do
 * espaçamento entre letras e do respiro — não do desenho da fonte.
 *
 * Satori (o motor do next/og) só entende um subconjunto de CSS: todo
 * contêiner com mais de um filho precisa de `display: flex` explícito.
 */
export function ogCard(titulo: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Degradê na diagonal: o marinho abre um pouco no canto inferior
          // direito, o que dá profundidade sem virar "fundo colorido".
          backgroundImage: `linear-gradient(135deg, ${BRAND.ink} 0%, ${BRAND.ink} 45%, ${BRAND.inkDeep} 100%)`,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Fio de latão no topo — a única linha do cartão, e o que dá o ar
            de papel timbrado sem precisar de logo. */}
        <div style={{ display: "flex", width: "100%" }}>
          <div style={{ width: 120, height: 4, backgroundColor: BRAND.brassBright }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: BRAND.brassBright,
              marginBottom: 28,
            }}
          >
            {SITE.name}
          </div>
          <div
            style={{
              fontSize: 62,
              lineHeight: 1.15,
              fontWeight: 700,
              color: "#FFFFFF",
              // O título é o protagonista: cabe em três linhas confortáveis
              // antes de encostar no rodapé.
              maxWidth: 940,
            }}
          >
            {titulo}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ fontSize: 26, color: "#93A2B9" }}>
            {SITE.url.replace(/^https?:\/\//, "")}
          </div>
          {/* Equilibra o rodapé com um sinal de autoridade em vez de um
              rótulo de assunto: a primeira versão trazia "Lei 14.133/2021"
              fixo aqui, que duplicava o título na página da própria lei e
              não tinha relação nenhuma com a home. */}
          {/* Uma string só, e não `Desde {ano}`: texto solto mais expressão são
              DOIS filhos, e o Satori exige `display: flex` em qualquer div com
              mais de um. */}
          <div style={{ fontSize: 24, color: BRAND.brassBright, letterSpacing: 1 }}>
            {`Desde ${SITE.foundingYear}`}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
