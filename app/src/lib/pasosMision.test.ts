import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  PASOS_MISION_DEFECTO, PS_APARTADO, PS_BAUTIZADO, PS_DISCIPULADO, PS_FALLECIDO,
  PS_INTEGRADO, PS_NUEVO, badgeDe, colorDe, enCamino, esGozne, esInicio, esSalida,
  etiquetaDe, idCanonico, indiceEnRuta, pasoGozne, pasoInicio, rutaDe, salidasDe,
  siguientePaso, tipoHitoDe,
} from "./pasosMision";
import { conteoGrupo } from "./grupoStats";
import { situacionPersona, procesosVacios } from "./personaVista";
import { migrarEstadosAPasos } from "./migrate";
import { db } from "./database";
import type { Conversion, PasoSeguimiento } from "./types";

/** El catálogo de siempre, pero con dos pasos RENOMBRADOS por la iglesia. */
const renombrado: PasoSeguimiento[] = PASOS_MISION_DEFECTO.map((p) =>
  p.id === PS_INTEGRADO ? { ...p, nombre: "Incorporado" }
    : p.id === PS_DISCIPULADO ? { ...p, nombre: "Formación" }
      : p);

/** Un paso intermedio NUEVO, agregado por la iglesia entre Discipulado y Bautizado. */
const pasoNuevo: PasoSeguimiento = {
  id: "ps-formacion-inicial", ambito: "mision", nombre: "Formación inicial", emoji: "🌿",
  orden: 2.5, fuente: "manual", rol: "camino", creado: "2026-01-01T00:00:00.000Z", version: 1,
};
const conPasoNuevo: PasoSeguimiento[] = [...PASOS_MISION_DEFECTO, pasoNuevo];

describe("pasosMision: la ruta y los roles", () => {
  it("la ruta es inicio → camino → gozne, sin las salidas, en orden", () => {
    expect(rutaDe([]).map((p) => p.id)).toEqual([PS_NUEVO, PS_DISCIPULADO, PS_BAUTIZADO, PS_INTEGRADO]);
    expect(salidasDe([]).map((p) => p.id)).toEqual([PS_APARTADO, PS_FALLECIDO]);
    expect(pasoInicio([]).id).toBe(PS_NUEVO);
    expect(pasoGozne([])?.id).toBe(PS_INTEGRADO);
  });

  it("un catálogo desordenado se ordena por `orden`", () => {
    const desorden = [...PASOS_MISION_DEFECTO].reverse();
    expect(rutaDe(desorden).map((p) => p.id)).toEqual([PS_NUEVO, PS_DISCIPULADO, PS_BAUTIZADO, PS_INTEGRADO]);
  });

  it("esInicio / enCamino / esGozne / esSalida por rol", () => {
    expect(esInicio([], PS_NUEVO)).toBe(true);
    expect(enCamino([], PS_NUEVO)).toBe(true);
    expect(enCamino([], PS_DISCIPULADO)).toBe(true);
    expect(enCamino([], PS_INTEGRADO)).toBe(false);
    expect(esGozne([], PS_INTEGRADO)).toBe(true);
    expect(esSalida([], PS_APARTADO)).toBe(true);
    expect(esSalida([], PS_FALLECIDO)).toBe(true);
    expect(enCamino([], PS_APARTADO)).toBe(false);
    expect(esGozne([], "valor-desconocido")).toBe(false);
    expect(enCamino([], "valor-desconocido")).toBe(false);
  });

  it("siguientePaso camina la ruta y se detiene en el gozne, las salidas y lo desconocido", () => {
    expect(siguientePaso([], PS_NUEVO)?.id).toBe(PS_DISCIPULADO);
    expect(siguientePaso([], PS_BAUTIZADO)?.id).toBe(PS_INTEGRADO);
    expect(siguientePaso([], PS_INTEGRADO)).toBeNull();
    expect(siguientePaso([], PS_APARTADO)).toBeNull();
    expect(siguientePaso([], PS_FALLECIDO)).toBeNull();
    expect(siguientePaso([], "valor-desconocido")).toBeNull();
    expect(indiceEnRuta([], PS_BAUTIZADO)).toBe(2);
    expect(indiceEnRuta([], PS_APARTADO)).toBe(-1);
  });

  it("un paso de camino nuevo entra en la ruta, en su posición", () => {
    expect(rutaDe(conPasoNuevo).map((p) => p.id))
      .toEqual([PS_NUEVO, PS_DISCIPULADO, "ps-formacion-inicial", PS_BAUTIZADO, PS_INTEGRADO]);
    expect(enCamino(conPasoNuevo, "ps-formacion-inicial")).toBe(true);
    expect(siguientePaso(conPasoNuevo, PS_DISCIPULADO)?.id).toBe("ps-formacion-inicial");
    expect(siguientePaso(conPasoNuevo, "ps-formacion-inicial")?.id).toBe(PS_BAUTIZADO);
  });
});

describe("pasosMision: etiquetas, alias y presentación", () => {
  it("idCanonico traduce las etiquetas legadas (incluido «Seguimiento») y deja lo demás intacto", () => {
    expect(idCanonico("Nuevo")).toBe(PS_NUEVO);
    expect(idCanonico("Integrado")).toBe(PS_INTEGRADO);
    expect(idCanonico("Seguimiento")).toBe(PS_DISCIPULADO);
    expect(idCanonico(PS_INTEGRADO)).toBe(PS_INTEGRADO);
    expect(idCanonico("valor-desconocido")).toBe("valor-desconocido");
  });

  it("los predicados toleran la etiqueta legada (fichas sin migrar o sincronizadas de equipos viejos)", () => {
    expect(esGozne([], "Integrado")).toBe(true);
    expect(enCamino([], "Discipulado")).toBe(true);
    expect(esSalida([], "Apartado")).toBe(true);
    expect(siguientePaso([], "Bautizado")?.id).toBe(PS_INTEGRADO);
    expect(etiquetaDe([], "Integrado")).toBe("Integrado");
  });

  it("etiquetaDe resuelve la etiqueta VIVA y cae al propio valor si es desconocido", () => {
    expect(etiquetaDe([], PS_DISCIPULADO)).toBe("Discipulado");
    expect(etiquetaDe(renombrado, PS_DISCIPULADO)).toBe("Formación");
    expect(etiquetaDe(renombrado, PS_INTEGRADO)).toBe("Incorporado");
    expect(etiquetaDe([], "valor-desconocido")).toBe("valor-desconocido");
  });

  it("tipoHitoDe mapea las semillas al vocabulario fijo de hitos; lo demás es «Otro»", () => {
    expect(tipoHitoDe(PS_NUEVO)).toBe("Conversión");
    expect(tipoHitoDe(PS_DISCIPULADO)).toBe("Discipulado");
    expect(tipoHitoDe(PS_BAUTIZADO)).toBe("Bautismo");
    expect(tipoHitoDe(PS_INTEGRADO)).toBe("Integración");
    expect(tipoHitoDe("Integrado")).toBe("Integración");
    expect(tipoHitoDe("ps-formacion-inicial")).toBe("Otro");
    expect(tipoHitoDe(PS_APARTADO)).toBe("Otro");
  });

  it("badge y color de las semillas son los de siempre (constants.ts)", () => {
    expect(badgeDe([], PS_NUEVO)).toBe("badge-blue");
    expect(badgeDe([], PS_DISCIPULADO)).toBe("badge-yellow");
    expect(badgeDe([], PS_BAUTIZADO)).toBe("badge-green");
    expect(badgeDe([], PS_INTEGRADO)).toBe("badge-purple");
    expect(badgeDe([], PS_APARTADO)).toBe("badge-red");
    expect(badgeDe([], PS_FALLECIDO)).toBe("badge-gray");
    expect(colorDe([], PS_NUEVO)).toBe("var(--blue)");
    expect(colorDe([], PS_INTEGRADO)).toBe("var(--purple)");
    expect(colorDe([], PS_APARTADO)).toBe("var(--red)");
    expect(colorDe([], PS_FALLECIDO)).toBe("var(--dim)");
  });

  it("un paso nuevo toma badge y color de su posición en la ruta", () => {
    // «Formación inicial» queda en el índice 2 de la ruta → verde.
    expect(badgeDe(conPasoNuevo, "ps-formacion-inicial")).toBe("badge-green");
    expect(colorDe(conPasoNuevo, "ps-formacion-inicial")).toBe("var(--green)");
    expect(badgeDe([], "valor-desconocido")).toBe("badge-blue");
  });
});

describe("pasosMision: renombrar no cambia ningún conteo", () => {
  const conv = (id: string, grupoId: string, estado: string): Conversion =>
    ({ id, grupoId, estado } as Conversion);
  const conversiones: Conversion[] = [
    conv("c1", "g1", PS_NUEVO),
    conv("c2", "g1", PS_DISCIPULADO),
    conv("c3", "g1", PS_BAUTIZADO),
    conv("c4", "g1", PS_INTEGRADO),
    conv("c5", "g1", PS_APARTADO),
  ];

  it("conteoGrupo: mismos números con el catálogo renombrado", () => {
    const antes = conteoGrupo("g1", [], conversiones, PASOS_MISION_DEFECTO);
    const despues = conteoGrupo("g1", [], conversiones, renombrado);
    expect(despues).toEqual(antes);
    expect(antes).toEqual({ miembrosActivos: 0, nuevo: 1, discipulado: 1, bautizado: 1, totalAsignados: 3 });
  });

  it("conteoGrupo: un paso de camino nuevo cuenta como «en proceso» en el total, no en el desglose semilla", () => {
    const conNueva = [...conversiones, conv("c6", "g1", "ps-formacion-inicial")];
    const st = conteoGrupo("g1", [], conNueva, conPasoNuevo);
    expect(st.totalAsignados).toBe(4);
    expect(st.nuevo + st.discipulado + st.bautizado).toBe(3);
  });

  it("situacionPersona: el texto sigue a la etiqueta viva; el tono, no", () => {
    const g = { ...procesosVacios(), conversiones: [conv("c1", "", PS_INTEGRADO)] };
    expect(situacionPersona(g)).toEqual({ texto: "Integrado", tono: "ok" });
    expect(situacionPersona(g, renombrado)).toEqual({ texto: "Incorporado", tono: "ok" });
    const enProceso = { ...procesosVacios(), conversiones: [conv("c2", "", PS_DISCIPULADO)] };
    expect(situacionPersona(enProceso, renombrado)).toEqual({ texto: "Formación", tono: "info" });
  });
});

describe("migrarEstadosAPasos (Fase 2)", () => {
  const convBase = (over: Partial<Conversion> = {}): Conversion => ({
    id: "c1", nombre: "Ana", apellido: "Pérez", telefono: "", edad: "", direccion: "",
    familia: "No", fecha: "2024-01-15", zona: "Norte", grupoId: "", hermanoMayorId: null,
    email: "", profesion: "", bautizado: false, fechaBautismo: "", conyuge: "", hijos: "",
    estado: "Integrado", notas: "", historial: [], creado: "2024-01-15T00:00:00.000Z", version: 1,
    ...over,
  } as Conversion);

  beforeAll(async () => { await db.open(); });
  beforeEach(async () => {
    localStorage.clear();
    await db.conversiones.clear();
  });

  it("traduce estado e historial de etiqueta a identidad; lo desconocido queda intacto", async () => {
    await db.conversiones.add(convBase({
      historial: [
        { fecha: "2024-01-15", estado: "Nuevo", nota: "Registro inicial" },
        { fecha: "2024-03-01", estado: "Seguimiento", nota: "Nombre viejo" },
        { fecha: "2024-05-01", estado: "Integrado", nota: "Se integró" },
        { fecha: "2024-06-01", estado: "Etiqueta rara", nota: "No tocar" },
      ],
    }));
    await db.conversiones.add(convBase({ id: "c2", estado: "Apartado", historial: [] }));
    const cambios = await migrarEstadosAPasos();
    expect(cambios).toBe(2);
    const c1 = await db.conversiones.get("c1");
    expect(c1?.estado).toBe(PS_INTEGRADO);
    expect(c1?.historial.map((h) => h.estado)).toEqual([PS_NUEVO, PS_DISCIPULADO, PS_INTEGRADO, "Etiqueta rara"]);
    const c2 = await db.conversiones.get("c2");
    expect(c2?.estado).toBe(PS_APARTADO);
  });

  it("es idempotente: lo ya traducido no se vuelve a tocar (marca del pase)", async () => {
    await db.conversiones.add(convBase({}));
    expect(await migrarEstadosAPasos()).toBe(1);
    expect(await migrarEstadosAPasos()).toBe(0);
    const c1 = await db.conversiones.get("c1");
    expect(c1?.estado).toBe(PS_INTEGRADO);
  });

  it("una ficha que ya guarda identidad no cuenta como cambio", async () => {
    await db.conversiones.add(convBase({ estado: PS_BAUTIZADO, historial: [{ fecha: "2024-02-01", estado: PS_BAUTIZADO, nota: "" }] }));
    expect(await migrarEstadosAPasos()).toBe(0);
  });
});
