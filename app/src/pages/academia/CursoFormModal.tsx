import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';

interface CursoFormModalProps {
  open: boolean;
  onClose: () => void;
  editCursoId: string | null;
  delCurso: () => void;
  saveCurso: () => void;
  cNombre: string; setCNombre: Dispatch<SetStateAction<string>>;
  cNivel: string; setCNivel: Dispatch<SetStateAction<string>>;
  cDur: string; setCDur: Dispatch<SetStateAction<string>>;
  cInst: string; setCInst: Dispatch<SetStateAction<string>>;
  cEmoji: string; setCEmoji: Dispatch<SetStateAction<string>>;
  cColor: string; setCColor: Dispatch<SetStateAction<string>>;
  cEstado: string; setCEstado: Dispatch<SetStateAction<string>>;
  cDesc: string; setCDesc: Dispatch<SetStateAction<string>>;
}

export function CursoFormModal(props: CursoFormModalProps) {
  const { open, onClose, editCursoId, delCurso, saveCurso, cNombre, setCNombre, cNivel, setCNivel, cDur, setCDur, cInst, setCInst, cEmoji, setCEmoji, cColor, setCColor, cEstado, setCEstado, cDesc, setCDesc } = props;
  return (
      <Modal open={open} onClose={onClose} title={editCursoId ? '✏️ Editar Curso' : '📚 Nuevo Curso'} footer={<>{editCursoId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delCurso}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveCurso}>{editCursoId ? '💾 Guardar Cambios' : '💾 Crear Curso'}</button></>}>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Nombre del Curso *</label><input className="form-input" value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="Ej: Cristología Bíblica" /></div>
          <div className="form-group"><label className="form-label">Nivel</label><select className="form-select" value={cNivel} onChange={(e) => setCNivel(e.target.value)}><option>Basico</option><option>Intermedio</option><option>Avanzado</option></select></div>
          <div className="form-group"><label className="form-label">Duración (semanas)</label><input className="form-input" type="number" value={cDur} onChange={(e) => setCDur(e.target.value)} placeholder="8" min="1" /></div>
          <div className="form-group"><label className="form-label">Instructor *</label><input className="form-input" value={cInst} onChange={(e) => setCInst(e.target.value)} placeholder="Nombre del instructor" /></div>
          <div className="form-group"><label className="form-label">Emoji / Ícono</label><input className="form-input" value={cEmoji} onChange={(e) => setCEmoji(e.target.value)} placeholder="📖" maxLength={4} /></div>
          <div className="form-group"><label className="form-label">Color de fondo</label><select className="form-select" value={cColor} onChange={(e) => setCColor(e.target.value)}><option value="rgba(122,95,192,0.25)">🟣 Púrpura</option><option value="rgba(76,175,125,0.25)">🟢 Verde</option><option value="rgba(201,146,42,0.25)">🟡 Dorado</option><option value="rgba(74,127,212,0.25)">🔵 Azul</option><option value="rgba(224,85,85,0.25)">🔴 Rojo</option></select></div>
          <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={cEstado} onChange={(e) => setCEstado(e.target.value)}><option>Activo</option><option>Borrador</option><option>Archivado</option></select></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Descripción</label><textarea className="form-textarea" value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Describe el contenido y objetivos del curso…" /></div>
      </Modal>
  );
}
