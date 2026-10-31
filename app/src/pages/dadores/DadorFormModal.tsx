import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { TipoPlan } from '../../lib/types';

interface DadorFormModalProps {
  open: boolean;
  onClose: () => void;
  editDadorId: string | null;
  saveDador: () => void;
  onDelete: () => void;
  tiposPlanes: TipoPlan[];
  dNombre: string; setDNombre: Dispatch<SetStateAction<string>>;
  dApellido: string; setDApellido: Dispatch<SetStateAction<string>>;
  dTel: string; setDTel: Dispatch<SetStateAction<string>>;
  dEmail: string; setDEmail: Dispatch<SetStateAction<string>>;
  dTipo: string; setDTipo: Dispatch<SetStateAction<string>>;
  dEstado: string; setDEstado: Dispatch<SetStateAction<string>>;
  dNotas: string; setDNotas: Dispatch<SetStateAction<string>>;
  planTipoId: string; setPlanTipoId: Dispatch<SetStateAction<string>>;
  planMonto: string; setPlanMonto: Dispatch<SetStateAction<string>>;
}

export function DadorFormModal(props: DadorFormModalProps) {
  const { open, onClose, editDadorId, saveDador, onDelete, tiposPlanes, dNombre, setDNombre, dApellido, setDApellido, dTel, setDTel, dEmail, setDEmail, dTipo, setDTipo, dEstado, setDEstado, dNotas, setDNotas, planTipoId, setPlanTipoId, planMonto, setPlanMonto } = props;
  return (
         <Modal
           open={open}
           onClose={onClose}
           title={editDadorId ? '✏️ Editar Colaborador' : '🤝 Nuevo Colaborador'}
           footer={
             <>
               {editDadorId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={onDelete}>🗑️ Eliminar</button>}
               <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
               <button className="btn btn-gold" onClick={saveDador}>💾 {editDadorId ? 'Guardar Cambios' : 'Registrar Colaborador'}</button>
             </>
           }
         >
           <>
             <div className="form-section">Datos del Colaborador</div>
             <div className="form-row">
               <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={dNombre} onChange={(e) => setDNombre(e.target.value)} placeholder="Nombre" /></div>
               <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={dApellido} onChange={(e) => setDApellido(e.target.value)} placeholder="Apellido" /></div>
               <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={dTel} onChange={(e) => setDTel(e.target.value)} placeholder="+1 555 000 0000" /></div>
               <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={dEmail} onChange={(e) => setDEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
               <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={dTipo} onChange={(e) => setDTipo(e.target.value)}><option>Persona</option><option>Empresa</option><option>Iglesia</option></select></div>
               <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={dEstado} onChange={(e) => setDEstado(e.target.value)}><option>Activo</option><option>Pausado</option><option>Inactivo</option></select></div>
             </div>
             <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={dNotas} onChange={(e) => setDNotas(e.target.value)} placeholder="Información adicional, observaciones…" style={{ minHeight: 55 }} /></div>
             {tiposPlanes.length > 0 && (
                 <div style={{ marginTop: 14, padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                     <div className="form-section" style={{ marginTop: 0, marginBottom: 10 }}>📋 Plan de Ofrenda</div>
                     <div className="form-row">
                         <div className="form-group"><label className="form-label">Tipo de Ofrenda</label><select className="form-select" value={planTipoId} onChange={e => setPlanTipoId(e.target.value)}><option value="">Sin plan</option>{tiposPlanes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                         <div className="form-group"><label className="form-label">Monto Mensual ($)</label><input className="form-input" type="number" value={planMonto} onChange={e => setPlanMonto(e.target.value)} min="0" disabled={!planTipoId} placeholder={planTipoId ? 'Ej: 100' : 'Selecciona tipo primero'} /></div>
                     </div>
                 </div>
             )}

           </>
         </Modal>
  );
}
