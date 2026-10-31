import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import type { Diezmador, TipoPlan } from '../../lib/types';

interface PlanDiezmadorFormModalProps {
  open: boolean;
  onClose: () => void;
  editPlanId: string | null;
  savePlan: () => void;
  planDiezmadorId: string | null;
  setPlanDiezmadorId: Dispatch<SetStateAction<string | null>>;
  colaboradores: Diezmador[];
  tiposPlanes: TipoPlan[];
  planTipoId: string; setPlanTipoId: Dispatch<SetStateAction<string>>;
  planMonto: string; setPlanMonto: Dispatch<SetStateAction<string>>;
  planNotas: string; setPlanNotas: Dispatch<SetStateAction<string>>;
}

export function PlanDiezmadorFormModal(props: PlanDiezmadorFormModalProps) {
  const { open, onClose, editPlanId, savePlan, planDiezmadorId, setPlanDiezmadorId, colaboradores, tiposPlanes, planTipoId, setPlanTipoId, planMonto, setPlanMonto, planNotas, setPlanNotas } = props;
  return (
        <Modal open={open} onClose={onClose} title={editPlanId ? '✏️ Editar Plan' : '➕ Nuevo Plan de Diezmador'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={savePlan}>💾 {editPlanId ? 'Guardar' : 'Crear'}</button></>}>
            <div className="form-group"><label className="form-label">Diezmador *</label><select className="form-select" value={planDiezmadorId || ''} onChange={e => setPlanDiezmadorId(e.target.value)} disabled={!!editPlanId}><option value="">Seleccionar diezmador...</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
            <div className="form-group" style={{marginTop: 12}}><label className="form-label">Tipo de Plan *</label><select className="form-select" value={planTipoId} onChange={e => setPlanTipoId(e.target.value)}><option value="">Seleccionar tipo...</option>{tiposPlanes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
            <div className="form-group" style={{marginTop: 12}}><label className="form-label">Monto Mensual ($) *</label><input className="form-input" type="number" value={planMonto} onChange={e => setPlanMonto(e.target.value)} min="0" placeholder="Ej: 100" /></div>
            <div className="form-group" style={{marginTop: 12}}><label className="form-label">Notas</label><input className="form-input" value={planNotas} onChange={e => setPlanNotas(e.target.value)} placeholder="Opcional" /></div>
        </Modal>
  );
}
