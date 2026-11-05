import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { db } from "../../lib/database";
import { syncMemberFromConversion } from "./syncMember";
import { showToast } from "../../lib/notification";
import type { Conversion, Miembro, Persona } from "../../lib/types";

vi.mock("../../lib/notification", () => ({ showToast: vi.fn() }));

// NOTA P2 (ficha única): la suite se reescribió con el nuevo comportamiento
// que ordena el diseño (§6, P2). La adopción A2 por nombre+teléfono y la
// herencia de campos B1 desaparecieron porque su motivo (dos fichas con la
// misma persona) ya no existe: el miembro nace sobre la MISMA persona, sin
// copiar ningún dato personal. Se conservan A1 (bandera), A4 (fecha real
// de integración) y las guardas de no-duplicación.

const personaBase = (over: Partial<Persona> = {}): Persona => ({
  id: "p-juan",
  nombre: "Juan",
  apellido: "Pérez",
  numeroIdentidad: "85010112345",
  telefono: "5551234",
  email: "",
  direccion: "Calle 1",
  zona: "Norte",
  fechaNacimiento: "",
  profesion: "",
  estadoCivil: "Soltero",
  contactoPreferido: "WhatsApp",
  bautizado: false,
  fechaBautismo: "",
  conyuge: "",
  hijos: "",
  grupoId: null,
  hermanoMayorId: null,
  creado: "2024-01-15T00:00:00.000Z",
  version: 1,
  ...over,
});

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
  estado: "ps-integrado",
  personaId: "p-juan",
  notas: "",
  historial: [],
  creado: "2024-01-15T00:00:00.000Z",
  version: 1,
  ...over,
});

describe("syncMemberFromConversion (P2: proceso miembro sobre la misma persona)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.miembros.clear();
    await db.hitos.clear();
    await db.conversiones.clear();
    await db.personas.clear();
    vi.clearAllMocks();
  });

  it("A1: con la bandera miembroDescartado activa no crea nada", async () => {
    const id = await syncMemberFromConversion(convBase({ miembroDescartado: true }));
    expect(id).toBeNull();
    expect(await db.miembros.count()).toBe(0);
    expect(await db.hitos.count()).toBe(0);
  });

  it("crea el proceso miembro sobre la MISMA persona y SIN copiar datos personales", async () => {
    await db.personas.add(personaBase());
    const id = await syncMemberFromConversion(convBase());
    expect(id).toBeTruthy();
    const m = await db.miembros.get(id!);
    expect(m?.conversionId).toBe("c1");
    expect(m?.personaId).toBe("p-juan");
    expect(m?.estado).toBe("Activo");
    // Ningún campo personal duplicado en el proceso: viven en el núcleo.
    expect(m?.nombre).toBe("");
    expect(m?.apellido).toBe("");
    expect(m?.telefono).toBe("");
    expect(m?.email).toBe("");
    expect(m?.hermanoMayorId).toBeNull();
    expect(await db.miembros.count()).toBe(1);
    expect(await db.personas.count()).toBe(1);
  });

  it("si la persona YA tiene proceso miembro, lo enlaza en vez de duplicarlo (sucesor de A2)", async () => {
    await db.personas.add(personaBase());
    await db.miembros.add({
      id: "m-manual", nombre: "", apellido: "", telefono: "",
      personaId: "p-juan", conversionId: null,
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

  it("un miembro suelto sin personaId NO se adopta aunque coincidan nombre y teléfono", async () => {
    await db.personas.add(personaBase());
    await db.miembros.add({
      id: "m-otro", nombre: "Juan", apellido: "Pérez", telefono: "5551234",
      conversionId: null,
    } as Miembro);
    const id = await syncMemberFromConversion(convBase());
    expect(id).not.toBeNull();
    expect(id).not.toBe("m-otro");
    expect(await db.miembros.count()).toBe(2);
    const creado = await db.miembros.get(id!);
    expect(creado?.conversionId).toBe("c1");
    expect(creado?.personaId).toBe("p-juan");
    // El suelto queda intacto: es un huérfano enlazable desde Personas (P1).
    expect((await db.miembros.get("m-otro"))?.conversionId).toBeNull();
  });

  it("el hito de integración nombra al hermano mayor DESDE la persona (núcleo)", async () => {
    await db.personas.add(personaBase({ id: "p-mentor", nombre: "Pastor", apellido: "López" }));
    await db.personas.add(personaBase({ hermanoMayorId: "p-mentor" }));
    const id = await syncMemberFromConversion(convBase({ lider: "" }));
    const hitos = await db.hitos.where("miembroId").equals(id!).toArray();
    expect(hitos).toHaveLength(1);
    expect(hitos[0].descripcion).toContain("Pastor López");
  });

  it("A4: fechaIngreso e hito usan la fecha de integración del historial, no la de conversión", async () => {
    await db.personas.add(personaBase());
    const id = await syncMemberFromConversion(convBase({
      fecha: "2024-01-15",
      historial: [
        { fecha: "2024-01-15", estado: "ps-nuevo", nota: "Registro inicial" },
        { fecha: "2025-06-20", estado: "ps-integrado", nota: "Se integró" },
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
    await db.personas.add(personaBase());
    const hoy = new Date().toISOString().split("T")[0];
    const id = await syncMemberFromConversion(convBase({ fecha: "2020-03-03", historial: [] }));
    const m = await db.miembros.get(id!);
    expect(m?.fechaIngreso).toBe(hoy);
  });

  it("una conversión que no está en el gozne no crea miembro", async () => {
    const id = await syncMemberFromConversion(convBase({ estado: "ps-discipulado" }));
    expect(id).toBeNull();
    expect(await db.miembros.count()).toBe(0);
  });

  it("si ya existe miembro vinculado por conversionId no crea otro ni enlaza", async () => {
    await db.personas.add(personaBase());
    await db.miembros.add({
      id: "m-vinculado", nombre: "Otro", apellido: "Nombre", telefono: "5551234",
      conversionId: "c1",
    } as Miembro);
    const id = await syncMemberFromConversion(convBase());
    expect(id).toBeNull();
    expect(await db.miembros.count()).toBe(1);
  });

  it("conversión sin personaId: asegura la persona con el id de la conversión y enlaza a ambos", async () => {
    const conv = convBase({ id: "c-sin", personaId: null });
    await db.conversiones.add(conv);
    const id = await syncMemberFromConversion(conv);
    expect(id).toBeTruthy();
    // Regla determinista de la migración (§5.2): la persona hereda el id de
    // la ficha; su núcleo nace de los datos dormidos de la conversión.
    const persona = await db.personas.get("c-sin");
    expect(persona).toBeTruthy();
    expect(persona?.nombre).toBe("Juan");
    expect(persona?.telefono).toBe("5551234");
    // La conversión queda enlazada y el miembro nace sobre esa persona.
    expect((await db.conversiones.get("c-sin"))?.personaId).toBe("c-sin");
    const m = await db.miembros.get(id!);
    expect(m?.personaId).toBe("c-sin");
  });
});
