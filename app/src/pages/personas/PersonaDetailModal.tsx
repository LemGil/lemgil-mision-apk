import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { PersonaFormModal } from '../../components/PersonaFormModal';
import { showToast } from '../../lib/notification';
import { fmt } from '../../lib/utils';
import { edadDesde, nombrePersona, situacionPersona, tarjetasDeProcesos, PROCESO_ETIQUETA, SITUACION_BADGE } from '../../lib/personaVista';
import type { ProcesosAgrupados } from '../../lib/personaVista';
import type { PasoSeguimiento, Persona } from '../../lib/types';

/**
 * FICHA ÚNICA (P1) — la persona, una sola vez.
 * Muestra el núcleo completo y una tarjeta por proceso con su resumen y
 * el enlace a su módulo. El NÚCLEO sí se edita desde aquí: el botón
 * «Editar datos» abre PersonaFormModal, el mismo formulario del núcleo
 * que usan todos los módulos (en P1 la ficha nació de solo lectura;
 * LemGil pidió después poder corregir los datos sin ir al módulo).
 * Los datos de PROCESO no se editan aquí: cada proceso se gestiona en
 * su módulo, al que llevan las tarjetas. Se suma la herramienta
 * «Unir personas» (§5.5 del diseño), que llega por `onUnir`.
 */
interface PersonaDetailModalProps {
  open: boolean;
  onClose: () => void;
  persona: Persona | undefined;
  procesos: ProcesosAgrupados;
  grupoNombre?: string;
  hermanoMayorNombre?: string;
  cursoNombre?: (cursoId: string) => string | undefined;
  /** Catálogo de pasos (Fase 2): la situación y la tarjeta de conversión nombran el estado con su etiqueta viva. */
  pasosMision?: PasoSeguimiento[];
  /** Todas las demás personas, para la herramienta «Unir personas». */
  otrasPersonas: Persona[];
  onUnir: (absorbidaId: string) => Promise<void>;
}

export function PersonaDetailModal(props: PersonaDetailModalProps) {
  const { open, onClose, persona, procesos, grupoNombre, hermanoMayorNombre, cursoNombre, pasosMision, otrasPersonas, onUnir } = props;
  const navigate = useNavigate();
  const [unirId, setUnirId] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [uniendo, setUniendo] = useState(false);
  const [editando, setEditando] = useState(false);

  // Al cambiar de persona, la herramienta de unión y el editor vuelven
  // a su estado inicial.
  useEffect(() => { setUnirId(''); setConfirmando(false); setEditando(false); }, [persona?.id]);

  if (!persona) {
    return <Modal open={open} onClose={onClose} title="👤 Ficha de persona" wide>{null}</Modal>;
  }

  const tarjetas = tarjetasDeProcesos(procesos, cursoNombre, pasosMision);
  const situacion = situacionPersona(procesos, pasosMision);
  const iniciales = `${persona.nombre[0] || ''}${persona.apellido[0] || ''}`.toUpperCase();
  const edad = edadDesde(persona.fechaNacimiento);
  const absorbida = otrasPersonas.find((p) => p.id === unirId);

  const irAlModulo = (ruta: string) => { onClose(); navigate(ruta); };

  const ejecutarUnion = async () => {
    if (!absorbida) return;
    setUniendo(true);
    try {
      await onUnir(absorbida.id);
      setUnirId(''); setConfirmando(false);
    } finally {
      setUniendo(false);
    }
  };

  return (
    <>
    <Modal open={open} onClose={onClose} title="👤 Ficha de persona" wide footer={<button className="btn btn-secondary" onClick={onClose}>Cerrar</button>}>
      {/* HERO */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0 18px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
        <div className="avatar-lg" style={{ background: 'linear-gradient(135deg, var(--oro-apostolico), var(--oro-sombra))', color: 'var(--carbon)' }}>{iniciales || '👤'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{nombrePersona(persona)}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {situacion && <span className={`badge ${SITUACION_BADGE[situacion.tono]}`}>{situacion.texto}</span>}
            {tarjetas.length === 0 && <span className="badge badge-blue">Sin procesos todavía</span>}
            {Array.from(new Set(tarjetas.map((t) => t.proceso))).map((p) => (
              <span key={p} className="badge badge-purple">{PROCESO_ETIQUETA[p]}</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
            📍 {persona.zona || 'Sin zona'}{grupoNombre ? ` · 👥 ${grupoNombre}` : ''}
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => setEditando(true)}>
          ✏️ Editar datos
        </button>
      </div>

      {/* NÚCLEO */}
      <div className="form-section">Datos de la persona</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' }}>
        <div className="detail-row"><span className="detail-label">🪪 Nº de Identidad</span><span className="detail-value">{persona.numeroIdentidad || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">📞 Teléfono</span><span className="detail-value">{persona.telefono || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">✉ Email</span><span className="detail-value" style={{ fontSize: 12, wordBreak: 'break-all' }}>{persona.email || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">📅 Nacimiento</span><span className="detail-value">{persona.fechaNacimiento ? fmt(persona.fechaNacimiento) : '—'}</span></div>
        <div className="detail-row"><span className="detail-label">🎂 Edad</span><span className="detail-value">{edad !== null ? `${edad} años` : '—'}</span></div>
        <div className="detail-row"><span className="detail-label">💼 Profesión</span><span className="detail-value">{persona.profesion || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">💒 Estado civil</span><span className="detail-value">{persona.estadoCivil || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">💬 Contacto preferido</span><span className="detail-value">{persona.contactoPreferido || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">💧 Bautizado</span><span className="detail-value">{persona.bautizado ? (persona.fechaBautismo ? `Sí · ${fmt(persona.fechaBautismo)}` : 'Sí') : 'No'}</span></div>
        <div className="detail-row"><span className="detail-label">💍 Cónyuge</span><span className="detail-value">{persona.conyuge || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">👶 Hijos</span><span className="detail-value">{persona.hijos || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">👥 Grupo</span><span className="detail-value">{grupoNombre || '—'}</span></div>
        <div className="detail-row"><span className="detail-label">🧑 Hermano mayor</span><span className="detail-value">{hermanoMayorNombre || '—'}</span></div>
        <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">🏡 Dirección</span><span className="detail-value" style={{ fontSize: 12 }}>{persona.direccion || '—'}</span></div>
      </div>

      {/* PROCESOS */}
      <div className="form-section" style={{ marginTop: 16 }}>Sus procesos</div>
      {tarjetas.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--dim)', padding: '4px 0 8px' }}>Esta persona aún no tiene procesos en ningún módulo.</div>
      )}
      {tarjetas.map((t) => (
        <div key={`${t.proceso}:${t.procesoId}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--gold)', marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{t.icono}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>{t.titulo}</div>
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>{t.lineas.join(' · ')}</div>
          </div>
          <button type="button" className="btn btn-gold btn-sm" onClick={() => irAlModulo(t.ruta)}>
            {t.abreFicha ? 'Ver en su módulo →' : 'Ir a su módulo →'}
          </button>
        </div>
      ))}

      {/* HERRAMIENTA §5.5: UNIR PERSONAS */}
      {otrasPersonas.length > 0 && (
        <>
          <div className="form-section" style={{ marginTop: 16 }}>🔗 Unir personas</div>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
            Si esta misma persona quedó creada dos veces, elige la ficha duplicada: sus procesos pasarán a ESTA ficha y la duplicada se eliminará. Los datos de esta ficha no cambian.
          </div>
          {!confirmando ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="filter-select" style={{ flex: 1, minWidth: 200 }} value={unirId} onChange={(e) => setUnirId(e.target.value)}>
                <option value="">Elegir la ficha duplicada…</option>
                {otrasPersonas.map((p) => (
                  <option key={p.id} value={p.id}>{nombrePersona(p)}{p.telefono ? ` · ${p.telefono}` : ''}</option>
                ))}
              </select>
              <button type="button" className="btn btn-secondary btn-sm" disabled={!unirId} onClick={() => setConfirmando(true)}>Unir en esta ficha</button>
            </div>
          ) : (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--gold)' }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                ¿Unir a <strong>{absorbida ? nombrePersona(absorbida) : ''}</strong> en esta ficha? Sus procesos pasarán aquí y su ficha se eliminará. Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-gold btn-sm" disabled={uniendo} onClick={ejecutarUnion}>{uniendo ? 'Uniendo…' : 'Sí, unir'}</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={uniendo} onClick={() => setConfirmando(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>

    {/* EDITAR EL NÚCLEO: el mismo PersonaFormModal de los módulos, con
        la persona precargada. Se monta solo al abrir el editor (la
        ficha cerrada no lleva ningún campo editable encima). Al
        guardar, la página — que lee la persona con useLiveQuery —
        re-renderiza la ficha ya con los datos nuevos. */}
    {editando && (
      <PersonaFormModal
        open
        onClose={() => setEditando(false)}
        persona={persona}
        onSaved={() => { setEditando(false); showToast('Datos de la persona actualizados'); }}
      />
    )}
    </>
  );
}
