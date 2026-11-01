import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { camposAPropagar, reflejarFallecimientoEnConversion } from "./propagacion";
import { db } from "./database";
import { today } from "./utils";
import type { Conversion, Miembro } from "./types";

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
  estado: "Integrado",
  notas: "Contactada en campaña",
  historial: [],
  creado: "2026-01-10T00:00:00.000Z",
  version: 1,
};

const miembroBase: Miembro = {
  id: "m1",
  nombre: "Ana",
  apellido: "Pérez",
  telefono: "555-111",
  email: "ana@x.cu",
  direccion: "Calle 1",
  zona: "Norte",
  grupoId: null,
  fechaNacimiento: "",
  fechaIngreso: "2026-02-01",
  estado: "Activo",
  contactoPreferido: "WhatsApp",
  profesion: "Maestra",
  estadoCivil: "Soltero",
  bautizado: false,
  fechaBautismo: "",
  conyuge: "",
  hijos: "",
  hermanoMayorId: null,
  conversionId: "c1",
  notas: "Notas pastorales del miembro",
  creado: "2026-02-01T00:00:00.000Z",
  actualizado: "2026-02-01T00:00:00.000Z",
  version: 1,
};

describe("Propagación Conversión → Miembro «sin pisar» (B2)", () => {
  it("campo cambiado en la conversión e intacto en el miembro → se propaga", () => {
    const despues = { ...convBase, telefono: "555-222", zona: "Sur" };
    const cambios = camposAPropagar(convBase, despues, miembroBase);
    expect(cambios).toEqual({ telefono: "555-222", zona: "Sur" });
  });

  it("campo editado a mano en el miembro → NO se toca aunque la conversión cambie", () => {
    const miembroEditado = { ...miembroBase, telefono: "555-999" };
    const despues = { ...convBase, telefono: "555-222" };
    const cambios = camposAPropagar(convBase, despues, miembroEditado);
    expect(cambios).toEqual({});
  });

  it("campo sin cambio en la conversión → no se incluye, aunque el miembro difiera", () => {
    const miembroDistinto = { ...miembroBase, email: "otro@x.cu" };
    const despues = { ...convBase, telefono: "555-222" }; // email no cambia
    const cambios = camposAPropagar(convBase, despues, miembroDistinto);
    expect(cambios).toEqual({ telefono: "555-222" });
    expect(cambios).not.toHaveProperty("email");
  });

  it("las notas nunca se propagan, ni siquiera intactas y cambiadas", () => {
    const miembroConNotasViejas = { ...miembroBase, notas: "Contactada en campaña" };
    const despues = { ...convBase, notas: "Nota nueva de la conversión" };
    const cambios = camposAPropagar(convBase, despues, miembroConNotasViejas);
    expect(cambios).toEqual({});
    expect(cambios).not.toHaveProperty("notas");
  });

  it("sin cambios en la conversión → objeto vacío", () => {
    expect(camposAPropagar(convBase, { ...convBase }, miembroBase)).toEqual({});
  });

  it("grupoId: vacío en conversión y null en miembro cuentan como lo mismo", () => {
    const despues = { ...convBase, grupoId: "g7" };
    const cambios = camposAPropagar(convBase, despues, miembroBase);
    expect(cambios).toEqual({ grupoId: "g7" });
    // y al quitar el grupo, el miembro recibe null (no cadena vacía)
    const antes = { ...convBase, grupoId: "g7" };
    const miembroConGrupo = { ...miembroBase, grupoId: "g7" };
    expect(camposAPropagar(antes, convBase, miembroConGrupo)).toEqual({ grupoId: null });
  });

  it("bautismo: cambio booleano y su fecha se propagan juntos", () => {
    const despues = { ...convBase, bautizado: true, fechaBautismo: "2026-03-01" };
    const cambios = camposAPropagar(convBase, despues, miembroBase);
    expect(cambios).toEqual({ bautizado: true, fechaBautismo: "2026-03-01" });
  });
});

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
    expect(conv?.estado).toBe("Fallecido");
    expect(conv?.historial).toEqual([
      { fecha: today(), estado: "Fallecido", nota: "Marcado fallecido desde Miembros" },
    ]);
  });

  it("conserva el historial previo y agrega la entrada al final", async () => {
    const previa = { fecha: "2025-05-01", estado: "Integrado", nota: "Integración" };
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
    expect(conv?.estado).toBe("Integrado");
    expect(conv?.historial).toEqual([]);
  });

  it("conversión ya Fallecido → no duplica la entrada del historial", async () => {
    await db.conversiones.add({ ...convBase, estado: "Fallecido" });
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
