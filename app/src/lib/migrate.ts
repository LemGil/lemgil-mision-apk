import { db } from './database';
import type { Conversion, Grupo, Evangelismo, Curso, Leccion, Estudiante, Certificado, Metas, Miembro, Hito, Zona } from './types';
import { v4 as uuid } from 'uuid';
import { generateCodigo } from './utils';

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
    if (convs.length) await db.conversiones.bulkAdd(convs);
    if (grupos.length) await db.grupos.bulkAdd(grupos);
    if (evangels.length) await db.evangelismos.bulkAdd(evangels);
    if (cursos.length) await db.cursos.bulkAdd(cursos);
    if (lecciones.length) await db.lecciones.bulkAdd(lecciones);
    if (estudiantes.length) await db.estudiantes.bulkAdd(estudiantes);
    if (certs.length) await db.certificados.bulkAdd(certs);
  });

  await db.metas.put({
    id: 'default',
    membresia: 500,
    academia: 150,
    sostenimiento: 8000,
    familias: 200,
    personas: 800,
    actualizado: new Date().toISOString(),
  });

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
    });
    hitos.push({
      id: uuid(),
      miembroId,
      fecha: c.fecha || now.split('T')[0],
      tipo: 'Integración',
      descripcion: `Integrado a la iglesia${c.lider ? ` · Disciplinado por ${c.lider}` : ''}`,
      creado: now,
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

export async function ensureMetas(): Promise<Metas> {
  const existing = await db.metas.get('default');
  if (existing) return existing;
  const created: Metas = {
    id: 'default',
    membresia: 500,
    academia: 150,
    sostenimiento: 8000,
    familias: 200,
    personas: 800,
    actualizado: new Date().toISOString(),
  };
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
        await db.dadores.add({
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
        });
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
  const seeds: Zona[] = ZONAS_DEFAULT.map((nombre) => ({ id: uuid(), nombre, creado: now }));
  await db.zonas.bulkAdd(seeds);
  return seeds;
}

export async function backfillCodigos(): Promise<void> {
  const tables = [
    { name: 'conversiones', dateField: 'fecha' as const },
    { name: 'evangelismos', dateField: 'fecha' as const },
    { name: 'cursos', dateField: 'creado' as const },
    { name: 'aportes', dateField: 'fecha' as const },
    { name: 'aportescomun', dateField: 'fecha' as const },
    { name: 'entregas', dateField: 'fecha' as const },
  ];

  for (const { name, dateField } of tables) {
    const records = await (db as any)[name].toArray();
    const withoutCode = records.filter((r: any) => !r.codigo);
    if (withoutCode.length === 0) continue;

    const existingCodes = records.filter((r: any) => r.codigo).map((r: any) => r.codigo as string);
    const sorted = withoutCode.sort((a: any, b: any) => {
      const da = a[dateField] || a.creado?.split('T')[0] || '';
      const db2 = b[dateField] || b.creado?.split('T')[0] || '';
      return da.localeCompare(db2);
    });

    let codes = [...existingCodes];
    for (const r of sorted) {
      const fecha = r[dateField] || r.creado?.split('T')[0] || new Date().toISOString().split('T')[0];
      const codigo = generateCodigo(name, fecha, codes);
      codes.push(codigo);
      await (db as any)[name].update(r.id, { codigo });
    }
    console.log(`[Migrate] Backfill códigos: ${sorted.length} registros en ${name}`);
  }
}


