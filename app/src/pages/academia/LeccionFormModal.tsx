import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Curso } from '../../lib/types';

interface LeccionFormModalProps {
  open: boolean;
  onClose: () => void;
  editLecId: string | null;
  delLeccion: () => void;
  saveLeccion: () => void;
  cursos: Curso[];
  lCurso: string; setLCurso: Dispatch<SetStateAction<string>>;
  lTitulo: string; setLTitulo: Dispatch<SetStateAction<string>>;
  lNum: string; setLNum: Dispatch<SetStateAction<string>>;
  lDur: string; setLDur: Dispatch<SetStateAction<string>>;
  lDesc: string; setLDesc: Dispatch<SetStateAction<string>>;
}

export function LeccionFormModal(props: LeccionFormModalProps) {
  const { open, onClose, editLecId, delLeccion, saveLeccion, cursos, lCurso, setLCurso, lTitulo, setLTitulo, lNum, setLNum, lDur, setLDur, lDesc, setLDesc } = props;
  return (
      <Modal open={open} onClose={onClose} title={editLecId ? '✏️ Editar Lección' : '📝 Agregar Lección'} footer={<>{editLecId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delLeccion}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveLeccion}>💾 Guardar Lección</button></>}>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Curso *</label><select className="form-select" value={lCurso} onChange={(e) => setLCurso(e.target.value)}><option value="">Seleccionar curso…</option>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Título de la Lección *</label><input className="form-input" value={lTitulo} onChange={(e) => setLTitulo(e.target.value)} placeholder="Ej: La naturaleza divina de Cristo" /></div>
          <div className="form-group"><label className="form-label">Número de Lección</label><input className="form-input" type="number" value={lNum} onChange={(e) => setLNum(e.target.value)} placeholder="1" min="1" /></div>
          <div className="form-group"><label className="form-label">Duración (min)</label><input className="form-input" type="number" value={lDur} onChange={(e) => setLDur(e.target.value)} placeholder="45" min="1" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Descripción / Contenido</label><textarea className="form-textarea" value={lDesc} onChange={(e) => setLDesc(e.target.value)} placeholder="Temas, referencias bíblicas, objetivos de la lección…" /></div>
      </Modal>
  );
}
