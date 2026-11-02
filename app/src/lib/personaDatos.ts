import type { Beneficiario, Conversion, Diezmador, Estudiante, Grupo, Miembro, Persona } from './types';
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

/**
 * El estudiante, listo para pintar (P3): los datos personales vienen del
 * núcleo, igual que en conversión y miembro. Grupo y hermano mayor también
 * son de la persona (el `hermanoMayorId` decorado es ya un `personas.id`);
 * la edad se deriva de la fecha de nacimiento cuando existe, con la
 * dormida del proceso como respaldo. El proceso conserva sus datos
 * propios: cursoId, fecha de matrícula, estado y notas. `origen`/
 * `origenId` no se leen: murieron en P3 (la persona ES el origen).
 */
export function estudianteConDatos(e: Estudiante, mapa: Map<string, Persona>): Estudiante {
  const p = e.personaId ? mapa.get(e.personaId) : undefined;
  if (!p) return e;
  const edad = edadDesde(p.fechaNacimiento);
  return {
    ...e,
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
    edad: edad != null ? String(edad) : e.edad,
    grupoId: p.grupoId,
    hermanoMayorId: p.hermanoMayorId,
  };
}

/**
 * El diezmador, listo para pintar (P4): nombre, teléfono, email, zona y
 * carné vienen del núcleo, como en los demás procesos. Su `grupo` era
 * TEXTO tecleado en la ficha: murió — el grupo ahora es el de la persona
 * (`grupoId` del núcleo), resuelto a su nombre con el mapa de grupos; si
 * la persona no tiene grupo, el diezmador pinta sin grupo (el texto viejo
 * queda dormido en la ficha, nunca se lee). El proceso conserva lo suyo:
 * fechaIngreso, estado, planDiezmo y notas. Los satélites financieros
 * (AporteComun.diezmadorId, PlanColaborador.diezmadorId) no cambian: el
 * nombre de un aporte se resuelve aporte → proceso → persona.
 */
export function diezmadorConDatos(d: Diezmador, mapa: Map<string, Persona>, grupos?: Map<string, Grupo>): Diezmador {
  const p = d.personaId ? mapa.get(d.personaId) : undefined;
  if (!p) return d;
  return {
    ...d,
    nombre: p.nombre,
    apellido: p.apellido,
    telefono: p.telefono,
    email: p.email,
    zona: p.zona,
    numeroIdentidad: p.numeroIdentidad,
    grupo: p.grupoId ? (grupos?.get(p.grupoId)?.nombre ?? '') : '',
  };
}

/**
 * El beneficiario, listo para pintar (P5): si es una PERSONA (tipos
 * Persona/Vulnerable), nombre, apellido, teléfono, dirección, zona y
 * carné vienen del núcleo, como en los demás procesos. Si es una «Casa
 * de Familia» o un «Grupo», el nombre es el del hogar/grupo (vive en el
 * proceso) y el CONTACTO se resuelve desde su REPRESENTANTE — la persona
 * enlazada en `personaId` (§3.4 del diseño): su teléfono, dirección y
 * zona mandan, y `representativeName` se pinta con su nombre vigente,
 * no con la foto dormida. Sin persona enlazada, la ficha se devuelve
 * tal cual, con sus campos dormidos (tolerancia §4.3.3). El proceso
 * conserva lo suyo: tipo, familia (tamaño del hogar), estado y notas.
 * Los satélites (Entrega.beneficiarioId) no cambian ninguna FK; el
 * nombre histórico de cada entrega sigue siendo su foto al crearla.
 */
export function beneficiarioConDatos(b: Beneficiario, mapa: Map<string, Persona>): Beneficiario {
  const p = b.personaId ? mapa.get(b.personaId) : undefined;
  if (!p) return b;
  if (b.tipo === 'Casa de Familia' || b.tipo === 'Grupo') {
    return {
      ...b,
      telefono: p.telefono,
      direccion: p.direccion,
      zona: p.zona,
      representativeName: `${p.nombre} ${p.apellido}`.trim(),
    };
  }
  return {
    ...b,
    nombre: p.nombre,
    apellido: p.apellido,
    telefono: p.telefono,
    direccion: p.direccion,
    zona: p.zona,
    numeroIdentidad: p.numeroIdentidad,
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
