import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/database';
import { Modal } from './Modal';
import { ZonaSelect } from './ZonaSelect';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import { buscarPorIdentidad } from '../lib/personas';
import type { Persona } from '../lib/types';

interface PersonaFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Persona a editar; null = alta nueva. */
  persona?: Persona | null;
  /** Se llama con el id guardado (para que un PersonaSelect la seleccione). */
  onSaved?: (id: string) => void;
}

/**
 * Ficha única (P0): EL formulario del núcleo de la persona — el único sitio
 * donde se teclean sus datos. Nace en P0 sin uso en páginas; los paquetes
 * siguientes (P2–P5) lo conectan a cada alta de proceso.
 */
export function PersonaFormModal({ open, onClose, persona, onSaved }: PersonaFormModalProps) {
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [numeroIdentidad, setNumeroIdentidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [zona, setZona] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [profesion, setProfesion] = useState('');
  const [estadoCivil, setEstadoCivil] = useState<Persona['estadoCivil']>('Soltero');
  const [contactoPreferido, setContactoPreferido] = useState<Persona['contactoPreferido']>('WhatsApp');
  const [bautizado, setBautizado] = useState(false);
  const [fechaBautismo, setFechaBautismo] = useState('');
  const [conyuge, setConyuge] = useState('');
  const [hijos, setHijos] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [hermanoMayorId, setHermanoMayorId] = useState('');

  useEffect(() => {
    if (!open) return;
    setNombre(persona?.nombre ?? '');
    setApellido(persona?.apellido ?? '');
    setNumeroIdentidad(persona?.numeroIdentidad ?? '');
    setTelefono(persona?.telefono ?? '');
    setEmail(persona?.email ?? '');
    setDireccion(persona?.direccion ?? '');
    setZona(persona?.zona ?? '');
    setFechaNacimiento(persona?.fechaNacimiento ?? '');
    setProfesion(persona?.profesion ?? '');
    setEstadoCivil(persona?.estadoCivil ?? 'Soltero');
    setContactoPreferido(persona?.contactoPreferido ?? 'WhatsApp');
    setBautizado(persona?.bautizado ?? false);
    setFechaBautismo(persona?.fechaBautismo ?? '');
    setConyuge(persona?.conyuge ?? '');
    setHijos(persona?.hijos ?? '');
    setGrupoId(persona?.grupoId ?? '');
    setHermanoMayorId(persona?.hermanoMayorId ?? '');
  }, [open, persona]);

  const guardar = async () => {
    if (!nombre.trim() || !apellido.trim()) return;
    const datos: Persona = {
      id: persona?.id ?? uuid(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      numeroIdentidad: numeroIdentidad.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      direccion: direccion.trim(),
      zona,
      fechaNacimiento,
      profesion: profesion.trim(),
      estadoCivil,
      contactoPreferido,
      bautizado,
      fechaBautismo: bautizado ? fechaBautismo : '',
      conyuge: conyuge.trim(),
      hijos: hijos.trim(),
      grupoId: grupoId || null,
      hermanoMayorId: hermanoMayorId || null,
      creado: persona?.creado ?? new Date().toISOString(),
      version: persona?.version ?? 1,
      updatedAt: persona?.updatedAt,
    };
    if (persona) {
      const { id, ...cambios } = datos;
      await db.personas.update(id, cambios);
    } else {
      await db.personas.add(createBaseRecord(datos));
    }
    onSaved?.(datos.id);
    onClose();
  };

  const mentores = personas.filter((p) => p.id !== persona?.id);

  // P2: el carné es único e intransferible — si el Nº de Identidad tecleado
  // ya pertenece a OTRA persona, no se crea ni se guarda un duplicado: se
  // ofrece usar esa ficha (en el alta) o se avisa del choque (en edición).
  const duplicada = buscarPorIdentidad(personas, numeroIdentidad, persona?.id);

  return (
    <Modal open={open} onClose={onClose} title={persona ? '✏️ Editar persona' : '➕ Nueva persona'} wide footer={
      <>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-gold" onClick={guardar} disabled={!nombre.trim() || !apellido.trim() || !!duplicada}>💾 Guardar</button>
      </>
    }>
      <div className="form-section">👤 Datos de la persona (se teclean una sola vez)</div>
      {duplicada && (
        <div style={{ background: 'var(--gold-glow)', border: '1px solid var(--gold)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, lineHeight: 1.5 }}>
          ⚠️ Ya existe una persona con este Nº de Identidad: <strong>{duplicada.nombre} {duplicada.apellido}</strong>.
          El carné es único: esta persona no debe teclearse dos veces.
          {!persona && (
            <>
              {' '}
              <button type="button" className="btn btn-gold btn-sm" onClick={() => { onSaved?.(duplicada.id); onClose(); }}>Usar esta persona</button>
            </>
          )}
        </div>
      )}
      <div className="form-row">
        <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" /></div>
        <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Pérez" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Nº de Identidad</label><input className="form-input" value={numeroIdentidad} onChange={(e) => setNumeroIdentidad(e.target.value)} placeholder="85010112345" /></div>
        <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="5551234" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" value={direccion} onChange={(e) => setDireccion(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={zona} onChange={setZona} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Fecha de nacimiento</label><input className="form-input" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Profesión</label><input className="form-input" value={profesion} onChange={(e) => setProfesion(e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Estado civil</label>
          <select className="form-select" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value as Persona['estadoCivil'])}>
            <option>Soltero</option><option>Casado</option><option>Viudo</option><option>Divorciado</option><option>Unión</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Contacto preferido</label>
          <select className="form-select" value={contactoPreferido} onChange={(e) => setContactoPreferido(e.target.value as Persona['contactoPreferido'])}>
            <option>Teléfono</option><option>WhatsApp</option><option>Email</option><option>Visita</option><option>Otro</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Cónyuge</label><input className="form-input" value={conyuge} onChange={(e) => setConyuge(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Hijos</label><input className="form-input" value={hijos} onChange={(e) => setHijos(e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Grupo</label>
          <select className="form-select" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Sin grupo</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Hermano mayor</label>
          <select className="form-select" value={hermanoMayorId} onChange={(e) => setHermanoMayorId(e.target.value)}>
            <option value="">Sin asignar</option>
            {mentores.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Bautizado</label>
          <select className="form-select" value={bautizado ? 'si' : 'no'} onChange={(e) => setBautizado(e.target.value === 'si')}>
            <option value="no">No</option><option value="si">Sí</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Fecha de bautismo</label><input className="form-input" type="date" value={fechaBautismo} onChange={(e) => setFechaBautismo(e.target.value)} disabled={!bautizado} /></div>
      </div>
    </Modal>
  );
}
