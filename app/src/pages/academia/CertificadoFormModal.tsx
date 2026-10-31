import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Curso, Estudiante } from '../../lib/types';

interface CertificadoFormModalProps {
  open: boolean;
  onClose: () => void;
  editCertId: string | null;
  delCert: () => void;
  saveCert: () => void;
  estudiantes: Estudiante[];
  cursos: Curso[];
  certEst: string; setCertEst: Dispatch<SetStateAction<string>>;
  certCurso: string; setCertCurso: Dispatch<SetStateAction<string>>;
  certFecha: string; setCertFecha: Dispatch<SetStateAction<string>>;
  certCal: string; setCertCal: Dispatch<SetStateAction<string>>;
  certObs: string; setCertObs: Dispatch<SetStateAction<string>>;
}

export function CertificadoFormModal(props: CertificadoFormModalProps) {
  const { open, onClose, editCertId, delCert, saveCert, estudiantes, cursos, certEst, setCertEst, certCurso, setCertCurso, certFecha, setCertFecha, certCal, setCertCal, certObs, setCertObs } = props;
  return (
      <Modal open={open} onClose={onClose} title={editCertId ? '✏️ Editar Certificado' : '🏆 Emitir Certificado'} footer={<>{editCertId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delCert}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveCert}>🏆 Emitir Certificado</button></>}>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Estudiante *</label><select className="form-select" value={certEst} onChange={(e) => setCertEst(e.target.value)}><option value="">Seleccionar estudiante…</option>{estudiantes.map((e) => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}</select></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Curso *</label><select className="form-select" value={certCurso} onChange={(e) => setCertCurso(e.target.value)}><option value="">Seleccionar curso…</option>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha de Emisión *</label><input className="form-input" type="date" value={certFecha} onChange={(e) => setCertFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Calificación Final</label><select className="form-select" value={certCal} onChange={(e) => setCertCal(e.target.value)}><option>Aprobado</option><option>Sobresaliente</option><option>Con Honores</option></select></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Observaciones</label><textarea className="form-textarea" value={certObs} onChange={(e) => setCertObs(e.target.value)} placeholder="Logros destacados, menciones especiales…" style={{ minHeight: 55 }} /></div>
      </Modal>
  );
}
