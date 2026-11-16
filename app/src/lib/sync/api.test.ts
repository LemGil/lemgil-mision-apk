import { describe, it, expect } from "vitest";
import { cleanForPush, leerColumnasDescartadas, serializarColumnasDescartadas, toSupabase } from "./api";
import type { SyncTableName } from "./types";

describe("columnas descartadas persistidas: ida y vuelta", () => {
  it("serializa y lee el mismo mapa", () => {
    const mapa = new Map<SyncTableName, Set<string>>([
      ["cursos", new Set(["version", "updatedat"])],
      ["conversiones", new Set(["updatedat"])],
    ]);
    const leido = leerColumnasDescartadas(serializarColumnasDescartadas(mapa));
    expect(leido.get("cursos")).toEqual(new Set(["version", "updatedat"]));
    expect(leido.get("conversiones")).toEqual(new Set(["updatedat"]));
    expect(leido.size).toBe(2);
  });

  it("un guardado ausente o dañado se lee como vacío, sin lanzar", () => {
    expect(leerColumnasDescartadas(null).size).toBe(0);
    expect(leerColumnasDescartadas("{roto").size).toBe(0);
    expect(leerColumnasDescartadas('{"cursos": "no-es-lista"}').size).toBe(0);
  });
});

describe("cleanForPush — rellenos que exige el servidor", () => {
  it("conversiones: rellena los campos NOT NULL vacíos y no toca los llenos", () => {
    const out = cleanForPush("conversiones", {
      id: "c1", nombre: "Ana", estado: "ps-congregado", lider: null,
    });
    expect(out.lider).toBe("");
    expect(out.telefono).toBe("");
    expect(out.grupoId).toBe("");
    expect(out.bautizado).toBe(false);
    expect(out.historial).toEqual([]);
    expect(out.version).toBe(1);
    expect(out.nombre).toBe("Ana");
    expect(out.estado).toBe("ps-congregado");
  });

  it("estudiantes: la versión nula sube como primera versión; la real se respeta", () => {
    expect(cleanForPush("estudiantes", { id: "e1", version: null }).version).toBe(1);
    expect(cleanForPush("estudiantes", { id: "e1", version: 3 }).version).toBe(3);
  });

  it("aportesComun: su version se sigue borrando y no se rellena", () => {
    expect("version" in cleanForPush("aportesComun", { id: "a1", version: 2 })).toBe(false);
  });
});

describe("toSupabase — tabla remota de cada tabla local", () => {
  it("cursos va a su propia tabla, no a la de la Academia", () => {
    expect(toSupabase("cursos")).toBe("cursos_mision");
  });

  it("las demás conservan su tabla remota", () => {
    expect(toSupabase("conversiones")).toBe("conversiones");
    expect(toSupabase("estudiantes")).toBe("estudiantes");
    expect(toSupabase("aportesComun")).toBe("aportescomun");
    expect(toSupabase("pasosSeguimiento")).toBe("pasosseguimiento");
  });
});
