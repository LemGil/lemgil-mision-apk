import { useState, type Dispatch, type SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { PersonaSelect } from '../../components/PersonaSelect';
import { PersonaFormModal } from '../../components/PersonaFormModal';
import { edadDesde } from '../../lib/personaVista';
import type { Grupo, Persona } from '../../lib/types';

interface MiembroFormModalProps {
  open: boolean;
  onClose: () => void;
  editMId: string | null;
  saveM: () => void;
  personas: Persona[];
  grupos: Grupo[];
  mPersonaId: string; setMPersonaId: Dispatch<SetStateAction<string>>;
  mIngreso: string; setMIngreso: Dispatch<SetStateAction<string>>;
  mEstado: string; setMEstado: Dispatch<SetStateAction<string>>;
  mNotas: string; setMNotas: Dispatch<SetStateAction<string>>;
}

/**
 * P2 (ficha única): el formulario del miembro ya NO teclea los datos
 * personales. Se elige la PERSONA (buscar/elegir o crearla una sola vez
 * con su Nº de Identidad) y aquí solo se teclea el PROCESO de membresía:
 * fecha de ingreso, estado y notas pastorales. Grupo, hermano mayor,
 * nacimiento, bautismo y contacto son de la persona y viven en su ficha.
 */
export function MiembroFormModal(props: MiembroFormModalProps) {
  const { open, onClose, editMId, saveM, personas, grupos, mPersonaId, setMPersonaId, mIngreso, setMIngreso, mEstado, setMEstado, mNotas, setMNotas } = props;
  const [editandoPersona, setEditandoPersona] = useState(false);
  const persona = personas.find((p) => p.id === mPersonaId);
  const grupo = persona?.grupoId ? grupos.find((g) => g.id === persona.grupoId) : undefined;
  const mentor = persona?.hermanoMayorId ? personas.find((p) => p.id === persona.hermanoMayorId) : undefined;
  const edad = persona ? edadDesde(persona.fechaNacimiento) : null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={editMId ? 'Editar miembro' : 'Nuevo miembro'} wide>
        {/* ─── SECCIÓN: PERSONA ─── */}
        <div className="form-section">👤 Persona (se teclea una sola vez)</div>
        <div className="form-group">
          <label className="form-label">Persona de esta membresía *</label>
          <PersonaSelect value={mPersonaId} onChange={setMPersonaId} emptyLabel="🔍 Buscar persona o crearla…" />
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

        {/* ─── SECCIÓN: MEMBRESÍA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>⛪ Membresía</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha de ingreso</label><input className="form-input" type="date" value={mIngreso} onChange={(e) => setMIngreso(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado</label>
            <select className="form-select" value={mEstado} onChange={(e) => setMEstado(e.target.value)}>
              <option>Activo</option><option>Inactivo</option><option>Trasladado</option><option>Disciplinado</option><option>Fallecido</option>
            </select>
          </div>
        </div>

        {/* ─── SECCIÓN: NOTAS ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📝 Notas Pastorales</div>
        <div className="form-group"><textarea className="form-textarea" rows={3} value={mNotas} onChange={(e) => setMNotas(e.target.value)} placeholder="Observaciones pastorales, necesidades, seguimiento…" /></div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveM}>{editMId ? 'Guardar cambios' : 'Registrar miembro'}</button>
        </div>
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
