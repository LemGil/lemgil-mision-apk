import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Miembro } from '../../lib/types';

interface HitoFormModalProps {
  open: boolean;
  onClose: () => void;
  editHId: string | null;
  saveH: () => void;
  miembros: Miembro[];
  hMiembro: string; setHMiembro: Dispatch<SetStateAction<string>>;
  hFecha: string; setHFecha: Dispatch<SetStateAction<string>>;
  hTipo: string; setHTipo: Dispatch<SetStateAction<string>>;
  hDesc: string; setHDesc: Dispatch<SetStateAction<string>>;
}

export function HitoFormModal(props: HitoFormModalProps) {
  const { open, onClose, editHId, saveH, miembros, hMiembro, setHMiembro, hFecha, setHFecha, hTipo, setHTipo, hDesc, setHDesc } = props;
  return (
      <Modal open={open} onClose={onClose} title={editHId ? 'Editar hito' : 'Registrar hito de crecimiento'} wide>
        <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Miembro *</label>
          <select className="form-select" value={hMiembro} onChange={(e) => setHMiembro(e.target.value)}>
            <option value="">— Selecciona miembro —</option>
            {miembros.sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={hFecha} onChange={(e) => setHFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Tipo de hito</label>
            <select className="form-select" value={hTipo} onChange={(e) => setHTipo(e.target.value)}>
              <option>Conversión</option><option>Bautismo</option><option>Discipulado</option>
              <option>Curso Completado</option><option>Integración</option><option>Liderazgo</option>
              <option>Matrimonio</option><option>Otro</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 10 }}><label className="form-label">Descripción *</label><textarea className="form-textarea" rows={3} value={hDesc} onChange={(e) => setHDesc(e.target.value)} placeholder="Detalles del momento, curso completado, etc." /></div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveH}>{editHId ? 'Guardar cambios' : 'Registrar hito'}</button>
        </div>
      </Modal>
  );
}
