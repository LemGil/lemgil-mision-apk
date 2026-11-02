import { describe, it, expect } from "vitest";
import { conversionConDatos, mapaPersonas, miembroConDatos, nombreDePersona } from "./personaDatos";
import { edadDesde } from "./personaVista";
import type { Conversion, Miembro, Persona } from "./types";

const persona = (over: Partial<Persona> = {}): Persona => ({
  id: "p1",
  nombre: "Juan",
  apellido: "Pérez",
  numeroIdentidad: "85010112345",
  telefono: "5550001",
  email: "juan@x.cu",
  direccion: "Calle 1",
  zona: "Norte",
  fechaNacimiento: "1990-05-01",
  profesion: "Maestro",
  estadoCivil: "Casado",
  contactoPreferido: "WhatsApp",
  bautizado: true,
  fechaBautismo: "2023-12-01",
  conyuge: "María",
  hijos: "2",
  grupoId: "g1",
  hermanoMayorId: "p-mentor",
  creado: "2024-01-15T00:00:00.000Z",
  version: 1,
  ...over,
});

const mentor = persona({ id: "p-mentor", nombre: "Pastor", apellido: "López" });

const convProceso = (over: Partial<Conversion> = {}): Conversion => ({
  id: "c1",
  // El proceso nace con los datos personales VACÍOS (P2).
  nombre: "", apellido: "", telefono: "", edad: "", direccion: "",
  familia: "", fecha: "2024-01-15", zona: "", lider: "", grupoId: "",
  hermanoMayorId: null, email: "", profesion: "", bautizado: false,
  fechaBautismo: "", conyuge: "", hijos: "",
  estado: "Nuevo", personaId: "p1", notas: "", historial: [],
  creado: "2024-01-15T00:00:00.000Z", version: 1,
  ...over,
});

const miembroProceso = (over: Partial<Miembro> = {}): Miembro => ({
  id: "m1",
  nombre: "", apellido: "", telefono: "", email: "", direccion: "", zona: "",
  grupoId: null, fechaNacimiento: "", fechaIngreso: "2024-02-01",
  estado: "Activo", contactoPreferido: "WhatsApp", profesion: "",
  estadoCivil: "Soltero", bautizado: false, fechaBautismo: "", conyuge: "",
  hijos: "", hermanoMayorId: null, conversionId: "c1", personaId: "p1",
  notas: "", creado: "2024-02-01T00:00:00.000Z", actualizado: "2024-02-01T00:00:00.000Z",
  version: 1,
  ...over,
});

describe("capa de lectura de la ficha única (personaDatos)", () => {
  const map = mapaPersonas([persona(), mentor]);

  it("la conversión pinta los datos personales desde la persona, no de su ficha", () => {
    const vista = conversionConDatos(convProceso(), map);
    expect(vista.nombre).toBe("Juan");
    expect(vista.telefono).toBe("5550001");
    expect(vista.zona).toBe("Norte");
    expect(vista.grupoId).toBe("g1");
    expect(vista.hermanoMayorId).toBe("p-mentor");
    // La edad se deriva de la fecha de nacimiento del núcleo.
    expect(vista.edad).toBe(String(edadDesde("1990-05-01")));
    // El «líder» de la conversión es el hermano mayor de la persona.
    expect(vista.lider).toBe("Pastor López");
    // Los campos del PROCESO quedan intactos.
    expect(vista.estado).toBe("Nuevo");
    expect(vista.fecha).toBe("2024-01-15");
  });

  it("el proceso original NO se muta (es una vista)", () => {
    const proceso = convProceso();
    conversionConDatos(proceso, map);
    expect(proceso.nombre).toBe("");
  });

  it("sin persona enlazada, el registro se devuelve tal cual (sus datos dormidos)", () => {
    const vieja = convProceso({ personaId: null, nombre: "Pedro", telefono: "5559999" });
    const vista = conversionConDatos(vieja, map);
    expect(vista).toBe(vieja);
    expect(vista.nombre).toBe("Pedro");
  });

  it("el miembro pinta desde la misma persona que la conversión", () => {
    const vista = miembroConDatos(miembroProceso(), map);
    expect(vista.nombre).toBe("Juan");
    expect(vista.telefono).toBe("5550001");
    expect(vista.fechaNacimiento).toBe("1990-05-01");
    expect(vista.conversionId).toBe("c1");
    expect(vista.fechaIngreso).toBe("2024-02-01");
  });

  it("editar el teléfono en la persona se refleja en AMBAS vistas sin tocar los procesos", () => {
    const editado = mapaPersonas([persona({ telefono: "5557777" }), mentor]);
    expect(conversionConDatos(convProceso(), editado).telefono).toBe("5557777");
    expect(miembroConDatos(miembroProceso(), editado).telefono).toBe("5557777");
  });

  it("nombreDePersona resuelve por id y tolera ids vacíos", () => {
    expect(nombreDePersona(map, "p1")).toBe("Juan Pérez");
    expect(nombreDePersona(map, "")).toBe("");
    expect(nombreDePersona(map, undefined)).toBe("");
    expect(nombreDePersona(map, "inexistente")).toBe("");
  });
});
