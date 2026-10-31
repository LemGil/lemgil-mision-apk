import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';

interface CampanaFormModalProps {
  open: boolean;
  onClose: () => void;
  editCampId: string | null;
  saveCamp: () => void;
  cNombre: string; setCNombre: Dispatch<SetStateAction<string>>;
  cTipo: string; setCTipo: Dispatch<SetStateAction<string>>;
  cEstado: string; setCEstado: Dispatch<SetStateAction<string>>;
  cInicio: string; setCInicio: Dispatch<SetStateAction<string>>;
  cFin: string; setCFin: Dispatch<SetStateAction<string>>;
  cZona: string; setCZona: Dispatch<SetStateAction<string>>;
  cMetaTipo: 'Familias' | 'Personas'; setCMetaTipo: Dispatch<SetStateAction<'Familias' | 'Personas'>>;
  cMeta: string; setCMeta: Dispatch<SetStateAction<string>>;
  cResp: string; setCResp: Dispatch<SetStateAction<string>>;
  cDesc: string; setCDesc: Dispatch<SetStateAction<string>>;
}

export function CampanaFormModal(props: CampanaFormModalProps) {
  const { open, onClose, editCampId, saveCamp, cNombre, setCNombre, cTipo, setCTipo, cEstado, setCEstado, cInicio, setCInicio, cFin, setCFin, cZona, setCZona, cMetaTipo, setCMetaTipo, cMeta, setCMeta, cResp, setCResp, cDesc, setCDesc } = props;
  return (
        <Modal
          open={open}
          onClose={onClose}
          title={editCampId ? '✏️ Editar Campaña' : '📢 Nueva Campaña'}
          wide
          footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveCamp}>💾 {editCampId ? 'Guardar Cambios' : 'Crear Campaña'}</button></>}
        >
          <div className="form-section">Datos de la Campaña</div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Nombre de la Campaña *</label><input className="form-input" value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="Ej: Alimentaria Sector Norte" /></div>
            <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={cTipo} onChange={(e) => setCTipo(e.target.value)}><option>Alimentaria</option><option>Escolar</option><option>Salud</option><option>Vivienda</option><option>Navidad</option><option>Otra</option></select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={cEstado} onChange={(e) => setCEstado(e.target.value)}><option>Planificada</option><option>En curso</option><option>Completada</option><option>Cancelada</option></select></div>
            <div className="form-group"><label className="form-label">Fecha de Inicio *</label><input className="form-input" type="date" value={cInicio} onChange={(e) => setCInicio(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Fecha de Cierre</label><input className="form-input" type="date" value={cFin} onChange={(e) => setCFin(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={cZona} onChange={setCZona} /></div>
            <div className="form-group"><label className="form-label">Meta de</label><select className="form-select" value={cMetaTipo} onChange={(e) => setCMetaTipo(e.target.value as 'Familias' | 'Personas')}><option value="Familias">Familias</option><option value="Personas">Personas</option></select></div>
            <div className="form-group"><label className="form-label">Meta</label><input className="form-input" type="number" value={cMeta} onChange={(e) => setCMeta(e.target.value)} min="0" placeholder="50" /></div>
            <div className="form-group"><label className="form-label">Responsable</label><input className="form-input" value={cResp} onChange={(e) => setCResp(e.target.value)} placeholder="Nombre del líder" /></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Descripción / Objetivos</label><textarea className="form-textarea" value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="¿Qué busca lograr esta campaña?" style={{ minHeight: 55 }} /></div>
        </Modal>
  );
}
