import { describe, it, expect } from "vitest";
import { conteoGrupo } from "./grupoStats";
import { PASOS_MISION_DEFECTO } from "./pasosMision";
import type { Conversion, Miembro, PasoSeguimiento } from "./types";

const miembro = (id: string, grupoId: string | null, estado: Miembro["estado"]): Miembro =>
  ({ id, grupoId, estado } as Miembro);
const conv = (id: string, grupoId: string, estado: Conversion["estado"]): Conversion =>
  ({ id, grupoId, estado } as Conversion);

describe("Conteo único de grupo (B4)", () => {
  const miembros: Miembro[] = [
    miembro("m1", "g1", "Activo"),
    miembro("m2", "g1", "Activo"),
    miembro("m3", "g1", "Inactivo"),
    miembro("m4", "g1", "Fallecido"),
    miembro("m5", "g2", "Activo"),
    miembro("m6", null, "Activo"),
  ];
  const conversiones: Conversion[] = [
    conv("c1", "g1", "ps-nuevo"),
    conv("c2", "g1", "ps-discipulado"),
    conv("c3", "g1", "ps-discipulado"),
    conv("c4", "g1", "ps-bautizado"),
    conv("c5", "g1", "ps-integrado"),
    conv("c6", "g1", "ps-apartado"),
    conv("c7", "g1", "ps-fallecido"),
    conv("c8", "g2", "ps-nuevo"),
  ];

  it("grupo mixto: total = miembros activos + conversiones en proceso", () => {
    const st = conteoGrupo("g1", miembros, conversiones);
    expect(st.miembrosActivos).toBe(2);
    expect(st.nuevo).toBe(1);
    expect(st.discipulado).toBe(2);
    expect(st.bautizado).toBe(1);
    // 2 activos + 1 nuevo + 2 discipulado + 1 bautizado; Integrado ya es
    // miembro, Apartado y Fallecido no ocupan silla.
    expect(st.totalAsignados).toBe(6);
  });

  it("otro grupo solo cuenta lo suyo", () => {
    const st = conteoGrupo("g2", miembros, conversiones);
    expect(st.miembrosActivos).toBe(1);
    expect(st.nuevo).toBe(1);
    expect(st.totalAsignados).toBe(2);
  });

  it("grupo sin nadie devuelve todo en cero", () => {
    const st = conteoGrupo("gX", miembros, conversiones);
    expect(st).toEqual({ miembrosActivos: 0, nuevo: 0, discipulado: 0, bautizado: 0, totalAsignados: 0 });
  });

  // F4: el conteo solo ve los pasos propios del camino si el LLAMADOR
  // pasa el catálogo vivo. La página Misión (filtro y tarjetas), el PDF
  // de grupos y el Panel ya lo pasan todos con la misma firma — esta
  // prueba fija el contrato: CON catálogo, la conversión en el paso
  // propio ocupa silla en el total (sin inflar el desglose semilla).
  it("F4 · con el catálogo pasado, una conversión en un paso PROPIO ocupa silla", () => {
    const pasoPropio: PasoSeguimiento = {
      id: "ps-formacion-inicial", ambito: "mision", nombre: "Formación inicial",
      emoji: "🌿", orden: 2.5, fuente: "manual", rol: "camino",
      creado: "2026-01-01T00:00:00.000Z", version: 1,
    };
    const catalogo = [...PASOS_MISION_DEFECTO, pasoPropio];
    const convs = [...conversiones, conv("c9", "g1", "ps-formacion-inicial")];

    const conCatalogo = conteoGrupo("g1", miembros, convs, catalogo);
    expect(conCatalogo.totalAsignados).toBe(7); // 6 de antes + la del paso propio
    expect(conCatalogo.nuevo + conCatalogo.discipulado + conCatalogo.bautizado).toBe(4);

    // Y la contradicción que F4 cerró: sin catálogo, esa misma
    // conversión NO ocupaba silla (Misión decía 6 y el Panel, 7).
    expect(conteoGrupo("g1", miembros, convs).totalAsignados).toBe(6);
  });
});
