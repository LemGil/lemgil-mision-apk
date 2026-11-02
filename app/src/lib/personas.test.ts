import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db } from "./database";
import { agruparEnPersonas, ejecutarMigracionPersonas } from "./personas";
import type { Beneficiario, Colaborador, Conversion, Diezmador, Estudiante, Grupo, Miembro } from "./types";

const miembroBase = (over: Partial<Miembro> = {}): Miembro => ({
  id: "m1", nombre: "María", apellido: "González", telefono: "5551234",
  email: "maria@correo.com", direccion: "Calle 1", zona: "Norte", grupoId: "g1",
  fechaNacimiento: "1990-05-01", fechaIngreso: "2024-02-01", estado: "Activo",
  contactoPreferido: "WhatsApp", profesion: "Maestra", estadoCivil: "Casado",
  bautizado: true, fechaBautismo: "2023-12-01", conyuge: "José", hijos: "2",
  hermanoMayorId: null, conversionId: null, notas: "notas del miembro",
  creado: "2024-01-01T00:00:00.000Z", actualizado: "2024-01-01T00:00:00.000Z",
  version: 1, ...over,
});

const convBase = (over: Partial<Conversion> = {}): Conversion => ({
  id: "c1", nombre: "María", apellido: "González", telefono: "5551234",
  edad: "34", direccion: "Calle 1", familia: "", fecha: "2024-01-15",
  zona: "Norte", lider: "", grupoId: "", hermanoMayorId: null, email: "",
  profesion: "", bautizado: false, fechaBautismo: "", conyuge: "", hijos: "",
  estado: "Integrado", notas: "", historial: [], creado: "2024-01-15T00:00:00.000Z",
  version: 1, ...over,
});

const estBase = (over: Partial<Estudiante> = {}): Estudiante => ({
  id: "e1", nombre: "María", apellido: "González", telefono: "5551234",
  edad: "34", cursoId: "cur1", fecha: "2024-03-01", estado: "Activo", notas: "",
  creado: "2024-03-01T00:00:00.000Z",
  zona: "Norte", grupoId: null, hermanoMayorId: null, email: "", direccion: "",
  profesion: "", bautizado: false, fechaBautismo: "", conyuge: "", hijos: "",
  version: 1, ...over,
});

const diezmBase = (over: Partial<Diezmador> = {}): Diezmador => ({
  id: "d1", nombre: "María", apellido: "González", telefono: "5551234",
  email: "", fechaIngreso: "2024-02-01", estado: "Activo", zona: "Norte",
  grupo: "", planDiezmo: 100, notas: "", creado: "2024-02-01T00:00:00.000Z",
  version: 1, ...over,
});

const benefBase = (over: Partial<Beneficiario> = {}): Beneficiario => ({
  id: "b1", nombre: "María", apellido: "González", telefono: "5551234",
  direccion: "Calle 1", zona: "Norte", familia: 4, estado: "Activo", notas: "",
  creado: "2024-04-01T00:00:00.000Z", tipo: "Persona",
  version: 1, ...over,
});

describe("Ficha única P0 — migración de personas", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await Promise.all([
      db.personas.clear(), db.miembros.clear(), db.conversiones.clear(),
      db.estudiantes.clear(), db.dadores.clear(), db.beneficiarios.clear(),
      db.colaboradores.clear(), db.miembrosComun.clear(), db.grupos.clear(),
      db.syncQueue.clear(),
    ]);
  });

  it("(a) la misma persona en conversión+miembro+estudiante+diezmo+beneficio → UNA persona con el id del miembro", async () => {
    await db.miembros.add(miembroBase());
    await db.conversiones.add(convBase());
    await db.estudiantes.add(estBase());
    await db.dadores.add(diezmBase());
    await db.beneficiarios.add(benefBase());

    const r = await ejecutarMigracionPersonas();
    expect(r.personasCreadas).toBe(1);
    expect(r.procesosEnlazados).toBe(5);

    const personas = await db.personas.toArray();
    expect(personas).toHaveLength(1);
    expect(personas[0].id).toBe("m1"); // prioridad: el miembro aporta el id
    // El núcleo sale de la ficha prioritaria y se completa sin pisar:
    expect(personas[0].nombre).toBe("María");
    expect(personas[0].email).toBe("maria@correo.com");
    expect(personas[0].fechaNacimiento).toBe("1990-05-01");
    expect(personas[0].bautizado).toBe(true);
    expect(personas[0].grupoId).toBe("g1");

    expect((await db.miembros.get("m1"))?.personaId).toBe("m1");
    expect((await db.conversiones.get("c1"))?.personaId).toBe("m1");
    expect((await db.estudiantes.get("e1"))?.personaId).toBe("m1");
    expect((await db.dadores.get("d1"))?.personaId).toBe("m1");
    expect((await db.beneficiarios.get("b1"))?.personaId).toBe("m1");

    // La persona nueva se encola para subir (la «ola» de la migración).
    const outbox = await db.syncQueue.toArray();
    expect(outbox.some((e) => e.table === "personas" && e.recordId === "m1")).toBe(true);
  });

  it("(a2) el vínculo conversionId une aunque el teléfono haya cambiado entre fichas", async () => {
    await db.miembros.add(miembroBase({ telefono: "111", conversionId: "c1" }));
    await db.conversiones.add(convBase({ telefono: "222" }));
    await db.estudiantes.add(estBase({ id: "e9", telefono: "999" }));

    const r = await ejecutarMigracionPersonas();
    expect(r.personasCreadas).toBe(2); // la pareja vinculada + el estudiante suelto
    expect((await db.miembros.get("m1"))?.personaId).toBe("m1");
    expect((await db.conversiones.get("c1"))?.personaId).toBe("m1");
    expect((await db.estudiantes.get("e9"))?.personaId).toBe("e9");
    // Conflicto de teléfonos: gana la ficha prioritaria (el miembro).
    expect((await db.personas.get("m1"))?.telefono).toBe("111");
  });

  it("(b) mismo nombre pero teléfonos distintos o ausentes → NO se unen", async () => {
    await db.miembros.add(miembroBase({ id: "m1", telefono: "111" }));
    await db.miembros.add(miembroBase({ id: "m2", telefono: "222" }));
    await db.conversiones.add(convBase({ id: "c9", telefono: "" }));

    const r = await ejecutarMigracionPersonas();
    expect(r.personasCreadas).toBe(3);
    expect((await db.miembros.get("m1"))?.personaId).toBe("m1");
    expect((await db.miembros.get("m2"))?.personaId).toBe("m2");
    expect((await db.conversiones.get("c9"))?.personaId).toBe("c9");
  });

  it("(c) aditividad: ninguna ficha original se borra ni pierde campos", async () => {
    await db.miembros.add(miembroBase());
    await db.conversiones.add(convBase({ historial: [{ fecha: "2024-01-15", estado: "Nuevo", nota: "inicio" }] }));
    await db.estudiantes.add(estBase());

    await ejecutarMigracionPersonas();

    expect(await db.miembros.count()).toBe(1);
    expect(await db.conversiones.count()).toBe(1);
    expect(await db.estudiantes.count()).toBe(1);
    const c = await db.conversiones.get("c1");
    expect(c?.nombre).toBe("María");
    expect(c?.telefono).toBe("5551234");
    expect(c?.estado).toBe("Integrado");
    expect(c?.historial).toHaveLength(1);
    const m = await db.miembros.get("m1");
    expect(m?.notas).toBe("notas del miembro");
    expect(m?.fechaIngreso).toBe("2024-02-01");
  });

  it("(d) idempotencia: la segunda corrida no crea ni enlaza nada nuevo", async () => {
    await db.miembros.add(miembroBase());
    await db.conversiones.add(convBase());

    const r1 = await ejecutarMigracionPersonas();
    expect(r1.personasCreadas).toBe(1);
    const r2 = await ejecutarMigracionPersonas();
    expect(r2).toEqual({ personasCreadas: 0, procesosEnlazados: 0 });
    expect(await db.personas.count()).toBe(1);
    expect((await db.conversiones.get("c1"))?.personaId).toBe("m1");
  });

  it("(e) convergencia: dos bases con los mismos datos producen los mismos ids de persona", () => {
    const datos = () => ({
      miembros: [miembroBase()],
      conversiones: [convBase()],
      estudiantes: [estBase()],
      dadores: [diezmBase()],
      beneficiarios: [benefBase()],
    });
    const ahora = "2026-01-01T00:00:00.000Z";
    const g1 = agruparEnPersonas(datos(), [], new Set(), ahora);
    const g2 = agruparEnPersonas(datos(), [], new Set(), ahora);
    expect(g1.map((g) => g.persona.id)).toEqual(g2.map((g) => g.persona.id));
    expect(g1.map((g) => g.persona)).toEqual(g2.map((g) => g.persona));
    expect(g1).toHaveLength(1);
    expect(g1[0].persona.id).toBe("m1");
  });

  it("(f) colaboradores y miembrosComun quedan intactos y fuera de la unificación", async () => {
    const colab = {
      id: "col1", nombre: "María", apellido: "González", telefono: "5551234",
      email: "", estado: "Activo", tipo: "Persona", planOfrendaTipo: "",
      planOfrendaMonto: 0, notas: "", creado: "2024-01-01T00:00:00.000Z", version: 1,
    } as unknown as Colaborador;
    await db.colaboradores.add(colab);
    await db.miembrosComun.add({ ...colab, id: "mc1" });
    await db.miembros.add(miembroBase());

    await ejecutarMigracionPersonas();

    expect(await db.personas.count()).toBe(1); // solo la del miembro
    const c = await db.colaboradores.get("col1");
    expect(c).toBeDefined();
    expect((c as unknown as Record<string, unknown>).personaId).toBeUndefined();
    const mc = await db.miembrosComun.get("mc1");
    expect(mc).toBeDefined();
    expect((mc as unknown as Record<string, unknown>).personaId).toBeUndefined();
  });

  it("un beneficiario «Casa de Familia» no se convierte en persona", async () => {
    await db.beneficiarios.add(benefBase({ tipo: "Casa de Familia" }));
    const r = await ejecutarMigracionPersonas();
    expect(r.personasCreadas).toBe(0);
    expect((await db.beneficiarios.get("b1"))?.personaId).toBeUndefined();
  });

  it("el grupo texto del diezmador sirve de pista si coincide con un grupo existente", async () => {
    await db.grupos.add({ id: "g-vida", nombre: "Grupo Vida" } as Grupo);
    await db.dadores.add(diezmBase({ grupo: "grupo vida" }));
    await ejecutarMigracionPersonas();
    const p = await db.personas.get("d1");
    expect(p?.grupoId).toBe("g-vida");
  });

  it("(P0.1-a) mismo Nº de Identidad con teléfonos DISTINTOS → UNA sola persona", async () => {
    // El carné manda sobre el teléfono: se compara solo por dígitos.
    await db.miembros.add(miembroBase({ numeroIdentidad: "85010112345", telefono: "111" }));
    await db.conversiones.add(convBase({ numeroIdentidad: "850 101 12345", telefono: "222" }));

    const r = await ejecutarMigracionPersonas();
    expect(r.personasCreadas).toBe(1);
    expect((await db.miembros.get("m1"))?.personaId).toBe("m1");
    expect((await db.conversiones.get("c1"))?.personaId).toBe("m1");
    expect((await db.personas.get("m1"))?.numeroIdentidad).toBe("85010112345");
  });

  it("(P0.1-b) sin Nº de Identidad en ninguna ficha, el comportamiento es el de siempre (teléfono)", async () => {
    // Los fixtures no traen numeroIdentidad: la pareja con el mismo teléfono
    // se une; la ficha con el mismo nombre y otro teléfono queda aparte.
    await db.miembros.add(miembroBase());
    await db.conversiones.add(convBase());
    await db.estudiantes.add(estBase({ id: "e9", telefono: "999" }));

    const r = await ejecutarMigracionPersonas();
    expect(r.personasCreadas).toBe(2);
    expect((await db.conversiones.get("c1"))?.personaId).toBe("m1");
    expect((await db.estudiantes.get("e9"))?.personaId).toBe("e9");
    expect((await db.personas.get("m1"))?.numeroIdentidad).toBe("");
  });

  it("(P0.1-c) la persona hereda el carné de la ficha que lo trae, aunque no sea la prioritaria", async () => {
    // El miembro (prioritario) no tiene carné; la conversión sí. Se unen por
    // teléfono y el núcleo toma el carné de la conversión.
    await db.miembros.add(miembroBase());
    await db.conversiones.add(convBase({ numeroIdentidad: "90020254321" }));

    const r = await ejecutarMigracionPersonas();
    expect(r.personasCreadas).toBe(1);
    const p = await db.personas.get("m1");
    expect(p?.numeroIdentidad).toBe("90020254321");
  });

  it("(P0.1-d) carnés distintos con el mismo teléfono → unen por teléfono y gana el carné prioritario", async () => {
    await db.miembros.add(miembroBase({ numeroIdentidad: "11111111111" }));
    await db.conversiones.add(convBase({ numeroIdentidad: "22222222222" }));

    const r = await ejecutarMigracionPersonas();
    expect(r.personasCreadas).toBe(1); // el respaldo telefónico sigue uniendo
    const p = await db.personas.get("m1");
    expect(p?.numeroIdentidad).toBe("11111111111"); // gana el del miembro (prioridad)
    expect((await db.conversiones.get("c1"))?.personaId).toBe("m1");
  });
});
