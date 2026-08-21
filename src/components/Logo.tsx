import { BRAND } from "@/lib/brand";

/**
 * O selo com nome do produto — antes era só `{SITE.name}` em texto puro nos
 * dois cabeçalhos.
 *
 * É a mesma composição da peça de marca do fundador (círculo com documento e
 * check), mas sem verde: `brassBright` só é legível sobre marinho (ver
 * `brand.ts`), então o selo carrega o próprio fundo marinho consigo — assim
 * funciona tanto no cabeçalho escuro da home quanto no cabeçalho claro das
 * páginas internas, sem duas versões para manter em sincronia.
 *
 * SVG inline, não `<img>`: fica nítido em qualquer densidade de tela e não
 * gasta uma requisição HTTP num elemento que aparece em toda página.
 *
 * O nome some abaixo de `sm`, sobra só o selo redondo.
 *
 * Antes disto, "Entrar" saía cortado da tela nos dois cabeçalhos em telas
 * pequenas: o texto puro que existia aqui podia quebrar em duas linhas
 * ("Licitante" / "Vencedor") para caber, mas este selo não é texto — não
 * quebra, só empurra o resto do cabeçalho para fora da viewport. Ocultar a
 * palavra é o que dá de volta o espaço que a quebra de linha dava de graça.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg py-1 pr-1 pl-1 sm:pr-2.5 ${className ?? ""}`}
      style={{ backgroundColor: BRAND.ink }}
    >
      <svg viewBox="0 0 110 110" width="22" height="22" aria-hidden focusable="false">
        <circle cx="50" cy="54" r="42" fill={BRAND.ink} stroke="#1E3358" strokeWidth="1.5" />
        <path d="M36,26 L60,26 L70,36 L70,80 L36,80 Z" fill="#FFFFFF" />
        <path d="M60,26 L60,36 L70,36 Z" fill={BRAND.inkDeep} />
        <rect x="42" y="46" width="20" height="3.4" rx="1.7" fill={BRAND.ink} opacity={0.45} />
        <rect x="42" y="55" width="20" height="3.4" rx="1.7" fill={BRAND.ink} opacity={0.45} />
        <rect x="42" y="64" width="13" height="3.4" rx="1.7" fill={BRAND.ink} opacity={0.45} />
        <polyline
          points="48,70 59,82 92,40"
          fill="none"
          stroke={BRAND.brassBright}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden text-[13px] font-extrabold tracking-tight whitespace-nowrap text-white sm:inline">
        LICITANTE <span style={{ color: BRAND.brassBright }}>VENCEDOR</span>
      </span>
    </span>
  );
}
