import { useState, type Dispatch, type SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { PersonaSelect } from '../../components/PersonaSelect';
import { PersonaFormModal } from '../../components/PersonaFormModal';
import { edadDesde } from '../../lib/personaVista';
import { money } from '../../lib/utils';
import type { Grupo, Persona, PlanColaborador, TipoPlan } from '../../lib/types';

interface DiezmadorFormModalProps {
  open: boolean;
  onClose: () => void;
  editDId: string | null;
  saveD: () => void;
  personas: Persona[];
  grupos: Grupo[];
  tiposPlanes: TipoPlan[];
  todosTiposPlanes: TipoPlan[];
  planesColaborador: PlanColaborador[];
  openEditPlan: (p: PlanColaborador) => void;
  onAgregarPlan: () => void;
  onDeletePlan: (id: string) => void;
  dPersonaId: string; setDPersonaId: Dispatch<SetStateAction<string>>;
  dEstado: string; setDEstado: Dispatch<SetStateAction<string>>;
  dPlanDiezmo: string; setDPlanDiezmo: Dispatch<SetStateAction<string>>;
  dNotas: string; setDNotas: Dispatch<SetStateAction<string>>;
  planTipoId: string; setPlanTipoId: Dispatch<SetStateAction<string>>;
  planMonto: string; setPlanMonto: Dispatch<SetStateAction<string>>;
}

/**
 * P4 (ficha única): el formulario del diezmador ya NO teclea los datos
 * personales ni trae el «🔍 Buscar en Miembros» que copiaba nombre,
 * teléfono, zona y grupo a la ficha dejando la copia sin ningún vínculo.
 * Primero se elige la PERSONA (PersonaSelect: buscar y elegir, o crearla
 * ahí mismo una sola vez con su Nº de Identidad y el aviso anti-duplicado
 * del núcleo); la persona ES el origen — su grupo y su zona se leen del
 * núcleo, y el `grupo` texto de la ficha murió. Aquí solo se teclea el
 * PROCESO: estado, plan de diezmo, notas y sus planes de ofrenda.
 */
export function DiezmadorFormModal(props: DiezmadorFormModalProps) {
  const { open, onClose, editDId, saveD, personas, grupos, tiposPlanes, todosTiposPlanes, planesColaborador, openEditPlan, onAgregarPlan, onDeletePlan, dPersonaId, setDPersonaId, dEstado, setDEstado, dPlanDiezmo, setDPlanDiezmo, dNotas, setDNotas, planTipoId, setPlanTipoId, planMonto, setPlanMonto } = props;
  const [editandoPersona, setEditandoPersona] = useState(false);
  const persona = personas.find((p) => p.id === dPersonaId);
  const grupo = persona?.grupoId ? grupos.find((g) => g.id === persona.grupoId) : undefined;
  const mentor = persona?.hermanoMayorId ? personas.find((p) => p.id === persona.hermanoMayorId) : undefined;
  const edad = persona ? edadDesde(persona.fechaNacimiento) : null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={editDId ? '✏️ Editar Diezmador' : '🤝 Nuevo Diezmador'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveD}>💾 Registrar Diezmador</button></>}>

        {/* ─── SECCIÓN: PERSONA ─── */}
        <div className="form-section">👤 Persona (se teclea una sola vez)</div>
        <div className="form-group">
          <label className="form-label">Persona de este diezmador *</label>
          <PersonaSelect value={dPersonaId} onChange={setDPersonaId} emptyLabel="🔍 Buscar persona o crearla…" />
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

        {/* ─── SECCIÓN: PROCESO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>🙏 Diezmo</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={dEstado} onChange={e => setDEstado(e.target.value)}><option>Activo</option><option>Irregular</option><option>Inactivo</option></select></div>
          <div className="form-group"><label className="form-label">Plan de Diezmo</label><input className="form-input" type="number" value={dPlanDiezmo} onChange={e => setDPlanDiezmo(e.target.value)} /></div>
        </div>
        {!editDId && tiposPlanes.length > 0 && (
          <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)', marginTop: '8px' }}>
            <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>📋 Plan de Ofrenda (Opcional)</label>
            <div className="form-row">
              <div className="form-group"><label className="form-label" style={{ fontSize: '12px' }}>Tipo</label><select className="form-select" value={planTipoId} onChange={e => setPlanTipoId(e.target.value)}><option value="">Sin plan</option>{tiposPlanes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
              <div className="form-group"><label className="form-label" style={{ fontSize: '12px' }}>Monto mensual ($)</label><input className="form-input" type="number" value={planMonto} onChange={e => setPlanMonto(e.target.value)} min="0" disabled={!planTipoId} placeholder={planTipoId ? 'Ej: 100' : 'Selecciona tipo primero'} /></div>
            </div>
          </div>
        )}
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={dNotas} onChange={e => setDNotas(e.target.value)} /></div>
        {editDId && (
          <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className="form-label" style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>📋 Planes de Ofrenda</label>
              <button className="btn btn-gold" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onAgregarPlan}>➕ Agregar Plan</button>
            </div>
            {planesColaborador.filter(p => p.diezmadorId === editDId).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--dim)', textAlign: 'center', padding: '10px' }}>Sin planes asignados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {planesColaborador.filter(p => p.diezmadorId === editDId).map(p => {
                  const tipo = todosTiposPlanes.find(t => t.id === p.tipoPlanId);
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tipo?.color || '#999', flexShrink: 0 }}></div>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{tipo?.nombre || '—'}</span>
                      <span style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>{money(p.montoMensual)}/mes</span>
                      <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => openEditPlan(p)}>✏️</button>
                      <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '11px', color: 'var(--red)' }} onClick={() => onDeletePlan(p.id)}>🗑️</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
