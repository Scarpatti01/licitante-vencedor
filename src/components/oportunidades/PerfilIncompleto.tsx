import type { PerfilDaEmpresa } from "@/lib/dominio/tipos";
import { Aviso } from "./Primitivos";

/**
 * O caso mais comum do primeiro mês, e o que mais estraga a impressão do
 * produto se for tratado como erro: o perfil ainda está pela metade.
 *
 * Quando ele está, o score não sai (`cobertura` abaixo do mínimo) e quase tudo
 * vira "sem base para recomendar". A tela precisa dizer que a culpa não é do
 * edital e que o conserto é rápido — e precisa dizer EXATAMENTE quais campos
 * faltam, porque "complete seu perfil" sem lista é o mesmo que não avisar.
 */

export type LacunaDoPerfil = { chave: string; rotulo: string; porque: string };

export function lacunasDoPerfil(perfil: PerfilDaEmpresa): LacunaDoPerfil[] {
  const lacunas: LacunaDoPerfil[] = [];

  if (perfil.palavrasChave.length === 0) {
    lacunas.push({
      chave: "palavrasChave",
      rotulo: "Palavras-chave do que a sua empresa vende",
      porque:
        "É o que permite dizer se o objeto do edital é do seu ramo. Sem elas, o critério de maior peso da triagem fica sem base.",
    });
  }
  if (perfil.ufsAtendidas.length === 0) {
    lacunas.push({
      chave: "ufsAtendidas",
      rotulo: "Estados em que você aceita executar",
      porque:
        "Sem eles não dá para separar o certame ao lado do certame do outro lado do país.",
    });
  }
  if (perfil.ticketMinimo === null && perfil.ticketMaximo === null) {
    lacunas.push({
      chave: "ticket",
      rotulo: "Faixa de valor de contrato que você opera",
      porque: "É o que evita mostrar contrato pequeno demais para valer a proposta, ou grande demais para o seu porte.",
    });
  }
  if (perfil.faturamentoAnual === null) {
    lacunas.push({
      chave: "faturamentoAnual",
      rotulo: "Faturamento anual",
      porque:
        "Usado apenas para comparar o porte do contrato com o da empresa, onde a qualificação econômico-financeira costuma pegar.",
    });
  }
  if (perfil.documentos.length === 0) {
    lacunas.push({
      chave: "documentos",
      rotulo: "Documentos de habilitação",
      porque: "Sem eles o checklist não tem com o que comparar as exigências do edital.",
    });
  }
  if (perfil.atestados.length === 0) {
    lacunas.push({
      chave: "atestados",
      rotulo: "Atestados de capacidade técnica",
      porque: "São o que mostra se a sua experiência cobre o objeto e o porte do contrato.",
    });
  }

  return lacunas;
}

export function AvisoDePerfilIncompleto({
  lacunas,
  razaoSocial,
}: {
  lacunas: LacunaDoPerfil[];
  razaoSocial: string;
}) {
  if (lacunas.length === 0) return null;

  return (
    <Aviso
      tom="atencao"
      titulo={`O perfil de ${razaoSocial} está incompleto — e é por isso que falta score`}
    >
      <p>
        Preferimos não pontuar a chute: quando metade dos critérios fica sem base, o produto diz que
        não sabe em vez de publicar um número que ninguém consegue defender. Faltam{" "}
        {lacunas.length === 1 ? "estes dados" : `estes ${lacunas.length} dados`} no cadastro da sua
        empresa:
      </p>
      <ul className="space-y-2">
        {lacunas.map((lacuna) => (
          <li key={lacuna.chave} className="flex gap-2.5">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
            <span>
              <span className="font-medium text-[var(--foreground)]">{lacuna.rotulo}</span>
              <span aria-hidden> — </span>
              {lacuna.porque}
            </span>
          </li>
        ))}
      </ul>
    </Aviso>
  );
}
