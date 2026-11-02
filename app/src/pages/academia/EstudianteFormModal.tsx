import { useState, type Dispatch, type SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { PersonaSelect } from '../../components/PersonaSelect';
import { PersonaFormModal } from '../../components/PersonaFormModal';
import { edadDesde } from '../../lib/personaVista';
import type { Curso, Grupo, Persona } from '../../lib/types';

interface EstudianteFormModalProps {
  open: boolean;
  onClose: () => void;
  editEstId: string | null;
  delEst: () => void;
  saveEst: () => void;
  personas: Persona[];
  grupos: Grupo[];
  cursos: Curso[];
  ePersonaId: string; setEPersonaId: Dispatch<SetStateAction<string>>;
  eCurso: string; setECurso: Dispatch<SetStateAction<string>>;
  eFecha: string; setEFecha: Dispatch<SetStateAction<string>>;
  eEstado: string; setEEstado: Dispatch<SetStateAction<string>>;
  eNotas: string; setENotas: Dispatch<SetStateAction<string>>;
}

/**
 * P3 (ficha única): el formulario del estudiante ya NO teclea los datos
 * personales ni pregunta el «origen». Primero se elige la PERSONA
 * (PersonaSelect: buscar y elegir, o crearla ahí mismo una sola vez con
 * su Nº de Identidad y el aviso anti-duplicado del núcleo); la persona ES
 * el origen — lo que antes expresaban `origen`/`origenId` y la copia de
 * `autoFillOrigen` hoy lo dice su enlace y sus otros procesos. Aquí solo
 * se teclea el PROCESO: curso, fecha de matrícula, estado y notas.
 */
export function EstudianteFormModal(props: EstudianteFormModalProps) {
  const { open, onClose, editEstId, delEst, saveEst, personas, grupos, cursos, ePersonaId, setEPersonaId, eCurso, setECurso, eFecha, setEFecha, eEstado, setEEstado, eNotas, setENotas } = props;
  const [editandoPersona, setEditandoPersona] = useState(false);
  const persona = personas.find((p) => p.id === ePersonaId);
  const grupo = persona?.grupoId ? grupos.find((g) => g.id === persona.grupoId) : undefined;
  const mentor = persona?.hermanoMayorId ? personas.find((p) => p.id === persona.hermanoMayorId) : undefined;
  const edad = persona ? edadDesde(persona.fechaNacimiento) : null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={editEstId ? '✏️ Editar Estudiante' : '🎓 Matricular Estudiante'} footer={<>{editEstId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delEst}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveEst}>{editEstId ? '💾 Guardar Cambios' : '💾 Matricular'}</button></>} wide>

        {/* ─── SECCIÓN: PERSONA ─── */}
        <div className="form-section">👤 Persona (se teclea una sola vez)</div>
        <div className="form-group">
          <label className="form-label">Persona de este estudiante *</label>
          <PersonaSelect value={ePersonaId} onChange={setEPersonaId} emptyLabel="🔍 Buscar persona o crearla…" />
        </div>
        {persona && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong>{persona.nombre} {persona.apellido}</strong>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditandoPersona(true)}>✏️ Editar datos de la persona</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4, lineHeight: 1.7 }}>
              {persona.numeroIdentidad && <>🪪 {persona.numeroIdentidad} · </>}
              {persona.telefono && <>📱 {persona.telefono} · </>}
              {persona.zona && <>📍 {persona.zona} · </>}
              {edad !== null && <>🎂 {edad} años · </>}
              {grupo && <>👥 {grupo.nombre} · </>}
              {mentor && <>👤 Mayor: {mentor.nombre} {mentor.apellido} · </>}
              {persona.bautizado ? '💧 Bautizado' : 'Sin bautizar'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>Estos datos viven en la ficha única de la persona: se corrigen una vez y se ven en todos sus procesos.</div>
          </div>
        )}

        {/* ─── SECCIÓN: MATRÍCULA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>🎓 Matrícula</div>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Curso *</label><select className="form-select" value={eCurso} onChange={(e) => setECurso(e.target.value)}><option value="">Seleccionar curso…</option>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha de Inicio *</label><input className="form-input" type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={eEstado} onChange={(e) => setEEstado(e.target.value)}><option>Activo</option><option>Pausado</option></select></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={eNotas} onChange={(e) => setENotas(e.target.value)} placeholder="Observaciones de ingreso…" style={{ minHeight: 55 }} /></div>
      </Modal>

      <PersonaFormModal
        open={editandoPersona && !!persona}
        onClose={() => setEditandoPersona(false)}
        persona={persona ?? null}
        onSaved={() => setEditandoPersona(false)}
      />
    </>
  );
}
