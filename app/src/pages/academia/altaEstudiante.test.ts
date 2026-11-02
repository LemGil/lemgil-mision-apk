import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db } from "../../lib/database";
import { estudianteConDatos, mapaPersonas } from "../../lib/personaDatos";
import { asegurarPersonaDeEstudiante } from "../../lib/personas";
import type { Estudiante, Persona } from "../../lib/types";

// Estas pruebas reproducen, a nivel de base de datos, EXACTAMENTE lo que
// escribe el alta de estudiante de P3 (saveEst): la persona se crea o se
// elige una vez en el núcleo y el proceso nace con los personales vacíos,
// su personaId y SIN origen/origenId (murieron: la persona ES el origen).

const datosPersona = (over: Partial<Persona> = {}): Omit<Persona, "id" | "creado" | "version"> => ({
  nombre: "María",
  apellido: "Gómez",
  numeroIdentidad: "90020254321",
  telefono: "5551111",
  email: "maria@ejemplo.com",
  direccion: "Calle 2",
  zona: "Sur",
  fechaNacimiento: "1995-03-10",
  profesion: "Maestra",
  estadoCivil: "Casado",
  contactoPreferido: "WhatsApp",
  bautizado: true,
  fechaBautismo: "2023-04-01",
  conyuge: "Pedro",
  hijos: "1 hija",
  grupoId: null,
  hermanoMayorId: null,
  ...over,
});

// Lo que guarda saveEst en P3 para un estudiante nuevo: solo el proceso.
const estudianteNuevo = (over: Partial<Estudiante> = {}): Estudiante => ({
  id: "est-nuevo",
  nombre: "", apellido: "", telefono: "", edad: "", email: "", direccion: "", zona: "",
  profesion: "", bautizado: false, fechaBautismo: "", conyuge: "", hijos: "",
  grupoId: null, hermanoMayorId: null,
  cursoId: "curso-1",
  fecha: "2024-02-01",
  estado: "Activo",
  notas: "",
  personaId: null,
  creado: "2024-02-01",
  version: 1,
  ...over,
});

// Una ficha VIEJA (anterior a la ficha única): personales tecleados en la
// propia ficha, origen/origenId vivos y ningún personaId.
// (P6: `origen`/`origenId` ya no existen en el tipo Estudiante; la ficha
// vieja los trae dormidos en la base, así que se siembran como crudo.)
const conDormidos = <T extends object>(r: T, campos: Record<string, unknown>): T => {
  Object.assign(r, campos);
  return r;
};

const estudianteViejo = (over: Partial<Estudiante> = {}): Estudiante => conDormidos({
  id: "est-viejo",
  nombre: "Rosa",
  apellido: "Díaz",
  telefono: "5552222",
  edad: "41",
  email: "rosa@ejemplo.com",
  direccion: "Calle 9",
  zona: "Este",
  profesion: "Doctora",
  bautizado: true,
  fechaBautismo: "2020-06-15",
  conyuge: "",
  hijos: "2 hijos",
  numeroIdentidad: "83050511111",
  grupoId: null,
  hermanoMayorId: null,
  cursoId: "curso-1",
  fecha: "2023-09-01",
  estado: "Activo",
  notas: "Viene de la ficha antigua",
  personaId: null,
  creado: "2023-09-01",
  version: 1,
  ...over,
}, { origen: "miembro", origenId: "m-viejo" });

describe("Alta de estudiante sobre la ficha única (P3)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.personas.clear();
    await db.estudiantes.clear();
    await db.certificados.clear();
  });

  it("enlazado a una persona EXISTENTE: no se crea otra persona y la vista pinta sus datos", async () => {
    await db.personas.add({ id: "p-existente", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.estudiantes.add(estudianteNuevo({ personaId: "p-existente" }));

    expect(await db.personas.count()).toBe(1);
    const guardado = await db.estudiantes.get("est-nuevo");
    expect(guardado?.personaId).toBe("p-existente");
    expect(guardado?.nombre).toBe(""); // el proceso no duplica los datos

    const map = mapaPersonas(await db.personas.toArray());
    const vista = estudianteConDatos(guardado!, map);
    expect(vista.nombre).toBe("María");
    expect(vista.apellido).toBe("Gómez");
    expect(vista.telefono).toBe("5551111");
    expect(vista.zona).toBe("Sur");
  });

  it("con persona NUEVA: nace una sola ficha y el estudiante queda enlazado a ella", async () => {
    // «➕ Nueva persona» del PersonaSelect guarda primero en el núcleo…
    await db.personas.add({ id: "p-nueva", creado: "2024-02-01T00:00:00.000Z", version: 1, ...datosPersona() });
    // …y saveEst guarda el proceso enlazado, sin teclear nada personal.
    await db.estudiantes.add(estudianteNuevo({ personaId: "p-nueva" }));

    expect(await db.personas.count()).toBe(1);
    const persona = await db.personas.get("p-nueva");
    expect(persona?.numeroIdentidad).toBe("90020254321");
    expect((await db.estudiantes.get("est-nuevo"))?.personaId).toBe("p-nueva");
  });

  it("MUERTE de origen/origenId: ninguna escritura nueva los produce", async () => {
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.estudiantes.add(estudianteNuevo({ personaId: "p1" }));

    const guardado = await db.estudiantes.get("est-nuevo");
    expect(guardado).toBeTruthy();
    // P6: las claves ya no existen en el tipo; se mira el registro crudo.
    const crudo = guardado as unknown as Record<string, unknown>;
    expect(crudo.origen).toBeUndefined();
    expect(crudo.origenId).toBeUndefined();
    expect("origen" in guardado!).toBe(false);
    expect("origenId" in guardado!).toBe(false);
  });

  it("la lista y el certificado resuelven el nombre desde el NÚCLEO, no desde la copia dormida", async () => {
    // La persona corrigió su nombre en la ficha única; la ficha vieja del
    // estudiante conserva el nombre anterior, dormido y desactualizado.
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona({ nombre: "María Elena" }) });
    await db.estudiantes.add(estudianteViejo({ id: "est-1", personaId: "p1", nombre: "María", telefono: "5550000" }));
    await db.certificados.add({
      id: "cert-1", estId: "est-1", cursoId: "curso-1", fecha: "2024-05-01",
      calificacion: "Aprobado", observaciones: "", emitido: "2024-05-01", version: 1,
    });

    const map = mapaPersonas(await db.personas.toArray());
    const decorados = (await db.estudiantes.toArray()).map((e) => estudianteConDatos(e, map));

    // La lista (EstudiantesTab pinta e.nombre del decorado):
    expect(decorados[0].nombre).toBe("María Elena");
    expect(decorados[0].telefono).toBe("5551111"); // el teléfono vigente es el del núcleo

    // El certificado (CertificadosTab busca al estudiante de cert.estId y
    // pinta su nombre): sale el nombre del núcleo.
    const cert = await db.certificados.get("cert-1");
    const estDelCert = decorados.find((e) => e.id === cert!.estId);
    expect(estDelCert).toBeTruthy();
    expect(`${estDelCert!.nombre} ${estDelCert!.apellido}`).toBe("María Elena Gómez");
  });

  it("sin persona enlazada (equipo sin actualizar), la lectura tolera y devuelve la ficha tal cual", async () => {
    const viejo = estudianteViejo();
    const map = mapaPersonas([]);
    const vista = estudianteConDatos(viejo, map);
    expect(vista).toBe(viejo);
    expect(vista.nombre).toBe("Rosa");
  });
});

describe("asegurarPersonaDeEstudiante (P3: el viejo sin persona, al editarlo)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.personas.clear();
    await db.estudiantes.clear();
  });

  it("crea la persona con el id del propio estudiante, nacida de sus datos dormidos, y lo enlaza", async () => {
    await db.estudiantes.add(estudianteViejo());

    const personaId = await asegurarPersonaDeEstudiante((await db.estudiantes.get("est-viejo"))!);
    expect(personaId).toBe("est-viejo");

    const persona = await db.personas.get("est-viejo");
    expect(persona).toBeTruthy();
    expect(persona!.nombre).toBe("Rosa");
    expect(persona!.apellido).toBe("Díaz");
    expect(persona!.telefono).toBe("5552222");
    expect(persona!.numeroIdentidad).toBe("83050511111");
    expect(persona!.zona).toBe("Este");

    const enlazado = await db.estudiantes.get("est-viejo");
    expect(enlazado?.personaId).toBe("est-viejo");
    // El enlace no reescribe la historia: su origen dormido queda intacto
    // en la ficha (ya nadie lo lee) y sus datos personales no se borran.
    expect((enlazado as unknown as Record<string, unknown>)?.origen).toBe("miembro");
    expect(enlazado?.nombre).toBe("Rosa");
  });

  it("es idempotente y no pisa una persona ya existente con ese id", async () => {
    await db.estudiantes.add(estudianteViejo());
    await asegurarPersonaDeEstudiante((await db.estudiantes.get("est-viejo"))!);
    await db.personas.update("est-viejo", { telefono: "5559999" });

    const otra = await asegurarPersonaDeEstudiante((await db.estudiantes.get("est-viejo"))!);
    expect(otra).toBe("est-viejo");
    expect(await db.personas.count()).toBe(1);
    expect((await db.personas.get("est-viejo"))!.telefono).toBe("5559999");
  });

  it("un estudiante ya enlazado devuelve su personaId sin crear nada", async () => {
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.estudiantes.add(estudianteNuevo({ personaId: "p1" }));

    const id = await asegurarPersonaDeEstudiante((await db.estudiantes.get("est-nuevo"))!);
    expect(id).toBe("p1");
    expect(await db.personas.count()).toBe(1);
  });
});
