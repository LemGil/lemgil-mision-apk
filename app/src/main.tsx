import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { migrateFromLocalStorage, ensureMetas, backfillIntegrados, ensureZonas, desunificarBienComun } from './lib/migrate';
import { initSync } from './lib/sync';

Promise.all([migrateFromLocalStorage(), ensureMetas(), backfillIntegrados(), ensureZonas(), desunificarBienComun()]).then(async () => {
  try { await initSync(); } catch (e) { console.warn('[Sync] init failed (offline?):', e); }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});