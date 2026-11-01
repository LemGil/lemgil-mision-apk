import { describe, it, expect } from "vitest";
import { claveZona, zonaCanonica } from "./zonas";
import type { Zona } from "./types";

const catalogo: Zona[] = [
  { id: "z1", nombre: "Pósito Norte", creado: "", version: 1 },
  { id: "z2", nombre: "Centro", creado: "", version: 1 },
];

describe("Zonas canónicas (B5)", () => {
  it("la clave ignora mayúsculas, acentos y espacios", () => {
    expect(claveZona("PÓSITO NORTE")).toBe("posito norte");
    expect(claveZona("  posito   norte ")).toBe("posito norte");
    expect(claveZona("Pósito Norte")).toBe(claveZona("posito norte"));
  });

  it("devuelve la grafía oficial del catálogo ante variantes", () => {
    expect(zonaCanonica("posito norte", catalogo)).toBe("Pósito Norte");
    expect(zonaCanonica("PÓSITO NORTE", catalogo)).toBe("Pósito Norte");
    expect(zonaCanonica("  Pósito Norte  ", catalogo)).toBe("Pósito Norte");
    expect(zonaCanonica("CENTRO", catalogo)).toBe("Centro");
  });

  it("sin coincidencia devuelve el texto limpio tal como se escribió", () => {
    expect(zonaCanonica("  Sur ", catalogo)).toBe("Sur");
    expect(zonaCanonica("Barrio Nuevo", catalogo)).toBe("Barrio Nuevo");
  });

  it("con el catálogo vacío devuelve el texto limpio", () => {
    expect(zonaCanonica("  Norte ", [])).toBe("Norte");
  });

  it("nombre vacío o solo espacios devuelve cadena vacía", () => {
    expect(zonaCanonica("", catalogo)).toBe("");
    expect(zonaCanonica("   ", catalogo)).toBe("");
  });
});
