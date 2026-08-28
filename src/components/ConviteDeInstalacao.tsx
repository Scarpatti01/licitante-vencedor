"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Convida a instalar o app na tela de início.
 *
 * Os dois sistemas convidam de formas diferentes, e é por isso que existe
 * código aqui em vez de só um manifesto:
 *
 * - No Android, o navegador dispara `beforeinstallprompt`, e nós guardamos o
 *   evento para abrir o convite no momento que escolhermos.
 * - No iPhone, esse evento não existe. O Safari só instala pelo menu de
 *   compartilhar, e não há como abrir esse menu por código. Sem uma instrução
 *   escrita, a pessoa simplesmente não descobre, e a instalação nunca acontece.
 *
 * O convite aparece uma vez. Quem dispensa não vê de novo, porque insistir com
 * quem já disse não custa mais do que a instalação vale.
 */

const CHAVE = "lv-convite-de-instalacao";

type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function jaDispensou() {
  try {
    return localStorage.getItem(CHAVE) === "dispensado";
  } catch {
    // Navegação privada ou site data bloqueado: some com o convite em vez de
    // quebrar a página.
    return true;
  }
}

function lembrarQueDispensou() {
  try {
    localStorage.setItem(CHAVE, "dispensado");
  } catch {
    // Sem onde guardar, o convite volta na próxima visita. Não é o ideal, e é
    // melhor que estourar.
  }
}

/** Instalado quer dizer aberto pelo ícone, e aí não faz sentido convidar. */
function jaEstaInstalado() {
  if (typeof window === "undefined") return true;
  const navegadorIOS = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navegadorIOS.standalone === true
  );
}

function ehIPhoneOuIPad() {
  const ua = navigator.userAgent;
  const iPadModerno = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadModerno;
}

/**
 * Leitura do ambiente, e não estado.
 *
 * Isto não muda enquanto a página existe: ou o navegador é um iPhone, ou não é.
 * Ler com `useSyncExternalStore` em vez de `setState` dentro de um efeito faz o
 * servidor render'izar sempre `false`, sem descompasso na hidratação, e evita
 * um segundo render só para descobrir onde estamos.
 */
const NAO_MUDA = () => () => {};

export function ConviteDeInstalacao() {
  const [convite, setConvite] = useState<EventoDeInstalacao | null>(null);
  const [dispensado, setDispensado] = useState(false);

  const cabeConvidar = useSyncExternalStore(
    NAO_MUDA,
    useCallback(() => !jaEstaInstalado() && !jaDispensou(), []),
    () => false,
  );
  const ehIOS = useSyncExternalStore(NAO_MUDA, useCallback(() => ehIPhoneOuIPad(), []), () => false);

  useEffect(() => {
    if (!cabeConvidar) return;

    const aoPoderInstalar = (evento: Event) => {
      evento.preventDefault();
      setConvite(evento as EventoDeInstalacao);
    };
    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    return () => window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
  }, [cabeConvidar]);

  // O Safari nunca dispara `beforeinstallprompt`, então o convite do iPhone é
  // decidido por quem é o navegador, e não por um evento que não vem.
  const mostrarIOS = cabeConvidar && ehIOS && !dispensado;

  function dispensar() {
    lembrarQueDispensou();
    setConvite(null);
    setDispensado(true);
  }

  async function instalar() {
    if (!convite) return;
    await convite.prompt();
    await convite.userChoice;
    // Aceitando ou recusando, o evento não pode ser usado de novo.
    lembrarQueDispensou();
    setConvite(null);
  }

  if (!cabeConvidar || dispensado) return null;
  if (!convite && !mostrarIOS) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar o aplicativo"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-lg sm:inset-x-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icone-192.png" alt="" width={40} height={40} className="mt-0.5 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="font-semibold text-[var(--foreground)]">
            Deixe a jornada a um toque
          </p>
          {mostrarIOS ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Toque em <strong>Compartilhar</strong> na barra do Safari e depois em{" "}
              <strong>Adicionar à Tela de Início</strong>. O app abre em tela cheia,
              sem a barra do navegador.
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Instale na tela de início e abra em tela cheia, sem a barra do
              navegador. Não ocupa espaço como um aplicativo de loja.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {convite ? (
              <button
                type="button"
                onClick={instalar}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
              >
                Instalar
              </button>
            ) : null}
            <button
              type="button"
              onClick={dispensar}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-[var(--muted)]"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
