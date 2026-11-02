import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';
import { PersonaSelect } from '../../components/PersonaSelect';
import type { Persona } from '../../lib/types';

interface EvangelismoFormModalProps {
  open: boolean;
  onClose: () => void;
  editEvangId: string | null;
  saveEvang: () => void;
  personas: Persona[];
  eTipo: string; setETipo: Dispatch<SetStateAction<string>>;
  eFecha: string; setEFecha: Dispatch<SetStateAction<string>>;
  eZona: string; setEZona: Dispatch<SetStateAction<string>>;
  eLiderId: string; setELiderId: Dispatch<SetStateAction<string>>;
  eParticipanteIds: string[]; setEParticipanteIds: Dispatch<SetStateAction<string[]>>;
  /** Nombres viejos sin persona (texto dormido de registros anteriores): se conservan como foto, no como vínculo. */
  eParticipantesRespaldo: string[];
  setEParticipantesRespaldo: Dispatch<SetStateAction<string[]>>;
  /** Cifra viva: conteo derivado de las conversiones enlazadas (solo lectura). */
  eConvsDerivadas: number;
  eContactos: string; setEContactos: Dispatch<SetStateAction<string>>;
  eNotas: string; setENotas: Dispatch<SetStateAction<string>>;
}

/**
 * P2 (ficha única, §3.5 del diseño): el ministro y el equipo del
 * evangelismo son PERSONAS por id (`liderId`/`participanteIds`), elegidas
 * con el selector único — si alguien no está, se crea ahí mismo una sola
 * vez. La cifra de conversiones ya no se teclea: es el conteo derivado de
 * las conversiones enlazadas a este evangelismo y se muestra de solo
 * lectura.
 */
export function EvangelismoFormModal(props: EvangelismoFormModalProps) {
  const { open, onClose, editEvangId, saveEvang, personas, eTipo, setETipo, eFecha, setEFecha, eZona, setEZona, eLiderId, setELiderId, eParticipanteIds, setEParticipanteIds, eParticipantesRespaldo, setEParticipantesRespaldo, eConvsDerivadas, eContactos, setEContactos, eNotas, setENotas } = props;
  const nombreDe = (id: string) => {
    const p = personas.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellido}` : '(persona no encontrada)';
  };

  return (
      <Modal open={open} onClose={onClose} title={editEvangId ? '✏️ Editar Evangelismo' : '📋 Registrar Evangelismo'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveEvang}>💾 {editEvangId ? 'Guardar Cambios' : 'Guardar'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Tipo de Actividad *</label><select className="form-select" value={eTipo} onChange={(e) => setETipo(e.target.value)}>{['Visita domiciliaria','Campaña en plaza','Evangelismo en calle','Reunión de célula','Invitación personal'].map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={eZona} onChange={setEZona} allowEmpty={false} emptyLabel="" /></div>
          <div className="form-group"><label className="form-label">Ministro (persona)</label>
            <PersonaSelect value={eLiderId} onChange={setELiderId} emptyLabel="🔍 Buscar ministro o crearlo…" />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Equipo / Participantes</label>
            {(eParticipanteIds.length > 0 || eParticipantesRespaldo.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {eParticipanteIds.map((id) => (
                  <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', borderRadius: 14, background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600 }}>
                    <span>{nombreDe(id)}</span>
                    <button type="button" onClick={() => setEParticipanteIds(eParticipanteIds.filter((x) => x !== id))} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, fontWeight: 700 }}>×</button>
                  </span>
                ))}
                {eParticipantesRespaldo.map((nombre, i) => (
                  <span key={`respaldo-${i}`} title="Nombre registrado antes de la ficha única: se conserva como texto, sin vínculo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', borderRadius: 14, background: 'var(--bg-input)', border: '1px dashed var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--dim)' }}>
                    <span>{nombre} · texto</span>
                    <button type="button" onClick={() => setEParticipantesRespaldo(eParticipantesRespaldo.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, fontWeight: 700 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <PersonaSelect
              value=""
              emptyLabel={eParticipanteIds.length === 0 ? '➕ Agregar participante…' : '➕ Agregar otro…'}
              onChange={(id) => {
                if (!id) return;
                if (id === eLiderId) return;
                if (!eParticipanteIds.includes(id)) setEParticipanteIds([...eParticipanteIds, id]);
              }}
            />
            {eParticipanteIds.length === 0 && eParticipantesRespaldo.length === 0 && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Opcional · Personas que participaron además del ministro</div>}
          </div>
          <div className="form-group"><label className="form-label">Personas Contactadas</label><input className="form-input" type="number" value={eContactos} onChange={(e) => setEContactos(e.target.value)} min="0" /></div>
          <div className="form-group"><label className="form-label">Conversiones del evento</label>
            <input className="form-input" type="number" value={eConvsDerivadas} readOnly disabled title="Se cuenta solo: es el nº de conversiones enlazadas a este evangelismo" />
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>🔢 Se cuenta automáticamente: registra las conversiones desde este evangelismo (botón «➕ Conversión») y la cifra se actualiza sola.</div>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Observaciones</label><textarea className="form-textarea" value={eNotas} onChange={(e) => setENotas(e.target.value)} placeholder="Resultados, situaciones especiales…" /></div>
      </Modal>
  );
}
