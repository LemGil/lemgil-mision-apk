import { SYNC_TABLES, tableMap } from "./api";
import { enqueueOutbox, removeOutboxFor, addTombstone, isApplyingRemote } from "./queue";
import type { SyncTableName } from "./types";

/**
 * Ganchos de Dexie (Fase 1+2):
 * - Al crear un registro: le pone version=1 y updatedAt si faltan, y lo encola para subir.
 * - Al actualizar un registro: incrementa su version y renueva updatedAt automáticamente
 *   (antes la version casi nunca subía y la resolución de conflictos no funcionaba).
 * - Al borrar un registro: deja una tumba de borrado SIN caducidad y limpia su entrada de la cola.
 *
 * NOTA TÉCNICA: los ganchos de Dexie corren dentro de la transacción de la
 * tabla que se escribe y no pueden tocar otra tabla desde ahí (Dexie rechaza
 * la operación en silencio). Por eso la bandeja y las tumbas se alimentan a
 * través de queue.ts, que escribe con Dexie.ignoreTransaction().
 *
 * Cuando el pull aplica cambios que vienen de la nube, `isApplyingRemote()`
 * evita que esos cambios se vuelvan a encolar o se les suba la versión.
 */

/** Próxima versión de un registro editado (función pura, probada en tests). */
export function nextVersion(obj: { version?: number } | null | undefined): number {
  return ((obj?.version as number) || 0) + 1;
}

export function setupHooks(): void {
  for (const table of SYNC_TABLES) {
    const dbTable = tableMap[table];
    if (!dbTable) continue;
    const tableName = table as SyncTableName;

    dbTable.hook("creating", (_primKey, obj) => {
      if (isApplyingRemote() || !obj) return;
      const now = new Date().toISOString();
      if (obj.version == null) obj.version = 1;
      if (obj.updatedAt == null) obj.updatedAt = now;
      if (typeof obj.id === "string") void enqueueOutbox(tableName, obj.id);
    });

    dbTable.hook("updating", (mods, _primKey, obj) => {
      if (isApplyingRemote() || !obj) return undefined;
      if (typeof obj.id === "string") void enqueueOutbox(tableName, obj.id);
      return { ...mods, version: nextVersion(obj as { version?: number }), updatedAt: new Date().toISOString() };
    });

    dbTable.hook("deleting", (primKey) => {
      if (isApplyingRemote()) return;
      if (typeof primKey === "string") {
        void removeOutboxFor(tableName, primKey);
        void addTombstone(tableName, primKey);
      }
    });
  }
}

