import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdministrador } from "@/lib/auth/administracao";
import { consultarFunil } from "@/lib/funil-repositorio";
import { periodoDoFunil, PERIODOS_DO_FUNIL } from "@/lib/funil";
import { PainelDoFunil } from "@/components/administracao/PainelDoFunil";
import { Aviso, Pagina } from "@/components/app/ui";

export const metadata: Metadata = { title: "Funil de ativação", robots: { index: false, follow: false } };

export default async function Funil({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await exigirAdministrador();
  const dias = periodoDoFunil((await searchParams).dias);
  let resumo;
  try {
    resumo = await consultarFunil(dias);
  } catch {
    return <Pagina titulo="Funil de ativação"><Aviso tom="critico" titulo="A consulta ao funil falhou" papel="alert">Os dados não foram carregados. Tente novamente. Nenhuma contagem foi substituída por zero.</Aviso></Pagina>;
  }
  return (
    <Pagina titulo="Funil de ativação" descricao="Onde os cadastros do site avançam até o uso das oportunidades.">
      <nav aria-label="Período do funil" className="flex flex-wrap gap-3">
        {PERIODOS_DO_FUNIL.map((n) => <Link key={n} href={`/administracao/funil/?dias=${n}`} aria-current={dias === n ? "page" : undefined} className={`rounded-lg border px-4 py-2 text-sm ${dias === n ? "bg-[var(--accent)] text-white" : "bg-[var(--background)]"}`}>Últimos {n} dias</Link>)}
      </nav>
      <p className="my-6 text-sm leading-relaxed text-[var(--muted)]">
        As visitas e as páginas de entrada continuam no Analytics do <a href="https://vercel.com/linguaflow/licitante-vencedor" rel="noopener noreferrer" className="underline underline-offset-4">projeto na Vercel</a>.
        As taxas abaixo começam no cadastro: visitantes anônimos não são associados a contas.
        O servidor calcula os totais com os registros já existentes. Somente os totais chegam a esta tela.
      </p>
      {resumo ? <PainelDoFunil resumo={resumo} /> : <Aviso tom="atencao" titulo="A leitura do funil não está configurada">As credenciais de leitura do servidor não estão disponíveis. Nenhum número é exibido.</Aviso>}
      <p className="mt-6 text-sm leading-relaxed text-[var(--muted)]">
        A coorte inclui os cadastros do site no período, inclusive pedidos de materiais.
        Contas anteriores ao cadastro e contas com outro e-mail não são atribuídas a ele.
        Cada etapa exige as anteriores. Filtros e assinaturas refletem o estado atual;
        mudanças ou exclusões podem alterar uma consulta futura. Estes números não contam visitas únicas nem comprovam a causa de uma desistência.
      </p>
    </Pagina>
  );
}
