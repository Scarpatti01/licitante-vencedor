import type { AnaliseDoEdital } from "@/lib/dominio/tipos";
import type { Campo } from "@/lib/dominio/procedencia";
import { Procedencia } from "@/components/oportunidades/Primitivos";

/**
 * A leitura do edital, na página pública.
 *
 * ## É isto que faz o post não ser cópia do PNCP
 *
 * O objeto, o valor e o prazo estão na fonte oficial, e o Google sempre vai
 * preferir a fonte à cópia dela. O que esta seção acrescenta é a leitura do
 * documento: o que o edital exige, o que costuma desclassificar, o critério de
 * julgamento. É a única parte da página que não existe em nenhum outro lugar.
 *
 * ## Cada afirmação carrega de onde veio
 *
 * O componente `Procedencia` é o mesmo do produto pago, e não é enfeite: ele
 * distingue "informado no edital" de "inferido — confirme antes de decidir". Num
 * post público a distinção importa MAIS, não menos, porque quem lê não assinou
 * nada e não teve como calibrar o quanto confiar.
 *
 * Campo sem resposta aparece como sem resposta, com o motivo. Não existe caminho
 * neste componente que produza um valor plausível para preencher espaço.
 *
 * ## Quando a leitura não aconteceu
 *
 * A seção some inteira, e a página diz por quê no lugar. Um bloco de análise
 * vazio seria pior do que bloco nenhum: sugere que o edital não exige nada,
 * quando o que houve foi não termos conseguido ler.
 */

function ValorDoCampo({ campo }: { campo: Campo<unknown> }) {
  if (campo.origem === "desconhecido") {
    return (
      <p className="leading-relaxed text-[var(--muted)]">
        Não foi possível determinar com segurança. {campo.motivo}
      </p>
    );
  }

  const valor = campo.valor;
  const texto =
    typeof valor === "boolean" ? (valor ? "Sim" : "Não") : String(valor ?? "");

  return <p className="leading-relaxed">{texto}</p>;
}

function Linha({ rotulo, campo }: { rotulo: string; campo: Campo<unknown> }) {
  return (
    <div className="border-t py-4 first:border-t-0">
      <h3 className="text-sm font-semibold tracking-wide uppercase">{rotulo}</h3>
      <div className="mt-2">
        <ValorDoCampo campo={campo} />
        <Procedencia campo={campo} className="mt-2" />
      </div>
    </div>
  );
}

export function LeituraDoEdital({
  analise,
  documentosLidos,
}: {
  analise: AnaliseDoEdital;
  documentosLidos: number;
}) {
  const exigenciasDeHabilitacao = analise.exigencias.filter((e) => e.fase === "habilitacao");

  return (
    <div className="space-y-6">
      {/*
        A profundidade da leitura vai ANTES do conteúdo dela.

        "Lido em 8 documentos" e "lido só nos metadados da publicação" sustentam
        afirmações de peso muito diferente, e quem lê precisa saber qual está
        recebendo antes de decidir o quanto confiar — não depois.
      */}
      <p className="rounded-lg border bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--muted)]">
        {analise.profundidade === "documento_completo"
          ? `Leitura feita sobre ${documentosLidos} documento(s) publicados pelo órgão.`
          : analise.profundidade === "documento_parcial"
            ? `Leitura feita sobre ${documentosLidos} documento(s), com corte por tamanho — ` +
              `os trechos mais longos podem ter ficado de fora.`
            : "Leitura feita apenas sobre os dados da publicação: os documentos não " +
              "puderam ser lidos."}{" "}
        As afirmações abaixo dizem, uma a uma, de onde saíram.{" "}
        <strong>Em caso de divergência, vale o edital.</strong>
      </p>

      <div>
        <Linha rotulo="Resumo" campo={analise.resumoExecutivo} />
        <Linha rotulo="Critério de julgamento" campo={analise.criterioDeJulgamento} />
        <Linha rotulo="Exige garantia" campo={analise.garantiaExigida} />
        <Linha rotulo="Exige visita técnica" campo={analise.visitaTecnicaExigida} />
        <Linha rotulo="Exige amostra" campo={analise.amostraExigida} />
      </div>

      {exigenciasDeHabilitacao.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            Documentos de habilitação citados
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Habilitação é fase eliminatória: documento faltando desclassifica
            antes da disputa de preço.
          </p>
          <ul className="mt-4 space-y-4">
            {exigenciasDeHabilitacao.map((exigencia, i) => (
              <li key={i} className="border-t pt-4">
                <ValorDoCampo campo={exigencia.descricao} />
                <Procedencia campo={exigencia.descricao} className="mt-2" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analise.riscos.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            Pontos de atenção
          </h3>
          <ul className="mt-4 space-y-4">
            {analise.riscos.map((risco, i) => (
              <li key={i} className="border-t pt-4">
                <ValorDoCampo campo={risco} />
                <Procedencia campo={risco} className="mt-2" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Leitura automática do documento publicado, feita em{" "}
        {analise.analisadoEm?.slice(0, 10) ?? "data não registrada"}. Não é
        parecer jurídico e não substitui a leitura do edital pela sua empresa.
      </p>
    </div>
  );
}
