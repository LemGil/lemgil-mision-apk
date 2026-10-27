import { describe, it, expect } from "vitest";
import { dedupeKey, normalizeField } from "./csvImport";

describe("Deduplicación de importación CSV (Fase 3)", () => {
  it("normaliza tildes, mayúsculas y espacios", () => {
    expect(normalizeField("Pósito Norte")).toBe("posito norte");
    expect(normalizeField("  MERCEDES  ")).toBe("mercedes");
  });

  it("los teléfonos se comparan por dígitos", () => {
    expect(normalizeField("+53 5390 0493")).toBe("5353900493");
    expect(normalizeField("(539)004-93")).toBe("53900493");
  });

  it("los campos que no son teléfono se dejan como texto", () => {
    expect(normalizeField("120 N0 5102")).toBe("120 n0 5102");
    expect(normalizeField(15000)).toBe("15000");
  });

  it("la clave de un miembro une nombre, apellido y teléfono", () => {
    const a = dedupeKey("miembros", { nombre: "Niola", apellido: "Vecina", telefono: "+53 53900493" });
    const b = dedupeKey("miembros", { nombre: "niola", apellido: "VECINA", telefono: "53 5390 0493" });
    expect(a).toBe("niola|vecina|5353900493");
    expect(a).toBe(b);
  });

  it("distingue personas con el mismo nombre pero distinto teléfono", () => {
    const a = dedupeKey("miembros", { nombre: "Ana", apellido: "Ruiz", telefono: "111" });
    const b = dedupeKey("miembros", { nombre: "Ana", apellido: "Ruiz", telefono: "222" });
    expect(a).not.toBe(b);
  });

  it("las tablas sin claves definidas no deduplican", () => {
    expect(dedupeKey("reportes", { id: "x" })).toBeNull();
  });

  it("una clave completamente vacía no deduplica", () => {
    expect(dedupeKey("miembros", { nombre: "", apellido: "", telefono: "" })).toBeNull();
  });
});
