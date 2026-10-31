import { Modal } from '../../components/Modal';
import { money, monthKey } from '../../lib/utils';
import type { AporteComun, Diezmador } from '../../lib/types';

interface DiezmadorDetailModalProps {
  open: boolean;
  onClose: () => void;
  onEliminar: () => void;
  onEditar: () => void;
  viewDiezmador: Diezmador | null;
  aportes: AporteComun[];
}

export function DiezmadorDetailModal(props: DiezmadorDetailModalProps) {
  const { open, onClose, onEliminar, onEditar, viewDiezmador, aportes } = props;
  return (
        <Modal open={open} onClose={onClose} title={`🙏 Detalle del Diezmador`} footer={<><button className="btn btn-danger btn-sm" onClick={onEliminar}>🗑️ Eliminar</button><button className="btn btn-secondary" onClick={onClose}>Cerrar</button><button className="btn btn-gold" onClick={onEditar}>✏️ Editar Diezmador</button></>}>
            {viewDiezmador && (() => {
                const regs = aportes.filter(a => a.diezmadorId === viewDiezmador.id);
                const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                const diezmos = regs.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
                const ofrendas = total - diezmos;
                const mesK = new Date().toISOString().slice(0, 7);
                const esteMes = regs.filter(a => monthKey(a.fecha) === mesK).reduce((s, a) => s + (a.monto || 0), 0);
                return (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)'}}>
                            <div style={{width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '20px'}}>
                                {viewDiezmador.nombre[0]}{viewDiezmador.apellido[0]}
                            </div>
                            <div>
                                <div style={{fontSize: '22px', fontWeight: 800}}>{viewDiezmador.nombre} {viewDiezmador.apellido}</div>
                                <span className={`badge ${viewDiezmador.estado === 'Activo' ? 'badge-green' : 'badge-red'}`} style={{fontSize: '12px'}}>{viewDiezmador.estado}</span>
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Acumulado</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--gold)'}}>{money(total)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Diezmos</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--green)'}}>{money(diezmos)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Ofrendas</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--yellow)'}}>{money(ofrendas)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Este Mes</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--blue)'}}>{money(esteMes)}</div>
                            </div>
                        </div>

                        <div>
                            <div style={{fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span>ℹ️</span> Información General
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)'}}>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Zona</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewDiezmador.zona || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Grupo</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewDiezmador.grupo || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Estado</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewDiezmador.estado || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Plan de Diezmo</span>
                                    <span style={{fontWeight: 600, fontSize: '13px', color: 'var(--gold)'}}>{money(viewDiezmador.planDiezmo || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span>📅</span> Historial de Aportes
                            </div>
                            <table className="data-table" style={{fontSize: '13px'}}>
                                <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th></tr></thead>
                                <tbody>{regs.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                                    <tr key={r.id}>
                                        <td>{r.fecha}</td>
                                        <td><span className={`badge ${r.tipo === 'Diezmo' ? 'badge-purple' : 'badge-blue'}`} style={{fontSize: '10px'}}>{r.tipo}</span></td>
                                        <td style={{fontWeight: 700, color: 'var(--gold)'}}>{money(r.monto)}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}
        </Modal>
  );
}
