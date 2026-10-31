import { money } from '../../lib/utils';
import type { Diezmador, PlanColaborador, TipoPlan } from '../../lib/types';

interface PlanesTabProps {
  todosTiposPlanes: TipoPlan[];
  planesColaborador: PlanColaborador[];
  colaboradores: Diezmador[];
  openEditTp: (tp: TipoPlan) => void;
  openEditPlan: (p: PlanColaborador) => void;
  onNuevoTipo: () => void;
  onNuevoPlan: () => void;
  onDeleteTipo: (id: string) => void;
  onDeletePlan: (id: string) => void;
}

export function PlanesTab(props: PlanesTabProps) {
  const { todosTiposPlanes, planesColaborador, colaboradores, openEditTp, openEditPlan, onNuevoTipo, onNuevoPlan, onDeleteTipo, onDeletePlan } = props;
  return (
            <div className="page-content">
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start'}}>
                    <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                            <h3 style={{margin: 0, fontSize: '16px', fontWeight: 700}}>📋 Tipos de Plan</h3>
                            <button className="btn btn-gold" onClick={onNuevoTipo}>➕ Nuevo Tipo</button>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            {todosTiposPlanes.map(tp => (
                                <div key={tp.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', opacity: tp.activo ? 1 : 0.5}}>
                                    <div style={{width: '14px', height: '14px', borderRadius: '50%', background: tp.color, flexShrink: 0}}></div>
                                    <span style={{flex: 1, fontWeight: 600, fontSize: '14px'}}>{tp.nombre}</span>
                                    {!tp.activo && <span style={{fontSize: '11px', color: 'var(--dim)'}}>Inactivo</span>}
                                    {tp.activo && (
                                        <div style={{display: 'flex', gap: '6px'}}>
                                            <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={() => openEditTp(tp)}>✏️</button>
                                            <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px', color: 'var(--red)'}} onClick={() => onDeleteTipo(tp.id)}>🗑️</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {todosTiposPlanes.length === 0 && <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay tipos de plan creados</div>}
                        </div>
                    </div>
                    <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                            <h3 style={{margin: 0, fontSize: '16px', fontWeight: 700}}>🤝 Planes por Diezmador</h3>
                            <button className="btn btn-gold" onClick={onNuevoPlan}>➕ Nuevo Plan</button>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            {planesColaborador.map(p => {
                                const colab = colaboradores.find(c => c.id === p.diezmadorId);
                                const tipo = todosTiposPlanes.find(t => t.id === p.tipoPlanId);
                                return (
                                    <div key={p.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px'}}>
                                        <div style={{width: '14px', height: '14px', borderRadius: '50%', background: tipo?.color || '#999', flexShrink: 0}}></div>
                                        <div style={{flex: 1}}>
                                            <div style={{fontWeight: 600, fontSize: '14px'}}>{colab ? `${colab.nombre} ${colab.apellido}` : '—'}</div>
                                            <div style={{fontSize: '12px', color: 'var(--dim)'}}>{tipo?.nombre || '—'} — {money(p.montoMensual)}/mes</div>
                                        </div>
                                        <div style={{display: 'flex', gap: '6px'}}>
                                            <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={() => openEditPlan(p)}>✏️</button>
                                            <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px', color: 'var(--red)'}} onClick={() => onDeletePlan(p.id)}>🗑️</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {planesColaborador.length === 0 && <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay planes asignados</div>}
                        </div>
                    </div>
                </div>
            </div>
  );
}
