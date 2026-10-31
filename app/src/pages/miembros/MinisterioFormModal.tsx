import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Miembro } from '../../lib/types';

interface MinisterioFormModalProps {
  open: boolean;
  onClose: () => void;
  editMinId: string | null;
  saveMin: () => void;
  miembros: Miembro[];
  minNombre: string; setMinNombre: Dispatch<SetStateAction<string>>;
  minDesc: string; setMinDesc: Dispatch<SetStateAction<string>>;
  minLider: string; setMinLider: Dispatch<SetStateAction<string>>;
  minLiderCustom: boolean; setMinLiderCustom: Dispatch<SetStateAction<boolean>>;
  minColor: string; setMinColor: Dispatch<SetStateAction<string>>;
  minEmoji: string; setMinEmoji: Dispatch<SetStateAction<string>>;
}

export function MinisterioFormModal(props: MinisterioFormModalProps) {
  const { open, onClose, editMinId, saveMin, miembros, minNombre, setMinNombre, minDesc, setMinDesc, minLider, setMinLider, minLiderCustom, setMinLiderCustom, minColor, setMinColor, minEmoji, setMinEmoji } = props;
  return (
      <Modal open={open} onClose={onClose} title={editMinId ? 'Editar ministerio' : 'Nuevo ministerio'}>
        <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Nombre *</label><input className="form-input" value={minNombre} onChange={(e) => setMinNombre(e.target.value)} placeholder="Ej: Alabanza, Niños, Jóvenes" /></div>
        <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Descripción</label><textarea className="form-textarea" rows={2} value={minDesc} onChange={(e) => setMinDesc(e.target.value)} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Ministro / Encargado *</label>
            {minLiderCustom ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" value={minLider} onChange={(e) => setMinLider(e.target.value)} placeholder="Escribe el nombre completo" autoFocus />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setMinLiderCustom(false); setMinLider(''); }}>📋 Lista</button>
              </div>
            ) : (
              <select className="form-select" value={minLider} onChange={(e) => { if (e.target.value === '__custom__') { setMinLiderCustom(true); setMinLider(''); } else { setMinLider(e.target.value); } }}>
                <option value="">— Seleccionar de la lista —</option>
                {miembros.filter(m => m.estado === 'Activo').sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
                  <option key={m.id} value={`${m.nombre} ${m.apellido}`}>{m.nombre} {m.apellido}</option>
                ))}
                <option value="__custom__">— Otro (escribir manualmente) —</option>
              </select>
            )}
          </div>
          <div className="form-group"><label className="form-label">Emoji</label>
            <input className="form-input" value={minEmoji} onChange={(e) => setMinEmoji(e.target.value)} placeholder="⛪" />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {['⛪', '📖', '🎤', '👶', '🧑', '🌍', '🤲', '📸', '🙏', '📢', '👋', '🏋️', '📚'].map(e => (
                <button type="button" key={e} onClick={() => setMinEmoji(e)} style={{ border: '1px solid var(--border)', background: minEmoji === e ? 'var(--gold-glow)' : 'transparent', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '18px' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group form-full">
            <label className="form-label">Color identificador</label>
            <input type="color" value={minColor} onChange={(e) => setMinColor(e.target.value)} style={{ width: '100%', height: '36px', border: 'none', borderRadius: 6, cursor: 'pointer' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveMin}>{editMinId ? 'Guardar cambios' : 'Crear ministerio'}</button>
        </div>
      </Modal>
  );
}
