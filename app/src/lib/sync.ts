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
            const { error } = await supabase.from(toSupabase(op.table)).insert(op.data);
            if (error) throw error;
          }
          break;
        case 'update':
          if (op.changes) {
            const { error } = await supabase.from(toSupabase(op.table)).update(op.changes).eq('id', op.id);
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
          const { error: cErr } = await supabase.from(supaTable).insert(data);
          if (cErr) throw cErr;
          console.log(`[Sync] ✓ ${table} → ${supaTable}: registro creado`);
          break;
        case 'update':
          const { error: uErr } = await supabase.from(supaTable).update(data.changes).eq('id', data.id);
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
        const { count, error: countErr } = await supabase.from(supaTable).select('*', { count: 'exact', head: true });
        if (countErr) {
          console.warn(`[Sync] ✗ No se pudo verificar ${supaTable}:`, countErr.message);
          continue;
        }
        if (count && count > 0) {
          console.log(`[Sync] ⏭ ${supaTable}: ya tiene ${count} registros remotos, saltando push`);
          continue;
        }
        const localData = await (db as any)[table].toArray();
        if (localData.length === 0) continue;
        const cleaned = localData.map((r: any) => {
          const { _primKey, ...rest } = r;
          return rest;
        });
        console.log(`[Sync] ⬆ ${table} → ${supaTable}: subiendo ${cleaned.length} registros locales...`);
        const { error } = await supabase.from(supaTable).insert(cleaned);
        if (error) {
          console.warn(`[Sync] ✗ ${supaTable}: error al subir:`, error.message, error.code);
          if (error.details) console.warn(`  Detalle:`, error.details);
          if (error.hint) console.warn(`  Hint:`, error.hint);
          continue;
        }
        totalPushed += cleaned.length;
        console.log(`[Sync] ✓ ${table} → ${supaTable}: ${cleaned.length} registros subidos`);
      } catch (err: any) {
        console.warn(`[Sync] ✗ Excepción en ${table}:`, err.message);
      }
    }
    if (totalPushed > 0) {
      console.log(`[Sync] 🎉 Push completo: ${totalPushed} registros totales subidos`);
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
          const { _primKey, ...rest } = r;
          return rest;
        });
        console.log(`[Sync] ⬆ Forzando ${table} → ${supaTable}: ${cleaned.length} registros...`);
        const { error } = await supabase.from(supaTable).upsert(cleaned);
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
      if (data && data.length > 0) {
        const count = await (db as any)[table].count();
        if (count === 0) {
          await (db as any)[table].bulkAdd(data as any[]);
          totalPulled += data.length;
          console.log(`[Sync] ✓ Pull ${supaTable}: ${data.length} registros importados`);
        }
      }
    }
    if (totalPulled > 0) {
      console.log(`[Sync] 🎉 Pull completo: ${totalPulled} registros totales importados`);
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
    }
  });

  window.addEventListener('offline', () => {
    console.log('[Sync] 📴 Sin conexión');
    emitStatus({ connected: false, error: 'Sin conexión' });
  });

  setInterval(async () => {
    if (navigator.onLine) {
      const ok = await testConnection();
      if (ok) await processQueue();
    }
  }, 30000);
}
