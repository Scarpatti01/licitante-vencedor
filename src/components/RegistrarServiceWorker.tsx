"use client";

import { useEffect } from "react";

/**
 * Registra o service worker, e só isso.
 *
 * Fica no layout raiz porque o worker serve o site inteiro: ele guarda o
 * estático com hash no nome e mostra a tela de aviso quando falta rede. O que
 * ele nunca guarda está escrito em `public/sw.js`, e a razão também.
 *
 * O convite de instalação NÃO mora aqui: quem lê um guia pela primeira vez não
 * tem por que ser convidado a instalar nada.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Depois do load: registrar durante o carregamento disputa banda com o que
    // a pessoa veio ver.
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sem service worker o site funciona igual, só não abre offline.
      });
    };
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);

  return null;
}
