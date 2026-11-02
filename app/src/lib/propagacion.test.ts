import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { reflejarFallecimientoEnConversion } from "./propagacion";
import { db } from "./database";
import { today } from "./utils";
import type { Conversion } from "./types";

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
  estado: "Integrado",
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
