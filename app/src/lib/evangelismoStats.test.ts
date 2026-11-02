import { describe, it, expect } from "vitest";
import { conteoConversionesPorEvangelismo, conversionesDeEvangelismo } from "./evangelismoStats";
import type { Conversion } from "./types";

const conv = (over: Partial<Conversion> = {}): Conversion => ({
  id: "c1",
  nombre: "A",
  apellido: "B",
  telefono: "",
  edad: "",
  direccion: "",
  familia: "",
  fecha: "2024-01-15",
  zona: "",
  lider: "",
  grupoId: "",
  hermanoMayorId: null,
  email: "",
  profesion: "",
  bautizado: false,
  fechaBautismo: "",
  conyuge: "",
  hijos: "",
  estado: "Nuevo",
  notas: "",
  historial: [],
  creado: "2024-01-15T00:00:00.000Z",
  version: 1,
  ...over,
});

describe("conteo derivado de conversiones por evangelismo (§3.5)", () => {
  const convs = [
    conv({ id: "c1", evangelismoId: "ev1" }),
    conv({ id: "c2", evangelismoId: "ev1" }),
    conv({ id: "c3", evangelismoId: "ev2" }),
    conv({ id: "c4" }), // sin enlazar: NO cuenta en ningún evangelismo
    conv({ id: "c5", evangelismoId: null }), // tampoco
    conv({ id: "c6", evangelismoId: "" }), // tampoco
  ];

  it("cuenta solo las conversiones enlazadas a cada evangelismo", () => {
    const conteo = conteoConversionesPorEvangelismo(convs);
    expect(conteo.get("ev1")).toBe(2);
    expect(conteo.get("ev2")).toBe(1);
  });

  it("un evangelismo sin conversiones enlazadas no aparece en el mapa (vale 0)", () => {
    const conteo = conteoConversionesPorEvangelismo(convs);
    expect(conteo.get("ev-sin-nada") ?? 0).toBe(0);
    expect(conteo.size).toBe(2);
  });

  it("conversionesDeEvangelismo devuelve el conteo de un solo evento", () => {
    expect(conversionesDeEvangelismo(convs, "ev1")).toBe(2);
    expect(conversionesDeEvangelismo(convs, "ev2")).toBe(1);
    expect(conversionesDeEvangelismo(convs, "ev-inexistente")).toBe(0);
  });

  it("sin conversiones, el conteo es vacío", () => {
    expect(conteoConversionesPorEvangelismo([]).size).toBe(0);
  });
});
