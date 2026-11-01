import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { db } from "../../lib/database";
import { syncMemberFromConversion } from "./syncMember";
import { showToast } from "../../lib/notification";
import type { Conversion, Miembro } from "../../lib/types";

vi.mock("../../lib/notification", () => ({ showToast: vi.fn() }));

const convBase = (over: Partial<Conversion> = {}): Conversion => ({
  id: "c1",
  nombre: "Juan",
  apellido: "Pérez",
  telefono: "5551234",
  edad: "30",
  direccion: "Calle 1",
  familia: "No",
  fecha: "2024-01-15",
  zona: "Norte",
  lider: "Pastor",
  grupoId: "",
  hermanoMayorId: null,
  email: "",
  profesion: "",
  bautizado: false,
  fechaBautismo: "",
  conyuge: "",
  hijos: "",
  estado: "Integrado",
  notas: "",
  historial: [],
  creado: "2024-01-15T00:00:00.000Z",
  version: 1,
  ...over,
});

describe("syncMemberFromConversion (Fase A: A1, A2, A4 + B1)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.miembros.clear();
    await db.hitos.clear();
    await db.conversiones.clear();
    vi.clearAllMocks();
  });

  it("A1: con la bandera miembroDescartado activa no crea nada", async () => {
    const id = await syncMemberFromConversion(convBase({ miembroDescartado: true }));
    expect(id).toBeNull();
    expect(await db.miembros.count()).toBe(0);
    expect(await db.hitos.count()).toBe(0);
  });

  it("A2: adopta el miembro manual coincidente en vez de duplicar", async () => {
    await db.miembros.add({
      id: "m-manual", nombre: "Juan", apellido: "Pérez", telefono: "5551234",
      conversionId: null,
    } as Miembro);
    const id = await syncMemberFromConversion(convBase());
    expect(id).toBe("m-manual");
    expect(await db.miembros.count()).toBe(1);
    const m = await db.miembros.get("m-manual");
    expect(m?.conversionId).toBe("c1");
    const hitos = await db.hitos.where("miembroId").equals("m-manual").toArray();
    expect(hitos).toHaveLength(1);
    expect(hitos[0].tipo).toBe("Integración");
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("se vinculó con su miembro ya existente"), "info");
  });

  it("A2: no adopta si el teléfono difiere o está vacío", async () => {
    await db.miembros.add({
      id: "m-otro", nombre: "Juan", apellido: "Pérez", telefono: "999",
      conversionId: null,
    } as Miembro);
    const id = await syncMemberFromConversion(convBase());
    expect(id).not.toBeNull();
    expect(id).not.toBe("m-otro");
    expect(await db.miembros.count()).toBe(2);
    const creado = await db.miembros.get(id!);
    expect(creado?.conversionId).toBe("c1");
  });

  it("sin coincidencia crea el miembro vinculado, como siempre", async () => {
    const id = await syncMemberFromConversion(convBase());
    expect(id).toBeTruthy();
    const m = await db.miembros.get(id!);
    expect(m?.conversionId).toBe("c1");
    expect(m?.estado).toBe("Activo");
    expect(await db.miembros.count()).toBe(1);
  });

  it("B1: el miembro hereda el hermanoMayorId de la conversión", async () => {
    const id = await syncMemberFromConversion(convBase({ hermanoMayorId: "m-lider" }));
    const m = await db.miembros.get(id!);
    expect(m?.hermanoMayorId).toBe("m-lider");
  });

  it("A4: fechaIngreso e hito usan la fecha de integración del historial, no la de conversión", async () => {
    const id = await syncMemberFromConversion(convBase({
      fecha: "2024-01-15",
      historial: [
        { fecha: "2024-01-15", estado: "Nuevo", nota: "Registro inicial" },
        { fecha: "2025-06-20", estado: "Integrado", nota: "Se integró" },
      ],
    }));
    const m = await db.miembros.get(id!);
    expect(m?.fechaIngreso).toBe("2025-06-20");
    const hitos = await db.hitos.where("miembroId").equals(id!).toArray();
    expect(hitos).toHaveLength(1);
    expect(hitos[0].fecha).toBe("2025-06-20");
    expect(hitos[0].tipo).toBe("Integración");
  });

  it("A4: sin entrada de integración en el historial, el ingreso es hoy", async () => {
    const hoy = new Date().toISOString().split("T")[0];
    const id = await syncMemberFromConversion(convBase({ fecha: "2020-03-03", historial: [] }));
    const m = await db.miembros.get(id!);
    expect(m?.fechaIngreso).toBe(hoy);
  });

  it("una conversión que no está Integrado no crea miembro", async () => {
    const id = await syncMemberFromConversion(convBase({ estado: "Discipulado" }));
    expect(id).toBeNull();
    expect(await db.miembros.count()).toBe(0);
  });

  it("si ya existe miembro vinculado no crea otro ni adopta", async () => {
    await db.miembros.add({
      id: "m-vinculado", nombre: "Otro", apellido: "Nombre", telefono: "5551234",
      conversionId: "c1",
    } as Miembro);
    const id = await syncMemberFromConversion(convBase());
    expect(id).toBeNull();
    expect(await db.miembros.count()).toBe(1);
  });
});
