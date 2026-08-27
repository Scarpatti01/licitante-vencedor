/**
 * Ícones de linha, desenhados aqui em SVG.
 *
 * Sem biblioteca: oito ícones não justificam um pacote inteiro no bundle de uma
 * página que precisa carregar rápido em 4G. Traço de 1.5, cantos arredondados,
 * `currentColor` para herdar a cor do contexto.
 */
const TRACO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const CAMINHOS: Record<string, React.ReactNode> = {
  bussola: <><circle cx="12" cy="12" r="9" {...TRACO} /><path d="m15.5 8.5-2 5-5 2 2-5z" {...TRACO} /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" {...TRACO} /><path d="M3 10h18M8 3v4M16 3v4" {...TRACO} /><path d="m9 15 2 2 4-4" {...TRACO} /></>,
  lupa: <><circle cx="11" cy="11" r="7" {...TRACO} /><path d="m20 20-3.5-3.5" {...TRACO} /></>,
  relogio: <><circle cx="12" cy="12" r="9" {...TRACO} /><path d="M12 7v5l3 2" {...TRACO} /></>,
  documento: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...TRACO} /><path d="M14 3v5h5M9 13h6M9 17h4" {...TRACO} /></>,
  moeda: <><circle cx="12" cy="12" r="9" {...TRACO} /><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4" {...TRACO} /></>,
  trofeu: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" {...TRACO} /><path d="M8 5H5.5a2.5 2.5 0 0 0 2.5 4M16 5h2.5a2.5 2.5 0 0 1-2.5 4" {...TRACO} /><path d="M12 13v4M9 20h6M10 17h4" {...TRACO} /></>,
  engrenagem: <><circle cx="12" cy="12" r="3" {...TRACO} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" {...TRACO} /></>,
  escudo: <><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" {...TRACO} /><path d="m9 12 2 2 4-4" {...TRACO} /></>,
  certo: <><path d="m5 12 4.5 4.5L19 7" {...TRACO} /></>,
  errado: <><path d="M6 6l12 12M18 6 6 18" {...TRACO} /></>,
};

export function Icone({ nome, tamanho = 24 }: { nome: string; tamanho?: number }) {
  const caminho = CAMINHOS[nome];
  if (!caminho) return null;
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {caminho}
    </svg>
  );
}
