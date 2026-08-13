/**
 * A faixa de dados de demonstração.
 *
 * Obrigatória, não opcional: o repositório de demonstração existe para permitir
 * construir e revisar as telas antes de haver banco, e `demonstracao.ts` diz em
 * letras claras que a tela É OBRIGADA a avisar quando os dados vêm dali. Uma
 * tela idêntica à de produção mostrando edital inventado, sem aviso, é o tipo
 * de coisa que vira captura de tela em apresentação comercial.
 *
 * O segundo parágrafo não é enfeite. O repositório de demonstração guarda o
 * perfil na memória da instância, e a instância nasce e morre em cada
 * requisição — quem salvar o cadastro aqui vê a mudança na resposta do envio e
 * não a vê depois. Dizer isso é a diferença entre uma limitação conhecida e um
 * bug reportado.
 */

export function AvisoDeDemonstracao() {
  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/70 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-5 py-2.5 text-sm sm:px-8">
        <p className="font-semibold">
          Dados de demonstração — nenhum edital desta tela é real.
        </p>
        <p className="leading-relaxed">
          Os registros vêm de um conjunto sintético, com identificadores começando
          em <code className="font-mono text-xs">EXEMPLO-</code>, usado para
          construir e revisar as telas enquanto o banco não está provisionado. O
          cadastro que você salvar é aceito e validado, mas não sobrevive à
          próxima requisição.
        </p>
      </div>
    </div>
  );
}
