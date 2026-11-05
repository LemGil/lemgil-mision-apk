import { db } from './database';
import { createBaseRecord } from './utils/recordHelpers';
import type { Conversion, Grupo, Evangelismo, Curso, Leccion, Estudiante, Certificado, Metas, Miembro, Hito, Zona, PasoSeguimiento } from './types';
import { v4 as uuid } from 'uuid';
import type { Table } from 'dexie';
import { zonaCanonica } from './zonas';
import { asegurarPersonasDeDiezmadores, ejecutarMigracionPersonas } from './personas';
import { PASOS_MISION_DEFECTO, idCanonico } from './pasosMision';

const PREFIX = 'lemgil_';

function loadOld<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + key) || localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function migrateFromLocalStorage() {
  const count = await db.conversiones.count();
  if (count > 0) return;

  const convs = loadOld<Conversion>('convs');
  const grupos = loadOld<Grupo>('grupos');
  const evangels = loadOld<Evangelismo>('evangels');
  const cursos = loadOld<Curso>('ac_cursos');
  const lecciones = loadOld<Leccion>('ac_lecciones');
  const estudiantes = loadOld<Estudiante>('ac_estudiantes');
  const certs = loadOld<Certificado>('ac_certs');

  await db.transaction('rw', [db.conversiones, db.grupos, db.evangelismos, db.cursos, db.lecciones, db.estudiantes, db.certificados], async () => {
    if (convs.length) await db.conversiones.bulkAdd(convs.map(createBaseRecord));
    if (grupos.length) await db.grupos.bulkAdd(grupos.map(createBaseRecord));
    if (evangels.length) await db.evangelismos.bulkAdd(evangels.map(createBaseRecord));
    if (cursos.length) await db.cursos.bulkAdd(cursos.map(createBaseRecord));
    if (lecciones.length) await db.lecciones.bulkAdd(lecciones.map(createBaseRecord));
    if (estudiantes.length) await db.estudiantes.bulkAdd(estudiantes.map(createBaseRecord));
    if (certs.length) await db.certificados.bulkAdd(certs.map(createBaseRecord));
  });

  await db.metas.put(createBaseRecord({
    id: 'default',
    membresia: 500,
    academia: 150,
    sostenimiento: 8000,
    familias: 200,
    personas: 800,
    actualizado: new Date().toISOString(),
  }));

  console.log('Migración localStorage → IndexedDB completada');
}

export async function backfillIntegrados(): Promise<number> {
  const FLAG_KEY = 'lemgil_backfill_integrados_v1';
  if (localStorage.getItem(FLAG_KEY)) return 0;
  const integrados = await db.conversiones.filter((c) => c.estado === 'Integrado').toArray();
  if (integrados.length === 0) {
    localStorage.setItem(FLAG_KEY, '1');
    return 0;
  }
  const existing = await db.miembros.toArray();
  const idsConMiembro = new Set(existing.map((m) => m.conversionId).filter(Boolean));
  const aCrear: Miembro[] = [];
  const hitos: Hito[] = [];
  const now = new Date().toISOString();
  for (const c of integrados) {
    if (idsConMiembro.has(c.id)) continue;
    const miembroId = uuid();
    aCrear.push({
      id: miembroId,
      nombre: c.nombre,
      apellido: c.apellido,
      telefono: c.telefono || '',
      email: '',
      direccion: c.direccion || '',
      zona: c.zona || '',
      fechaNacimiento: '',
      fechaIngreso: c.fecha || now.split('T')[0],
      estado: 'Activo',
      contactoPreferido: 'WhatsApp',
      profesion: '',
      estadoCivil: 'Soltero',
      bautizado: false,
      fechaBautismo: '',
      conyuge: '',
      hijos: '',
      conversionId: c.id,
      hermanoMayorId: null,
      notas: c.notas || '',
      creado: now,
      actualizado: now,
      version: 1,
      updatedAt: now,
    });
    hitos.push({
      id: uuid(),
      miembroId,
      fecha: c.fecha || now.split('T')[0],
      tipo: 'Integración',
      descripcion: `Integrado a la iglesia${c.lider ? ` · Disciplinado por ${c.lider}` : ''}`,
      creado: now,
      version: 1,
      updatedAt: now,
    });
  }
  if (aCrear.length > 0) {
    await db.transaction('rw', [db.miembros, db.hitos], async () => {
      await db.miembros.bulkAdd(aCrear);
      await db.hitos.bulkAdd(hitos);
    });
  }
  localStorage.setItem(FLAG_KEY, '1');
  console.log(`Backfill: ${aCrear.length} miembro(s) creado(s) a partir de conversiones integradas`);
  return aCrear.length;
}

/**
 * Pasos del seguimiento, Fase 1 (Miembros): la semilla del catálogo
 * editable. Ids FIJOS y legibles a propósito: la identidad de cada paso
 * es estable para siempre (renombrar es cambiar la etiqueta, no la
 * identidad), y al ser fijos, dos equipos que siembran por su cuenta
 * convergen en las mismas filas al sincronizar — sin duplicados.
 * Idempotente por vacío, el patrón de ensureZonas: si la tabla ya tiene
 * filas (sembradas o llegadas por sync), no toca nada; el catálogo es
 * del usuario desde que nace. La Fase 2 sembrará el ámbito 'mision'
 * con su propio pase.
 */
export const PASOS_MIEMBRO_SEMILLA: Array<Pick<PasoSeguimiento, 'id' | 'nombre' | 'emoji' | 'orden' | 'fuente' | 'protegido'>> = [
  { id: 'pm-integracion', nombre: 'Integrado', emoji: '🏘️', orden: 1, fuente: 'integracion', protegido: true },
  { id: 'pm-grupo', nombre: 'En un grupo', emoji: '👥', orden: 2, fuente: 'grupo' },
  { id: 'pm-academia', nombre: 'En la Academia', emoji: '🎓', orden: 3, fuente: 'academia' },
  { id: 'pm-ministerio', nombre: 'Sirviendo en un ministerio', emoji: '🤲', orden: 4, fuente: 'ministerio' },
  { id: 'pm-hermano-mayor', nombre: 'Hermano mayor de alguien', emoji: '🌱', orden: 5, fuente: 'hermanoMayor' },
  { id: 'pm-liderazgo', nombre: 'Liderazgo', emoji: '⭐', orden: 6, fuente: 'manual' },
];

export async function ensurePasosMiembro(): Promise<PasoSeguimiento[]> {
  // Por ÁMBITO (Fase 2): la tabla también guarda los pasos de Misión;
  // que existan filas de un ámbito no debe impedir sembrar el otro.
  const existentes = await db.pasosSeguimiento.where('ambito').equals('miembro').toArray();
  if (existentes.length > 0) return existentes;
  const now = new Date().toISOString();
  const pasos = PASOS_MIEMBRO_SEMILLA.map((p) => createBaseRecord({ ...p, ambito: 'miembro' as const, creado: now, version: 1 }));
  await db.pasosSeguimiento.bulkAdd(pasos);
  return pasos;
}

/**
 * Fase 2 (Misión): la semilla del ámbito 'mision' son los seis estados
 * de siempre, ahora como DATOS con identidad fija y rol (la definición
 * vive en lib/pasosMision.ts, que es también el respaldo de lectura).
 * Mismo patrón que la Fase 1: ids fijos → los equipos convergen al
 * sincronizar; idempotente por vacío DEL ÁMBITO.
 */
export async function ensurePasosMision(): Promise<PasoSeguimiento[]> {
  const existentes = await db.pasosSeguimiento.where('ambito').equals('mision').toArray();
  if (existentes.length > 0) return existentes;
  const now = new Date().toISOString();
  const pasos = PASOS_MISION_DEFECTO.map((p) => createBaseRecord({ ...p, creado: now, version: 1 }));
  await db.pasosSeguimiento.bulkAdd(pasos);
  return pasos;
}

/**
 * Fase 2: pase único que traduce el `estado` de cada conversión — y el
 * de cada entrada de su `historial` — de la ETIQUETA vieja ('Integrado')
 * a la IDENTIDAD del paso ('ps-integrado'). Lo que ya es un id, o una
 * etiqueta desconocida, queda intacto (la lectura lo tolera igual: ver
 * el alias en lib/pasosMision.ts). Los HITOS no se tocan: sus tipos son
 * el vocabulario fijo del historial de la iglesia.
 */
export async function migrarEstadosAPasos(): Promise<number> {
  const FLAG_KEY = 'lemgil_estados_pasos_v1';
  if (localStorage.getItem(FLAG_KEY)) return 0;
  let cambios = 0;
  const convs = await db.conversiones.toArray();
  for (const c of convs) {
    const estadoNuevo = idCanonico(c.estado);
    const historialViejo = c.historial ?? [];
    const historialNuevo = historialViejo.map((h) => ({ ...h, estado: idCanonico(h.estado ?? '') }));
    const cambioHistorial = historialNuevo.some((h, i) => h.estado !== historialViejo[i].estado);
    if (estadoNuevo !== c.estado || cambioHistorial) {
      await db.conversiones.update(c.id, { estado: estadoNuevo, historial: historialNuevo });
      cambios++;
    }
  }
  localStorage.setItem(FLAG_KEY, '1');
  if (cambios > 0) console.log(`Pasos de Misión (Fase 2): ${cambios} conversión(es) traducidas a identidad de paso`);
  return cambios;
}

export async function ensureMetas(): Promise<Metas> {
  const existing = await db.metas.get('default');
  if (existing) return existing;
  const created = createBaseRecord({
    id: 'default',
    membresia: 500,
    academia: 150,
    sostenimiento: 8000,
    familias: 200,
    personas: 800,
    actualizado: new Date().toISOString(),
  });
  await db.metas.put(created);
  return created;
}

export async function desunificarBienComun(): Promise<void> {
  const FLAG_KEY = 'lemgil_desunificar_bien_comun_v1';
  if (localStorage.getItem(FLAG_KEY)) return;

  const todosLosAportes = await db.aportesComun.toArray();
  const todosLosMiembros = await db.miembros.toArray();
  const idsDadores = new Set(todosLosAportes.map(a => a.diezmadorId).filter(Boolean));

  await db.transaction('rw', [db.dadores, db.aportesComun], async () => {
    for (const id of idsDadores) {
      const m = todosLosMiembros.find(x => x.id === id);
      if (m) {
        const colabId = uuid();
        await db.dadores.add(createBaseRecord({
          id: colabId,
          nombre: m.nombre,
          apellido: m.apellido,
          telefono: m.telefono,
          email: m.email,
          fechaIngreso: m.fechaIngreso,
          estado: 'Activo',
          zona: m.zona || '',
          grupo: '',
          planDiezmo: 0,
          notas: '',
          creado: new Date().toISOString()
        }));
        await db.aportesComun.where('diezmadorId').equals(id || '').modify({ diezmadorId: colabId });
      }
    }
  });

  localStorage.setItem(FLAG_KEY, '1');
}

const ZONAS_DEFAULT = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];

export async function ensureZonas(): Promise<Zona[]> {
  const existentes = await db.zonas.toArray();
  if (existentes.length > 0) return existentes;
  const now = new Date().toISOString();
  const zonas = ZONAS_DEFAULT.map((nombre) => createBaseRecord({ id: uuid(), nombre, creado: now, version: 1 }));
  await db.zonas.bulkAdd(zonas);
  return zonas;
}

// Ficha única (P0): pase único e idempotente que crea la colección
// `personas` y enlaza los 5 procesos del alcance con su personaId (reglas en
// lib/personas.ts). Es ADITIVO: no borra ni sobrescribe ninguna ficha ni
// campo; lo viejo queda dormido como respaldo. Va DESPUÉS de canonizarZonas
// para que el núcleo nazca con las zonas ya limpias (B5). La salva en CSV
// (paso P-1 del diseño) es previa y manual: este pase no la sustituye.
export async function unificarPersonas(): Promise<number> {
  const FLAG_KEY = 'lemgil_personas_v1';
  if (localStorage.getItem(FLAG_KEY)) return 0;
  const { personasCreadas, procesosEnlazados } = await ejecutarMigracionPersonas();
  localStorage.setItem(FLAG_KEY, '1');
  if (personasCreadas > 0 || procesosEnlazados > 0) {
    console.log(`Ficha única: ${personasCreadas} persona(s) creada(s), ${procesosEnlazados} proceso(s) enlazado(s)`);
  }
  return personasCreadas;
}

// P7 — ARREGLO FINAL, Parte A: pase único e idempotente que asegura su
// persona a TODO diezmador que aún no la tenga (sin `personaId` o con el
// enlace colgando), para que sus campos personales puedan salir del tipo
// `Diezmador` sin dejar a nadie ilegible: la persona hereda el id del
// diezmador y nace de sus datos dormidos (regla en lib/personas.ts).
// Va DESPUÉS de unificarPersonas: la migración P0 ya enlazó a la mayoría;
// este pase recoge los que quedaron fuera (p. ej. importados por CSV
// antes de P7 o llegados de equipos sin actualizar). Es ADITIVO.
export async function asegurarDiezmadores(): Promise<number> {
  const FLAG_KEY = 'lemgil_diezmo_personas_v1';
  if (localStorage.getItem(FLAG_KEY)) return 0;
  const enlazados = await asegurarPersonasDeDiezmadores();
  localStorage.setItem(FLAG_KEY, '1');
  if (enlazados > 0) {
    console.log(`Ficha única (P7): ${enlazados} diezmador(es) enlazado(s) a su persona`);
  }
  return enlazados;
}

// B5: pase único e idempotente que unifica la grafía del campo zona en
// conversiones, miembros, grupos y evangelismos cuando coincide con una zona
// del catálogo (sin distinguir acentos ni mayúsculas). Lo que no coincide con
// ninguna zona del catálogo queda intacto.
export async function canonizarZonas(): Promise<number> {
  const FLAG_KEY = 'lemgil_zonas_canon_v1';
  if (localStorage.getItem(FLAG_KEY)) return 0;
  const zonas = await db.zonas.toArray();
  const oficiales = new Set(zonas.map((z) => z.nombre));
  let cambios = 0;
  const tablas = [db.conversiones, db.miembros, db.grupos, db.evangelismos] as unknown as Table<{ id: string; zona?: string }, string>[];
  for (const tabla of tablas) {
    const registros = await tabla.toArray();
    for (const r of registros) {
      const original = r.zona || '';
      const canonica = zonaCanonica(original, zonas);
      if (canonica !== original && oficiales.has(canonica)) {
        await tabla.update(r.id, { zona: canonica });
        cambios++;
      }
    }
  }
  localStorage.setItem(FLAG_KEY, '1');
  if (cambios > 0) console.log(`Zonas canonizadas: ${cambios} registro(s) unificado(s)`);
  return cambios;
}


