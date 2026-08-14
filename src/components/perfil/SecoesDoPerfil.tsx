import {
  NOME_DO_DOCUMENTO,
  type PerfilDaEmpresa,
  type TipoDeDocumento,
} from "@/lib/dominio/tipos";
import { Aviso } from "@/components/app/ui";
import { CampoDeLista, CampoDeSelecao, CampoDeTexto, GrupoDeMarcacoes } from "./campos";
import { ListaDeAtestados } from "./ListaDeAtestados";
import type { ErrosDoFormulario } from "./leitura";
import { formatarCnae, MODALIDADES, PORTES, UFS } from "./validacao";

/**
 * As cinco seções do Perfil Inteligente da Empresa.
 *
 * São as mesmas em duas telas: o onboarding as mostra uma de cada vez, com
 * progresso; o perfil as mostra todas, para edição. Escrevê-las duas vezes
 * garantiria que um campo acrescentado num lugar sumisse do outro na semana
 * seguinte.
 *
 * Toda ajuda de campo responde "por que você está me pedindo isto?" com o
 * efeito concreto na triagem. Campo mudo é campo pulado, e campo pulado aqui
 * significa critério inerte no motor de recomendação.
 */

export type PropsDaSecao = {
  perfil: PerfilDaEmpresa | null;
  erros: ErrosDoFormulario;
};

/** Nomes legíveis para o resumo de erros no topo do formulário. */
export const ROTULOS_DOS_CAMPOS: Record<string, string> = {
  cnpj: "CNPJ",
  razaoSocial: "Razão social",
  porte: "Porte",
  faturamentoAnual: "Faturamento anual",
  cnaes: "CNAEs",
  palavrasChave: "Palavras-chave",
  palavrasExcluidas: "Palavras excluídas",
  uf: "Estados atendidos",
  municipiosPrioritarios: "Municípios prioritários",
  ticketMinimo: "Ticket mínimo",
  ticketMaximo: "Ticket máximo",
  modalidade: "Modalidades aceitas",
};

export function rotuloDoCampo(chave: string): string {
  if (ROTULOS_DOS_CAMPOS[chave]) return ROTULOS_DOS_CAMPOS[chave];
  if (chave.startsWith("validade:")) {
    const tipo = chave.slice("validade:".length) as TipoDeDocumento;
    return `Validade — ${NOME_DO_DOCUMENTO[tipo] ?? tipo}`;
  }
  if (chave.startsWith("atestado")) return "Atestado de capacidade técnica";
  return chave;
}

// ---------------------------------------------------------------------------

export function SecaoEmpresa({ perfil, erros }: PropsDaSecao) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <CampoDeTexto
        nome="cnpj"
        rotulo="CNPJ"
        obrigatorio
        valorInicial={perfil?.cnpj}
        erro={erros.cnpj}
        placeholder="00.000.000/0000-00"
        inputMode="numeric"
        autoComplete="off"
        ajuda="Conferimos os dígitos verificadores. É por ele que casamos o seu cadastro com SICAF, certidões e com o histórico do que você já disputou."
      />
      <CampoDeSelecao
        nome="porte"
        rotulo="Porte"
        obrigatorio
        vazio="Selecione…"
        valorInicial={perfil?.porte}
        erro={erros.porte}
        opcoes={PORTES.map((p) => ({ valor: p.valor, rotulo: `${p.nome} — ${p.detalhe}` }))}
        ajuda="ME e EPP têm direito de preferência e itens exclusivos na Lei 14.133. Declarar porte errado faz você perder benefício ou ser desclassificado por declaração falsa."
      />
      <div className="sm:col-span-2">
        <CampoDeTexto
          nome="razaoSocial"
          rotulo="Razão social"
          obrigatorio
          valorInicial={perfil?.razaoSocial}
          erro={erros.razaoSocial}
          ajuda="Como está no contrato social — é o nome que vai na proposta e nas declarações."
        />
      </div>
      <CampoDeTexto
        nome="nomeFantasia"
        rotulo="Nome fantasia"
        valorInicial={perfil?.nomeFantasia ?? ""}
        ajuda="Só para você reconhecer a empresa nas telas quando houver mais de um CNPJ na conta."
      />
      <CampoDeTexto
        nome="faturamentoAnual"
        rotulo="Faturamento anual (R$)"
        valorInicial={perfil?.faturamentoAnual === null || perfil?.faturamentoAnual === undefined ? "" : String(perfil.faturamentoAnual)}
        erro={erros.faturamentoAnual}
        inputMode="decimal"
        placeholder="3.600.000"
        ajuda="Usamos para avisar quando o contrato é grande demais para o seu porte e a qualificação econômico-financeira tende a barrar. Fica só no seu cadastro."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SecaoAtuacao({ perfil, erros }: PropsDaSecao) {
  return (
    <div className="space-y-5">
      <CampoDeLista
        nome="palavrasChave"
        rotulo="Palavras-chave do que você vende"
        valorInicial={perfil?.palavrasChave}
        erro={erros.palavrasChave}
        placeholder="limpeza predial, conservação, material de limpeza"
        ajuda="Escreva como o edital escreveria, não como o seu site escreve. É o critério de maior peso da triagem: procuramos estes termos no objeto de cada edital publicado. Separe por vírgula."
      />
      <CampoDeLista
        nome="palavrasExcluidas"
        rotulo="Palavras que indicam que não é para você"
        valorInicial={perfil?.palavrasExcluidas}
        erro={erros.palavrasExcluidas}
        placeholder="medicamentos, obras, locação de veículos"
        ajuda="Termos que, se aparecerem no objeto, tiram o edital da sua lista. É o que separa o seu ramo do ramo vizinho que usa as mesmas palavras."
        linhas={2}
      />
      <CampoDeLista
        nome="cnaes"
        rotulo="CNAEs da empresa"
        valorInicial={perfil?.cnaes.map(formatarCnae)}
        erro={erros.cnaes}
        placeholder="8121-4/00, 8129-0/00"
        ajuda="O principal primeiro. Aceita com ou sem pontuação; guardamos só os sete dígitos. Vários órgãos exigem CNAE compatível com o objeto na habilitação."
        linhas={2}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SecaoCapacidade({ perfil, erros }: PropsDaSecao) {
  return (
    <div className="space-y-6">
      <GrupoDeMarcacoes
        nome="uf"
        legenda="Estados onde você aceita executar"
        erro={erros.uf}
        selecionados={perfil?.ufsAtendidas ?? []}
        opcoes={UFS.map((uf) => ({ valor: uf.sigla, rotulo: uf.sigla, detalhe: undefined }))}
        colunas="densa"
        ajuda="Usamos isto para descartar editais fora do seu estado antes que eles cheguem até você. Sem nenhum estado marcado, o motor não julga localização e edital de qualquer canto do país entra na sua lista."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoDeTexto
          nome="ticketMinimo"
          rotulo="Ticket mínimo (R$)"
          valorInicial={perfil?.ticketMinimo === null || perfil?.ticketMinimo === undefined ? "" : String(perfil.ticketMinimo)}
          erro={erros.ticketMinimo}
          inputMode="decimal"
          placeholder="50.000"
          ajuda="Abaixo disso não compensa montar proposta."
        />
        <CampoDeTexto
          nome="ticketMaximo"
          rotulo="Ticket máximo (R$)"
          valorInicial={perfil?.ticketMaximo === null || perfil?.ticketMaximo === undefined ? "" : String(perfil.ticketMaximo)}
          erro={erros.ticketMaximo}
          inputMode="decimal"
          placeholder="2.000.000"
          ajuda="O maior contrato que você consegue executar com folga."
        />
      </div>

      <Aviso tom="neutro" papel="none">
        Sem faixa de ticket, um contrato de R$ 20 mil e um de R$ 20 milhões chegam
        com o mesmo peso — e, junto com a região, é a falta deste dado que faz o
        motor se recusar a pontuar. Preencher só um dos dois já ativa o critério.
      </Aviso>

      <GrupoDeMarcacoes
        nome="modalidade"
        legenda="Modalidades que você disputa"
        erro={erros.modalidade}
        selecionados={perfil?.modalidadesAceitas ?? []}
        opcoes={MODALIDADES.map((m) => ({
          valor: m.valor,
          rotulo: m.valor,
          detalhe: m.detalhe,
        }))}
        ajuda="Deixar tudo desmarcado significa 'aceito todas' — é um padrão válido, não uma pendência. Marque só se houver modalidade que você não disputa."
      />

      <details className="rounded-lg border bg-[var(--surface)] px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">
          Municípios prioritários (opcional)
        </summary>
        <div className="mt-4">
          <CampoDeLista
            nome="municipiosPrioritarios"
            rotulo="Códigos IBGE dos municípios"
            valorInicial={perfil?.municipiosPrioritarios}
            erro={erros.municipiosPrioritarios}
            placeholder="2611606, 2607901"
            linhas={2}
            ajuda="Sete dígitos por município, separados por vírgula. Editais nestes municípios recebem o peso máximo no critério de região, em vez do peso de 'dentro do estado'. Deixe vazio se todo o estado vale igual."
          />
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------

const GRUPOS_DE_DOCUMENTO: { titulo: string; nota: string; tipos: TipoDeDocumento[] }[] = [
  {
    titulo: "Habilitação — regularidade fiscal, trabalhista e jurídica",
    nota: "O que praticamente todo edital da Lei 14.133 exige. É aqui que a certidão vencida elimina.",
    tipos: [
      "certidao_federal",
      "certidao_estadual",
      "certidao_municipal",
      "fgts",
      "trabalhista_cndt",
      "falencia_concordata",
      "contrato_social",
      "balanco_patrimonial",
    ],
  },
  {
    titulo: "Cadastro e qualificação",
    nota: "Nem todo edital pede, mas quando pede costuma ser eliminatório e sem prazo para providenciar.",
    tipos: [
      "sicaf",
      "atestado_capacidade_tecnica",
      "registro_profissional_crea_cau",
      "certificacao_iso",
      "alvara_licenca",
      "declaracao_me_epp",
    ],
  },
  {
    titulo: "Exigências que aparecem em certames específicos",
    nota: "Marque o que você já tem condição de atender. Garantia, amostra e visita são exigências do certame, e o produto avisa quando um edital pede alguma delas.",
    tipos: ["garantia_proposta", "amostra", "visita_tecnica", "outro"],
  },
];

export function SecaoDocumentacao({ perfil, erros }: PropsDaSecao) {
  const porTipo = new Map((perfil?.documentos ?? []).map((d) => [d.tipo, d]));

  return (
    <div className="space-y-6">
      <Aviso tom="atencao" papel="none" titulo="Declarar não é comprovar">
        O que você marca aqui entra no cadastro como declaração sua. O produto
        nunca vai afirmar que um documento está válido só porque ele foi marcado
        — por isso pedimos a validade. Enquanto o arquivo não estiver anexado, o
        checklist mostra o documento como <strong>a verificar</strong>, e não como
        pronto. O anexo de arquivos ainda não está disponível nesta versão.
      </Aviso>

      {GRUPOS_DE_DOCUMENTO.map((grupo) => (
        <fieldset key={grupo.titulo}>
          <legend className="text-sm font-semibold">{grupo.titulo}</legend>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{grupo.nota}</p>
          <ul className="mt-3 divide-y rounded-lg border">
            {grupo.tipos.map((tipo) => (
              <LinhaDeDocumento
                key={tipo}
                tipo={tipo}
                documento={porTipo.get(tipo)}
                erro={erros[`validade:${tipo}`]}
              />
            ))}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

function LinhaDeDocumento({
  tipo,
  documento,
  erro,
}: {
  tipo: TipoDeDocumento;
  documento: PerfilDaEmpresa["documentos"][number] | undefined;
  erro?: string;
}) {
  const idValidade = `campo-validade-${tipo.replace(/_/g, "-")}`;

  return (
    <li className="px-4 py-3 has-[:checked]:bg-[var(--accent-soft)]/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex flex-1 cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="documento"
            value={tipo}
            defaultChecked={documento !== undefined}
            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
          <span>
            <span className="font-medium">{NOME_DO_DOCUMENTO[tipo]}</span>
            {/*
              O estado do arquivo é informação, nunca campo editável: marcar uma
              caixa não anexa nada, e um "arquivo anexado" declarado faria o
              checklist dar o documento como pronto sem que ele exista.
            */}
            {documento?.arquivoAnexado ? (
              <span className="mt-0.5 block text-xs text-emerald-700 dark:text-emerald-300">
                Arquivo anexado no cadastro
              </span>
            ) : (
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                Sem arquivo anexado — entra no checklist como &ldquo;a verificar&rdquo;
              </span>
            )}
          </span>
        </label>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div>
            <label htmlFor={idValidade} className="sr-only">
              Válido até — {NOME_DO_DOCUMENTO[tipo]}
            </label>
            <input
              id={idValidade}
              name={`validade:${tipo}`}
              type="date"
              defaultValue={documento?.validoAte ?? ""}
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? `${idValidade}-erro` : undefined}
              className={`rounded-lg border bg-[var(--background)] px-2.5 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--accent)] ${
                erro ? "border-rose-400 dark:border-rose-700" : ""
              }`}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
            <input
              type="checkbox"
              name={`semValidade:${tipo}`}
              defaultChecked={documento?.semValidade ?? false}
              className="size-4 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
            sem prazo
          </label>
        </div>
      </div>

      {tipo === "outro" ? (
        <div className="mt-3">
          <label htmlFor={`campo-descricao-outro`} className="sr-only">
            Qual documento
          </label>
          <input
            id="campo-descricao-outro"
            name="descricao:outro"
            defaultValue={documento?.descricao ?? ""}
            placeholder="Qual documento? Ex.: licença ambiental de operação"
            className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--accent)]"
          />
        </div>
      ) : null}

      {erro ? (
        <p
          id={`${idValidade}-erro`}
          className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          {erro}
        </p>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------

export function SecaoAtestados({ perfil, erros }: PropsDaSecao) {
  return <ListaDeAtestados atestados={perfil?.atestados ?? []} erros={erros} />;
}
