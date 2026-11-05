import { describe, it, expect } from "vitest";
import { escaleraDeMiembro, ordenarPasos, type ContextoPasosMiembro } from "./pasosMiembro";
import type { Conversion, Estudiante, Hito, Miembro, MiembroMinisterio, PasoSeguimiento } from "./types";

// La semilla real vive en lib/migrate.ts (PASOS_MIEMBRO_SEMILLA); aquí se
// reproduce su forma para probar la lógica sin arrastrar la base.
const paso = (id: string, orden: number, fuente: PasoSeguimiento["fuente"], extra?: Partial<PasoSeguimiento>): PasoSeguimiento =>
  ({ id, ambito: "miembro", nombre: id, emoji: "📌", orden, fuente, creado: "2026-01-01T00:00:00.000Z", version: 1, ...extra } as PasoSeguimiento);

const SEMILLA: PasoSeguimiento[] = [
  paso("pm-integracion", 1, "integracion", { protegido: true }),
  paso("pm-grupo", 2, "grupo"),
  paso("pm-academia", 3, "academia"),
  paso("pm-ministerio", 4, "ministerio"),
  paso("pm-hermano-mayor", 5, "hermanoMayor"),
  paso("pm-liderazgo", 6, "manual"),
];

const miembro = (extra?: Partial<Miembro>): Miembro =>
  ({ id: "m1", personaId: "p1", conversionId: "c1", grupoId: null, ...extra } as Miembro);
const hito = (extra: Partial<Hito>): Hito =>
  ({ id: "h?", miembroId: "m1", fecha: "2024-01-01", tipo: "Otro", descripcion: "", creado: "2024-01-01T00:00:00.000Z", version: 1, ...extra } as Hito);
const ctx = (extra?: Partial<ContextoPasosMiembro>): ContextoPasosMiembro => ({
  miembro: miembro(),
  hitos: [],
  estudiantes: [],
  asignaciones: [],
  esHermanoMayor: false,
  ...extra,
});
const porId = (r: ReturnType<typeof escaleraDeMiembro>, id: string) => r.estados.find((e) => e.paso.id === id)!;

describe("Pasos del miembro (Fase 1) — fuente integración", () => {
  it("cumplido por el hito «Integración», con su fecha", () => {
    const r = escaleraDeMiembro(SEMILLA, ctx({ hitos: [hito({ id: "h1", tipo: "Integración", fecha: "2024-02-03" })] }));
    const e = porId(r, "pm-integracion");
    expect(e.cumplido).toBe(true);
    expect(e.fecha).toBe("2024-02-03");
  });

  it("cumplido por la conversión vinculada en estado Integrado (fecha del historial)", () => {
    const conversion = { id: "c1", estado: "Integrado", fecha: "2024-01-10", historial: [{ estado: "Integrado", fecha: "2024-02-01" }] } as unknown as Conversion;
    const r = escaleraDeMiembro(SEMILLA, ctx({ conversionOrigen: conversion }));
    const e = porId(r, "pm-integracion");
    expect(e.cumplido).toBe(true);
    expect(e.fecha).toBe("2024-02-01");
  });

  it("cumplido sin fecha en el alta manual (sin conversión de origen)", () => {
    const r = escaleraDeMiembro(SEMILLA, ctx({ miembro: miembro({ conversionId: null }) }));
    const e = porId(r, "pm-integracion");
    expect(e.cumplido).toBe(true);
    expect(e.fecha).toBeUndefined();
  });

  it("NO cumplido si la conversión sigue en proceso y no hay hito", () => {
    const conversion = { id: "c1", estado: "Discipulado", fecha: "2024-01-10", historial: [] } as unknown as Conversion;
    const r = escaleraDeMiembro(SEMILLA, ctx({ conversionOrigen: conversion }));
    expect(porId(r, "pm-integracion").cumplido).toBe(false);
    expect(r.actual?.id).toBe("pm-integracion");
  });
});

describe("Pasos del miembro (Fase 1) — fuentes automáticas vivas", () => {
  it("grupo: cumplido si tiene grupoId (del núcleo), sin fecha", () => {
    const r = escaleraDeMiembro(SEMILLA, ctx({ miembro: miembro({ grupoId: "g1", conversionId: null }) }));
    const e = porId(r, "pm-grupo");
    expect(e.cumplido).toBe(true);
    expect(e.fecha).toBeUndefined();
    expect(porId(escaleraDeMiembro(SEMILLA, ctx({ miembro: miembro({ conversionId: null }) })), "pm-grupo").cumplido).toBe(false);
  });

  it("academia: estudiante ACTIVO de su persona, con fecha de matrícula", () => {
    const est = { id: "e1", personaId: "p1", estado: "Activo", fecha: "2024-03-05", creado: "2024-03-05T00:00:00.000Z" } as Estudiante;
    const r = escaleraDeMiembro(SEMILLA, ctx({ estudiantes: [est] }));
    const e = porId(r, "pm-academia");
    expect(e.cumplido).toBe(true);
    expect(e.fecha).toBe("2024-03-05");
  });

  it("academia: no cuentan estudiantes de otra persona ni en pausa", () => {
    const otra = { id: "e2", personaId: "p9", estado: "Activo", fecha: "2024-03-05", creado: "" } as Estudiante;
    const pausa = { id: "e3", personaId: "p1", estado: "Pausado", fecha: "2024-03-05", creado: "" } as Estudiante;
    const r = escaleraDeMiembro(SEMILLA, ctx({ estudiantes: [otra, pausa] }));
    expect(porId(r, "pm-academia").cumplido).toBe(false);
  });

  it("ministerio: cumplido con asignación, fecha = el «desde» más antiguo", () => {
    const a1 = { id: "a1", miembroId: "m1", ministerioId: "mn1", desde: "2024-06-01", creado: "" } as MiembroMinisterio;
    const a2 = { id: "a2", miembroId: "m1", ministerioId: "mn2", desde: "2024-04-15", creado: "" } as MiembroMinisterio;
    const r = escaleraDeMiembro(SEMILLA, ctx({ asignaciones: [a1, a2] }));
    const e = porId(r, "pm-ministerio");
    expect(e.cumplido).toBe(true);
    expect(e.fecha).toBe("2024-04-15");
    expect(porId(escaleraDeMiembro(SEMILLA, ctx()), "pm-ministerio").cumplido).toBe(false);
  });

  it("hermanoMayor: sale de la bandera del núcleo", () => {
    expect(porId(escaleraDeMiembro(SEMILLA, ctx({ esHermanoMayor: true })), "pm-hermano-mayor").cumplido).toBe(true);
    expect(porId(escaleraDeMiembro(SEMILLA, ctx()), "pm-hermano-mayor").cumplido).toBe(false);
  });
});

describe("Pasos del miembro (Fase 1) — fuente manual", () => {
  it("cumplido por hito con pasoId: trae fecha y el hitoId para quitarlo", () => {
    const r = escaleraDeMiembro(SEMILLA, ctx({ hitos: [hito({ id: "h7", pasoId: "pm-liderazgo", fecha: "2025-01-20" })] }));
    const e = porId(r, "pm-liderazgo");
    expect(e.cumplido).toBe(true);
    expect(e.fecha).toBe("2025-01-20");
    expect(e.hitoId).toBe("h7");
  });

  it("el Liderazgo legado (hito por tipo, sin pasoId) también cumple, sin hitoId", () => {
    const r = escaleraDeMiembro(SEMILLA, ctx({ hitos: [hito({ id: "h8", tipo: "Liderazgo", fecha: "2023-11-02" })] }));
    const e = porId(r, "pm-liderazgo");
    expect(e.cumplido).toBe(true);
    expect(e.fecha).toBe("2023-11-02");
    expect(e.hitoId).toBeUndefined();
  });

  it("un hito de Liderazgo con pasoId de OTRO paso no cumple el legado", () => {
    const r = escaleraDeMiembro(SEMILLA, ctx({ hitos: [hito({ id: "h9", tipo: "Liderazgo", pasoId: "pm-otro", fecha: "2023-11-02" })] }));
    expect(porId(r, "pm-liderazgo").cumplido).toBe(false);
  });
});

describe("Pasos del miembro (Fase 1) — la escalera", () => {
  it("el paso actual es el PRIMERO no cumplido", () => {
    const r = escaleraDeMiembro(SEMILLA, ctx({
      miembro: miembro({ conversionId: null, grupoId: "g1" }),
    }));
    // integración (alta manual) ✅, grupo ✅, academia ❌ → actual academia
    expect(r.actual?.id).toBe("pm-academia");
    expect(r.cumplidos).toBe(2);
    expect(r.total).toBe(6);
  });

  it("todo cumplido: sin paso actual", () => {
    const est = { id: "e1", personaId: "p1", estado: "Activo", fecha: "2024-03-05", creado: "" } as Estudiante;
    const a1 = { id: "a1", miembroId: "m1", ministerioId: "mn1", desde: "2024-04-15", creado: "" } as MiembroMinisterio;
    const r = escaleraDeMiembro(SEMILLA, ctx({
      miembro: miembro({ conversionId: null, grupoId: "g1" }),
      estudiantes: [est], asignaciones: [a1], esHermanoMayor: true,
      hitos: [hito({ id: "h7", pasoId: "pm-liderazgo", fecha: "2025-01-20" })],
    }));
    expect(r.actual).toBeNull();
    expect(r.cumplidos).toBe(6);
  });

  it("respeta el orden aunque la entrada venga desordenada e ignora el ámbito mision", () => {
    const desorden = [SEMILLA[5], SEMILLA[2], SEMILLA[0], SEMILLA[4], SEMILLA[1], SEMILLA[3],
      paso("px-mision", 1, "manual", { ambito: "mision" })];
    const r = escaleraDeMiembro(desorden, ctx({ miembro: miembro({ conversionId: null }) }));
    expect(r.estados.map((e) => e.paso.id)).toEqual(SEMILLA.map((p) => p.id));
    expect(r.total).toBe(6);
  });

  it("ordenarPasos desempata por creación e id", () => {
    const a = paso("pz", 2, "manual", { creado: "2026-02-01T00:00:00.000Z" });
    const b = paso("pa", 2, "manual", { creado: "2026-01-01T00:00:00.000Z" });
    expect(ordenarPasos([a, b]).map((p) => p.id)).toEqual(["pa", "pz"]);
  });
});
