/**
 * A faixa de dados de demonstração.
 *
 * Obrigatória, não opcional: o repositório de demonstração existe para permitir
 * construir e revisar as telas antes de haver banco, e `demonstracao.ts` diz em
 * letras claras que a tela É OBRIGADA a avisar quando os dados vêm dali. Uma
 * tela idêntica à de produção mostrando edital inventado, sem aviso, é o tipo
 * de coisa que vira captura de tela em apresentação comercial.
 *
 * ## Duas frases, porque hoje há duas verdades diferentes na mesma tela
 *
 * Desde 17/08 o cadastro do cliente logado é gravado em Postgres, enquanto
 * painel e oportunidades continuam sintéticos — a triagem que cruza os editais
 * coletados com o perfil ainda não existe.
 *
 * Um aviso único diria a coisa errada de um dos dois lados: manter "o cadastro
 * não sobrevive à próxima requisição" passou a ser falso para quem tem conta, e
 * apagar a faixa porque metade virou real seria falso sobre os editais. Daí o
 * `cadastroPersiste`: o primeiro parágrafo vale para os dois casos, o segundo
 * diz qual é o seu.
 */

export function AvisoDeDemonstracao({ cadastroPersiste }: { cadastroPersiste: boolean }) {
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
          Os editais e as recomendações vêm de um conjunto sintético, com
          identificadores começando em{" "}
          <code className="font-mono text-xs">EXEMPLO-</code>, usado para
          construir e revisar as telas enquanto a triagem sobre os editais
          coletados não existe.{" "}
          {cadastroPersiste ? (
            <>
              O cadastro da sua empresa, esse, é real: o que você salvar em
              Perfil fica gravado e continua aqui na próxima visita.
            </>
          ) : (
            <>
              O cadastro que você salvar é aceito e validado, mas não sobrevive
              à próxima requisição — para ter um cadastro que fica, crie uma
              conta.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
