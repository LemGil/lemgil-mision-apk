import { db } from "./database";
import { setupHooks } from "./sync/hooks";
import {
  pushOutbox, pullFromSupabase, testConnection, enqueueAllLocalRecords,
  forcePushAllLocal,
} from "./sync/api";
import { emitStatus, loadLastSync, saveLastSync } from "./sync/status";
import { importLegacyTombstones, getPendingCount } from "./sync/queue";
import { summarizeErrors } from "./sync/types";
import type { SyncError } from "./sync/types";

export * from "./sync/api";
export { onSyncStatus } from "./sync/status";
export { forcePushAllLocal };

/**
 * Orquestación de la sincronización (Fase 1):
 * - Candado: nunca corren dos syncs a la vez (antes el temporizador, el foco de
 *   la pestaña y el evento «online» podían pisarse entre sí).
 * - Subida incremental: solo se envían los registros de la bandeja de salida.
 * - La bajada completa se hace al abrir, al volver la conexión, al enfocar la
 *   pestaña y como máximo cada 5 minutos (antes: cada 30 segundos).
 * - Los errores quedan visibles en el estado: el «✓ Synced» ahora es verdad.
 */

const PULL_EVERY_MS = 5 * 60 * 1000;

let running = false;
let lastPullAt = 0;
let bootstrapped = false;

async function bootstrapIfNeeded(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  // Primera corrida del sync incremental en este dispositivo: no hay «último
  // sync» registrado → se encola todo lo local una sola vez, como hacía el
  // sync antiguo en cada ciclo. De ahí en adelante solo viajan los cambios.
  if (loadLastSync() === "Nunca") {
    await enqueueAllLocalRecords();
  }
}

export async function runSync(opts: { pull?: boolean } = {}): Promise<void> {
  if (running) return;
  running = true;
  emitStatus({ syncing: true });
  try {
    const connected = await testConnection();
    if (!connected) return;

    await bootstrapIfNeeded();

    const errors: SyncError[] = [];
    const pendingBefore = await getPendingCount();
    if (pendingBefore > 0) {
      errors.push(...(await pushOutbox()));
    }

    const now = Date.now();
    if (opts.pull || now - lastPullAt > PULL_EVERY_MS) {
      errors.push(...(await pullFromSupabase()));
      lastPullAt = now;
    }

    const pending = await getPendingCount();
    if (errors.length === 0 && pending === 0) {
      emitStatus({ lastSync: saveLastSync(), error: "", pending: 0 });
    } else {
      emitStatus({ pending });
      if (errors.length > 0) {
        emitStatus({ error: summarizeErrors(errors) });
        console.warn("[Sync] ⚠️ Sync con errores:", errors);
      }
    }
  } catch (err: unknown) {
    console.warn("[Sync] Falló el ciclo de sincronización:", err);
    emitStatus({ error: err instanceof Error ? err.message : String(err) });
  } finally {
    running = false;
    emitStatus({ syncing: false });
  }
}

export async function initSync(): Promise<void> {
  try { await db.open(); } catch { /* ya abierta */ }

  console.log("[Sync] Iniciando sincronización...");
  await importLegacyTombstones();
  setupHooks();

  await runSync({ pull: true });

  window.addEventListener("online", () => {
    console.log("[Sync] 🌐 Conexión restaurada");
    void runSync({ pull: true });
  });

  window.addEventListener("offline", () => {
    console.log("[Sync] 📴 Sin conexión");
    emitStatus({ connected: false });
  });

  window.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine) {
      void runSync({ pull: true });
    }
  });

  // Temporizador: SOLO sube si hay cambios pendientes; la bajada queda
  // limitada por PULL_EVERY_MS dentro de runSync.
  setInterval(() => {
    if (navigator.onLine) void runSync({ pull: false });
  }, 30000);
}
