import type { Conversion, Miembro, PasoSeguimiento } from './types';
import { PS_BAUTIZADO, PS_DISCIPULADO, PS_NUEVO, enCamino, idCanonico } from './pasosMision';

export interface ConteoGrupo {
  /** Miembros asignados al grupo con estado «Activo». */
  miembrosActivos: number;
  /** Conversiones en el paso de inicio (semilla «Nuevo»). */
  nuevo: number;
  /** Conversiones en el paso semilla «Discipulado». */
  discipulado: number;
  /** Conversiones en el paso semilla «Bautizado». */
  bautizado: number;
  /** miembrosActivos + TODAS las conversiones en camino (inicio + pasos intermedios, incluidos los pasos nuevos que la iglesia agregue). */
  totalAsignados: number;
}

/**
 * B4 — Conteo único de grupo.
 * Antes había tres fórmulas distintas (tarjeta de GruposTab, filtro de
 * estado de Misión y PDF de grupos). Esta es la única fuente: la ocupación
 * de un grupo la dan los miembros activos más las conversiones que aún
 * están en proceso. Integrado ya cuenta como miembro; Apartado y
 * Fallecido no ocupan silla.
 *
 * Fase 2: «en proceso» se razona por ROL del catálogo de pasos
 * (lib/pasosMision.ts: inicio o camino), no por la etiqueta — si la
 * iglesia agrega un paso intermedio, sus conversiones ocupan silla sin
 * tocar este código. El desglose nuevo/discipulado/bautizado sigue
 * anclado a las identidades de las semillas (la tarjeta de Grupos lo
 * pinta con esos tres nombres cortos). Sin catálogo a la mano se usa la
 * semilla por defecto de pasosMision.
 */
export function conteoGrupo(grupoId: string, miembros: Miembro[], conversiones: Conversion[], pasos?: PasoSeguimiento[]): ConteoGrupo {
  const miembrosActivos = miembros.filter((m) => m.grupoId === grupoId && m.estado === 'Activo').length;
  let nuevo = 0;
  let discipulado = 0;
  let bautizado = 0;
  let enProceso = 0;
  for (const c of conversiones) {
    if (c.grupoId !== grupoId) continue;
    if (enCamino(pasos, c.estado)) enProceso++;
    const id = idCanonico(c.estado);
    if (id === PS_NUEVO) nuevo++;
    else if (id === PS_DISCIPULADO) discipulado++;
    else if (id === PS_BAUTIZADO) bautizado++;
  }
  return {
    miembrosActivos,
    nuevo,
    discipulado,
    bautizado,
    totalAsignados: miembrosActivos + enProceso,
  };
}
