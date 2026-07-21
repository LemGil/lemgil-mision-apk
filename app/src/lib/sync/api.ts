import { supabase } from '../supabase';
import { db } from '../database';
import type { SyncOp } from './types';
import { emitStatus } from './status';
import { getQueue, saveQueue, enqueue, getDeletedIds, unmarkDeleted } from './queue';

export const SYNC_TABLES = [
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

export function toLowerCaseKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toLowerCaseKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key.toLowerCase()] = toLowerCaseKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

export const SUPABASE_TO_DEXIE: Record<string, string> = {
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

export let skipSync = false;
export function setSkipSync(val: boolean) { skipSync = val; }

export async function processQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;

  let processed = 0;
  for (let i = 0; i < queue.length; i++) {
    const op = queue[i];
    try {
      switch (op.operation) {
        case 'create':
          if (op.data) {
            const payload = op.table === 'dadores' ? (({ base, ...rest }) => rest)(op.data) : op.data;
            const { error } = await supabase.from(toSupabase(op.table)).insert(toLowerCaseKeys({ ...payload, version: 1 }));
            if (error) throw error;
          }
          break;
        case 'update':
          if (op.changes) {
            const { updatedAt: _eu, codigo: _ec, version: _v, ...cleaned } = op.changes;
            const changesPayload = op.table === 'dadores' ? (({ base, ...rest }) => rest)(cleaned) : cleaned;
            
            const currentVersion = (op.data as any)?.version || 1;
            const nextVersion = currentVersion + 1;

            const { data: result, error } = await supabase
              .from(toSupabase(op.table))
              .update(toLowerCaseKeys({ ...changesPayload, version: nextVersion }))
              .eq('id', op.id)
              .eq('version', currentVersion)
              .select();

            if (error) throw error;

            if (!result || result.length === 0) {
              console.warn(`[Sync] CONFLICTO: ${op.table} (id: ${op.id})`);
              window.dispatchEvent(new CustomEvent('sync-conflict', { detail: { table: op.table, id: op.id } }));
              queue.splice(i, 1); i--; processed++;
              continue;
            }
          }
          break;
        case 'delete':
          const { error } = await supabase.from(toSupabase(op.table)).delete().eq('id', op.id);
          if (error) throw error;
          unmarkDeleted(op.id);
          break;
      }
      queue.splice(i, 1);
      i--;
      processed++;
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || String(err);
      console.warn(`[Sync] ✗ Cola falló ${op.operation} en ${op.table} (id: ${op.id}):`, msg);
      break;
    }
  }
  saveQueue(queue);
  emitStatus({ pendingOps: queue.length });
  if (processed > 0) {
    console.log(`[Sync] ✓ Cola: ${processed} operaciones procesadas`);
  }
}

export async function enqueueSync(table: string, operation: SyncOp['operation'], data: any) {
  if (skipSync) return;
  
  const version = (operation === 'update' && data.changes?.version) 
    ? data.changes.version 
    : (data?.version || 1);

  if (!navigator.onLine) {
    enqueue({
      table, operation,
      id: data?.id || '',
      data: { ...data, version },
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
          const { error: cErr } = await supabase.from(supaTable).insert(toLowerCaseKeys({ ...data, version: 1 }));
          if (cErr) throw cErr;
          break;
        case 'update':
          const { updatedAt: _ignored, codigo: _cod, version: _v, ...cleanChanges } = data.changes || {};
          const nextVersion = version + 1;
          
          const { data: result, error: uErr } = await supabase
            .from(supaTable)
            .update(toLowerCaseKeys({ ...cleanChanges, version: nextVersion }))
            .eq('id', data.id)
            .eq('version', version)
            .select();
            
          if (uErr) throw uErr;
          if (!result || result.length === 0) {
            window.dispatchEvent(new CustomEvent('sync-conflict', { detail: { table, id: data.id } }));
            throw new Error('Conflicto de versión');
          }
          break;
        case 'delete':
          const { error: dErr } = await supabase.from(supaTable).delete().eq('id', data);
          if (dErr) throw dErr;
          unmarkDeleted(data);
          break;
      }
      emitStatus({ connected: true, lastSync: new Date().toLocaleTimeString('es-ES'), error: '' });
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || String(err);
      console.warn(`[Sync] ✗ ${table} → ${supaTable} (${operation}):`, msg);
      enqueue({
        table, operation,
        id: data?.id || data || '',
        data: operation === 'create' ? data : undefined,
        changes: operation === 'update' ? data?.changes : undefined,
        timestamp: Date.now(),
      });
    }
  };
  fn();
}

async function bulkUpsertAll(force: boolean) {
  skipSync = true;
  try {
    await processQueue();

    let total = 0;
    for (const table of SYNC_TABLES) {
      const supaTable = toSupabase(table);
      try {
        const localData = await (db as any)[table].toArray();
        if (localData.length === 0) continue;
        const cleaned = localData.map((r: any) => {
          const { _primKey, updatedAt: _u, ...rest } = r;
          if (table === 'dadores') delete (rest as any).base;
          if (table === 'colaboradores') {
            if (rest.planOfrendaMonto == null) rest.planOfrendaMonto = 0;
          }
          delete rest.codigo;
          return rest;
        });

        if (force) {
          const { error } = await supabase.from(supaTable).upsert(toLowerCaseKeys(cleaned));
          if (error) continue;
        } else {
          for (const record of cleaned) {
            const version = record.version || 1;
            const { error } = await supabase
              .from(supaTable)
              .upsert(toLowerCaseKeys({ ...record, version }))
              .eq('id', record.id)
              .eq('version', version);
            if (error) continue;
          }
        }
        total += cleaned.length;
      } catch (err: any) { console.warn(`[Sync] ✗ Excepción en ${table}:`, err.message); }
    }
    console.log(`[Sync] ✓ Push ${force ? 'forzado' : 'normal'}: ${total} registros`);
  } finally {
    skipSync = false;
  }
}

export async function pushAllLocal() {
  return bulkUpsertAll(false);
}

export async function forcePushAllLocal() {
  return bulkUpsertAll(true);
}

export async function pullFromSupabase() {
  skipSync = true;
  try {
    for (const table of SYNC_TABLES) {
      const supaTable = toSupabase(table);
      const { data, error } = await supabase.from(supaTable).select('*');
      if (error || !data || data.length === 0) continue;

      const normalized = toCamelCaseKeys(data);
      const existingIds = new Set((await (db as any)[table].toArray()).map((r: any) => r.id));
      const deletedIds = getDeletedIds();

      const toAdd = normalized.filter((r: any) => r.id && !existingIds.has(r.id) && !deletedIds[r.id]);
      const toUpdate = normalized.filter((r: any) => r.id && existingIds.has(r.id));

      if (toAdd.length > 0) await (db as any)[table].bulkAdd(toAdd as any[]);

      for (const record of toUpdate) {
        try {
          const existing = await (db as any)[table].get(record.id);
          if (existing) {
            const localVersion = existing.version || 0;
            const remoteVersion = record.version || 0;
            if (remoteVersion <= localVersion) continue; // Si es igual o menor, no actualizamos
            await (db as any)[table].update(record.id, record);
          }
        } catch { }
      }
    }
  } finally {
    skipSync = false;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('conversiones').select('id', { count: 'exact', head: true });
    if (error) {
      emitStatus({ connected: false, error: error.message });
      return false;
    }
    emitStatus({ connected: true, error: '' });
    return true;
  } catch (err: any) {
    emitStatus({ connected: false, error: err.message });
    return false;
  }
}
