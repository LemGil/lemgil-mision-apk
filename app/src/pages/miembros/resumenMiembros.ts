import { diasHastaCumple } from './constants';
import type { Miembro, Persona } from '../../lib/types';
import type { EscaleraMiembro } from '../../lib/pasosMiembro';

/**
 * La foto de Miembros (2026-11-17, auditoría con los criterios de
 * Secretaría): esta página muestra SOLO su proceso — la membresía —
 * y sus números cuadran con su lista y responden a sus filtros,
 * espejo de Misión. Funciones puras; la página las consume para la
 * barra resumen, las tarjetas del proceso, el filtro «Paso actual»,
 * la tarjeta de cumpleaños y el Directorio.
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

/**
 * Las tarjetas del proceso: para cada paso de la escalera, cuántas
 * de las escaleras dadas (las del segmento en pantalla) lo tienen
 * CUMPLIDO. Es el equivalente a las tarjetas por paso de Misión.
 */
export function conteoPasosCumplidos(escaleras: EscaleraMiembro[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of escaleras) {
    for (const ep of e.estados) {
      if (ep.cumplido) map.set(ep.paso.id, (map.get(ep.paso.id) ?? 0) + 1);
    }
  }
  return map;
}

/**
 * El filtro «Paso actual» del Directorio: sin filtro pasa todo;
 * 'completa' deja solo a quienes no tienen paso pendiente; un id de
 * paso deja a quienes están PARADOS en ese paso (su primer paso sin
 * cumplir) — donde cada uno está en su proceso, que es lo que se
 * trabaja.
 */
export function coincidePasoActual(escalera: EscaleraMiembro | undefined, filtro: string): boolean {
  if (!filtro) return true;
  if (!escalera) return false;
  if (filtro === 'completa') return escalera.actual === null;
  return escalera.actual?.id === filtro;
}
