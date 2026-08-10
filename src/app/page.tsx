import Image from "next/image";
import { AUTHOR, SITE } from "@/lib/site";

const PILARES = [
  {
    titulo: "Triagem diária do PNCP",
    texto:
      "Varremos as publicações do Portal Nacional de Contratações Públicas e separamos o que serve para o seu CNAE, o seu porte e a sua região. O que não serve, você nem vê.",
  },
  {
    titulo: "Checklist de habilitação",
    texto:
      "Cada edital chega com a lista de documentos exigidos, comparada com o que a sua empresa já tem em dia. Certidão vencida deixa de ser descoberta na hora da sessão.",
  },
  {
    titulo: "Prazo e risco na frente",
    texto:
      "Data da sessão, tempo restante e os pontos do edital que mais desclassificam fornecedor. Em português, sem juridiquês.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-base font-semibold tracking-tight">
            {SITE.name}
          </span>
          <span className="text-sm text-[var(--muted)]">
            Editais públicos, desde {SITE.foundingYear}
          </span>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <p className="mb-5 inline-block rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium tracking-wide text-[var(--accent)] uppercase">
            Novo site em construção
          </p>

          <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-6xl">
            Os editais que a sua empresa pode ganhar, já lidos.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
            Todo dia útil, às 7h, você recebe os editais do PNCP compatíveis com
            o seu perfil — com o que eles pedem, o que falta na sua habilitação,
            o prazo e o risco. Você só decide se participa.
          </p>

          <p className="mt-6 max-w-2xl leading-relaxed text-[var(--muted)]">
            Não é mais uma lista de licitações para você garimpar. É a leitura
            pronta, para a decisão sair em minutos em vez de tomar a manhã
            inteira de alguém.
          </p>
        </section>

        <section className="border-y bg-[var(--surface)]">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:grid-cols-3">
            {PILARES.map((pilar) => (
              <div key={pilar.titulo}>
                <h2 className="text-lg font-semibold tracking-tight">
                  {pilar.titulo}
                </h2>
                <p className="mt-3 leading-relaxed text-[var(--muted)]">
                  {pilar.texto}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Um acervo de dez anos sendo reescrito
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--muted)]">
            O Licitante Vencedor publica sobre licitações e contratações
            públicas desde {SITE.foundingYear}. Todo esse acervo está sendo
            revisado e reescrito para a Lei 14.133/2021, junto com as seções de
            jurisprudência, súmulas do TCU e legislação. Os guias voltam ao ar
            nas próximas semanas.
          </p>
        </section>

        <section className="border-t">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-16 sm:flex-row sm:items-start">
            <Image
              src={AUTHOR.photo}
              alt={`Foto de ${AUTHOR.name}`}
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-full object-cover"
              priority={false}
            />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Quem assina
              </h2>
              <p className="mt-2 font-medium">
                {AUTHOR.name}
                <span className="font-normal text-[var(--muted)]">
                  {" "}
                  — {AUTHOR.jobTitle}
                </span>
              </p>
              <p className="mt-3 max-w-2xl leading-relaxed text-[var(--muted)]">
                {AUTHOR.bio}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-[var(--muted)]">
          <p className="font-medium text-[var(--foreground)]">{SITE.name}</p>
          <p className="mt-2 max-w-2xl">
            Conteúdo informativo e triagem operacional de editais. Não constitui
            parecer jurídico — a decisão de participar de um certame é sempre da
            empresa licitante.
          </p>
          <p className="mt-4">
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
