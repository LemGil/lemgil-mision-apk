import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';
import type { Grupo, Miembro } from '../../lib/types';

interface MiembroFormModalProps {
  open: boolean;
  onClose: () => void;
  editMId: string | null;
  saveM: () => void;
  grupos: Grupo[];
  miembros: Miembro[];
  mNombre: string; setMNombre: Dispatch<SetStateAction<string>>;
  mApellido: string; setMApellido: Dispatch<SetStateAction<string>>;
  mTel: string; setMTel: Dispatch<SetStateAction<string>>;
  mEmail: string; setMEmail: Dispatch<SetStateAction<string>>;
  mDir: string; setMDir: Dispatch<SetStateAction<string>>;
  mZona: string; setMZona: Dispatch<SetStateAction<string>>;
  mGrupo: string; setMGrupo: Dispatch<SetStateAction<string>>;
  mNac: string; setMNac: Dispatch<SetStateAction<string>>;
  mIngreso: string; setMIngreso: Dispatch<SetStateAction<string>>;
  mEstado: string; setMEstado: Dispatch<SetStateAction<string>>;
  mContacto: string; setMContacto: Dispatch<SetStateAction<string>>;
  mProfesion: string; setMProfesion: Dispatch<SetStateAction<string>>;
  mCivil: string; setMCivil: Dispatch<SetStateAction<string>>;
  mBautizado: boolean; setMBautizado: Dispatch<SetStateAction<boolean>>;
  mBautismo: string; setMBautismo: Dispatch<SetStateAction<string>>;
  mConyuge: string; setMConyuge: Dispatch<SetStateAction<string>>;
  mHijos: string; setMHijos: Dispatch<SetStateAction<string>>;
  mHermanoMayorId: string; setMHermanoMayorId: Dispatch<SetStateAction<string>>;
  mNotas: string; setMNotas: Dispatch<SetStateAction<string>>;
}

export function MiembroFormModal(props: MiembroFormModalProps) {
  const { open, onClose, editMId, saveM, grupos, miembros, mNombre, setMNombre, mApellido, setMApellido, mTel, setMTel, mEmail, setMEmail, mDir, setMDir, mZona, setMZona, mGrupo, setMGrupo, mNac, setMNac, mIngreso, setMIngreso, mEstado, setMEstado, mContacto, setMContacto, mProfesion, setMProfesion, mCivil, setMCivil, mBautizado, setMBautizado, mBautismo, setMBautismo, mConyuge, setMConyuge, mHijos, setMHijos, mHermanoMayorId, setMHermanoMayorId, mNotas, setMNotas } = props;
  return (
      <Modal open={open} onClose={onClose} title={editMId ? 'Editar miembro' : 'Nuevo miembro'} wide>
        {/* ─── SECCIÓN: PERSONAL ─── */}
        <div className="form-section">👤 Datos Personales</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={mNombre} onChange={(e) => setMNombre(e.target.value)} placeholder="Juan" /></div>
          <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={mApellido} onChange={(e) => setMApellido(e.target.value)} placeholder="Pérez" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha de nacimiento</label><input className="form-input" type="date" value={mNac} onChange={(e) => setMNac(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado civil</label>
            <select className="form-select" value={mCivil} onChange={(e) => setMCivil(e.target.value)}>
              <option>Soltero</option><option>Casado</option><option>Viudo</option><option>Divorciado</option><option>Unión</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Profesión</label><input className="form-input" value={mProfesion} onChange={(e) => setMProfesion(e.target.value)} placeholder="Ej: Maestro, Ingeniero…" /></div>
          <div className="form-group"><label className="form-label">Cónyuge</label><input className="form-input" value={mConyuge} onChange={(e) => setMConyuge(e.target.value)} placeholder="Si aplica" /></div>
        </div>
        <div className="form-group"><label className="form-label">Hijos</label><input className="form-input" value={mHijos} onChange={(e) => setMHijos(e.target.value)} placeholder="Ej: 2 hijos (Sofía 8, Mateo 5)" /></div>

        {/* ─── SECCIÓN: CONTACTO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📞 Contacto</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={mTel} onChange={(e) => setMTel(e.target.value)} placeholder="+54 11 5555 5555" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="email@ejemplo.com" /></div>
        </div>
        <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" value={mDir} onChange={(e) => setMDir(e.target.value)} placeholder="Calle, número, ciudad" /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Zona / Sector</label><ZonaSelect value={mZona} onChange={setMZona} emptyLabel="Sin zona" /></div>
          <div className="form-group"><label className="form-label">Contacto preferido</label>
            <select className="form-select" value={mContacto} onChange={(e) => setMContacto(e.target.value)}>
              <option>Teléfono</option><option>WhatsApp</option><option>Email</option><option>Visita</option><option>Otro</option>
            </select>
          </div>
        </div>

        {/* ─── SECCIÓN: IGLESIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>⛪ Membresía</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha de ingreso</label><input className="form-input" type="date" value={mIngreso} onChange={(e) => setMIngreso(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado</label>
            <select className="form-select" value={mEstado} onChange={(e) => setMEstado(e.target.value)}>
              <option>Activo</option><option>Inactivo</option><option>Trasladado</option><option>Disciplinado</option><option>Fallecido</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Grupo de Misión</label>
            <select className="form-select" value={mGrupo} onChange={(e) => setMGrupo(e.target.value)}>
              <option value="">— Sin grupo asignado —</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Hermano Mayor (Líder/Mentor)</label>
            <select className="form-select" value={mHermanoMayorId} onChange={(e) => setMHermanoMayorId(e.target.value)}>
              <option value="">— Sin hermano mayor asignado —</option>
              {miembros.filter(m => m.estado === 'Activo' && m.id !== editMId).sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── SECCIÓN: CRECIMIENTO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📈 Crecimiento Espiritual</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">¿Bautizado?</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={mBautizado} onChange={(e) => setMBautizado(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontWeight: 600 }}>{mBautizado ? '💧 Sí, bautizado' : 'No bautizado'}</span>
            </label>
          </div>
          <div className="form-group"><label className="form-label">Fecha de bautismo</label>
            <input className="form-input" type="date" value={mBautismo} onChange={(e) => setMBautismo(e.target.value)} disabled={!mBautizado} />
          </div>
        </div>

        {/* ─── SECCIÓN: NOTAS ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📝 Notas Pastorales</div>
        <div className="form-group"><textarea className="form-textarea" rows={3} value={mNotas} onChange={(e) => setMNotas(e.target.value)} placeholder="Observaciones pastorales, necesidades, seguimiento…" /></div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveM}>{editMId ? 'Guardar cambios' : 'Registrar miembro'}</button>
        </div>
      </Modal>
  );
}
