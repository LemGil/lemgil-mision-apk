import type { Beneficiario, Conversion, Diezmador, Estudiante, Evangelismo, EvangelismoCrudo, Grupo, Miembro, Persona } from './types';
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
 * El diezmador LISTO PARA PINTAR (P4; vista desde P7): el proceso
 * `Diezmador` ya no declara datos personales — viven solo en el núcleo —
 * y esta vista es lo que las pantallas de Bien Común reciben: el proceso
 * más nombre/apellido/teléfono/email/zona/carné resueltos desde su
 * persona y `grupo` como el NOMBRE del grupo de la persona (`grupoId`
 * del núcleo, vía el mapa de grupos).
 */
export interface DiezmadorVista extends Diezmador {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  zona: string;
  numeroIdentidad?: string;
  /** Nombre del grupo de la persona ('' si no tiene grupo). */
  grupo: string;
}

/**
 * El diezmador, listo para pintar: nombre, teléfono, email, zona y
 * carné vienen del núcleo, como en los demás procesos. El grupo es el
 * de la persona (`grupoId` del núcleo), resuelto a su nombre; si la
 * persona no tiene grupo, la vista pinta sin grupo — el `grupo` TEXTO
 * viejo queda dormido en la ficha y NUNCA se lee (P7 lo retiró del tipo).
 * El proceso conserva lo suyo: fechaIngreso, estado, planDiezmo y notas.
 * Los satélites financieros (AporteComun.diezmadorId,
 * PlanColaborador.diezmadorId) no cambian: el nombre de un aporte se
 * resuelve aporte → proceso → persona.
 *
 * CRITERIO P7 (sin persona resoluble): la vista devuelve los datos
 * personales VACÍOS ('' y grupo ''), nunca la copia dormida de la ficha.
 * Tras el pase de aseguramiento al arrancar y el aseguramiento al
 * importar, este estado solo puede verse transitoriamente (un registro
 * recién bajado de un equipo sin actualizar, antes de su pase): pintar
 * vacío es honesto — la alternativa era seguir leyendo la copia que la
 * ficha única jubiló.
 */
export function diezmadorConDatos(d: Diezmador, mapa: Map<string, Persona>, grupos?: Map<string, Grupo>): DiezmadorVista {
  const p = d.personaId ? mapa.get(d.personaId) : undefined;
  const base: DiezmadorVista = {
    ...d,
    nombre: '', apellido: '', telefono: '', email: '', zona: '',
    numeroIdentidad: undefined, grupo: '',
  };
  if (!p) return base;
  return {
    ...base,
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
 * El evangelismo LISTO PARA PINTAR (P7): el proceso ya no declara los
 * textos `lider`/`participantes` — esta vista trae el líder y el equipo
 * RESUELTOS desde las personas, que es lo que pintan la tabla, el
 * filtro «Ministro», el buscador, el Panel y los exports (PDF/CSV).
 */
export interface EvangelismoVista extends Evangelismo {
  /** Nombre visible del ministro ('' si no hay líder de ninguna clase). */
  liderNombre: string;
  /** True si el líder NO es una persona: nombre libre (`liderExterno` o texto dormido sin coincidencia). */
  liderEsExterno: boolean;
  /** Nombres del equipo, en orden: primero los de `participanteIds`, luego los externos. */
  equipoNombres: string[];
  /** Total del equipo = participantes por id + externos (el mismo total que sumaba la foto de texto). */
  equipoCount: number;
}

/**
 * Resuelve líder y equipo de un evangelismo desde las personas.
 *
 * LÍDER, en orden: (1) la persona de `liderId`; (2) `liderExterno` (el
 * nombre libre con campo propio desde P7); (3) SOLO para registros
 * viejos, el texto dormido `lider` — SIN escribir nada: si coincide
 * exactamente con el nombre de una persona del mapa, se presenta como
 * su nombre (es una persona, criterio de P2 al editar); si no coincide,
 * se presenta como líder externo. Los registros nuevos nunca traen
 * texto dormido, así que el paso (3) se apaga solo con el tiempo.
 *
 * EQUIPO: nombres de `participanteIds` (en su orden; '(sin nombre)' si
 * un id no resuelve, como pintaba la tabla), luego `participantesExternos`,
 * y por último — solo registros viejos — los nombres del texto dormido
 * `participantes` que NO estén ya cubiertos por los pasos anteriores
 * (la foto vieja mezclaba ids y respaldo: sin esta deduplicación, un
 * registro viejo contaría a su equipo dos veces).
 */
export function evangelismoConDatos(e: EvangelismoCrudo, mapa: Map<string, Persona>): EvangelismoVista {
  const nombrePorId = nombreDePersona(mapa, e.liderId);
  let liderNombre = '';
  let liderEsExterno = false;
  if (nombrePorId) {
    liderNombre = nombrePorId;
  } else if (e.liderExterno?.trim()) {
    liderNombre = e.liderExterno.trim();
    liderEsExterno = true;
  } else if (e.lider?.trim()) {
    const texto = e.lider.trim();
    liderNombre = texto;
    liderEsExterno = ![...mapa.values()].some((p) => `${p.nombre} ${p.apellido}`.trim() === texto);
  }

  const equipoNombres: string[] = [];
  for (const id of e.participanteIds ?? []) {
    equipoNombres.push(nombreDePersona(mapa, id) || '(sin nombre)');
  }
  for (const nombre of e.participantesExternos ?? []) {
    if (nombre.trim()) equipoNombres.push(nombre);
  }
  const cubiertos = new Set(equipoNombres);
  for (const nombre of e.participantes ?? []) {
    if (!nombre.trim() || cubiertos.has(nombre)) continue;
    cubiertos.add(nombre);
    equipoNombres.push(nombre);
  }

  // La vista nace limpia: los textos dormidos no viajan en ella.
  const { lider: _liderDormido, participantes: _participantesDormidos, ...proceso } = e;
  return { ...proceso, liderNombre, liderEsExterno, equipoNombres, equipoCount: equipoNombres.length };
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
