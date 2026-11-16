import { describe, it, expect } from "vitest";
import { cleanForPush, dedupirPorId, idsAReconciliar, leerColumnasDescartadas, leerRemotos, serializarColumnasDescartadas, serializarRemotos, toSupabase } from "./api";
import { leerAbsorbidas, serializarAbsorbidas } from "./queue";
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

describe("idsAReconciliar — borrados que llegan de otro equipo", () => {
  it("retira lo que estaba en la foto, ya no está en el servidor y no espera para subir", () => {
    expect(
      idsAReconciliar(["a", "b", "c"], ["a", "b"], new Set(["b"]), new Set()),
    ).toEqual(["a"]);
  });

  it("sin foto anterior no se retira nada (un local nunca subido está a salvo)", () => {
    expect(idsAReconciliar(["a"], [], new Set(), new Set())).toEqual([]);
  });

  it("lo que espera en la bandeja de salida no se toca", () => {
    expect(
      idsAReconciliar(["a"], ["a"], new Set(), new Set(["a"])),
    ).toEqual([]);
  });

  it("lo que sigue en el servidor no se toca", () => {
    expect(
      idsAReconciliar(["a"], ["a"], new Set(["a"]), new Set()),
    ).toEqual([]);
  });
});

describe("foto remota y registro de absorbidas: ida y vuelta", () => {
  it("la foto serializa y se lee igual; lo dañado se lee vacío", () => {
    const mapa = { personas: ["p1", "p2"], cursos: ["c1"] };
    expect(leerRemotos(serializarRemotos(mapa))).toEqual(mapa);
    expect(leerRemotos("{roto")).toEqual({});
    expect(leerRemotos("[]")).toEqual({});
    expect(leerRemotos(null)).toEqual({});
  });

  it("las absorbidas serializan y se leen igual; lo dañado se lee vacío", () => {
    const ids = new Set(["p1", "p2"]);
    expect(leerAbsorbidas(serializarAbsorbidas(ids))).toEqual(ids);
    expect(leerAbsorbidas("{roto")).toEqual(new Set());
    expect(leerAbsorbidas(null)).toEqual(new Set());
  });
});

describe("dedupirPorId — un solo renglón por llave en el lote", () => {
  it("un id repetido queda una vez, con la versión mayor", () => {
    const out = dedupirPorId([
      { id: "a", version: 1, nombre: "viejo" },
      { id: "b", version: 1 },
      { id: "a", version: 3, nombre: "nuevo" },
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.id === "a")?.nombre).toBe("nuevo");
  });

  it("el id numérico 1 y el de texto «1» cuentan como la misma llave", () => {
    const out = dedupirPorId([
      { id: 1, version: 1 },
      { id: "1", version: 2 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].version).toBe(2);
  });

  it("las filas sin id pasan tal cual y el resto no se toca", () => {
    const out = dedupirPorId([{ nombre: "suelto" }, { id: "x", version: 1 }]);
    expect(out).toHaveLength(2);
  });
});
