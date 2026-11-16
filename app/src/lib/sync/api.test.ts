import { describe, it, expect } from "vitest";
import { leerColumnasDescartadas, serializarColumnasDescartadas } from "./api";
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
