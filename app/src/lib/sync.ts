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
}

async function processQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;

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
    } catch (err) {
      console.warn(`[Sync] Error processing ${op.operation} on ${op.table}:`, err);
      break;
    }
  }
  saveQueue(queue);
}

function enqueueSync(table: string, operation: SyncOp['operation'], data: any) {
  if (skipSync) return;
  if (!navigator.onLine) {
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
    try {
      switch (operation) {
        case 'create':
          await supabase.from(table).insert(data);
          break;
        case 'update':
          await supabase.from(table).update(data.changes).eq('id', data.id);
          break;
        case 'delete':
          await supabase.from(table).delete().eq('id', data);
          break;
      }
    } catch (err: any) {
      if (err?.code === 'PGRST301' || err?.message?.includes('Failed to fetch') || !navigator.onLine) {
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

async function pullFromSupabase() {
  skipSync = true;
  try {
    for (const table of SYNC_TABLES) {
      const supabaseTable = toSupabase(table);
      const { data, error } = await supabase.from(supabaseTable).select('*');
      if (error) {
        console.warn(`[Sync] Could not pull ${table}:`, error.message);
        continue;
      }
      if (data && data.length > 0) {
        const count = await (db as any)[table].count();
        if (count === 0) {
          await (db as any)[table].bulkAdd(data as any[]);
        }
      }
    }
  } finally {
    skipSync = false;
  }
}

export async function initSync(): Promise<void> {
  try {
    await db.open();
  } catch { /* already open */ }

  setupHooks();
  await processQueue();
  await pullFromSupabase();

  window.addEventListener('online', () => {
    processQueue();
  });

  setInterval(processQueue, 30000);
}
