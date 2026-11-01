import { describe, it, expect } from "vitest";
import { conteoGrupo } from "./grupoStats";
import type { Conversion, Miembro } from "./types";

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
    conv("c1", "g1", "Nuevo"),
    conv("c2", "g1", "Discipulado"),
    conv("c3", "g1", "Discipulado"),
    conv("c4", "g1", "Bautizado"),
    conv("c5", "g1", "Integrado"),
    conv("c6", "g1", "Apartado"),
    conv("c7", "g1", "Fallecido"),
    conv("c8", "g2", "Nuevo"),
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
});
