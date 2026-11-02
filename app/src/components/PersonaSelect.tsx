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
}

/**
 * Ficha única (P0): selector ÚNICO de personas para todos los módulos del
 * alcance — sustituye a los tres selectores caseros que copiaban datos
 * (origen del estudiante, «Buscar en Miembros» del diezmador, origen del
 * beneficiario). Buscar → elegir; si no está → crearla ahí mismo con el
 * formulario del núcleo. Nace en P0 sin uso en páginas (se conecta en P2–P5).
 */
export function PersonaSelect({ value, onChange, className, required, emptyLabel = 'Seleccionar persona…' }: PersonaSelectProps) {
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const ordenadas = [...personas].sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`));
  const [creando, setCreando] = useState(false);

  return (
    <>
      <select
        className={className || 'form-select'}
        value={value}
        required={required}
        onChange={(e) => {
          if (e.target.value === '__nueva__') setCreando(true);
          else onChange(e.target.value);
        }}
      >
        <option value="">{emptyLabel}</option>
        {ordenadas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} {p.apellido}{p.telefono ? ` · ${p.telefono}` : ''}
          </option>
        ))}
        {value && !ordenadas.some((p) => p.id === value) && <option value={value}>📌 Persona existente</option>}
        <option value="__nueva__">➕ Nueva persona…</option>
      </select>

      <PersonaFormModal
        open={creando}
        onClose={() => setCreando(false)}
        onSaved={(id) => { onChange(id); setCreando(false); }}
      />
    </>
  );
}
