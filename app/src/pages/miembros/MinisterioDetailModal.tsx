import { Modal } from '../../components/Modal';
import { fmt } from '../../lib/utils';
import type { Miembro, MiembroMinisterio, Ministerio } from '../../lib/types';
import { ROL_BADGE } from './constants';

interface MinisterioDetailModalProps {
  open: boolean;
  onClose: () => void;
  selMinisterio: Ministerio | undefined;
  asignaciones: MiembroMinisterio[];
  miembros: Miembro[];
  onEditar: () => void;
  onAsignar: () => void;
  onEliminar: () => void;
}

export function MinisterioDetailModal(props: MinisterioDetailModalProps) {
  const { open, onClose, selMinisterio, asignaciones, miembros, onEditar, onAsignar, onEliminar } = props;
  return (
      <Modal open={open} onClose={onClose} title="Detalle del ministerio" wide>
        {selMinisterio && (() => {
          const asigs = asignaciones.filter((a) => a.ministerioId === selMinisterio.id);
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 40 }}>{selMinisterio.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selMinisterio.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>Ministro: {selMinisterio.lider || '—'}</div>
                </div>
                <div style={{ width: 24, height: 24, background: selMinisterio.color, borderRadius: 4 }} />
              </div>
              {selMinisterio.descripcion && (
                <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>{selMinisterio.descripcion}</div>
              )}
              <h4 style={{ marginBottom: 8 }}>Miembros sirviendo ({asigs.length})</h4>
              {asigs.length === 0 ? <div style={{ color: 'var(--dim)', fontSize: 13 }}>Aún no hay miembros asignados</div> : (
                <table className="data-table">
                  <thead><tr><th>Miembro</th><th>Rol</th><th>Desde</th><th>Notas</th></tr></thead>
                  <tbody>
                    {asigs.map((a) => {
                      const m = miembros.find((x) => x.id === a.miembroId);
                      if (!m) return null;
                      return (
                        <tr key={a.id}>
                          <td><strong>{m.nombre} {m.apellido}</strong></td>
                          <td><span className={`badge ${ROL_BADGE[a.rol]}`}>{a.rol}</span></td>
                          <td style={{ fontSize: 12 }}>{fmt(a.desde)}</td>
                          <td style={{ fontSize: 12 }}>{a.notas || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={onEditar}>✏ Editar</button>
                <button className="btn btn-gold" onClick={onAsignar}>➕ Asignar miembro</button>
                <button className="btn btn-danger" onClick={onEliminar}>🗑 Eliminar</button>
              </div>
            </>
          );
        })()}
      </Modal>
  );
}
