import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';

interface GrupoFormModalProps {
  open: boolean;
  onClose: () => void;
  editGrupoId: string | null;
  saveGrupo: () => void;
  gNombre: string; setGNombre: Dispatch<SetStateAction<string>>;
  gZona: string; setGZona: Dispatch<SetStateAction<string>>;
  gLider: string; setGLider: Dispatch<SetStateAction<string>>;
  gDia: string; setGDia: Dispatch<SetStateAction<string>>;
  gHora: string; setGHora: Dispatch<SetStateAction<string>>;
  gCap: string; setGCap: Dispatch<SetStateAction<string>>;
  gLugar: string; setGLugar: Dispatch<SetStateAction<string>>;
  gMeta: string; setGMeta: Dispatch<SetStateAction<string>>;
}

export function GrupoFormModal(props: GrupoFormModalProps) {
  const { open, onClose, editGrupoId, saveGrupo, gNombre, setGNombre, gZona, setGZona, gLider, setGLider, gDia, setGDia, gHora, setGHora, gCap, setGCap, gLugar, setGLugar, gMeta, setGMeta } = props;
  return (
      <Modal open={open} onClose={onClose} title={editGrupoId ? '✏️ Editar Grupo' : '👥 Nuevo Grupo de Discipulado'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveGrupo}>💾 {editGrupoId ? 'Guardar Cambios' : 'Crear Grupo'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre del Grupo *</label><input className="form-input" value={gNombre} onChange={(e) => setGNombre(e.target.value)} placeholder="Ej: Grupo Esperanza Norte" /></div>
          <div className="form-group"><label className="form-label">Zona *</label><ZonaSelect value={gZona} onChange={setGZona} required /></div>
          <div className="form-group"><label className="form-label">Mentor *</label><input className="form-input" value={gLider} onChange={(e) => setGLider(e.target.value)} placeholder="Nombre del mentor" /></div>
          <div className="form-group"><label className="form-label">Día de Reunión</label><select className="form-select" value={gDia} onChange={(e) => setGDia(e.target.value)}>{['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((d) => <option key={d}>{d}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Hora</label><input className="form-input" type="time" value={gHora} onChange={(e) => setGHora(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Capacidad Máx.</label><input className="form-input" type="number" value={gCap} onChange={(e) => setGCap(e.target.value)} min="1" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Lugar</label><input className="form-input" value={gLugar} onChange={(e) => setGLugar(e.target.value)} placeholder="Casa, iglesia, salón…" /></div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Plan de Ofrendas Mensual ($)</label><input className="form-input" type="number" value={gMeta} onChange={(e) => setGMeta(e.target.value)} placeholder="Ej: 500" min="0" /></div>
      </Modal>
  );
}
