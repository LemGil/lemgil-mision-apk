import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db } from "../../lib/database";
import { conversionConDatos, mapaPersonas, miembroConDatos } from "../../lib/personaDatos";
import { conteoConversionesPorEvangelismo } from "../../lib/evangelismoStats";
import { syncMemberFromConversion } from "./syncMember";
import type { Conversion, Persona } from "../../lib/types";

// Estas pruebas reproducen, a nivel de base de datos, EXACTAMENTE lo que
// escribe el alta de conversión de P2 (saveConv): la persona se crea o se
// elige una vez en el núcleo y el proceso nace con los personales vacíos,
// su personaId y —cuando viene del botón «➕ Registrar conversión»— su
// evangelismoId.

const datosPersona = (over: Partial<Persona> = {}): Omit<Persona, "id" | "creado" | "version"> => ({
  nombre: "Juan",
  apellido: "Pérez",
  numeroIdentidad: "85010112345",
  telefono: "5550001",
  email: "",
  direccion: "Calle 1",
  zona: "Norte",
  fechaNacimiento: "1990-05-01",
  profesion: "",
  estadoCivil: "Soltero",
  contactoPreferido: "WhatsApp",
  bautizado: false,
  fechaBautismo: "",
  conyuge: "",
  hijos: "",
  grupoId: null,
  hermanoMayorId: null,
  ...over,
});

// Lo que guarda saveConv en P2 para una conversión nueva.
const conversionNueva = (over: Partial<Conversion> = {}): Conversion => ({
  id: "conv-nueva",
  nombre: "", apellido: "", telefono: "", edad: "", direccion: "", zona: "",
  lider: "", grupoId: "", hermanoMayorId: null, email: "", profesion: "",
  bautizado: false, fechaBautismo: "", conyuge: "", hijos: "",
  familia: "No",
  fecha: "2024-01-15",
  estado: "ps-nuevo",
  personaId: null,
  evangelismoId: null,
  notas: "",
  historial: [{ fecha: "2024-01-15", estado: "ps-nuevo", nota: "Registro inicial" }],
  creado: "2024-01-15T00:00:00.000Z",
  version: 1,
  ...over,
});

describe("Alta de conversión sobre la ficha única (P2)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.personas.clear();
    await db.conversiones.clear();
    await db.miembros.clear();
    await db.hitos.clear();
    await db.evangelismos.clear();
  });

  it("enlazada a una persona EXISTENTE: no se crea otra persona y la vista pinta sus datos", async () => {
    await db.personas.add({ id: "p-existente", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.conversiones.add(conversionNueva({ personaId: "p-existente" }));

    expect(await db.personas.count()).toBe(1);
    const guardada = await db.conversiones.get("conv-nueva");
    expect(guardada?.personaId).toBe("p-existente");
    expect(guardada?.nombre).toBe(""); // el proceso no duplica los datos

    const map = mapaPersonas(await db.personas.toArray());
    const vista = conversionConDatos(guardada!, map);
    expect(vista.nombre).toBe("Juan");
    expect(vista.telefono).toBe("5550001");
  });

  it("con persona NUEVA: nace una sola ficha y la conversión queda enlazada a ella", async () => {
    await db.personas.add({ id: "p-nueva", creado: "2024-01-15T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.conversiones.add(conversionNueva({ personaId: "p-nueva" }));

    expect(await db.personas.count()).toBe(1);
    const persona = await db.personas.get("p-nueva");
    expect(persona?.numeroIdentidad).toBe("85010112345");
    expect((await db.conversiones.get("conv-nueva"))?.personaId).toBe("p-nueva");
  });

  it("desde un evangelismo: el alta nace enlazada y el conteo derivado la incluye (las no enlazadas, no)", async () => {
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.conversiones.add(conversionNueva({ id: "c-del-evento", personaId: "p1", evangelismoId: "ev1" }));
    await db.conversiones.add(conversionNueva({ id: "c-suelta", personaId: "p1", evangelismoId: null }));

    const conteo = conteoConversionesPorEvangelismo(await db.conversiones.toArray());
    expect(conteo.get("ev1")).toBe(1);
    expect(conteo.get("ev1") ?? 0).not.toBe(2);
  });

  it("historia completa: alta → integración → el miembro comparte la persona y el teléfono se edita una vez", async () => {
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    const conv = conversionNueva({ personaId: "p1", estado: "ps-integrado" });
    await db.conversiones.add(conv);

    const miembroId = await syncMemberFromConversion(conv);
    expect(miembroId).toBeTruthy();
    const miembro = await db.miembros.get(miembroId!);
    expect(miembro?.personaId).toBe("p1");

    // El dueño corrige el teléfono UNA vez, en la ficha de la persona…
    await db.personas.update("p1", { telefono: "5559999" });
    const map = mapaPersonas(await db.personas.toArray());
    // …y ambas páginas lo ven sin ninguna propagación entre procesos.
    expect(conversionConDatos(conv, map).telefono).toBe("5559999");
    expect(miembroConDatos(miembro!, map).telefono).toBe("5559999");
  });
});
