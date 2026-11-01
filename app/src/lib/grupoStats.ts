import type { Conversion, Miembro } from './types';

export interface ConteoGrupo {
  /** Miembros asignados al grupo con estado «Activo». */
  miembrosActivos: number;
  /** Conversiones en proceso asignadas al grupo, por etapa. */
  nuevo: number;
  discipulado: number;
  bautizado: number;
  /** miembrosActivos + conversiones en Nuevo/Discipulado/Bautizado. */
  totalAsignados: number;
}

/**
 * B4 — Conteo único de grupo.
 * Antes había tres fórmulas distintas (tarjeta de GruposTab, filtro de
 * estado de Misión y PDF de grupos). Esta es la única fuente: la ocupación
 * de un grupo la dan los miembros activos más las conversiones que aún
 * están en proceso (Nuevo, Discipulado, Bautizado). Integrado ya cuenta
 * como miembro; Apartado y Fallecido no ocupan silla.
 */
export function conteoGrupo(grupoId: string, miembros: Miembro[], conversiones: Conversion[]): ConteoGrupo {
  const miembrosActivos = miembros.filter((m) => m.grupoId === grupoId && m.estado === 'Activo').length;
  let nuevo = 0;
  let discipulado = 0;
  let bautizado = 0;
  for (const c of conversiones) {
    if (c.grupoId !== grupoId) continue;
    if (c.estado === 'Nuevo') nuevo++;
    else if (c.estado === 'Discipulado') discipulado++;
    else if (c.estado === 'Bautizado') bautizado++;
  }
  return {
    miembrosActivos,
    nuevo,
    discipulado,
    bautizado,
    totalAsignados: miembrosActivos + nuevo + discipulado + bautizado,
  };
}
