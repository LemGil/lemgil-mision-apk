import { db } from './database';
import { setupHooks } from './sync/hooks';
import { processQueue, pushAllLocal, pullFromSupabase, testConnection } from './sync/api';

export * from './sync/api';
export { onSyncStatus } from './sync/status';

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
