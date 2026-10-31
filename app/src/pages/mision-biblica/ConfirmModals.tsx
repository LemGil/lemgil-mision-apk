import { Modal } from '../../components/Modal';
import type { Conversion } from '../../lib/types';
import type { ModalType } from './constants';

interface ConfirmModalsProps {
  modal: ModalType | null;
  selConv: Conversion | undefined;
  grupoNombre: string | undefined;
  onClose: () => void;
  delConv: () => void;
  delGrupo: () => void;
  delEvang: () => void;
}

export function ConfirmModals(props: ConfirmModalsProps) {
  const { modal, selConv, grupoNombre, onClose, delConv, delGrupo, delEvang } = props;
  return (
    <>
      <Modal open={modal === 'confirm'} onClose={onClose} title="⚠️ Confirmar" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delConv}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar el registro de <strong style={{ color: 'var(--txt)' }}>{selConv?.nombre} {selConv?.apellido}</strong>?<br />Esta acción no se puede deshacer.</p>
        </div>
      </Modal>

      {/* MODAL: Confirm Delete Grupo */}
      <Modal open={modal === 'confirmGrupo'} onClose={onClose} title="⚠️ Eliminar Grupo" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delGrupo}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar el grupo <strong style={{ color: 'var(--txt)' }}>{grupoNombre}</strong>?<br />Esta acción no se puede deshacer.</p>
        </div>
      </Modal>

      {/* MODAL: Confirm Delete Evangelismo */}
      <Modal open={modal === 'confirmEvang'} onClose={onClose} title="⚠️ Eliminar Actividad" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delEvang}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar esta actividad de evangelismo?<br />Esta acción no se puede deshacer.</p>
        </div>
      </Modal>
    </>
  );
}
