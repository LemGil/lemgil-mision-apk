import { useEffect, useState } from "react";
import { onSyncStatus, getCurrentStatus } from "../lib/sync/status";
import { type SyncStatus } from "../lib/sync/types";

/**
 * Indicador de sincronización (Fase 1): refleja el estado REAL.
 * - «⟳ N pendientes»: hay cambios locales aún sin subir.
 * - «✗ Sync»: el último ciclo tuvo errores (el detalle va en el título).
 * - «✓ Synced»: solo cuando no queda nada pendiente y no hubo errores.
 * Antes decía «Synced» aunque la subida hubiera fallado en silencio.
 */
export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>(() => getCurrentStatus());

  useEffect(() => onSyncStatus(setStatus), []);

  const base: React.CSSProperties = {
    position: "fixed", bottom: 12, right: 12, color: "white", padding: "6px 12px",
    borderRadius: 8, fontSize: 11, fontWeight: 700, zIndex: 9999,
  };

  if (status.syncing) {
    return (
      <div style={{ ...base, background: "var(--yellow)", color: "var(--d1, #222)", opacity: 0.95 }}>
        ⟳ Sincronizando…
      </div>
    );
  }

  if (status.error) {
    return (
      <div style={{ ...base, background: "var(--red)", cursor: "pointer", opacity: 0.95 }} title={status.error}>
        ✗ Sync{status.pending > 0 ? ` (${status.pending} pendientes)` : ""} — toca para detalle
      </div>
    );
  }

  if (status.pending > 0) {
    return (
      <div style={{ ...base, background: "var(--yellow)", color: "var(--d1, #222)", opacity: 0.95 }} title="Cambios locales esperando conexión para subirse">
        ⟳ {status.pending} pendiente{status.pending !== 1 ? "s" : ""}
      </div>
    );
  }

  if (status.connected) {
    return (
      <div style={{ ...base, background: "var(--green)", opacity: 0.85 }} title={`Último sync: ${status.lastSync}`}>
        ✓ Synced
      </div>
    );
  }

  return null;
}
