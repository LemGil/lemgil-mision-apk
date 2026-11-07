import { useState, type Dispatch, type SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { PersonaSelect } from '../../components/PersonaSelect';
import { PersonaFormModal } from '../../components/PersonaFormModal';
import { fmt, today } from '../../lib/utils';
import { conversionDePersona, edadDesde } from '../../lib/personaVista';
import type { Conversion, Evangelismo, Grupo, PasoSeguimiento, Persona } from '../../lib/types';
import { etiquetaConRespaldo, etiquetaDe, pasosDeMision, rutaDe, salidasDe } from '../../lib/pasosMision';

/**
 * Las opciones de estado: la RUTA del catálogo y, aparte, las salidas
 * (Fase 2). F9: si el VALOR ACTUAL no está entre las opciones (el paso
 * fue borrado del catálogo), se pinta una opción extra con su etiqueta
 * de respaldo — el valor se VE y se conserva si no se toca, en vez de
 * un selector vacío que invite a «corregirlo» cambiando la ficha sin
 * querer.
 */
function OpcionesEstado({ pasos, valorActual }: { pasos: PasoSeguimiento[]; valorActual?: string }) {
  const fueraDeCatalogo = !!valorActual && !pasosDeMision(pasos).some((p) => p.id === valorActual);
  return (
    <>
      {fueraDeCatalogo && (
        <option value={valorActual}>{etiquetaConRespaldo(pasos, valorActual)} (ya no está en el catálogo)</option>
      )}
      <optgroup label="Camino">
        {rutaDe(pasos).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>)}
      </optgroup>
      <optgroup label="Salidas">
        {salidasDe(pasos).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>)}
      </optgroup>
    </>
  );
}

type HistorialItem = { fecha: string; estado: string; nota: string };

interface ConversionFormModalProps {
  /** Catálogo de pasos (Fase 2): el selector de estado lista la ruta y las salidas por identidad. */
  pasos: PasoSeguimiento[];
  open: boolean;
  onClose: () => void;
  editConvId: string | null;
  saveConv: () => void;
  personas: Persona[];
  grupos: Grupo[];
  evangelismos: Evangelismo[];
  fPersonaId: string; setFPersonaId: Dispatch<SetStateAction<string>>;
  fFecha: string; setFFecha: Dispatch<SetStateAction<string>>;
  fFamilia: string; setFFamilia: Dispatch<SetStateAction<string>>;
  fEstado: string; setFEstado: Dispatch<SetStateAction<string>>;
  fNotas: string; setFNotas: Dispatch<SetStateAction<string>>;
  fEvangelismoId: string; setFEvangelismoId: Dispatch<SetStateAction<string>>;
  fHistorial: HistorialItem[]; setFHistorial: Dispatch<SetStateAction<HistorialItem[]>>;
  /**
   * Guardia «ya en Misión» (2026-11-07): las conversiones existentes,
   * para detectar si la persona elegida ya tiene una (al crear). Sin
   * ellas no hay aviso: la guardia es un añadido, no un requisito.
   */
  conversiones?: Conversion[];
  /** Abre el detalle de la conversión existente (botón «Ver esa ficha» del aviso). */
  onVerConversion?: (id: string) => void;
  /** Marcas del selector de personas («ya en Misión»), calculadas por la página. */
  avisosPersonas?: Map<string, string>;
}

/**
 * P2 (ficha única): el formulario de la conversión ya NO teclea los datos
 * personales. Primero se elige la PERSONA (PersonaSelect: buscar y elegir,
 * o crearla ahí mismo una sola vez con su Nº de Identidad); sus datos se
 * ven en el resumen y se corrigen en el formulario del núcleo. Aquí solo
 * se teclea el PROCESO: fecha, estado, familia, evangelismo de origen,
 * notas de contacto e historial.
 */
export function ConversionFormModal(props: ConversionFormModalProps) {
  const { pasos, open, onClose, editConvId, saveConv, personas, grupos, evangelismos, fPersonaId, setFPersonaId, fFecha, setFFecha, fFamilia, setFFamilia, fEstado, setFEstado, fNotas, setFNotas, fEvangelismoId, setFEvangelismoId, fHistorial, setFHistorial, conversiones, onVerConversion, avisosPersonas } = props;
  const [editandoPersona, setEditandoPersona] = useState(false);
  const persona = personas.find((p) => p.id === fPersonaId);
  const grupo = persona?.grupoId ? grupos.find((g) => g.id === persona.grupoId) : undefined;
  const mentor = persona?.hermanoMayorId ? personas.find((p) => p.id === persona.hermanoMayorId) : undefined;
  const edad = persona ? edadDesde(persona.fechaNacimiento) : null;
  // Guardia «ya en Misión» (2026-11-07): SOLO al crear — si la persona
  // elegida ya tiene una conversión, se avisa ANTES de duplicar el
  // proceso (al editar, la conversión existente es esta misma u otra
  // historia que no se juzga aquí). No bloquea: rotula el guardado
  // para que crear otra sea una decisión informada, nunca un descuido.
  const convExistente = !editConvId ? conversionDePersona(conversiones ?? [], fPersonaId, pasos) : null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={editConvId ? '✏️ Editar Conversión' : '✝️ Nueva Conversión'} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-gold" onClick={saveConv}>💾 {editConvId ? 'Guardar Cambios' : convExistente ? 'Crear otra de todos modos' : 'Guardar'}</button></>} wide>

        {/* ─── SECCIÓN: PERSONA ─── */}
        <div className="form-section">👤 Persona (se teclea una sola vez)</div>
        <div className="form-group">
          <label className="form-label">Persona de esta conversión *</label>
          <PersonaSelect value={fPersonaId} onChange={setFPersonaId} emptyLabel="🔍 Buscar persona…" avisos={avisosPersonas} />
        </div>
        {persona && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong>{persona.nombre} {persona.apellido}</strong>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditandoPersona(true)}>✏️ Editar datos de la persona</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4, lineHeight: 1.7 }}>
              {persona.numeroIdentidad && <>🪪 {persona.numeroIdentidad} · </>}
              {persona.telefono && <>📱 {persona.telefono} · </>}
              {persona.zona && <>📍 {persona.zona} · </>}
              {edad !== null && <>🎂 {edad} años · </>}
              {grupo && <>👥 {grupo.nombre} · </>}
              {mentor && <>👤 Mayor: {mentor.nombre} {mentor.apellido} · </>}
              {persona.bautizado ? '💧 Bautizado' : 'Sin bautizar'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>Estos datos viven en la ficha única de la persona: se corrigen una vez y se ven en todos sus procesos.</div>
          </div>
        )}
        {convExistente && persona && (
          <div style={{ background: 'var(--gold-glow)', border: '1px solid var(--gold)', borderRadius: 8, padding: '10px 12px', marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
            ⚠️ {persona.nombre} {persona.apellido} ya tiene una conversión registrada — estado actual: <strong>{etiquetaDe(pasos, convExistente.estado)}</strong>.
            Si sigues y guardas, crearás OTRA conversión para la misma persona.
            {onVerConversion && (
              <>
                {' '}
                <button type="button" className="btn btn-gold btn-sm" onClick={() => { onClose(); onVerConversion(convExistente.id); }}>Ver esa ficha</button>
              </>
            )}
          </div>
        )}

        {/* ─── SECCIÓN: PROCESO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>✝️ Datos de la conversión</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado Inicial</label><select className="form-select" value={fEstado} onChange={(e) => setFEstado(e.target.value)}><OpcionesEstado pasos={pasos} valorActual={fEstado} /></select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">¿Familia en el ministerio?</label><select className="form-select" value={fFamilia} onChange={(e) => setFFamilia(e.target.value)}><option>No</option><option>Sí</option></select></div>
          <div className="form-group"><label className="form-label">Evangelismo de origen</label>
            <select className="form-select" value={fEvangelismoId} onChange={(e) => setFEvangelismoId(e.target.value)}>
              <option value="">— Sin evangelismo —</option>
              {evangelismos.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map((e) => <option key={e.id} value={e.id}>{fmt(e.fecha)} · {e.tipo}{e.zona ? ` · ${e.zona}` : ''}</option>)}
            </select>
          </div>
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
              <OpcionesEstado pasos={pasos} valorActual={h.estado} />
            </select>
            <input className="form-input" value={h.nota} onChange={(e) => { const n = [...fHistorial]; n[i] = { ...n[i], nota: e.target.value }; setFHistorial(n); }} placeholder="Nota (opcional)" style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFHistorial(fHistorial.filter((_, j) => j !== i))} title="Eliminar">🗑️</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFHistorial([...fHistorial, { fecha: today(), estado: fEstado, nota: '' }])} style={{ marginTop: 4 }}>➕ Agregar entrada al historial</button>
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
