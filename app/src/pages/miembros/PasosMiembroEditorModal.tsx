import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '../../components/Modal';
import { db } from '../../lib/database';
import { createBaseRecord } from '../../lib/utils/recordHelpers';
import { showToast } from '../../lib/notification';
import { ordenarPasos } from '../../lib/pasosMiembro';
import type { FuentePasoSeguimiento, PasoSeguimiento } from '../../lib/types';

interface PasosMiembroEditorModalProps {
  open: boolean;
  onClose: () => void;
  /** El catálogo completo; aquí se gestiona solo el ámbito 'miembro'. */
  pasos: PasoSeguimiento[];
}

const FUENTE_LABEL: Record<FuentePasoSeguimiento, string> = {
  integracion: 'Automático · Integración (gozne con Misión)',
  grupo: 'Automático · Tiene grupo asignado',
  academia: 'Automático · Estudiante activo en la Academia',
  ministerio: 'Automático · Asignado a un ministerio',
  hermanoMayor: 'Automático · Es hermano mayor de alguien',
  manual: 'Manual · Se registra como hito en la ficha',
};

const FUENTES = Object.keys(FUENTE_LABEL) as FuentePasoSeguimiento[];

/**
 * Editor del catálogo de pasos del miembro (Fase 1): el patrón de los
 * catálogos de la app (Zonas, Grupos, Ministerios) aplicado a la
 * escalera — los pasos son DATOS que se sincronizan, no código. La
 * identidad de cada paso es fija: aquí se edita la etiqueta (nombre y
 * emoji), el orden y la fuente; el paso protegido (el gozne de
 * Integración) no se puede borrar ni cambiar de fuente.
 * Las ediciones se guardan al momento (como el rol inline de las
 * asignaciones) y viajan por la cola de sync como cualquier registro.
 */
export function PasosMiembroEditorModal({ open, onClose, pasos }: PasosMiembroEditorModalProps) {
  const hitos = useLiveQuery(() => db.hitos.toArray(), []) ?? [];
  const lista = ordenarPasos(pasos.filter((p) => p.ambito === 'miembro'));
  // Borradores de etiqueta por paso: lo tecleado no se pierde con el
  // refresco en vivo; se guarda al salir del campo (o con Enter).
  const [borradores, setBorradores] = useState<Record<string, { nombre: string; emoji: string }>>({});
  const borradorDe = (p: PasoSeguimiento) => borradores[p.id] ?? { nombre: p.nombre, emoji: p.emoji };

  const guardarEtiqueta = async (p: PasoSeguimiento) => {
    const b = borradorDe(p);
    const nombre = b.nombre.trim();
    const emoji = b.emoji.trim();
    if (!nombre) { showToast('El nombre del paso no puede quedar vacío'); return; }
    if (nombre === p.nombre && emoji === (p.emoji || '')) return;
    await db.pasosSeguimiento.update(p.id, { nombre, emoji });
    showToast(`Paso «${nombre}» actualizado`);
  };

  const cambiarFuente = async (p: PasoSeguimiento, fuente: FuentePasoSeguimiento) => {
    if (p.protegido || fuente === p.fuente) return;
    await db.pasosSeguimiento.update(p.id, { fuente });
    showToast(`Fuente de «${p.nombre}» actualizada`);
  };

  const mover = async (p: PasoSeguimiento, dir: -1 | 1) => {
    const idx = lista.findIndex((x) => x.id === p.id);
    const otro = lista[idx + dir];
    if (!otro) return;
    await db.pasosSeguimiento.update(p.id, { orden: otro.orden });
    await db.pasosSeguimiento.update(otro.id, { orden: p.orden });
  };

  const agregar = async () => {
    const maxOrden = lista.reduce((m, p) => Math.max(m, p.orden), 0);
    await db.pasosSeguimiento.add(createBaseRecord({
      id: uuid(), ambito: 'miembro' as const, nombre: 'Nuevo paso', emoji: '📌',
      orden: maxOrden + 1, fuente: 'manual' as FuentePasoSeguimiento,
    }));
    showToast('Paso agregado: edita su nombre en la lista');
  };

  const borrar = async (p: PasoSeguimiento) => {
    if (p.protegido) return;
    const registros = hitos.filter((h) => h.pasoId === p.id).length;
    const aviso = registros > 0
      ? `\n\nTiene ${registros} registro(s) en fichas de miembros: el historial se conserva, pero el paso dejará de mostrarse en la escalera.`
      : '';
    if (!window.confirm(`¿Eliminar el paso «${p.nombre}» de la escalera?${aviso}`)) return;
    await db.pasosSeguimiento.delete(p.id);
    showToast(`Paso «${p.nombre}» eliminado`);
  };

  return (
    <Modal open={open} onClose={onClose} title="⚙️ Pasos del miembro" wide>
      <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 14 }}>
        La escalera que continúa el seguimiento después de la integración. Cada paso tiene una
        <strong> identidad fija</strong>: puedes renombrarlo, cambiar su emoji, reordenarlo o quitarlo,
        y las fichas y el historial no se rompen. Los pasos automáticos se marcan solos desde los
        datos de la app; los manuales se registran en la ficha del miembro. Los cambios se guardan
        al momento y se sincronizan.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lista.map((p, i) => {
          const b = borradorDe(p);
          return (
            <div key={p.id} style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, border: p.protegido ? '1px solid var(--gold)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className="form-input" style={{ width: 52, textAlign: 'center', fontSize: 16 }} aria-label="Emoji del paso"
                  value={b.emoji}
                  onChange={(e) => setBorradores((d) => ({ ...d, [p.id]: { ...borradorDe(p), emoji: e.target.value } }))}
                  onBlur={() => void guardarEtiqueta(p)}
                />
                <input
                  className="form-input" style={{ flex: 1, minWidth: 140 }} aria-label="Nombre del paso"
                  value={b.nombre}
                  onChange={(e) => setBorradores((d) => ({ ...d, [p.id]: { ...borradorDe(p), nombre: e.target.value } }))}
                  onBlur={() => void guardarEtiqueta(p)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />
                <button type="button" className="btn btn-secondary btn-sm" disabled={i === 0} onClick={() => void mover(p, -1)} title="Subir">⬆</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={i === lista.length - 1} onClick={() => void mover(p, 1)} title="Bajar">⬇</button>
                {!p.protegido && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void borrar(p)} title="Eliminar paso">🗑</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 11, color: 'var(--dim)' }}>Fuente:</label>
                <select
                  className="form-select" style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
                  value={p.fuente} disabled={!!p.protegido}
                  onChange={(e) => void cambiarFuente(p, e.target.value as FuentePasoSeguimiento)}
                >
                  {FUENTES.map((f) => <option key={f} value={f}>{FUENTE_LABEL[f]}</option>)}
                </select>
              </div>
              {p.protegido && (
                <div style={{ fontSize: 11, color: 'var(--oro-sombra)', marginTop: 6 }}>
                  🔒 Paso protegido: es el gozne con Misión Bíblica — puedes renombrarlo, pero no borrarlo ni cambiar su fuente.
                </div>
              )}
            </div>
          );
        })}
        {lista.length === 0 && (
          <div style={{ color: 'var(--dim)', fontSize: 13, padding: 12, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8 }}>
            Sin pasos todavía: agrega el primero.
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-gold" onClick={() => void agregar()}>➕ Agregar paso</button>
        <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}
