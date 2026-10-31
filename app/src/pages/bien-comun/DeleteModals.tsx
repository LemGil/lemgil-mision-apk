import { Modal } from '../../components/Modal';
import type { ModalType } from './constants';

interface DeleteModalsProps {
  modal: ModalType | null;
  onClose: () => void;
  delD: () => void;
  delA: () => void;
  delTp: () => void;
  delPlan: () => void;
}

export function DeleteModals(props: DeleteModalsProps) {
  const { modal, onClose, delD, delA, delTp, delPlan } = props;
  return (
    <>
        <Modal open={modal === 'delD'} onClose={onClose} title="Eliminar Diezmador" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delD}>🗑️ Eliminar</button></>}>¿Está seguro que desea eliminar este diezmador?</Modal>
        <Modal open={modal === 'delA'} onClose={onClose} title="Eliminar Aporte" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delA}>🗑️ Eliminar</button></>}>¿Está seguro que desea eliminar este aporte?</Modal>

        <Modal open={modal === 'delTipoPlan'} onClose={onClose} title="Desactivar Tipo" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delTp}>🗑️ Desactivar</button></>}>¿Desactivar este tipo de plan? Los planes existentes con este tipo se mantendrán.</Modal>

        <Modal open={modal === 'delPlanDiezmador'} onClose={onClose} title="Eliminar Plan" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delPlan}>🗑️ Eliminar</button></>}>¿Está seguro que desea eliminar este plan?</Modal>
    </>
  );
}
