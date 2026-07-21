import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { migrateFromLocalStorage, ensureMetas, backfillIntegrados, ensureZonas, desunificarBienComun } from './lib/migrate';
import { initSync } from './lib/sync';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationProvider } from './lib/notification';
import { AuthProvider } from './lib/auth';

registerSW({ immediate: true });

Promise.all([migrateFromLocalStorage(), ensureMetas(), backfillIntegrados(), ensureZonas(), desunificarBienComun()]).then(async () => {
  console.log('[Main] Migraciones completadas, iniciando sync...');
  try { await initSync(); } catch (e) { console.warn('[Sync] init failed (offline?):', e); }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </NotificationProvider>
      </AuthProvider>
    </StrictMode>,
  );
}).catch(err => {
  console.error('[Main] Error crítico en migraciones:', err);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </NotificationProvider>
      </AuthProvider>
    </StrictMode>,
  );
});