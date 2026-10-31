import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Colaborador, TipoPlan } from '../../lib/types';

interface AporteFormModalProps {
  open: boolean;
  onClose: () => void;
  editAporteId: string | null;
  saveAporte: () => void;
  onDelete: () => void;
  dadores: Colaborador[];
  tiposPlanes: TipoPlan[];
  aDador: string; setADador: Dispatch<SetStateAction<string>>;
  aFecha: string; setAFecha: Dispatch<SetStateAction<string>>;
  aMonto: string; setAMonto: Dispatch<SetStateAction<string>>;
  aTipo: string; setATipo: Dispatch<SetStateAction<string>>;
  aMetodo: string; setAMetodo: Dispatch<SetStateAction<string>>;
  aNotas: string; setANotas: Dispatch<SetStateAction<string>>;
}

export function AporteFormModal(props: AporteFormModalProps) {
  const { open, onClose, editAporteId, saveAporte, onDelete, dadores, tiposPlanes, aDador, setADador, aFecha, setAFecha, aMonto, setAMonto, aTipo, setATipo, aMetodo, setAMetodo, aNotas, setANotas } = props;
  return (
        <Modal
          open={open}
          onClose={onClose}
          title={editAporteId ? '✏️ Editar Aporte' : '💰 Registrar Aporte'}
          footer={
            <>
              {editAporteId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={onDelete}>🗑️ Eliminar</button>}
              <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button className="btn btn-gold" onClick={saveAporte}>💾 {editAporteId ? 'Guardar Cambios' : 'Registrar Aporte'}</button>
            </>
          }
        >
          <div className="form-section">Datos del Aporte</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Colaborador *</label><select className="form-select" value={aDador} onChange={(e) => setADador(e.target.value)}><option value="">Seleccionar colaborador…</option>{dadores.map((d) => <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={aFecha} onChange={(e) => setAFecha(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={aMonto} onChange={(e) => setAMonto(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
            <div className="form-group"><label className="form-label">Tipo de Aporte</label><select className="form-select" value={aTipo} onChange={(e) => setATipo(e.target.value)}><option>Diezmo</option>{tiposPlanes.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}<option>Otro</option></select></div>
            <div className="form-group"><label className="form-label">Método de Pago</label><select className="form-select" value={aMetodo} onChange={(e) => setAMetodo(e.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Cheque</option><option>Tarjeta</option><option>Otro</option></select></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={aNotas} onChange={(e) => setANotas(e.target.value)} placeholder="Detalles adicionales…" style={{ minHeight: 55 }} /></div>
        </Modal>
  );
}
