import { supabase } from './supabase';
import { db } from './database';

const SYNC_QUEUE_KEY = 'lemgil_sync_queue';
const SYNC_TABLES = [
  'conversiones', 'grupos', 'evangelismos', 'cursos', 'lecciones',
  'estudiantes', 'certificados', 'dadores', 'aportes', 'beneficiarios',
  'campanas', 'entregas', 'metas', 'negocios', 'publicaciones',
  'reportes', 'miembrosComun', 'aportesComun', 'miembros',
  'ministerios', 'miembrosMinisterios', 'hitos', 'zonas', 'colaboradores',
  'tiposPlanes', 'planesColaborador',
] as const;

const DEXIE_TO_SUPABASE: Record<string, string> = {
  miembrosComun: 'miembroscomun',
  aportesComun: 'aportescomun',
  miembrosMinisterios: 'miembrosministerios',
  tiposPlanes: 'tiposplanes',
  planesColaborador: 'planescolaborador',
};

function toSupabase(name: string): string {
  return DEXIE_TO_SUPABASE[name] || name;
}

function toLowerCaseKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toLowerCaseKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key.toLowerCase()] = toLowerCaseKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

const SUPABASE_TO_DEXIE: Record<string, string> = {
  grupoid: 'grupoId',
  diezmadorid: 'diezmadorId',
  campanaid: 'campanaId',
  beneficiarioid: 'beneficiarioId',
  cursoid: 'cursoId',
  leccionid: 'leccionId',
  estid: 'estId',
  estudianteid: 'estudianteId',
  certificadoid: 'certificadoId',
  ministerioid: 'ministerioId',
  miembroministerioid: 'miembroMinisterioId',
  hermanomayorid: 'hermanoMayorId',
  conversionid: 'conversionId',
  origenid: 'origenId',
  mescorrespondiente: 'mesCorrespondiente',
  planofrendasmensual: 'planOfrendasMensual',
  planofrendatipo: 'planOfrendaTipo',
  planofrendamonto: 'planOfrendaMonto',
  planediezmo: 'planDiezmo',
  tipoplanid: 'tipoPlanId',
  colaboradorid: 'colaboradorId',
  montomensual: 'montoMensual',
  contactopreferido: 'contactoPreferido',
  estadocivil: 'estadoCivil',
  fechanacimiento: 'fechaNacimiento',
  fechaingreso: 'fechaIngreso',
  fechabautismo: 'fechaBautismo',
  beneficiarionombre: 'beneficiarioNombre',
  beneficiariotipo: 'beneficiarioTipo',
  metatipo: 'metaTipo',
  metafamilias: 'metaFamilias',
  ingresosmensuales: 'ingresosMensuales',
  generadopor: 'generadoPor',
  generated: 'generado',
};

function toCamelCaseKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCaseKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = SUPABASE_TO_DEXIE[key] || key;
      acc[camelKey] = toCamelCaseKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

type SyncOp = {
  table: string;
  operation: 'create' | 'update' | 'delete';
  id: string;
  data?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  timestamp: number;
};

let skipSync = false;

export type SyncStatus = {
  connected: boolean;
  lastSync: string;
  pendingOps: number;
  error: string;
};

let _statusListeners: ((s: SyncStatus) => void)[] = [];
let _currentStatus: SyncStatus = { connected: false, lastSync: 'Nunca', pendingOps: 0, error: '' };

export function onSyncStatus(fn: (s: SyncStatus) => void) {
  _statusListeners.push(fn);
  fn(_currentStatus);
  return () => { _statusListeners = _statusListeners.filter(l => l !== fn); };
}

function emitStatus(update: Partial<SyncStatus>) {
  _currentStatus = { ..._currentStatus, ...update };
  _statusListeners.forEach(l => l(_currentStatus));
}

function getQueue(): SyncOp[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncOp[]) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

function enqueue(op: SyncOp) {
  const queue = getQueue();
  queue.push(op);
  saveQueue(queue);
  emitStatus({ pendingOps: queue.length });
}

async function processQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;

  let processed = 0;
  for (let i = 0; i < queue.length; i++) {
    const op = queue[i];
    try {
      switch (op.operation) {
        case 'create':
          if (op.data) {
            // Skip records with null grupoId for conversiones
            if (op.table === 'conversiones' && op.data.grupoId === null) {
              console.log(`[Sync] ⏸ Saltando conversión con grupoId null: ${op.data.id}`);
              break;
            }
            // Remove 'base' field for dadores (column doesn't exist in Supabase)
            const payload = op.table === 'dadores' ? (({ base, ...rest }) => rest)(op.data) : op.data;
            const { error } = await supabase.from(toSupabase(op.table)).insert(toLowerCaseKeys(payload));
            if (error) throw error;
          }
          break;
        case 'update':
          if (op.changes) {
            // Remove 'base' field for dadores (column doesn't exist in Supabase)
            const changesPayload = op.table === 'dadores' ? (({ base, ...rest }) => rest)(op.changes) : op.changes;
            const { error } = await supabase.from(toSupabase(op.table)).update(toLowerCaseKeys(changesPayload)).eq('id', op.id);
            if (error) throw error;
          }
          break;
        case 'delete':
          const { error } = await supabase.from(toSupabase(op.table)).delete().eq('id', op.id);
          if (error) throw error;
          break;
      }
      queue.splice(i, 1);
      i--;
      processed++;
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || String(err);
      console.warn(`[Sync] ✗ Cola falló ${op.operation} en ${op.table} (id: ${op.id}):`, msg, err);
      break;
    }
  }
  saveQueue(queue);
  emitStatus({ pendingOps: queue.length });
  if (processed > 0) {
    console.log(`[Sync] ✓ Cola: ${processed} operaciones enviadas`);
  }
}

function enqueueSync(table: string, operation: SyncOp['operation'], data: any) {
  if (skipSync) return;
  if (!navigator.onLine) {
    console.log(`[Sync] ⏳ Offline — encolando ${operation} en ${table}`);
    enqueue({
      table, operation,
      id: data?.id || '',
      data: operation === 'create' ? data : undefined,
      changes: operation === 'update' ? data?.changes : undefined,
      timestamp: Date.now(),
    });
    return;
  }
  const fn = async () => {
    const supaTable = toSupabase(table);
    try {
      switch (operation) {
        case 'create':
          const { error: cErr } = await supabase.from(supaTable).insert(toLowerCaseKeys(data));
          if (cErr) throw cErr;
          console.log(`[Sync] ✓ ${table} → ${supaTable}: registro creado`);
          break;
        case 'update':
          const { updatedAt: _ignored, codigo: _cod, ...cleanChanges } = data.changes || {};
          const { error: uErr } = await supabase.from(supaTable).update(toLowerCaseKeys(cleanChanges)).eq('id', data.id);
          if (uErr) throw uErr;
          console.log(`[Sync] ✓ ${table} → ${supaTable}: registro actualizado`);
          break;
        case 'delete':
          const { error: dErr } = await supabase.from(supaTable).delete().eq('id', data);
          if (dErr) throw dErr;
          console.log(`[Sync] ✓ ${table} → ${supaTable}: registro eliminado`);
          break;
      }
      emitStatus({ connected: true, lastSync: new Date().toLocaleTimeString('es-ES'), error: '' });
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || String(err);
      const code = err?.code || '';
      console.warn(`[Sync] ✗ ${table} → ${supaTable} (${operation}):`, code, msg);
      emitStatus({ error: `${table}: ${msg}` });
      if (code === 'PGRST301' || msg.includes('Failed to fetch') || !navigator.onLine) {
        enqueue({
          table, operation,
          id: data?.id || data || '',
          data: operation === 'create' ? data : undefined,
          changes: operation === 'update' ? data?.changes : undefined,
          timestamp: Date.now(),
        });
      }
    }
  };
  fn();
}

function setupHooks() {
  const tableMap = {
    conversiones: db.conversiones, grupos: db.grupos, evangelismos: db.evangelismos,
    cursos: db.cursos, lecciones: db.lecciones, estudiantes: db.estudiantes,
    certificados: db.certificados, dadores: db.dadores, aportes: db.aportes,
    beneficiarios: db.beneficiarios, campanas: db.campanas, entregas: db.entregas,
    metas: db.metas, negocios: db.negocios, publicaciones: db.publicaciones,
    reportes: db.reportes, miembrosComun: db.miembrosComun, aportesComun: db.aportesComun,
    miembros: db.miembros, ministerios: db.ministerios, miembrosMinisterios: db.miembrosMinisterios,
    hitos: db.hitos, zonas: db.zonas, colaboradores: db.colaboradores,
  } as const;

  for (const [name, table] of Object.entries(tableMap)) {
    table.hook('creating', (_primKey: any, obj: any) => {
      enqueueSync(name, 'create', obj);
    });
    table.hook('updating', (modifications: any, _primKey: any) => {
      enqueueSync(name, 'update', { id: _primKey, changes: modifications });
    });
    table.hook('deleting', (_primKey: any) => {
      enqueueSync(name, 'delete', _primKey);
    });
  }
}

async function pushAllLocal() {
  skipSync = true;
  try {
    let totalPushed = 0;
    for (const table of SYNC_TABLES) {
      const supaTable = toSupabase(table);
      try {
        const localData = await (db as any)[table].toArray();
        if (localData.length === 0) continue;
        const cleaned = localData.map((r: any) => {
          const { _primKey, updatedAt: _u, ...rest } = r;
          if (table === 'dadores') delete (rest as any).base;
          if (table === 'colaboradores') {
            delete (rest as any).planofrendatipo;
            delete (rest as any).planOfrendaTipo;
            if (rest.planofrendamonto == null) rest.planofrendamonto = 0;
            if (rest.planOfrendaMonto == null) rest.planOfrendaMonto = 0;
          }
          delete rest.codigo;
          return rest;
        });
        console.log(`[Sync] ⬆ ${table} → ${supaTable}: subiendo ${cleaned.length} registros locales...`);
        const { error } = await supabase.from(supaTable).upsert(toLowerCaseKeys(cleaned));
        if (error) {
          console.warn(`[Sync] ✗ ${supaTable}: error al subir:`, error.message, error.code);
          if (error.details) console.warn(`  Detalle:`, error.details);
          if (error.hint) console.warn(`  Hint:`, error.hint);
          continue;
        }
        totalPushed += cleaned.length;
        console.log(`[Sync] ✓ ${table} → ${supaTable}: ${cleaned.length} registros sincronizados`);
      } catch (err: any) {
        console.warn(`[Sync] ✗ Excepción en ${table}:`, err.message);
      }
    }
    if (totalPushed > 0) {
      console.log(`[Sync] 🎉 Push completo: ${totalPushed} registros totales sincronizados`);
      emitStatus({ lastSync: new Date().toLocaleTimeString('es-ES'), error: '' });
    } else {
      console.log(`[Sync] No hay datos nuevos para subir`);
    }
  } finally {
    skipSync = false;
  }
}

export async function forcePushAllLocal() {
  skipSync = true;
  try {
    let totalUpserted = 0;
    console.log('[Sync] 🚀 Iniciando FORCE PUSH (Sincronización Total)...');
    for (const table of SYNC_TABLES) {
      const supaTable = toSupabase(table);
      try {
        const localData = await (db as any)[table].toArray();
        if (localData.length === 0) continue;
        const cleaned = localData.map((r: any) => {
          const { _primKey, updatedAt: _u, ...rest } = r;
          if (table === 'dadores') delete (rest as any).base;
          if (table === 'colaboradores') {
            delete (rest as any).planofrendatipo;
            delete (rest as any).planOfrendaTipo;
            if (rest.planofrendamonto == null) rest.planofrendamonto = 0;
            if (rest.planOfrendaMonto == null) rest.planOfrendaMonto = 0;
          }
          delete rest.codigo;
          return rest;
        });
        console.log(`[Sync] ⬆ Forzando ${table} → ${supaTable}: ${cleaned.length} registros...`);
        const { error } = await supabase.from(supaTable).upsert(toLowerCaseKeys(cleaned));
        if (error) {
          console.warn(`[Sync] ✗ ${supaTable} Force: error:`, error.message);
          continue;
        }
        totalUpserted += cleaned.length;
        console.log(`[Sync] ✓ ${table} → ${supaTable}: ${cleaned.length} registros actualizados/subidos`);
      } catch (err: any) {
        console.warn(`[Sync] ✗ Excepción Force ${table}:`, err.message);
      }
    }
    if (totalUpserted > 0) {
      console.log(`[Sync] 🎉 FORCE PUSH completado: ${totalUpserted} registros sincronizados`);
      emitStatus({ lastSync: new Date().toLocaleTimeString('es-ES'), error: '' });
    }
  } finally {
    skipSync = false;
  }
}

async function pullFromSupabase() {
  skipSync = true;
  try {
    let totalPulled = 0;
    for (const table of SYNC_TABLES) {
      const supaTable = toSupabase(table);
      const { data, error } = await supabase.from(supaTable).select('*');
      if (error) {
        console.warn(`[Sync] ✗ Pull ${supaTable}:`, error.message);
        continue;
      }
      if (!data || data.length === 0) continue;

      const normalized = toCamelCaseKeys(data);

      const existingIds = new Set(
        (await (db as any)[table].toArray()).map((r: any) => r.id)
      );

      const toAdd = normalized.filter((r: any) => r.id && !existingIds.has(r.id));
      const toUpdate = normalized.filter((r: any) => r.id && existingIds.has(r.id));

      if (toAdd.length > 0) {
        await (db as any)[table].bulkAdd(toAdd as any[]);
        totalPulled += toAdd.length;
        console.log(`[Sync] ✓ Pull ${supaTable}: +${toAdd.length} nuevos`);
      }

      for (const record of toUpdate) {
        try {
          const existing = await (db as any)[table].get(record.id);
          if (existing) {
            const localUpdated = existing.updatedAt || 0;
            const remoteUpdated = record.updatedAt || 0;
            if (remoteUpdated <= localUpdated) {
              continue;
            }
            const merged = { ...existing };
            for (const [key, val] of Object.entries(record)) {
              if (val !== null && val !== undefined) merged[key] = val;
            }
            await (db as any)[table].update(record.id, merged);
          } else {
            await (db as any)[table].add(record);
          }
        } catch { /* skip if version conflict */ }
      }

      if (toUpdate.length > 0) {
        console.log(`[Sync] ✓ Pull ${supaTable}: ~${toUpdate.length} actualizados`);
      }
    }
    if (totalPulled > 0) {
      console.log(`[Sync] 🎉 Pull completo: ${totalPulled} registros nuevos importados`);
    }
  } finally {
    skipSync = false;
  }
}

async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('conversiones').select('id', { count: 'exact', head: true });
    if (error) {
      console.warn('[Sync] Test conexión falló:', error.message);
      emitStatus({ connected: false, error: error.message });
      return false;
    }
    emitStatus({ connected: true, error: '' });
    console.log('[Sync] ✓ Conexión con Supabase OK');
    return true;
  } catch (err: any) {
    console.warn('[Sync] ✗ No se pudo conectar a Supabase:', err.message);
    emitStatus({ connected: false, error: err.message });
    return false;
  }
}

export async function initSync(): Promise<void> {
  try {
    await db.open();
  } catch { /* already open */ }

  console.log('[Sync] Iniciando sincronización...');
  const connected = await testConnection();

  setupHooks();

  if (connected) {
    await pushAllLocal();
    await processQueue();
    await pullFromSupabase();
  }

  window.addEventListener('online', async () => {
    console.log('[Sync] 🌐 Conexión restaurada');
    const ok = await testConnection();
    if (ok) {
      await processQueue();
      await pullFromSupabase();
    }
  });

  window.addEventListener('offline', () => {
    console.log('[Sync] 📴 Sin conexión');
    emitStatus({ connected: false, error: 'Sin conexión' });
  });

  window.addEventListener('visibilitychange', async () => {
    if (!document.hidden && navigator.onLine) {
      const ok = await testConnection();
      if (ok) {
        await processQueue();
        await pullFromSupabase();
      }
    }
  });

  setInterval(async () => {
    if (navigator.onLine) {
      const ok = await testConnection();
      if (ok) {
        await processQueue();
        await pullFromSupabase();
      }
    }
  }, 30000);
}
