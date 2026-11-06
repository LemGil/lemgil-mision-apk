import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import {
  conversionesFiltradasPDF,
  exportResumenGeneralPDF,
  exportMetasPDF,
  exportCumplimientoPDF,
  exportReporteGeneralPDF,
  parseReporteResumen,
  safeExport,
  REPORTE_DATOS_VACIO,
  type ResumenAnualBC,
  type ResumenCompletoBC,
  type CumplimientoBC,
  type ReporteDatos,
} from "./pdfExport";
import type { Conversion } from "./types";
import { setGlobalNotificationFn } from "./notification";

// jsPDF guarda con URL.createObjectURL + clic en un <a>: en jsdom hay que simularlo.
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

/* Fixtures con la FORMA REAL que construye ResumenTab.tsx (Bien Común).
   Si un campo se renombra en un solo lado, estas fixtures dejan de compilar. */

const resumenAnual: ResumenAnualBC = { total: 12500, diezmos: 9000, ofrendas: 3500 };

const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const resumenCompleto: ResumenCompletoBC = {
  mesesData: meses.map((mes, idx) => ({ mes, idx, total: 1000 + idx * 10, diezmos: 700, ofrendas: 300, regs: 8 })),
  mejorMes: { mes: "Mar", idx: 2, total: 2200, diezmos: 1600, ofrendas: 600, regs: 11 },
  promedioMensual: 1450.5,
  diezmadoresActivosAnio: 7,
  topDiezmadores: [
    { id: "d1", nombre: "Juan", apellido: "Pérez", zona: "Norte", total: 3000, regs: 12 },
    { id: "d2", nombre: "Ana", apellido: "Ruiz", zona: "Sur", total: 2100, regs: 9 },
  ],
  topGrupos: [{ id: "g1", nombre: "Grupo Vida", zona: "Sur", total: 1200, regs: 6 }],
  totalAportes: 87,
  gruposConOfrenda: 1,
  variacionTotal: 12.5,
  variacionDiezmos: null,
  variacionOfrendas: -3.25,
};

const cumplimiento: CumplimientoBC = {
  metaGlobalAnual: 24000,
  metaGlobalMes: 2000,
  totalRecAnio: 12500,
  totalRecMesActual: 900,
  pctGlobal: 52.08,
  metaAcumuladaEsperada: 14000,
  cumplimientoDiezmadores: [
    { id: "d1", nombre: "Juan", apellido: "Pérez", zona: "Norte", planDiezmo: 200, metaAnual: 2400, total: 3000, regs: 12, pct: 125 },
    { id: "d2", nombre: "Ana", apellido: "Ruiz", zona: "Sur", planDiezmo: 0, metaAnual: 0, total: 0, regs: 0, pct: null },
  ],
  cumplimientoGrupos: [
    { id: "g1", nombre: "Grupo Vida", zona: "Sur", planOfrendasMensual: 150, metaAnual: 1800, total: 1200, regs: 6, pct: 66.67 },
  ],
  mensuales: meses.map((etiqueta, idx) => ({
    etiqueta, tipo: "mes", total: 900 + idx * 5, metaEsperada: 2000, pct: 45,
    idx, acumulado: (idx + 1) * 900, metaAcumulada: (idx + 1) * 2000, pctAcumulado: 45,
  })),
  trimestres: [1, 2, 3, 4].map((t) => ({ etiqueta: `Q${t}`, tipo: "trimestre", total: 3000, metaEsperada: 6000, pct: 50 })),
  semestres: [
    { etiqueta: "1er Semestre", tipo: "semestre", total: 6200, metaEsperada: 12000, pct: 51.7 },
    { etiqueta: "2do Semestre", tipo: "semestre", total: 6300, metaEsperada: 12000, pct: 52.5 },
  ],
  anual: { etiqueta: "2026", tipo: "año", total: 12500, metaEsperada: 24000, pct: 52.08 },
};

const datosReporte: ReporteDatos = {
  conv: { total: 14, mesActual: 14, integrados: 5, grupos: 3, personasUnicas: 11 },
  evang: { total: 4, contactos: 120, conversiones: 9 },
  academia: { cursos: 6, cursosActivos: 4, estudiantes: 21, certificados: 8 },
  finanzas: {
    diezmos: 9000, ofrendas: 3500, bienComunDiezmos: 7000, bienComunOfrendas: 2500,
    bienComunTotal: 9500, bienComunPlan: 2000, colaboradoresAyuda: 1000, colaboradoresMisiones: 500,
    colaboradoresManosAbiertas: 300, colaboradoresConstruccion: 800, colaboradoresOtro: 400,
    colaboradoresTotal: 3000, colaboradoresPlan: 1200, totalFinal: 12500, planMensual: 3200,
  },
  manos: { beneficiarios: 40, campanas: 2, entregas: 15, familias: 12, personas: 45 },
  negocios: { activos: 3, emprendedores: 3, ingresos: 1500 },
  comunicacion: { publicaciones: 10, alcance: 4200, engagement: 380 },
};

describe("Exportadores de Bien Común con la forma real de ResumenTab", () => {
  it("exportResumenGeneralPDF no lanza (lee diezmadoresActivosAnio)", () => {
    expect(() => exportResumenGeneralPDF({ resumenAnual, resumenCompleto, anio: "2026" })).not.toThrow();
  });

  it("exportResumenGeneralPDF tampoco lanza sin datos (mejorMes null)", () => {
    const vacio: ResumenCompletoBC = {
      ...resumenCompleto, mejorMes: null, topDiezmadores: [], topGrupos: [],
      diezmadoresActivosAnio: 0, totalAportes: 0, gruposConOfrenda: 0,
    };
    expect(() => exportResumenGeneralPDF({ resumenAnual: { total: 0, diezmos: 0, ofrendas: 0 }, resumenCompleto: vacio, anio: "2026" })).not.toThrow();
  });

  it("exportMetasPDF no lanza (lee cumplimientoDiezmadores)", () => {
    expect(() => exportMetasPDF({ cumplimiento, anio: "2026" })).not.toThrow();
  });

  it("exportCumplimientoPDF no lanza con el mismo cumplimiento", () => {
    expect(() => exportCumplimientoPDF({ cumplimiento, anio: "2026" })).not.toThrow();
  });

  it("exportReporteGeneralPDF no lanza con la forma de Reportes.datos", () => {
    expect(() => exportReporteGeneralPDF({ datos: datosReporte, periodo: "Enero 2026", desde: "2026-01-01", hasta: "2026-01-31" })).not.toThrow();
  });
});

describe("safeExport: ningún fallo de exportación queda en silencio", () => {
  const spy = vi.fn();
  beforeAll(() => setGlobalNotificationFn(spy));
  afterAll(() => setGlobalNotificationFn(null));

  it("avisa con toast de error si el exportador lanza", () => {
    spy.mockClear();
    safeExport(() => { throw new Error("boom"); });
    expect(spy).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("no avisa si el exportador termina bien", () => {
    spy.mockClear();
    safeExport(() => { /* ok */ });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("parseReporteResumen: parseo blindado del snapshot guardado", () => {
  it("un resumen completo conserva sus valores", () => {
    const r = parseReporteResumen(JSON.stringify(datosReporte));
    expect(r.conv.total).toBe(14);
    expect(r.finanzas.totalFinal).toBe(12500);
    expect(r.comunicacion.alcance).toBe(4200);
  });

  it("una sección ausente se rellena con ceros y el resto se conserva", () => {
    const parcial = { conv: { total: 3, mesActual: 3, integrados: 1, grupos: 2 } };
    const r = parseReporteResumen(JSON.stringify(parcial));
    expect(r.conv.total).toBe(3);
    expect(r.finanzas).toEqual(REPORTE_DATOS_VACIO.finanzas);
    expect(r.manos.entregas).toBe(0);
  });

  it("un campo ausente dentro de una sección se rellena con cero", () => {
    const r = parseReporteResumen(JSON.stringify({ finanzas: { totalFinal: 500 } }));
    expect(r.finanzas.totalFinal).toBe(500);
    expect(r.finanzas.bienComunTotal).toBe(0);
  });

  it("JSON dañado devuelve el snapshot vacío sin lanzar", () => {
    expect(() => parseReporteResumen("{esto no es json")).not.toThrow();
    expect(parseReporteResumen("{esto no es json")).toEqual(REPORTE_DATOS_VACIO);
  });

  it("resumen ausente devuelve el snapshot vacío", () => {
    expect(parseReporteResumen(null)).toEqual(REPORTE_DATOS_VACIO);
    expect(parseReporteResumen(undefined)).toEqual(REPORTE_DATOS_VACIO);
    expect(parseReporteResumen("")).toEqual(REPORTE_DATOS_VACIO);
  });
});

describe("F5 · el PDF de conversiones aplica de verdad los filtros que anuncia", () => {
  const conv = (id: string, estado: string, zona: string, fecha: string): Conversion =>
    ({ id, estado, zona, fecha } as Conversion);
  const todas: Conversion[] = [
    conv("c1", "ps-nuevo", "Norte", "2026-03-05"),
    conv("c2", "ps-apartado", "Sur", "2026-03-20"),
    conv("c3", "Apartado", "Sur", "2025-11-02"), // etiqueta legada: cuenta por identidad canónica
    conv("c4", "ps-integrado", "Norte", "2025-03-15"),
  ];

  it("sin filtros (o sin objeto de filtros) devuelve todo", () => {
    expect(conversionesFiltradasPDF(todas)).toHaveLength(4);
    expect(conversionesFiltradasPDF(todas, {})).toHaveLength(4);
  });

  it("por estado: compara por identidad canónica — la legada también entra", () => {
    const r = conversionesFiltradasPDF(todas, { estado: "ps-apartado" });
    expect(r.map((c) => c.id)).toEqual(["c2", "c3"]);
  });

  it("por zona, año y mes — combinados, como los pasa la página", () => {
    expect(conversionesFiltradasPDF(todas, { zona: "Norte" }).map((c) => c.id)).toEqual(["c1", "c4"]);
    expect(conversionesFiltradasPDF(todas, { ano: "2026" }).map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(conversionesFiltradasPDF(todas, { mes: "03" }).map((c) => c.id)).toEqual(["c1", "c2", "c4"]);
    expect(conversionesFiltradasPDF(todas, { estado: "ps-integrado", ano: "2026" })).toEqual([]);
    expect(conversionesFiltradasPDF(todas, { zona: "Sur", ano: "2025", mes: "11" }).map((c) => c.id)).toEqual(["c3"]);
  });
});
