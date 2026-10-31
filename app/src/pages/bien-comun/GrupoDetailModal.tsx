import { Modal } from '../../components/Modal';
import { money, monthKey } from '../../lib/utils';
import type { AporteComun, Grupo } from '../../lib/types';

interface GrupoDetailModalProps {
  open: boolean;
  onClose: () => void;
  onNuevaOfrenda: () => void;
  viewGrupo: Grupo | null;
  ofrendasGruposFiltradas: AporteComun[];
  onEditAporte: (a: AporteComun) => void;
  onDeleteAporte: (id: string) => void;
}

export function GrupoDetailModal(props: GrupoDetailModalProps) {
  const { open, onClose, onNuevaOfrenda, viewGrupo, ofrendasGruposFiltradas, onEditAporte, onDeleteAporte } = props;
  return (
        <Modal open={open} onClose={onClose} title={`🎁 Detalle del Grupo`} footer={<><button className="btn btn-secondary" onClick={onClose}>Cerrar</button><button className="btn btn-gold" onClick={onNuevaOfrenda}>➕ Nueva Ofrenda</button></>}>
            {viewGrupo && (() => {
                const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === viewGrupo.id);
                const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                const regsCount = regs.length;
                const promedio = regsCount > 0 ? total / regsCount : 0;
                const mesK = new Date().toISOString().slice(0, 7);
                const esteMes = regs.filter(a => monthKey(a.fecha) === mesK).reduce((s, a) => s + (a.monto || 0), 0);
                const iniciales = viewGrupo.nombre.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
                return (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)'}}>
                            <div style={{width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '20px'}}>
                                {iniciales}
                            </div>
                            <div>
                                <div style={{fontSize: '22px', fontWeight: 800}}>{viewGrupo.nombre}</div>
                                <div style={{color: 'var(--dim)', fontSize: '13px'}}>Grupo de Misión</div>
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Total Acumulado</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--gold)'}}>{money(total)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>N° Ofrendas</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--green)'}}>{regsCount}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Promedio</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--yellow)'}}>{money(promedio)}</div>
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
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.zona || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Líder</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.lider || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Día</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.dia || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Hora</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.hora || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Lugar</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.lugar || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Capacidad</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.capacidad || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Miembros</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.miembros || 0}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Estado</span>
                                    <span style={{fontWeight: 600, fontSize: '13px', color: esteMes > 0 ? 'var(--green)' : 'var(--dim)'}}>{esteMes > 0 ? '✅ Al día' : '⏳ Sin ofrenda'}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span>📅</span> Historial de Ofrendas
                            </div>
                            {regs.length > 0 ? (
                                <table className="data-table" style={{fontSize: '13px'}}>
                                    <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Acciones</th></tr></thead>
                                    <tbody>{[...regs].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                                        <tr key={r.id}>
                                            <td>{r.fecha}</td>
                                            <td style={{fontWeight: 700, color: 'var(--gold)'}}>{money(r.monto)}</td>
                                            <td style={{color: 'var(--dim)'}}>{r.metodo || '—'}</td>
                                            <td>
                                                <div style={{display: 'flex', gap: '5px'}} onClick={e => e.stopPropagation()}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => onEditAporte(r)}>✏️</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => onDeleteAporte(r.id)}>🗑</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            ) : (
                                <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)'}}>No hay ofrendas registradas para este grupo</div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </Modal>
  );
}
