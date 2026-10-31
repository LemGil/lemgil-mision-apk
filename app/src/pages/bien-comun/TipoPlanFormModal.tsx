import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';

interface TipoPlanFormModalProps {
  open: boolean;
  onClose: () => void;
  editTpId: string | null;
  saveTp: () => void;
  tpNombre: string; setTpNombre: Dispatch<SetStateAction<string>>;
  tpColor: string; setTpColor: Dispatch<SetStateAction<string>>;
}

export function TipoPlanFormModal(props: TipoPlanFormModalProps) {
  const { open, onClose, editTpId, saveTp, tpNombre, setTpNombre, tpColor, setTpColor } = props;
  return (
        <Modal open={open} onClose={onClose} title={editTpId ? '✏️ Editar Tipo de Plan' : '➕ Nuevo Tipo de Plan'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveTp}>💾 {editTpId ? 'Guardar' : 'Crear'}</button></>}>
            <div className="form-group"><label className="form-label">Nombre del Tipo *</label><input className="form-input" value={tpNombre} onChange={e => setTpNombre(e.target.value)} placeholder="Ej: Ofrenda General" /></div>
            <div className="form-group" style={{marginTop: 12}}><label className="form-label">Color</label><input className="form-input" type="color" value={tpColor} onChange={e => setTpColor(e.target.value)} style={{height: '40px', padding: '4px'}} /></div>
        </Modal>
  );
}
