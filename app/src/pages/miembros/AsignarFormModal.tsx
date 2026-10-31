import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Miembro, Ministerio } from '../../lib/types';

interface AsignarFormModalProps {
  open: boolean;
  onClose: () => void;
  editAId: string | null;
  saveAsig: () => void;
  miembros: Miembro[];
  ministerios: Ministerio[];
  asigMiembro: string; setAsigMiembro: Dispatch<SetStateAction<string>>;
  asigMinisterio: string; setAsigMinisterio: Dispatch<SetStateAction<string>>;
  asigRol: string; setAsigRol: Dispatch<SetStateAction<string>>;
  asigDesde: string; setAsigDesde: Dispatch<SetStateAction<string>>;
  asigNotas: string; setAsigNotas: Dispatch<SetStateAction<string>>;
}

export function AsignarFormModal(props: AsignarFormModalProps) {
  const { open, onClose, editAId, saveAsig, miembros, ministerios, asigMiembro, setAsigMiembro, asigMinisterio, setAsigMinisterio, asigRol, setAsigRol, asigDesde, setAsigDesde, asigNotas, setAsigNotas } = props;
  return (
      <Modal open={open} onClose={onClose} title={editAId ? 'Editar asignación' : 'Asignar miembro a ministerio'} wide>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Miembro *</label>
            <select className="form-select" value={asigMiembro} onChange={(e) => setAsigMiembro(e.target.value)}>
              <option value="">— Selecciona miembro —</option>
              {miembros.filter((m) => m.estado === 'Activo').sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
              ))}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Ministerio *</label>
            <select className="form-select" value={asigMinisterio} onChange={(e) => setAsigMinisterio(e.target.value)}>
              <option value="">— Selecciona ministerio —</option>
              {ministerios.map((mn) => <option key={mn.id} value={mn.id}>{mn.emoji} {mn.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Rol</label>
            <select className="form-select" value={asigRol} onChange={(e) => setAsigRol(e.target.value)}>
              <option>Miembro</option><option>Servidor</option><option>Coordinador</option><option>Líder</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Desde</label><input className="form-input" type="date" value={asigDesde} onChange={(e) => setAsigDesde(e.target.value)} /></div>
        </div>
        <div className="form-group" style={{ marginTop: 10 }}><label className="form-label">Notas</label><textarea className="form-textarea" rows={2} value={asigNotas} onChange={(e) => setAsigNotas(e.target.value)} /></div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveAsig}>{editAId ? 'Guardar cambios' : 'Asignar'}</button>
        </div>
      </Modal>
  );
}
