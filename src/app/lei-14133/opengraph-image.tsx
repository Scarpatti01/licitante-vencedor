import { ogCard } from "@/lib/og-card";
import { OG_SIZE } from "@/lib/brand";

export const alt = "Lei 14.133/2021: guia da Nova Lei de Licitações";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard("Lei 14.133/2021: o guia da Nova Lei de Licitações");
}
