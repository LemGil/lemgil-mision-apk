import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';
import type { Miembro } from '../../lib/types';

interface EvangelismoFormModalProps {
  open: boolean;
  onClose: () => void;
  editEvangId: string | null;
  saveEvang: () => void;
  miembros: Miembro[];
  eTipo: string; setETipo: Dispatch<SetStateAction<string>>;
  eFecha: string; setEFecha: Dispatch<SetStateAction<string>>;
  eZona: string; setEZona: Dispatch<SetStateAction<string>>;
  eLider: string; setELider: Dispatch<SetStateAction<string>>;
  eLiderCustom: boolean; setELiderCustom: Dispatch<SetStateAction<boolean>>;
  eParticipantes: string[]; setEParticipantes: Dispatch<SetStateAction<string[]>>;
  ePartCustom: string; setEPartCustom: Dispatch<SetStateAction<string>>;
  eContactos: string; setEContactos: Dispatch<SetStateAction<string>>;
  eConvs: string; setEConvs: Dispatch<SetStateAction<string>>;
  eNotas: string; setENotas: Dispatch<SetStateAction<string>>;
}

export function EvangelismoFormModal(props: EvangelismoFormModalProps) {
  const { open, onClose, editEvangId, saveEvang, miembros, eTipo, setETipo, eFecha, setEFecha, eZona, setEZona, eLider, setELider, eLiderCustom, setELiderCustom, eParticipantes, setEParticipantes, ePartCustom, setEPartCustom, eContactos, setEContactos, eConvs, setEConvs, eNotas, setENotas } = props;
  return (
      <Modal open={open} onClose={onClose} title={editEvangId ? '✏️ Editar Evangelismo' : '📋 Registrar Evangelismo'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveEvang}>💾 {editEvangId ? 'Guardar Cambios' : 'Guardar'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Tipo de Actividad *</label><select className="form-select" value={eTipo} onChange={(e) => setETipo(e.target.value)}>{['Visita domiciliaria','Campaña en plaza','Evangelismo en calle','Reunión de célula','Invitación personal'].map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={eZona} onChange={setEZona} allowEmpty={false} emptyLabel="" /></div>
          <div className="form-group"><label className="form-label">Ministro</label>{eLiderCustom ? (<div style={{ display: 'flex', gap: 6 }}><input className="form-input" value={eLider} onChange={(e) => setELider(e.target.value)} placeholder="Escribe el nombre completo" autoFocus /><button type="button" className="btn btn-secondary btn-sm" onClick={() => { setELiderCustom(false); setELider(''); }}>📋 Lista</button></div>) : (<select className="form-select" value={eLider} onChange={(e) => { if (e.target.value === '__custom__') { setELiderCustom(true); setELider(''); } else { setELider(e.target.value); } }}><option value="">— Seleccionar de la lista —</option>{miembros.slice().sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => <option key={m.id} value={`${m.nombre} ${m.apellido}`}>{m.nombre} {m.apellido}</option>)}<option value="__custom__">— Otro (escribir manualmente) —</option></select>)}{miembros.length === 0 && !eLiderCustom && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>No hay miembros — selecciona "Otro" o crea uno primero</div>}</div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Equipo / Participantes</label>
            {eParticipantes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {eParticipantes.map((p, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', borderRadius: 14, background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600 }}>
                    <span>{p}</span>
                    <button type="button" onClick={() => setEParticipantes(eParticipantes.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, fontWeight: 700 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <select className="form-select" value="" onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (v === '__custom__') {
                const nombre = (ePartCustom || '').trim();
                if (nombre && !eParticipantes.includes(nombre)) setEParticipantes([...eParticipantes, nombre]);
                setEPartCustom('');
              } else if (!eParticipantes.includes(v) && v !== eLider) {
                setEParticipantes([...eParticipantes, v]);
              }
              e.target.value = '';
            }}>
              <option value="">{eParticipantes.length === 0 ? '➕ Agregar participante…' : '➕ Agregar otro…'}</option>
              {miembros.filter(m => `${m.nombre} ${m.apellido}` !== eLider && !eParticipantes.includes(`${m.nombre} ${m.apellido}`)).slice().sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => <option key={m.id} value={`${m.nombre} ${m.apellido}`}>{m.nombre} {m.apellido}</option>)}
              <option value="__custom__">— Otro (escribir manualmente) —</option>
            </select>
            {eParticipantes.length === 0 && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Opcional · Agrega miembros que participaron además del ministro</div>}
          </div>
          <div className="form-group"><label className="form-label">Personas Contactadas</label><input className="form-input" type="number" value={eContactos} onChange={(e) => setEContactos(e.target.value)} min="0" /></div>
          <div className="form-group"><label className="form-label">Conversiones del evento</label><input className="form-input" type="number" value={eConvs} onChange={(e) => setEConvs(e.target.value)} min="0" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Observaciones</label><textarea className="form-textarea" value={eNotas} onChange={(e) => setENotas(e.target.value)} placeholder="Resultados, situaciones especiales…" /></div>
      </Modal>
  );
}
