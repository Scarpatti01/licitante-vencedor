import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MATERIAIS, materialPorSlug } from "./materiais";

const PUBLIC = join(import.meta.dirname, "..", "..", "public");

describe("os materiais gratuitos", () => {
  it("todo material aponta para um arquivo que existe e não está vazio", () => {
    // O link sai num e-mail e numa tela de "pronto". Arquivo ausente ali é a
    // pior entrega possível: a pessoa confirmou o e-mail e recebeu um 404.
    for (const material of Object.values(MATERIAIS)) {
      const caminho = join(PUBLIC, material.arquivo);
      expect(existsSync(caminho), `${material.arquivo} não existe em public/`).toBe(true);
      expect(statSync(caminho).size).toBeGreaterThan(1000);
    }
  });

  it("o slug declarado é a própria chave", () => {
    for (const [chave, material] of Object.entries(MATERIAIS)) expect(material.slug).toBe(chave);
  });

  it("aceita só slug conhecido, venha de onde vier", () => {
    expect(materialPorSlug("modelo-de-impugnacao")?.slug).toBe("modelo-de-impugnacao");
    expect(materialPorSlug("toString")).toBeNull();
    expect(materialPorSlug("__proto__")).toBeNull();
    expect(materialPorSlug(["modelo-de-impugnacao"])).toBeNull();
    expect(materialPorSlug(undefined)).toBeNull();
    expect(materialPorSlug("")).toBeNull();
  });
});
