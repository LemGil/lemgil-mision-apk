import { diasHastaCumple } from './constants';
import type { Miembro, MiembroMinisterio, Persona } from '../../lib/types';

/**
 * La foto de Miembros (2026-11-17, auditoría con los criterios de
 * Secretaría): esta página muestra SOLO su proceso — la membresía —
 * y sus números cuadran con su lista. Funciones puras; la página las
 * consume para la barra resumen, la tarjeta de cumpleaños y el
 * Directorio.
 */

/** Estados de salida de la membresía: la persona ya no está en la casa. */
export function esSalidaMiembro(estado: string): boolean {
  return estado === 'Trasladado' || estado === 'Fallecido';
}

/**
 * Estados que siguen «en la casa» a efectos de cumpleaños: Activo,
 * Inactivo y Disciplinado se pastorean; el Trasladado ya es de otra
 * congregación y el Fallecido está en memoria.
 */
const ESTADOS_EN_CASA = ['Activo', 'Inactivo', 'Disciplinado'];

/** Personas (por id) con ficha de miembro vigente en la casa. */
export function idsMiembrosEnCasa(miembros: Miembro[]): Set<string> {
  return new Set(
    miembros
      .filter((m) => ESTADOS_EN_CASA.includes(m.estado) && m.personaId)
      .map((m) => m.personaId as string),
  );
}

/**
 * Próximos cumpleaños (30 días) SOLO de miembros: la fecha nace en
 * la persona, pero el alcance es la membresía — el cumpleaños de
 * TODAS las personas es información general y vive en el Panel.
 */
export function cumplesDeMiembros(personas: Persona[], miembros: Miembro[]): { p: Persona; dias: number | null }[] {
  const ids = idsMiembrosEnCasa(miembros);
  return personas
    .filter((p) => ids.has(p.id))
    .map((p) => ({ p, dias: diasHastaCumple(p.fechaNacimiento) }))
    .filter((x) => x.dias !== null && x.dias <= 30)
    .sort((a, b) => (a.dias || 0) - (b.dias || 0));
}

export interface FotoEscalera {
  enGrupo: number;
  sirviendo: number;
  conHermanoMayor: number;
  bautizados: number;
}

/**
 * La escalera de integración como foto de la página, sobre los
 * miembros ACTIVOS (las vistas ya traen grupo, hermano mayor y
 * bautismo resueltos desde la persona): cuántos están en grupo,
 * cuántos sirven en algún ministerio, cuántos tienen hermano mayor
 * y cuántos están bautizados. Es el equivalente a las tarjetas por
 * paso de Misión: la salud del proceso sin abrir ficha por ficha.
 */
export function fotoEscalera(miembros: Miembro[], asignaciones: MiembroMinisterio[]): FotoEscalera {
  const activos = miembros.filter((m) => m.estado === 'Activo');
  const sirviendoIds = new Set(asignaciones.map((a) => a.miembroId));
  return {
    enGrupo: activos.filter((m) => m.grupoId).length,
    sirviendo: activos.filter((m) => sirviendoIds.has(m.id)).length,
    conHermanoMayor: activos.filter((m) => m.hermanoMayorId).length,
    bautizados: activos.filter((m) => m.bautizado).length,
  };
}
