import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/database';
import { Modal } from './Modal';
import { createBaseRecord } from '../lib/utils/recordHelpers';

interface ZonaSelectProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function ZonaSelect({ value, onChange, className, required, allowEmpty = true, emptyLabel = 'Seleccionar…' }: ZonaSelectProps) {
  const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];
  const ordenadas = [...zonas].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const [adding, setAdding] = useState(false);
  const [gestionar, setGestionar] = useState(false);
  const [nuevo, setNuevo] = useState('');

  const guardarNueva = async () => {
    const nombre = nuevo.trim();
    if (!nombre) return;
    const dup = zonas.find((z) => z.nombre.toLowerCase() === nombre.toLowerCase());
    if (dup) {
      onChange(dup.nombre);
      setAdding(false);
      setNuevo('');
      return;
    }
    await db.zonas.add(createBaseRecord({ id: uuid(), nombre, creado: new Date().toISOString() }));
    onChange(nombre);
    setAdding(false);
    setNuevo('');
  };

  const borrarZona = async (id: string) => {
    await db.zonas.delete(id);
  };

  if (adding) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="form-input" value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardarNueva(); } if (e.key === 'Escape') { setAdding(false); setNuevo(''); } }} placeholder="Nombre de la nueva zona" autoFocus />
        <button type="button" className="btn btn-gold btn-sm" onClick={guardarNueva}>💾</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAdding(false); setNuevo(''); }}>✕</button>
      </div>
    );
  }

  return (
    <>
      <select className={className || 'form-select'} value={value} onChange={(e) => { if (e.target.value === '__add__') setAdding(true); else if (e.target.value === '__gestionar__') setGestionar(true); else onChange(e.target.value); }} required={required}>
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {ordenadas.map((z) => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
        {value && !ordenadas.some((z) => z.nombre === value) && <option value={value}>📌 {value} (existente)</option>}
        <option value="__add__">✚ Agregar nueva zona…</option>
        <option value="__gestionar__">⚙ Gestionar zonas…</option>
      </select>

      <Modal open={gestionar} onClose={() => setGestionar(false)} title="⚙ Gestionar zonas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ordenadas.map((z) => (
            <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--surface-2)', borderRadius: 6 }}>
              <span>{z.nombre}</span>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => borrarZona(z.id)}>🗑</button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
