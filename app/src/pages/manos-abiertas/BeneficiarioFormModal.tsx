import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';
import type { Conversion, Miembro } from '../../lib/types';

interface BeneficiarioFormModalProps {
  open: boolean;
  onClose: () => void;
  editBenId: string | null;
  saveBen: () => void;
  typeAccent: string;
  benefType: 'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable'; setBenefType: Dispatch<SetStateAction<'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable'>>;
  benefSource: 'Convertido' | 'Miembro' | 'Manual'; setBenefSource: Dispatch<SetStateAction<'Convertido' | 'Miembro' | 'Manual'>>;
  benefSourceId: string; setBenefSourceId: Dispatch<SetStateAction<string>>;
  conversiones: Conversion[];
  miembros: Miembro[];
  bNombre: string; setBNombre: Dispatch<SetStateAction<string>>;
  bApellido: string; setBApellido: Dispatch<SetStateAction<string>>;
  benefName: string; setBenefName: Dispatch<SetStateAction<string>>;
  benefRepresentativeName: string; setBenefRepresentativeName: Dispatch<SetStateAction<string>>;
  bTel: string; setBTel: Dispatch<SetStateAction<string>>;
  bDir: string; setBDir: Dispatch<SetStateAction<string>>;
  bFamilia: string; setBFamilia: Dispatch<SetStateAction<string>>;
  bZona: string; setBZona: Dispatch<SetStateAction<string>>;
  bEstado: string; setBEstado: Dispatch<SetStateAction<string>>;
  bNotas: string; setBNotas: Dispatch<SetStateAction<string>>;
}

export function BeneficiarioFormModal(props: BeneficiarioFormModalProps) {
  const { open, onClose, editBenId, saveBen, typeAccent, benefType, setBenefType, benefSource, setBenefSource, benefSourceId, setBenefSourceId, conversiones, miembros, bNombre, setBNombre, bApellido, setBApellido, benefName, setBenefName, benefRepresentativeName, setBenefRepresentativeName, bTel, setBTel, bDir, setBDir, bFamilia, setBFamilia, bZona, setBZona, bEstado, setBEstado, bNotas, setBNotas } = props;
  return (
        <Modal
          open={open}
          onClose={onClose}
          title={editBenId ? '✏️ Editar Beneficiario' : `🏠 Nuevo Beneficiario (${benefType})`}
          footer={
            <>
              <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button className="btn" style={{ background: typeAccent, color: 'white' }} onClick={saveBen}>💾 {editBenId ? 'Guardar Cambios' : `Registrar ${benefType}`}</button>
            </>
          }
        >
          <div className="form-section" style={{ color: typeAccent }}>Datos del Beneficiario ({benefType})</div>
          <div className="form-row" style={{ border: `2px solid ${typeAccent}`, padding: '16px', borderRadius: '12px' }}>
            <div className="form-group"><label className="form-label">Origen</label><select className="form-select" value={benefSource} onChange={(e) => { setBenefSource(e.target.value as 'Convertido' | 'Miembro' | 'Manual'); setBenefSourceId(''); }}><option value="Manual">Manual</option><option value="Convertido">Converso (Misión)</option><option value="Miembro">Miembro (Iglesia)</option></select></div>
            
            {benefSource === 'Convertido' && (
              <div className="form-group"><label className="form-label">Converso *</label><select className="form-select" value={benefSourceId} onChange={(e) => setBenefSourceId(e.target.value)}><option value="">Seleccionar converso…</option>{conversiones.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
            )}
            {benefSource === 'Miembro' && (
              <div className="form-group"><label className="form-label">Miembro *</label><select className="form-select" value={benefSourceId} onChange={(e) => setBenefSourceId(e.target.value)}><option value="">Seleccionar miembro…</option>{miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}</select></div>
            )}

            <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={benefType} onChange={(e) => setBenefType(e.target.value as 'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable')}><option value="Persona">Persona</option><option value="Casa de Familia">Casa de Familia</option><option value="Grupo">Grupo</option><option value="Vulnerable">Vulnerable</option></select></div>
            
            {benefType === 'Persona' ? (
                <>
                    <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={bNombre} onChange={(e) => setBNombre(e.target.value)} placeholder="Nombre" /></div>
                    <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={bApellido} onChange={(e) => setBApellido(e.target.value)} placeholder="Apellido" /></div>
                </>
            ) : (
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Nombre {benefType} *</label><input className="form-input" value={benefName} onChange={(e) => setBenefName(e.target.value)} placeholder="Ej: Comedor calle 5, Familia Pérez..." /></div>
            )}

            {(benefType === 'Casa de Familia' || benefType === 'Grupo') && (
              <div className="form-group"><label className="form-label">Representante</label><input className="form-input" value={benefRepresentativeName} onChange={(e) => setBenefRepresentativeName(e.target.value)} placeholder="Nombre del representante" /></div>
            )}
            
            {benefType !== 'Vulnerable' && (
                <>
                    <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={bTel} onChange={(e) => setBTel(e.target.value)} placeholder="+1 555 000 0000" /></div>
                    <div className="form-group"><label className="form-label">Dirección / Barrio</label><input className="form-input" value={bDir} onChange={(e) => setBDir(e.target.value)} placeholder="Sector, calle, número…" /></div>
                </>
            )}

            <div className="form-group"><label className="form-label">{benefType === 'Vulnerable' ? 'Personas Aprox.' : 'Cantidad de Familia/Miembros'}</label><input className="form-input" type="number" value={bFamilia} onChange={(e) => setBFamilia(e.target.value)} min="1" /></div>
            <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={bZona} onChange={setBZona} /></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={bEstado} onChange={(e) => setBEstado(e.target.value)}><option>Activo</option><option>Inactivo</option></select></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas / Contexto</label><textarea className="form-textarea" value={bNotas} onChange={(e) => setBNotas(e.target.value)} placeholder="Situación familiar, necesidades especiales…" style={{ minHeight: 55 }} /></div>
        </Modal>
  );
}
