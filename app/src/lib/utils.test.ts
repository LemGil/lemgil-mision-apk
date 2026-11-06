import { describe, it, expect } from "vitest";
import { coincideBusquedaConversion, fechaDeEstado, ordenarConversionesRecientes } from "./utils";
import type { Conversion } from "./types";

const conv = (over: Partial<Conversion> = {}): Conversion => ({
  id: "c1", nombre: "María", apellido: "González", telefono: "53551234",
  edad: "", direccion: "", familia: "", fecha: "2026-01-15", zona: "Norte",
  lider: "Pedro Sosa", grupoId: "", hermanoMayorId: null, email: "", profesion: "",
  bautizado: false, fechaBautismo: "", conyuge: "", hijos: "",
  estado: "ps-nuevo", numeroIdentidad: "85010112345", notas: "", historial: [],
  creado: "2026-01-15T10:00:00", version: 1, ...over,
});

describe("Pulido · F10: fechaDeEstado — la entrada MÁS RECIENTE en ese estado", () => {
  it("con varias entradas del mismo estado manda la de fecha mayor, no la primera", () => {
    const c = conv({
      historial: [
        { fecha: "2026-02-01", estado: "ps-discipulado", nota: "Entró" },
        { fecha: "2026-05-10", estado: "ps-discipulado", nota: "Volvió tras una pausa" },
        { fecha: "2026-03-01", estado: "ps-bautizado", nota: "" },
      ],
    });
    expect(fechaDeEstado(c, "ps-discipulado")).toBe("2026-05-10");
    expect(fechaDeEstado(c, "ps-bautizado")).toBe("2026-03-01");
  });

  it("no importa el orden de la lista: gana la fecha, aunque la entrada esté desordenada", () => {
    const c = conv({
      historial: [
        { fecha: "2026-05-10", estado: "ps-discipulado", nota: "" },
        { fecha: "2026-02-01", estado: "ps-discipulado", nota: "" },
      ],
    });
    expect(fechaDeEstado(c, "ps-discipulado")).toBe("2026-05-10");
  });

  it("compara por identidad canónica: la etiqueta legada y el id son el mismo estado", () => {
    const c = conv({ historial: [{ fecha: "2026-04-01", estado: "Discipulado", nota: "" }] });
    expect(fechaDeEstado(c, "ps-discipulado")).toBe("2026-04-01");
    expect(fechaDeEstado(c, "Discipulado")).toBe("2026-04-01");
  });

  it("sin entrada de ese estado, cae a la fecha de la conversión", () => {
    const c = conv({ fecha: "2026-01-15", historial: [{ fecha: "2026-02-01", estado: "ps-bautizado", nota: "" }] });
    expect(fechaDeEstado(c, "ps-discipulado")).toBe("2026-01-15");
    expect(fechaDeEstado(conv({ historial: [] }), "ps-nuevo")).toBe("2026-01-15");
  });

  it("sin historial ni fecha, devuelve cadena vacía (el llamador decide)", () => {
    expect(fechaDeEstado(conv({ fecha: "", historial: [] }), "ps-nuevo")).toBe("");
  });
});

describe("Pulido · M1: ordenarConversionesRecientes — fecha de conversión descendente", () => {
  it("la más reciente primero; no muta la lista de entrada", () => {
    const a = conv({ id: "a", fecha: "2026-01-15" });
    const b = conv({ id: "b", fecha: "2026-03-01" });
    const c = conv({ id: "c", fecha: "2025-12-31" });
    const entrada = [a, b, c];
    expect(ordenarConversionesRecientes(entrada).map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(entrada.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("desempate estable: misma fecha → creación más reciente → nombre resuelto", () => {
    const x = conv({ id: "x", fecha: "2026-03-01", creado: "2026-03-01T08:00:00", nombre: "Zulema", apellido: "Paz" });
    const y = conv({ id: "y", fecha: "2026-03-01", creado: "2026-03-02T08:00:00", nombre: "Beatriz", apellido: "Paz" });
    const z = conv({ id: "z", fecha: "2026-03-01", creado: "2026-03-02T08:00:00", nombre: "Ana", apellido: "Paz" });
    expect(ordenarConversionesRecientes([x, y, z]).map((v) => v.id)).toEqual(["z", "y", "x"]);
  });
});

describe("Pulido · M2: coincideBusquedaConversion — teléfono por dígitos y Nº de Identidad", () => {
  it("lo de siempre: nombre, zona y líder, sin distinción de mayúsculas", () => {
    const c = conv();
    expect(coincideBusquedaConversion(c, "maría")).toBe(true);
    expect(coincideBusquedaConversion(c, "GONZÁLEZ")).toBe(true);
    expect(coincideBusquedaConversion(c, "norte")).toBe(true);
    expect(coincideBusquedaConversion(c, "pedro")).toBe(true);
    expect(coincideBusquedaConversion(c, "habana")).toBe(false);
    expect(coincideBusquedaConversion(c, "")).toBe(true);
  });

  it("teléfono por dígitos, tolerante a formato en ambos sentidos", () => {
    const c = conv({ telefono: "53551234" });
    expect(coincideBusquedaConversion(c, "5355 1234")).toBe(true);
    expect(coincideBusquedaConversion(c, "+53 55-12-34")).toBe(true);
    expect(coincideBusquedaConversion(c, "1234")).toBe(true);
    expect(coincideBusquedaConversion(conv({ telefono: "+53 55 12 34" }), "53551234")).toBe(true);
    expect(coincideBusquedaConversion(c, "9999")).toBe(false);
  });

  it("el teléfono no se compara con menos de 3 dígitos (una búsqueda por nombre no arrastra falsos positivos)", () => {
    const c = conv({ telefono: "53551234", nombre: "Ana", apellido: "Paz", zona: "", lider: "", numeroIdentidad: "" });
    expect(coincideBusquedaConversion(c, "12")).toBe(false);
  });

  it("Nº de Identidad: contiene el texto, sin distinción de mayúsculas", () => {
    const c = conv({ numeroIdentidad: "850101AbC" });
    expect(coincideBusquedaConversion(c, "850101")).toBe(true);
    expect(coincideBusquedaConversion(c, "abc")).toBe(true);
    expect(coincideBusquedaConversion(c, "990101")).toBe(false);
  });
});
