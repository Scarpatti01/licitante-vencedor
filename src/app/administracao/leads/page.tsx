import type { Metadata } from "next";
import type { ReactNode } from "react";
import { exigirAdministrador } from "@/lib/auth/administracao";
import { dataDeBrasilia } from "@/lib/dominio/datas";
import {
  abrirPainelDeLeads,
  estadoDoLead,
  resumirLeads,
  TETO_DE_LEITURA,
  type ContagemPorOrigem,
  type EstadoDoLead,
  type LeadDoPainel,
  type ResumoDeLeads,
} from "@/lib/leads-painel";
import { Aviso, Cartao, Etiqueta, Pagina, SemInformacao, Vazio, type Tom } from "@/components/app/ui";

/**
 * A tela de leads.
 *
 * Ela responde duas perguntas, e só essas duas — porque são as que hoje se
 * respondem com uma consulta SQL escrita à mão no painel do Supabase:
 *
 *   **"Quantos cadastros entraram, e quantos valem?"** — o bloco de números.
 *   **"Qual conteúdo converte?"** — a tabela por origem, que é a razão de
 *   `origem` existir na tabela desde o primeiro dia.
 *
 * O que ela deliberadamente NÃO tem: gráfico de série histórica, filtro por
 * período, exportação. Cada um deles é fácil de acrescentar e nenhum muda uma
 * decisão hoje, com o volume que existe. A regra do projeto vale aqui como vale
 * no painel do cliente — tela que enche não é tela que informa.
 *
 * ## Nenhum número aparece sem base
 *
 * As três situações abaixo levam a três telas diferentes, e a diferença entre
 * elas é o ponto:
 *
 *   sem credencial do banco  → diz o que falta ligar
 *   banco recusou a consulta → diz que falhou, e não inventa zero
 *   consulta vazia           → diz que ninguém se cadastrou ainda
 *
 * Achatar as três em "0 leads" seria contar ao dono que o funil está morto
 * quando o que está errado é a configuração. É a mesma regra de `procedencia.ts`:
 * ausência de informação nunca vira afirmação.
 */

export const metadata: Metadata = {
  title: "Leads do site",
  robots: { index: false, follow: false },
};

export default async function PaginaDeLeads() {
  await exigirAdministrador();

  const painel = abrirPainelDeLeads();

  if (!painel) {
    return (
      <Pagina
        titulo="Leads do site"
        descricao="Quem se cadastrou pelo blog e pelos guias, e qual conteúdo trouxe cada um."
      >
        <Aviso tom="atencao" titulo="Não há de onde ler os cadastros">
          <p>
            Esta tela lê a tabela <code>leads</code> com a chave de serviço, e uma
            das duas variáveis não está definida neste ambiente:{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> ou{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </p>
          <p className="mt-2">
            Enquanto isso, nenhum número é exibido — de propósito. Mostrar zero
            aqui diria que ninguém se cadastrou, e o que se sabe é outra coisa:
            que não há como consultar.
          </p>
        </Aviso>
      </Pagina>
    );
  }

  let leitura;
  try {
    leitura = await painel.listar();
  } catch (erro) {
    /*
     * O diagnóstico é para quem opera, e esta tela só abre para quem opera —
     * então ele pode aparecer aqui, ao contrário do que vale para o visitante do
     * site. `abrirPainelDeLeads` já garante que a mensagem descreve o status e
     * não a credencial.
     */
    return (
      <Pagina titulo="Leads do site">
        <Aviso tom="critico" titulo="A consulta ao banco falhou" papel="alert">
          <p>
            Nada foi lido, e nada é exibido: os números desta tela viriam da
            consulta que não voltou.
          </p>
          <p className="mt-2 font-mono text-xs break-words">
            {erro instanceof Error ? erro.message : "erro desconhecido"}
          </p>
        </Aviso>
      </Pagina>
    );
  }

  const { leads, truncada } = leitura;
  const resumo = resumirLeads(leads, new Date());

  return (
    <Pagina
      titulo="Leads do site"
      descricao="Quem se cadastrou pelo blog e pelos guias, e qual conteúdo trouxe cada um."
    >
      {truncada ? (
        <Aviso tom="atencao" titulo="Leitura parcial">
          A consulta traz no máximo {TETO_DE_LEITURA.toLocaleString("pt-BR")} cadastros,
          e esse teto foi atingido. Os números abaixo descrevem os mais recentes —
          não a base inteira.
        </Aviso>
      ) : null}

      {leads.length === 0 ? (
        <Vazio titulo="Nenhum cadastro ainda">
          A tabela está vazia. Isso é diferente de erro: a consulta funcionou e
          não encontrou linha nenhuma. Assim que alguém preencher a captura de um
          guia ou de um artigo, ele aparece aqui.
        </Vazio>
      ) : (
        <>
          <Numeros resumo={resumo} />
          <PorOrigem origens={resumo.porOrigem} />
          <UltimosCadastros leads={leads} />
        </>
      )}
    </Pagina>
  );
}

/**
 * O bloco de números.
 *
 * "Confirmados" vem primeiro e é o único em destaque porque é o único que
 * corresponde a alguém que de fato vai receber e-mail. Total é vaidade: inclui
 * quem digitou errado e quem já pediu para sair.
 */
function Numeros({ resumo }: { resumo: ResumoDeLeads }) {
  return (
    <Cartao
      titulo="A lista hoje"
      descricao="Confirmados é quem recebe o alerta diário: confirmou o e-mail e não pediu para sair."
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
        <Numero rotulo="Confirmados" valor={resumo.confirmados} destaque />
        <Numero rotulo="Pendentes" valor={resumo.pendentes} />
        <Numero rotulo="Descadastrados" valor={resumo.descadastrados} />
        <Numero rotulo="Total" valor={resumo.total} />
        <Numero rotulo="Novos em 7 dias" valor={resumo.novosEm7Dias} />
        <Numero rotulo="Novos em 30 dias" valor={resumo.novosEm30Dias} />
      </dl>

      <p className="mt-6 border-t pt-4 text-sm text-[var(--muted)]">
        Confirmaram o e-mail:{" "}
        <strong className="font-semibold text-[var(--foreground)]">
          {resumo.taxaDeConfirmacao === null ? (
            <SemInformacao>sem base para calcular</SemInformacao>
          ) : (
            porcentagem(resumo.taxaDeConfirmacao)
          )}
        </strong>{" "}
        de todos os que já se cadastraram — inclusive quem se descadastrou depois,
        porque confirmar e sair meses depois continua sendo um e-mail confirmado.
      </p>
    </Cartao>
  );
}

function Numero({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
        {rotulo}
      </dt>
      <dd
        className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${
          destaque ? "text-[var(--accent)]" : ""
        }`}
      >
        {valor.toLocaleString("pt-BR")}
      </dd>
    </div>
  );
}

/**
 * Qual conteúdo converte.
 *
 * A coluna que decide não é "cadastros", é "confirmados": uma origem pode trazer
 * volume e nenhum e-mail válido — é o que acontece quando a captura fica num
 * texto que atrai leitura curiosa em vez de leitura com intenção. Por isso as
 * duas aparecem lado a lado, e a taxa ao lado delas.
 */
function PorOrigem({ origens }: { origens: ContagemPorOrigem[] }) {
  return (
    <Cartao
      titulo="Qual conteúdo converte"
      descricao="A origem é gravada no cadastro. Sem ela, decidir onde investir em conteúdo seria palpite."
    >
      <Tabela cabecalho={["Origem", "Cadastros", "Confirmados", "Confirmação"]}>
        {origens.map((origem) => (
          <tr key={origem.origem} className="border-t">
            <Celula>
              <span className="font-mono text-xs break-all">{origem.origem}</span>
            </Celula>
            <Celula numerica>{origem.total.toLocaleString("pt-BR")}</Celula>
            <Celula numerica>{origem.confirmados.toLocaleString("pt-BR")}</Celula>
            <Celula numerica>{porcentagem(origem.confirmados / origem.total)}</Celula>
          </tr>
        ))}
      </Tabela>
    </Cartao>
  );
}

/**
 * Quantos cadastros a lista mostra, um a um.
 *
 * Corta em 100 porque a pergunta que esta tabela responde é "quem entrou
 * ultimamente" — quem precisa da base inteira precisa de exportação, que é outra
 * coisa e ainda não existe. O corte é declarado no rodapé em vez de silencioso.
 */
const ULTIMOS = 100;

function UltimosCadastros({ leads }: { leads: LeadDoPainel[] }) {
  const mostrados = leads.slice(0, ULTIMOS);

  return (
    <Cartao titulo="Últimos cadastros" descricao="Do mais recente para o mais antigo.">
      <Tabela cabecalho={["E-mail", "Cidade", "Origem", "Entrou em", "Estado"]}>
        {mostrados.map((lead) => (
          <tr key={`${lead.email}-${lead.recebidoEm}`} className="border-t">
            <Celula>
              <span className="break-all">{lead.email}</span>
            </Celula>
            <Celula>
              {lead.cidade ?? <SemInformacao>não informou</SemInformacao>}
            </Celula>
            <Celula>
              <span className="font-mono text-xs break-all">{lead.origem}</span>
            </Celula>
            <Celula>{quando(lead.recebidoEm)}</Celula>
            <Celula>
              <EtiquetaDeEstado estado={estadoDoLead(lead)} />
            </Celula>
          </tr>
        ))}
      </Tabela>

      {leads.length > ULTIMOS ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Mostrando os {ULTIMOS} mais recentes de {leads.length.toLocaleString("pt-BR")}{" "}
          lidos. Os números acima contam todos.
        </p>
      ) : null}
    </Cartao>
  );
}

const ESTADOS: Record<EstadoDoLead, { rotulo: string; tom: Tom }> = {
  confirmado: { rotulo: "Confirmado", tom: "positivo" },
  pendente: { rotulo: "Pendente", tom: "atencao" },
  descadastrado: { rotulo: "Saiu", tom: "neutro" },
};

function EtiquetaDeEstado({ estado }: { estado: EstadoDoLead }) {
  const { rotulo, tom } = ESTADOS[estado];
  return <Etiqueta tom={tom}>{rotulo}</Etiqueta>;
}

/**
 * Tabela que cabe na tela do celular.
 *
 * O `overflow-x-auto` é o que impede a página inteira de rolar de lado: sem ele,
 * uma origem longa empurra o layout e todo o resto da tela passa a rolar junto.
 */
function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr>
            {cabecalho.map((titulo) => (
              <th
                key={titulo}
                scope="col"
                className="px-5 pb-3 text-left text-xs font-medium tracking-wide text-[var(--muted)] uppercase sm:px-6"
              >
                {titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Celula({ children, numerica = false }: { children: ReactNode; numerica?: boolean }) {
  return (
    <td className={`px-5 py-3 align-top sm:px-6 ${numerica ? "tabular-nums" : ""}`}>
      {children}
    </td>
  );
}

function porcentagem(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}

/**
 * Data legível, ou ausência declarada.
 *
 * `dataDeBrasilia` sobre um valor inválido devolve "Invalid Date", que numa
 * tabela parece defeito da tela e não do dado. A linha existe para que o dado
 * estranho apareça como estranho.
 */
function quando(iso: string): ReactNode {
  if (!iso || Number.isNaN(Date.parse(iso))) return <SemInformacao>sem data</SemInformacao>;
  return dataDeBrasilia(iso);
}
