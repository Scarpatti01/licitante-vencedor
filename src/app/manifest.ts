import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { SITE } from "@/lib/site";

/**
 * O manifesto que torna o site instalável na tela de início.
 *
 * Serve a quem comprou a Jornada e lê no celular: com o ícone instalado, o app
 * abre em tela cheia, sem barra de endereço, e a leitura não divide espaço com
 * o navegador. Não passa por loja nenhuma, não paga comissão e atualiza junto
 * com o site.
 *
 * `start_url` aponta para a jornada, e não para a raiz, porque quem instala é
 * quem usa a jornada; quem só lê o blog não instala. Quem não estiver logado
 * cai no fluxo de entrada normal, que já existe.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE.name}: sua jornada e seus editais`,
    // Até 12 caracteres, que é o que Android e iOS mostram sob o ícone sem
    // cortar. "Licitante Vencedor" viraria "Licitante V…".
    short_name: "Licitante",
    description: SITE.description,
    lang: SITE.locale,
    dir: "ltr",
    start_url: "/minha-jornada/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: BRAND.ink,
    categories: ["business", "education", "productivity"],
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // O Android recorta o ícone na forma do sistema. Sem um `maskable`, ele
      // desenha o nosso dentro de um quadrado branco, e fica um selo torto no
      // meio da tela. Este tem folga para o recorte circular.
      { src: "/icone-mascara-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Minha jornada",
        short_name: "Jornada",
        description: "Continuar de onde você parou nas doze semanas",
        url: "/minha-jornada/",
      },
      {
        name: "Oportunidades",
        short_name: "Editais",
        description: "Os editais que combinam com o perfil da sua empresa",
        url: "/oportunidades/",
      },
    ],
  };
}
