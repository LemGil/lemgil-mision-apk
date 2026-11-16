import { describe, it, expect } from "vitest";
import { beneficiarioDeAlta, conversionDeAlta, estadoDeAlta, miembroDeAlta, opcionesEfectivas } from "./altasDirectas";
import { PS_CONGREGADO, PS_INTEGRADO, PS_NUEVO } from "./pasosMision";

const HOY = "2026-11-15";
const base = { mision: false, entrada: "congregado" as const, integrado: false, beneficiario: false };

describe("altasDirectas: el registro de Misión", () => {
  it("sin Misión ni Integrado no hay registro", () => {
    expect(conversionDeAlta("p1", { ...base, beneficiario: true }, undefined, HOY)).toBeNull();
    expect(estadoDeAlta({ ...base, mision: true }, undefined)).toBe(PS_CONGREGADO);
  });

  it("Congregado: nace en el paso de inicio, sin entrada de historial (manda la fecha)", () => {
    const c = conversionDeAlta("p1", { ...base, mision: true }, undefined, HOY)!;
    expect(c.estado).toBe(PS_CONGREGADO);
    expect(c.historial).toEqual([]);
    expect(c.fecha).toBe(HOY);
    expect(c.personaId).toBe("p1");
    expect(c.evangelismoId).toBeNull();
    // El proceso nace SIN datos personales: viven en la persona.
    expect(c.nombre).toBe("");
    expect(c.telefono).toBe("");
  });

  it("Converso: nace en el paso de la conversión, con su «Registro inicial»", () => {
    const c = conversionDeAlta("p1", { ...base, mision: true, entrada: "converso" }, undefined, HOY)!;
    expect(c.estado).toBe(PS_NUEVO);
    expect(c.historial).toEqual([{ fecha: HOY, estado: PS_NUEVO, nota: "Registro inicial" }]);
  });

  it("Congregado + Integrado: el registro nace YA en el gozne (el miembro se enlaza al guardar)", () => {
    const c = conversionDeAlta("p1", { ...base, mision: true, integrado: true }, undefined, HOY)!;
    expect(c.estado).toBe(PS_INTEGRADO);
    expect(c.historial).toEqual([{ fecha: HOY, estado: PS_INTEGRADO, nota: "Registro inicial" }]);
  });

  it("Integrado sin Misión no crea registro (el miembro nace solo, como el alta manual)", () => {
    expect(conversionDeAlta("p1", { ...base, integrado: true }, undefined, HOY)).toBeNull();
  });
});

describe("altasDirectas: el miembro y el beneficiario", () => {
  it("el miembro nace Activo, con ingreso hoy y sin conversión de origen", () => {
    const m = miembroDeAlta("p1", HOY);
    expect(m.estado).toBe("Activo");
    expect(m.fechaIngreso).toBe(HOY);
    expect(m.conversionId).toBeNull();
    expect(m.personaId).toBe("p1");
    expect(m.nombre).toBe("");
  });

  it("el beneficiario nace tipo Persona, Activo, en Manos Abiertas", () => {
    const b = beneficiarioDeAlta("p1");
    expect(b.tipo).toBe("Persona");
    expect(b.estado).toBe("Activo");
    expect(b.familia).toBe(1);
    expect(b.personaId).toBe("p1");
    expect(b.nombre).toBe("");
  });
});

describe("altasDirectas al EDITAR: opcionesEfectivas no duplica procesos", () => {
  const todas = { mision: true, entrada: "converso" as const, integrado: true, beneficiario: true };
  const ninguno = { mision: false, miembro: false, beneficiario: false };

  it("sin procesos previos, las opciones pasan enteras (el alta nueva)", () => {
    expect(opcionesEfectivas(todas, ninguno)).toEqual(todas);
    expect(opcionesEfectivas(base, ninguno)).toEqual(base);
  });

  it("cada proceso que ya tiene apaga solo su casilla", () => {
    expect(opcionesEfectivas(todas, { mision: true, miembro: false, beneficiario: false }))
      .toEqual({ mision: false, entrada: "converso", integrado: true, beneficiario: true });
    expect(opcionesEfectivas(todas, { mision: false, miembro: true, beneficiario: false }).integrado).toBe(false);
    expect(opcionesEfectivas(todas, { mision: false, miembro: false, beneficiario: true }).beneficiario).toBe(false);
  });

  it("con todo ya creado, no se aplica ninguna alta", () => {
    expect(opcionesEfectivas(todas, { mision: true, miembro: true, beneficiario: true }))
      .toEqual({ mision: false, entrada: "converso", integrado: false, beneficiario: false });
  });
});
