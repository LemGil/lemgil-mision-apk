import { Modal } from '../../components/Modal';
import { fmt } from '../../lib/utils';
import type { Curso, Estudiante, Leccion } from '../../lib/types';
import { EST_BADGE, NIVEL_BADGE } from './constants';

interface CursoDetailModalProps {
  open: boolean;
  onClose: () => void;
  viewCurso: Curso | null | undefined;
  viewLeccs: Leccion[];
  viewEsts: Estudiante[];
  onEditarCurso: () => void;
  onNuevaLeccion: () => void;
  onMatricular: () => void;
  onEditarLeccion: (id: string) => void;
}

export function CursoDetailModal(props: CursoDetailModalProps) {
  const { open, onClose, viewCurso, viewLeccs, viewEsts, onEditarCurso, onNuevaLeccion, onMatricular, onEditarLeccion } = props;
  return (
      <Modal open={open} onClose={onClose} title={`${viewCurso?.emoji || '📖'} ${viewCurso?.nombre || ''}`} wide footer={<><button className="btn btn-secondary btn-sm" onClick={onEditarCurso}>✏️ Editar Curso</button><button className="btn btn-gold btn-sm" onClick={onNuevaLeccion}>📝 + Lección</button><button className="btn btn-gold" onClick={onMatricular}>🎓 Matricular</button></>}>
        {viewCurso && <>
          <div className="detail-row"><span className="detail-label">Instructor</span><span className="detail-value">{viewCurso.instructor}</span></div>
          <div className="detail-row"><span className="detail-label">Nivel</span><span className="detail-value"><span className={`badge ${NIVEL_BADGE[viewCurso.nivel]}`}>{viewCurso.nivel}</span></span></div>
          <div className="detail-row"><span className="detail-label">Duración</span><span className="detail-value">{viewCurso.duracion ? `${viewCurso.duracion} semanas` : '—'}</span></div>
          <div className="detail-row"><span className="detail-label">Estado</span><span className="detail-value"><span className={`badge ${viewCurso.estado === 'Activo' ? 'badge-green' : 'badge-yellow'}`}>{viewCurso.estado}</span></span></div>
          {viewCurso.descripcion && <div className="detail-row"><span className="detail-label">Descripción</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)' }}>{viewCurso.descripcion}</span></div>}
          <div className="form-section" style={{ marginTop: 14 }}>Lecciones</div>
          {viewLeccs.length === 0 ? <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>No hay lecciones. Agrega la primera.</div> :
            viewLeccs.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{l.numero || '?'}</div>
                <div style={{ flex: 1, fontSize: 13 }}>{l.titulo}{l.duracion && <span style={{ fontSize: 10, color: 'var(--dim)' }}> · {l.duracion}min</span>}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => onEditarLeccion(l.id)}>✏️</button>
              </div>
            ))
          }
          <div className="form-section" style={{ marginTop: 14 }}>Estudiantes Matriculados</div>
          {viewEsts.length === 0 ? <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>Sin estudiantes matriculados.</div> :
            viewEsts.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 7, marginBottom: 5 }}>
                <div><div style={{ fontSize: 13, fontWeight: 700 }}>{e.nombre} {e.apellido}</div><div style={{ fontSize: 11, color: 'var(--dim)' }}>Desde {fmt(e.fecha)}</div></div>
                <span className={`badge ${EST_BADGE[e.estado] || 'badge-blue'}`}>{e.estado}</span>
              </div>
            ))
          }
        </>}
      </Modal>
  );
}
