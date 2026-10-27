import Dexie from "dexie";
import { db } from "../database";
import type { SyncTableName } from "./types";
import type { SyncOutboxEntry, SyncTombstone } from "../database";

/**
 * Bandeja de salida y registro de borrados de la sincronización (Fase 1).
 *
 * Antes los borrados vivían en localStorage y CADUCABAN a las 24 horas: pasado
 * ese plazo un registro borrado podía resucitar al bajar datos de la nube.
 * Ahora todo vive en IndexedDB (Dexie) y no caduca: cada cambio se sube sí o sí.
 */

const LEGACY_DELETED_KEY = "lemgil_deleted_ids";

function tombstoneId(table: SyncTableName, recordId: string): string {
  return `${table}:${recordId}`;
}

/**
 * Ejecuta fuera de cualquier transacción Dexie activa. Los ganchos «creating /
 * updating / deleting» corren dentro de la transacción de la tabla que se
 * escribe; intentar tocar otra tabla desde ahí hace que Dexie rechace la
 * operación, por eso la bandeja SIEMPRE se alimenta por esta vía.
 */
function outsideTx<T>(fn: () => Promise<T>): Promise<T> {
  return Dexie.ignoreTransaction(fn);
}

export async function enqueueOutbox(table: SyncTableName, recordId: string): Promise<void> {
  return outsideTx(async () => {
    try {
      const existing = await db.syncQueue.where({ table, recordId }).first();
      if (!existing) {
        await db.syncQueue.add({ table, recordId, ts: Date.now() });
      }
    } catch {
      // La bandeja es de mejor esfuerzo: un fallo aquí lo cubre el sync forzado.
    }
  });
}

export async function removeOutboxFor(table: SyncTableName, recordId: string): Promise<void> {
  return outsideTx(async () => {
    try {
      await db.syncQueue.where({ table, recordId }).delete();
    } catch { /* sin consecuencias */ }
  });
}

export async function getOutbox(): Promise<SyncOutboxEntry[]> {
  try {
    return await db.syncQueue.orderBy("id").toArray();
  } catch {
    return [];
  }
}

export async function clearOutbox(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await db.syncQueue.bulkDelete(ids);
  } catch { /* sin consecuencias */ }
}

export async function addTombstone(table: SyncTableName, recordId: string): Promise<void> {
  return outsideTx(async () => {
    try {
      await db.syncTombstones.put({ id: tombstoneId(table, recordId), table, recordId, ts: Date.now() });
    } catch { /* sin consecuencias */ }
  });
}

export async function removeTombstone(table: SyncTableName, recordId: string): Promise<void> {
  return outsideTx(async () => {
    try {
      await db.syncTombstones.delete(tombstoneId(table, recordId));
    } catch { /* sin consecuencias */ }
  });
}

export async function getTombstones(): Promise<SyncTombstone[]> {
  try {
    return await db.syncTombstones.toArray();
  } catch {
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const [outbox, tombs] = await Promise.all([db.syncQueue.count(), db.syncTombstones.count()]);
    return outbox + tombs;
  } catch {
    return 0;
  }
}

/** Compatibilidad: conteo de borrados pendientes (antes leía localStorage). */
export async function getDeletedCount(): Promise<number> {
  try {
    return await db.syncTombstones.count();
  } catch {
    return 0;
  }
}

/**
 * Pasa a IndexedDB los borrados que el sync antiguo guardaba en localStorage,
 * para que ningún borrado pendiente de la versión anterior se pierda.
 */
export async function importLegacyTombstones(): Promise<void> {
  try {
    const raw = localStorage.getItem(LEGACY_DELETED_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, { table: string; id: string; ts: number }>;
    for (const entry of Object.values(parsed)) {
      if (entry && typeof entry.table === "string" && typeof entry.id === "string") {
        await db.syncTombstones.put({
          id: tombstoneId(entry.table as SyncTableName, entry.id),
          table: entry.table as SyncTableName,
          recordId: entry.id,
          ts: entry.ts || Date.now(),
        });
      }
    }
    localStorage.removeItem(LEGACY_DELETED_KEY);
  } catch { /* si falla, el sync forzado sigue cubriendo los datos */ }
}

/** Encola TODOS los registros locales (arranque de la primera sincronización incremental). */
export async function enqueueAllRecords(
  tables: { name: SyncTableName; ids: () => Promise<string[]> }[],
): Promise<void> {
  for (const t of tables) {
    try {
      const ids = await t.ids();
      for (const id of ids) await enqueueOutbox(t.name, id);
    } catch { /* tabla por tabla, sin bloquear el resto */ }
  }
}

/**
 * Marca «aplicando cambios remotos»: mientras el pull escribe datos que vienen
 * de la nube, los ganchos no deben encolarlos ni subirles la versión.
 */
let applyingRemote = false;

export function setApplyingRemote(v: boolean): void {
  applyingRemote = v;
}

export function isApplyingRemote(): boolean {
  return applyingRemote;
}
