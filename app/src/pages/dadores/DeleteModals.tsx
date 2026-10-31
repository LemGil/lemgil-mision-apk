import { Modal } from '../../components/Modal';
import type { Aporte, Colaborador } from '../../lib/types';
import type { ModalType } from './constants';

interface DeleteModalsProps {
  modal: ModalType | null;
  onClose: () => void;
  selDador: Colaborador | undefined;
  selAportes: Aporte[];
  delDador: () => void;
  delAporte: () => void;
}

export function DeleteModals(props: DeleteModalsProps) {
  const { modal, onClose, selDador, selAportes, delDador, delAporte } = props;
  return (
    <>
        <Modal
          open={modal === 'delDador'}
          onClose={onClose}
          title="⚠️ Eliminar Colaborador"
          footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delDador}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>
              ¿Eliminar a <strong style={{ color: 'var(--txt)' }}>{selDador?.nombre} {selDador?.apellido}</strong>?
              {selAportes.length > 0 && (<><br />Tiene <strong style={{ color: 'var(--txt)' }}>{selAportes.length} aporte(s)</strong> registrado(s) que también se verán afectados.</>)}
              <br />Esta acción no se puede deshacer.
            </p>
          </div>
        </Modal>

        <Modal
          open={modal === 'delAporte'}
          onClose={onClose}
          title="⚠️ Eliminar Aporte"
          footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delAporte}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar este aporte?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>
    </>
  );
}
