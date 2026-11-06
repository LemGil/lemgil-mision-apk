import { Modal } from '../../components/Modal';
import type { Conversion } from '../../lib/types';
import type { ModalType } from './constants';

interface ConfirmModalsProps {
  modal: ModalType | null;
  selConv: Conversion | undefined;
  miembroVinculadoNombre?: string;
  grupoNombre: string | undefined;
  /** F12/M7: conversiones que tienen el evangelismo a borrar como origen (quedarán desvinculadas). */
  evangVinculadas?: number;
  /** F12/M7: personas asignadas al grupo a borrar (quedarán sin grupo). */
  grupoAsignadas?: number;
  onClose: () => void;
  delConv: () => void;
  delGrupo: () => void;
  delEvang: () => void;
}

export function ConfirmModals(props: ConfirmModalsProps) {
  const { modal, selConv, miembroVinculadoNombre, grupoNombre, evangVinculadas, grupoAsignadas, onClose, delConv, delGrupo, delEvang } = props;
  return (
    <>
      <Modal open={modal === 'confirm'} onClose={onClose} title="⚠️ Confirmar" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delConv}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar el registro de <strong style={{ color: 'var(--txt)' }}>{selConv?.nombre} {selConv?.apellido}</strong>?<br />Esta acción no se puede deshacer.</p>
          {miembroVinculadoNombre && (
            <p style={{ color: 'var(--red, #ef4444)', fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>👥 Tiene un miembro vinculado (<strong>{miembroVinculadoNombre}</strong>): el miembro <strong>se conservará</strong> en Miembros, pero quedará sin conversión de origen.</p>
          )}
        </div>
      </Modal>

      {/* MODAL: Confirm Delete Grupo */}
      <Modal open={modal === 'confirmGrupo'} onClose={onClose} title="⚠️ Eliminar Grupo" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delGrupo}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar el grupo <strong style={{ color: 'var(--txt)' }}>{grupoNombre}</strong>?<br />Esta acción no se puede deshacer.</p>
          {!!grupoAsignadas && (
            <p style={{ color: 'var(--red, #ef4444)', fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>👥 {grupoAsignadas} persona(s) están asignadas a este grupo: quedarán <strong>sin grupo</strong>.</p>
          )}
        </div>
      </Modal>

      {/* MODAL: Confirm Delete Evangelismo */}
      <Modal open={modal === 'confirmEvang'} onClose={onClose} title="⚠️ Eliminar Actividad" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-danger" onClick={delEvang}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar esta actividad de evangelismo?<br />Esta acción no se puede deshacer.</p>
          {!!evangVinculadas && (
            <p style={{ color: 'var(--red, #ef4444)', fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>✝️ {evangVinculadas} conversión(es) tienen esta actividad como origen: quedarán <strong>sin origen</strong>.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
