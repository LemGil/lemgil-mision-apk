import { useEffect, useState } from "react";
import { onSyncStatus, getCurrentStatus } from "../lib/sync/status";
import { type SyncStatus } from "../lib/sync/types";

/**
 * Indicador de sincronización (Fase 1): refleja el estado REAL.
 * - «⟳ N pendientes»: hay cambios locales aún sin subir.
 * - «✗ Sync»: el último ciclo tuvo errores; al tocarlo se abre un panel con
 *   la lista completa de errores (tabla + mensaje) para poder leerlos y
 *   copiarlos. (Antes el detalle vivía en el atributo title y no se podía
 *   abrir en pantallas táctiles.)
 * - «✓ Synced»: solo cuando no queda nada pendiente y no hubo errores.
 * Antes decía «Synced» aunque la subida hubiera fallado en silencio.
 */
export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>(() => getCurrentStatus());
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => onSyncStatus(setStatus), []);

  // Si un ciclo limpio borra el error, el panel se cierra solo.
  useEffect(() => {
    if (!status.error) setShowDetail(false);
  }, [status.error]);

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
      <>
        <div
          style={{ ...base, background: "var(--red)", cursor: "pointer", opacity: 0.95 }}
          title={status.error}
          onClick={() => setShowDetail(true)}
        >
          ✗ Sync{status.pending > 0 ? ` (${status.pending} pendientes)` : ""} — toca para detalle
        </div>
        {showDetail && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 10000,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
            onClick={() => setShowDetail(false)}
          >
            <div
              style={{
                background: "white", color: "#1a1a1a", borderRadius: 12, width: "100%",
                maxWidth: 540, maxHeight: "75vh", display: "flex", flexDirection: "column",
                boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", borderBottom: "1px solid #e5e5e5",
                }}
              >
                <strong style={{ fontSize: 14 }}>Errores de sincronización</strong>
                <button
                  type="button"
                  onClick={() => setShowDetail(false)}
                  style={{
                    background: "none", border: "none", fontSize: 16, cursor: "pointer",
                    color: "#666", padding: "2px 6px", lineHeight: 1,
                  }}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
              <div style={{ overflowY: "auto", padding: "8px 16px 16px" }}>
                {status.errors.length > 0 ? (
                  status.errors.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "8px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12,
                        userSelect: "text", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}
                    >
                      <strong>{e.table}:</strong> {e.message}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 12, userSelect: "text", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {status.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </>
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
