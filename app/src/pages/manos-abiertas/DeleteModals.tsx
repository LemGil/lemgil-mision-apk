import { Modal } from '../../components/Modal';
import type { ModalType } from './constants';

interface DeleteModalsProps {
  modal: ModalType | null;
  onClose: () => void;
  delBen: () => void;
  delCamp: () => void;
  delEnt: () => void;
}

export function DeleteModals(props: DeleteModalsProps) {
  const { modal, onClose, delBen, delCamp, delEnt } = props;
  return (
    <>
        <Modal open={modal === 'delBen'} onClose={onClose} title="⚠️ Eliminar Beneficiario" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delBen}>Sí, Eliminar</button></>}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar este beneficiario?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        <Modal open={modal === 'delCamp'} onClose={onClose} title="⚠️ Eliminar Campaña" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delCamp}>Sí, Eliminar</button></>}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar la campaña y todas sus entregas asociadas?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        <Modal open={modal === 'delEnt'} onClose={onClose} title="⚠️ Eliminar Entrega" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delEnt}>Sí, Eliminar</button></>}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar este registro de entrega?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>
    </>
  );
}
