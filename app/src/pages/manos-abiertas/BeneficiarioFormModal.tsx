import { useState, type Dispatch, type SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { PersonaSelect } from '../../components/PersonaSelect';
import { PersonaFormModal } from '../../components/PersonaFormModal';
import { edadDesde } from '../../lib/personaVista';
import type { Persona } from '../../lib/types';

type BenefType = 'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable';

interface BeneficiarioFormModalProps {
  open: boolean;
  onClose: () => void;
  editBenId: string | null;
  saveBen: () => void;
  typeAccent: string;
  personas: Persona[];
  benefType: BenefType; setBenefType: Dispatch<SetStateAction<BenefType>>;
  bPersonaId: string; setBPersonaId: Dispatch<SetStateAction<string>>;
  benefName: string; setBenefName: Dispatch<SetStateAction<string>>;
  bFamilia: string; setBFamilia: Dispatch<SetStateAction<string>>;
  bEstado: string; setBEstado: Dispatch<SetStateAction<string>>;
  bNotas: string; setBNotas: Dispatch<SetStateAction<string>>;
}

/**
 * P5 (ficha única): el formulario del beneficiario ya NO teclea los datos
 * personales ni trae el selector de «origen» con su useEffect copiador —
 * murió junto con `source`/`sourceId`: la persona ES el origen.
 * - Tipos Persona/Vulnerable: se elige la PERSONA (PersonaSelect: buscar
 *   y elegir, o crearla ahí mismo una sola vez con su Nº de Identidad y
 *   el aviso anti-duplicado del núcleo) y aquí solo se teclea el PROCESO
 *   (familia, estado, notas).
 * - Tipos Casa de Familia/Grupo: NO son una persona del núcleo (§3.4).
 *   El hogar/grupo guarda su nombre en el proceso y se enlaza por su
 *   REPRESENTANTE: la persona que recibe y firma, de cuya ficha única se
 *   resuelven el teléfono, la dirección y la zona de contacto.
 */
export function BeneficiarioFormModal(props: BeneficiarioFormModalProps) {
  const { open, onClose, editBenId, saveBen, typeAccent, personas, benefType, setBenefType, bPersonaId, setBPersonaId, benefName, setBenefName, bFamilia, setBFamilia, bEstado, setBEstado, bNotas, setBNotas } = props;
  const [editandoPersona, setEditandoPersona] = useState(false);
  const esPersona = benefType === 'Persona' || benefType === 'Vulnerable';
  const persona = personas.find((p) => p.id === bPersonaId);
  const edad = persona ? edadDesde(persona.fechaNacimiento) : null;

  return (
    <>
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
          <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={benefType} onChange={(e) => setBenefType(e.target.value as BenefType)}><option value="Persona">Persona</option><option value="Casa de Familia">Casa de Familia</option><option value="Grupo">Grupo</option><option value="Vulnerable">Vulnerable</option></select></div>

          {esPersona ? (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Persona beneficiaria *</label>
              <PersonaSelect value={bPersonaId} onChange={setBPersonaId} emptyLabel="🔍 Buscar persona…" />
            </div>
          ) : (
            <>
              <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Nombre {benefType} *</label><input className="form-input" value={benefName} onChange={(e) => setBenefName(e.target.value)} placeholder="Ej: Comedor calle 5, Familia Pérez..." /></div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Representante (recibe y firma)</label>
                <PersonaSelect value={bPersonaId} onChange={setBPersonaId} emptyLabel="Sin representante…" />
              </div>
            </>
          )}

          {persona && (
            <div style={{ gridColumn: 'span 2', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong>{persona.nombre} {persona.apellido}</strong>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditandoPersona(true)}>✏️ Editar datos de la persona</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4, lineHeight: 1.7 }}>
                {persona.numeroIdentidad && <>🪪 {persona.numeroIdentidad} · </>}
                {persona.telefono && <>📱 {persona.telefono} · </>}
                {persona.direccion && <>🏠 {persona.direccion} · </>}
                {persona.zona && <>📍 {persona.zona} · </>}
                {edad !== null && <>🎂 {edad} años</>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                {esPersona
                  ? 'Estos datos viven en la ficha única de la persona: se corrigen una vez y se ven en todos sus procesos.'
                  : 'El teléfono, la dirección y la zona de contacto de este beneficiario son los de su representante: viven en su ficha única.'}
              </div>
            </div>
          )}

          <div className="form-group"><label className="form-label">{benefType === 'Vulnerable' ? 'Personas Aprox.' : 'Cantidad de Familia/Miembros'}</label><input className="form-input" type="number" value={bFamilia} onChange={(e) => setBFamilia(e.target.value)} min="1" /></div>
          <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={bEstado} onChange={(e) => setBEstado(e.target.value)}><option>Activo</option><option>Inactivo</option></select></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas / Contexto</label><textarea className="form-textarea" value={bNotas} onChange={(e) => setBNotas(e.target.value)} placeholder="Situación familiar, necesidades especiales…" style={{ minHeight: 55 }} /></div>
      </Modal>

      <PersonaFormModal
        open={editandoPersona && !!persona}
        onClose={() => setEditandoPersona(false)}
        persona={persona ?? null}
        onSaved={() => setEditandoPersona(false)}
      />
    </>
  );
}
