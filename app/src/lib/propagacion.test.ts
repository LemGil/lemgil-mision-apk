import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { reflejarFallecimientoEnConversion, reflejarTrasladoEnConversion, reflejoDeSalidaEnMiembro } from "./propagacion";
import { PASOS_MISION_DEFECTO, PS_APARTADO, PS_BAUTIZADO, PS_FALLECIDO, PS_INTEGRADO, PS_TRASLADO } from "./pasosMision";
import { db } from "./database";
import { today } from "./utils";
import type { Conversion, PasoSeguimiento } from "./types";

// NOTA P2: las pruebas de `camposAPropagar` (B2, «sin pisar») se retiraron
// junto con la función: con la ficha única los datos personales viven una
// sola vez en el núcleo y ya no hay propagación entre copias. Sobrevive el
// reflejo B3 (regla del proceso), probado abajo.

const convBase: Conversion = {
  id: "c1",
  nombre: "Ana",
  apellido: "Pérez",
  telefono: "555-111",
  edad: "30",
  direccion: "Calle 1",
  familia: "No",
  fecha: "2026-01-10",
  zona: "Norte",
  lider: "Luis",
  grupoId: "",
  hermanoMayorId: null,
  email: "ana@x.cu",
  profesion: "Maestra",
  bautizado: false,
  fechaBautismo: "",
  conyuge: "",
  hijos: "",
  estado: "ps-integrado",
  notas: "Contactada en campaña",
  historial: [],
  creado: "2026-01-10T00:00:00.000Z",
  version: 1,
};

describe("reflejarFallecimientoEnConversion (B3, sentido inverso)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.conversiones.clear();
  });

  it("miembro Fallecido → su conversión pasa a Fallecido con entrada en el historial", async () => {
    await db.conversiones.add(convBase);
    await reflejarFallecimientoEnConversion({ estado: "Fallecido", conversionId: "c1" });
    const conv = await db.conversiones.get("c1");
    expect(conv?.estado).toBe("ps-fallecido");
    expect(conv?.historial).toEqual([
      { fecha: today(), estado: "ps-fallecido", nota: "Marcado fallecido desde Miembros" },
    ]);
  });

  it("conserva el historial previo y agrega la entrada al final", async () => {
    const previa = { fecha: "2025-05-01", estado: "ps-integrado", nota: "Integración" };
    await db.conversiones.add({ ...convBase, historial: [previa] });
    await reflejarFallecimientoEnConversion({ estado: "Fallecido", conversionId: "c1" });
    const conv = await db.conversiones.get("c1");
    expect(conv?.historial).toHaveLength(2);
    expect(conv?.historial[0]).toEqual(previa);
    expect(conv?.historial[1].nota).toBe("Marcado fallecido desde Miembros");
  });

  it("miembro no Fallecido → la conversión no se toca", async () => {
    await db.conversiones.add(convBase);
    await reflejarFallecimientoEnConversion({ estado: "Activo", conversionId: "c1" });
    const conv = await db.conversiones.get("c1");
    expect(conv?.estado).toBe("ps-integrado");
    expect(conv?.historial).toEqual([]);
  });

  it("conversión ya Fallecido → no duplica la entrada del historial", async () => {
    await db.conversiones.add({ ...convBase, estado: "ps-fallecido" });
    await reflejarFallecimientoEnConversion({ estado: "Fallecido", conversionId: "c1" });
    const conv = await db.conversiones.get("c1");
    expect(conv?.historial).toEqual([]);
  });

  it("sin conversionId o con conversión inexistente → no hace nada ni lanza", async () => {
    await expect(
      reflejarFallecimientoEnConversion({ estado: "Fallecido", conversionId: null }),
    ).resolves.toBeUndefined();
    await expect(
      reflejarFallecimientoEnConversion({ estado: "Fallecido", conversionId: "no-existe" }),
    ).resolves.toBeUndefined();
  });
});

describe("reflejarTrasladoEnConversion (B3, sentido inverso)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.conversiones.clear();
  });

  it("miembro Trasladado → su conversión pasa a ps-traslado con entrada en el historial", async () => {
    await db.conversiones.add(convBase);
    await reflejarTrasladoEnConversion({ estado: "Trasladado", conversionId: "c1" });
    const conv = await db.conversiones.get("c1");
    expect(conv?.estado).toBe("ps-traslado");
    expect(conv?.historial).toEqual([
      { fecha: today(), estado: "ps-traslado", nota: "Marcado trasladado desde Miembros" },
    ]);
  });

  it("miembro no Trasladado → la conversión no se toca", async () => {
    await db.conversiones.add(convBase);
    await reflejarTrasladoEnConversion({ estado: "Activo", conversionId: "c1" });
    const conv = await db.conversiones.get("c1");
    expect(conv?.estado).toBe("ps-integrado");
    expect(conv?.historial).toEqual([]);
  });

  it("conversión ya en Traslado → no duplica la entrada del historial", async () => {
    await db.conversiones.add({ ...convBase, estado: "ps-traslado" });
    await reflejarTrasladoEnConversion({ estado: "Trasladado", conversionId: "c1" });
    const conv = await db.conversiones.get("c1");
    expect(conv?.historial).toEqual([]);
  });

  it("sin conversionId o con conversión inexistente → no hace nada ni lanza", async () => {
    await expect(
      reflejarTrasladoEnConversion({ estado: "Trasladado", conversionId: null }),
    ).resolves.toBeUndefined();
    await expect(
      reflejarTrasladoEnConversion({ estado: "Trasladado", conversionId: "no-existe" }),
    ).resolves.toBeUndefined();
  });
});

describe("reflejoDeSalidaEnMiembro (B3, conversión → miembro): la decisión pura", () => {
  const salidaPropia: PasoSeguimiento = {
    id: "ps-mudanza", ambito: "mision", nombre: "Se mudó del país", emoji: "✈️",
    orden: 8, fuente: "manual", rol: "salida", creado: "2026-01-01T00:00:00.000Z", version: 1,
  };
  const catalogo = [...PASOS_MISION_DEFECTO, salidaPropia];

  it("Fallecido → «Fallecido» desde cualquier estado; si ya lo está, null", () => {
    expect(reflejoDeSalidaEnMiembro(PS_FALLECIDO, undefined, "Activo")).toBe("Fallecido");
    expect(reflejoDeSalidaEnMiembro(PS_FALLECIDO, undefined, "Trasladado")).toBe("Fallecido");
    expect(reflejoDeSalidaEnMiembro(PS_FALLECIDO, undefined, "Fallecido")).toBeNull();
  });

  it("Traslado → «Trasladado»; si ya lo está, null", () => {
    expect(reflejoDeSalidaEnMiembro(PS_TRASLADO, undefined, "Activo")).toBe("Trasladado");
    expect(reflejoDeSalidaEnMiembro(PS_TRASLADO, undefined, "Inactivo")).toBe("Trasladado");
    expect(reflejoDeSalidaEnMiembro(PS_TRASLADO, undefined, "Trasladado")).toBeNull();
  });

  it("Apartado → «Inactivo» SOLO desde Activo (no pisa Disciplinado ni Trasladado)", () => {
    expect(reflejoDeSalidaEnMiembro(PS_APARTADO, undefined, "Activo")).toBe("Inactivo");
    expect(reflejoDeSalidaEnMiembro(PS_APARTADO, undefined, "Disciplinado")).toBeNull();
    expect(reflejoDeSalidaEnMiembro(PS_APARTADO, undefined, "Trasladado")).toBeNull();
    // La etiqueta legada canonicaliza igual que el id.
    expect(reflejoDeSalidaEnMiembro("Apartado", undefined, "Activo")).toBe("Inactivo");
  });

  it("salida PERSONALIZADA → «Inactivo» con la misma guarda que Apartado (reflejo genérico)", () => {
    expect(reflejoDeSalidaEnMiembro("ps-mudanza", catalogo, "Activo")).toBe("Inactivo");
    expect(reflejoDeSalidaEnMiembro("ps-mudanza", catalogo, "Inactivo")).toBeNull();
    expect(reflejoDeSalidaEnMiembro("ps-mudanza", catalogo, "Trasladado")).toBeNull();
    // Sin el catálogo que la define, la salida propia es desconocida: null.
    expect(reflejoDeSalidaEnMiembro("ps-mudanza", undefined, "Activo")).toBeNull();
  });

  it("camino, gozne e inicio no reflejan nada", () => {
    expect(reflejoDeSalidaEnMiembro(PS_INTEGRADO, undefined, "Activo")).toBeNull();
    expect(reflejoDeSalidaEnMiembro(PS_BAUTIZADO, undefined, "Activo")).toBeNull();
  });
});
