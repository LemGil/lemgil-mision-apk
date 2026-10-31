import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { ZonaSelect } from '../../components/ZonaSelect';
import type { Conversion, Curso, Grupo, Miembro } from '../../lib/types';

interface EstudianteFormModalProps {
  open: boolean;
  onClose: () => void;
  editEstId: string | null;
  delEst: () => void;
  saveEst: () => void;
  autoFillOrigen: (origen: 'convertido' | 'miembro' | 'manual', id: string) => void;
  conversiones: Conversion[];
  miembros: Miembro[];
  grupos: Grupo[];
  cursos: Curso[];
  eOrigen: 'convertido' | 'miembro' | 'manual'; setEOrigen: Dispatch<SetStateAction<'convertido' | 'miembro' | 'manual'>>;
  eOrigenId: string; setEOrigenId: Dispatch<SetStateAction<string>>;
  eNombre: string; setENombre: Dispatch<SetStateAction<string>>;
  eApellido: string; setEApellido: Dispatch<SetStateAction<string>>;
  eEdad: string; setEEdad: Dispatch<SetStateAction<string>>;
  eProfesion: string; setEProfesion: Dispatch<SetStateAction<string>>;
  eTel: string; setETel: Dispatch<SetStateAction<string>>;
  eEmail: string; setEEmail: Dispatch<SetStateAction<string>>;
  eDireccion: string; setEDireccion: Dispatch<SetStateAction<string>>;
  eZona: string; setEZona: Dispatch<SetStateAction<string>>;
  eGrupoId: string; setEGrupoId: Dispatch<SetStateAction<string>>;
  eHermanoMayorId: string; setEHermanoMayorId: Dispatch<SetStateAction<string>>;
  eBautizado: boolean; setEBautizado: Dispatch<SetStateAction<boolean>>;
  eFechaBautismo: string; setEFechaBautismo: Dispatch<SetStateAction<string>>;
  eConyuge: string; setEConyuge: Dispatch<SetStateAction<string>>;
  eHijos: string; setEHijos: Dispatch<SetStateAction<string>>;
  eCurso: string; setECurso: Dispatch<SetStateAction<string>>;
  eFecha: string; setEFecha: Dispatch<SetStateAction<string>>;
  eEstado: string; setEEstado: Dispatch<SetStateAction<string>>;
  eNotas: string; setENotas: Dispatch<SetStateAction<string>>;
}

export function EstudianteFormModal(props: EstudianteFormModalProps) {
  const { open, onClose, editEstId, delEst, saveEst, autoFillOrigen, conversiones, miembros, grupos, cursos, eOrigen, setEOrigen, eOrigenId, setEOrigenId, eNombre, setENombre, eApellido, setEApellido, eEdad, setEEdad, eProfesion, setEProfesion, eTel, setETel, eEmail, setEEmail, eDireccion, setEDireccion, eZona, setEZona, eGrupoId, setEGrupoId, eHermanoMayorId, setEHermanoMayorId, eBautizado, setEBautizado, eFechaBautismo, setEFechaBautismo, eConyuge, setEConyuge, eHijos, setEHijos, eCurso, setECurso, eFecha, setEFecha, eEstado, setEEstado, eNotas, setENotas } = props;
  return (
      <Modal open={open} onClose={onClose} title={editEstId ? '✏️ Editar Estudiante' : '🎓 Matricular Estudiante'} footer={<>{editEstId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delEst}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveEst}>{editEstId ? '💾 Guardar Cambios' : '💾 Matricular'}</button></>} wide>

        {/* ─── SECCIÓN: ORIGEN ─── */}
        <div className="form-section">📋 Origen del Estudiante</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fuente de datos</label>
            <select className="form-select" value={eOrigen} onChange={(e) => { const v = e.target.value as 'convertido' | 'miembro' | 'manual'; setEOrigen(v); setEOrigenId(''); if (v === 'manual') { setENombre(''); setEApellido(''); setETel(''); setEEdad(''); setEEmail(''); setEDireccion(''); setEProfesion(''); setEBautizado(false); setEFechaBautismo(''); setEConyuge(''); setEHijos(''); setEZona(''); setEGrupoId(''); setEHermanoMayorId(''); } }}>
              <option value="manual">— Ingreso manual —</option>
              <option value="convertido">🕊 Nuevo Convertido</option>
              <option value="miembro">👥 Miembro de la Iglesia</option>
            </select>
          </div>
          {eOrigen !== 'manual' && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">{eOrigen === 'convertido' ? 'Seleccionar Convertido' : 'Seleccionar Miembro'}</label>
              <select className="form-select" value={eOrigenId} onChange={(e) => { setEOrigenId(e.target.value); autoFillOrigen(eOrigen, e.target.value); }}>
                <option value="">— Seleccionar —</option>
                {(eOrigen === 'convertido' ? conversiones : miembros.filter(m => m.estado === 'Activo')).map((item: any) => (
                  <option key={item.id} value={item.id}>{item.nombre} {item.apellido}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ─── SECCIÓN: PERSONAL ─── */}
        <div className="form-section">👤 Datos Personales</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={eNombre} onChange={(e) => setENombre(e.target.value)} placeholder="Nombre" /></div>
          <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={eApellido} onChange={(e) => setEApellido(e.target.value)} placeholder="Apellido" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Edad</label><input className="form-input" type="number" value={eEdad} onChange={(e) => setEEdad(e.target.value)} placeholder="25" min="5" max="120" /></div>
          <div className="form-group"><label className="form-label">Profesión</label><input className="form-input" value={eProfesion} onChange={(e) => setEProfesion(e.target.value)} placeholder="Ej: Maestro, Ingeniero…" /></div>
        </div>

        {/* ─── SECCIÓN: CONTACTO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📞 Contacto</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={eTel} onChange={(e) => setETel(e.target.value)} placeholder="+1 555 000 0000" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} placeholder="email@ejemplo.com" /></div>
        </div>
        <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" value={eDireccion} onChange={(e) => setEDireccion(e.target.value)} placeholder="Calle, número, ciudad" /></div>

        {/* ─── SECCIÓN: IGLESIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>⛪ Ubicación en la Iglesia</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Zona / Sector</label><ZonaSelect value={eZona} onChange={setEZona} emptyLabel="Sin zona" /></div>
          <div className="form-group"><label className="form-label">Grupo de Misión</label>
            <select className="form-select" value={eGrupoId} onChange={(e) => setEGrupoId(e.target.value)}>
              <option value="">— Sin grupo —</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Hermano Mayor (Líder/Mentor)</label>
          <select className="form-select" value={eHermanoMayorId} onChange={(e) => setEHermanoMayorId(e.target.value)}>
            <option value="">— Sin hermano mayor asignado —</option>
            {miembros.filter(m => m.estado === 'Activo').sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
            ))}
          </select>
        </div>

        {/* ─── SECCIÓN: FAMILIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>👪 Familia</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">¿Bautizado?</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={eBautizado} onChange={(e) => setEBautizado(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontWeight: 600 }}>{eBautizado ? '💧 Sí, bautizado' : 'No bautizado'}</span>
            </label>
          </div>
          <div className="form-group"><label className="form-label">Fecha de Bautismo</label>
            <input className="form-input" type="date" value={eFechaBautismo} onChange={(e) => setEFechaBautismo(e.target.value)} disabled={!eBautizado} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Cónyuge</label><input className="form-input" value={eConyuge} onChange={(e) => setEConyuge(e.target.value)} placeholder="Si aplica" /></div>
          <div className="form-group"><label className="form-label">Hijos</label><input className="form-input" value={eHijos} onChange={(e) => setEHijos(e.target.value)} placeholder="Ej: 2 hijos (Sofía 8, Mateo 5)" /></div>
        </div>

        {/* ─── SECCIÓN: MATRÍCULA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>🎓 Matrícula</div>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Curso *</label><select className="form-select" value={eCurso} onChange={(e) => setECurso(e.target.value)}><option value="">Seleccionar curso…</option>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha de Inicio *</label><input className="form-input" type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={eEstado} onChange={(e) => setEEstado(e.target.value)}><option>Activo</option><option>Pausado</option></select></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={eNotas} onChange={(e) => setENotas(e.target.value)} placeholder="Observaciones de ingreso…" style={{ minHeight: 55 }} /></div>
      </Modal>
  );
}
