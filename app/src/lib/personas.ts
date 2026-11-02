import { db } from './database';
import { normalizeField } from './csvImport';
import { createBaseRecord } from './utils/recordHelpers';
import { addTombstone, enqueueOutbox, removeOutboxFor } from './sync/queue';
import type { Persona, Conversion, Miembro, Estudiante, Diezmador, Beneficiario, Grupo } from './types';

/**
 * FICHA ÚNICA — P0 (núcleo y migración silenciosa).
 *
 * Reglas del diseño (§5.2 y §5.3), tal como quedaron aprobadas:
 * - La persona hereda el id de su ficha prioritaria:
 *   miembros → conversiones → estudiantes → dadores → beneficiarios.
 *   Como los ids ya están sincronizados, dos equipos que migren la misma
 *   nube producen las MISMAS personas (convergencia sin coordinarse).
 * - Unión automática SOLO con teléfono coincidente (clave nombre+apellido+
 *   teléfono con la normalización de la importación CSV). Sin teléfono o con
 *   teléfono distinto NO se une, aunque el nombre sea idéntico.
 * - P0.1 (corrección de LemGil): la identificación PRINCIPAL es el Nº de
 *   Identidad (carné), único e intransferible — no todos tienen teléfono.
 *   Dos fichas con el mismo carné (normalizado a dígitos) son la misma
 *   persona AUNQUE el teléfono difiera: es la arista de unión más fuerte,
 *   por encima del teléfono, que queda como respaldo. Hoy ninguna ficha
 *   trae carné (el campo nace con esta enmienda): sin carné, nada cambia.
 * - El vínculo conocido Miembro.conversionId manda sobre la clave: esa
 *   conversión es de la misma persona aunque el teléfono haya cambiado.
 * - Conflictos de campos del núcleo: gana el valor no vacío; entre valores
 *   no vacíos y distintos, gana la ficha de mayor prioridad. Las fichas de
 *   proceso NUNCA se sobrescriben: sus campos personales quedan dormidos.
 * - Migración ADITIVA: crea `personas` y escribe `personaId` en los 5
 *   procesos del alcance. Colaboradores y miembrosComun quedan FUERA
 *   (decisión de LemGil: la Red es apoyo financiero externo).
 * - Beneficiarios «Casa de Familia»/«Grupo» no son una persona del núcleo:
 *   no reciben personaId en este pase (su enlace por representante es P5).
 */

export type ProcesoPersona = 'miembros' | 'conversiones' | 'estudiantes' | 'dadores' | 'beneficiarios';

/** Prioridad de herencia (§5.2): menor número = mayor prioridad. */
const PRIORIDAD: Record<ProcesoPersona, number> = {
  miembros: 0,
  conversiones: 1,
  estudiantes: 2,
  dadores: 3,
  beneficiarios: 4,
};

/** Vista uniforme de una ficha de proceso para poder agruparla. */
interface FichaInterna {
  proceso: ProcesoPersona;
  id: string;
  personaIdPrevio: string | null;
  nombre: string;
  apellido: string;
  /** P0.1: Nº de Identidad tal como lo trae la ficha ('' si no lo trae). */
  numeroIdentidad: string;
  telefono: string;
  email: string;
  direccion: string;
  zona: string;
  fechaNacimiento: string;
  profesion: string;
  estadoCivil: string;
  contactoPreferido: string;
  bautizado: boolean;
  fechaBautismo: string;
  conyuge: string;
  hijos: string;
  grupoId: string | null;
  hermanoMayorId: string | null;
  /** Solo dadores: su grupo como texto libre (pista para el núcleo, §5.3.6). */
  grupoTexto: string;
  /** Solo miembros: vínculo conocido a su conversión (§5.3.3). */
  conversionId: string | null;
  creado: string;
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
const idONulo = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function fichaBase(p: ProcesoPersona, r: { id: string; personaId?: string | null; nombre?: string; apellido?: string; numeroIdentidad?: string; telefono?: string; creado?: string }): FichaInterna {
  return {
    proceso: p,
    id: r.id,
    personaIdPrevio: idONulo(r.personaId),
    nombre: texto(r.nombre),
    apellido: texto(r.apellido),
    numeroIdentidad: texto(r.numeroIdentidad),
    telefono: texto(r.telefono),
    email: '',
    direccion: '',
    zona: '',
    fechaNacimiento: '',
    profesion: '',
    estadoCivil: '',
    contactoPreferido: '',
    bautizado: false,
    fechaBautismo: '',
    conyuge: '',
    hijos: '',
    grupoId: null,
    hermanoMayorId: null,
    grupoTexto: '',
    conversionId: null,
    creado: texto(r.creado),
  };
}

export interface FichasDePersona {
  miembros: Miembro[];
  conversiones: Conversion[];
  estudiantes: Estudiante[];
  dadores: Diezmador[];
  beneficiarios: Beneficiario[];
}

function aFichas(data: FichasDePersona): FichaInterna[] {
  const fichas: FichaInterna[] = [];
  for (const m of data.miembros) {
    fichas.push({
      ...fichaBase('miembros', m),
      email: texto(m.email), direccion: texto(m.direccion), zona: texto(m.zona),
      fechaNacimiento: texto(m.fechaNacimiento), profesion: texto(m.profesion),
      estadoCivil: texto(m.estadoCivil), contactoPreferido: texto(m.contactoPreferido),
      bautizado: m.bautizado === true, fechaBautismo: texto(m.fechaBautismo),
      conyuge: texto(m.conyuge), hijos: texto(m.hijos),
      grupoId: idONulo(m.grupoId), hermanoMayorId: idONulo(m.hermanoMayorId),
      conversionId: idONulo(m.conversionId),
    });
  }
  for (const c of data.conversiones) {
    fichas.push({
      ...fichaBase('conversiones', c),
      email: texto(c.email), direccion: texto(c.direccion), zona: texto(c.zona),
      profesion: texto(c.profesion),
      bautizado: c.bautizado === true, fechaBautismo: texto(c.fechaBautismo),
      conyuge: texto(c.conyuge), hijos: texto(c.hijos),
      grupoId: idONulo(c.grupoId), hermanoMayorId: idONulo(c.hermanoMayorId),
    });
  }
  for (const e of data.estudiantes) {
    fichas.push({
      ...fichaBase('estudiantes', e),
      email: texto(e.email), direccion: texto(e.direccion), zona: texto(e.zona),
      profesion: texto(e.profesion),
      bautizado: e.bautizado === true, fechaBautismo: texto(e.fechaBautismo),
      conyuge: texto(e.conyuge), hijos: texto(e.hijos),
      grupoId: idONulo(e.grupoId), hermanoMayorId: idONulo(e.hermanoMayorId),
    });
  }
  for (const d of data.dadores) {
    fichas.push({
      ...fichaBase('dadores', d),
      email: texto(d.email), zona: texto(d.zona),
      grupoTexto: texto(d.grupo),
    });
  }
  for (const b of data.beneficiarios) {
    // Solo las fichas que SON una persona entran en la agrupación (§3.4).
    if (b.tipo !== 'Persona' && b.tipo !== 'Vulnerable') continue;
    fichas.push({
      ...fichaBase('beneficiarios', b),
      direccion: texto(b.direccion), zona: texto(b.zona),
    });
  }
  return fichas;
}

/** Clave de unión del diseño (§5.3.1): nombre+apellido+teléfono normalizados. */
function claveUnion(f: FichaInterna): string | null {
  const tel = normalizeField(f.telefono);
  if (!tel) return null; // sin teléfono no hay unión automática (§5.3.2)
  return `${normalizeField(f.nombre)}|${normalizeField(f.apellido)}|${tel}`;
}

export interface AsignacionPersona {
  proceso: ProcesoPersona;
  id: string;
  personaId: string;
}

export interface GrupoDePersona {
  persona: Persona;
  /** True si hay que crearla (no existe ya una persona con ese id). */
  crear: boolean;
  asignaciones: AsignacionPersona[];
}

/**
 * Función PURA de la migración: agrupa las fichas en personas y construye el
 * núcleo de cada una. Determinista: mismos datos de entrada ⇒ mismas
 * personas con los mismos ids, en cualquier equipo.
 */
export function agruparEnPersonas(
  data: FichasDePersona,
  grupos: Grupo[] = [],
  personasExistentes: ReadonlySet<string> = new Set(),
  ahora: string = new Date().toISOString(),
): GrupoDePersona[] {
  const fichas = aFichas(data);

  // ── Union-Find sobre las fichas ──────────────────────────────────────────
  const padre = fichas.map((_, i) => i);
  const raiz = (i: number): number => {
    let r = i;
    while (padre[r] !== r) r = padre[r];
    while (padre[i] !== r) { const sig = padre[i]; padre[i] = r; i = sig; }
    return r;
  };
  const unir = (a: number, b: number) => {
    const ra = raiz(a); const rb = raiz(b);
    if (ra !== rb) padre[rb] = ra;
  };

  // 0) Lo ya enlazado en una corrida anterior permanece unido (idempotencia).
  const porPersonaPrevia = new Map<string, number>();
  fichas.forEach((f, i) => {
    if (!f.personaIdPrevio) return;
    const prev = porPersonaPrevia.get(f.personaIdPrevio);
    if (prev == null) porPersonaPrevia.set(f.personaIdPrevio, i);
    else unir(prev, i);
  });

  // 1) Unión por Nº de Identidad (P0.1): la arista MÁS fuerte. El carné es
  // único e intransferible: mismo carné (solo dígitos) ⇒ misma persona,
  // aunque los teléfonos difieran o falten. Sin carné no hay arista.
  const porIdentidad = new Map<string, number>();
  fichas.forEach((f, i) => {
    const identidad = f.numeroIdentidad.replace(/\D/g, '');
    if (!identidad) return;
    const prev = porIdentidad.get(identidad);
    if (prev == null) porIdentidad.set(identidad, i);
    else unir(prev, i);
  });

  // 2) Unión por clave nombre+apellido+teléfono (respaldo; solo con teléfono).
  const porClave = new Map<string, number>();
  fichas.forEach((f, i) => {
    const clave = claveUnion(f);
    if (!clave) return;
    const prev = porClave.get(clave);
    if (prev == null) porClave.set(clave, i);
    else unir(prev, i);
  });

  // 3) El vínculo conocido miembro→conversión manda sobre la clave (§5.3.3).
  const indiceConversion = new Map<string, number>();
  fichas.forEach((f, i) => { if (f.proceso === 'conversiones') indiceConversion.set(f.id, i); });
  fichas.forEach((f, i) => {
    if (f.proceso !== 'miembros' || !f.conversionId) return;
    const j = indiceConversion.get(f.conversionId);
    if (j != null) unir(i, j);
  });

  // ── Componentes → personas ───────────────────────────────────────────────
  const componentes = new Map<number, number[]>();
  fichas.forEach((_, i) => {
    const r = raiz(i);
    const arr = componentes.get(r) ?? [];
    arr.push(i);
    componentes.set(r, arr);
  });

  const gruposPorNombre = new Map(grupos.map((g) => [normalizeField(g.nombre), g.id]));
  const resultado: GrupoDePersona[] = [];

  for (const indices of componentes.values()) {
    // Orden determinista: prioridad de proceso y, a igual prioridad, id.
    const ordenadas = indices
      .map((i) => fichas[i])
      .sort((a, b) => PRIORIDAD[a.proceso] - PRIORIDAD[b.proceso] || a.id.localeCompare(b.id));

    // El id de la persona: si alguna ficha ya traía personaId (corrida
    // anterior), ese manda; si no, el de la ficha prioritaria (§5.2).
    const conPrevio = ordenadas.find((f) => f.personaIdPrevio);
    const personaId = conPrevio?.personaIdPrevio ?? ordenadas[0].id;

    // Campos del núcleo (§5.3.4): primer valor no vacío en orden de
    // prioridad; el bautismo es un hecho: basta que una ficha lo afirme.
    const primero = (campo: 'nombre' | 'apellido' | 'numeroIdentidad' | 'telefono' | 'email' | 'direccion' | 'zona' | 'fechaNacimiento' | 'profesion' | 'estadoCivil' | 'contactoPreferido' | 'fechaBautismo' | 'conyuge' | 'hijos'): string => {
      for (const f of ordenadas) if (f[campo] !== '') return f[campo];
      return '';
    };
    let grupoId: string | null = null;
    for (const f of ordenadas) if (f.grupoId) { grupoId = f.grupoId; break; }
    if (!grupoId) {
      // §5.3.6: el grupo TEXTO del diezmador solo vale como pista si coincide
      // con un grupo existente y el núcleo aún no tiene grupo.
      for (const f of ordenadas) {
        if (!f.grupoTexto) continue;
        const gid = gruposPorNombre.get(normalizeField(f.grupoTexto));
        if (gid) { grupoId = gid; break; }
      }
    }
    let hermanoMayorId: string | null = null;
    for (const f of ordenadas) if (f.hermanoMayorId) { hermanoMayorId = f.hermanoMayorId; break; }
    // hermanoMayorId apuntaba a miembros.id; como la persona que contiene a
    // ese miembro hereda justamente el id del miembro (prioridad máxima), el
    // valor ya ES el personaId del mentor: se conserva tal cual.

    const prioritaria = ordenadas[0];
    const persona: Persona = {
      id: personaId,
      nombre: primero('nombre'),
      apellido: primero('apellido'),
      // P0.1: el carné se hereda de la ficha de mayor prioridad que lo trae.
      numeroIdentidad: primero('numeroIdentidad'),
      telefono: primero('telefono'),
      email: primero('email'),
      direccion: primero('direccion'),
      zona: primero('zona'),
      fechaNacimiento: primero('fechaNacimiento'),
      profesion: primero('profesion'),
      estadoCivil: (primero('estadoCivil') || 'Soltero') as Persona['estadoCivil'],
      contactoPreferido: (primero('contactoPreferido') || 'WhatsApp') as Persona['contactoPreferido'],
      bautizado: ordenadas.some((f) => f.bautizado),
      fechaBautismo: primero('fechaBautismo'),
      conyuge: primero('conyuge'),
      hijos: primero('hijos'),
      grupoId,
      hermanoMayorId,
      creado: prioritaria.creado || ahora,
      version: 1,
      updatedAt: ahora,
    };

    resultado.push({
      persona,
      crear: !personasExistentes.has(personaId),
      asignaciones: ordenadas.map((f) => ({ proceso: f.proceso, id: f.id, personaId })),
    });
  }

  // Salida ordenada por id de persona: determinismo total entre equipos.
  resultado.sort((a, b) => a.persona.id.localeCompare(b.persona.id));
  return resultado;
}

export interface ResultadoMigracionPersonas {
  personasCreadas: number;
  procesosEnlazados: number;
}

/**
 * El pase sobre la base real: lee las 5 colecciones del alcance, agrupa y
 * aplica SOLO escrituras aditivas (crear personas que falten y poner
 * `personaId` donde difiera). Cada escritura se encola en la bandeja de
 * salida del sync (la «ola» de §4.3.1), aunque los ganchos aún no estén
 * montados cuando la migración corre al arrancar.
 */
export async function ejecutarMigracionPersonas(): Promise<ResultadoMigracionPersonas> {
  const [miembros, conversiones, estudiantes, dadores, beneficiarios, grupos, existentes] = await Promise.all([
    db.miembros.toArray(),
    db.conversiones.toArray(),
    db.estudiantes.toArray(),
    db.dadores.toArray(),
    db.beneficiarios.toArray(),
    db.grupos.toArray(),
    db.personas.toArray(),
  ]);
  const idsExistentes = new Set(existentes.map((p) => p.id));
  const agrupados = agruparEnPersonas({ miembros, conversiones, estudiantes, dadores, beneficiarios }, grupos, idsExistentes);

  const tablas = { miembros: db.miembros, conversiones: db.conversiones, estudiantes: db.estudiantes, dadores: db.dadores, beneficiarios: db.beneficiarios } as const;
  const actuales = new Map<string, string | null | undefined>();
  for (const m of miembros) actuales.set(`miembros:${m.id}`, m.personaId);
  for (const c of conversiones) actuales.set(`conversiones:${c.id}`, c.personaId);
  for (const e of estudiantes) actuales.set(`estudiantes:${e.id}`, e.personaId);
  for (const d of dadores) actuales.set(`dadores:${d.id}`, d.personaId);
  for (const b of beneficiarios) actuales.set(`beneficiarios:${b.id}`, b.personaId);

  let personasCreadas = 0;
  let procesosEnlazados = 0;
  const encolar: Array<[ProcesoPersona | 'personas', string]> = [];

  await db.transaction('rw', [db.personas, db.miembros, db.conversiones, db.estudiantes, db.dadores, db.beneficiarios], async () => {
    for (const g of agrupados) {
      if (g.crear) {
        await db.personas.add(createBaseRecord(g.persona));
        personasCreadas++;
        encolar.push(['personas', g.persona.id]);
      }
      for (const a of g.asignaciones) {
        if (actuales.get(`${a.proceso}:${a.id}`) === a.personaId) continue;
        await tablas[a.proceso].update(a.id, { personaId: a.personaId });
        procesosEnlazados++;
        encolar.push([a.proceso, a.id]);
      }
    }
  });

  for (const [tabla, id] of encolar) await enqueueOutbox(tabla, id);
  return { personasCreadas, procesosEnlazados };
}

// ─── P1: herramientas de enlace tardío (§5.5 del diseño) ─────────────────────

const TABLAS_PROCESO = {
  miembros: db.miembros,
  conversiones: db.conversiones,
  estudiantes: db.estudiantes,
  dadores: db.dadores,
  beneficiarios: db.beneficiarios,
} as const;

/**
 * «Vincular a una persona existente»: mueve el `personaId` de UN proceso a
 * la persona elegida. Es la salida para los procesos que llegan de equipos
 * sin actualizar (personaId vacío) o quedaron sin unir en la migración.
 * Solo cambia el vínculo: ni la ficha del proceso ni sus satélites se tocan.
 */
export async function vincularProceso(proceso: ProcesoPersona, procesoId: string, personaId: string): Promise<void> {
  const persona = await db.personas.get(personaId);
  if (!persona) throw new Error('La persona elegida ya no existe.');
  await TABLAS_PROCESO[proceso].update(procesoId, { personaId });
  await enqueueOutbox(proceso, procesoId);
}

export interface ResultadoUnionPersonas {
  procesosMovidos: number;
}

// ─── P2: el carné como llave en las altas ────────────────────────────────────

/**
 * P2 — Aviso anti-duplicado del alta: busca una persona con ese Nº de
 * Identidad (comparando solo dígitos, como la unión de la migración P0.1).
 * Función PURA: la usan el formulario del núcleo (para ofrecer «Usar esta
 * persona» en vez de teclearla dos veces) y las pruebas. `excluirId` deja
 * fuera a la persona que se está editando (su propio carné no es duplicado).
 */
export function buscarPorIdentidad(
  personas: Pick<Persona, 'id' | 'numeroIdentidad'>[],
  numeroIdentidad: string,
  excluirId?: string,
): Persona | undefined {
  const buscado = (numeroIdentidad || '').replace(/\D/g, '');
  if (!buscado) return undefined;
  return personas.find(
    (p) => p.id !== excluirId && (p.numeroIdentidad || '').replace(/\D/g, '') === buscado,
  ) as Persona | undefined;
}

/**
 * Vista mínima de una ficha de proceso para asegurarle su persona: cada
 * proceso trae un subconjunto distinto de campos dormidos (el diezmador,
 * por ejemplo, no tiene dirección ni bautismo, y su grupo es TEXTO), así
 * que todos son opcionales salvo el id. Las interfaces reales (Conversion,
 * Estudiante, Diezmador) son asignables a esta vista estructural.
 */
interface FichaAsegurable {
  id: string;
  personaId?: string | null;
  nombre?: string;
  apellido?: string;
  numeroIdentidad?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  zona?: string;
  profesion?: string;
  bautizado?: boolean;
  fechaBautismo?: string;
  conyuge?: string;
  hijos?: string;
  grupoId?: string | null;
  hermanoMayorId?: string | null;
  /** Solo dadores: su grupo como texto libre (pista §5.3.6). */
  grupo?: string;
  creado?: string;
}

/**
 * P2 — Todo proceso que se usa necesita su persona. Las altas nuevas nacen
 * ya enlazadas (PersonaSelect), pero un proceso viejo o bajado de un
 * equipo sin actualizar puede llegar sin `personaId` (§4.3.3 del diseño).
 * Esta función se la asegura con la misma regla determinista de la
 * migración (§5.2): la persona hereda el id del propio proceso, y su
 * núcleo nace de los datos dormidos de la ficha. Si la persona ya existe,
 * solo se escribe el enlace. Devuelve el personaId vigente. La comparten
 * la conversión (al integrarse, P2), el estudiante (al editarlo, P3) y el
 * diezmador (al editarlo, P4).
 */
async function asegurarPersonaDeProceso(
  tabla: 'conversiones' | 'estudiantes' | 'dadores',
  ficha: FichaAsegurable,
): Promise<string> {
  if (ficha.personaId) return ficha.personaId;
  const existente = await db.personas.get(ficha.id);
  if (!existente) {
    const ahora = new Date().toISOString();
    // §5.3.6: el grupo TEXTO del diezmador solo vale como pista si coincide
    // con un grupo existente; si no coincide, el núcleo nace sin grupo (el
    // texto queda dormido en la ficha, como manda el diseño).
    let grupoId = ficha.grupoId || null;
    if (!grupoId && ficha.grupo) {
      const grupos = await db.grupos.toArray();
      grupoId = grupos.find((g) => normalizeField(g.nombre) === normalizeField(ficha.grupo!))?.id ?? null;
    }
    await db.personas.add(createBaseRecord({
      id: ficha.id,
      nombre: ficha.nombre || '',
      apellido: ficha.apellido || '',
      numeroIdentidad: ficha.numeroIdentidad || '',
      telefono: ficha.telefono || '',
      email: ficha.email || '',
      direccion: ficha.direccion || '',
      zona: ficha.zona || '',
      fechaNacimiento: '',
      profesion: ficha.profesion || '',
      estadoCivil: 'Soltero',
      contactoPreferido: 'WhatsApp',
      bautizado: ficha.bautizado === true,
      fechaBautismo: ficha.fechaBautismo || '',
      conyuge: ficha.conyuge || '',
      hijos: ficha.hijos || '',
      grupoId,
      hermanoMayorId: ficha.hermanoMayorId || null,
      creado: ficha.creado || ahora,
    }));
    await enqueueOutbox('personas', ficha.id);
  }
  await TABLAS_PROCESO[tabla].update(ficha.id, { personaId: ficha.id });
  await enqueueOutbox(tabla, ficha.id);
  return ficha.id;
}

/** P2: la conversión se asegura su persona al integrarse (syncMember). */
export async function asegurarPersonaDeConversion(c: Conversion): Promise<string> {
  return asegurarPersonaDeProceso('conversiones', c);
}

/** P3: el estudiante viejo sin persona se la asegura al ser editado. */
export async function asegurarPersonaDeEstudiante(e: Estudiante): Promise<string> {
  return asegurarPersonaDeProceso('estudiantes', e);
}

/** P4: el diezmador viejo sin persona se la asegura al ser editado. */
export async function asegurarPersonaDeDiezmador(d: Diezmador): Promise<string> {
  return asegurarPersonaDeProceso('dadores', d);
}

/**
 * «Unir dos personas»: la superviviente absorbe TODOS los procesos de la
 * absorbida (se reescribe su `personaId`; los ids de proceso no cambian,
 * así que hitos, aportes, certificados y demás satélites quedan intactos)
 * y la absorbida se borra, quedando como tumba de sync — su id jamás se
 * reutiliza, porque los ids son UUID. Los `hermanoMayorId` de otras
 * personas que apuntaban a la absorbida pasan a la superviviente; si la
 * superviviente tenía por mentor a la absorbida, queda sin mentor (nadie
 * es su propio hermano mayor). Los campos del núcleo de la superviviente
 * NO se mezclan: sobrevive su ficha tal cual.
 */
export async function unirPersonas(absorbidaId: string, supervivienteId: string): Promise<ResultadoUnionPersonas> {
  if (absorbidaId === supervivienteId) return { procesosMovidos: 0 };
  let procesosMovidos = 0;
  const encolar: Array<[ProcesoPersona | 'personas', string]> = [];

  await db.transaction('rw', [db.personas, db.miembros, db.conversiones, db.estudiantes, db.dadores, db.beneficiarios], async () => {
    const superviviente = await db.personas.get(supervivienteId);
    const absorbida = await db.personas.get(absorbidaId);
    if (!superviviente || !absorbida) return;

    for (const proceso of Object.keys(TABLAS_PROCESO) as ProcesoPersona[]) {
      const tabla = TABLAS_PROCESO[proceso];
      const regs = await tabla.where('personaId').equals(absorbidaId).toArray();
      for (const r of regs) {
        await tabla.update(r.id, { personaId: supervivienteId });
        procesosMovidos++;
        encolar.push([proceso, r.id]);
      }
    }

    // hermanoMayorId → personas.id (sin índice en la v21: se filtra en memoria).
    const todas = await db.personas.toArray();
    for (const p of todas) {
      if (p.hermanoMayorId !== absorbidaId) continue;
      await db.personas.update(p.id, { hermanoMayorId: p.id === supervivienteId ? null : supervivienteId });
      encolar.push(['personas', p.id]);
    }

    await db.personas.delete(absorbidaId);
  });

  for (const [tabla, id] of encolar) await enqueueOutbox(tabla, id);
  // La absorbida queda como tumba de sync (explícito, igual que el gancho
  // de borrado haría en tiempo de ejecución; aquí no dependemos de él).
  await removeOutboxFor('personas', absorbidaId);
  await addTombstone('personas', absorbidaId);
  return { procesosMovidos };
}
