import { ogCard } from "@/lib/og-card";
import { OG_SIZE } from "@/lib/brand";
import { SITE } from "@/lib/site";

/**
 * Cartão padrão do site. Vale para a home e para qualquer rota que não
 * declare o seu — então uma página nova já nasce compartilhável.
 */
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard(SITE.tagline);
}
