import { Modal } from '../../components/Modal';
import type { Miembro, Ministerio } from '../../lib/types';
import type { ModalType } from './constants';

interface DeleteModalsProps {
  modal: ModalType | null;
  selMiembro: Miembro | null | undefined;
  selMinisterio: Ministerio | null | undefined;
  selAsigMiembro: Miembro | null | undefined;
  selAsigMinisterio: Ministerio | null | undefined;
  selHitoMiembro: Miembro | null | undefined;
  onClose: () => void;
  delM: () => void;
  delMin: () => void;
  delAsig: () => void;
  delH: () => void;
}

export function DeleteModals(props: DeleteModalsProps) {
  const { modal, selMiembro, selMinisterio, selAsigMiembro, selAsigMinisterio, selHitoMiembro, onClose, delM, delMin, delAsig, delH } = props;
  return (
    <>
      <Modal open={modal === 'delM'} onClose={onClose} title="Eliminar miembro">
        <p>¿Eliminar a <strong>{selMiembro?.nombre} {selMiembro?.apellido}</strong> y todas sus asignaciones e hitos?</p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={delM}>Eliminar todo</button>
        </div>
      </Modal>

      <Modal open={modal === 'delMin'} onClose={onClose} title="Eliminar ministerio">
        <p>¿Eliminar el ministerio <strong>{selMinisterio?.nombre}</strong> y todas sus asignaciones?</p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={delMin}>Eliminar</button>
        </div>
      </Modal>

      <Modal open={modal === 'delAsig'} onClose={onClose} title="Eliminar asignación">
        <p>¿Quitar a <strong>{selAsigMiembro?.nombre} {selAsigMiembro?.apellido}</strong> del ministerio <strong>{selAsigMinisterio?.nombre}</strong>?</p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={delAsig}>Quitar</button>
        </div>
      </Modal>

      <Modal open={modal === 'delH'} onClose={onClose} title="Eliminar hito">
        <p>¿Eliminar este hito de <strong>{selHitoMiembro?.nombre} {selHitoMiembro?.apellido}</strong>?</p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={delH}>Eliminar</button>
        </div>
      </Modal>
    </>
  );
}
