import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display, Lato } from "next/font/google";
import { dataPorExtenso, montarExportacao } from "@/lib/jornada/exportacao";
import { SemAcessoAJornada } from "@/components/jornada/SemAcessoAJornada";
import { BotaoDeImprimir } from "@/components/jornada/BotaoDeImprimir";

const display = Playfair_Display({ variable: "--fonte-display", subsets: ["latin", "latin-ext"], display: "swap" });
const corpo = Lato({ variable: "--fonte-corpo", weight: ["400", "700"], subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata: Metadata = {
  title: "Suas respostas",
  robots: { index: false, follow: false },
};

const ESTILO = `
.folha { --carvao:#22201D; --tinta:#38342E; --fraca:#7C7469;
  --champagne:#E7DAC1; --champagne-claro:#FAF6EE; --dourado:#B8934E; --pauta:#CDC4B2;
  background:#fff; color:var(--tinta);
  font-family:var(--fonte-corpo), system-ui, sans-serif; font-size:16px; line-height:1.65; }
.folha h1, .folha h2, .folha h3 { font-family:var(--fonte-display), Georgia, serif;
  font-weight:400; color:var(--carvao); margin:0; line-height:1.15; }
.folha .etiqueta { font-family:var(--fonte-corpo),sans-serif; font-size:.62rem; font-weight:700;
  letter-spacing:.22em; text-transform:uppercase; color:var(--dourado); }
.folha .ornamento { display:flex; align-items:center; justify-content:center; gap:.9rem; margin:1.6rem 0; }
.folha .ornamento::before, .folha .ornamento::after { content:""; height:1px; width:3rem; background:var(--dourado); opacity:.55; }
.folha .ornamento span { color:var(--dourado); font-size:.55rem; }
.folha .vazio { border-bottom:1px solid var(--pauta); height:1.5rem; display:block; }

/* No papel, cada semana começa numa folha e nenhum campo é cortado ao meio. */
@media print {
  @page { size:A4; margin:20mm 18mm; }
  .naoimprime { display:none !important; }
  .folha { font-size:10.5pt; }
  .semana { break-before:page; }
  .semana:first-of-type { break-before:auto; }
  .campo, .cabeca { break-inside:avoid; }
  a { color:inherit; text-decoration:none; }
}
`;

/**
 * As respostas da jornada, prontas para virar PDF.
 *
 * Não geramos o arquivo no servidor: a página é o documento, e o botão chama a
 * impressão do navegador, onde "Salvar como PDF" já existe em toda plataforma.
 * É o caminho que dá o melhor resultado com a menor superfície para manter, e
 * funciona igual no celular.
 */
export default async function PaginaDeExportacao() {
  const dados = await montarExportacao();
  if (!dados) return <SemAcessoAJornada />;

  const hoje = dataPorExtenso(new Date().toISOString());

  return (
    <div className={`${display.variable} ${corpo.variable} folha mx-auto max-w-3xl px-6 py-10`}>
      <style>{ESTILO}</style>

      <div className="naoimprime mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link className="text-sm underline underline-offset-4" href="/minha-jornada/">
          Voltar para a jornada
        </Link>
        <BotaoDeImprimir />
      </div>

      <header className="cabeca text-center">
        <p className="etiqueta">Workbook do Licitante</p>
        <h1 className="mt-3" style={{ fontSize: "2.2rem" }}>As minhas doze semanas</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--fraca)" }}>
          {dados.concluidas} de {dados.total} semanas concluídas &middot; folha gerada em {hoje}
        </p>
        <div className="ornamento"><span>&#9670;</span></div>
      </header>

      {dados.etapas.map((etapa) => (
        <section key={etapa.semana} className="semana mt-10">
          <p className="etiqueta">
            Semana {etapa.semana}
            {etapa.concluidaEm ? ` · concluída em ${dataPorExtenso(etapa.concluidaEm)}` : " · em aberto"}
          </p>
          <h2 className="mt-1.5" style={{ fontSize: "1.5rem" }}>{etapa.titulo}</h2>
          <p className="mt-1.5 text-sm italic" style={{ color: "var(--fraca)" }}>{etapa.criterio}</p>

          <div className="mt-5 space-y-5">
            {etapa.campos.map((campo) => (
              <div key={campo.rotulo} className="campo">
                <p className="etiqueta" style={{ color: "var(--fraca)" }}>{campo.rotulo}</p>
                {campo.resposta ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-[0.97rem]">{campo.resposta}</p>
                ) : (
                  <span className="mt-2.5 vazio" />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <footer className="mt-14 border-t pt-6 text-xs" style={{ borderColor: "var(--champagne)", color: "var(--fraca)" }}>
        <p>
          Folha do Workbook do Licitante, preenchida por você. O conteúdo destas
          respostas é seu e não é lido por mais ninguém, nem pelo titular da
          empresa. Em qualquer divergência entre o que está aqui e o que diz o
          edital, prevalece o edital.
        </p>
      </footer>
    </div>
  );
}
