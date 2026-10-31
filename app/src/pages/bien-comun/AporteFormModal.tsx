import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Diezmador, Grupo } from '../../lib/types';

interface AporteFormModalProps {
  open: boolean;
  onClose: () => void;
  saveA: () => void;
  colaboradores: Diezmador[];
  grupos: Grupo[];
  aMiembro: string; setAMiembro: Dispatch<SetStateAction<string>>;
  aGrupo: string; setAGrupo: Dispatch<SetStateAction<string>>;
  aTipo: 'Diezmo' | 'Ofrenda'; setATipo: Dispatch<SetStateAction<'Diezmo' | 'Ofrenda'>>;
  aMonto: string; setAMonto: Dispatch<SetStateAction<string>>;
  aFecha: string; setAFecha: Dispatch<SetStateAction<string>>;
  aMetodo: string; setAMetodo: Dispatch<SetStateAction<string>>;
  aServicio: string; setAServicio: Dispatch<SetStateAction<string>>;
  aNotas: string; setANotas: Dispatch<SetStateAction<string>>;
}

export function AporteFormModal(props: AporteFormModalProps) {
  const { open, onClose, saveA, colaboradores, grupos, aMiembro, setAMiembro, aGrupo, setAGrupo, aTipo, setATipo, aMonto, setAMonto, aFecha, setAFecha, aMetodo, setAMetodo, aServicio, setAServicio, aNotas, setANotas } = props;
  return (
        <Modal open={open} onClose={onClose} title={aTipo === 'Diezmo' ? '💰 Registrar Diezmo' : '🎁 Registrar Ofrenda'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveA}>💾 Registrar</button></>}>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Diezmador {aTipo === 'Diezmo' && '*'}</label>
                    {aTipo === 'Diezmo' ? (
                        <select className="form-select" value={aMiembro} onChange={e => { setAMiembro(e.target.value); setAGrupo(''); }}>
                            <option value="">Seleccionar Diezmador *</option>
                            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                        </select>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <select className="form-select" value={aMiembro} onChange={e => { setAMiembro(e.target.value); setAGrupo(''); }}>
                                <option value="">Seleccionar Diezmador (Opcional)</option>
                                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                            </select>
                            <div style={{textAlign: 'center', fontSize: '12px', color: 'var(--dim)'}}>O</div>
                            <select className="form-select" value={aGrupo} onChange={e => { setAGrupo(e.target.value); setAMiembro(''); }}>
                                <option value="">Seleccionar Grupo (Opcional)</option>
                                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Tipo *</label><select className="form-select" value={aTipo} onChange={e => setATipo(e.target.value as 'Diezmo' | 'Ofrenda')}><option>Diezmo</option><option>Ofrenda</option></select></div>
                    <div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={aMonto} onChange={e => setAMonto(e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={aFecha} onChange={e => setAFecha(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Método</label><select className="form-select" value={aMetodo} onChange={e => setAMetodo(e.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Cheque</option></select></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Servicio</label><input className="form-input" value={aServicio} onChange={e => setAServicio(e.target.value)} /></div>
                </div>
                <div className="form-group"><label className="form-label">Notas</label><textarea className="form-textarea" value={aNotas} onChange={e => setANotas(e.target.value)} /></div>
            </div>
        </Modal>
  );
}
