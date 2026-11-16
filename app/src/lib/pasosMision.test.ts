import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  PASOS_MISION_DEFECTO, PS_APARTADO, PS_BAUTIZADO, PS_CONGREGADO, PS_DISCIPULADO, PS_FALLECIDO,
  PS_INTEGRADO, PS_NUEVO, PS_TRASLADO, badgeDe, canonizarEstadoImportado, catalogoConCongregado, fusionarDuplicadosPorNombre, reapuntarEstado, colorDe,
  contarUsoPaso, enCamino, entradaCambioDeEstado, esGozne, esInicio, esSalida, estadoCoincideConFiltro,
  etiquetaConRespaldo, etiquetaDe, fechaDeConversion, idCanonico, indiceEnRuta, pasoGozne, pasoInicio, pasosPipeline,
  progresoEnRuta, rutaDe, salidasDe, seConvirtio, siguientePaso, tipoHitoDe, usoDelPaso,
} from "./pasosMision";
import { conteoGrupo } from "./grupoStats";
import { situacionPersona, procesosVacios } from "./personaVista";
import { ensurePasosMision, migrarEstadosAPasos, migrarRutaCongregados } from "./migrate";
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
  orden: 3.5, fuente: "manual", rol: "camino", creado: "2026-01-01T00:00:00.000Z", version: 1,
};
const conPasoNuevo: PasoSeguimiento[] = [...PASOS_MISION_DEFECTO, pasoNuevo];

describe("pasosMision: la ruta y los roles", () => {
  it("la ruta es inicio → camino → gozne, sin las salidas, en orden", () => {
    expect(rutaDe([]).map((p) => p.id)).toEqual([PS_CONGREGADO, PS_NUEVO, PS_DISCIPULADO, PS_BAUTIZADO, PS_INTEGRADO]);
    expect(salidasDe([]).map((p) => p.id)).toEqual([PS_APARTADO, PS_TRASLADO, PS_FALLECIDO]);
    expect(pasoInicio([]).id).toBe(PS_CONGREGADO);
    expect(pasoGozne([])?.id).toBe(PS_INTEGRADO);
  });

  it("un catálogo desordenado se ordena por `orden`", () => {
    const desorden = [...PASOS_MISION_DEFECTO].reverse();
    expect(rutaDe(desorden).map((p) => p.id)).toEqual([PS_CONGREGADO, PS_NUEVO, PS_DISCIPULADO, PS_BAUTIZADO, PS_INTEGRADO]);
  });

  it("esInicio / enCamino / esGozne / esSalida por rol", () => {
    expect(esInicio([], PS_CONGREGADO)).toBe(true);
    expect(esInicio([], PS_NUEVO)).toBe(false);
    expect(enCamino([], PS_CONGREGADO)).toBe(true);
    expect(enCamino([], PS_NUEVO)).toBe(true);
    expect(enCamino([], PS_DISCIPULADO)).toBe(true);
    expect(enCamino([], PS_INTEGRADO)).toBe(false);
    expect(esGozne([], PS_INTEGRADO)).toBe(true);
    expect(esSalida([], PS_APARTADO)).toBe(true);
    expect(esSalida([], PS_TRASLADO)).toBe(true);
    expect(esSalida([], PS_FALLECIDO)).toBe(true);
    expect(enCamino([], PS_APARTADO)).toBe(false);
    expect(enCamino([], PS_TRASLADO)).toBe(false);
    expect(esGozne([], "valor-desconocido")).toBe(false);
    expect(enCamino([], "valor-desconocido")).toBe(false);
  });

  it("siguientePaso camina la ruta y se detiene en el gozne, las salidas y lo desconocido", () => {
    expect(siguientePaso([], PS_CONGREGADO)?.id).toBe(PS_NUEVO);
    expect(siguientePaso([], PS_NUEVO)?.id).toBe(PS_DISCIPULADO);
    expect(siguientePaso([], PS_BAUTIZADO)?.id).toBe(PS_INTEGRADO);
    expect(siguientePaso([], PS_INTEGRADO)).toBeNull();
    expect(siguientePaso([], PS_APARTADO)).toBeNull();
    expect(siguientePaso([], PS_TRASLADO)).toBeNull();
    expect(siguientePaso([], PS_FALLECIDO)).toBeNull();
    expect(siguientePaso([], "valor-desconocido")).toBeNull();
    expect(indiceEnRuta([], PS_BAUTIZADO)).toBe(3);
    expect(indiceEnRuta([], PS_APARTADO)).toBe(-1);
  });

  it("un paso de camino nuevo entra en la ruta, en su posición", () => {
    expect(rutaDe(conPasoNuevo).map((p) => p.id))
      .toEqual([PS_CONGREGADO, PS_NUEVO, PS_DISCIPULADO, "ps-formacion-inicial", PS_BAUTIZADO, PS_INTEGRADO]);
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
    // Paridad de salidas: Traslado (y cualquier personalizada) registra
    // el mismo tipo de hito que Apartado/Fallecido al entrar: «Otro».
    expect(tipoHitoDe(PS_TRASLADO)).toBe("Otro");
  });

  it("badge y color de las semillas son los de siempre (constants.ts)", () => {
    expect(badgeDe([], PS_NUEVO)).toBe("badge-blue");
    expect(badgeDe([], PS_DISCIPULADO)).toBe("badge-yellow");
    expect(badgeDe([], PS_BAUTIZADO)).toBe("badge-green");
    expect(badgeDe([], PS_INTEGRADO)).toBe("badge-purple");
    expect(badgeDe([], PS_APARTADO)).toBe("badge-red");
    // Trasladado: el amarillo de su insignia en Miembros.
    expect(badgeDe([], PS_TRASLADO)).toBe("badge-yellow");
    expect(badgeDe([], PS_FALLECIDO)).toBe("badge-gray");
    expect(colorDe([], PS_NUEVO)).toBe("var(--blue)");
    expect(colorDe([], PS_INTEGRADO)).toBe("var(--purple)");
    expect(colorDe([], PS_APARTADO)).toBe("var(--red)");
    expect(colorDe([], PS_TRASLADO)).toBe("var(--yellow)");
    expect(colorDe([], PS_FALLECIDO)).toBe("var(--dim)");
  });

  it("un paso nuevo toma badge y color de su posición en la ruta", () => {
    // «Formación inicial» queda en el índice 3 de la ruta → púrpura.
    expect(badgeDe(conPasoNuevo, "ps-formacion-inicial")).toBe("badge-purple");
    expect(colorDe(conPasoNuevo, "ps-formacion-inicial")).toBe("var(--purple)");
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

  it("conteoGrupo: Traslado es salida — no ocupa silla ni cuenta en proceso", () => {
    const conTraslado = [...conversiones, conv("c7", "g1", PS_TRASLADO)];
    const st = conteoGrupo("g1", [], conTraslado, PASOS_MISION_DEFECTO);
    expect(st).toEqual({ miembrosActivos: 0, nuevo: 1, discipulado: 1, bautizado: 1, totalAsignados: 3 });
  });

  it("situacionPersona: el texto sigue a la etiqueta viva; el tono, no", () => {
    const g = { ...procesosVacios(), conversiones: [conv("c1", "", PS_INTEGRADO)] };
    expect(situacionPersona(g)).toEqual({ texto: "Integrado", tono: "ok" });
    expect(situacionPersona(g, renombrado)).toEqual({ texto: "Incorporado", tono: "ok" });
    const enProceso = { ...procesosVacios(), conversiones: [conv("c2", "", PS_DISCIPULADO)] };
    expect(situacionPersona(enProceso, renombrado)).toEqual({ texto: "Formación", tono: "info" });
  });
});

describe("pasosPipeline: la salida activa SÍ se marca", () => {
  const porId = (lista: ReturnType<typeof pasosPipeline>, id: string) => lista.find((s) => s.id === id)!;

  it("en Apartado: Apartado sale marcada con su color y Fallecido no; la ruta queda en reposo", () => {
    const lista = pasosPipeline([], PS_APARTADO);
    expect(porId(lista, PS_APARTADO).cls).toBe("step salida-activa");
    expect(porId(lista, PS_APARTADO).dotColor).toBe(colorDe([], PS_APARTADO));
    expect(porId(lista, PS_FALLECIDO).cls).toBe("step");
    expect(porId(lista, PS_FALLECIDO).dotColor).toBeUndefined();
    for (const id of [PS_NUEVO, PS_DISCIPULADO, PS_BAUTIZADO, PS_INTEGRADO]) {
      expect(porId(lista, id).cls).toBe("step");
      expect(porId(lista, id).dotColor).toBeUndefined();
    }
  });

  it("en Fallecido: al revés — Fallecido marcada con su color, Apartado plana", () => {
    const lista = pasosPipeline([], PS_FALLECIDO);
    expect(porId(lista, PS_FALLECIDO).cls).toBe("step salida-activa");
    expect(porId(lista, PS_FALLECIDO).dotColor).toBe(colorDe([], PS_FALLECIDO));
    expect(porId(lista, PS_APARTADO).cls).toBe("step");
    expect(porId(lista, PS_APARTADO).dotColor).toBeUndefined();
  });

  it("la selección pendiente (tempEst) de una salida se marca igual que el estado guardado", () => {
    // El detalle llama pasosPipeline(pasos, tempEst || estado): cuando el
    // usuario pincha Apartado sin guardar aún, `actual` ya es la salida.
    const lista = pasosPipeline([], PS_APARTADO);
    expect(porId(lista, PS_APARTADO).cls).toBe("step salida-activa");
    expect(porId(lista, PS_APARTADO).dotColor).toBeDefined();
  });

  it("también se marca si el estado llega con la etiqueta legada («Apartado»)", () => {
    const lista = pasosPipeline([], "Apartado");
    expect(porId(lista, PS_APARTADO).cls).toBe("step salida-activa");
  });

  it("en la ruta (Discipulado): done/active de siempre y las salidas sin marcar", () => {
    const lista = pasosPipeline([], PS_DISCIPULADO);
    expect(porId(lista, PS_NUEVO).cls).toBe("step done");
    expect(porId(lista, PS_DISCIPULADO).cls).toBe("step active");
    expect(porId(lista, PS_BAUTIZADO).cls).toBe("step");
    expect(porId(lista, PS_INTEGRADO).cls).toBe("step");
    for (const id of [PS_APARTADO, PS_FALLECIDO]) {
      expect(porId(lista, id).cls).toBe("step");
      expect(porId(lista, id).dotColor).toBeUndefined();
    }
  });

  it("en Traslado: la tercera salida de la casa se marca con SU color (amarillo)", () => {
    const lista = pasosPipeline([], PS_TRASLADO);
    expect(porId(lista, PS_TRASLADO).cls).toBe("step salida-activa");
    expect(porId(lista, PS_TRASLADO).dotColor).toBe("var(--yellow)");
    expect(porId(lista, PS_APARTADO).cls).toBe("step");
    expect(porId(lista, PS_FALLECIDO).cls).toBe("step");
  });

  it("una salida PERSONALIZADA del catálogo también se marca, con el color genérico de las salidas", () => {
    const propia: PasoSeguimiento = {
      id: "ps-salida-nueva", ambito: "mision", nombre: "Salida nueva", emoji: "🚪",
      orden: 8, fuente: "manual", rol: "salida", creado: "2026-01-01T00:00:00.000Z", version: 1,
    };
    const lista = pasosPipeline([...PASOS_MISION_DEFECTO, propia], "ps-salida-nueva");
    expect(porId(lista, "ps-salida-nueva").cls).toBe("step salida-activa");
    expect(porId(lista, "ps-salida-nueva").dotColor).toBe("var(--red)");
    expect(porId(lista, PS_APARTADO).cls).toBe("step");
  });
});

describe("contarUsoPaso: la guarda de borrado del editor", () => {
  it("cuenta por identidad: ids y etiquetas legadas del mismo paso suman igual", () => {
    const estados = [PS_APARTADO, "Apartado", PS_FALLECIDO, PS_NUEVO, PS_APARTADO];
    expect(contarUsoPaso(estados, PS_APARTADO)).toBe(3);
    expect(contarUsoPaso(estados, PS_FALLECIDO)).toBe(1);
    expect(contarUsoPaso(estados, PS_TRASLADO)).toBe(0);
  });

  it("una salida personalizada se cuenta por su id (sin alias posible)", () => {
    const estados = ["ps-mudanza", "ps-mudanza", PS_NUEVO];
    expect(contarUsoPaso(estados, "ps-mudanza")).toBe(2);
    expect(contarUsoPaso([], "ps-mudanza")).toBe(0);
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

describe("ensurePasosMision: Traslado entra sin romper el catálogo sembrado", () => {
  /**
   * El catálogo VIEJO (Fase 2 + Traslado, antes de Congregado): siete
   * pasos, con ps-nuevo como «Nuevo» de rol inicio y Fallecido en 7.
   */
  const catalogoViejo = (): PasoSeguimiento[] =>
    PASOS_MISION_DEFECTO
      .filter((p) => p.id !== PS_CONGREGADO)
      .map((p) => (p.id === PS_NUEVO ? { ...p, nombre: "Nuevo", rol: "inicio" as const, orden: 1 }
        : p.id === PS_FALLECIDO ? { ...p, orden: 7 }
          : { ...p, orden: p.orden - 1 }));

  beforeAll(async () => { await db.open(); });
  beforeEach(async () => { await db.pasosSeguimiento.clear(); });

  it("ámbito vacío: nace la semilla completa, con las salidas Apartado → Traslado → Fallecido", async () => {
    const pasos = await ensurePasosMision();
    expect(pasos).toHaveLength(8);
    expect(salidasDe(pasos).map((p) => [p.id, p.orden])).toEqual([
      [PS_APARTADO, 6], [PS_TRASLADO, 7], [PS_FALLECIDO, 8],
    ]);
  });

  it("instalación ya sembrada: Traslado toma el orden de Fallecido y éste sube uno; nombres intactos", async () => {
    const viejo = catalogoViejo()
      .filter((p) => p.id !== PS_TRASLADO)
      .map((p) => {
        if (p.id === PS_APARTADO) return { ...p, nombre: "Se apartó" };
        // Sin Traslado, Fallecido cerraba en 6 en la instalación vieja.
        if (p.id === PS_FALLECIDO) return { ...p, orden: 6 };
        return p;
      });
    await db.pasosSeguimiento.bulkAdd(viejo);
    const pasos = await ensurePasosMision();
    expect(pasos).toHaveLength(8);
    const porIdLocal = (id: string) => pasos.find((p) => p.id === id)!;
    expect(porIdLocal(PS_TRASLADO).orden).toBe(6);
    expect(porIdLocal(PS_TRASLADO).protegido).toBe(true);
    expect(porIdLocal(PS_FALLECIDO).orden).toBe(7);
    // Ni el nombre renombrado por la iglesia ni el orden de Apartado se tocan.
    expect(porIdLocal(PS_APARTADO).nombre).toBe("Se apartó");
    expect(porIdLocal(PS_APARTADO).orden).toBe(5);
    // Congregado también entra como protegido asegurado por id; el
    // renombre de ps-nuevo a «Converso» NO es trabajo del ensure (es
    // del pase migrarRutaCongregados): aquí sigue llamándose «Nuevo».
    expect(porIdLocal(PS_CONGREGADO).rol).toBe("inicio");
    expect(porIdLocal(PS_NUEVO).nombre).toBe("Nuevo");
    // Idempotente: un segundo pase no duplica ni vuelve a mover nada.
    const otra = await ensurePasosMision();
    expect(otra).toHaveLength(8);
    expect(otra.find((p) => p.id === PS_FALLECIDO)!.orden).toBe(7);
  });

  it("protegidos asegurados POR ID: si falta el gozne, vuelve; un camino borrado NO resucita", async () => {
    await db.pasosSeguimiento.bulkAdd(catalogoViejo());
    await ensurePasosMision();
    await db.pasosSeguimiento.delete(PS_INTEGRADO);
    await db.pasosSeguimiento.delete(PS_DISCIPULADO);
    const pasos = await ensurePasosMision();
    expect(pasos.some((p) => p.id === PS_INTEGRADO)).toBe(true);
    expect(pasos.some((p) => p.id === PS_DISCIPULADO)).toBe(false);
  });
});

describe("Bordes de la Fase 2 · F3: el filtro de estados compara por identidad canónica", () => {
  it("sin filtro pasa todo", () => {
    expect(estadoCoincideConFiltro(PS_APARTADO, "")).toBe(true);
    expect(estadoCoincideConFiltro("Apartado", "")).toBe(true);
  });

  it("una ficha con etiqueta legada SÍ aparece en su filtro (antes sumaba en el KPI y desaparecía de la lista)", () => {
    expect(estadoCoincideConFiltro("Apartado", PS_APARTADO)).toBe(true);
    expect(estadoCoincideConFiltro("Discipulado", PS_DISCIPULADO)).toBe(true);
    expect(estadoCoincideConFiltro("Seguimiento", PS_DISCIPULADO)).toBe(true);
  });

  it("ids contra ids, y lo distinto no pasa", () => {
    expect(estadoCoincideConFiltro(PS_APARTADO, PS_APARTADO)).toBe(true);
    expect(estadoCoincideConFiltro(PS_NUEVO, PS_APARTADO)).toBe(false);
    expect(estadoCoincideConFiltro("Apartado", PS_FALLECIDO)).toBe(false);
  });
});

describe("Bordes de la Fase 2 · F2: canonizar el estado que vuelve por CSV", () => {
  it("un id válido pasa tal cual", () => {
    expect(canonizarEstadoImportado(PASOS_MISION_DEFECTO, PS_BAUTIZADO))
      .toEqual({ estado: PS_BAUTIZADO, reconocido: true });
    expect(canonizarEstadoImportado([], PS_NUEVO))
      .toEqual({ estado: PS_NUEVO, reconocido: true });
  });

  it("la etiqueta viva (lo que el export escribe) encuentra su paso por nombre", () => {
    expect(canonizarEstadoImportado(PASOS_MISION_DEFECTO, "Discipulado"))
      .toEqual({ estado: PS_DISCIPULADO, reconocido: true });
    expect(canonizarEstadoImportado(PASOS_MISION_DEFECTO, "Trasladado"))
      .toEqual({ estado: PS_TRASLADO, reconocido: true });
  });

  it("tras RENOMBRAR un paso, el export viejo (etiqueta anterior) llega por el alias legado", () => {
    // El catálogo `renombrado` llama «Formación» a ps-discipulado: el CSV
    // exportado ANTES del renombre dice «Discipulado» y debe aterrizar
    // en el mismo paso; el export NUEVO dice «Formación» y llega por nombre.
    expect(canonizarEstadoImportado(renombrado, "Discipulado"))
      .toEqual({ estado: PS_DISCIPULADO, reconocido: true });
    expect(canonizarEstadoImportado(renombrado, "Formación"))
      .toEqual({ estado: PS_DISCIPULADO, reconocido: true });
    expect(canonizarEstadoImportado(renombrado, "Incorporado"))
      .toEqual({ estado: PS_INTEGRADO, reconocido: true });
  });

  it("un paso creado por la iglesia se encuentra por SU nombre", () => {
    expect(canonizarEstadoImportado(conPasoNuevo, "Formación inicial"))
      .toEqual({ estado: "ps-formacion-inicial", reconocido: true });
  });

  it("lo no reconocido nace en el inicio y se declara NO reconocido (nada de éxito silencioso)", () => {
    expect(canonizarEstadoImportado(PASOS_MISION_DEFECTO, "Crecimiento"))
      .toEqual({ estado: PS_CONGREGADO, reconocido: false });
    expect(canonizarEstadoImportado(PASOS_MISION_DEFECTO, ""))
      .toEqual({ estado: PS_CONGREGADO, reconocido: false });
  });
});

describe("Bordes de la Fase 2 · F6: el progreso se mide DENTRO de la ruta", () => {
  it("la ruta semilla tiene 5 pasos: Congregado 20 %, Integrado 100 % (antes: 57 %, «paso 4 de 7»)", () => {
    expect(progresoEnRuta([], PS_CONGREGADO)).toEqual({ porcentaje: 20, rotulo: "paso 1 de 5" });
    expect(progresoEnRuta([], PS_NUEVO)).toEqual({ porcentaje: 40, rotulo: "paso 2 de 5" });
    expect(progresoEnRuta([], PS_DISCIPULADO)).toEqual({ porcentaje: 60, rotulo: "paso 3 de 5" });
    expect(progresoEnRuta([], PS_INTEGRADO)).toEqual({ porcentaje: 100, rotulo: "paso 5 de 5" });
  });

  it("tolera la etiqueta legada", () => {
    expect(progresoEnRuta([], "Integrado")).toEqual({ porcentaje: 100, rotulo: "paso 5 de 5" });
  });

  it("en una salida no hay porcentaje engañoso: 0 y el rótulo es la etiqueta del estado", () => {
    expect(progresoEnRuta([], PS_APARTADO)).toEqual({ porcentaje: 0, rotulo: "Apartado" });
    expect(progresoEnRuta([], PS_FALLECIDO)).toEqual({ porcentaje: 0, rotulo: "Fallecido" });
    expect(progresoEnRuta(renombrado, PS_APARTADO)).toEqual({ porcentaje: 0, rotulo: "Apartado" });
  });

  it("un estado desconocido: 0 y el propio valor como rótulo", () => {
    expect(progresoEnRuta([], "ps-que-ya-no-existe")).toEqual({ porcentaje: 0, rotulo: "ps-que-ya-no-existe" });
  });

  it("el denominador crece con los pasos propios del camino, no con las salidas", () => {
    expect(progresoEnRuta(conPasoNuevo, "ps-formacion-inicial"))
      .toEqual({ porcentaje: 67, rotulo: "paso 4 de 6" });
    expect(progresoEnRuta(conPasoNuevo, PS_INTEGRADO))
      .toEqual({ porcentaje: 100, rotulo: "paso 6 de 6" });
  });
});

describe("Pulido · F7: usoDelPaso — la guarda de borrado también cuenta el historial", () => {
  const conv = (over: Partial<Conversion>): Conversion =>
    ({ id: "c", estado: PS_NUEVO, historial: [], ...over } as unknown as Conversion);

  it("cuenta por separado: quién está en el paso y quién solo lo menciona en su historial", () => {
    const convs = [
      conv({ id: "c1", estado: PS_DISCIPULADO, historial: [{ fecha: "2026-01-02", estado: "ps-discipulado", nota: "" }] }),
      conv({ id: "c2", estado: "Discipulado" }), // etiqueta legada: cuenta como EN el paso
      conv({ id: "c3", estado: PS_BAUTIZADO, historial: [{ fecha: "2026-01-02", estado: "Discipulado", nota: "" }] }), // pasó por él (etiqueta legada)
      conv({ id: "c4", estado: PS_INTEGRADO, historial: [{ fecha: "2026-01-02", estado: "ps-discipulado", nota: "" }, { fecha: "2026-02-02", estado: "ps-discipulado", nota: "" }] }), // dos menciones, UNA conversión
      conv({ id: "c5", estado: PS_NUEVO, historial: [] }),
    ];
    expect(usoDelPaso(convs, PS_DISCIPULADO)).toEqual({ enElPaso: 2, enHistorial: 2 });
  });

  it("quien está en el paso no se duplica en el conteo del historial", () => {
    const convs = [conv({ estado: PS_APARTADO, historial: [{ fecha: "2026-01-02", estado: "Apartado", nota: "" }] })];
    expect(usoDelPaso(convs, PS_APARTADO)).toEqual({ enElPaso: 1, enHistorial: 0 });
  });

  it("sin uso de ninguna clase: ambos conteos en cero (el borrado procede)", () => {
    const convs = [conv({ estado: PS_NUEVO, historial: [{ fecha: "2026-01-02", estado: "ps-nuevo", nota: "" }] })];
    expect(usoDelPaso(convs, "ps-formacion-inicial")).toEqual({ enElPaso: 0, enHistorial: 0 });
    expect(usoDelPaso([], PS_NUEVO)).toEqual({ enElPaso: 0, enHistorial: 0 });
  });

  it("tolera conversiones sin historial (las importadas antes de F1)", () => {
    const sinHist = { id: "c9", estado: PS_NUEVO } as unknown as Conversion;
    expect(usoDelPaso([sinHist], PS_DISCIPULADO)).toEqual({ enElPaso: 0, enHistorial: 0 });
  });
});

describe("Pulido · F8: etiquetaConRespaldo — un KPI nunca titula un id crudo", () => {
  const sinDiscipulado = PASOS_MISION_DEFECTO.filter((p) => p.id !== PS_DISCIPULADO);
  const sinBautizado = PASOS_MISION_DEFECTO.filter((p) => p.id !== PS_BAUTIZADO);

  it("con el paso en el catálogo, manda el nombre VIVO (renombrado incluido)", () => {
    expect(etiquetaConRespaldo(renombrado, PS_DISCIPULADO)).toBe("Formación");
    expect(etiquetaConRespaldo([], PS_DISCIPULADO)).toBe("Discipulado");
  });

  it("con el paso BORRADO, cae al nombre histórico de la semilla — nunca «ps-discipulado»", () => {
    expect(etiquetaConRespaldo(sinDiscipulado, PS_DISCIPULADO)).toBe("Discipulado");
    expect(etiquetaConRespaldo(sinBautizado, PS_BAUTIZADO)).toBe("Bautizado");
    expect(etiquetaConRespaldo(sinDiscipulado, "Discipulado")).toBe("Discipulado"); // etiqueta legada también
  });

  it("un id desconocido sin respaldo posible devuelve el propio valor", () => {
    expect(etiquetaConRespaldo([], "ps-inventado")).toBe("ps-inventado");
  });
});

describe("Pulido · F10: entradaCambioDeEstado — el cambio por formulario deja entrada", () => {
  it("si el estado cambió, la entrada lleva hoy, el estado canónico y la nota «Estado: X → Y»", () => {
    expect(entradaCambioDeEstado([], PS_NUEVO, PS_DISCIPULADO, "2026-11-06"))
      .toEqual({ fecha: "2026-11-06", estado: "ps-discipulado", nota: "Estado: Converso → Discipulado" });
    expect(entradaCambioDeEstado(renombrado, "Discipulado", "ps-integrado", "2026-11-06"))
      .toEqual({ fecha: "2026-11-06", estado: "ps-integrado", nota: "Estado: Formación → Incorporado" });
  });

  it("sin cambio real no hay entrada (ni por etiqueta legada equivalente, ni sin estado previo)", () => {
    expect(entradaCambioDeEstado([], PS_DISCIPULADO, PS_DISCIPULADO, "2026-11-06")).toBeNull();
    expect(entradaCambioDeEstado([], "Discipulado", PS_DISCIPULADO, "2026-11-06")).toBeNull();
    expect(entradaCambioDeEstado([], "", PS_NUEVO, "2026-11-06")).toBeNull();
  });
});

describe("Congregado → Converso: la conversión es el AVANCE (2026-11-15)", () => {
  const conv = (over: Partial<Conversion>): Conversion =>
    ({ id: "c", fecha: "2026-01-10", estado: PS_CONGREGADO, historial: [], ...over } as unknown as Conversion);

  it("quien sigue en Congregado NO se ha convertido, aunque lleve tiempo en la lista", () => {
    const c = conv({});
    expect(seConvirtio(c)).toBe(false);
    expect(fechaDeConversion(c)).toBe("");
  });

  it("quien nació en Converso (registro inicial) se convirtió en su fecha de registro", () => {
    const c = conv({ estado: PS_NUEVO, historial: [{ fecha: "2026-01-10", estado: PS_NUEVO, nota: "Registro inicial" }] });
    expect(seConvirtio(c)).toBe(true);
    expect(fechaDeConversion(c)).toBe("2026-01-10");
  });

  it("el avance Congregado → Converso deja su fecha en el historial, y esa manda", () => {
    const c = conv({
      fecha: "2026-01-10", estado: PS_DISCIPULADO,
      historial: [
        { fecha: "2026-02-01", estado: PS_NUEVO, nota: "Estado: Congregado → Converso" },
        { fecha: "2026-03-01", estado: PS_DISCIPULADO, nota: "" },
      ],
    });
    expect(seConvirtio(c)).toBe(true);
    expect(fechaDeConversion(c)).toBe("2026-02-01");
  });

  it("quien se convirtió y hoy está apartado SÍ cuenta como conversión (la hubo)", () => {
    const c = conv({
      estado: PS_APARTADO,
      historial: [{ fecha: "2026-02-01", estado: PS_NUEVO, nota: "" }],
    });
    expect(seConvirtio(c)).toBe(true);
    expect(fechaDeConversion(c)).toBe("2026-02-01");
  });

  it("quien salió de Congregado directo a una salida NUNCA se convirtió", () => {
    const c = conv({ estado: PS_APARTADO, historial: [] });
    expect(seConvirtio(c)).toBe(false);
    expect(fechaDeConversion(c)).toBe("");
  });

  it("las fichas viejas (nacidas en «Nuevo» sin historial) se convirtieron en su fecha", () => {
    const vieja = conv({ fecha: "2024-05-20", estado: PS_INTEGRADO, historial: [] });
    expect(seConvirtio(vieja)).toBe(true);
    expect(fechaDeConversion(vieja)).toBe("2024-05-20");
    const viejaEtiqueta = conv({ fecha: "2024-05-20", estado: "Discipulado", historial: [] });
    expect(seConvirtio(viejaEtiqueta)).toBe(true);
  });
});

describe("catalogoConCongregado: la transformación pura del catálogo vivo", () => {
  /** El catálogo de producción ANTES del cambio (con Traslado, sin Congregado). */
  const catalogoAnterior = (): PasoSeguimiento[] =>
    PASOS_MISION_DEFECTO
      .filter((p) => p.id !== PS_CONGREGADO)
      .map((p) => (p.id === PS_NUEVO ? { ...p, nombre: "Nuevo", rol: "inicio" as const, orden: 1 }
        : p.id === PS_FALLECIDO ? { ...p, orden: 7 }
          : { ...p, orden: p.orden - 1 }));

  it("Congregado abre la ruta como inicio; ps-nuevo pasa a «Converso» en el camino", () => {
    const nuevo = catalogoConCongregado(catalogoAnterior());
    expect(nuevo.map((p) => p.id)).toEqual([
      PS_CONGREGADO, PS_NUEVO, PS_DISCIPULADO, PS_BAUTIZADO, PS_INTEGRADO,
      PS_APARTADO, PS_TRASLADO, PS_FALLECIDO,
    ]);
    expect(nuevo.map((p) => p.orden)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(nuevo[0]).toMatchObject({ nombre: "Congregado", rol: "inicio", protegido: true });
    expect(nuevo[1]).toMatchObject({ nombre: "Converso", rol: "camino" });
    expect(rutaDe(nuevo).map((p) => p.id)).toEqual([PS_CONGREGADO, PS_NUEVO, PS_DISCIPULADO, PS_BAUTIZADO, PS_INTEGRADO]);
    expect(pasoInicio(nuevo).id).toBe(PS_CONGREGADO);
  });

  it("un renombre propio de la iglesia sobre ps-nuevo se respeta; el rol sí se corrige", () => {
    const propio = catalogoAnterior().map((p) => (p.id === PS_NUEVO ? { ...p, nombre: "Convertido" } : p));
    const nuevo = catalogoConCongregado(propio);
    expect(nuevo.find((p) => p.id === PS_NUEVO)).toMatchObject({ nombre: "Convertido", rol: "camino" });
  });

  it("es idempotente sobre el catálogo ya nuevo (la semilla misma)", () => {
    const otra = catalogoConCongregado(PASOS_MISION_DEFECTO);
    expect(otra.map((p) => [p.id, p.nombre, p.rol, p.orden]))
      .toEqual(PASOS_MISION_DEFECTO.map((p) => [p.id, p.nombre, p.rol, p.orden]));
  });

  it("catálogo vacío: nada que transformar (la semilla fresca ya nace nueva)", () => {
    expect(catalogoConCongregado([])).toEqual([]);
  });
});

describe("migrarRutaCongregados: el pase sobre la base", () => {
  const catalogoAnterior = (): PasoSeguimiento[] =>
    PASOS_MISION_DEFECTO
      .filter((p) => p.id !== PS_CONGREGADO)
      .map((p) => (p.id === PS_NUEVO ? { ...p, nombre: "Nuevo", rol: "inicio" as const, orden: 1, creado: "2026-01-01T00:00:00.000Z" }
        : p.id === PS_FALLECIDO ? { ...p, orden: 7, creado: "2026-01-01T00:00:00.000Z" }
          : { ...p, orden: p.orden - 1, creado: "2026-01-01T00:00:00.000Z" }));

  beforeAll(async () => { await db.open(); });
  beforeEach(async () => {
    localStorage.clear();
    await db.pasosSeguimiento.clear();
  });

  it("lleva el catálogo viejo a la ruta nueva y no vuelve a tocarlo", async () => {
    await db.pasosSeguimiento.bulkAdd(catalogoAnterior());
    const cambios = await migrarRutaCongregados();
    expect(cambios).toBeGreaterThan(0);
    const pasos = await db.pasosSeguimiento.where("ambito").equals("mision").toArray();
    expect(pasos).toHaveLength(8);
    const porIdLocal = (id: string) => pasos.find((p) => p.id === id)!;
    expect(porIdLocal(PS_CONGREGADO)).toMatchObject({ nombre: "Congregado", rol: "inicio", orden: 1 });
    expect(porIdLocal(PS_NUEVO)).toMatchObject({ nombre: "Converso", rol: "camino", orden: 2 });
    expect(porIdLocal(PS_FALLECIDO).orden).toBe(8);
    expect(await migrarRutaCongregados()).toBe(0);
  });
});

describe("fusionarDuplicadosPorNombre: el «Congregado» dos veces en la ficha", () => {
  const paso = (over: Partial<PasoSeguimiento>): PasoSeguimiento => ({
    id: "uuid-x", ambito: "mision", nombre: "Congregado", emoji: "🙏", orden: 9,
    fuente: "manual", rol: "camino", creado: "2026-06-01T00:00:00.000Z", version: 1, ...over,
  });

  it("la semilla ps-congregado sobrevive y la fila repetida se reapunta a ella", () => {
    const catalogo = [...PASOS_MISION_DEFECTO, paso({ id: "uuid-dup" })];
    const { fusiones, catalogo: limpio } = fusionarDuplicadosPorNombre(catalogo);
    expect(fusiones.get("uuid-dup")).toBe(PS_CONGREGADO);
    expect(limpio.filter((p) => p.nombre === "Congregado")).toHaveLength(1);
    expect(limpio).toHaveLength(catalogo.length - 1);
    expect(reapuntarEstado("uuid-dup", fusiones)).toBe(PS_CONGREGADO);
    expect(reapuntarEstado(PS_CONGREGADO, fusiones)).toBe(PS_CONGREGADO);
    expect(reapuntarEstado("ps-discipulado", fusiones)).toBe("ps-discipulado");
  });

  it("el nombre se compara sin mayúsculas ni espacios de más", () => {
    const { fusiones } = fusionarDuplicadosPorNombre([
      ...PASOS_MISION_DEFECTO,
      paso({ id: "uuid-dup", nombre: "  congregado " }),
    ]);
    expect(fusiones.get("uuid-dup")).toBe(PS_CONGREGADO);
  });

  it("sin semilla en el grupo gana el protegido; si no, el de menor orden", () => {
    const a = paso({ id: "uuid-a", nombre: "Ayuno", orden: 3, protegido: false });
    const b = paso({ id: "uuid-b", nombre: "Ayuno", orden: 5, protegido: true });
    expect(fusionarDuplicadosPorNombre([a, b]).fusiones.get("uuid-a")).toBe("uuid-b");
    const c = paso({ id: "uuid-c", nombre: "Vigilia", orden: 2 });
    const d = paso({ id: "uuid-d", nombre: "Vigilia", orden: 4 });
    expect(fusionarDuplicadosPorNombre([c, d]).fusiones.get("uuid-d")).toBe("uuid-c");
  });

  it("sin duplicados no toca nada, y el ámbito miembro queda fuera", () => {
    const { fusiones, catalogo } = fusionarDuplicadosPorNombre(PASOS_MISION_DEFECTO);
    expect(fusiones.size).toBe(0);
    expect(catalogo).toHaveLength(PASOS_MISION_DEFECTO.length);
    const miembrosDup = [
      paso({ id: "pm-a", ambito: "miembro", nombre: "Grupo" }),
      paso({ id: "pm-b", ambito: "miembro", nombre: "Grupo" }),
    ];
    expect(fusionarDuplicadosPorNombre(miembrosDup).fusiones.size).toBe(0);
  });
});
