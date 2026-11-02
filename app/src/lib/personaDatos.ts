import type { Conversion, Miembro, Persona } from './types';
import { edadDesde } from './personaVista';

/**
 * Ficha única (P2, §3.6.2 del diseño): la LECTURA resuelve los datos
 * personales desde el núcleo. Las páginas cargan sus procesos como siempre
 * y los pasan por estas funciones: si el proceso tiene una persona válida,
 * nombre/contacto/zona/grupo/hermano mayor se pintan desde `personas` (la
 * única fuente), así que editar el teléfono en la ficha se ve en Misión y
 * en Miembros SIN propagación alguna (la B2 se jubiló: no hay dos copias).
 *
 * Tolerancia (§4.3.3): un proceso sin persona (llegó de un equipo sin
 * actualizar) se devuelve tal cual, con sus campos dormidos — la lectura
 * nunca rompe por un enlace ausente.
 */

export function mapaPersonas(personas: Persona[]): Map<string, Persona> {
  return new Map(personas.map((p) => [p.id, p]));
}

export function nombreDePersona(
  mapa: Map<string, Persona>,
  personaId: string | null | undefined,
): string {
  if (!personaId) return '';
  const p = mapa.get(personaId);
  return p ? `${p.nombre} ${p.apellido}`.trim() : '';
}

/**
 * La conversión, lista para pintar: los datos personales vienen del
 * núcleo y `lider` se deriva del hermano mayor de la persona (B1: el
 * texto siempre fue exhibición del id). La edad también se deriva de la
 * fecha de nacimiento del núcleo cuando existe (si no, queda la dormida
 * del proceso). El proceso conserva intactos sus datos propios (fecha,
 * estado, historial, familia, notas).
 */
export function conversionConDatos(c: Conversion, mapa: Map<string, Persona>): Conversion {
  const p = c.personaId ? mapa.get(c.personaId) : undefined;
  if (!p) return c;
  const lider = nombreDePersona(mapa, p.hermanoMayorId);
  const edad = edadDesde(p.fechaNacimiento);
  return {
    ...c,
    nombre: p.nombre,
    apellido: p.apellido,
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    zona: p.zona,
    profesion: p.profesion,
    bautizado: p.bautizado,
    fechaBautismo: p.fechaBautismo,
    conyuge: p.conyuge,
    hijos: p.hijos,
    numeroIdentidad: p.numeroIdentidad,
    edad: edad != null ? String(edad) : c.edad,
    grupoId: p.grupoId ?? '',
    hermanoMayorId: p.hermanoMayorId,
    lider: lider || c.lider,
  };
}

/** El miembro, listo para pintar: igual que la conversión, más los tres campos que solo el miembro tenía (nacimiento, estado civil, contacto). */
export function miembroConDatos(m: Miembro, mapa: Map<string, Persona>): Miembro {
  const p = m.personaId ? mapa.get(m.personaId) : undefined;
  if (!p) return m;
  return {
    ...m,
    nombre: p.nombre,
    apellido: p.apellido,
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    zona: p.zona,
    profesion: p.profesion,
    bautizado: p.bautizado,
    fechaBautismo: p.fechaBautismo,
    conyuge: p.conyuge,
    hijos: p.hijos,
    numeroIdentidad: p.numeroIdentidad,
    fechaNacimiento: p.fechaNacimiento,
    estadoCivil: p.estadoCivil,
    contactoPreferido: p.contactoPreferido,
    grupoId: p.grupoId,
    hermanoMayorId: p.hermanoMayorId,
  };
}
