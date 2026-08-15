import Link from "next/link";
import { caminhoDoMunicipio, pracasPorUf, type MunicipioAgregado } from "@/lib/regioes";

/**
 * As praças medidas, agrupadas por estado e recolhidas.
 *
 * ## Por que recolher
 *
 * A lista nasceu com três praças e cresce sozinha: hoje são 96, e o portão de
 * `regioes.ts` publica mais a cada coleta melhor. Noventa e seis links em coluna
 * empurravam o resto da página para fora da tela — e, pior, apagavam a
 * informação que a seção existe para dar: quais ESTADOS já têm cobertura. Um
 * bloco de "Ceará (46 praças)" responde isso num relance; noventa e seis linhas
 * seguidas, não.
 *
 * ## Por que `<details>` nativo, e não um acordeão em JavaScript
 *
 * Estes links são a única porta de entrada interna das páginas regionais — sem
 * eles, cada uma existe só no sitemap, e página órfã não recebe autoridade de
 * lugar nenhum. Um acordeão que só insere o conteúdo no DOM depois do clique
 * esconderia exatamente esses links do rastreador: o que não está no HTML não é
 * seguido.
 *
 * `<details>` resolve isso por construção — o conteúdo está no HTML entregue,
 * recolhido apenas visualmente, e continua rastreável e linkável. De quebra, não
 * custa um byte de JavaScript, funciona sem ele, e já traz teclado e leitor de
 * tela prontos. É o mesmo elemento que `SecoesDoPerfil.tsx` já usa no produto.
 *
 * ## O que o resumo afirma
 *
 * Contratações somadas, e o número de praças. **Não** soma órgãos: o porquê está
 * em `pracasPorUf`, e é o mesmo princípio do resto do projeto — não afirmar um
 * número que não podemos garantir.
 */

const numero = (n: number) => n.toLocaleString("pt-BR");

type Props = {
  /**
   * A lista a exibir. Recebida por parâmetro, e não lida aqui dentro, porque a
   * página do município precisa remover a praça atual antes de agrupar — fazer
   * isso depois deixaria um estado com o contador errado, ou um grupo vazio.
   */
  municipios: MunicipioAgregado[];
  /**
   * A UF que já vem aberta. Na página de um município é a dele: quem lê sobre
   * Sobral tem muito mais chance de querer outra praça do Ceará do que uma de
   * Sergipe, e abrir esse grupo poupa o único clique que interessa.
   */
  ufAberta?: string;
  /**
   * `detalhada` mostra contratações e órgãos por praça — é a versão do hub, onde
   * a lista É o conteúdo. `compacta` mostra só os nomes, para o rodapé de
   * navegação da página regional, onde a lista é saída e não destino.
   */
  variante?: "detalhada" | "compacta";
};

export function PracasEmAcordeao({ municipios, ufAberta, variante = "detalhada" }: Props) {
  const grupos = pracasPorUf(municipios);
  if (grupos.length === 0) return null;

  const alvoAberto = ufAberta?.toUpperCase();

  return (
    <div className="space-y-3">
      {grupos.map((grupo) => (
        <details
          key={grupo.uf}
          open={grupo.uf === alvoAberto}
          className="group rounded-lg border bg-[var(--surface)] px-4 py-3"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
            <span>
              {grupo.nome}{" "}
              <span className="font-normal text-[var(--muted)]">({grupo.uf})</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-normal text-[var(--muted)]">
              <span>
                {grupo.municipios.length}{" "}
                {grupo.municipios.length === 1 ? "praça" : "praças"} ·{" "}
                {numero(grupo.editais)}{" "}
                {grupo.editais === 1 ? "contratação" : "contratações"}
              </span>
              {/*
                A seta é decoração pura: o estado aberto/fechado já é anunciado
                pelo próprio `<details>` a quem usa leitor de tela. Marcá-la como
                `aria-hidden` evita que a mesma informação seja lida duas vezes.
              */}
              <span
                aria-hidden
                className="transition-transform group-open:rotate-90"
              >
                ›
              </span>
            </span>
          </summary>

          {variante === "detalhada" ? (
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              {grupo.municipios.map((m) => (
                <li key={caminhoDoMunicipio(m)}>
                  <Link className="underline underline-offset-4" href={caminhoDoMunicipio(m)}>
                    Licitações em {m.municipio}
                  </Link>{" "}
                  — {numero(m.editais)}{" "}
                  {m.editais === 1 ? "contratação" : "contratações"} de {m.orgaos}{" "}
                  {m.orgaos === 1 ? "órgão" : "órgãos"}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {grupo.municipios.map((m) => (
                <li key={caminhoDoMunicipio(m)}>
                  <Link href={caminhoDoMunicipio(m)}>{m.municipio}</Link>
                </li>
              ))}
            </ul>
          )}
        </details>
      ))}
    </div>
  );
}
