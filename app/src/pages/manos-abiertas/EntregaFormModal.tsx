import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Campana, Conversion, Miembro } from '../../lib/types';

interface EntregaFormModalProps {
  open: boolean;
  onClose: () => void;
  editEntId: string | null;
  saveEnt: () => void;
  eCampana: string; setECampana: Dispatch<SetStateAction<string>>;
  campanas: Campana[];
  eBenefOrigen: 'Convertido' | 'Miembro' | 'Manual'; setEBenefOrigen: Dispatch<SetStateAction<'Convertido' | 'Miembro' | 'Manual'>>;
  eBenefManual: string; setEBenefManual: Dispatch<SetStateAction<string>>;
  eBenefId: string; setEBenefId: Dispatch<SetStateAction<string>>;
  conversiones: Conversion[];
  miembros: Miembro[];
  eFecha: string; setEFecha: Dispatch<SetStateAction<string>>;
  eTipo: string; setETipo: Dispatch<SetStateAction<string>>;
  eCant: string; setECant: Dispatch<SetStateAction<string>>;
  eUnidad: string; setEUnidad: Dispatch<SetStateAction<string>>;
  eNotas: string; setENotas: Dispatch<SetStateAction<string>>;
}

export function EntregaFormModal(props: EntregaFormModalProps) {
  const { open, onClose, editEntId, saveEnt, eCampana, setECampana, campanas, eBenefOrigen, setEBenefOrigen, eBenefManual, setEBenefManual, eBenefId, setEBenefId, conversiones, miembros, eFecha, setEFecha, eTipo, setETipo, eCant, setECant, eUnidad, setEUnidad, eNotas, setENotas } = props;
  return (
        <Modal
          open={open}
          onClose={onClose}
          title={editEntId ? '✏️ Editar Entrega' : '📦 Registrar Entrega'}
          footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveEnt}>💾 {editEntId ? 'Guardar Cambios' : 'Registrar Entrega'}</button></>}
        >
          <div className="form-section">Datos de la Entrega</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Campaña *</label><select className="form-select" value={eCampana} onChange={(e) => setECampana(e.target.value)}><option value="">Seleccionar campaña…</option>{campanas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
            
            <div className="form-group"><label className="form-label">Origen *</label><select className="form-select" value={eBenefOrigen} onChange={(e) => setEBenefOrigen(e.target.value as 'Convertido' | 'Miembro' | 'Manual')}><option value="Manual">Manual</option><option value="Convertido">Converso (Misión)</option><option value="Miembro">Miembro (Iglesia)</option></select></div>
            
            {eBenefOrigen === 'Manual' ? (
                <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={eBenefManual} onChange={(e) => setEBenefManual(e.target.value)} placeholder="Nombre del beneficiario" /></div>
            ) : (
                <div className="form-group"><label className="form-label">Beneficiario *</label><select className="form-select" value={eBenefId} onChange={(e) => setEBenefId(e.target.value)}><option value="">Seleccionar…</option>{(eBenefOrigen === 'Convertido' ? conversiones : miembros).map((b) => <option key={b.id} value={b.id}>{b.nombre} {b.apellido}</option>)}</select></div>
            )}

            <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Tipo de Ayuda</label><input className="form-input" value={eTipo} onChange={(e) => setETipo(e.target.value)} placeholder="Canasta básica" /></div>
            <div className="form-group"><label className="form-label">Cantidad</label><input className="form-input" type="number" value={eCant} onChange={(e) => setECant(e.target.value)} min="0" step="0.5" /></div>
            <div className="form-group"><label className="form-label">Unidad</label><input className="form-input" value={eUnidad} onChange={(e) => setEUnidad(e.target.value)} placeholder="kg, unidades, cajas…" /></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={eNotas} onChange={(e) => setENotas(e.target.value)} placeholder="Detalles de la entrega, observaciones…" style={{ minHeight: 55 }} /></div>
        </Modal>
  );
}
