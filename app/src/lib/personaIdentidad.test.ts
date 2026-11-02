import { describe, it, expect } from "vitest";
import { buscarPorIdentidad } from "./personas";
import type { Persona } from "./types";

const persona = (over: Partial<Persona> = {}): Persona => ({
  id: "p1",
  nombre: "Juan",
  apellido: "Pérez",
  numeroIdentidad: "85010112345",
  telefono: "",
  email: "",
  direccion: "",
  zona: "",
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

const otra = persona({ id: "p2", nombre: "Ana", apellido: "Ruiz", numeroIdentidad: "90020254321" });

describe("buscarPorIdentidad (aviso anti-duplicado del carné, P2)", () => {
  it("encuentra a la persona con el mismo carné", () => {
    expect(buscarPorIdentidad([persona(), otra], "85010112345")?.id).toBe("p1");
  });

  it("la comparación ignora espacios y guiones (solo dígitos)", () => {
    expect(buscarPorIdentidad([persona()], "850 101 123-45")?.id).toBe("p1");
    expect(buscarPorIdentidad([persona({ numeroIdentidad: "850-101-12345" })], "85010112345")?.id).toBe("p1");
  });

  it("sin coincidencia devuelve undefined", () => {
    expect(buscarPorIdentidad([persona(), otra], "11111111111")).toBeUndefined();
  });

  it("carné vacío o solo espacios nunca coincide", () => {
    expect(buscarPorIdentidad([persona()], "")).toBeUndefined();
    expect(buscarPorIdentidad([persona({ numeroIdentidad: "" })], "85010112345")).toBeUndefined();
  });

  it("al editar una persona, su propio carné no cuenta como duplicado (excluirId)", () => {
    expect(buscarPorIdentidad([persona(), otra], "85010112345", "p1")).toBeUndefined();
    expect(buscarPorIdentidad([persona(), otra], "90020254321", "p1")?.id).toBe("p2");
  });
});
