import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/database';
import { Modal } from './Modal';
import { ZonaSelect } from './ZonaSelect';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import { buscarPorIdentidad } from '../lib/personas';
import { posiblesRepetidas } from '../lib/personaVista';
import { beneficiarioDeAlta, conversionDeAlta, miembroDeAlta, opcionesEfectivas } from '../lib/altasDirectas';
import { PS_INTEGRADO, entradaCambioDeEstado, pasoGozne } from '../lib/pasosMision';
import { syncMemberFromConversion } from '../pages/mision-biblica/syncMember';
import { today } from '../lib/utils';
import type { Conversion, Persona } from '../lib/types';

interface PersonaFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Persona a editar; null = alta nueva. */
  persona?: Persona | null;
  /** Se llama con el id guardado (para que un PersonaSelect la seleccione). */
  onSaved?: (id: string) => void;
  /**
   * Altas directas (2026-11-15): solo desde Personas, la oficina de
   * registro — al guardar pueden nacer también sus procesos (Congregado
   * en Misión, Integrado en Miembros, Beneficiario en Manos Abiertas).
   * Vale al crear Y al editar la ficha (pedido de LemGil, 2026-11-16):
   * al editar, los procesos que la persona ya tiene se muestran como
   * «ya está» y no se duplican. Desde los módulos no se ofrece: ahí el
   * proceso ya lo está creando el propio módulo.
   */
  altasDirectas?: boolean;
}

/**
 * Ficha única (P0): EL formulario del núcleo de la persona — el único sitio
 * donde se teclean sus datos. Nace en P0 sin uso en páginas; los paquetes
 * siguientes (P2–P5) lo conectan a cada alta de proceso.
 */
export function PersonaFormModal({ open, onClose, persona, onSaved, altasDirectas }: PersonaFormModalProps) {
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const pasosSeguimiento = useLiveQuery(() => db.pasosSeguimiento.toArray(), []) ?? [];
  // Altas directas al EDITAR: los procesos que la persona ya tiene no
  // se crean dos veces — su casilla se muestra como «ya está».
  const todasConversiones = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const todosMiembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const todosBeneficiarios = useLiveQuery(() => db.beneficiarios.toArray(), []) ?? [];
  const conversionExistente = persona ? todasConversiones.find((c) => c.personaId === persona.id) : undefined;
  const yaEnMision = !!conversionExistente;
  const yaMiembro = !!persona && todosMiembros.some((m) => m.personaId === persona.id);
  const yaBeneficiario = !!persona && todosBeneficiarios.some((b) => b.personaId === persona.id);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [numeroIdentidad, setNumeroIdentidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [zona, setZona] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | ''>('');
  const [profesion, setProfesion] = useState('');
  const [estadoCivil, setEstadoCivil] = useState<Persona['estadoCivil']>('Soltero');
  const [contactoPreferido, setContactoPreferido] = useState<Persona['contactoPreferido']>('WhatsApp');
  const [bautizado, setBautizado] = useState(false);
  const [fechaBautismo, setFechaBautismo] = useState('');
  const [conyuge, setConyuge] = useState('');
  const [hijos, setHijos] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [hermanoMayorId, setHermanoMayorId] = useState('');
  // Altas directas: qué procesos nacen con la persona (al crear o al editar).
  const [altaMision, setAltaMision] = useState(false);
  const [altaEntrada, setAltaEntrada] = useState<'congregado' | 'confeso' | 'converso'>('congregado');
  const [altaIntegrado, setAltaIntegrado] = useState(false);
  const [altaBeneficiario, setAltaBeneficiario] = useState(false);

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
    setSexo(persona?.sexo ?? '');
    setProfesion(persona?.profesion ?? '');
    setEstadoCivil(persona?.estadoCivil ?? 'Soltero');
    setContactoPreferido(persona?.contactoPreferido ?? 'WhatsApp');
    setBautizado(persona?.bautizado ?? false);
    setFechaBautismo(persona?.fechaBautismo ?? '');
    setConyuge(persona?.conyuge ?? '');
    setHijos(persona?.hijos ?? '');
    setGrupoId(persona?.grupoId ?? '');
    setHermanoMayorId(persona?.hermanoMayorId ?? '');
    setAltaMision(false);
    setAltaEntrada('congregado');
    setAltaIntegrado(false);
    setAltaBeneficiario(false);
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
      sexo: sexo === '' ? null : sexo,
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
    if (altasDirectas) {
      // Altas directas (2026-11-15; también al editar, 2026-11-16): los
      // procesos marcados nacen en el mismo acto que la persona, sobre
      // su misma ficha. Al editar, `opcionesEfectivas` apaga los que la
      // persona ya tiene: ninguno se duplica.
      const opciones = { mision: altaMision, entrada: altaEntrada, integrado: altaIntegrado, beneficiario: altaBeneficiario };
      const efectivas = opcionesEfectivas(opciones, { mision: yaEnMision, miembro: yaMiembro, beneficiario: yaBeneficiario });
      const hoy = today();
      const conversion = conversionDeAlta(datos.id, efectivas, pasosSeguimiento, hoy);
      if (conversion) await db.conversiones.add(createBaseRecord(conversion));
      if (efectivas.integrado) {
        if (conversion) {
          // Congregado + Integrado: el registro nació en el gozne y
          // el miembro nace enlazado a él, como en Misión.
          await syncMemberFromConversion(conversion);
        } else if (conversionExistente) {
          // Ya estaba en Misión y aún no es miembro: su registro avanza
          // a Integrado (con su entrada de historial, y se levanta la
          // marca de miembro descartado si la hubiera — marcar la
          // casilla ES el «permitir recrear») y el miembro nace
          // enlazado por el camino real.
          const gozneId = pasoGozne(pasosSeguimiento)?.id ?? PS_INTEGRADO;
          const entrada = entradaCambioDeEstado(pasosSeguimiento, conversionExistente.estado, gozneId, hoy);
          const cambiosConv: Partial<Conversion> = {
            estado: gozneId,
            miembroDescartado: false,
            historial: [...(conversionExistente.historial ?? []), ...(entrada ? [entrada] : [])],
          };
          await db.conversiones.update(conversionExistente.id, cambiosConv);
          await syncMemberFromConversion({ ...conversionExistente, ...cambiosConv });
        } else {
          await db.miembros.add(createBaseRecord(miembroDeAlta(datos.id, hoy)));
        }
      }
      if (efectivas.beneficiario) {
        await db.beneficiarios.add(createBaseRecord(beneficiarioDeAlta(datos.id)));
      }
    }
    onSaved?.(datos.id);
    onClose();
  };

  const mentores = personas.filter((p) => p.id !== persona?.id);

  // P2: el carné es único e intransferible — si el Nº de Identidad tecleado
  // ya pertenece a OTRA persona, no se crea ni se guarda un duplicado: se
  // ofrece usar esa ficha (en el alta) o se avisa del choque (en edición).
  const duplicada = buscarPorIdentidad(personas, numeroIdentidad, persona?.id);

  // Guardia «ya registrada» por NOMBRE (2026-11-07): el carné bloquea,
  // pero el carné NO es obligatorio — con el nombre idéntico y sin
  // carné, antes no saltaba nada y la misma persona se tecleaba dos
  // veces. Ahora, si el nombre y el apellido ya existen, se avisa (y se
  // dice si además coincide el teléfono o el nacimiento). NO bloquea:
  // los homónimos existen; la decisión es de quien registra, pero
  // informada. Si la mejor coincidencia es la misma ficha que ya señala
  // el aviso del carné, aquel aviso basta (trae su propio botón).
  const repetidas = posiblesRepetidas(personas, { nombre, apellido, telefono, fechaNacimiento }, persona?.id);
  const repetida = repetidas.find((r) => r.persona.id !== duplicada?.id) ?? null;
  const detalleRepetida = repetida
    ? [
        repetida.persona.numeroIdentidad ? `🪪 ${repetida.persona.numeroIdentidad}` : '',
        repetida.persona.telefono ? `📱 ${repetida.persona.telefono}` : '',
        repetida.persona.zona ? `📍 ${repetida.persona.zona}` : '',
      ].filter(Boolean).join(' · ')
    : '';

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
      {repetida && (
        <div style={{ background: 'var(--gold-glow)', border: '1px solid var(--gold)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, lineHeight: 1.5 }}>
          ⚠️ Ya existe alguien registrado con este nombre: <strong>{repetida.persona.nombre} {repetida.persona.apellido}</strong>
          {detalleRepetida && <> — {detalleRepetida}</>}.
          {repetida.coincideTelefono && ' Coincide también el teléfono.'}
          {repetida.coincideNacimiento && ' Coincide también la fecha de nacimiento.'}
          {' '}Si es la misma persona, no la teclees otra vez.
          {!persona && (
            <>
              {' '}
              <button type="button" className="btn btn-gold btn-sm" onClick={() => { onSaved?.(repetida.persona.id); onClose(); }}>Usar esta persona</button>
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
        <div className="form-group"><label className="form-label">Sexo</label>
          <select className="form-select" value={sexo} onChange={(e) => setSexo(e.target.value as 'M' | 'F' | '')}>
            <option value="">Sin especificar</option>
            <option value="M">Hombre</option>
            <option value="F">Mujer</option>
          </select>
        </div>
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
      {altasDirectas && (
        <>
          <div className="form-section">🏁 Al guardar, dar de alta también como</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '4px 0', cursor: yaEnMision ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={altaMision} disabled={yaEnMision} onChange={(e) => setAltaMision(e.target.checked)} />
            <span><strong>Congregado</strong> — entra a la lista de Misión{yaEnMision && <span style={{ color: 'var(--dim)' }}> · ya está en Misión</span>}</span>
          </label>
          {altaMision && (
            <div style={{ marginLeft: 26, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 4 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="alta-entrada" checked={altaEntrada === 'congregado'} onChange={() => setAltaEntrada('congregado')} />
                <span>Como <strong>Congregado</strong> — asiste, aún no ha confesado la fe</span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="alta-entrada" checked={altaEntrada === 'confeso'} onChange={() => setAltaEntrada('confeso')} />
                <span>Como <strong>Confeso</strong> — ya hizo la oración de fe, por ver si permanece</span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="alta-entrada" checked={altaEntrada === 'converso'} onChange={() => setAltaEntrada('converso')} />
                <span>Como <strong>Converso</strong> — ya permanece, se le ven frutos</span>
              </label>
            </div>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '4px 0', cursor: yaMiembro ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={altaIntegrado} disabled={yaMiembro} onChange={(e) => setAltaIntegrado(e.target.checked)} />
            <span><strong>Integrado</strong> — pasa directo a Miembros{yaMiembro && <span style={{ color: 'var(--dim)' }}> · ya es miembro</span>}</span>
          </label>
          {altaMision && altaIntegrado && (
            <div style={{ marginLeft: 26, fontSize: 12, color: 'var(--dim)', paddingBottom: 4 }}>
              Con Congregado + Integrado, su registro en Misión nace ya en Integrado y el miembro queda enlazado a él.
            </div>
          )}
          {yaEnMision && altaIntegrado && !yaMiembro && (
            <div style={{ marginLeft: 26, fontSize: 12, color: 'var(--dim)', paddingBottom: 4 }}>
              Ya está en Misión: su registro pasa a Integrado y el miembro nace enlazado a él.
            </div>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '4px 0', cursor: yaBeneficiario ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={altaBeneficiario} disabled={yaBeneficiario} onChange={(e) => setAltaBeneficiario(e.target.checked)} />
            <span><strong>Beneficiario</strong> — entra a la lista de Manos Abiertas{yaBeneficiario && <span style={{ color: 'var(--dim)' }}> · ya está en Manos Abiertas</span>}</span>
          </label>
        </>
      )}
    </Modal>
  );
}
