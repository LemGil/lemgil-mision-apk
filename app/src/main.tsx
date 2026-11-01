import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { migrateFromLocalStorage, ensureMetas, backfillIntegrados, ensureZonas, desunificarBienComun, canonizarZonas } from './lib/migrate';
import { initSync } from './lib/sync';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationProvider } from './lib/notification';
import { AuthProvider } from './lib/auth';

registerSW({ immediate: true });

// canonizarZonas va encadenado (no en el Promise.all): necesita el catálogo
// de zonas ya asegurado por ensureZonas.
Promise.all([migrateFromLocalStorage(), ensureMetas(), backfillIntegrados(), ensureZonas(), desunificarBienComun()]).then(() => canonizarZonas()).then(() => {
  console.log('[Main] Migraciones completadas, renderizando...');
  // El render no debe esperar a la red: si el sync se cuelga (p.ej. una tabla que
  // nunca responde), la app igualmente abre. El sync corre en paralelo.
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
  initSync().catch(e => console.warn('[Sync] init failed (offline?):', e));
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
