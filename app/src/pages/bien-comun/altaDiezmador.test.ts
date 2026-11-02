import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db } from "../../lib/database";
import { diezmadorConDatos, mapaPersonas } from "../../lib/personaDatos";
import { asegurarPersonaDeDiezmador } from "../../lib/personas";
import type { Diezmador, Grupo, Persona } from "../../lib/types";

// Estas pruebas reproducen, a nivel de base de datos, EXACTAMENTE lo que
// escribe el alta de diezmador de P4 (saveD): la persona se crea o se
// elige una vez en el núcleo y el proceso nace con los personales vacíos
// y su personaId. Murió el «🔍 Buscar en Miembros» que copiaba nombre,
// teléfono, zona y grupo sin guardar el id: la persona ES el origen.

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

// Lo que guarda saveD en P4 para un diezmador nuevo: solo el proceso.
const diezmadorNuevo = (over: Partial<Diezmador> = {}): Diezmador => ({
  id: "dz-nuevo",
  nombre: "", apellido: "", telefono: "", email: "", zona: "", grupo: "",
  fechaIngreso: "2024-02-01",
  estado: "Activo",
  planDiezmo: 100,
  notas: "",
  personaId: null,
  creado: "2024-02-01",
  version: 1,
  ...over,
});

// Una ficha VIEJA (anterior a la ficha única): personales tecleados en la
// propia ficha — traídos por aquel «Buscar en Miembros» o a mano —, el
// grupo como TEXTO y ningún personaId.
const diezmadorViejo = (over: Partial<Diezmador> = {}): Diezmador => ({
  id: "dz-viejo",
  nombre: "Rosa",
  apellido: "Díaz",
  telefono: "5552222",
  email: "rosa@ejemplo.com",
  fechaIngreso: "2023-09-01",
  estado: "Activo",
  zona: "Este",
  grupo: "Grupo Norte",
  numeroIdentidad: "83050511111",
  planDiezmo: 50,
  notas: "Viene de la ficha antigua",
  personaId: null,
  creado: "2023-09-01",
  version: 1,
  ...over,
});

const mapaGrupos = (grupos: Grupo[]) => new Map(grupos.map((g) => [g.id, g]));

describe("Alta de diezmador sobre la ficha única (P4)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.personas.clear();
    await db.dadores.clear();
    await db.grupos.clear();
    await db.aportesComun.clear();
  });

  it("enlazado a una persona EXISTENTE: no se crea otra persona y la vista pinta sus datos", async () => {
    await db.personas.add({ id: "p-existente", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.dadores.add(diezmadorNuevo({ personaId: "p-existente" }));

    expect(await db.personas.count()).toBe(1);
    const guardado = await db.dadores.get("dz-nuevo");
    expect(guardado?.personaId).toBe("p-existente");
    expect(guardado?.nombre).toBe(""); // el proceso no duplica los datos
    expect(guardado?.telefono).toBe("");
    expect(guardado?.grupo).toBe(""); // ni el grupo: sale del núcleo

    const map = mapaPersonas(await db.personas.toArray());
    const vista = diezmadorConDatos(guardado!, map, mapaGrupos([]));
    expect(vista.nombre).toBe("María");
    expect(vista.apellido).toBe("Gómez");
    expect(vista.telefono).toBe("5551111");
    expect(vista.zona).toBe("Sur");
    // Lo del proceso sigue siendo del proceso:
    expect(vista.planDiezmo).toBe(100);
    expect(vista.estado).toBe("Activo");
    expect(vista.fechaIngreso).toBe("2024-02-01");
  });

  it("con persona NUEVA: nace una sola ficha y el diezmador queda enlazado a ella", async () => {
    // «➕ Nueva persona» del PersonaSelect guarda primero en el núcleo…
    await db.personas.add({ id: "p-nueva", creado: "2024-02-01T00:00:00.000Z", version: 1, ...datosPersona() });
    // …y saveD guarda el proceso enlazado, sin teclear nada personal.
    await db.dadores.add(diezmadorNuevo({ personaId: "p-nueva" }));

    expect(await db.personas.count()).toBe(1);
    const persona = await db.personas.get("p-nueva");
    expect(persona?.numeroIdentidad).toBe("90020254321");
    expect((await db.dadores.get("dz-nuevo"))?.personaId).toBe("p-nueva");
  });

  it("las lecturas resuelven nombre y teléfono desde el NÚCLEO, no desde la copia dormida desactualizada", async () => {
    // La persona corrigió su nombre y su teléfono en la ficha única; la
    // ficha vieja del diezmador conserva los anteriores, dormidos.
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona({ nombre: "María Elena" }) });
    await db.dadores.add(diezmadorViejo({ id: "dz-1", personaId: "p1", nombre: "María", telefono: "5550000", email: "viejo@ejemplo.com", zona: "Norte" }));
    await db.aportesComun.add({
      id: "ap-1", diezmadorId: "dz-1", grupoId: null, fecha: "2024-03-05", monto: 100,
      tipo: "Diezmo", metodo: "Efectivo", referencia: "", notas: "General | ", mesCorrespondiente: "2024-03",
      creado: "2024-03-05", version: 1,
    });

    const map = mapaPersonas(await db.personas.toArray());
    const decorados = (await db.dadores.toArray()).map((d) => diezmadorConDatos(d, map, mapaGrupos([])));

    // La tarjeta del directorio (DiezmadoresTab pinta d.nombre del decorado):
    expect(decorados[0].nombre).toBe("María Elena");
    expect(decorados[0].telefono).toBe("5551111"); // el teléfono vigente es el del núcleo
    expect(decorados[0].email).toBe("maria@ejemplo.com");
    expect(decorados[0].zona).toBe("Sur");

    // El aporte histórico resuelve su nombre vía proceso → persona
    // (RegistrosTab busca el diezmador del aporte y pinta su nombre):
    const aporte = await db.aportesComun.get("ap-1");
    const dzDelAporte = decorados.find((d) => d.id === aporte!.diezmadorId);
    expect(dzDelAporte).toBeTruthy();
    expect(`${dzDelAporte!.nombre} ${dzDelAporte!.apellido}`).toBe("María Elena Gómez");
  });

  it("el GRUPO sale del núcleo: se resuelve a nombre desde el grupoId de la persona; el texto dormido no se lee", async () => {
    await db.grupos.add({ id: "g-1", nombre: "Grupo Central", zona: "Centro", lider: "", dia: "Domingo", hora: "10:00", capacidad: "20", lugar: "", miembros: 0, planOfrendasMensual: 0, version: 1 });
    // La persona está en Grupo Central; la ficha vieja dice otro grupo en texto.
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona({ grupoId: "g-1" }) });
    await db.dadores.add(diezmadorViejo({ id: "dz-1", personaId: "p1", grupo: "Grupo Norte" }));
    // Y si la persona no tiene grupo, el texto dormido tampoco resucita:
    await db.personas.add({ id: "p2", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona({ nombre: "Ana", grupoId: null }) });
    await db.dadores.add(diezmadorViejo({ id: "dz-2", personaId: "p2", grupo: "Grupo Sur" }));

    const map = mapaPersonas(await db.personas.toArray());
    const gMap = mapaGrupos(await db.grupos.toArray());
    const v1 = diezmadorConDatos((await db.dadores.get("dz-1"))!, map, gMap);
    expect(v1.grupo).toBe("Grupo Central");
    const v2 = diezmadorConDatos((await db.dadores.get("dz-2"))!, map, gMap);
    expect(v2.grupo).toBe("");
  });

  it("sin persona enlazada (equipo sin actualizar), la lectura tolera y devuelve la ficha tal cual", async () => {
    const viejo = diezmadorViejo();
    const map = mapaPersonas([]);
    const vista = diezmadorConDatos(viejo, map, mapaGrupos([]));
    expect(vista).toBe(viejo);
    expect(vista.nombre).toBe("Rosa");
    expect(vista.grupo).toBe("Grupo Norte");
  });
});

describe("asegurarPersonaDeDiezmador (P4: el viejo sin persona, al editarlo)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.personas.clear();
    await db.dadores.clear();
    await db.grupos.clear();
  });

  it("crea la persona con el id del propio diezmador, nacida de sus datos dormidos, y lo enlaza", async () => {
    await db.dadores.add(diezmadorViejo());

    const personaId = await asegurarPersonaDeDiezmador((await db.dadores.get("dz-viejo"))!);
    expect(personaId).toBe("dz-viejo");

    const persona = await db.personas.get("dz-viejo");
    expect(persona).toBeTruthy();
    expect(persona!.nombre).toBe("Rosa");
    expect(persona!.apellido).toBe("Díaz");
    expect(persona!.telefono).toBe("5552222");
    expect(persona!.email).toBe("rosa@ejemplo.com");
    expect(persona!.numeroIdentidad).toBe("83050511111");
    expect(persona!.zona).toBe("Este");

    const enlazado = await db.dadores.get("dz-viejo");
    expect(enlazado?.personaId).toBe("dz-viejo");
    // El enlace no reescribe la historia: sus datos personales dormidos y
    // su grupo texto quedan intactos en la ficha (ya nadie los lee).
    expect(enlazado?.nombre).toBe("Rosa");
    expect(enlazado?.grupo).toBe("Grupo Norte");
  });

  it("la pista del grupo TEXTO (§5.3.6): si coincide con un grupo existente, el núcleo nace con él; si no, sin grupo", async () => {
    await db.grupos.add({ id: "g-norte", nombre: "Grupo Norte", zona: "Norte", lider: "", dia: "Sábado", hora: "18:00", capacidad: "15", lugar: "", miembros: 0, planOfrendasMensual: 0, version: 1 });
    await db.dadores.add(diezmadorViejo({ id: "dz-con", grupo: "grupo norte" }));
    await db.dadores.add(diezmadorViejo({ id: "dz-sin", grupo: "Grupo Fantasma", telefono: "5553333" }));

    await asegurarPersonaDeDiezmador((await db.dadores.get("dz-con"))!);
    expect((await db.personas.get("dz-con"))!.grupoId).toBe("g-norte");

    await asegurarPersonaDeDiezmador((await db.dadores.get("dz-sin"))!);
    expect((await db.personas.get("dz-sin"))!.grupoId).toBeNull();
  });

  it("es idempotente y no pisa una persona ya existente con ese id", async () => {
    await db.dadores.add(diezmadorViejo());
    await asegurarPersonaDeDiezmador((await db.dadores.get("dz-viejo"))!);
    await db.personas.update("dz-viejo", { telefono: "5559999" });

    const otra = await asegurarPersonaDeDiezmador((await db.dadores.get("dz-viejo"))!);
    expect(otra).toBe("dz-viejo");
    expect(await db.personas.count()).toBe(1);
    expect((await db.personas.get("dz-viejo"))!.telefono).toBe("5559999");
  });

  it("un diezmador ya enlazado devuelve su personaId sin crear nada", async () => {
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.dadores.add(diezmadorNuevo({ personaId: "p1" }));

    const id = await asegurarPersonaDeDiezmador((await db.dadores.get("dz-nuevo"))!);
    expect(id).toBe("p1");
    expect(await db.personas.count()).toBe(1);
  });
});
