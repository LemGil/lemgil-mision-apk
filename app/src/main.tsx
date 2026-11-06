import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { migrateFromLocalStorage, ensureMetas, backfillIntegrados, ensureZonas, desunificarBienComun, canonizarZonas, unificarPersonas, asegurarDiezmadores, ensurePasosMiembro, ensurePasosMision, migrarEstadosAPasos } from './lib/migrate';
import { instalarVigilanciaDeVersion } from './lib/database';
import { initSync } from './lib/sync';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationProvider } from './lib/notification';
import { AuthProvider } from './lib/auth';

registerSW({ immediate: true });

// Vigilancia de versión de la base: si una versión nueva de la app abre la
// base en un esquema mayor, esta ventana cierra su conexión y se recarga en
// vez de seguir viva con una conexión zombi que rompe la sincronización
// (DatabaseClosedError). Va antes de los pases: son los primeros que tocan
// la base y la recarga debe poder ocurrir en cuanto se detecte el cambio.
instalarVigilanciaDeVersion();

// canonizarZonas va encadenado (no en el Promise.all): necesita el catálogo
// de zonas ya asegurado por ensureZonas. unificarPersonas (ficha única, P0)
// va tras canonizarZonas: el núcleo de cada persona nace con la zona limpia.
// asegurarDiezmadores (P7) va tras unificarPersonas: recoge los diezmadores
// que la migración no enlazó y les asegura su persona antes de pintar.
// migrarEstadosAPasos (Fase 2) va encadenado tras la semilla de Misión:
// traduce los estados-etiqueta de las conversiones a identidad de paso.
Promise.all([migrateFromLocalStorage(), ensureMetas(), backfillIntegrados(), ensureZonas(), desunificarBienComun(), ensurePasosMiembro(), ensurePasosMision()]).then(() => migrarEstadosAPasos()).then(() => canonizarZonas()).then(() => unificarPersonas()).then(() => asegurarDiezmadores()).then(() => {
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
