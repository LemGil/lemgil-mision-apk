import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';
import { money } from '../../lib/utils';
import type { Miembro, PlanColaborador, TipoPlan } from '../../lib/types';

interface DiezmadorFormModalProps {
  open: boolean;
  onClose: () => void;
  editDId: string | null;
  saveD: () => void;
  miembros: Miembro[];
  selectMiembro: (m: Miembro) => void;
  tiposPlanes: TipoPlan[];
  todosTiposPlanes: TipoPlan[];
  planesColaborador: PlanColaborador[];
  openEditPlan: (p: PlanColaborador) => void;
  onAgregarPlan: () => void;
  onDeletePlan: (id: string) => void;
  dNombre: string; setDNombre: Dispatch<SetStateAction<string>>;
  dApellido: string; setDApellido: Dispatch<SetStateAction<string>>;
  dTel: string; setDTel: Dispatch<SetStateAction<string>>;
  dEmail: string; setDEmail: Dispatch<SetStateAction<string>>;
  dZona: string; setDZona: Dispatch<SetStateAction<string>>;
  dGrupo: string; setDGrupo: Dispatch<SetStateAction<string>>;
  dEstado: string; setDEstado: Dispatch<SetStateAction<string>>;
  dPlanDiezmo: string; setDPlanDiezmo: Dispatch<SetStateAction<string>>;
  dNotas: string; setDNotas: Dispatch<SetStateAction<string>>;
  planTipoId: string; setPlanTipoId: Dispatch<SetStateAction<string>>;
  planMonto: string; setPlanMonto: Dispatch<SetStateAction<string>>;
}

export function DiezmadorFormModal(props: DiezmadorFormModalProps) {
  const { open, onClose, editDId, saveD, miembros, selectMiembro, tiposPlanes, todosTiposPlanes, planesColaborador, openEditPlan, onAgregarPlan, onDeletePlan, dNombre, setDNombre, dApellido, setDApellido, dTel, setDTel, dEmail, setDEmail, dZona, setDZona, dGrupo, setDGrupo, dEstado, setDEstado, dPlanDiezmo, setDPlanDiezmo, dNotas, setDNotas, planTipoId, setPlanTipoId, planMonto, setPlanMonto } = props;
  return (
        <Modal open={open} onClose={onClose} title={editDId ? '✏️ Editar Diezmador' : '🤝 Nuevo Diezmador'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveD}>💾 Registrar Diezmador</button></>}>
            <div className="form-grid">
                {!editDId && (
                    <div className="form-group" style={{marginBottom: '15px', padding: '10px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                        <label className="form-label">🔍 Buscar en Miembros de Misión</label>
                        <select className="form-select" onChange={e => {
                            const m = miembros.find(mi => mi.id === e.target.value);
                            if (m) selectMiembro(m);
                        }}>
                            <option value="">Seleccionar un miembro...</option>
                            {miembros.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                        </select>
                    </div>
                )}
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={dNombre} onChange={e => setDNombre(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={dApellido} onChange={e => setDApellido(e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={dTel} onChange={e => setDTel(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={dEmail} onChange={e => setDEmail(e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={dZona} onChange={setDZona} emptyLabel="Seleccionar..." /></div>
                    <div className="form-group"><label className="form-label">Grupo</label><input className="form-input" value={dGrupo} onChange={e => setDGrupo(e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={dEstado} onChange={e => setDEstado(e.target.value)}><option>Activo</option><option>Irregular</option><option>Inactivo</option></select></div>
                    <div className="form-group"><label className="form-label">Plan de Diezmo</label><input className="form-input" type="number" value={dPlanDiezmo} onChange={e => setDPlanDiezmo(e.target.value)} /></div>
                </div>
                {!editDId && tiposPlanes.length > 0 && (
                    <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)', marginTop: '8px'}}>
                        <label className="form-label" style={{fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block'}}>📋 Plan de Ofrenda (Opcional)</label>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label" style={{fontSize: '12px'}}>Tipo</label><select className="form-select" value={planTipoId} onChange={e => setPlanTipoId(e.target.value)}><option value="">Sin plan</option>{tiposPlanes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                            <div className="form-group"><label className="form-label" style={{fontSize: '12px'}}>Monto mensual ($)</label><input className="form-input" type="number" value={planMonto} onChange={e => setPlanMonto(e.target.value)} min="0" disabled={!planTipoId} placeholder={planTipoId ? 'Ej: 100' : 'Selecciona tipo primero'} /></div>
                        </div>
                    </div>
                )}
                <div className="form-group"><label className="form-label">Notas</label><textarea className="form-textarea" value={dNotas} onChange={e => setDNotas(e.target.value)} /></div>
                {editDId && (
                    <div style={{marginTop: '16px', padding: '14px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                            <label className="form-label" style={{margin: 0, fontSize: '13px', fontWeight: 700}}>📋 Planes de Ofrenda</label>
                            <button className="btn btn-gold" style={{padding: '4px 10px', fontSize: '12px'}} onClick={onAgregarPlan}>➕ Agregar Plan</button>
                        </div>
                        {planesColaborador.filter(p => p.diezmadorId === editDId).length === 0 ? (
                            <div style={{fontSize: '12px', color: 'var(--dim)', textAlign: 'center', padding: '10px'}}>Sin planes asignados</div>
                        ) : (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                {planesColaborador.filter(p => p.diezmadorId === editDId).map(p => {
                                    const tipo = todosTiposPlanes.find(t => t.id === p.tipoPlanId);
                                    return (
                                        <div key={p.id} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                                            <div style={{width: '10px', height: '10px', borderRadius: '50%', background: tipo?.color || '#999', flexShrink: 0}}></div>
                                            <span style={{flex: 1, fontSize: '13px', fontWeight: 600}}>{tipo?.nombre || '—'}</span>
                                            <span style={{fontSize: '13px', color: 'var(--gold)', fontWeight: 700}}>{money(p.montoMensual)}/mes</span>
                                            <button className="btn btn-secondary" style={{padding: '2px 6px', fontSize: '11px'}} onClick={() => openEditPlan(p)}>✏️</button>
                                            <button className="btn btn-secondary" style={{padding: '2px 6px', fontSize: '11px', color: 'var(--red)'}} onClick={() => onDeletePlan(p.id)}>🗑️</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
  );
}
