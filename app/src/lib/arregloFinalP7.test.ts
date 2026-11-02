import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import Dexie from "dexie";
import { db } from "./database";
import { asegurarPersonasDeDiezmadores } from "./personas";
import { importRecords } from "./csvImport";
import { evangelismoConDatos, mapaPersonas } from "./personaDatos";
import { plegarMiembrosComun, rescatarMiembrosComunEnUpgrade } from "./rescateMiembrosComun";
import { datosEvangelismoParaGuardar, resolverEquipoAlEditar } from "../pages/mision-biblica/evangelismoForm";
import { createBaseRecord } from "./utils/recordHelpers";
import type { Colaborador, Diezmador, EvangelismoCrudo, Persona } from "./types";

// ════════════════════════════════════════════════════════════════════
// P7 — ARREGLO FINAL de la ficha única (las tres obras que P6 dejó
// documentadas): (A) ningún diezmador sin persona y sus campos
// personales fuera del tipo; (B) los textos lider/participantes del
// evangelismo fuera del tipo, todo resuelto desde las personas y los
// nombres sin ficha en campos propios; (C) la tabla fantasma
// miembrosComun retirada con rescate previo a colaboradores.
// ════════════════════════════════════════════════════════════════════

type DiezmadorCrudo = Diezmador & {
  nombre?: string; apellido?: string; telefono?: string; email?: string;
  zona?: string; grupo?: string; numeroIdentidad?: string;
};

const datosPersona = (over: Partial<Persona> = {}): Omit<Persona, "id" | "creado" | "version"> => ({
  nombre: "María", apellido: "Gómez", numeroIdentidad: "90020254321",
  telefono: "5551111", email: "maria@ejemplo.com", direccion: "Calle 2",
  zona: "Sur", fechaNacimiento: "1995-03-10", profesion: "Maestra",
  estadoCivil: "Casado", contactoPreferido: "WhatsApp", bautizado: true,
  fechaBautismo: "2023-04-01", conyuge: "Pedro", hijos: "1 hija",
  grupoId: null, hermanoMayorId: null, ...over,
});

const diezmadorViejo = (over: Partial<DiezmadorCrudo> = {}): DiezmadorCrudo => ({
  id: "dz-1", nombre: "Rosa", apellido: "Díaz", telefono: "5552222",
  email: "rosa@ejemplo.com", fechaIngreso: "2023-09-01", estado: "Activo",
  zona: "Este", grupo: "Grupo Norte", numeroIdentidad: "83050511111",
  planDiezmo: 50, notas: "", personaId: null, creado: "2023-09-01",
  version: 1, ...over,
});

describe("P7-A · pase de aseguramiento de diezmadores", () => {
  beforeAll(async () => { await db.open(); });
  beforeEach(async () => {
    await db.personas.clear();
    await db.dadores.clear();
    await db.grupos.clear();
  });

  it("el diezmador sin persona la recibe con SU id y nace de sus datos dormidos (grupo texto = pista)", async () => {
    await db.grupos.add({ id: "g-norte", nombre: "Grupo Norte", zona: "Norte", lider: "", dia: "Sábado", hora: "18:00", capacidad: "15", lugar: "", miembros: 0, planOfrendasMensual: 0, version: 1 });
    await db.dadores.add(diezmadorViejo());

    const enlazados = await asegurarPersonasDeDiezmadores();
    expect(enlazados).toBe(1);

    const persona = await db.personas.get("dz-1");
    expect(persona).toBeTruthy();
    expect(persona!.nombre).toBe("Rosa");
    expect(persona!.apellido).toBe("Díaz");
    expect(persona!.telefono).toBe("5552222");
    expect(persona!.email).toBe("rosa@ejemplo.com");
    expect(persona!.numeroIdentidad).toBe("83050511111");
    expect(persona!.zona).toBe("Este");
    expect(persona!.grupoId).toBe("g-norte"); // la pista §5.3.6 resolvió el texto
    expect((await db.dadores.get("dz-1"))?.personaId).toBe("dz-1");
  });

  it("un enlace COLGANDO (personaId a una persona inexistente) también se asegura, sin pisar a nadie", async () => {
    await db.personas.add({ id: "p-otra", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.dadores.add(diezmadorViejo({ personaId: "fantasma-inexistente" }));

    const enlazados = await asegurarPersonasDeDiezmadores();
    expect(enlazados).toBe(1);
    expect((await db.dadores.get("dz-1"))?.personaId).toBe("dz-1");
    expect((await db.personas.get("dz-1"))!.nombre).toBe("Rosa");
    expect(await db.personas.count()).toBe(2); // la otra persona, intacta
  });

  it("es idempotente: el diezmador ya enlazado no se toca y la segunda corrida enlaza 0", async () => {
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.dadores.add({ id: "dz-ok", fechaIngreso: "2024-01-01", estado: "Activo", planDiezmo: 10, notas: "", personaId: "p1", creado: "2024-01-01", version: 1 });
    await db.dadores.add(diezmadorViejo());

    expect(await asegurarPersonasDeDiezmadores()).toBe(1);
    expect(await asegurarPersonasDeDiezmadores()).toBe(0);
    expect(await db.personas.count()).toBe(2);
    expect((await db.dadores.get("dz-ok"))?.personaId).toBe("p1");
  });

  it("la importación CSV de diezmadores les asigna su persona al importar (gancho post-importación)", async () => {
    // Exactamente lo que produce CsvImportButton para la tabla dadores:
    // las columnas personales como campos del registro crudo.
    const registros = [{
      id: "dz-csv-1", nombre: "Luis", apellido: "Pérez", telefono: "555-7777",
      email: "", zona: "Oeste", grupo: "", estado: "Activo", planDiezmo: 25,
      notas: "", creado: "2024-05-01T00:00:00.000Z", version: 1,
    }];
    const res = await importRecords(registros, "dadores");
    expect(res.imported).toBe(1);

    const guardado = await db.dadores.get("dz-csv-1");
    expect(guardado?.personaId).toBe("dz-csv-1"); // ningún importado sin persona
    const persona = await db.personas.get("dz-csv-1");
    expect(persona).toBeTruthy();
    expect(persona!.nombre).toBe("Luis");
    expect(persona!.apellido).toBe("Pérez");
    expect(persona!.telefono).toBe("555-7777");
    expect(persona!.zona).toBe("Oeste");
  });
});

describe("P7-B · evangelismo: todo se resuelve desde las personas", () => {
  beforeAll(async () => { await db.open(); });
  beforeEach(async () => {
    await db.personas.clear();
    await db.evangelismos.clear();
  });

  const personas = (): Persona[] => [
    { id: "p-lider", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona({ nombre: "Juan", apellido: "Líder" }) },
    { id: "p-ayuda", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona({ nombre: "Ana", apellido: "Ayuda", telefono: "5553333" }) },
  ];

  const evBase = (over: Partial<EvangelismoCrudo> = {}): EvangelismoCrudo => ({
    id: "ev-1", tipo: "Campaña en plaza", fecha: "2024-06-01", zona: "Norte",
    contactos: 10, conversiones: 0, notas: "", creado: "2024-06-01T00:00:00.000Z",
    version: 1, ...over,
  });

  it("el líder se resuelve desde la persona del liderId (lo que pintan tabla, filtro y buscador)", () => {
    const mapa = mapaPersonas(personas());
    const v = evangelismoConDatos(evBase({ liderId: "p-lider" }), mapa);
    expect(v.liderNombre).toBe("Juan Líder");
    expect(v.liderEsExterno).toBe(false);
  });

  it("el líder sin ficha se presenta como externo, desde su campo propio", () => {
    const mapa = mapaPersonas(personas());
    const v = evangelismoConDatos(evBase({ liderExterno: "Pastor Invitado" }), mapa);
    expect(v.liderNombre).toBe("Pastor Invitado");
    expect(v.liderEsExterno).toBe(true);
  });

  it("registro VIEJO con solo texto dormido: si coincide con una persona es su nombre; si no, líder externo (sin escribir nada)", () => {
    const mapa = mapaPersonas(personas());
    const coincide = evangelismoConDatos(evBase({ lider: "Juan Líder" }), mapa);
    expect(coincide.liderNombre).toBe("Juan Líder");
    expect(coincide.liderEsExterno).toBe(false);

    const noCoincide = evangelismoConDatos(evBase({ lider: "Hermano de Visita" }), mapa);
    expect(noCoincide.liderNombre).toBe("Hermano de Visita");
    expect(noCoincide.liderEsExterno).toBe(true);

    // La vista nace limpia: los textos dormidos no viajan en ella.
    expect("lider" in coincide).toBe(false);
    expect("participantes" in coincide).toBe(false);
  });

  it("el equipo = ids + externos, y los externos se cuentan como antes sumaba la foto", () => {
    const mapa = mapaPersonas(personas());
    const v = evangelismoConDatos(evBase({
      liderId: "p-lider",
      participanteIds: ["p-ayuda"],
      participantesExternos: ["Vecino Curioso", "Prima de Ana"],
    }), mapa);
    expect(v.equipoNombres).toEqual(["Ana Ayuda", "Vecino Curioso", "Prima de Ana"]);
    expect(v.equipoCount).toBe(3);
  });

  it("registro VIEJO: la foto `participantes` no duplica a los que ya van por id y conserva a los sin persona", () => {
    const mapa = mapaPersonas(personas());
    const v = evangelismoConDatos(evBase({
      participanteIds: ["p-ayuda"],
      participantes: ["Ana Ayuda", "Vecino Curioso"], // la foto vieja mezclaba ids y respaldo
    }), mapa);
    expect(v.equipoNombres).toEqual(["Ana Ayuda", "Vecino Curioso"]);
    expect(v.equipoCount).toBe(2);
  });

  it("al editar un registro viejo, líder y equipo se reparten entre ids y externos sin perder nombres", () => {
    const resuelto = resolverEquipoAlEditar(evBase({
      lider: "Juan Líder",
      participantes: ["Ana Ayuda", "Vecino Curioso"],
    }), personas());
    expect(resuelto.liderId).toBe("p-lider"); // coincidió: se sana al guardar
    expect(resuelto.liderExterno).toBe("");
    expect(resuelto.participanteIds).toEqual(["p-ayuda"]);
    expect(resuelto.participantesExternos).toEqual(["Vecino Curioso"]);

    const sinPersona = resolverEquipoAlEditar(evBase({ lider: "Hermano de Visita" }), personas());
    expect(sinPersona.liderId).toBe("");
    expect(sinPersona.liderExterno).toBe("Hermano de Visita"); // no se pierde ni se fabrica persona
  });

  it("saveEvang ya no escribe lider/participantes: el registro guardado ni contiene las claves", async () => {
    const datos = datosEvangelismoParaGuardar({
      fecha: "2024-06-01", tipo: "Campaña en plaza", zona: "Norte",
      liderId: "p-lider", liderExterno: "Debe Limpiarse",
      participanteIds: ["p-ayuda"], participantesExternos: [" Vecino Curioso ", ""],
      contactos: 12, notas: "  Buena jornada ",
    });
    expect("lider" in datos).toBe(false);
    expect("participantes" in datos).toBe(false);
    expect(datos.liderExterno).toBe(""); // con líder por id, el externo no manda
    expect(datos.participantesExternos).toEqual(["Vecino Curioso"]); // recortados y sin vacíos

    await db.evangelismos.add(createBaseRecord({ id: "ev-guardado", ...datos, conversiones: 0, creado: "2024-06-01T00:00:00.000Z" }));
    const guardado = (await db.evangelismos.get("ev-guardado")) as unknown as Record<string, unknown>;
    expect(guardado).toBeTruthy();
    expect("lider" in guardado).toBe(false);
    expect("participantes" in guardado).toBe(false);
    expect(guardado.liderId).toBe("p-lider");
    expect(guardado.participanteIds).toEqual(["p-ayuda"]);
    expect(guardado.participantesExternos).toEqual(["Vecino Curioso"]);
  });
});

describe("P7-C · rescate y retirada de miembrosComun", () => {
  const colab = (over: Partial<Colaborador> = {}): Colaborador => ({
    id: "c1", nombre: "Ana", apellido: "Ruiz", telefono: "5551234", email: "",
    estado: "Activo", tipo: "Persona", planOfrendaTipo: "", planOfrendaMonto: 0,
    notas: "", creado: "2024-01-01T00:00:00.000Z", version: 1, ...over,
  } as Colaborador);

  it("plegarMiembrosComun: dedupe por clave de persona, conserva el id y resuelve colisiones", () => {
    let n = 0;
    const generarId = () => `nuevo-${++n}`;
    const existentes = [colab({ id: "c1" }), colab({ id: "c2", nombre: "Pedro", apellido: "Sosa", telefono: "5559999" })];
    const fantasma = [
      colab({ id: "m1", telefono: "555 1234" }), // misma Ana, teléfono con otro formato → duplicada
      colab({ id: "m2", nombre: "Luis", apellido: "Mena", telefono: "5550000" }), // nuevo: conserva su id
      colab({ id: "c2", nombre: "Sara", apellido: "León", telefono: "5554444" }), // id ocupado por Pedro → id nuevo
      colab({ id: "m3", nombre: "Luis", apellido: "Mena", telefono: "5550000" }), // duplicado dentro del propio lote
    ];
    const { aInsertar, duplicados } = plegarMiembrosComun(fantasma, existentes, generarId);
    expect(duplicados).toBe(2);
    expect(aInsertar).toHaveLength(2);
    expect(aInsertar[0].id).toBe("m2");
    expect(aInsertar[0].nombre).toBe("Luis");
    expect(aInsertar[1].id).toBe("nuevo-1"); // colisión resuelta, la fila NO se pierde
    expect(aInsertar[1].nombre).toBe("Sara");
  });

  it("el upgrade de la v23 pliega las filas en colaboradores, retira la tabla y encola las rescatadas", async () => {
    const NOMBRE = "P7UpgradeProbeDB";
    const previa = new Dexie(NOMBRE);
    previa.version(1).stores({
      miembrosComun: "id, nombre, apellido, estado, creado",
      colaboradores: "id, nombre, apellido, estado, creado",
      syncQueue: "++id, table, [table+recordId]",
    });
    await previa.open();
    await previa.table("colaboradores").add(colab({ id: "c1" }));
    await previa.table("miembrosComun").bulkAdd([
      colab({ id: "m1", telefono: "555 1234" }), // duplica a la colaboradora c1
      colab({ id: "m2", nombre: "Luis", apellido: "Mena", telefono: "5550000" }), // rescatable
    ]);
    previa.close();

    // La misma declaración que la app en su v23: la tabla sale del
    // esquema y el upgrade — que aún puede leerla — hace el rescate con
    // la función real de database.ts.
    const nueva = new Dexie(NOMBRE);
    nueva.version(1).stores({
      miembrosComun: "id, nombre, apellido, estado, creado",
      colaboradores: "id, nombre, apellido, estado, creado",
      syncQueue: "++id, table, [table+recordId]",
    });
    nueva.version(2).stores({ miembrosComun: null }).upgrade(async (tx) => {
      await rescatarMiembrosComunEnUpgrade(tx);
    });
    await nueva.open();

    const colaboradores = await nueva.table("colaboradores").toArray();
    expect(colaboradores.map((c: Colaborador) => c.id).sort()).toEqual(["c1", "m2"]); // sin duplicar a Ana
    expect(nueva.tables.map((t) => t.name)).not.toContain("miembrosComun"); // tabla retirada
    const cola = await nueva.table("syncQueue").toArray();
    expect(cola).toHaveLength(1);
    expect(cola[0].table).toBe("colaboradores");
    expect(cola[0].recordId).toBe("m2");

    nueva.close();
    await nueva.delete();
  });
});
