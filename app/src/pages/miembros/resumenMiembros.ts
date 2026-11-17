import { diasHastaCumple } from './constants';
import type { Miembro, PasoSeguimiento, Persona } from '../../lib/types';
import type { EscaleraMiembro } from '../../lib/pasosMiembro';

/**
 * La foto de Miembros (2026-11-17, criterios de Secretaría y
 * corrección de LemGil): esta página muestra SOLO su proceso — la
 * membresía. Las tarjetas son la FOTO COMPLETA (no bailan con los
 * filtros del Directorio, que mueven solo la lista); el filtro
 * «Pendientes de:» da la lista que se trabaja; los cumpleaños son
 * SOLO de miembros. Funciones puras.
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

export interface TarjetasMiembros {
  activos: number;
  inactivos: number;
  trasladados: number;
  fallecidos: number;
  disciplinados: number;
  enGrupo: number;
  diezmadores: number;
  enAcademia: number;
  sirviendo: number;
  conHermanoMayor: number;
  lideres: number;
}

/**
 * Las tarjetas de la página, con la lista que pidió LemGil: los
 * ESTADOS cuentan sobre TODAS las fichas (la foto completa, con las
 * salidas a la vista) y los ATRIBUTOS sobre los miembros ACTIVOS —
 * en grupo, diezmando, en la Academia, sirviendo, con hermano mayor
 * y líderes (la escalera dice quién cumplió cada paso; el hermano
 * mayor es el que TIENE asignado, dato de la persona). Integrados y
 * Bautizados NO son tarjetas de esta página: nadie llega a miembro
 * sin bautizarse e integrarse — son el logro final de Misión.
 */
export function tarjetasDeMiembros(
  miembros: Miembro[],
  escaleras: Map<string, EscaleraMiembro>,
  personaIdsDiezmadores: Set<string>,
): TarjetasMiembros {
  const cuenta = (estado: string) => miembros.filter((m) => m.estado === estado).length;
  const activos = miembros.filter((m) => m.estado === 'Activo');
  const cumplido = (m: Miembro, pred: (p: PasoSeguimiento) => boolean) => {
    const e = escaleras.get(m.id);
    return !!e && e.estados.some((ep) => pred(ep.paso) && ep.cumplido);
  };
  return {
    activos: activos.length,
    inactivos: cuenta('Inactivo'),
    trasladados: cuenta('Trasladado'),
    fallecidos: cuenta('Fallecido'),
    disciplinados: cuenta('Disciplinado'),
    enGrupo: activos.filter((m) => cumplido(m, (p) => p.fuente === 'grupo')).length,
    diezmadores: activos.filter((m) => !!m.personaId && personaIdsDiezmadores.has(m.personaId)).length,
    enAcademia: activos.filter((m) => cumplido(m, (p) => p.fuente === 'academia')).length,
    sirviendo: activos.filter((m) => cumplido(m, (p) => p.fuente === 'ministerio')).length,
    conHermanoMayor: activos.filter((m) => m.hermanoMayorId).length,
    lideres: activos.filter((m) => cumplido(m, (p) => p.id === 'pm-liderazgo')).length,
  };
}

/**
 * El filtro «Pendientes de:» del Directorio: sin filtro pasa todo;
 * 'completa' deja solo a quienes no tienen paso pendiente; un id de
 * paso deja a quienes tienen ESE paso sin cumplir, sin importar los
 * demás pasos — la lista que se trabaja. (La primera versión usaba
 * el primer paso pendiente y casi todos caían en un solo paso.)
 */
export function pendienteDePaso(escalera: EscaleraMiembro | undefined, filtro: string): boolean {
  if (!filtro) return true;
  if (!escalera) return false;
  if (filtro === 'completa') return escalera.actual === null;
  const e = escalera.estados.find((x) => x.paso.id === filtro);
  return e ? !e.cumplido : false;
}
