import type { ReactNode } from "react";
import type { ErrosDoFormulario } from "./leitura";

/**
 * Os campos do perfil.
 *
 * Cada componente daqui carrega a acessibilidade embutida em vez de deixá-la a
 * cargo de quem monta a tela: rótulo ligado ao controle, texto de ajuda e
 * mensagem de erro ligados por `aria-describedby`, `aria-invalid` quando há
 * erro, e anel de foco visível. Um formulário deste tamanho tem campos demais
 * para que "lembrar de pôr o label" seja um plano.
 *
 * O texto de ajuda não é decorativo. Cada campo do perfil alimenta um critério
 * de recomendação, e a ajuda diz QUAL — "usamos isto para descartar editais
 * fora do seu estado" é o que faz alguém preencher um campo que, mudo, seria
 * pulado.
 */

function idDe(nome: string): string {
  return `campo-${nome.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

function Envolucro({
  id,
  rotulo,
  ajuda,
  erro,
  obrigatorio,
  children,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string;
  obrigatorio?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {rotulo}
        {obrigatorio ? (
          <span className="ml-1 text-rose-700 dark:text-rose-300" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-[var(--muted)]">opcional</span>
        )}
      </label>
      {ajuda ? (
        <p id={`${id}-ajuda`} className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          {ajuda}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {erro ? (
        <p id={`${id}-erro`} className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

const CONTROLE =
  "w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm shadow-[inset_0_1px_1px_rgba(15,23,42,0.03)] focus:border-[var(--accent)] focus:outline-2 focus:outline-offset-1 focus:outline-[var(--accent)]";

const CONTROLE_COM_ERRO =
  "border-rose-400 dark:border-rose-700";

function descritores(id: string, ajuda: boolean, erro: boolean): string | undefined {
  const partes = [ajuda ? `${id}-ajuda` : null, erro ? `${id}-erro` : null].filter(Boolean);
  return partes.length > 0 ? partes.join(" ") : undefined;
}

export function CampoDeTexto({
  nome,
  rotulo,
  ajuda,
  erro,
  valorInicial,
  tipo = "text",
  obrigatorio,
  placeholder,
  inputMode,
  autoComplete,
  maxLength,
}: {
  nome: string;
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string;
  valorInicial?: string;
  tipo?: "text" | "date" | "number" | "email" | "time";
  obrigatorio?: boolean;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  autoComplete?: string;
  maxLength?: number;
}) {
  const id = idDe(nome);
  return (
    <Envolucro id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} obrigatorio={obrigatorio}>
      <input
        id={id}
        name={nome}
        type={tipo}
        defaultValue={valorInicial}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(id, Boolean(ajuda), Boolean(erro))}
        className={`${CONTROLE} ${erro ? CONTROLE_COM_ERRO : ""}`}
      />
    </Envolucro>
  );
}

export function CampoDeLista({
  nome,
  rotulo,
  ajuda,
  erro,
  valorInicial,
  placeholder,
  linhas = 3,
}: {
  nome: string;
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string;
  valorInicial?: string[];
  placeholder?: string;
  linhas?: number;
}) {
  const id = idDe(nome);
  return (
    <Envolucro id={id} rotulo={rotulo} ajuda={ajuda} erro={erro}>
      <textarea
        id={id}
        name={nome}
        rows={linhas}
        defaultValue={(valorInicial ?? []).join(", ")}
        placeholder={placeholder}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(id, Boolean(ajuda), Boolean(erro))}
        className={`${CONTROLE} resize-y ${erro ? CONTROLE_COM_ERRO : ""}`}
      />
    </Envolucro>
  );
}

export function CampoDeSelecao({
  nome,
  rotulo,
  ajuda,
  erro,
  valorInicial,
  opcoes,
  obrigatorio,
  vazio,
}: {
  nome: string;
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string;
  valorInicial?: string;
  opcoes: { valor: string; rotulo: string }[];
  obrigatorio?: boolean;
  vazio?: string;
}) {
  const id = idDe(nome);
  return (
    <Envolucro id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} obrigatorio={obrigatorio}>
      <select
        id={id}
        name={nome}
        defaultValue={valorInicial ?? ""}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(id, Boolean(ajuda), Boolean(erro))}
        className={`${CONTROLE} ${erro ? CONTROLE_COM_ERRO : ""}`}
      >
        {vazio ? <option value="">{vazio}</option> : null}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Envolucro>
  );
}

/**
 * Grupo de caixas de seleção como `fieldset`/`legend`.
 *
 * `div` + texto em negrito pareceria igual e não seria igual: sem o `fieldset`,
 * o leitor de tela lê vinte e sete caixas soltas sem dizer a que pergunta elas
 * respondem.
 */
export function GrupoDeMarcacoes({
  nome,
  legenda,
  ajuda,
  erro,
  opcoes,
  selecionados,
  colunas = "auto",
}: {
  nome: string;
  legenda: string;
  ajuda?: ReactNode;
  erro?: string;
  opcoes: { valor: string; rotulo: string; detalhe?: string }[];
  selecionados: string[];
  colunas?: "auto" | "densa";
}) {
  const id = idDe(nome);
  const marcados = new Set(selecionados);

  return (
    <fieldset id={id} aria-describedby={descritores(id, Boolean(ajuda), Boolean(erro))}>
      <legend className="text-sm font-medium">{legenda}</legend>
      {ajuda ? (
        <p id={`${id}-ajuda`} className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          {ajuda}
        </p>
      ) : null}
      <div
        className={`mt-3 grid gap-x-4 gap-y-2 ${
          colunas === "densa"
            ? "grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))]"
            : "sm:grid-cols-2"
        }`}
      >
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface)] has-[:checked]:bg-[var(--accent-soft)]"
          >
            <input
              type="checkbox"
              name={nome}
              value={o.valor}
              defaultChecked={marcados.has(o.valor)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
            <span>
              <span className="font-medium">{o.rotulo}</span>
              {o.detalhe ? (
                <span className="block text-xs text-[var(--muted)]">{o.detalhe}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {erro ? (
        <p id={`${id}-erro`} className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * Resumo dos erros no topo do formulário.
 *
 * Existe porque um formulário longo com o erro lá embaixo é um formulário em
 * que o usuário clica "salvar" de novo sem entender por que nada aconteceu.
 * `tabIndex={-1}` permite mandar o foco para cá depois do envio.
 */
export function ResumoDeErros({
  erros,
  rotulos,
}: {
  erros: ErrosDoFormulario;
  rotulos?: Record<string, string>;
}) {
  const chaves = Object.keys(erros);
  if (chaves.length === 0) return null;

  return (
    <div
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm dark:border-rose-900 dark:bg-rose-950/60"
    >
      <p className="font-semibold text-rose-900 dark:text-rose-200">
        {chaves.length === 1
          ? "Um campo precisa de correção antes de salvar."
          : `${chaves.length} campos precisam de correção antes de salvar.`}
      </p>
      <ul className="mt-2 space-y-1 text-rose-900 dark:text-rose-200">
        {chaves.map((chave) => (
          <li key={chave}>
            <a
              href={`#${idDe(chave)}`}
              className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {rotulos?.[chave] ?? chave}
            </a>
            : {erros[chave]}
          </li>
        ))}
      </ul>
    </div>
  );
}
