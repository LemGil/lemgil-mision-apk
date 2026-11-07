import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/database';
import { PersonaFormModal } from './PersonaFormModal';

interface PersonaSelectProps {
  /** personaId elegido ('' = ninguno). */
  value: string;
  onChange: (personaId: string) => void;
  className?: string;
  required?: boolean;
  emptyLabel?: string;
  /**
   * Guardia opcional «ya registrada» (2026-11-07): texto corto a
   * mostrar junto al nombre de algunas personas (personaId → texto,
   * p. ej. «ya en Misión» para quien ya tiene conversión). Quien no
   * pasa el mapa no marca a nadie y su selector queda como siempre.
   */
  avisos?: Map<string, string>;
}

/**
 * Ficha única: selector de personas SOLO entre las ya registradas, con
 * la puerta del registro inicial al lado.
 *
 * Modelo final (regla de LemGil, 2026-11-04 — «el ideal: un solo
 * formulario, puerta en cada formulario de proceso»): un solo
 * formulario escribe los datos de las personas nuevas —
 * PersonaFormModal («➕ Nueva persona») — porque quien no existe en la
 * base no se puede seleccionar: hay que teclear sus datos por primera
 * vez. Ese formulario tiene varias puertas: la oficina del registro es
 * la página Personas, y cada formulario de proceso abre la suya con el
 * botón «➕ Nueva persona» junto a este selector; al guardar, la persona
 * recién registrada queda SELECCIONADA aquí y se sigue donde se estaba,
 * sin pantallas intermedias. La LISTA sigue conteniendo solo
 * registradas: crear no es seleccionar, por eso la opción de crear no
 * vive dentro de la lista sino en su propio botón.
 */
export function PersonaSelect({ value, onChange, className, required, emptyLabel = 'Seleccionar persona…', avisos }: PersonaSelectProps) {
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const ordenadas = [...personas].sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`));
  const [creando, setCreando] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          className={className || 'form-select'}
          style={{ flex: 1, minWidth: 0 }}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{emptyLabel}</option>
          {ordenadas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido}{p.telefono ? ` · ${p.telefono}` : ''}{avisos?.get(p.id) ? ` · ${avisos.get(p.id)}` : ''}
            </option>
          ))}
          {value && !ordenadas.some((p) => p.id === value) && <option value={value}>📌 Persona existente</option>}
        </select>
        <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => setCreando(true)}>
          ➕ Nueva persona
        </button>
      </div>

      {/* REGISTRO INICIAL desde el proceso: el mismo PersonaFormModal
          de siempre (el único que teclea datos de personas nuevas),
          montado solo al abrirlo — Modal pinta sus hijos aunque esté
          cerrado. Al guardar, onSaved trae el id y la persona queda
          seleccionada en el formulario de proceso. */}
      {creando && (
        <PersonaFormModal
          open
          onClose={() => setCreando(false)}
          onSaved={(id) => { onChange(id); setCreando(false); }}
        />
      )}
    </>
  );
}
