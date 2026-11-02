import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db } from "../../lib/database";
import { beneficiarioConDatos, mapaPersonas } from "../../lib/personaDatos";
import { asegurarPersonaDeBeneficiario } from "../../lib/personas";
import type { Beneficiario, Persona } from "../../lib/types";

// Estas pruebas reproducen, a nivel de base de datos, EXACTAMENTE lo que
// escribe el alta de beneficiario de P5 (saveBen): la persona se crea o
// se elige una vez en el núcleo y el proceso nace con los personales
// vacíos y su personaId. Murió el selector de «origen» con su useEffect
// copiador y murieron source/sourceId como escrituras: la persona ES el
// origen. Las «Casa de Familia»/«Grupo» no son personas del núcleo: se
// enlazan por su REPRESENTANTE (personaId = la persona que recibe y
// firma) y su contacto se resuelve desde la ficha de esa persona.

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

// Lo que guarda saveBen en P5 para un beneficiario Persona nuevo: solo
// el proceso (sin source/sourceId: ni siquiera existen las claves).
const beneficiarioPersonaNuevo = (over: Partial<Beneficiario> = {}): Beneficiario => ({
  id: "ben-nuevo",
  nombre: "", apellido: "", telefono: "", direccion: "", zona: "",
  familia: 3,
  estado: "Activo",
  notas: "",
  tipo: "Persona",
  personaId: null,
  creado: "2024-02-01",
  version: 1,
  ...over,
});

// Lo que guarda saveBen en P5 para una Casa de Familia nueva: su nombre
// (del proceso), el representante enlazado y su nombre como foto.
const casaNueva = (over: Partial<Beneficiario> = {}): Beneficiario => ({
  id: "ben-casa",
  nombre: "Familia Pérez",
  apellido: "", telefono: "", direccion: "", zona: "",
  familia: 5,
  estado: "Activo",
  notas: "",
  tipo: "Casa de Familia",
  representativeName: "María Gómez",
  personaId: null,
  creado: "2024-02-01",
  version: 1,
  ...over,
});

// Una ficha VIEJA (anterior a la ficha única): personales tecleados en la
// propia ficha — traídos por el «origen» copiador o a mano —, con source
// y sourceId, y ningún personaId.
const beneficiarioViejo = (over: Partial<Beneficiario> = {}): Beneficiario => ({
  id: "ben-viejo",
  nombre: "Rosa",
  apellido: "Díaz",
  telefono: "5552222",
  direccion: "Calle 9",
  zona: "Este",
  familia: 2,
  estado: "Activo",
  numeroIdentidad: "83050511111",
  notas: "Viene de la ficha antigua",
  tipo: "Persona",
  source: "Miembro",
  sourceId: "m-viejo",
  personaId: null,
  creado: "2023-09-01",
  version: 1,
  ...over,
});

describe("Alta de beneficiario sobre la ficha única (P5)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.personas.clear();
    await db.beneficiarios.clear();
    await db.entregas.clear();
  });

  it("Persona enlazado a una persona EXISTENTE: no se crea otra persona y la vista pinta sus datos", async () => {
    await db.personas.add({ id: "p-existente", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.beneficiarios.add(beneficiarioPersonaNuevo({ personaId: "p-existente" }));

    expect(await db.personas.count()).toBe(1);
    const guardado = await db.beneficiarios.get("ben-nuevo");
    expect(guardado?.personaId).toBe("p-existente");
    expect(guardado?.nombre).toBe(""); // el proceso no duplica los datos
    expect(guardado?.telefono).toBe("");
    // source/sourceId murieron como escrituras: ni siquiera hay claves.
    expect("source" in (guardado as object)).toBe(false);
    expect("sourceId" in (guardado as object)).toBe(false);

    const map = mapaPersonas(await db.personas.toArray());
    const vista = beneficiarioConDatos(guardado!, map);
    expect(vista.nombre).toBe("María");
    expect(vista.apellido).toBe("Gómez");
    expect(vista.telefono).toBe("5551111");
    expect(vista.direccion).toBe("Calle 2");
    expect(vista.zona).toBe("Sur");
    expect(vista.numeroIdentidad).toBe("90020254321");
    // Lo del proceso sigue siendo del proceso:
    expect(vista.familia).toBe(3);
    expect(vista.estado).toBe("Activo");
    expect(vista.tipo).toBe("Persona");
  });

  it("con persona NUEVA: nace una sola ficha y el beneficiario queda enlazado a ella", async () => {
    // «➕ Nueva persona» del PersonaSelect guarda primero en el núcleo…
    await db.personas.add({ id: "p-nueva", creado: "2024-02-01T00:00:00.000Z", version: 1, ...datosPersona() });
    // …y saveBen guarda el proceso enlazado, sin teclear nada personal.
    await db.beneficiarios.add(beneficiarioPersonaNuevo({ personaId: "p-nueva" }));

    expect(await db.personas.count()).toBe(1);
    const persona = await db.personas.get("p-nueva");
    expect(persona?.numeroIdentidad).toBe("90020254321");
    expect((await db.beneficiarios.get("ben-nuevo"))?.personaId).toBe("p-nueva");
  });

  it("Vulnerable también es persona: se enlaza y pinta desde el núcleo", async () => {
    await db.personas.add({ id: "p-vuln", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona({ nombre: "Ana", apellido: "Ruiz" }) });
    await db.beneficiarios.add(beneficiarioPersonaNuevo({ id: "ben-vuln", tipo: "Vulnerable", personaId: "p-vuln" }));

    const map = mapaPersonas(await db.personas.toArray());
    const vista = beneficiarioConDatos((await db.beneficiarios.get("ben-vuln"))!, map);
    expect(vista.nombre).toBe("Ana");
    expect(vista.apellido).toBe("Ruiz");
    expect(vista.tipo).toBe("Vulnerable");
  });

  it("las lecturas resuelven nombre y contacto desde el NÚCLEO, no desde la copia dormida desactualizada", async () => {
    // La persona corrigió su nombre, teléfono, dirección y zona en la
    // ficha única; la ficha vieja del beneficiario conserva los datos
    // que el «origen» copió el día del alta, dormidos.
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona({ nombre: "María Elena" }) });
    await db.beneficiarios.add(beneficiarioViejo({ id: "ben-1", personaId: "p1", nombre: "María", telefono: "5550000", direccion: "Calle Vieja", zona: "Norte" }));
    await db.entregas.add({
      id: "ent-1", campanaId: "camp-1", beneficiarioId: "ben-1", beneficiarioNombre: "María Gómez",
      fecha: "2024-03-05", tipo: "Canasta básica", cantidad: 1, unidad: "unidad", notas: "",
      creado: "2024-03-05", version: 1,
    });

    const map = mapaPersonas(await db.personas.toArray());
    const decorados = (await db.beneficiarios.toArray()).map((b) => beneficiarioConDatos(b, map));

    // La fila del registro (BeneficiariosTab pinta b.nombre del decorado):
    expect(decorados[0].nombre).toBe("María Elena");
    expect(decorados[0].telefono).toBe("5551111"); // el teléfono vigente es el del núcleo
    expect(decorados[0].direccion).toBe("Calle 2");
    expect(decorados[0].zona).toBe("Sur");

    // La entrega histórica sigue colgando del PROCESO (su FK no cambió)
    // y su nombre en pantalla se resuelve entrega → proceso → persona:
    const entrega = await db.entregas.get("ent-1");
    const benDeLaEntrega = decorados.find((b) => b.id === entrega!.beneficiarioId);
    expect(benDeLaEntrega).toBeTruthy();
    expect(`${benDeLaEntrega!.nombre} ${benDeLaEntrega!.apellido}`).toBe("María Elena Gómez");
  });

  it("sin persona enlazada (equipo sin actualizar), la lectura tolera y devuelve la ficha tal cual", async () => {
    const viejo = beneficiarioViejo();
    const map = mapaPersonas([]);
    const vista = beneficiarioConDatos(viejo, map);
    expect(vista).toBe(viejo);
    expect(vista.nombre).toBe("Rosa");
    expect(vista.telefono).toBe("5552222");
  });
});

describe("Casa de Familia / Grupo: enlace por REPRESENTANTE (P5, §3.4)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.personas.clear();
    await db.beneficiarios.clear();
  });

  it("el alta enlaza al representante SIN crear ninguna persona para la casa", async () => {
    // La única persona que existe es la representante, creada en el núcleo:
    await db.personas.add({ id: "p-rep", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.beneficiarios.add(casaNueva({ personaId: "p-rep" }));

    // La casa NO es una persona fantasma en el núcleo:
    expect(await db.personas.count()).toBe(1);
    expect(await db.personas.get("ben-casa")).toBeUndefined();
    const guardado = await db.beneficiarios.get("ben-casa");
    expect(guardado?.personaId).toBe("p-rep"); // el enlace es el representante
    expect(guardado?.nombre).toBe("Familia Pérez"); // el nombre del hogar vive en el proceso
    expect("source" in (guardado as object)).toBe(false);
    expect("sourceId" in (guardado as object)).toBe(false);
  });

  it("el contacto de la casa se resuelve desde su REPRESENTANTE, contra las copias dormidas del proceso", async () => {
    await db.personas.add({
      id: "p-rep", creado: "2024-01-01T00:00:00.000Z", version: 1,
      ...datosPersona({ nombre: "Carmen", apellido: "López", telefono: "5557777", direccion: "Calle 20", zona: "Oeste" }),
    });
    // La ficha de la casa trae teléfono/dirección/zona viejos, tecleados
    // el día del alta, y el nombre del representante como foto dormida:
    await db.beneficiarios.add(casaNueva({
      personaId: "p-rep",
      telefono: "5550000", direccion: "Calle Vieja", zona: "Norte",
      representativeName: "Carmen L.",
    }));

    const map = mapaPersonas(await db.personas.toArray());
    const vista = beneficiarioConDatos((await db.beneficiarios.get("ben-casa"))!, map);
    expect(vista.nombre).toBe("Familia Pérez"); // el hogar conserva SU nombre
    expect(vista.telefono).toBe("5557777"); // el contacto vigente es el del representante
    expect(vista.direccion).toBe("Calle 20");
    expect(vista.zona).toBe("Oeste");
    expect(vista.representativeName).toBe("Carmen López"); // nombre vigente, no la foto
    expect(vista.familia).toBe(5); // lo del proceso sigue siendo del proceso
  });

  it("un Grupo sigue la misma regla que la Casa de Familia", async () => {
    await db.personas.add({ id: "p-rep", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.beneficiarios.add(casaNueva({ id: "ben-grupo", tipo: "Grupo", nombre: "Comedor Calle 5", personaId: "p-rep" }));

    const map = mapaPersonas(await db.personas.toArray());
    const vista = beneficiarioConDatos((await db.beneficiarios.get("ben-grupo"))!, map);
    expect(vista.nombre).toBe("Comedor Calle 5");
    expect(vista.telefono).toBe("5551111");
    expect(vista.representativeName).toBe("María Gómez");
  });

  it("sin representante enlazado, la casa conserva sus datos dormidos (el vacío es legítimo)", async () => {
    await db.beneficiarios.add(casaNueva({ personaId: null, telefono: "5553333", direccion: "Calle 3", zona: "Centro", representativeName: "Sin ficha" }));
    const map = mapaPersonas([]);
    const crudo = (await db.beneficiarios.get("ben-casa"))!;
    const vista = beneficiarioConDatos(crudo, map);
    expect(vista).toBe(crudo);
    expect(vista.telefono).toBe("5553333");
    expect(vista.representativeName).toBe("Sin ficha");
  });
});

describe("asegurarPersonaDeBeneficiario (P5: el viejo sin persona, al editarlo)", () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.personas.clear();
    await db.beneficiarios.clear();
  });

  it("crea la persona con el id del propio beneficiario, nacida de sus datos dormidos, y lo enlaza", async () => {
    await db.beneficiarios.add(beneficiarioViejo());

    const personaId = await asegurarPersonaDeBeneficiario((await db.beneficiarios.get("ben-viejo"))!);
    expect(personaId).toBe("ben-viejo");

    const persona = await db.personas.get("ben-viejo");
    expect(persona).toBeTruthy();
    expect(persona!.nombre).toBe("Rosa");
    expect(persona!.apellido).toBe("Díaz");
    expect(persona!.telefono).toBe("5552222");
    expect(persona!.direccion).toBe("Calle 9");
    expect(persona!.numeroIdentidad).toBe("83050511111");
    expect(persona!.zona).toBe("Este");

    const enlazado = await db.beneficiarios.get("ben-viejo");
    expect(enlazado?.personaId).toBe("ben-viejo");
    // El enlace no reescribe la historia: el origen dormido queda intacto
    // en la ficha (ya nadie lo lee ni lo produce de nuevo).
    expect(enlazado?.source).toBe("Miembro");
    expect(enlazado?.sourceId).toBe("m-viejo");
  });

  it("es idempotente y no pisa una persona ya existente con ese id", async () => {
    await db.beneficiarios.add(beneficiarioViejo());
    await asegurarPersonaDeBeneficiario((await db.beneficiarios.get("ben-viejo"))!);
    await db.personas.update("ben-viejo", { telefono: "5559999" });

    const otra = await asegurarPersonaDeBeneficiario((await db.beneficiarios.get("ben-viejo"))!);
    expect(otra).toBe("ben-viejo");
    expect(await db.personas.count()).toBe(1);
    expect((await db.personas.get("ben-viejo"))!.telefono).toBe("5559999");
  });

  it("un beneficiario ya enlazado devuelve su personaId sin crear nada", async () => {
    await db.personas.add({ id: "p1", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    await db.beneficiarios.add(beneficiarioPersonaNuevo({ personaId: "p1" }));

    const id = await asegurarPersonaDeBeneficiario((await db.beneficiarios.get("ben-nuevo"))!);
    expect(id).toBe("p1");
    expect(await db.personas.count()).toBe(1);
  });
});
