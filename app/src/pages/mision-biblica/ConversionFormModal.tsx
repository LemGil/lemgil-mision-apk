import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';
import { today } from '../../lib/utils';
import type { Grupo, Miembro } from '../../lib/types';
import { ESTADOS } from './constants';

type HistorialItem = { fecha: string; estado: string; nota: string };

interface ConversionFormModalProps {
  open: boolean;
  onClose: () => void;
  editConvId: string | null;
  saveConv: () => void;
  miembros: Miembro[];
  grupos: Grupo[];
  fNombre: string; setFNombre: Dispatch<SetStateAction<string>>;
  fApellido: string; setFApellido: Dispatch<SetStateAction<string>>;
  fTelefono: string; setFTelefono: Dispatch<SetStateAction<string>>;
  fEdad: string; setFEdad: Dispatch<SetStateAction<string>>;
  fDireccion: string; setFDireccion: Dispatch<SetStateAction<string>>;
  fFamilia: string; setFFamilia: Dispatch<SetStateAction<string>>;
  fFecha: string; setFFecha: Dispatch<SetStateAction<string>>;
  fZona: string; setFZona: Dispatch<SetStateAction<string>>;
  fLider: string; setFLider: Dispatch<SetStateAction<string>>;
  fLiderCustom: boolean; setFLiderCustom: Dispatch<SetStateAction<boolean>>;
  fEstado: string; setFEstado: Dispatch<SetStateAction<string>>;
  fGrupoId: string; setFGrupoId: Dispatch<SetStateAction<string>>;
  fNotas: string; setFNotas: Dispatch<SetStateAction<string>>;
  fEmail: string; setFEmail: Dispatch<SetStateAction<string>>;
  fProfesion: string; setFProfesion: Dispatch<SetStateAction<string>>;
  fBautizado: boolean; setFBautizado: Dispatch<SetStateAction<boolean>>;
  fFechaBautismo: string; setFFechaBautismo: Dispatch<SetStateAction<string>>;
  fConyuge: string; setFConyuge: Dispatch<SetStateAction<string>>;
  fHijos: string; setFHijos: Dispatch<SetStateAction<string>>;
  fHistorial: HistorialItem[]; setFHistorial: Dispatch<SetStateAction<HistorialItem[]>>;
}

export function ConversionFormModal(props: ConversionFormModalProps) {
  const { open, onClose, editConvId, saveConv, miembros, grupos, fNombre, setFNombre, fApellido, setFApellido, fTelefono, setFTelefono, fEdad, setFEdad, fDireccion, setFDireccion, fFamilia, setFFamilia, fFecha, setFFecha, fZona, setFZona, fLider, setFLider, fLiderCustom, setFLiderCustom, fEstado, setFEstado, fGrupoId, setFGrupoId, fNotas, setFNotas, fEmail, setFEmail, fProfesion, setFProfesion, fBautizado, setFBautizado, fFechaBautismo, setFFechaBautismo, fConyuge, setFConyuge, fHijos, setFHijos, fHistorial, setFHistorial } = props;
  return (
      <Modal open={open} onClose={onClose} title={editConvId ? '✏️ Editar Conversión' : '✝️ Nueva Conversión'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveConv}>💾 {editConvId ? 'Guardar Cambios' : 'Guardar'}</button></>} wide>

        {/* ─── SECCIÓN: PERSONAL ─── */}
        <div className="form-section">👤 Datos Personales</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={fNombre} onChange={(e) => setFNombre(e.target.value)} placeholder="Nombre" /></div>
          <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={fApellido} onChange={(e) => setFApellido(e.target.value)} placeholder="Apellido" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Edad</label><input className="form-input" type="number" value={fEdad} onChange={(e) => setFEdad(e.target.value)} placeholder="28" /></div>
          <div className="form-group"><label className="form-label">Profesión</label><input className="form-input" value={fProfesion} onChange={(e) => setFProfesion(e.target.value)} placeholder="Ej: Maestro, Ingeniero…" /></div>
        </div>

        {/* ─── SECCIÓN: CONTACTO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📞 Contacto</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)} placeholder="+1 555 000 0000" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="email@ejemplo.com" /></div>
        </div>
        <div className="form-group"><label className="form-label">Dirección / Barrio</label><input className="form-input" value={fDireccion} onChange={(e) => setFDireccion(e.target.value)} placeholder="Sector, barrio…" /></div>

        {/* ─── SECCIÓN: IGLESIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>⛪ Iglesia</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Zona *</label><ZonaSelect value={fZona} onChange={setFZona} required /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Hermano Mayor *</label>{fLiderCustom ? (<div style={{ display: 'flex', gap: 6 }}><input className="form-input" value={fLider} onChange={(e) => setFLider(e.target.value)} placeholder="Escribe el nombre completo" autoFocus /><button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFLiderCustom(false); setFLider(''); }}>📋 Lista</button></div>) : (<select className="form-select" value={fLider} onChange={(e) => { if (e.target.value === '__custom__') { setFLiderCustom(true); setFLider(''); } else { setFLider(e.target.value); } }}><option value="">— Seleccionar de la lista —</option>{miembros.slice().sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => <option key={m.id} value={`${m.nombre} ${m.apellido}`}>{m.nombre} {m.apellido}</option>)}<option value="__custom__">— Otro (escribir manualmente) —</option></select>)}{miembros.length === 0 && !fLiderCustom && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>No hay miembros — selecciona "Otro" o crea uno primero</div>}</div>
          <div className="form-group"><label className="form-label">Grupo a Asignar</label><select className="form-select" value={fGrupoId} onChange={(e) => setFGrupoId(e.target.value)}><option value="">— Sin asignar —</option>{grupos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((g) => <option key={g.id} value={g.id}>{g.nombre} {g.zona ? `· ${g.zona}` : ''}</option>)}</select>{grupos.length === 0 && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>No hay grupos creados — crea uno primero en la pestaña Grupos</div>}</div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">¿Familia en el ministerio?</label><select className="form-select" value={fFamilia} onChange={(e) => setFFamilia(e.target.value)}><option>No</option><option>Sí</option></select></div>
          <div className="form-group"><label className="form-label">Estado Inicial</label><select className="form-select" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>{ESTADOS.map((e) => <option key={e}>{e}</option>)}</select></div>
        </div>

        {/* ─── SECCIÓN: FAMILIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>👪 Vida Espiritual y Familiar</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">¿Bautizado?</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={fBautizado} onChange={(e) => setFBautizado(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontWeight: 600 }}>{fBautizado ? '💧 Sí, bautizado' : 'No bautizado'}</span>
            </label>
          </div>
          <div className="form-group"><label className="form-label">Fecha de Bautismo</label>
            <input className="form-input" type="date" value={fFechaBautismo} onChange={(e) => setFFechaBautismo(e.target.value)} disabled={!fBautizado} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Cónyuge</label><input className="form-input" value={fConyuge} onChange={(e) => setFConyuge(e.target.value)} placeholder="Si aplica" /></div>
          <div className="form-group"><label className="form-label">Hijos</label><input className="form-input" value={fHijos} onChange={(e) => setFHijos(e.target.value)} placeholder="Ej: 2 hijos (Sofía 8, Mateo 5)" /></div>
        </div>

        {/* ─── SECCIÓN: NOTAS ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📝 Notas</div>
        <div className="form-group"><textarea className="form-textarea" value={fNotas} onChange={(e) => setFNotas(e.target.value)} placeholder="¿Cómo fue contactado?" style={{ minHeight: 55 }} /></div>

        {/* ─── SECCIÓN: HISTORIAL DE ESTADOS ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📋 Historial de Estados</div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>Registra las fechas reales de cada cambio de estado</div>
        {fHistorial.length > 0 && fHistorial.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
            <input className="form-input" type="date" value={h.fecha} onChange={(e) => { const n = [...fHistorial]; n[i] = { ...n[i], fecha: e.target.value }; setFHistorial(n); }} style={{ flex: '0 0 140px' }} />
            <select className="form-select" value={h.estado} onChange={(e) => { const n = [...fHistorial]; n[i] = { ...n[i], estado: e.target.value }; setFHistorial(n); }} style={{ flex: 1 }}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <input className="form-input" value={h.nota} onChange={(e) => { const n = [...fHistorial]; n[i] = { ...n[i], nota: e.target.value }; setFHistorial(n); }} placeholder="Nota (opcional)" style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFHistorial(fHistorial.filter((_, j) => j !== i))} title="Eliminar">🗑️</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFHistorial([...fHistorial, { fecha: today(), estado: fEstado, nota: '' }])} style={{ marginTop: 4 }}>➕ Agregar entrada al historial</button>
      </Modal>
  );
}
